const { Events, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { createTicket } = require('@xquare/domain/ticket/service/createTicketService');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isButton()) {
			if (interaction.customId === 'ticket:open') {
				try {
					const modal = new ModalBuilder()
						.setCustomId('ticket:open-modal')
						.setTitle('티켓 생성');

					const titleInput = new TextInputBuilder()
						.setCustomId('ticket:title')
						.setLabel('제목')
						.setStyle(TextInputStyle.Short)
						.setRequired(true);

					const descriptionInput = new TextInputBuilder()
						.setCustomId('ticket:description')
						.setLabel('설명')
						.setStyle(TextInputStyle.Paragraph)
						.setRequired(false);

					modal.addComponents(
						new ActionRowBuilder().addComponents(titleInput),
						new ActionRowBuilder().addComponents(descriptionInput)
					);

					await interaction.showModal(modal);
				} catch (error) {
					await handleError(wrapUnexpected(error), { interaction });
				}
				return;
			}
		}

		if (interaction.isModalSubmit()) {
			if (interaction.customId === 'ticket:open-modal') {
				try {
					await interaction.deferReply({ flags: MessageFlags.Ephemeral });
					const title = interaction.fields.getTextInputValue('ticket:title');
					const description = interaction.fields.getTextInputValue('ticket:description');
					const result = await createTicket(interaction, { title, description });
					await interaction.editReply({ content: `티켓이 생성되었습니다: <#${result.channel.id}>` });
				} catch (error) {
					await handleError(wrapUnexpected(error), { interaction });
				}
				return;
			}
		}

		if (!interaction.isChatInputCommand()) return;

		const command = interaction.client.commands.get(interaction.commandName);

		if (!command) {
			logger.error(`No command matching ${interaction.commandName} was found.`);
			return;
		}

		try {
			await command.execute(interaction);
		} catch (error) {
			await handleError(wrapUnexpected(error), { interaction });
		}
	},
};
