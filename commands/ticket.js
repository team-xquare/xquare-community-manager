const { SlashCommandBuilder, MessageFlags, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createTicket } = require('@xquare/domain/ticket/service/createTicketService');
const { updateSetting } = require('@xquare/domain/setting/service/settingService');
const { publishTicketUi } = require('@xquare/domain/ticket/service/ticketUiService');
const { addLabels, removeLabels, addAssignees, removeAssignees } = require('@xquare/domain/ticket/service/ticketMetadataService');
const { listTickets } = require('@xquare/domain/ticket/service/ticketQueryService');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { sanitizeLabels } = require('@xquare/global/utils/validators');
const { t } = require('@xquare/global/i18n');

const FLAGS = { flags: MessageFlags.Ephemeral };
const LIMITS = {
	min: 1,
	max: 20,
	titleMax: 200,
	descriptionMax: 2000,
	labelsMax: 10,
	labelLength: 50,
	welcomeMax: 2000,
	uiMessageMax: 2000,
	buttonLabelMax: 80,
	categoryMax: 100,
	reasonMax: 500,
	messageMax: 1900,
};
const LABELS_INPUT_MAX = LIMITS.labelsMax * (LIMITS.labelLength + 1);

const TEXT = {
	common: {
		noPermission: t('common.noPermission'),
		userNotFound: t('common.userNotFound'),
		defaultValue: t('common.defaultValue'),
		unset: t('common.unset'),
		none: t('common.none'),
		unassigned: t('common.unassigned'),
		unknown: t('common.unknown'),
	},
	command: {
		description: t('ticket.command.description'),
	},
	subcommand: {
		open: {
			description: t('ticket.subcommand.open.description'),
			option: {
				title: t('ticket.subcommand.open.option.title'),
				description: t('ticket.subcommand.open.option.description'),
				labels: t('ticket.subcommand.open.option.labels'),
				assignee: t('ticket.subcommand.open.option.assignee'),
			},
		},
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
		close: {
			description: t('ticket.subcommand.close.description'),
			option: { reason: t('ticket.subcommand.close.option.reason') },
		},
		reopen: {
			description: t('ticket.subcommand.reopen.description'),
		},
		info: {
			description: t('ticket.subcommand.info.description'),
		},
		addLabel: {
			description: t('ticket.subcommand.addLabel.description'),
			option: { labels: t('ticket.subcommand.addLabel.option.labels') },
		},
		removeLabel: {
			description: t('ticket.subcommand.removeLabel.description'),
			option: { labels: t('ticket.subcommand.removeLabel.option.labels') },
		},
		assign: {
			description: t('ticket.subcommand.assign.description'),
			option: { user: t('ticket.subcommand.assign.option.user') },
		},
		unassign: {
			description: t('ticket.subcommand.unassign.description'),
			option: { user: t('ticket.subcommand.unassign.option.user') },
		},
		list: {
			description: t('ticket.subcommand.list.description'),
			option: {
				status: t('ticket.subcommand.list.option.status'),
				label: t('ticket.subcommand.list.option.label'),
				assignee: t('ticket.subcommand.list.option.assignee'),
				limit: t('ticket.subcommand.list.option.limit'),
			},
		},
	},
	response: {
		created: channelId => t('ticket.response.created', { channelId }),
		createError: t('ticket.response.createError'),
		settingsUpdated: t('ticket.response.settingsUpdated'),
		settingsUpdateError: t('ticket.response.settingsUpdateError'),
		closeScheduled: minutes => t('ticket.response.closeScheduled', { minutes }),
		closeError: t('ticket.response.closeError'),
		reopenSuccess: t('ticket.response.reopenSuccess'),
		reopenError: t('ticket.response.reopenError'),
		infoNotFound: t('ticket.response.infoNotFound'),
		infoError: t('ticket.response.infoError'),
		noLabelsToAdd: t('ticket.response.noLabelsToAdd'),
		labelsAdded: labels => t('ticket.response.labelsAdded', { labels }),
		labelsAddError: t('ticket.response.labelsAddError'),
		noLabelsToRemove: t('ticket.response.noLabelsToRemove'),
		labelsRemoved: labels => t('ticket.response.labelsRemoved', { labels }),
		labelsRemoveError: t('ticket.response.labelsRemoveError'),
		assigneeAssigned: assignees => t('ticket.response.assigneeAssigned', { assignees }),
		assigneeAssignError: t('ticket.response.assigneeAssignError'),
		assigneeUnassigned: assignees => t('ticket.response.assigneeUnassigned', { assignees }),
		assigneeUnassignError: t('ticket.response.assigneeUnassignError'),
		noTickets: t('ticket.response.noTickets'),
		listError: t('ticket.response.listError'),
		publishSuccess: t('ticket.response.publishSuccess'),
		publishError: t('ticket.response.publishError'),
		adminOnlyClose: t('ticket.response.adminOnlyClose'),
		adminOnlyReopen: t('ticket.response.adminOnlyReopen'),
		adminOnlyModifyLabels: t('ticket.response.adminOnlyModifyLabels'),
		adminOnlyAssign: t('ticket.response.adminOnlyAssign'),
		adminOnlyUnassign: t('ticket.response.adminOnlyUnassign'),
		adminOnlyList: t('ticket.response.adminOnlyList'),
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
	info: {
		number: ticketNumber => t('ticket.info.number', { ticketNumber }),
		title: title => t('ticket.info.title', { title }),
		status: status => t('ticket.info.status', { status }),
		author: userId => t('ticket.info.author', { userId }),
		assignees: assignees => t('ticket.info.assignees', { assignees }),
		labels: labels => t('ticket.info.labels', { labels }),
		description: description => t('ticket.info.description', { description }),
		closedAt: timestamp => t('ticket.info.closedAt', { timestamp }),
		createdAt: timestamp => t('ticket.info.createdAt', { timestamp }),
	},
	list: {
		item: data => t('ticket.list.item', data),
	},
	defaults: {
		title: t('ticket.defaults.title'),
	},
};

const hasAdminPermission = interaction => interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

const ensureAdmin = async (interaction, message) => {
	if (hasAdminPermission(interaction)) return true;
	await interaction.reply({ content: message, ...FLAGS }).catch(() => null);
	return false;
};

const formatLabels = labels => labels?.length ? labels.map(label => `\`${label}\``).join(', ') : TEXT.common.none;
const formatAssignees = assignees => assignees?.length ? assignees.map(id => `<@${id}>`).join(', ') : TEXT.common.unassigned;

const splitLongLine = (line, maxLength) => {
	if (line.length <= maxLength) return [line];
	const parts = [];
	for (let index = 0; index < line.length; index += maxLength) {
		parts.push(line.slice(index, index + maxLength));
	}
	return parts;
};

const chunkLines = (lines, maxLength) => {
	const chunks = [];
	let current = '';
	lines.forEach(line => {
		splitLongLine(line, maxLength).forEach(part => {
			const next = current ? `${current}\n${part}` : part;
			if (next.length <= maxLength) return current = next;
			if (current) chunks.push(current);
			current = part;
		});
	});
	if (current) chunks.push(current);
	return chunks;
};

const sendLines = async (interaction, lines) => {
	const chunks = chunkLines(lines, LIMITS.messageMax);
	const [first, ...rest] = chunks;
	if (!first) return interaction.editReply({ content: TEXT.common.none });
	await interaction.editReply({ content: first });
	for (const chunk of rest) await interaction.followUp({ content: chunk, ...FLAGS });
};

const buildOpenSubcommand = subcommand => subcommand
	.setName('open')
	.setDescription(TEXT.subcommand.open.description)
	.addStringOption(option => option.setName('title').setDescription(TEXT.subcommand.open.option.title).setRequired(true).setMaxLength(LIMITS.titleMax))
	.addStringOption(option => option.setName('description').setDescription(TEXT.subcommand.open.option.description).setRequired(false).setMaxLength(LIMITS.descriptionMax))
	.addStringOption(option => option.setName('labels').setDescription(TEXT.subcommand.open.option.labels).setRequired(false).setMaxLength(LABELS_INPUT_MAX))
	.addUserOption(option => option.setName('assignee').setDescription(TEXT.subcommand.open.option.assignee).setRequired(false));

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

const buildCloseSubcommand = subcommand => subcommand
	.setName('close')
	.setDescription(TEXT.subcommand.close.description)
	.addStringOption(option => option.setName('reason').setDescription(TEXT.subcommand.close.option.reason).setRequired(false).setMaxLength(LIMITS.reasonMax));

const buildReopenSubcommand = subcommand => subcommand
	.setName('reopen')
	.setDescription(TEXT.subcommand.reopen.description);

const buildInfoSubcommand = subcommand => subcommand
	.setName('info')
	.setDescription(TEXT.subcommand.info.description);

const buildAddLabelSubcommand = subcommand => subcommand
	.setName('add-label')
	.setDescription(TEXT.subcommand.addLabel.description)
	.addStringOption(option => option.setName('labels').setDescription(TEXT.subcommand.addLabel.option.labels).setRequired(true));

const buildRemoveLabelSubcommand = subcommand => subcommand
	.setName('remove-label')
	.setDescription(TEXT.subcommand.removeLabel.description)
	.addStringOption(option => option.setName('labels').setDescription(TEXT.subcommand.removeLabel.option.labels).setRequired(true));

const buildAssignSubcommand = subcommand => subcommand
	.setName('assign')
	.setDescription(TEXT.subcommand.assign.description)
	.addUserOption(option => option.setName('user').setDescription(TEXT.subcommand.assign.option.user).setRequired(true));

const buildUnassignSubcommand = subcommand => subcommand
	.setName('unassign')
	.setDescription(TEXT.subcommand.unassign.description)
	.addUserOption(option => option.setName('user').setDescription(TEXT.subcommand.unassign.option.user).setRequired(true));

const buildListSubcommand = subcommand => subcommand
	.setName('list')
	.setDescription(TEXT.subcommand.list.description)
	.addStringOption(option => option.setName('status').setDescription(TEXT.subcommand.list.option.status).addChoices(
		{ name: 'open', value: 'open' },
		{ name: 'in-progress', value: 'in-progress' },
		{ name: 'closed', value: 'closed' },
	).setRequired(false))
	.addStringOption(option => option.setName('label').setDescription(TEXT.subcommand.list.option.label).setRequired(false))
	.addUserOption(option => option.setName('assignee').setDescription(TEXT.subcommand.list.option.assignee).setRequired(false))
	.addIntegerOption(option => option.setName('limit').setDescription(TEXT.subcommand.list.option.limit).setMinValue(LIMITS.min).setMaxValue(LIMITS.max).setRequired(false));

const data = new SlashCommandBuilder()
	.setName('ticket')
	.setDescription(TEXT.command.description)
	.addSubcommand(buildOpenSubcommand)
	.addSubcommand(buildSetSubcommand)
	.addSubcommand(buildPublishSubcommand)
	.addSubcommand(buildCloseSubcommand)
	.addSubcommand(buildReopenSubcommand)
	.addSubcommand(buildInfoSubcommand)
	.addSubcommand(buildAddLabelSubcommand)
	.addSubcommand(buildRemoveLabelSubcommand)
	.addSubcommand(buildAssignSubcommand)
	.addSubcommand(buildUnassignSubcommand)
	.addSubcommand(buildListSubcommand);

const applyLimit = value => Math.min(Math.max(value, LIMITS.min), LIMITS.max);

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

async function handleOpen(interaction) {
	await interaction.deferReply(FLAGS);
	try {
		const result = await createTicket(interaction);
		return interaction.editReply({ content: TEXT.response.created(result.channel.id) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.createError });
	}
}

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
		return sendLines(interaction, lines);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.settingsUpdateError });
	}
}

