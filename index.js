require('module-alias/register');
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const connectDB = require('@xquare/global/configs/database');
require('dotenv').config();

(async () => {
	try {
		await connectDB();

		const client = new Client({
			intents: [
				GatewayIntentBits.Guilds,
				GatewayIntentBits.GuildMessages,
				GatewayIntentBits.MessageContent,
			],
		});

		client.commands = new Collection();
		const commandsPath = path.join(__dirname, 'commands');
		const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

		for (const file of commandFiles) {
			const filePath = path.join(commandsPath, file);
			const command = require(filePath);
			if ('data' in command && 'execute' in command) {
				client.commands.set(command.data.name, command);
				logger.info(`Loaded command: ${command.data.name}`);
			} else {
				logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
			}
		}

		const eventsPath = path.join(__dirname, 'events');
		const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

		for (const file of eventFiles) {
			const filePath = path.join(eventsPath, file);
			const event = require(filePath);
			if (event.once) {
				client.once(event.name, (...args) => event.execute(...args));
			} else {
				client.on(event.name, (...args) => event.execute(...args));
			}
			logger.info(`Loaded event: ${event.name}`);
		}

		await client.login(process.env.DISCORD_BOT_TOKEN);
	} catch (error) {
		logger.error(`Failed to start bot: ${error}`);
		process.exit(1);
	}
})();
