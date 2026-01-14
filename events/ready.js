const { Events } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { bootstrapScheduledCloses } = require('@xquare/domain/ticket/service/ticketLifecycleService');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		logger.info('██╗  ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ███████╗');
		logger.info('╚██╗██╔╝██╔═══██╗██║   ██║██╔══██╗██╔══██╗██╔════╝');
		logger.info(' ╚███╔╝ ██║   ██║██║   ██║███████║██████╔╝█████╗  ');
		logger.info(' ██╔██╗ ██║▄▄ ██║██║   ██║██╔══██║██╔══██╗██╔══╝  ');
		logger.info('██╔╝ ██╗╚██████╔╝╚██████╔╝██║  ██║██║  ██║███████╗');
		logger.info('╚═╝  ╚═╝ ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝');
		logger.info(`Ready! Logged in as ${client.user.tag}`);
		bootstrapScheduledCloses(client).catch(error => {
			logger.error('Failed to bootstrap scheduled closes', { error });
		});
	},
};
