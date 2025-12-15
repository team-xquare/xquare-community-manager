const Ticket = require('../ticket');

async function findTicketByChannelId(channelId) {
	return Ticket.findOne({ channelId });
}

module.exports = { findTicketByChannelId };