async function handleClose(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyClose)) return;
	await interaction.deferReply(FLAGS);

	const reason = interaction.options.getString('reason') || undefined;
	try {
		await require('@xquare/domain/ticket/service/ticketLifecycleService').closeTicket(interaction.channel, interaction.member, reason);
		return interaction.editReply({ content: TEXT.response.closeScheduled(5) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.closeError });
	}
}

async function handleReopen(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyReopen)) return;
	await interaction.deferReply(FLAGS);

	try {
		await require('@xquare/domain/ticket/service/ticketLifecycleService').reopenTicket(interaction.channel, interaction.member);
		return interaction.editReply({ content: TEXT.response.reopenSuccess });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.reopenError });
	}
}

async function handleInfo(interaction) {
	await interaction.deferReply(FLAGS);
	try {
		const { getTicketByChannelId } = require('@xquare/domain/ticket/service/ticketQueryService');
		const ticket = await getTicketByChannelId(interaction.channel.id);
		if (!ticket) return interaction.editReply({ content: TEXT.response.infoNotFound });

		const labels = formatLabels(ticket.labels);
		const assignees = formatAssignees(ticket.assignees);
		const createdAt = ticket.createdAt?.toISOString?.() || TEXT.common.unknown;

		const infoLines = [
			TEXT.info.number(ticket.ticketNumber),
			TEXT.info.title(ticket.title || TEXT.defaults.title),
			TEXT.info.status(ticket.status),
			TEXT.info.author(ticket.userId),
			TEXT.info.assignees(assignees),
			TEXT.info.labels(labels),
			ticket.description ? TEXT.info.description(ticket.description) : null,
			ticket.closedAt ? TEXT.info.closedAt(ticket.closedAt.toISOString()) : null,
			TEXT.info.createdAt(createdAt),
		].filter(Boolean);

		return sendLines(interaction, infoLines);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.infoError });
	}
}

