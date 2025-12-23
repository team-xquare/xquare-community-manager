const { SlashCommandBuilder, MessageFlags, ChannelType, PermissionFlagsBits } = require('discord.js');
const logger = require('@xquare/global/utils/loggers/logger');
const { createTicket } = require('@xquare/domain/ticket/service/createTicketService');
const { updateSetting } = require('@xquare/domain/setting/service/settingService');
const { publishTicketUi } = require('@xquare/domain/ticket/service/ticketUiService');
const { addLabels, removeLabels, addAssignees, removeAssignees } = require('@xquare/domain/ticket/service/ticketMetadataService');
const { listTickets } = require('@xquare/domain/ticket/service/ticketQueryService');

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ticket')
		.setDescription('티켓을 생성하거나 설정을 관리합니다.')
		.addSubcommand(subcommand =>
			subcommand
				.setName('open')
				.setDescription('티켓 생성 UI를 표시합니다.')
				.addStringOption(option =>
					option.setName('title')
						.setDescription('티켓 제목')
						.setRequired(true))
				.addStringOption(option =>
					option.setName('description')
						.setDescription('티켓 설명')
						.setRequired(false))
				.addStringOption(option =>
					option.setName('labels')
						.setDescription('콤마(,)로 구분된 라벨들')
						.setRequired(false))
				.addUserOption(option =>
					option.setName('assignee')
						.setDescription('담당자')
						.setRequired(false))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('set')
				.setDescription('티켓 설정을 변경합니다.')
				.addStringOption(option =>
					option.setName('channel_prefix')
						.setDescription('티켓 채널 접두사를 설정합니다.')
						.setRequired(false))
				.addIntegerOption(option =>
					option.setName('number_pad')
						.setDescription('티켓 번호 패딩 길이(1~6).')
						.setRequired(false))
				.addChannelOption(option =>
					option.setName('creation_channel')
						.setDescription('티켓 생성 UI를 게시할 채널.')
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(false))
				.addStringOption(option =>
					option.setName('welcome_message')
						.setDescription('티켓 채널 환영 메시지. {user}를 포함하면 사용자 멘션으로 대체됩니다.')
						.setRequired(false))
				.addStringOption(option =>
					option.setName('ui_message')
						.setDescription('티켓 생성 버튼 안내 메시지. {user}를 포함하면 사용자 멘션으로 대체됩니다.')
						.setRequired(false))
				.addStringOption(option =>
					option.setName('button_label')
						.setDescription('티켓 생성 버튼 라벨.')
						.setRequired(false))
				.addStringOption(option =>
					option.setName('default_labels')
						.setDescription('기본 라벨(콤마로 구분)')
						.setRequired(false))
        .addStringOption(option =>
					option.setName('open_category')
						.setDescription('티켓 채널을 생성할 카테고리.')
					  .setRequired(false))
        .addStringOption(option =>
					option.setName('close_category')
						.setDescription('삭제한 티켓이 옮겨질 카테고리.')
						.setRequired(false))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('publish-ui')
				.setDescription('설정된 채널에 티켓 생성 UI를 게시합니다.')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('close')
				.setDescription('현재 티켓을 종료합니다.')
				.addStringOption(option =>
					option.setName('reason')
						.setDescription('종료 사유')
						.setRequired(false))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('reopen')
				.setDescription('현재 티켓을 다시 엽니다.')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('info')
				.setDescription('현재 티켓 정보를 확인합니다.')
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('add-label')
				.setDescription('티켓에 라벨을 추가합니다.')
				.addStringOption(option =>
					option.setName('labels')
						.setDescription('추가할 라벨(콤마로 구분)')
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('remove-label')
				.setDescription('티켓에서 라벨을 제거합니다.')
				.addStringOption(option =>
					option.setName('labels')
						.setDescription('제거할 라벨(콤마로 구분)')
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('assign')
				.setDescription('티켓 담당자를 지정합니다.')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('담당자')
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('unassign')
				.setDescription('티켓 담당자를 해제합니다.')
				.addUserOption(option =>
					option.setName('user')
						.setDescription('해제할 담당자')
						.setRequired(true))
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('티켓 목록을 조회합니다.')
				.addStringOption(option =>
					option.setName('status')
						.setDescription('상태 필터')
						.addChoices(
							{ name: 'open', value: 'open' },
							{ name: 'in-progress', value: 'in-progress' },
							{ name: 'closed', value: 'closed' },
						)
						.setRequired(false))
				.addStringOption(option =>
					option.setName('label')
						.setDescription('라벨 필터')
						.setRequired(false))
				.addUserOption(option =>
					option.setName('assignee')
						.setDescription('담당자 필터')
						.setRequired(false))
				.addIntegerOption(option =>
					option.setName('limit')
						.setDescription('최대 조회 개수(1~20)')
						.setRequired(false))
		),
	async execute(interaction) {
		const subcommand = interaction.options.getSubcommand();

		if (subcommand === 'open') {
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
			return;
		}

		if (subcommand === 'set') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '이 명령을 실행할 권한이 없습니다.', flags: MessageFlags.Ephemeral });
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
			const defaultLabels = defaultLabelsRaw
				? defaultLabelsRaw.split(',').map(label => label.trim()).filter(Boolean)
			  : undefined;
      const openCategory = interaction.options.getString('open_category') || undefined;
      const closeCategory = interaction.options.getString('close_category') || undefined;

			const updatePayload = {};
			if (channelPrefix) updatePayload.channelPrefix = channelPrefix;
			if (numberPad) updatePayload.numberPadLength = numberPad;
			if (creationChannel) updatePayload.creationChannelId = creationChannel.id;
			if (welcomeMessage) updatePayload.welcomeMessage = welcomeMessage;
			if (uiMessage) updatePayload.uiMessage = uiMessage;
			if (buttonLabel) updatePayload.buttonLabels = { create: buttonLabel };
			if (defaultLabels) updatePayload.defaultLabels = defaultLabels;
      if (openCategory) updatePayload.openCategory = openCategory;
      if (closeCategory) updatePayload.closeCategory = closeCategory;

			try {
				const updated = await updateSetting('guild', interaction.guildId, 'ticket', 'ui', updatePayload, interaction.user.id);
				await interaction.editReply({
					content: [
						'티켓 설정이 업데이트되었습니다.',
						`채널 접두사: ${updated.channelPrefix ?? '기본값'}`,
						`번호 패딩: ${updated.numberPadLength ?? '기본값'}`,
						`생성 UI 채널: ${updated.creationChannelId ? `<#${updated.creationChannelId}>` : '미설정'}`,
						`티켓 환영 메시지: ${updated.welcomeMessage ?? '기본값'}`,
						`UI 안내 메시지: ${updated.uiMessage ?? '기본값'}`,
						`버튼 라벨: ${updated.buttonLabels?.create ?? '기본값'}`,
						`기본 라벨: ${updated.defaultLabels?.length ? updated.defaultLabels.map(l => `\`${l}\``).join(', ') : '미설정'}`,
            `채널 생성 카테고리: ${updated.openCategory ?? '기본값'}`,
            `채널 닫힘 카테고리: ${updated.closeCategory ?? '기본값'}`,
					].join('\n'),
				});
			} catch (error) {
				logger.error(`Failed to update ticket settings: ${error}`);
				await interaction.editReply({ content: '설정 업데이트 중 오류가 발생했습니다.' });
			}
		}
		if (subcommand === 'close') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '관리자만 티켓을 닫을 수 있습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const reason = interaction.options.getString('reason') || null;
			try {
				await require('@xquare/domain/ticket/service/ticketLifecycleService').closeTicket(interaction.channel, interaction.member, reason);
				await interaction.editReply({ content: '티켓을 5분 후 종료합니다.' });
			} catch (error) {
				logger.error(`Failed to close ticket: ${error}`);
				await interaction.editReply({ content: '티켓 종료 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'reopen') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '관리자만 티켓을 다시 열 수 있습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			try {
				await require('@xquare/domain/ticket/service/ticketLifecycleService').reopenTicket(interaction.channel, interaction.member);
				await interaction.editReply({ content: '티켓을 다시 열었습니다.' });
			} catch (error) {
				logger.error(`Failed to reopen ticket: ${error}`);
				await interaction.editReply({ content: '티켓 재오픈 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'info') {
			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			try {
				const { getTicketByChannelId } = require('@xquare/domain/ticket/service/ticketQueryService');
				const ticket = await getTicketByChannelId(interaction.channel.id);
				if (!ticket) {
					await interaction.editReply({ content: '이 채널에서 티켓을 찾을 수 없습니다.' });
					return;
				}

				const infoLines = [
					`번호: #${ticket.ticketNumber}`,
					`제목: ${ticket.title || '제목 없음'}`,
					`상태: ${ticket.status}`,
					`작성자: <@${ticket.userId}>`,
					ticket.assignees?.length ? `담당자: ${ticket.assignees.map(id => `<@${id}>`).join(', ')}` : '담당자: 미지정',
					ticket.labels?.length ? `라벨: ${ticket.labels.map(l => `\`${l}\``).join(', ')}` : '라벨: 없음',
					ticket.description ? `설명: ${ticket.description}` : null,
					ticket.closedAt ? `종료 시각: ${ticket.closedAt.toISOString()}` : null,
					`생성 시각: ${ticket.createdAt?.toISOString?.() || '알 수 없음'}`,
				].filter(Boolean);

				await interaction.editReply({ content: infoLines.join('\n') });
			} catch (error) {
				logger.error(`Failed to fetch ticket info: ${error}`);
				await interaction.editReply({ content: '티켓 정보 조회 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'add-label') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '관리자만 라벨을 수정할 수 있습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const labels = interaction.options.getString('labels')
				.split(',')
				.map(label => label.trim())
				.filter(Boolean);

			if (!labels.length) {
				await interaction.editReply({ content: '추가할 라벨이 없습니다.' });
				return;
			}

			try {
				const ticket = await addLabels(interaction.channel, labels);
				const labelText = ticket.labels?.length ? ticket.labels.map(l => `\`${l}\``).join(', ') : '없음';
				await interaction.editReply({ content: `라벨이 추가되었습니다. 현재 라벨: ${labelText}` });
			} catch (error) {
				logger.error(`Failed to add labels: ${error}`);
				await interaction.editReply({ content: '라벨 추가 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'remove-label') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '관리자만 라벨을 수정할 수 있습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const labels = interaction.options.getString('labels')
				.split(',')
				.map(label => label.trim())
				.filter(Boolean);

			if (!labels.length) {
				await interaction.editReply({ content: '제거할 라벨이 없습니다.' });
				return;
			}

			try {
				const ticket = await removeLabels(interaction.channel, labels);
				const labelText = ticket.labels?.length ? ticket.labels.map(l => `\`${l}\``).join(', ') : '없음';
				await interaction.editReply({ content: `라벨이 제거되었습니다. 현재 라벨: ${labelText}` });
			} catch (error) {
				logger.error(`Failed to remove labels: ${error}`);
				await interaction.editReply({ content: '라벨 제거 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'assign') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '관리자만 담당자를 지정할 수 있습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const user = interaction.options.getUser('user');
			try {
				const ticket = await addAssignees(interaction.channel, [user.id]);
				const assigneeText = ticket.assignees?.length
					? ticket.assignees.map(id => `<@${id}>`).join(', ')
					: '미지정';
				await interaction.editReply({ content: `담당자가 지정되었습니다. 현재 담당자: ${assigneeText}` });
			} catch (error) {
				logger.error(`Failed to assign user: ${error}`);
				await interaction.editReply({ content: '담당자 지정 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'unassign') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '관리자만 담당자를 해제할 수 있습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });
			const user = interaction.options.getUser('user');
			try {
				const ticket = await removeAssignees(interaction.channel, [user.id]);
				const assigneeText = ticket.assignees?.length
					? ticket.assignees.map(id => `<@${id}>`).join(', ')
					: '미지정';
				await interaction.editReply({ content: `담당자가 해제되었습니다. 현재 담당자: ${assigneeText}` });
			} catch (error) {
				logger.error(`Failed to unassign user: ${error}`);
				await interaction.editReply({ content: '담당자 해제 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'list') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '관리자만 티켓 목록을 조회할 수 있습니다.', flags: MessageFlags.Ephemeral });
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
					await interaction.editReply({ content: '조건에 맞는 티켓이 없습니다.' });
					return;
				}

				const lines = tickets.map(ticket => {
					const labelsText = ticket.labels?.length ? ticket.labels.map(l => `\`${l}\``).join(', ') : '없음';
					const assigneesText = ticket.assignees?.length ? ticket.assignees.map(id => `<@${id}>`).join(', ') : '미지정';
					return `#${ticket.ticketNumber} [${ticket.status}] ${ticket.title || '제목 없음'} | ${labelsText} | ${assigneesText} | <#${ticket.channelId}>`;
				});

				await interaction.editReply({ content: lines.join('\n') });
			} catch (error) {
				logger.error(`Failed to list tickets: ${error}`);
				await interaction.editReply({ content: '티켓 목록 조회 중 오류가 발생했습니다.' });
			}
			return;
		}
		if (subcommand === 'publish-ui') {
			if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
				await interaction.reply({ content: '이 명령을 실행할 권한이 없습니다.', flags: MessageFlags.Ephemeral });
				return;
			}

			await interaction.deferReply({ flags: MessageFlags.Ephemeral });

			try {
				await publishTicketUi(interaction.guild, interaction.user);
				await interaction.editReply({ content: '티켓 생성 UI를 게시했습니다.' });
			} catch (error) {
				logger.error(`Failed to publish ticket UI: ${error}`);
				await interaction.editReply({ content: '티켓 생성 UI 게시 중 오류가 발생했습니다.' });
			}
		}
	},
};
