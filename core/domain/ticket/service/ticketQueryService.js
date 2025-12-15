const { findTicketByChannelId } = require('@domain/ticket/repository/findTicketByChannelIdRepository');

async function getTicketByChannelId(channelId) {
	return findTicketByChannelId(channelId);
}

module.exports = { getTicketByChannelId };
