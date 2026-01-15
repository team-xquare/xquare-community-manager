const { randomUUID } = require('node:crypto');

const CLOSED_PREFIX = 'close-';
const OPEN_PREFIX = 'open-';

const buildTicketChannelName = (ticketNumber, channelUuid) => `${ticketNumber}-${channelUuid}`.toLowerCase();

const generateChannelUuid = () => randomUUID();

const stripClosedPrefix = name => name.replace(/^(close-|closed-)/, '');
const stripOpenPrefix = name => name.replace(new RegExp(`^${OPEN_PREFIX}`), '');
const normalizeClosedName = name => {
	const base = stripOpenPrefix(stripClosedPrefix(name));
	return base.startsWith(CLOSED_PREFIX) ? base : `${CLOSED_PREFIX}${base}`;
};

module.exports = {
	buildTicketChannelName,
	generateChannelUuid,
	normalizeClosedName,
	stripClosedPrefix,
};
