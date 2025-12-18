const Ticket = require('../ticket');

async function updateTicketById(id, payload) {
	return Ticket.findByIdAndUpdate(id, payload, { new: true });
}

async function updateTicketByChannelId(channelId, payload) {
	return Ticket.findOneAndUpdate({ channelId }, payload, { new: true });
}

module.exports = { updateTicketById, updateTicketByChannelId };
