const { ChannelType, PermissionsBitField } = require('discord.js');
const { createTicket: createTicketRecord } = require('@xquare/domain/ticket/repository/createTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const { getOrCreateCategory } = require('@xquare/global/utils/category');
const Counter = require('@xquare/domain/ticket/counter');
const { sanitizeString, sanitizeLabels } = require('@xquare/global/utils/validators');
const { t } = require('@xquare/global/i18n');

const REQUIRED_FIELDS = [
	{ key: 'channelPrefix', label: 'channel_prefix' },
	{ key: 'numberPadLength', label: 'number_pad' },
	{ key: 'openCategory', label: 'open_category' },
	{ key: 'closeCategory', label: 'close_category' },
];

const DEFAULTS = {
	title: t('ticket.defaults.title'),
	welcome: user => t('ticket.defaults.welcome', { user }),
};

const LOG = {
	created: (ticketNumber, channelName, channelId, userTag) => `Ticket #${ticketNumber} created: ${channelName} (${channelId}) by ${userTag}`,
};

const ERROR = {
	settingsIncomplete: fields => t('ticket.errors.settingsIncomplete', { fields }),
};

const COUNTER_ID = 'ticketNumber';

const getNextTicketNumber = async () => {
	const counter = await Counter.findByIdAndUpdate(COUNTER_ID, { $inc: { sequence: 1 } }, { new: true, upsert: true });
	return counter.sequence;
};

const getMissingSettings = settings => REQUIRED_FIELDS.filter(({ key }) => !(key in settings));

const buildChannelName = (settings, ticketNumber, user) => {
	const paddedNumber = String(ticketNumber).padStart(settings.numberPadLength, '0');
	return `${settings.channelPrefix}-${paddedNumber}-${user.username}`;
};

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

async function createTicket(interaction, payload = {}) {
	const settings = await getSetting('guild', interaction.guildId, 'ticket', 'ui');
	const missingFields = getMissingSettings(settings);
	if (missingFields.length) throw new ValidationError(ERROR.settingsIncomplete(missingFields.map(field => field.label).join(', ')));

	const titleRaw = payload.title || interaction.options?.getString?.('title') || DEFAULTS.title;
	const descriptionRaw = payload.description || interaction.options?.getString?.('description') || '';
	const labelsRaw = payload.labels || interaction.options?.getString?.('labels') || '';
	const assignee = payload.assignee || interaction.options?.getUser?.('assignee');

	const title = sanitizeString(titleRaw, 'Title', 200);
	const description = sanitizeString(descriptionRaw, 'Description', 2000);
	const inputLabels = sanitizeLabels(labelsRaw);

	const labels = inputLabels.length ? inputLabels : buildDefaultLabels(settings);
	const assignees = assignee ? [assignee.id] : [];

	const ticketNumber = await getNextTicketNumber();
	const channelName = buildChannelName(settings, ticketNumber, interaction.user);
	const category = await getOrCreateCategory(interaction.guild, settings.openCategory);
	const ticketChannel = await createChannel(interaction.guild, interaction.user, interaction.client, channelName, category.id);
	const welcomeText = buildWelcomeText(settings, interaction.user);

	const ticketRecord = await createTicketRecord({
		ticketNumber,
		channelId: ticketChannel.id,
		title,
		description,
		labels,
		assignees,
		userId: interaction.user.id,
		username: interaction.user.username,
		guildId: interaction.guild.id,
		status: 'open',
		welcomeText,
	});

	const textLines = [welcomeText, description ? t('ticket.message.descriptionLine', { description }) : null].filter(Boolean);
	await ticketChannel.send({ content: textLines.join('\n') });
	await updateTicketSummary(ticketChannel, ticketRecord.toObject());
	logger.info(LOG.created(ticketNumber, ticketChannel.name, ticketChannel.id, interaction.user.tag));

	return { ticketNumber, channel: ticketChannel };
}

module.exports = { createTicket };
