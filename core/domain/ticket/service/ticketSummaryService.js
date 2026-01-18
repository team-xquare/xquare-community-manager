const { EmbedBuilder } = require('discord.js');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');

const TEXT = {
	status: {
		closed: 'CLOSED',
		closing: 'CLOSING',
		progressing: 'PROGRESSING',
		pending: 'PENDING',
	},
	labelsNone: 'NONE',
	assigneesNone: 'UNASSIGNED',
	fields: {
		status: 'STATUS',
		labels: 'LABELS',
		assignees: 'ASSIGNEES',
		created: 'CREATED',
	},
};

const LOG = {
	updateFailed: 'Failed to update summary message for ticket',
	sendFailed: 'Failed to send summary message for ticket',
};

const buildStatus = ticket => {
	if (ticket.status === 'closed') return { text: TEXT.status.closed, color: 0xe74c3c };
	if (ticket.closeScheduledAt && ticket.closeScheduledAt.getTime() > Date.now()) return { text: TEXT.status.closing, color: 0xf1c40f };
	if (ticket.status === 'in-progress' || ticket.assignees?.length) return { text: TEXT.status.progressing, color: 0x3498db };
	return { text: TEXT.status.pending, color: 0x2ecc71 };
};

const formatLabels = labels => labels?.length ? labels.map(label => `\`${label}\``).join(', ') : TEXT.labelsNone;
const formatAssignees = assignees => assignees?.length ? assignees.map(id => `<@${id}>`).join(', ') : TEXT.assigneesNone;

const getKstParts = date => new Intl.DateTimeFormat('sv-SE', {
	timeZone: 'Asia/Seoul',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit',
	hour: '2-digit',
	minute: '2-digit',
	hour12: false,
}).formatToParts(date).reduce((acc, part) => {
	acc[part.type] = part.value;
	return acc;
}, {});

const formatCreatedAt = ticket => {
	const createdAt = ticket.createdAt ? new Date(ticket.createdAt) : null;
	if (!createdAt) return null;
	const parts = getKstParts(createdAt);
	if (!parts.year) return null;
	return `${parts.year}-${parts.month}-${parts.day}, ${parts.hour}-${parts.minute}`;
};

function buildTicketEmbed(ticket) {
	const statusInfo = buildStatus(ticket);
	const createdAtText = formatCreatedAt(ticket);
	const statusValue = createdAtText ? `${statusInfo.text} • ${TEXT.fields.created} ${createdAtText}` : statusInfo.text;
	const embed = new EmbedBuilder()
		.addFields(
			{ name: TEXT.fields.status, value: statusValue, inline: true },
			{ name: TEXT.fields.labels, value: formatLabels(ticket.labels), inline: true },
			{ name: TEXT.fields.assignees, value: formatAssignees(ticket.assignees), inline: true },
		)
		.setColor(statusInfo.color);
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
