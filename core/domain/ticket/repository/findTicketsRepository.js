const Ticket = require('../ticket');

async function findTickets(query, limit = 10) {
	return Ticket.find(query)
		.sort({ lastActivityAt: -1, createdAt: -1 })
		.limit(limit);
}

async function findAllTickets(query) {
	return Ticket.find(query);
}

module.exports = { findTickets, findAllTickets };
