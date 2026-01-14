const { Events } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { bootstrapScheduledCloses } = require('@xquare/domain/ticket/service/ticketLifecycleService');
const { migrateTicketChannels } = require('@xquare/domain/ticket/service/ticketMigrationService');

const LOG = {
	ready: tag => `Bot ready as ${tag}`,
	migrationFailed: 'Failed to migrate ticket channel names',
	bootstrapFailed: 'Failed to bootstrap scheduled closes',
};

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		logger.info(LOG.ready(client.user.tag));
		migrateTicketChannels(client).catch(error => logger.error(LOG.migrationFailed, { error }));
		bootstrapScheduledCloses(client).catch(error => logger.error(LOG.bootstrapFailed, { error }));
	},
};
