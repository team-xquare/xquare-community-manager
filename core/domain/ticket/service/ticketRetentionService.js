const Ticket = require('@xquare/domain/ticket/ticket');
const logger = require('@xquare/global/utils/loggers/logger');
const { updateTicketById } = require('@xquare/domain/ticket/repository/updateTicketRepository');

const LIMITS = {
	categoryMax: 50,
	defaultRetentionDays: 7,
	sweepIntervalMs: 60 * 60 * 1000,
};

const LOG = {
	sweepStart: days => `Starting ticket retention sweep (days=${days})`,
	sweepDone: (deleted, missing) => `Ticket retention sweep completed: deleted=${deleted}, missing=${missing}`,
	sweepFailed: 'Ticket retention sweep failed',
	deleteFailed: 'Failed to delete ticket channel',
	deleteMissing: 'Ticket channel missing during deletion',
	categoryPruneFailed: 'Failed to prune category channels',
	categoryPruneDeleted: (count, categoryId) => `Category channels pruned: count=${count}, categoryId=${categoryId}`,
};

const REASON = {
	retention: 'Auto delete: retention expired',
	categoryLimit: 'Auto delete: category limit reached',
};

const getRetentionDays = () => {
	const raw = Number(process.env.TICKET_RETENTION_DAYS);
	if (!Number.isFinite(raw) || raw <= 0) return LIMITS.defaultRetentionDays;
	return Math.floor(raw);
};

const buildDeletionUpdate = ticket => {
	const now = new Date();
	const update = {
		channelDeletedAt: now,
		channelId: null,
		closeScheduledAt: null,
		closeScheduledBy: null,
		lastActivityAt: now,
	};
	if (ticket?.status !== 'closed') update.status = 'closed';
	if (!ticket?.closedAt) update.closedAt = now;
	return update;
};

const isTicketChannelName = name => {
	const lower = name?.toLowerCase?.() || '';
	if (lower.includes('xquare-issue-')) return true;
	return /^(open|close|closed)?-?\d+-[0-9a-f-]{8,}/.test(lower);
};

const fetchGuildChannels = async guild => guild.channels.fetch();

const fetchChannel = async (client, channelId) => (
	client.channels.cache.get(channelId) || client.channels.fetch(channelId).catch(() => null)
);

const deleteChannel = async (channel, reason) => {
	if (!channel) return false;
	try {
		await channel.delete(reason);
		return true;
	} catch (error) {
		logger.warn(LOG.deleteFailed, { error, channelId: channel.id });
		return false;
	}
};

const deleteTicketChannel = async (client, ticket, reason) => {
	const channel = await fetchChannel(client, ticket.channelId);
	if (!channel) {
		logger.warn(LOG.deleteMissing, { ticketId: ticket._id, channelId: ticket.channelId });
		return { deleted: false, missing: true };
	}
	const deleted = await deleteChannel(channel, reason);
	if (deleted) await updateTicketById(ticket._id, buildDeletionUpdate(ticket));
	return { deleted, missing: false };
};

const getCategoryChannels = async category => {
	await fetchGuildChannels(category.guild);
	return [...category.guild.channels.cache.values()].filter(channel => channel.parentId === category.id);
};

const sortByCreatedAt = items => [...items].sort((a, b) => a.createdAt - b.createdAt);

const buildChannelCandidates = async channels => {
	const ticketChannels = channels.filter(channel => isTicketChannelName(channel.name));
	const channelIds = ticketChannels.map(channel => channel.id);
	const tickets = await Ticket.find({ channelId: { $in: channelIds }, channelDeletedAt: null }).lean();
	const ticketMap = new Map(tickets.map(ticket => [ticket.channelId, ticket]));
	return ticketChannels.map(channel => ({ channel, ticket: ticketMap.get(channel.id) }));
};

const pickPrunableChannels = candidates => {
	const mapped = candidates.map(item => ({
		channel: item.channel,
		status: item.ticket?.status || 'unknown',
		createdAt: item.ticket?.createdAt || new Date(item.channel.createdTimestamp || 0),
		ticket: item.ticket,
	}));
	const closed = sortByCreatedAt(mapped.filter(item => item.status === 'closed'));
	if (closed.length) return closed;
	return sortByCreatedAt(mapped);
};

const deleteChannelCandidate = async (candidate, reason) => {
	const deleted = await deleteChannel(candidate.channel, reason);
	if (deleted && candidate.ticket) await updateTicketById(candidate.ticket._id, buildDeletionUpdate(candidate.ticket));
	return deleted;
};

const pruneCategory = async (category, total) => {
	const candidates = await buildChannelCandidates(await getCategoryChannels(category));
	if (total < LIMITS.categoryMax) return { deleted: 0, pruned: false };
	const overflow = total - LIMITS.categoryMax + 1;
	const deletables = pickPrunableChannels(candidates).slice(0, overflow);
	if (!deletables.length) return { deleted: 0, pruned: false };
	let deleted = 0;
	for (const item of deletables) {
		const result = await deleteChannelCandidate(item, REASON.categoryLimit);
		if (result) deleted += 1;
	}
	logger.info(LOG.categoryPruneDeleted(deleted, category.id));
	return { deleted, pruned: true };
};

const ensureCategoryCapacity = async category => {
	try {
		const channels = await getCategoryChannels(category);
		const total = channels.length;
		if (total < LIMITS.categoryMax) return true;
		await pruneCategory(category, total);
		const updatedTotal = (await getCategoryChannels(category)).length;
		return updatedTotal < LIMITS.categoryMax;
	} catch (error) {
		logger.warn(LOG.categoryPruneFailed, { error, categoryId: category?.id });
		return false;
	}
};

const buildRetentionQuery = cutoff => ({
	lastActivityAt: { $ne: null, $lte: cutoff },
	channelDeletedAt: null,
	channelId: { $ne: null },
});

const sweepExpiredTickets = async client => {
	const retentionDays = getRetentionDays();
	const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
	logger.info(LOG.sweepStart(retentionDays));
	const tickets = await Ticket.find(buildRetentionQuery(cutoff)).lean();
	let deleted = 0;
	let missing = 0;
	for (const ticket of tickets) {
		const result = await deleteTicketChannel(client, ticket, REASON.retention);
		if (result.deleted) deleted += 1;
		if (result.missing) missing += 1;
	}
	logger.info(LOG.sweepDone(deleted, missing));
};

const startTicketRetention = client => {
	const run = () => sweepExpiredTickets(client).catch(error => logger.error(LOG.sweepFailed, { error }));
	run();
	setInterval(run, LIMITS.sweepIntervalMs);
};

module.exports = {
	startTicketRetention,
	ensureCategoryCapacity,
};
