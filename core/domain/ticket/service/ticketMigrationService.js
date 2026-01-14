const Counter = require('@xquare/domain/ticket/counter');
const Ticket = require('@xquare/domain/ticket/ticket');
const logger = require('@xquare/global/utils/loggers/logger');
const { t } = require('@xquare/global/i18n');

const COUNTER_ID = 'ticketNumber';

const MESSAGES = {
	start: t('ticket.migration.start'),
	noTickets: t('ticket.migration.noTickets'),
	skipped: t('ticket.migration.skipped'),
	updated: (from, to) => t('ticket.migration.updated', { from, to }),
	failed: t('ticket.migration.failed'),
};

async function getMaxTicketNumber() {
	const [result] = await Ticket.aggregate([
		{ $group: { _id: null, maxTicketNumber: { $max: '$ticketNumber' } } },
	]);
	return result?.maxTicketNumber || 0;
}

async function migrateTicketCounter() {
	try {
		logger.info(MESSAGES.start);
		const maxTicketNumber = await getMaxTicketNumber();
		if (!maxTicketNumber) {
			logger.info(MESSAGES.noTickets);
			return;
		}
		const counter = await Counter.findById(COUNTER_ID).lean();
		const current = counter?.sequence || 0;
		if (current >= maxTicketNumber) {
			logger.info(MESSAGES.skipped);
			return;
		}
		await Counter.updateOne(
			{ _id: COUNTER_ID },
			{ $set: { sequence: maxTicketNumber } },
			{ upsert: true }
		);
		logger.info(MESSAGES.updated(current, maxTicketNumber));
	} catch (error) {
		logger.error(MESSAGES.failed, { error });
		throw error;
	}
}

module.exports = {
	migrateTicketCounter,
};
