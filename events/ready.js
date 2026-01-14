const { Events } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { bootstrapScheduledCloses } = require('@xquare/domain/ticket/service/ticketLifecycleService');

const LOG = {
	ready: tag => `Bot ready as ${tag}`,
	bootstrapFailed: 'Failed to bootstrap scheduled closes',
};

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		logger.info(LOG.ready(client.user.tag));
		bootstrapScheduledCloses(client).catch(error => logger.error(LOG.bootstrapFailed, { error }));
	},
};
