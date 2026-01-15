const { randomUUID } = require('node:crypto');

const CHANNEL_NAME_PREFIX = 'open';

const buildTicketChannelName = (ticketNumber, channelUuid) => `${CHANNEL_NAME_PREFIX}-${ticketNumber}-${channelUuid}`.toLowerCase();

const generateChannelUuid = () => randomUUID();

const normalizeClosedName = name => name.startsWith('close-') ? name : `close-${name}`;
const stripClosedPrefix = name => name.replace(/^close-/, '');

module.exports = {
	CHANNEL_NAME_PREFIX,
	buildTicketChannelName,
	generateChannelUuid,
	normalizeClosedName,
	stripClosedPrefix,
};
