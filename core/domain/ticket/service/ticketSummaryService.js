const { EmbedBuilder } = require('discord.js');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');
const { t } = require('@xquare/global/i18n');

const TEXT = {
	status: {
		closed: t('ticket.status.closed'),
		closing: minutesLeft => t('ticket.status.closing', { minutesLeft }),
		inProgress: t('ticket.status.inProgress'),
		open: t('ticket.status.open'),
	},
	labelsNone: t('common.none'),
	assigneesNone: t('common.unassigned'),
	fields: {
		status: t('ticket.summary.field.status'),
		labels: t('ticket.summary.field.labels'),
		assignees: t('ticket.summary.field.assignees'),
		created: t('ticket.summary.field.created'),
	},
};

const LOG = {
	updateFailed: 'Failed to update summary message for ticket',
	sendFailed: 'Failed to send summary message for ticket',
};

const buildStatus = ticket => {
	if (ticket.status === 'closed') return { text: TEXT.status.closed, color: 0xe74c3c };
	if (ticket.closeScheduledAt && ticket.closeScheduledAt.getTime() > Date.now()) {
		const minutesLeft = Math.max(1, Math.ceil((ticket.closeScheduledAt.getTime() - Date.now()) / 60000));
		return { text: TEXT.status.closing(minutesLeft), color: 0xf1c40f };
	}
	if (ticket.status === 'in-progress') return { text: TEXT.status.inProgress, color: 0xf39c12 };
	return { text: TEXT.status.open, color: 0x2ecc71 };
};

const formatLabels = labels => labels?.length ? labels.map(label => `\`${label}\``).join(', ') : TEXT.labelsNone;
const formatAssignees = assignees => assignees?.length ? assignees.map(id => `<@${id}>`).join(', ') : TEXT.assigneesNone;

function buildTicketEmbed(ticket) {
	const statusInfo = buildStatus(ticket);
	const embed = new EmbedBuilder()
		.addFields(
			{ name: TEXT.fields.status, value: statusInfo.text, inline: true },
			{ name: TEXT.fields.labels, value: formatLabels(ticket.labels), inline: true },
			{ name: TEXT.fields.assignees, value: formatAssignees(ticket.assignees), inline: true },
		)
		.setColor(statusInfo.color);

	const createdAtUnix = ticket.createdAt ? Math.floor(ticket.createdAt.getTime() / 1000) : null;
	if (createdAtUnix) embed.addFields({ name: TEXT.fields.created, value: `<t:${createdAtUnix}:f>` });
	return embed;
}

async function updateTicketSummary(channel, ticket) {
	const embed = buildTicketEmbed(ticket);
	if (ticket.summaryMessageId) {
		try {
			const message = await channel.messages.fetch(ticket.summaryMessageId);
			await message.edit({ embeds: [embed] });
			return message;
		} catch (error) {
			logger.warn(LOG.updateFailed, { error, ticketId: ticket.id });
		}
	}

	try {
		const message = await channel.send({ embeds: [embed] });
		await updateTicketByChannelId(channel.id, { summaryMessageId: message.id });
		return message;
	} catch (error) {
		logger.error(LOG.sendFailed, { error, ticketId: ticket.id });
		return null;
	}
}

module.exports = { updateTicketSummary, buildTicketEmbed };