async function handleAddLabel(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyModifyLabels)) return;
	await interaction.deferReply(FLAGS);

	let labels = [];
	try {
		labels = sanitizeLabels(interaction.options.getString('labels'));
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.labelsAddError });
	}

	if (!labels.length) return interaction.editReply({ content: TEXT.response.noLabelsToAdd });

	try {
		const ticket = await addLabels(interaction.channel, labels);
		return interaction.editReply({ content: TEXT.response.labelsAdded(formatLabels(ticket.labels)) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.labelsAddError });
	}
}

async function handleRemoveLabel(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyModifyLabels)) return;
	await interaction.deferReply(FLAGS);

	let labels = [];
	try {
		labels = sanitizeLabels(interaction.options.getString('labels'));
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.labelsRemoveError });
	}

	if (!labels.length) return interaction.editReply({ content: TEXT.response.noLabelsToRemove });

	try {
		const ticket = await removeLabels(interaction.channel, labels);
		return interaction.editReply({ content: TEXT.response.labelsRemoved(formatLabels(ticket.labels)) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.labelsRemoveError });
	}
}

async function handleAssign(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyAssign)) return;
	await interaction.deferReply(FLAGS);

	const user = interaction.options.getUser('user');
	if (!user) return interaction.editReply({ content: TEXT.common.userNotFound });

	try {
		const ticket = await addAssignees(interaction.channel, [user.id]);
		return interaction.editReply({ content: TEXT.response.assigneeAssigned(formatAssignees(ticket.assignees)) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.assigneeAssignError });
	}
}

