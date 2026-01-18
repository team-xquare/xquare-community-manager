const { Events, PermissionFlagsBits } = require('discord.js');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { getTicketByChannelId } = require('@xquare/domain/ticket/service/ticketQueryService');
const { saveMessage } = require('@xquare/domain/message/service/saveMessageService');
const { addAssignees } = require('@xquare/domain/ticket/service/ticketMetadataService');

const hasAdminPermission = member => member?.permissions?.has?.(PermissionFlagsBits.ManageGuild);

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author?.bot) return;

		try {
			const ticket = await getTicketByChannelId(message.channel.id);
			if (!ticket) return;
			await saveMessage(ticket, message);
			if (!hasAdminPermission(message.member)) return;
			if (ticket.status === 'closed') return;
			const authorId = message.author.id;
			if (ticket.assignees?.includes(authorId)) return;
			await addAssignees(message.channel, [authorId]);
		} catch (error) {
			await handleError(wrapUnexpected(error), { message });
		}
	},
};
