const { ChannelType, PermissionsBitField } = require('discord.js');
const { findLastTicket } = require('../repository/findLastTicketRepository');
const { createTicket: createTicketRecord } = require('../repository/createTicketRepository');
const logger = require('../../../global/logger.js');

async function getNextTicketNumber() {
	const lastTicket = await findLastTicket();
	return lastTicket ? lastTicket.ticketNumber + 1 : 1;
}

async function createTicketChannel(guild, user, client, ticketNumber) {
	const paddedNumber = String(ticketNumber).padStart(3, '0');
	const channelName = `xquare-ticket-${paddedNumber}-${user.username}`;

	return guild.channels.create({
		name: channelName,
		type: ChannelType.GuildText,
		permissionOverwrites: [
			{
				id: guild.id,
				deny: [PermissionsBitField.Flags.ViewChannel],
			},
			{
				id: user.id,
				allow: [
					PermissionsBitField.Flags.ViewChannel,
					PermissionsBitField.Flags.SendMessages,
					PermissionsBitField.Flags.ReadMessageHistory,
				],
			},
			{
				id: client.user.id,
				allow: [
					PermissionsBitField.Flags.ViewChannel,
					PermissionsBitField.Flags.SendMessages,
					PermissionsBitField.Flags.ReadMessageHistory,
				],
			},
		],
	});
}

async function createTicket(interaction) {
	const nextTicketNumber = await getNextTicketNumber();

	const ticketChannel = await createTicketChannel(
		interaction.guild,
		interaction.user,
		interaction.client,
		nextTicketNumber
	);

	await createTicketRecord({
		ticketNumber: nextTicketNumber,
		channelId: ticketChannel.id,
		userId: interaction.user.id,
		username: interaction.user.username,
		guildId: interaction.guild.id,
		status: 'open',
	});

	await ticketChannel.send(`${interaction.user} 님의 티켓이 생성되었습니다. 문의 내용을 작성해주세요.`);

	logger.info(`Ticket #${nextTicketNumber} created: ${ticketChannel.name} (${ticketChannel.id}) by ${interaction.user.tag}`);

	return {
		ticketNumber: nextTicketNumber,
		channel: ticketChannel,
	};
}

module.exports = { createTicket };
