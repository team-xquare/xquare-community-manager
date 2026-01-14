require('module-alias/register');
const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
require('dotenv').config();

const LOG = {
	commandLoaded: name => `Loaded command: ${name}`,
	commandInvalid: path => `Command is missing required "data" or "execute" property: ${path}`,
	refreshStart: count => `Started refreshing ${count} application (/) commands`,
	registerGuild: guildId => `Registering commands to guild: ${guildId}`,
	registerGlobal: 'Registering commands globally (this may take up to 1 hour)',
	refreshSuccess: count => `Successfully reloaded ${count} application (/) commands`,
	refreshFailed: 'Failed to refresh commands',
};

const commands = [];
const commandsPath = path.join(__dirname, '../commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

commandFiles.forEach(file => {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if (!command?.data || !command?.execute) return logger.warn(LOG.commandInvalid(filePath));
	commands.push(command.data.toJSON());
	return logger.info(LOG.commandLoaded(command.data.name));
});

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

const registerCommands = async () => {
	logger.info(LOG.refreshStart(commands.length));
	const isGuild = process.env.GUILD_ID && process.env.GUILD_ID !== 'YOUR_GUILD_ID';
	if (isGuild) logger.info(LOG.registerGuild(process.env.GUILD_ID));
	else logger.info(LOG.registerGlobal);

	const route = isGuild
		? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
		: Routes.applicationCommands(process.env.CLIENT_ID);

	const data = await rest.put(route, { body: commands });
	logger.info(LOG.refreshSuccess(data.length));
};

registerCommands().catch(error => logger.error(LOG.refreshFailed, { error }));
