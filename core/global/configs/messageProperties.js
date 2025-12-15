const DEFAULT_PREFIX = 'xquare-ticket';
const DEFAULT_PAD_LENGTH = 3;

function parsePadLength(raw) {
	const parsed = Number.parseInt(raw, 10);
	if (Number.isFinite(parsed) && parsed > 0) {
		return parsed;
	}
	return DEFAULT_PAD_LENGTH;
}

module.exports = {
	ticketChannelPrefix: process.env.TICKET_CHANNEL_PREFIX || DEFAULT_PREFIX,
	ticketNumberPadLength: parsePadLength(process.env.TICKET_NUMBER_PAD_LENGTH),
};
