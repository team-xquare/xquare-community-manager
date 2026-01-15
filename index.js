require('module-alias/register');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const connectDB = require('@xquare/global/configs/database');
const { migrateTicketCounter } = require('@xquare/domain/ticket/service/ticketMigrationService');
const { runMigrationOnce } = require('@xquare/domain/ticket/migration');
require('dotenv').config();

const REQUIRED_ENV = ['DISCORD_BOT_TOKEN', 'CLIENT_ID', 'MONGODB_URI'];

const LOG = {
	missingEnv: names => `Missing required environment variables: ${names}`,
	missingEnvHint: 'Please check your .env file and ensure all required variables are set.',
	commandMissing: filePath => `Command is missing required "data" or "execute" property: ${filePath}`,
	eventMissing: filePath => `Event is missing required "name" or "execute" property: ${filePath}`,
	commandLoaded: name => `Loaded command: ${name}`,
	eventLoaded: name => `Loaded event: ${name}`,
	startFailed: 'Failed to start bot',
};

const getMissingEnvVars = () => REQUIRED_ENV.filter(name => !process.env[name]);

const validateEnv = () => {
	const missing = getMissingEnvVars();
	if (!missing.length) return true;
	console.error(LOG.missingEnv(missing.join(', ')));
	console.error(LOG.missingEnvHint);
	return false;
};

const loadCommands = client => {
	const commandsPath = path.join(__dirname, 'commands');
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

	commandFiles.forEach(file => {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if (!command?.data || !command?.execute) return logger.warn(LOG.commandMissing(filePath));
		client.commands.set(command.data.name, command);
		return logger.info(LOG.commandLoaded(command.data.name));
	});
};

const loadEvents = client => {
	const eventsPath = path.join(__dirname, 'events');
	const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

	eventFiles.forEach(file => {
		const filePath = path.join(eventsPath, file);
		const event = require(filePath);
		if (!event?.name || !event?.execute) return logger.warn(LOG.eventMissing(filePath));
		if (event.once) client.once(event.name, (...args) => event.execute(...args));
		else client.on(event.name, (...args) => event.execute(...args));
		return logger.info(LOG.eventLoaded(event.name));
	});
};

const buildClient = () => new Client({
	intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
});

const start = async () => {
	if (!validateEnv()) process.exit(1);
	try {
		await connectDB();
		await runMigrationOnce(migrateTicketCounter);
		const client = buildClient();
		client.commands = new Collection();
		loadCommands(client);
		loadEvents(client);
		await client.login(process.env.DISCORD_BOT_TOKEN);
	} catch (error) {
		logger.error(LOG.startFailed, { error });
		process.exit(1);
	}
};

start();
