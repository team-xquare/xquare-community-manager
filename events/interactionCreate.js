const { Events, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { createTicket } = require('@xquare/domain/ticket/service/createTicketService');
const { t } = require('@xquare/global/i18n');

const FLAGS = { flags: MessageFlags.Ephemeral };

const LOG = {
	missingCommand: name => `No command matching ${name} was found`,
};

const MODAL = {
	openId: 'ticket:open-modal',
	openTitle: t('ticket.modal.title'),
	fields: {
		title: { id: 'ticket:title', label: t('ticket.modal.field.title'), style: TextInputStyle.Short, required: true },
		description: { id: 'ticket:description', label: t('ticket.modal.field.description'), style: TextInputStyle.Paragraph, required: false },
	},
};

const RESPONSE = {
	created: channelId => t('ticket.response.created', { channelId }),
};

const buildModal = () => {
	const modal = new ModalBuilder().setCustomId(MODAL.openId).setTitle(MODAL.openTitle);
	const titleInput = new TextInputBuilder().setCustomId(MODAL.fields.title.id).setLabel(MODAL.fields.title.label).setStyle(MODAL.fields.title.style).setRequired(MODAL.fields.title.required);
	const descriptionInput = new TextInputBuilder().setCustomId(MODAL.fields.description.id).setLabel(MODAL.fields.description.label).setStyle(MODAL.fields.description.style).setRequired(MODAL.fields.description.required);
	return modal.addComponents(new ActionRowBuilder().addComponents(titleInput), new ActionRowBuilder().addComponents(descriptionInput));
};

const handleOpenButton = async interaction => {
	try {
		return interaction.showModal(buildModal());
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction });
	}
};

const handleOpenModal = async interaction => {
	try {
		await interaction.deferReply(FLAGS);
		const title = interaction.fields.getTextInputValue(MODAL.fields.title.id);
		const description = interaction.fields.getTextInputValue(MODAL.fields.description.id);
		const result = await createTicket(interaction, { title, description });
		return interaction.editReply({ content: RESPONSE.created(result.channel.id) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction });
	}
};

const handleCommand = async interaction => {
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) return logger.error(LOG.missingCommand(interaction.commandName));
	try {
		return command.execute(interaction);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction });
	}
};

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isButton() && interaction.customId === 'ticket:open') return handleOpenButton(interaction);
		if (interaction.isModalSubmit() && interaction.customId === MODAL.openId) return handleOpenModal(interaction);
		if (interaction.isChatInputCommand()) return handleCommand(interaction);
	},
};
