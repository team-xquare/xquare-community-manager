const { Events, MessageFlags, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { createTicket } = require('@xquare/domain/ticket/service/createTicketService');
const { getCategoryById, getCategoryChoices } = require('@xquare/domain/ticket/categories');
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

const SELECT = {
	buttonId: 'ticket:category-button',
	menuId: 'ticket:category-select',
	placeholder: t('ticket.ui.selectPlaceholder'),
	prompt: t('ticket.ui.selectPrompt'),
};

const RESPONSE = {
	created: channelId => t('ticket.response.created', { channelId }),
	commandNotFound: t('common.unknownCommand'),
};

const buildCategoryModal = categoryId => {
	const category = getCategoryById(categoryId);
	if (!category) throw new Error(`Invalid category: ${categoryId}`);

	const modal = new ModalBuilder()
		.setCustomId(`ticket:open-modal:${categoryId}`)
		.setTitle(category.name);

	const fields = category.fields.slice(0, 5);
	fields.forEach(field => {
		const input = new TextInputBuilder()
			.setCustomId(`field:${field.id}`)
			.setLabel(field.label)
			.setStyle(field.type === 'long' ? TextInputStyle.Paragraph : TextInputStyle.Short)
			.setRequired(field.required)
			.setMaxLength(field.maxLength);

		modal.addComponents(new ActionRowBuilder().addComponents(input));
	});

	return modal;
};

const buildCategorySelectMenu = () => new ActionRowBuilder().addComponents(
	new StringSelectMenuBuilder()
		.setCustomId(SELECT.menuId)
		.setPlaceholder(SELECT.placeholder)
		.addOptions(getCategoryChoices())
);

const handleCategoryButton = async interaction => {
	try {
		return interaction.reply({ content: SELECT.prompt, components: [buildCategorySelectMenu()], ...FLAGS });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction });
	}
};

const handleCategorySelect = async interaction => {
	try {
		const categoryId = interaction.values[0];
		const modal = buildCategoryModal(categoryId);
		return interaction.showModal(modal);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction });
	}
};

const handleOpenModal = async interaction => {
	try {
		await interaction.deferReply(FLAGS);

		const [, , categoryId] = interaction.customId.split(':');
		const category = getCategoryById(categoryId);
		if (!category) throw new Error(`Invalid category: ${categoryId}`);

		const fieldData = {};
		category.fields.forEach(field => {
			const value = interaction.fields.getTextInputValue(`field:${field.id}`);
			fieldData[field.id] = value || '';
		});

		const result = await createTicket(interaction, { category: categoryId, categoryFields: fieldData });
		return interaction.editReply({ content: RESPONSE.created(result.channel.id) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction });
	}
};

const handleCommand = async interaction => {
	const command = interaction.client.commands.get(interaction.commandName);
	if (!command) {
		await interaction.reply({ content: RESPONSE.commandNotFound, ...FLAGS }).catch(() => null);
		return logger.error(LOG.missingCommand(interaction.commandName));
	}
	try {
		return command.execute(interaction);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction });
	}
};

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		if (interaction.isButton() && interaction.customId === SELECT.buttonId) return handleCategoryButton(interaction);
		if (interaction.isStringSelectMenu() && interaction.customId === SELECT.menuId) return handleCategorySelect(interaction);
		if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket:open-modal:')) return handleOpenModal(interaction);
		if (interaction.isChatInputCommand()) return handleCommand(interaction);
	},
};
