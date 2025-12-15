const { Events } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { getTicketByChannelId } = require('@xquare/domain/ticket/service/ticketQueryService');
const { saveMessage } = require('@xquare/domain/message/service/saveMessageService');

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
				await handleError(wrapUnexpected(error), { message });
			}
		}
	},
};
