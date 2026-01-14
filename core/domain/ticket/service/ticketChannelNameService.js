const { randomUUID } = require('node:crypto');

const CHANNEL_NAME_PREFIX = 'xquare-issue';

const buildTicketChannelName = (ticketNumber, channelUuid) => `${CHANNEL_NAME_PREFIX}-${ticketNumber}-${channelUuid}`.toLowerCase();

const generateChannelUuid = () => randomUUID();

const normalizeClosedName = name => name.startsWith('closed-') ? name : `closed-${name}`;
const stripClosedPrefix = name => name.replace(/^closed-/, '');

module.exports = {
	CHANNEL_NAME_PREFIX,
	buildTicketChannelName,
	generateChannelUuid,
	normalizeClosedName,
	stripClosedPrefix,
};
