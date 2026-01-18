const { SlashCommandBuilder, ChannelType } = require('discord.js');
const { updateSetting } = require('@xquare/domain/setting/service/settingService');
const { publishTicketUi } = require('@xquare/domain/ticket/service/ticketUiService');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { FLAGS } = require('@xquare/global/utils/commandFlags');
const { LIMITS, LABELS_INPUT_MAX } = require('@xquare/global/utils/commandLimits');
const { ensureAdmin } = require('@xquare/global/utils/commandPermissions');
const { sendLines } = require('@xquare/global/utils/commandMessages');
const { sanitizeLabels } = require('@xquare/global/utils/validators');
const { t } = require('@xquare/global/i18n');

const TEXT = {
	common: {
		noPermission: t('common.noPermission'),
		defaultValue: t('common.defaultValue'),
		unset: t('common.unset'),
	},
	command: {
		description: t('configuration.command.description'),
	},
	group: {
		ticket: t('ticket.group.description'),
	},
	subcommand: {
		set: {
			description: t('ticket.subcommand.set.description'),
			option: {
				creationChannel: t('ticket.subcommand.set.option.creationChannel'),
				welcomeMessage: t('ticket.subcommand.set.option.welcomeMessage'),
				uiMessage: t('ticket.subcommand.set.option.uiMessage'),
				buttonLabel: t('ticket.subcommand.set.option.buttonLabel'),
				defaultLabels: t('ticket.subcommand.set.option.defaultLabels'),
				openCategory: t('ticket.subcommand.set.option.openCategory'),
				closeCategory: t('ticket.subcommand.set.option.closeCategory'),
			},
		},
		publishUi: {
			description: t('ticket.subcommand.publishUi.description'),
		},
	},
	response: {
		settingsUpdated: t('ticket.response.settingsUpdated'),
		settingsUpdateError: t('ticket.response.settingsUpdateError'),
		publishSuccess: t('ticket.response.publishSuccess'),
		publishError: t('ticket.response.publishError'),
	},
	settings: {
		line: {
			creationChannel: value => t('ticket.settings.line.creationChannel', { value }),
			welcomeMessage: value => t('ticket.settings.line.welcomeMessage', { value }),
			uiMessage: value => t('ticket.settings.line.uiMessage', { value }),
			buttonLabel: value => t('ticket.settings.line.buttonLabel', { value }),
			defaultLabels: value => t('ticket.settings.line.defaultLabels', { value }),
			openCategory: value => t('ticket.settings.line.openCategory', { value }),
			closeCategory: value => t('ticket.settings.line.closeCategory', { value }),
		},
	},
};

const buildSetSubcommand = subcommand => subcommand
	.setName('set')
	.setDescription(TEXT.subcommand.set.description)
	.addChannelOption(option => option.setName('creation_channel').setDescription(TEXT.subcommand.set.option.creationChannel).addChannelTypes(ChannelType.GuildText).setRequired(false))
	.addStringOption(option => option.setName('welcome_message').setDescription(TEXT.subcommand.set.option.welcomeMessage).setRequired(false).setMaxLength(LIMITS.welcomeMax))
	.addStringOption(option => option.setName('ui_message').setDescription(TEXT.subcommand.set.option.uiMessage).setRequired(false).setMaxLength(LIMITS.uiMessageMax))
	.addStringOption(option => option.setName('button_label').setDescription(TEXT.subcommand.set.option.buttonLabel).setRequired(false).setMaxLength(LIMITS.buttonLabelMax))
	.addStringOption(option => option.setName('default_labels').setDescription(TEXT.subcommand.set.option.defaultLabels).setRequired(false).setMaxLength(LABELS_INPUT_MAX))
	.addStringOption(option => option.setName('open_category').setDescription(TEXT.subcommand.set.option.openCategory).setRequired(false).setMaxLength(LIMITS.categoryMax))
	.addStringOption(option => option.setName('close_category').setDescription(TEXT.subcommand.set.option.closeCategory).setRequired(false).setMaxLength(LIMITS.categoryMax));

