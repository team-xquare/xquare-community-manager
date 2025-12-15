const Message = require('../message');

async function createMessage(messageData) {
	return Message.create(messageData);
}

module.exports = { createMessage };
