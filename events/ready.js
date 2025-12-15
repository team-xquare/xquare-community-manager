const { Events } = require('discord.js');
const logger = require('../core/global/logger');

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
	},
};