const buildPublishSubcommand = subcommand => subcommand
	.setName('publish-ui')
	.setDescription(TEXT.subcommand.publishUi.description);

const buildTicketGroup = group => group
	.setName('ticket')
	.setDescription(TEXT.group.ticket)
	.addSubcommand(buildSetSubcommand)
	.addSubcommand(buildPublishSubcommand);

const data = new SlashCommandBuilder()
	.setName('configuration')
	.setDescription(TEXT.command.description)
	.addSubcommandGroup(buildTicketGroup);

const buildSettingsLines = updated => {
	const defaultValue = TEXT.common.defaultValue;
	const unsetValue = TEXT.common.unset;
	const defaultLabels = updated.defaultLabels?.length ? updated.defaultLabels.map(label => `\`${label}\``).join(', ') : unsetValue;
	const creationChannel = updated.creationChannelId ? `<#${updated.creationChannelId}>` : unsetValue;

	return [
		TEXT.response.settingsUpdated,
		TEXT.settings.line.creationChannel(creationChannel),
		TEXT.settings.line.welcomeMessage(updated.welcomeMessage ?? defaultValue),
		TEXT.settings.line.uiMessage(updated.uiMessage ?? defaultValue),
		TEXT.settings.line.buttonLabel(updated.buttonLabels?.create ?? defaultValue),
		TEXT.settings.line.defaultLabels(defaultLabels),
		TEXT.settings.line.openCategory(updated.openCategory ?? defaultValue),
		TEXT.settings.line.closeCategory(updated.closeCategory ?? defaultValue),
	];
};

async function handleSet(interaction) {
	if (!await ensureAdmin(interaction, TEXT.common.noPermission)) return;
	await interaction.deferReply(FLAGS);

	const creationChannel = interaction.options.getChannel('creation_channel');
	const welcomeMessage = interaction.options.getString('welcome_message');
	const uiMessage = interaction.options.getString('ui_message');
	const buttonLabel = interaction.options.getString('button_label');
	const defaultLabelsRaw = interaction.options.getString('default_labels');
	const openCategory = interaction.options.getString('open_category');
	const closeCategory = interaction.options.getString('close_category');

	let defaultLabels = undefined;
	if (defaultLabelsRaw !== null) {
		try {
			defaultLabels = sanitizeLabels(defaultLabelsRaw);
		} catch (error) {
			return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.settingsUpdateError });
		}
	}

	const updatePayload = {
		...(creationChannel ? { creationChannelId: creationChannel.id } : {}),
		...(welcomeMessage !== null ? { welcomeMessage } : {}),
		...(uiMessage !== null ? { uiMessage } : {}),
		...(buttonLabel !== null ? { buttonLabels: { create: buttonLabel } } : {}),
		...(defaultLabelsRaw !== null ? { defaultLabels } : {}),
		...(openCategory !== null ? { openCategory } : {}),
		...(closeCategory !== null ? { closeCategory } : {}),
	};

	try {
		const updated = await updateSetting('guild', interaction.guildId, 'ticket', 'ui', updatePayload, interaction.user.id);
		const lines = buildSettingsLines(updated);
		return sendLines(interaction, lines, TEXT.common.unset);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.settingsUpdateError });
	}
}

async function handlePublishUi(interaction) {
	if (!await ensureAdmin(interaction, TEXT.common.noPermission)) return;
	await interaction.deferReply(FLAGS);

	try {
		await publishTicketUi(interaction.guild, interaction.user);
		return interaction.editReply({ content: TEXT.response.publishSuccess });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.publishError });
	}
}

const HANDLERS = {
	ticket: {
		set: handleSet,
		'publish-ui': handlePublishUi,
	},
};

module.exports = {
	data,
	async execute(interaction) {
		const group = interaction.options.getSubcommandGroup();
		const subcommand = interaction.options.getSubcommand();
		const handler = HANDLERS[group]?.[subcommand];
		if (handler) return handler(interaction);
	},
};
