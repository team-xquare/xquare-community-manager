const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const NotFoundError = require('@xquare/global/utils/errors/NotFoundError');
const logger = require('@xquare/global/utils/loggers/logger');
const { t } = require('@xquare/global/i18n');

const ERROR = {
	ticketNotFound: t('ticket.errors.ticketNotFound'),
};

const LOG = {
	grantFailed: 'Failed to grant participant access',
	revokeFailed: 'Failed to revoke participant access',
};

const PERMISSIONS = {
	ViewChannel: true,
	SendMessages: true,
	ReadMessageHistory: true,
};

const buildUpdatedArray = (currentValues, items, operation) => {
	const current = new Set(currentValues || []);
	if (operation === 'add') return [...new Set([...current, ...items])];
	if (operation === 'remove') return [...current].filter(item => !items.includes(item));
	return currentValues || [];
};

const ensureTicket = async channel => {
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError(ERROR.ticketNotFound);
	return ticket;
};

const grantAccess = async (channel, userId) => {
	try {
		await channel.permissionOverwrites.edit(userId, PERMISSIONS);
	} catch (error) {
		logger.warn(LOG.grantFailed, { error, channelId: channel.id, userId });
	}
};

const revokeAccess = async (channel, userId) => {
	try {
		await channel.permissionOverwrites.delete(userId);
	} catch (error) {
		logger.warn(LOG.revokeFailed, { error, channelId: channel.id, userId });
	}
};

const filterParticipants = (ticket, userIds) => userIds.filter(id => id && id !== ticket.userId);

async function addParticipants(channel, userIds) {
	const ticket = await ensureTicket(channel);
	const filtered = filterParticipants(ticket, userIds);
	const existing = ticket.participants || [];
	const toAdd = filtered.filter(id => !existing.includes(id));
	if (!toAdd.length) return ticket;

	const updatedParticipants = buildUpdatedArray(existing, toAdd, 'add');
	const updated = await updateTicketByChannelId(channel.id, { participants: updatedParticipants, lastActivityAt: new Date() });
	await updateTicketSummary(channel, updated);
	await Promise.all(toAdd.map(userId => grantAccess(channel, userId)));
	return updated;
}

async function removeParticipants(channel, userIds) {
	const ticket = await ensureTicket(channel);
	const filtered = filterParticipants(ticket, userIds);
	const existing = ticket.participants || [];
	const toRemove = filtered.filter(id => existing.includes(id));
	if (!toRemove.length) return ticket;

	const updatedParticipants = buildUpdatedArray(existing, toRemove, 'remove');
	const updated = await updateTicketByChannelId(channel.id, { participants: updatedParticipants, lastActivityAt: new Date() });
	await updateTicketSummary(channel, updated);
	await Promise.all(toRemove.map(userId => revokeAccess(channel, userId)));
	return updated;
}

module.exports = { addParticipants, removeParticipants };
