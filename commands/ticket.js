const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const logger = require('../core/global/logger');
const { createTicket } = require('../core/domain/ticket/service/createTicketService');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('문의나 문제를 접수하기 위한 티켓을 생성합니다.'),
	async execute(interaction) {
		await interaction.deferReply({ flags: MessageFlags.Ephemeral });

		try {
			const result = await createTicket(interaction);

			await interaction.editReply({
				content: `티켓이 생성되었습니다: <#${result.channel.id}>`,
			});
		} catch (error) {
			logger.error(`Failed to create ticket: ${error}`);
			await interaction.editReply({
				content: '티켓 생성 중 오류가 발생했습니다.',
			});
		}
	},
};
