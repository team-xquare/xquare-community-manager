const { PermissionsBitField } = require('discord.js');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { findAllTickets } = require('@xquare/domain/ticket/repository/findTicketsRepository');
const NotFoundError = require('@xquare/global/utils/errors/NotFoundError');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const logger = require('@xquare/global/utils/loggers/logger');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const { getOrCreateCategory } = require('@xquare/global/utils/category');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const { buildTicketChannelName, normalizeClosedName, normalizeOpenName } = require('@xquare/domain/ticket/service/ticketChannelNameService');
const { ensureCategoryCapacity } = require('@xquare/domain/ticket/service/ticketRetentionService');
const { t } = require('@xquare/global/i18n');

const ERROR = {
	adminOnlyClose: t('ticket.errors.adminOnlyClose'),
	ticketNotFound: t('ticket.errors.ticketNotFound'),
	alreadyClosed: t('ticket.errors.alreadyClosed'),
	alreadyClosing: t('ticket.errors.alreadyClosing'),
};

const TEXT = {
	reasonLine: reason => t('ticket.lifecycle.reasonLine', { reason }),
	closed: (userId, reason) => t('ticket.lifecycle.closed', { userId, reason }),
	closeScheduled: (time, assigneeId, authorId) => t('ticket.lifecycle.closeScheduled', { time, assigneeId, authorId }),
	reopened: userId => t('ticket.lifecycle.reopened', { userId }),
};

const LOG = {
	renameClosedFailed: 'Failed to rename closed ticket channel',
	setCategoryFailed: 'Failed to set ticket channel category',
	categoryFull: 'Category limit reached, unable to move ticket channel',
	permissionsClosedFailed: 'Failed to update permissions for closed ticket',
	finalizeCloseFailed: 'Failed to finalize ticket close',
	renameReopenFailed: 'Failed to restore ticket channel name',
	permissionsReopenFailed: 'Failed to restore permissions for reopened ticket',
	channelMissing: 'Failed to find channel for scheduled close',
	scheduleFailed: 'Failed to schedule close for ticket',
};

const pendingCloseTimers = new Map();

const padTwo = value => String(value).padStart(2, '0');
const formatCloseTime = date => `${date.getFullYear()}-${padTwo(date.getMonth() + 1)}-${padTwo(date.getDate())}, ${padTwo(date.getHours())}-${padTwo(date.getMinutes())}`;

const hasManageGuild = member => member?.permissions?.has?.(PermissionsBitField.Flags.ManageGuild);

const assertAdmin = member => {
	if (hasManageGuild(member)) return;
	throw new ValidationError(ERROR.adminOnlyClose, { expose: true });
};

const updateCloseStatus = (channel, ticket, actorId, openName) => updateTicketByChannelId(channel.id, {
	status: 'closed',
	closedAt: new Date(),
	closedBy: actorId,
	closeScheduledAt: null,
	closeScheduledBy: null,
	originalChannelName: openName,
	lastActivityAt: new Date(),
});

const updateReopenStatus = channel => updateTicketByChannelId(channel.id, {
	status: 'open',
	closedAt: null,
	closedBy: null,
	closeScheduledAt: null,
	closeScheduledBy: null,
	originalChannelName: null,
	lastActivityAt: new Date(),
});

const renameClosedChannel = async (channel, openName) => {
	const targetName = normalizeClosedName(openName || channel.name);
	try {
		await channel.setName(targetName.slice(0, 100));
	} catch (error) {
		logger.warn(LOG.renameClosedFailed, { error, channelId: channel.id });
	}
};

const renameOpenChannel = async (channel, openName) => {
	const targetName = normalizeOpenName(openName || channel.name);
	try {
		await channel.setName(targetName.slice(0, 100));
	} catch (error) {
		logger.warn(LOG.renameReopenFailed, { error, channelId: channel.id });
	}
};

const updateCategory = async (channel, categoryName) => {
	let categoryId = null;
	try {
		const category = await getOrCreateCategory(channel.guild, categoryName);
		categoryId = category.id;
		const capacityReady = await ensureCategoryCapacity(category);
		if (!capacityReady) return logger.warn(LOG.categoryFull, { channelId: channel.id, categoryId });
		await channel.setParent(category.id);
	} catch (error) {
		logger.warn(LOG.setCategoryFailed, { error, channelId: channel.id, categoryId });
	}
};

const getCategoryName = async (channel, key) => {
	try {
		const settings = await getSetting('guild', channel.guild.id, 'ticket', 'ui');
		return settings[key];
	} catch (error) {
		logger.warn(LOG.setCategoryFailed, { error, channelId: channel.id });
		return null;
	}
};

const resolveOpenChannelName = (ticket, channel) => {
	if (ticket?.channelUuid) return buildTicketChannelName(ticket.ticketNumber, ticket.channelUuid);
	if (ticket?.originalChannelName) return normalizeOpenName(ticket.originalChannelName);
	return normalizeOpenName(channel.name);
};

const updatePermissions = async (channel, userId, permissions, logMessage, logContext) => {
	try {
		await channel.permissionOverwrites.edit(userId, permissions);
	} catch (error) {
		logger.warn(logMessage, { error, ...logContext });
	}
};

