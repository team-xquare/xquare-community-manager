const { createMessage } = require('@xquare/domain/message/repository/createMessageRepository');
const { updateTicketById } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const logger = require('@xquare/global/utils/loggers/logger');

async function saveMessage(ticket, message) {
	const messageData = {
		ticketId: ticket.id,
		channelId: message.channel.id,
		messageId: message.id,
		authorId: message.author.id,
		authorName: message.author.username,
		content: message.content,
		timestamp: message.createdAt,
	};

	await createMessage(messageData);
	await updateTicketById(ticket.id, { lastActivityAt: new Date() });
	logger.info(`Message saved to ticket #${ticket.ticketNumber}: ${message.author.username} - ${message.content}`);
}

module.exports = { saveMessage };