async function handleUnassign(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyUnassign)) return;
	await interaction.deferReply(FLAGS);

	const user = interaction.options.getUser('user');
	if (!user) return interaction.editReply({ content: TEXT.common.userNotFound });

	try {
		const ticket = await removeAssignees(interaction.channel, [user.id]);
		return interaction.editReply({ content: TEXT.response.assigneeUnassigned(formatAssignees(ticket.assignees)) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.assigneeUnassignError });
	}
}

async function handleList(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyList)) return;
	await interaction.deferReply(FLAGS);

	const status = interaction.options.getString('status') || undefined;
	const label = interaction.options.getString('label') || undefined;
	const assignee = interaction.options.getUser('assignee') || undefined;
	const limit = applyLimit(interaction.options.getInteger('limit') || 10);

	try {
		const tickets = await listTickets({ guildId: interaction.guildId, status, label, assignee: assignee?.id }, { limit });
		if (!tickets.length) return interaction.editReply({ content: TEXT.response.noTickets });

		const lines = tickets.map(ticket => TEXT.list.item({
			ticketNumber: ticket.ticketNumber,
			status: ticket.status,
			title: ticket.title || TEXT.defaults.title,
			labels: formatLabels(ticket.labels),
			assignees: formatAssignees(ticket.assignees),
			channelId: ticket.channelId,
		}));

		return sendLines(interaction, lines);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.listError });
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
	open: handleOpen,
	set: handleSet,
	close: handleClose,
	reopen: handleReopen,
	info: handleInfo,
	'add-label': handleAddLabel,
	'remove-label': handleRemoveLabel,
	assign: handleAssign,
	unassign: handleUnassign,
	list: handleList,
	'publish-ui': handlePublishUi,
};

module.exports = {
	data,
	async execute(interaction) {
		const handler = HANDLERS[interaction.options.getSubcommand()];
		if (handler) return handler(interaction);
	},
};
