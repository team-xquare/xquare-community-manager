const { Events } = require('discord.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		console.log('\n');
		console.log('██╗  ██╗ ██████╗ ██╗   ██╗ █████╗ ██████╗ ███████╗');
		console.log('╚██╗██╔╝██╔═══██╗██║   ██║██╔══██╗██╔══██╗██╔════╝');
		console.log(' ╚███╔╝ ██║   ██║██║   ██║███████║██████╔╝█████╗  ');
		console.log(' ██╔██╗ ██║▄▄ ██║██║   ██║██╔══██║██╔══██╗██╔══╝  ');
		console.log('██╔╝ ██╗╚██████╔╝╚██████╔╝██║  ██║██║  ██║███████╗');
		console.log('╚═╝  ╚═╝ ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝');
		console.log('\n');
		console.log(`Ready! Logged in as ${client.user.tag}`);
		console.log('\n');
	},
};
