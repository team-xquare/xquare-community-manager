const Ticket = require('../ticket');

async function createTicket(ticketData) {
	return Ticket.create(ticketData);
}

module.exports = { createTicket };
