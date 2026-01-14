const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { findTickets } = require('@xquare/domain/ticket/repository/findTicketsRepository');
const { validateQueryFilters, sanitizeDiscordId } = require('@xquare/global/utils/validators');

async function getTicketByChannelId(channelId) {
	const sanitizedChannelId = sanitizeDiscordId(channelId, 'Channel ID');
	return findTicketByChannelId(sanitizedChannelId);
}

async function listTickets(filters = {}, options = {}) {
	const sanitizedFilters = validateQueryFilters(filters);

	const query = {};
	if (sanitizedFilters.guildId) {
		query.guildId = sanitizedFilters.guildId;
	}
	if (sanitizedFilters.status) {
		query.status = sanitizedFilters.status;
	}
	if (sanitizedFilters.label) {
		query.labels = { $in: [sanitizedFilters.label] };
	}
	if (sanitizedFilters.assignee) {
		query.assignees = { $in: [sanitizedFilters.assignee] };
	}

	const limit = Math.min(Math.max(1, options.limit || 10), 100);
	return findTickets(query, limit);
}

module.exports = { getTicketByChannelId, listTickets };
