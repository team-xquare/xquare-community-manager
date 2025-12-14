const fs = require('node:fs');
const path = require('node:path');
const { REST, Routes } = require('discord.js');
require('dotenv').config();

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		commands.push(command.data.toJSON());
		console.log(`[INFO] Loaded command: ${command.data.name}`);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN);

(async () => {
	try {
		console.log(`\nStarted refreshing ${commands.length} application (/) commands.`);

		let data;

		if (process.env.GUILD_ID && process.env.GUILD_ID !== 'YOUR_GUILD_ID') {
			console.log(`Registering commands to guild: ${process.env.GUILD_ID}`);
			data = await rest.put(
				Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
				{ body: commands },
			);
		} else {
			console.log('Registering commands globally (this may take up to 1 hour)');
			data = await rest.put(
				Routes.applicationCommands(process.env.CLIENT_ID),
				{ body: commands },
			);
		}

		console.log(`Successfully reloaded ${data.length} application (/) commands.\n`);
	} catch (error) {
		console.error(error);
	}
})();
