const { findTicketByChannelId } = require('../repository/findTicketByChannelIdRepository');

async function getTicketByChannelId(channelId) {
	return findTicketByChannelId(channelId);
}

module.exports = { getTicketByChannelId };
