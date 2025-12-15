const { Events } = require('discord.js');
const logger = require('../core/global/logger');
const { getTicketByChannelId } = require('../core/domain/ticket/service/ticketQueryService');
const { saveMessage } = require('../core/domain/message/service/saveMessageService');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot) return;

		if (message.channel.name && message.channel.name.startsWith('xquare-ticket-')) {
			try {
				const ticket = await getTicketByChannelId(message.channel.id);

				if (ticket) {
					await saveMessage(ticket, message);
				}
			} catch (error) {
				logger.error(`Failed to save message to ticket: ${error}`);
			}
		}
	},
};