const cancelScheduledClose = channelId => {
	const timer = pendingCloseTimers.get(channelId);
	if (!timer) return;
	clearTimeout(timer);
	pendingCloseTimers.delete(channelId);
};

const scheduleCloseTimer = (channel, closesAt, reason) => {
	cancelScheduledClose(channel.id);
	const delay = closesAt.getTime() - Date.now();
	if (delay <= 0) return void handleScheduledClose(channel, reason);
	const timer = setTimeout(() => void handleScheduledClose(channel, reason), delay);
	pendingCloseTimers.set(channel.id, timer);
};

async function finalizeClose(channel, ticket, actorId, reason) {
	const openName = resolveOpenChannelName(ticket, channel);
	const updated = await updateCloseStatus(channel, ticket, actorId, openName);
	await updateTicketSummary(channel, updated);
	await renameClosedChannel(channel, openName);
	const closeCategory = await getCategoryName(channel, 'closeCategory');
	if (closeCategory) await updateCategory(channel, closeCategory);
	await updatePermissions(channel, ticket.userId, { SendMessages: false, ViewChannel: true, ReadMessageHistory: true }, LOG.permissionsClosedFailed, { channelId: channel.id, userId: ticket.userId });
	const reasonText = reason ? TEXT.reasonLine(reason) : '';
	await channel.send(TEXT.closed(ticket.userId, reasonText));
	return updated;
}

async function handleScheduledClose(channel, reason) {
	try {
		const ticket = await findTicketByChannelId(channel.id);
		if (!ticket || !ticket.closeScheduledAt) return;
		if (ticket.closeScheduledAt.getTime() > Date.now()) return scheduleCloseTimer(channel, ticket.closeScheduledAt, reason);
		await finalizeClose(channel, ticket, ticket.closeScheduledBy || null, reason);
	} catch (error) {
		logger.error(LOG.finalizeCloseFailed, { error, channelId: channel.id });
	} finally {
		pendingCloseTimers.delete(channel.id);
	}
}

async function closeTicket(channel, actorMember, reason, options = {}) {
	assertAdmin(actorMember);
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError(ERROR.ticketNotFound);
	if (ticket.status === 'closed') throw new ValidationError(ERROR.alreadyClosed);
	if (ticket.closeScheduledAt && ticket.closeScheduledAt.getTime() > Date.now()) throw new ValidationError(ERROR.alreadyClosing);

	const delayMs = options.delayMs ?? 5 * 60 * 1000;
	const closesAt = new Date(Date.now() + delayMs);
	const updated = await updateTicketByChannelId(channel.id, { closeScheduledAt: closesAt, closeScheduledBy: actorMember.id });
	await updateTicketSummary(channel, updated);

	const closeTime = formatCloseTime(closesAt);
	await channel.send(TEXT.closeScheduled(closeTime, actorMember.id, ticket.userId));

	scheduleCloseTimer(channel, closesAt, reason);
	return { scheduled: true, closesAt };
}

async function reopenTicket(channel, actorMember) {
	assertAdmin(actorMember);
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError(ERROR.ticketNotFound);

	const openName = resolveOpenChannelName(ticket, channel);
	cancelScheduledClose(channel.id);
	const updated = await updateReopenStatus(channel);
	await updateTicketSummary(channel, updated);
	await renameOpenChannel(channel, openName);
	const openCategory = await getCategoryName(channel, 'openCategory');
	if (openCategory) await updateCategory(channel, openCategory);
	await updatePermissions(channel, ticket.userId, { SendMessages: true, ViewChannel: true, ReadMessageHistory: true }, LOG.permissionsReopenFailed, { ticketId: ticket.id });
	await channel.send(TEXT.reopened(ticket.userId));
	return updated;
}

async function bootstrapScheduledCloses(client) {
	const tickets = await findAllTickets({ closeScheduledAt: { $ne: null }, status: { $ne: 'closed' }, channelDeletedAt: null, channelId: { $ne: null } });
	const channelIds = [...new Set(tickets.map(ticket => ticket.channelId).filter(Boolean))];
	const channelMap = new Map(channelIds.map(id => [id, client.channels.cache.get(id)]).filter(([, channel]) => channel));
	const fetchIds = channelIds.filter(id => !channelMap.has(id));

	const fetchResults = await Promise.allSettled(fetchIds.map(channelId => client.channels.fetch(channelId)));
	fetchResults.forEach((result, index) => {
		const channelId = fetchIds[index];
		if (result.status === 'fulfilled' && result.value) return channelMap.set(channelId, result.value);
		return logger.warn(LOG.channelMissing, { channelId, error: result.status === 'rejected' ? result.reason : null });
	});

	tickets.forEach(ticket => {
		try {
			const channel = channelMap.get(ticket.channelId);
			if (!channel) return logger.warn(LOG.channelMissing, { channelId: ticket.channelId });
			return scheduleCloseTimer(channel, ticket.closeScheduledAt, null);
		} catch (error) {
			logger.error(LOG.scheduleFailed, { error, ticketId: ticket.id });
		}
	});
}

module.exports = { closeTicket, reopenTicket, bootstrapScheduledCloses };
