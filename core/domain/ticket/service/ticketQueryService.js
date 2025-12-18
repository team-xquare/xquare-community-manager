const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { findTickets } = require('@xquare/domain/ticket/repository/findTicketsRepository');

async function getTicketByChannelId(channelId) {
	return findTicketByChannelId(channelId);
}

async function listTickets(filters = {}, options = {}) {
	const query = {};
	if (filters.guildId) query.guildId = filters.guildId;
	if (filters.status) query.status = filters.status;
	if (filters.label) query.labels = filters.label;
	if (filters.assignee) query.assignees = filters.assignee;

	const limit = options.limit || 10;
	return findTickets(query, limit);
}

module.exports = { getTicketByChannelId, listTickets };
