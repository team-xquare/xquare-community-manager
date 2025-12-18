const { EmbedBuilder } = require('discord.js');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');

function buildStatus(ticket) {
	const now = Date.now();
	if (ticket.status === 'closed') {
		return { text: 'closed', color: 0xe74c3c };
	}

	if (ticket.closeScheduledAt && ticket.closeScheduledAt.getTime() > now) {
		const minutesLeft = Math.max(1, Math.ceil((ticket.closeScheduledAt.getTime() - now) / 60000));
		return { text: `closing ${minutesLeft}분 후`, color: 0xf1c40f };
	}

	if (ticket.status === 'in-progress') {
		return { text: 'in-progress', color: 0xf39c12 };
	}

	return { text: 'open', color: 0x2ecc71 };
}

function buildTicketEmbed(ticket) {
	const labelsText = ticket.labels?.length ? ticket.labels.map(label => `\`${label}\``).join(', ') : '없음';
	const assigneesText = ticket.assignees?.length ? ticket.assignees.map(id => `<@${id}>`).join(', ') : '미지정';
	const createdAtUnix = ticket.createdAt ? Math.floor(ticket.createdAt.getTime() / 1000) : null;
	const statusInfo = buildStatus(ticket);

	const embed = new EmbedBuilder()
		.addFields(
			{ name: '상태', value: statusInfo.text, inline: true },
			{ name: '라벨', value: labelsText, inline: true },
			{ name: '담당자', value: assigneesText, inline: true },
		)
		.setColor(statusInfo.color);

	if (createdAtUnix) {
		embed.addFields({ name: '생성', value: `<t:${createdAtUnix}:f>` });
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
			logger.warn(`Failed to update summary message for ticket ${ticket.id}: ${error}`);
		}
	}

	try {
		const message = await channel.send({ embeds: [embed] });
		await updateTicketByChannelId(channel.id, { summaryMessageId: message.id });
		return message;
	} catch (error) {
		logger.error(`Failed to send summary message for ticket ${ticket.id}: ${error}`);
		return null;
	}
}

module.exports = {
	updateTicketSummary,
	buildTicketEmbed,
};
