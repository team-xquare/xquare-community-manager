const Ticket = require('../ticket');

async function findTicketByChannelId(channelId) {
	return Ticket.findOne({ channelId });
}

async function findTicketById(id) {
	return Ticket.findById(id);
}

async function findTicketByNumber(ticketNumber) {
	return Ticket.findOne({ ticketNumber });
}

module.exports = { findTicketByChannelId, findTicketById, findTicketByNumber };
