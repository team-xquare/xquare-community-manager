const { SlashCommandBuilder } = require('discord.js');
const { createTicket } = require('@xquare/domain/ticket/service/createTicketService');
const { getTicketByChannelId, listTickets } = require('@xquare/domain/ticket/service/ticketQueryService');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { FLAGS } = require('@xquare/global/utils/commandFlags');
const { LIMITS, LABELS_INPUT_MAX } = require('@xquare/global/utils/commandLimits');
const { ensureAdmin } = require('@xquare/global/utils/commandPermissions');
const { sendLines } = require('@xquare/global/utils/commandMessages');
const { formatLabels, formatAssignees } = require('@xquare/global/utils/commandFormatting');
const { t } = require('@xquare/global/i18n');

const TEXT = {
	common: {
		none: t('common.none'),
		unassigned: t('common.unassigned'),
		unknown: t('common.unknown'),
	},
	command: {
		description: t('support.command.description'),
	},
	group: {
		ticket: t('ticket.group.description'),
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
		info: {
			description: t('ticket.subcommand.info.description'),
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
		infoNotFound: t('ticket.response.infoNotFound'),
		infoError: t('ticket.response.infoError'),
		noTickets: t('ticket.response.noTickets'),
		listError: t('ticket.response.listError'),
		adminOnlyList: t('ticket.response.adminOnlyList'),
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

const buildOpenSubcommand = subcommand => subcommand
	.setName('open')
	.setDescription(TEXT.subcommand.open.description)
	.addStringOption(option => option.setName('title').setDescription(TEXT.subcommand.open.option.title).setRequired(true).setMaxLength(LIMITS.titleMax))
	.addStringOption(option => option.setName('description').setDescription(TEXT.subcommand.open.option.description).setRequired(false).setMaxLength(LIMITS.descriptionMax))
	.addStringOption(option => option.setName('labels').setDescription(TEXT.subcommand.open.option.labels).setRequired(false).setMaxLength(LABELS_INPUT_MAX))
	.addUserOption(option => option.setName('assignee').setDescription(TEXT.subcommand.open.option.assignee).setRequired(false));

const buildInfoSubcommand = subcommand => subcommand
	.setName('info')
	.setDescription(TEXT.subcommand.info.description);

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

const buildTicketGroup = group => group
	.setName('ticket')
	.setDescription(TEXT.group.ticket)
	.addSubcommand(buildOpenSubcommand)
	.addSubcommand(buildInfoSubcommand)
	.addSubcommand(buildListSubcommand);

const data = new SlashCommandBuilder()
	.setName('support')
	.setDescription(TEXT.command.description)
	.addSubcommandGroup(buildTicketGroup);

const applyLimit = value => Math.min(Math.max(value, LIMITS.min), LIMITS.max);

async function handleOpen(interaction) {
	await interaction.deferReply(FLAGS);
	try {
		const result = await createTicket(interaction);
		return interaction.editReply({ content: TEXT.response.created(result.channel.id) });
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.createError });
	}
}

async function handleInfo(interaction) {
	await interaction.deferReply(FLAGS);
	try {
		const ticket = await getTicketByChannelId(interaction.channel.id);
		if (!ticket) return interaction.editReply({ content: TEXT.response.infoNotFound });

		const labels = formatLabels(ticket.labels, TEXT.common.none);
		const assignees = formatAssignees(ticket.assignees, TEXT.common.unassigned);
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

		return sendLines(interaction, infoLines, TEXT.common.none);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.infoError });
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
			labels: formatLabels(ticket.labels, TEXT.common.none),
			assignees: formatAssignees(ticket.assignees, TEXT.common.unassigned),
			channel: ticket.channelId ? `<#${ticket.channelId}>` : TEXT.common.unknown,
		}));

		return sendLines(interaction, lines, TEXT.common.none);
	} catch (error) {
		return handleError(wrapUnexpected(error), { interaction, userMessage: TEXT.response.listError });
	}
}

const HANDLERS = {
	ticket: {
		open: handleOpen,
		info: handleInfo,
		list: handleList,
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
