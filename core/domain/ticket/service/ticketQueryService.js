const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');

async function getTicketByChannelId(channelId) {
	return findTicketByChannelId(channelId);
}

module.exports = { getTicketByChannelId };
