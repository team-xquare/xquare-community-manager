const { createMessage } = require('@xquare/domain/message/repository/createMessageRepository');
const logger = require('@xquare/global/utils/loggers/logger');

async function saveMessage(ticket, message) {
	const messageData = {
		channelId: message.channel.id,
		messageId: message.id,
		authorId: message.author.id,
		authorName: message.author.username,
		content: message.content,
		timestamp: message.createdAt,
	};

	await createMessage(messageData);
	logger.info(`Message saved to ticket #${ticket.ticketNumber}: ${message.author.username} - ${message.content}`);
}

module.exports = { saveMessage };
