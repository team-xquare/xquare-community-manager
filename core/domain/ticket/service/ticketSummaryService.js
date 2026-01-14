const { EmbedBuilder } = require('discord.js');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');
const { t } = require('@xquare/global/i18n');

function buildStatus(ticket) {
	const now = Date.now();
	if (ticket.status === 'closed') {
		return { text: t('ticket.status.closed'), color: 0xe74c3c };
	}

	if (ticket.closeScheduledAt && ticket.closeScheduledAt.getTime() > now) {
		const minutesLeft = Math.max(1, Math.ceil((ticket.closeScheduledAt.getTime() - now) / 60000));
		return { text: t('ticket.status.closing', { minutesLeft }), color: 0xf1c40f };
	}

	if (ticket.status === 'in-progress') {
		return { text: t('ticket.status.inProgress'), color: 0xf39c12 };
	}

	return { text: t('ticket.status.open'), color: 0x2ecc71 };
}

function buildTicketEmbed(ticket) {
	const labelsText = ticket.labels?.length ? ticket.labels.map(label => `\`${label}\``).join(', ') : t('common.none');
	const assigneesText = ticket.assignees?.length ? ticket.assignees.map(id => `<@${id}>`).join(', ') : t('common.unassigned');
	const createdAtUnix = ticket.createdAt ? Math.floor(ticket.createdAt.getTime() / 1000) : null;
	const statusInfo = buildStatus(ticket);

	const embed = new EmbedBuilder()
		.addFields(
			{ name: t('ticket.summary.field.status'), value: statusInfo.text, inline: true },
			{ name: t('ticket.summary.field.labels'), value: labelsText, inline: true },
			{ name: t('ticket.summary.field.assignees'), value: assigneesText, inline: true },
		)
		.setColor(statusInfo.color);

	if (createdAtUnix) {
		embed.addFields({ name: t('ticket.summary.field.created'), value: `<t:${createdAtUnix}:f>` });
	}

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
			logger.warn('Failed to update summary message for ticket', { error, ticketId: ticket.id });
		}
	}

	try {
		const message = await channel.send({ embeds: [embed] });
		await updateTicketByChannelId(channel.id, { summaryMessageId: message.id });
		return message;
	} catch (error) {
		logger.error('Failed to send summary message for ticket', { error, ticketId: ticket.id });
		return null;
	}
}

module.exports = {
	updateTicketSummary,
	buildTicketEmbed,
};
