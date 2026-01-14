const Counter = require('@xquare/domain/ticket/counter');
const Ticket = require('@xquare/domain/ticket/ticket');
const logger = require('@xquare/global/utils/loggers/logger');

const COUNTER_ID = 'ticketNumber';

const LOG = {
	start: 'Starting ticket counter migration',
	noTickets: 'Skipping ticket counter migration (no tickets)',
	skipped: 'Ticket counter already up to date',
	updated: (from, to) => `Ticket counter updated from ${from} to ${to}`,
	failed: 'Ticket counter migration failed',
};

async function getMaxTicketNumber() {
	const [result] = await Ticket.aggregate([
		{ $group: { _id: null, maxTicketNumber: { $max: '$ticketNumber' } } },
	]);
	return result?.maxTicketNumber || 0;
}

async function migrateTicketCounter() {
	try {
		logger.info(LOG.start);
		const maxTicketNumber = await getMaxTicketNumber();
		if (!maxTicketNumber) return logger.info(LOG.noTickets);
		const counter = await Counter.findById(COUNTER_ID).lean();
		const current = counter?.sequence || 0;
		if (current >= maxTicketNumber) return logger.info(LOG.skipped);
		await Counter.updateOne(
			{ _id: COUNTER_ID },
			{ $set: { sequence: maxTicketNumber } },
			{ upsert: true }
		);
		logger.info(LOG.updated(current, maxTicketNumber));
	} catch (error) {
		logger.error(LOG.failed, { error });
		throw error;
	}
}

module.exports = {
	migrateTicketCounter,
};
