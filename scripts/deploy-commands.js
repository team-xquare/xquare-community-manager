require('module-alias/register');
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
		logger.info(`Loaded command: ${command.data.name}`);
	} else {
		logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
	try {
		logger.info(`Started refreshing ${commands.length} application (/) commands.`);

		let data;

		if (process.env.GUILD_ID && process.env.GUILD_ID !== 'YOUR_GUILD_ID') {
			logger.info(`Registering commands to guild: ${process.env.GUILD_ID}`);
			data = await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
				{ body: commands },
			);
		} else {
			logger.info('Registering commands globally (this may take up to 1 hour)');
			data = await rest.put(
				Routes.applicationCommands(process.env.CLIENT_ID),
				{ body: commands },
			);
		}

		logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
	} catch (error) {
		logger.error(error);
	}
})();
