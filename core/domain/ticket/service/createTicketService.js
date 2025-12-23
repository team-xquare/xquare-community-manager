const { ChannelType, PermissionsBitField } = require('discord.js');
const { findLastTicket } = require('@xquare/domain/ticket/repository/findLastTicketRepository');
const { createTicket: createTicketRecord } = require('@xquare/domain/ticket/repository/createTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const { getOrCreateCategory } = require('@xquare/global/utils/category');

async function getNextTicketNumber() {
	const lastTicket = await findLastTicket();
	return lastTicket ? lastTicket.ticketNumber + 1 : 1;
}

async function createTicketChannel(guild, user, client, ticketNumber, settings) {
	const paddedNumber = String(ticketNumber).padStart(settings.numberPadLength, '0');
	const channelName = `${settings.channelPrefix}-${paddedNumber}-${user.username}`;
	const category = await getOrCreateCategory(guild, settings.openCategory);

	return guild.channels.create({
		name: channelName,
		type: ChannelType.GuildText,
		parent: category.id,
		permissionOverwrites: [
			{
				id: guild.id,
				deny: [PermissionsBitField.Flags.ViewChannel],
			},
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
}

const requiredSettingsFields = [
  {
    key: 'channelPrefix',
    displayName: 'channel_prefix',
  },
  {
    key: 'numberPadLength',
    displayName: 'number_pad',
  },
  {
    key: 'openCategory',
    displayName: 'open_category',
  },
  {
    key: 'closeCategory',
    displayName: 'close_category',
  },
];

async function createTicket(interaction, payload = {}) {
	const settings = await getSetting('guild', interaction.guildId, 'ticket', 'ui');
  const missingFields = requiredSettingsFields.filter(({ key }) => !(key in settings));
  if (missingFields.length) {
    const missingFieldsFormatted = missingFields.map((field) => field.displayName).join(', ');
    throw new ValidationError(
      `Ticket settings are incomplete. Configure missing fields: ${missingFieldsFormatted}`
    );
  }

	const title =
		payload.title
		|| interaction.options?.getString?.('title')
		|| '제목 없음';
	const description =
		payload.description
		|| interaction.options?.getString?.('description')
		|| '';
	const labelsRaw =
		payload.labels
		|| interaction.options?.getString?.('labels')
		|| '';
	const assignee =
		payload.assignee
		|| interaction.options?.getUser?.('assignee');
	const inputLabels = labelsRaw
		.split(',')
		.map(label => label.trim())
		.filter(Boolean);
	const defaultLabels = Array.isArray(settings.defaultLabels)
		? settings.defaultLabels
		: (typeof settings.defaultLabels === 'string'
			? settings.defaultLabels.split(',').map(label => label.trim()).filter(Boolean)
			: []);
	const labels = inputLabels.length ? inputLabels : defaultLabels;
	const assignees = assignee ? [assignee.id] : [];

	const rawWelcomeText = settings.welcomeMessage
		?.replace('{user}', `${interaction.user}`)
		|| `${interaction.user} 님의 티켓이 생성되었습니다. 문의 내용을 작성해주세요.`;
	const welcomeText = rawWelcomeText.replace(/\\n/g, '\n');

	const nextTicketNumber = await getNextTicketNumber();

	const ticketChannel = await createTicketChannel(
		interaction.guild,
		interaction.user,
		interaction.client,
		nextTicketNumber,
		settings
	);

	const ticketRecord = await createTicketRecord({
		ticketNumber: nextTicketNumber,
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

	const textLines = [welcomeText];
	if (description) {
		textLines.push(`설명: ${description}`);
	}
	await ticketChannel.send({ content: textLines.join('\n') });

	await updateTicketSummary(ticketChannel, ticketRecord.toObject());

	logger.info(`Ticket #${nextTicketNumber} created: ${ticketChannel.name} (${ticketChannel.id}) by ${interaction.user.tag}`);

	return {
		ticketNumber: nextTicketNumber,
		channel: ticketChannel,
	};
}

module.exports = { createTicket };
