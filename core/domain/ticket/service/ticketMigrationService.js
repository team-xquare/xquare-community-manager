const Counter = require('@xquare/domain/ticket/counter');
const Ticket = require('@xquare/domain/ticket/ticket');
const logger = require('@xquare/global/utils/loggers/logger');
const { updateTicketById } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const { buildTicketChannelName, generateChannelUuid, normalizeClosedName } = require('@xquare/domain/ticket/service/ticketChannelNameService');

const COUNTER_ID = 'ticketNumber';

const LOG = {
	counterStart: 'Starting ticket counter migration',
	counterNoTickets: 'Skipping ticket counter migration (no tickets)',
	counterSkipped: 'Ticket counter already up to date',
	counterUpdated: (from, to) => `Ticket counter updated from ${from} to ${to}`,
	counterFailed: 'Ticket counter migration failed',
	participantsStart: 'Starting ticket participants migration',
	participantsSkipped: 'Ticket participants migration skipped',
	participantsUpdated: count => `Ticket participants migration updated: count=${count}`,
	participantsFailed: 'Ticket participants migration failed',
	channelStart: 'Starting ticket channel name migration',
	channelNoTickets: 'Skipping ticket channel name migration (no tickets)',
	channelMissing: 'Ticket channel not found during migration',
	channelRenameFailed: 'Failed to rename ticket channel during migration',
	channelSummary: (renamed, updated, missing) => `Ticket channel migration completed: renamed=${renamed}, updated=${updated}, missing=${missing}`,
	channelFailed: 'Ticket channel migration failed',
};

async function getMaxTicketNumber() {
	const [result] = await Ticket.aggregate([
		{ $group: { _id: null, maxTicketNumber: { $max: '$ticketNumber' } } },
	]);
	return result?.maxTicketNumber || 0;
}

async function migrateTicketCounter() {
	try {
		logger.info(LOG.counterStart);
		const maxTicketNumber = await getMaxTicketNumber();
		if (!maxTicketNumber) return logger.info(LOG.counterNoTickets);
		const counter = await Counter.findById(COUNTER_ID).lean();
		const current = counter?.sequence || 0;
		if (current >= maxTicketNumber) return logger.info(LOG.counterSkipped);
		await Counter.updateOne(
			{ _id: COUNTER_ID },
			{ $set: { sequence: maxTicketNumber } },
			{ upsert: true }
		);
		logger.info(LOG.counterUpdated(current, maxTicketNumber));
	} catch (error) {
		logger.error(LOG.counterFailed, { error });
		throw error;
	}
}

async function migrateTicketParticipants() {
	try {
		logger.info(LOG.participantsStart);
		const result = await Ticket.updateMany(
			{ participants: { $exists: false } },
			{ $set: { participants: [] } }
		);
		const updated = result?.modifiedCount ?? result?.nModified ?? 0;
		if (!updated) return logger.info(LOG.participantsSkipped);
		logger.info(LOG.participantsUpdated(updated));
	} catch (error) {
		logger.error(LOG.participantsFailed, { error });
		throw error;
	}
}

const buildChannelMap = async (client, channelIds) => {
	const channelMap = new Map(channelIds.map(id => [id, client.channels.cache.get(id)]).filter(([, channel]) => channel));
	const missingIds = channelIds.filter(id => !channelMap.has(id));
	if (!missingIds.length) return channelMap;

	const results = await Promise.allSettled(missingIds.map(id => client.channels.fetch(id)));
	results.forEach((result, index) => {
		const channelId = missingIds[index];
		if (result.status === 'fulfilled' && result.value) return channelMap.set(channelId, result.value);
		logger.warn(LOG.channelMissing, { channelId, error: result.status === 'rejected' ? result.reason : null });
	});
	return channelMap;
};

const buildTicketUpdates = (ticket, channelUuid, baseName) => {
	const updates = {};
	if (!ticket.channelUuid) updates.channelUuid = channelUuid;
	if (ticket.status === 'closed' && ticket.originalChannelName !== baseName) updates.originalChannelName = baseName;
	return updates;
};

const buildTargetName = (ticket, baseName) => ticket.status === 'closed' ? normalizeClosedName(baseName) : baseName;

async function migrateTicketChannels(client) {
	try {
		logger.info(LOG.channelStart);
		const tickets = await Ticket.find({ channelDeletedAt: null, channelId: { $ne: null } }).lean();
		if (!tickets.length) return logger.info(LOG.channelNoTickets);

		const channelIds = [...new Set(tickets.map(ticket => ticket.channelId).filter(Boolean))];
		const channelMap = await buildChannelMap(client, channelIds);
		let renamed = 0;
		let updated = 0;
		let missing = 0;

		for (const ticket of tickets) {
			const channelUuid = ticket.channelUuid || generateChannelUuid();
			const baseName = buildTicketChannelName(ticket.ticketNumber, channelUuid);
			const updates = buildTicketUpdates(ticket, channelUuid, baseName);
			if (Object.keys(updates).length) {
				await updateTicketById(ticket._id, updates);
				updated += 1;
			}

			const channel = channelMap.get(ticket.channelId);
			if (!channel) {
				missing += 1;
				continue;
			}

			const targetName = buildTargetName(ticket, baseName);
			if (channel.name === targetName) continue;
			try {
				await channel.setName(targetName.slice(0, 100));
				renamed += 1;
			} catch (error) {
				logger.warn(LOG.channelRenameFailed, { error, ticketId: ticket._id, channelId: ticket.channelId });
			}
		}

		logger.info(LOG.channelSummary(renamed, updated, missing));
	} catch (error) {
		logger.error(LOG.channelFailed, { error });
		throw error;
	}
}

module.exports = {
	migrateTicketCounter,
	migrateTicketParticipants,
	migrateTicketChannels,
};
