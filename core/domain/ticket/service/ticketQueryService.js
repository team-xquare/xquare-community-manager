const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { findTickets } = require('@xquare/domain/ticket/repository/findTicketsRepository');
const { validateQueryFilters, sanitizeDiscordId } = require('@xquare/global/utils/validators');

const DEFAULTS = { minLimit: 1, maxLimit: 100, limit: 10 };

const buildQuery = filters => {
	const query = {};
	if (filters.guildId) query.guildId = filters.guildId;
	if (filters.status) query.status = filters.status;
	if (filters.label) query.labels = { $in: [filters.label] };
	if (filters.assignee) query.assignees = { $in: [filters.assignee] };
	return query;
};

const normalizeLimit = limit => Math.min(Math.max(DEFAULTS.minLimit, limit || DEFAULTS.limit), DEFAULTS.maxLimit);

async function getTicketByChannelId(channelId) {
	return findTicketByChannelId(sanitizeDiscordId(channelId, 'Channel ID'));
}

async function listTickets(filters = {}, options = {}) {
	const sanitized = validateQueryFilters(filters);
	return findTickets(buildQuery(sanitized), normalizeLimit(options.limit));
}

module.exports = { getTicketByChannelId, listTickets };
