const { ChannelType, PermissionsBitField, EmbedBuilder } = require('discord.js');
const { createTicket: createTicketRecord } = require('@xquare/domain/ticket/repository/createTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const { getOrCreateCategory } = require('@xquare/global/utils/category');
const Counter = require('@xquare/domain/ticket/counter');
const { sanitizeString, sanitizeLabels } = require('@xquare/global/utils/validators');
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

const sendWelcomeEmbed = async (channel, ticket, categoryInfo, welcomeText) => {
	try {
		await channel.send({ content: welcomeText });

		const embed = new EmbedBuilder()
			.setColor(0x5865F2)
			.setTitle('이슈 정보')
			.addFields(
				{ name: '종류', value: categoryInfo.name, inline: true },
				{ name: '제목', value: ticket.title || '제목 없음', inline: false }
			);

		const fieldsToShow = categoryInfo.fields.filter(f => f.id !== 'title');
		fieldsToShow.forEach(field => {
			const value = ticket.categoryFields?.get?.(field.id) || ticket.categoryFields?.[field.id] || '없음';
			if (value && value !== '없음') {
				embed.addFields({
					name: field.label,
					value: value.length > 1024 ? value.substring(0, 1021) + '...' : value,
					inline: false,
				});
			}
		});

		embed.setFooter({ text: `티켓 #${ticket.ticketNumber}` });
		embed.setTimestamp();

		await channel.send({ embeds: [embed] });
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

	const category = payload.category || 'general-inquiry';
	const categoryFields = payload.categoryFields || {};

	validateCategoryFields(category, categoryFields);

	const categoryInfo = getCategoryById(category);
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
	const category = await getOrCreateCategory(interaction.guild, categoryName);
	const capacityReady = await ensureCategoryCapacity(category);
	if (!capacityReady) throw new ValidationError(ERROR.categoryFull, { userMessage: ERROR.categoryFull });
	const ticketChannel = await createChannel(interaction.guild, interaction.user, interaction.client, channelName, category.id);

	let ticketRecord;
	try {
		const welcomeText = buildWelcomeText(settings, interaction.user);
		ticketRecord = await createTicketRecord({
			ticketNumber,
			channelId: ticketChannel.id,
			channelUuid,
			title,
			description,
			category,
			categoryFields,
			labels,
			assignees,
			userId: interaction.user.id,
			username: interaction.user.username,
			guildId: interaction.guild.id,
			status: 'open',
			welcomeText,
		});

		await sendWelcomeEmbed(ticketChannel, ticketRecord.toObject(), categoryInfo, welcomeText);
		await updateTicketSummary(ticketChannel, ticketRecord.toObject());
		logger.info(LOG.created(ticketNumber, ticketChannel.name, ticketChannel.id, interaction.user.tag));
	} catch (error) {
		await safeDeleteChannel(ticketChannel);
		throw error;
	}

	return { ticketNumber, channel: ticketChannel };
}

module.exports = { createTicket };
