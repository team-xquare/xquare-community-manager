const Ticket = require('../ticket');

async function findLastTicket() {
	return Ticket.findOne().sort({ ticketNumber: -1 });
}

module.exports = { findLastTicket };
