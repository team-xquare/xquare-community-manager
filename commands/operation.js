const { SlashCommandBuilder } = require('discord.js');
const { closeTicket, reopenTicket } = require('@xquare/domain/ticket/service/ticketLifecycleService');
const { addLabels, removeLabels, addAssignees, removeAssignees } = require('@xquare/domain/ticket/service/ticketMetadataService');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { FLAGS } = require('@xquare/global/utils/commandFlags');
const { LIMITS, LABELS_INPUT_MAX } = require('@xquare/global/utils/commandLimits');
const { ensureAdmin } = require('@xquare/global/utils/commandPermissions');
const { formatLabels, formatAssignees } = require('@xquare/global/utils/commandFormatting');
const { sanitizeLabels } = require('@xquare/global/utils/validators');
const { t } = require('@xquare/global/i18n');

const TEXT = {
	common: {
		userNotFound: t('common.userNotFound'),
		none: t('common.none'),
		unassigned: t('common.unassigned'),
	},
	command: {
		description: t('operation.command.description'),
	},
	group: {
		ticket: t('ticket.group.description'),
	},
	subcommand: {
		close: {
			description: t('ticket.subcommand.close.description'),
			option: { reason: t('ticket.subcommand.close.option.reason') },
		},
		reopen: {
			description: t('ticket.subcommand.reopen.description'),
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
	},
	response: {
		closeScheduled: minutes => t('ticket.response.closeScheduled', { minutes }),
		closeError: t('ticket.response.closeError'),
		reopenSuccess: t('ticket.response.reopenSuccess'),
		reopenError: t('ticket.response.reopenError'),
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
		adminOnlyClose: t('ticket.response.adminOnlyClose'),
		adminOnlyReopen: t('ticket.response.adminOnlyReopen'),
		adminOnlyModifyLabels: t('ticket.response.adminOnlyModifyLabels'),
		adminOnlyAssign: t('ticket.response.adminOnlyAssign'),
		adminOnlyUnassign: t('ticket.response.adminOnlyUnassign'),
	},
};

const buildCloseSubcommand = subcommand => subcommand
	.setName('close')
	.setDescription(TEXT.subcommand.close.description)
	.addStringOption(option => option.setName('reason').setDescription(TEXT.subcommand.close.option.reason).setRequired(false).setMaxLength(LIMITS.reasonMax));

const buildReopenSubcommand = subcommand => subcommand
	.setName('reopen')
	.setDescription(TEXT.subcommand.reopen.description);

const buildAddLabelSubcommand = subcommand => subcommand
	.setName('add-label')
	.setDescription(TEXT.subcommand.addLabel.description)
	.addStringOption(option => option.setName('labels').setDescription(TEXT.subcommand.addLabel.option.labels).setRequired(true).setMaxLength(LABELS_INPUT_MAX));

const buildRemoveLabelSubcommand = subcommand => subcommand
	.setName('remove-label')
	.setDescription(TEXT.subcommand.removeLabel.description)
	.addStringOption(option => option.setName('labels').setDescription(TEXT.subcommand.removeLabel.option.labels).setRequired(true).setMaxLength(LABELS_INPUT_MAX));

const buildAssignSubcommand = subcommand => subcommand
	.setName('assign')
	.setDescription(TEXT.subcommand.assign.description)
	.addUserOption(option => option.setName('user').setDescription(TEXT.subcommand.assign.option.user).setRequired(true));

const buildUnassignSubcommand = subcommand => subcommand
	.setName('unassign')
	.setDescription(TEXT.subcommand.unassign.description)
	.addUserOption(option => option.setName('user').setDescription(TEXT.subcommand.unassign.option.user).setRequired(true));

const buildTicketGroup = group => group
	.setName('ticket')
	.setDescription(TEXT.group.ticket)
	.addSubcommand(buildCloseSubcommand)
	.addSubcommand(buildReopenSubcommand)
	.addSubcommand(buildAddLabelSubcommand)
	.addSubcommand(buildRemoveLabelSubcommand)
	.addSubcommand(buildAssignSubcommand)
	.addSubcommand(buildUnassignSubcommand);

const data = new SlashCommandBuilder()
	.setName('operation')
	.setDescription(TEXT.command.description)
	.addSubcommandGroup(buildTicketGroup);

async function handleClose(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyClose)) return;
	await interaction.deferReply(FLAGS);

	const reason = interaction.options.getString('reason') || undefined;
	try {
		await closeTicket(interaction.channel, interaction.member, reason);
		return interaction.editReply({ content: TEXT.response.closeScheduled(5) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.closeError });
	}
}

async function handleReopen(interaction) {
	if (!await ensureAdmin(interaction, TEXT.response.adminOnlyReopen)) return;
	await interaction.deferReply(FLAGS);

	try {
		await reopenTicket(interaction.channel, interaction.member);
		return interaction.editReply({ content: TEXT.response.reopenSuccess });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.reopenError });
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
		return interaction.editReply({ content: TEXT.response.labelsAdded(formatLabels(ticket.labels, TEXT.common.none)) });
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
		return interaction.editReply({ content: TEXT.response.labelsRemoved(formatLabels(ticket.labels, TEXT.common.none)) });
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
		return interaction.editReply({ content: TEXT.response.assigneeAssigned(formatAssignees(ticket.assignees, TEXT.common.unassigned)) });
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
		return interaction.editReply({ content: TEXT.response.assigneeUnassigned(formatAssignees(ticket.assignees, TEXT.common.unassigned)) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.assigneeUnassignError });
	}
}

const HANDLERS = {
	ticket: {
		close: handleClose,
		reopen: handleReopen,
		'add-label': handleAddLabel,
		'remove-label': handleRemoveLabel,
		assign: handleAssign,
		unassign: handleUnassign,
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
