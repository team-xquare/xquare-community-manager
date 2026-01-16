const { ChannelType, PermissionsBitField } = require('discord.js');
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
	issueMessageFailed: channelId => `Failed to send ticket issue message for channel ${channelId}`,
};

const ERROR = {
	settingsIncomplete: fields => t('ticket.errors.settingsIncomplete', { fields }),
	categoryFull: t('ticket.errors.categoryFull'),
};

const COUNTER_ID = 'ticketNumber';
const MESSAGE_LIMIT = 1900;

const ISSUE_TEXT = {
	category: '종류',
	empty: '없음',
	description: '설명',
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

const resolveDescriptionLabel = categoryInfo => {
	const descriptionField = categoryInfo?.fields?.find?.(field => field.id === 'description');
	return descriptionField?.label || ISSUE_TEXT.description;
};

const buildIssueLines = (ticket, categoryInfo) => {
	const title = normalizeField(ticket.title);
	const description = normalizeField(ticket.description);
	const categoryName = categoryInfo?.name || ISSUE_TEXT.empty;
	const fields = Array.isArray(categoryInfo?.fields) ? categoryInfo.fields : [];

	const lines = [`# ${title}`, `${ISSUE_TEXT.category} : **${categoryName}**`];

	fields.forEach(field => {
		if (field.id === 'title' || field.id === 'description') return;
		lines.push(`${field.label} : **${readCategoryField(ticket, field.id)}**`);
	});

	lines.push('');
	lines.push(resolveDescriptionLabel(categoryInfo));
	lines.push(description);

	return lines;
};

const sendWelcomeMessage = async (channel, welcomeText) => {
	try {
		await channel.send({ content: welcomeText });
	} catch (error) {
		logger.warn(LOG.welcomeFailed(channel.id), { error, channelId: channel.id });
	}
};

const sendIssueMessage = async (channel, ticket, categoryInfo) => {
	try {
		await sendLines(channel, buildIssueLines(ticket, categoryInfo));
	} catch (error) {
		logger.warn(LOG.issueMessageFailed(channel.id), { error, channelId: channel.id });
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

		await sendWelcomeMessage(ticketChannel, welcomeText);
		await updateTicketSummary(ticketChannel, ticketRecord.toObject());
		await sendIssueMessage(ticketChannel, ticketRecord.toObject(), categoryInfo);
		logger.info(LOG.created(ticketNumber, ticketChannel.name, ticketChannel.id, interaction.user.tag));
	} catch (error) {
		await safeDeleteChannel(ticketChannel);
		throw error;
	}

	return { ticketNumber, channel: ticketChannel };
}

module.exports = { createTicket };
