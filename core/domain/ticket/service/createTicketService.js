const { ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { createTicket: createTicketRecord } = require('@xquare/domain/ticket/repository/createTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const { getOrCreateCategory } = require('@xquare/global/utils/category');
const Counter = require('@xquare/domain/ticket/counter');
const { sanitizeLabels } = require('@xquare/global/utils/validators');
const { buildTicketChannelName, generateChannelUuid } = require('@xquare/domain/ticket/service/ticketChannelNameService');
const { ensureCategoryCapacity } = require('@xquare/domain/ticket/service/ticketRetentionService');
const { validateCategoryFields, getCategoryById } = require('@xquare/domain/ticket/categories');
const { t } = require('@xquare/global/i18n');

const REQUIRED_FIELDS = [
	{ key: 'openCategory', label: 'open_category', validate: value => typeof value === 'string' && value.trim().length },
];

const DEFAULTS = {
	title: t('ticket.defaults.title'),
	welcome: user => t('ticket.defaults.welcome', { user }),
};

const LOG = {
	created: (ticketNumber, channelName, channelId, userTag) => `Ticket #${ticketNumber} created: ${channelName} (${channelId}) by ${userTag}`,
	channelDeleteFailed: channelId => `Failed to delete channel after ticket creation error: ${channelId}`,
	welcomeFailed: channelId => `Failed to send ticket welcome message for channel ${channelId}`,
};

const ERROR = {
	settingsIncomplete: fields => t('ticket.errors.settingsIncomplete', { fields }),
	categoryFull: t('ticket.errors.categoryFull'),
};

const COUNTER_ID = 'ticketNumber';
const MESSAGE_LIMIT = 1900;

const ISSUE_TEXT = {
	header: '이슈 정보',
	status: '상태',
	category: '종류',
	title: '제목',
	project: '프로젝트',
	type: '타입',
	request: '요청',
	empty: '없음',
};

const STATUS_TEXT = {
	open: t('ticket.status.open'),
	inProgress: t('ticket.status.inProgress'),
	closed: t('ticket.status.closed'),
};

const STATUS_COLOR = {
	open: 0x2ecc71,
	inProgress: 0xf39c12,
	closed: 0xe74c3c,
};

const CATEGORY_OUTPUT = {
	'deployment-issue': { project: 'project_name', type: 'environment', request: 'deployment_time' },
	'service-outage': { project: 'project_name', type: 'affected_service', request: 'started_at' },
	'performance-issue': { project: 'project_name', type: 'endpoint_or_page', request: 'response_time' },
	'resource-request': { project: 'project_name', type: 'resource_type', request: 'specs' },
	'build-failure': { project: 'project_name', type: 'error_message', request: 'build_log_url' },
	'configuration': { project: 'project_name', type: 'config_type', request: 'current_config' },
	'general-inquiry': { project: 'project_name', type: null, request: null },
	default: { project: 'project_name', type: null, request: null },
};

const getNextTicketNumber = async () => {
	const counter = await Counter.findByIdAndUpdate(COUNTER_ID, { $inc: { sequence: 1 } }, { new: true, upsert: true });
	return counter.sequence;
};

const getMissingSettings = settings => REQUIRED_FIELDS.filter(field => !field.validate(settings?.[field.key]));

const buildWelcomeText = (settings, user) => {
	const rawText = settings.welcomeMessage?.replace('{user}', `${user}`) || DEFAULTS.welcome(user);
	return rawText.replace(/\\n/g, '\n');
};

const createChannel = async (guild, user, client, channelName, categoryId) => guild.channels.create({
	name: channelName,
	type: ChannelType.GuildText,
	parent: categoryId,
	permissionOverwrites: [
		{ id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
		{
			id: user.id,
			allow: [
				PermissionsBitField.Flags.ViewChannel,
				PermissionsBitField.Flags.SendMessages,
				PermissionsBitField.Flags.ReadMessageHistory,
			],
		},
		{
			id: client.user.id,
			allow: [
				PermissionsBitField.Flags.ViewChannel,
				PermissionsBitField.Flags.SendMessages,
				PermissionsBitField.Flags.ReadMessageHistory,
			],
		},
	],
});

const buildDefaultLabels = settings => {
	if (Array.isArray(settings.defaultLabels)) return settings.defaultLabels;
	if (typeof settings.defaultLabels !== 'string') return [];
	return settings.defaultLabels.split(',').map(label => label.trim()).filter(Boolean);
};

const safeDeleteChannel = async channel => {
	if (!channel) return;
	try {
		await channel.delete();
	} catch (error) {
		logger.warn(LOG.channelDeleteFailed(channel.id), { error, channelId: channel.id });
	}
};

const splitLongLine = (line, maxLength) => {
	if (line.length <= maxLength) return [line];
	const parts = [];
	for (let index = 0; index < line.length; index += maxLength) {
		parts.push(line.slice(index, index + maxLength));
	}
	return parts;
};

const chunkLines = (lines, maxLength) => {
	const chunks = [];
	let current = '';
	lines.forEach(line => {
		splitLongLine(line, maxLength).forEach(part => {
			const next = current ? `${current}\n${part}` : part;
			if (next.length <= maxLength) return current = next;
			if (current) chunks.push(current);
			current = part;
		});
	});
	if (current) chunks.push(current);
	return chunks;
};

const sendLines = async (channel, lines) => {
	const chunks = chunkLines(lines, MESSAGE_LIMIT);
	for (const chunk of chunks) await channel.send({ content: chunk });
};

const normalizeField = value => {
	const text = value === undefined || value === null ? '' : String(value).trim();
	return text || ISSUE_TEXT.empty;
};

const readCategoryField = (ticket, fieldId) => {
	if (!fieldId) return ISSUE_TEXT.empty;
	const raw = ticket.categoryFields?.get?.(fieldId) || ticket.categoryFields?.[fieldId];
	return normalizeField(raw);
};

const resolveCategoryOutput = categoryId => CATEGORY_OUTPUT[categoryId] || CATEGORY_OUTPUT.default;

const buildIssueLines = (ticket, categoryInfo) => {
	const mapping = resolveCategoryOutput(ticket.category);
	const project = readCategoryField(ticket, mapping.project);
	const type = readCategoryField(ticket, mapping.type);
	const request = readCategoryField(ticket, mapping.request);
	const title = normalizeField(ticket.title);
	const description = normalizeField(ticket.description);
	const categoryName = categoryInfo?.name || ISSUE_TEXT.empty;

	return [
		`# [ ${title} ]`,
		`${ISSUE_TEXT.category} : **[ ${categoryName} ]**`,
		`${ISSUE_TEXT.project} : **[ ${project} ]**`,
		`${ISSUE_TEXT.type} : **[ ${type} ]**`,
		`${ISSUE_TEXT.request} : **[ ${request} ]**`,
		'',
		`[ ${description} ]`,
	];
};

const buildStatusEmbed = ticket => {
	const statusKey = ticket.status === 'in-progress' ? 'inProgress' : ticket.status;
	const statusText = STATUS_TEXT[statusKey] || ticket.status;
	const color = STATUS_COLOR[statusKey] || STATUS_COLOR.open;
	return new EmbedBuilder()
		.setColor(color)
		.setTitle(ISSUE_TEXT.status)
		.setDescription(statusText);
};

const sendWelcomeMessage = async (channel, ticket, categoryInfo, welcomeText) => {
	try {
		await channel.send({ content: welcomeText });
		await channel.send({ embeds: [buildStatusEmbed(ticket)] });
		await sendLines(channel, buildIssueLines(ticket, categoryInfo));
	} catch (error) {
		logger.warn(LOG.welcomeFailed(channel.id), { error, channelId: channel.id });
	}
};

async function createTicket(interaction, payload = {}) {
	const settings = await getSetting('guild', interaction.guildId, 'ticket', 'ui');
	const missingFields = getMissingSettings(settings);
	if (missingFields.length) {
		const message = ERROR.settingsIncomplete(missingFields.map(field => field.label).join(', '));
		throw new ValidationError(message, { userMessage: message });
	}

	const ticketCategory = payload.category || 'general-inquiry';
	const categoryFields = payload.categoryFields || {};

	validateCategoryFields(ticketCategory, categoryFields);

	const categoryInfo = getCategoryById(ticketCategory);
	const title = categoryFields.title || DEFAULTS.title;
	const description = categoryFields.description || '';

	const labelsRaw = payload.labels || interaction.options?.getString?.('labels') || '';
	const assignee = payload.assignee || interaction.options?.getUser?.('assignee');
	const inputLabels = sanitizeLabels(labelsRaw);

	const labels = inputLabels.length ? inputLabels : buildDefaultLabels(settings);
	const assignees = assignee ? [assignee.id] : [];

	const ticketNumber = await getNextTicketNumber();
	const channelUuid = generateChannelUuid();
	const channelName = buildTicketChannelName(ticketNumber, channelUuid);
	const categoryName = settings.openCategory.trim();
	const discordCategory = await getOrCreateCategory(interaction.guild, categoryName);
	const capacityReady = await ensureCategoryCapacity(discordCategory);
	if (!capacityReady) throw new ValidationError(ERROR.categoryFull, { userMessage: ERROR.categoryFull });
	const ticketChannel = await createChannel(interaction.guild, interaction.user, interaction.client, channelName, discordCategory.id);

	let ticketRecord;
	try {
		const welcomeText = buildWelcomeText(settings, interaction.user);
		ticketRecord = await createTicketRecord({
			ticketNumber,
			channelId: ticketChannel.id,
			channelUuid,
			title,
			description,
			category: ticketCategory,
			categoryFields,
			labels,
			assignees,
			userId: interaction.user.id,
			username: interaction.user.username,
			guildId: interaction.guild.id,
			status: 'open',
			welcomeText,
		});

		await sendWelcomeMessage(ticketChannel, ticketRecord.toObject(), categoryInfo, welcomeText);
		await updateTicketSummary(ticketChannel, ticketRecord.toObject());
		logger.info(LOG.created(ticketNumber, ticketChannel.name, ticketChannel.id, interaction.user.tag));
	} catch (error) {
		await safeDeleteChannel(ticketChannel);
		throw error;
	}

	return { ticketNumber, channel: ticketChannel };
}

module.exports = { createTicket };
