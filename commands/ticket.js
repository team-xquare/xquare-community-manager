const { SlashCommandBuilder, MessageFlags, ChannelType, PermissionFlagsBits } = require('discord.js');
const { createTicket } = require('@xquare/domain/ticket/service/createTicketService');
const { updateSetting } = require('@xquare/domain/setting/service/settingService');
const { publishTicketUi } = require('@xquare/domain/ticket/service/ticketUiService');
const { addLabels, removeLabels, addAssignees, removeAssignees } = require('@xquare/domain/ticket/service/ticketMetadataService');
const { listTickets } = require('@xquare/domain/ticket/service/ticketQueryService');
const { handleError, wrapUnexpected } = require('@xquare/global/utils/errorHandler');
const { sanitizeLabels } = require('@xquare/global/utils/validators');
const { t } = require('@xquare/global/i18n');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription(t('ticket.command.description'))
		.addSubcommand(subcommand =>
			subcommand
				.setName('open')
				.setDescription(t('ticket.subcommand.open.description'))
				.addStringOption(option =>
					option.setName('title')
						.setDescription(t('ticket.subcommand.open.option.title'))
						.setRequired(true))
				.addStringOption(option =>
					option.setName('description')
						.setDescription(t('ticket.subcommand.open.option.description'))
						.setRequired(false))
				.addStringOption(option =>
					option.setName('labels')
						.setDescription(t('ticket.subcommand.open.option.labels'))
						.setRequired(false))
				.addUserOption(option =>
					option.setName('assignee')
						.setDescription(t('ticket.subcommand.open.option.assignee'))
						.setRequired(false))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('set')
				.setDescription(t('ticket.subcommand.set.description'))
				.addStringOption(option =>
					option.setName('channel_prefix')
						.setDescription(t('ticket.subcommand.set.option.channelPrefix'))
						.setRequired(false))
				.addIntegerOption(option =>
					option.setName('number_pad')
						.setDescription(t('ticket.subcommand.set.option.numberPad'))
						.setRequired(false))
				.addChannelOption(option =>
					option.setName('creation_channel')
						.setDescription(t('ticket.subcommand.set.option.creationChannel'))
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false))
				.addStringOption(option =>
					option.setName('welcome_message')
						.setDescription(t('ticket.subcommand.set.option.welcomeMessage'))
						.setRequired(false))
				.addStringOption(option =>
					option.setName('ui_message')
						.setDescription(t('ticket.subcommand.set.option.uiMessage'))
						.setRequired(false))
				.addStringOption(option =>
					option.setName('button_label')
						.setDescription(t('ticket.subcommand.set.option.buttonLabel'))
						.setRequired(false))
				.addStringOption(option =>
					option.setName('default_labels')
						.setDescription(t('ticket.subcommand.set.option.defaultLabels'))
						.setRequired(false))
				.addStringOption(option =>
					option.setName('open_category')
						.setDescription(t('ticket.subcommand.set.option.openCategory'))
						.setRequired(false))
				.addStringOption(option =>
					option.setName('close_category')
						.setDescription(t('ticket.subcommand.set.option.closeCategory'))
						.setRequired(false))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('publish-ui')
				.setDescription(t('ticket.subcommand.publishUi.description'))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('close')
				.setDescription(t('ticket.subcommand.close.description'))
				.addStringOption(option =>
					option.setName('reason')
						.setDescription(t('ticket.subcommand.close.option.reason'))
						.setRequired(false))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('reopen')
				.setDescription(t('ticket.subcommand.reopen.description'))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('info')
				.setDescription(t('ticket.subcommand.info.description'))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add-label')
				.setDescription(t('ticket.subcommand.addLabel.description'))
				.addStringOption(option =>
					option.setName('labels')
						.setDescription(t('ticket.subcommand.addLabel.option.labels'))
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove-label')
				.setDescription(t('ticket.subcommand.removeLabel.description'))
				.addStringOption(option =>
					option.setName('labels')
						.setDescription(t('ticket.subcommand.removeLabel.option.labels'))
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('assign')
				.setDescription(t('ticket.subcommand.assign.description'))
				.addUserOption(option =>
					option.setName('user')
						.setDescription(t('ticket.subcommand.assign.option.user'))
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('unassign')
				.setDescription(t('ticket.subcommand.unassign.description'))
				.addUserOption(option =>
					option.setName('user')
						.setDescription(t('ticket.subcommand.unassign.option.user'))
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription(t('ticket.subcommand.list.description'))
				.addStringOption(option =>
					option.setName('status')
						.setDescription(t('ticket.subcommand.list.option.status'))
						.addChoices(
							{ name: 'open', value: 'open' },
							{ name: 'in-progress', value: 'in-progress' },
							{ name: 'closed', value: 'closed' },
						)
						.setRequired(false))
				.addStringOption(option =>
					option.setName('label')
						.setDescription(t('ticket.subcommand.list.option.label'))
						.setRequired(false))
				.addUserOption(option =>
					option.setName('assignee')
						.setDescription(t('ticket.subcommand.list.option.assignee'))
						.setRequired(false))
				.addIntegerOption(option =>
					option.setName('limit')
						.setDescription(t('ticket.subcommand.list.option.limit'))
						.setRequired(false))
		),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'open') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			try {
				const result = await createTicket(interaction);

				await interaction.editReply({
					content: t('ticket.response.created', { channelId: result.channel.id }),
				});
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.createError'),
				});
			}
			return;
		}

		if (subcommand === 'set') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('common.noPermission'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			const channelPrefix = interaction.options.getString('channel_prefix') || undefined;
			const numberPad = interaction.options.getInteger('number_pad') || undefined;
			const creationChannel = interaction.options.getChannel('creation_channel') || undefined;
			const welcomeMessage = interaction.options.getString('welcome_message') || undefined;
			const uiMessage = interaction.options.getString('ui_message') || undefined;
		const buttonLabel = interaction.options.getString('button_label') || undefined;
		const defaultLabelsRaw = interaction.options.getString('default_labels') || undefined;
		const hasDefaultLabels = defaultLabelsRaw !== undefined;
		let defaultLabels = undefined;
		if (hasDefaultLabels) {
			try {
				defaultLabels = sanitizeLabels(defaultLabelsRaw);
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.settingsUpdateError'),
				});
				return;
			}
		}
			const openCategory = interaction.options.getString('open_category') || undefined;
			const closeCategory = interaction.options.getString('close_category') || undefined;

			const updatePayload = {};
			if (channelPrefix) updatePayload.channelPrefix = channelPrefix;
			if (numberPad) updatePayload.numberPadLength = numberPad;
			if (creationChannel) updatePayload.creationChannelId = creationChannel.id;
			if (welcomeMessage) updatePayload.welcomeMessage = welcomeMessage;
			if (uiMessage) updatePayload.uiMessage = uiMessage;
			if (buttonLabel) updatePayload.buttonLabels = { create: buttonLabel };
			if (hasDefaultLabels) updatePayload.defaultLabels = defaultLabels;
			if (openCategory) updatePayload.openCategory = openCategory;
			if (closeCategory) updatePayload.closeCategory = closeCategory;

			try {
				const updated = await updateSetting('guild', interaction.guildId, 'ticket', 'ui', updatePayload, interaction.user.id);
				const defaultValue = t('common.defaultValue');
				const unsetValue = t('common.unset');
				const defaultLabelsText = updated.defaultLabels?.length
					? updated.defaultLabels.map(label => `\`${label}\``).join(', ')
					: unsetValue;

				const creationChannelText = updated.creationChannelId
					? `<#${updated.creationChannelId}>`
					: unsetValue;

				const lines = [
					t('ticket.response.settingsUpdated'),
					t('ticket.settings.line.channelPrefix', { value: updated.channelPrefix ?? defaultValue }),
					t('ticket.settings.line.numberPad', { value: updated.numberPadLength ?? defaultValue }),
					t('ticket.settings.line.creationChannel', { value: creationChannelText }),
					t('ticket.settings.line.welcomeMessage', { value: updated.welcomeMessage ?? defaultValue }),
					t('ticket.settings.line.uiMessage', { value: updated.uiMessage ?? defaultValue }),
					t('ticket.settings.line.buttonLabel', { value: updated.buttonLabels?.create ?? defaultValue }),
					t('ticket.settings.line.defaultLabels', { value: defaultLabelsText }),
					t('ticket.settings.line.openCategory', { value: updated.openCategory ?? defaultValue }),
					t('ticket.settings.line.closeCategory', { value: updated.closeCategory ?? defaultValue }),
				];

				await interaction.editReply({ content: lines.join('\n') });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.settingsUpdateError'),
				});
			}
			return;
		}

		if (subcommand === 'close') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('ticket.response.adminOnlyClose'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const reason = interaction.options.getString('reason') || undefined;

			try {
				await require('@xquare/domain/ticket/service/ticketLifecycleService').closeTicket(
					interaction.channel,
					interaction.member,
					reason
				);
				await interaction.editReply({ content: t('ticket.response.closeScheduled', { minutes: 5 }) });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.closeError'),
				});
			}
			return;
		}

		if (subcommand === 'reopen') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('ticket.response.adminOnlyReopen'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			try {
				await require('@xquare/domain/ticket/service/ticketLifecycleService').reopenTicket(
					interaction.channel,
					interaction.member
				);
				await interaction.editReply({ content: t('ticket.response.reopenSuccess') });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.reopenError'),
				});
			}
			return;
		}

		if (subcommand === 'info') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			try {
				const { getTicketByChannelId } = require('@xquare/domain/ticket/service/ticketQueryService');
				const ticket = await getTicketByChannelId(interaction.channel.id);
				if (!ticket) {
					await interaction.editReply({ content: t('ticket.response.infoNotFound') });
					return;
				}

				const defaultTitle = t('ticket.defaults.title');
				const labelsText = ticket.labels?.length ? ticket.labels.map(label => `\`${label}\``).join(', ') : t('common.none');
				const assigneesText = ticket.assignees?.length ? ticket.assignees.map(id => `<@${id}>`).join(', ') : t('common.unassigned');
				const createdAtText = ticket.createdAt?.toISOString?.() || t('common.unknown');

				const infoLines = [
					t('ticket.info.number', { ticketNumber: ticket.ticketNumber }),
					t('ticket.info.title', { title: ticket.title || defaultTitle }),
					t('ticket.info.status', { status: ticket.status }),
					t('ticket.info.author', { userId: ticket.userId }),
					t('ticket.info.assignees', { assignees: assigneesText }),
					t('ticket.info.labels', { labels: labelsText }),
					ticket.description ? t('ticket.info.description', { description: ticket.description }) : null,
					ticket.closedAt ? t('ticket.info.closedAt', { timestamp: ticket.closedAt.toISOString() }) : null,
					t('ticket.info.createdAt', { timestamp: createdAtText }),
				].filter(Boolean);

				await interaction.editReply({ content: infoLines.join('\n') });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.infoError'),
				});
			}
			return;
		}

		if (subcommand === 'add-label') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('ticket.response.adminOnlyModifyLabels'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const labelsRaw = interaction.options.getString('labels');
			let labels = [];

			try {
				labels = sanitizeLabels(labelsRaw);
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.labelsAddError'),
				});
				return;
			}

			if (!labels.length) {
				await interaction.editReply({ content: t('ticket.response.noLabelsToAdd') });
				return;
			}

			try {
				const ticket = await addLabels(interaction.channel, labels);
				const labelText = ticket.labels?.length ? ticket.labels.map(l => `\`${l}\``).join(', ') : t('common.none');
				await interaction.editReply({ content: t('ticket.response.labelsAdded', { labels: labelText }) });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.labelsAddError'),
				});
			}
			return;
		}

		if (subcommand === 'remove-label') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('ticket.response.adminOnlyModifyLabels'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const labelsRaw = interaction.options.getString('labels');
			let labels = [];

			try {
				labels = sanitizeLabels(labelsRaw);
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.labelsRemoveError'),
				});
				return;
			}

			if (!labels.length) {
				await interaction.editReply({ content: t('ticket.response.noLabelsToRemove') });
				return;
			}

			try {
				const ticket = await removeLabels(interaction.channel, labels);
				const labelText = ticket.labels?.length ? ticket.labels.map(l => `\`${l}\``).join(', ') : t('common.none');
				await interaction.editReply({ content: t('ticket.response.labelsRemoved', { labels: labelText }) });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.labelsRemoveError'),
				});
			}
			return;
		}

		if (subcommand === 'assign') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('ticket.response.adminOnlyAssign'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const user = interaction.options.getUser('user');
			if (!user) {
				await interaction.editReply({ content: t('common.userNotFound') });
				return;
			}
			try {
				const ticket = await addAssignees(interaction.channel, [user.id]);
				const assigneeText = ticket.assignees?.length
					? ticket.assignees.map(id => `<@${id}>`).join(', ')
					: t('common.unassigned');
				await interaction.editReply({ content: t('ticket.response.assigneeAssigned', { assignees: assigneeText }) });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.assigneeAssignError'),
				});
			}
			return;
		}

		if (subcommand === 'unassign') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('ticket.response.adminOnlyUnassign'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const user = interaction.options.getUser('user');
			if (!user) {
				await interaction.editReply({ content: t('common.userNotFound') });
				return;
			}
			try {
				const ticket = await removeAssignees(interaction.channel, [user.id]);
				const assigneeText = ticket.assignees?.length
					? ticket.assignees.map(id => `<@${id}>`).join(', ')
					: t('common.unassigned');
				await interaction.editReply({ content: t('ticket.response.assigneeUnassigned', { assignees: assigneeText }) });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.assigneeUnassignError'),
				});
			}
			return;
		}

		if (subcommand === 'list') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('ticket.response.adminOnlyList'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const status = interaction.options.getString('status') || undefined;
			const label = interaction.options.getString('label') || undefined;
			const assignee = interaction.options.getUser('assignee') || undefined;
			const limitRaw = interaction.options.getInteger('limit') || 10;
			const limit = Math.min(Math.max(limitRaw, 1), 20);

			try {
				const tickets = await listTickets(
					{
						guildId: interaction.guildId,
						status,
						label,
						assignee: assignee?.id,
					},
					{ limit }
				);

				if (!tickets.length) {
					await interaction.editReply({ content: t('ticket.response.noTickets') });
					return;
				}

				const lines = tickets.map(ticket => {
					const labelsText = ticket.labels?.length ? ticket.labels.map(l => `\`${l}\``).join(', ') : t('common.none');
					const assigneesText = ticket.assignees?.length ? ticket.assignees.map(id => `<@${id}>`).join(', ') : t('common.unassigned');
					const title = ticket.title || t('ticket.defaults.title');
					return t('ticket.list.item', {
						ticketNumber: ticket.ticketNumber,
						status: ticket.status,
						title,
						labels: labelsText,
						assignees: assigneesText,
						channelId: ticket.channelId,
					});
				});

				await interaction.editReply({ content: lines.join('\n') });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.listError'),
				});
			}
			return;
		}

		if (subcommand === 'publish-ui') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: t('common.noPermission'), flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			try {
				await publishTicketUi(interaction.guild, interaction.user);
				await interaction.editReply({ content: t('ticket.response.publishSuccess') });
			} catch (error) {
				await handleError(wrapUnexpected(error), {
					interaction,
					userMessage: t('ticket.response.publishError'),
				});
			}
		}
	},
};
