const { PermissionsBitField } = require('discord.js');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { findAllTickets } = require('@xquare/domain/ticket/repository/findTicketsRepository');
const NotFoundError = require('@xquare/global/utils/errors/NotFoundError');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const logger = require('@xquare/global/utils/loggers/logger');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const { getOrCreateCategory } = require('@xquare/global/utils/category');
const { getSetting } = require('@xquare/domain/setting/service/settingService');

const pendingCloseTimers = new Map();

function assertAdmin(actorMember) {
	const hasManageGuild = actorMember?.permissions?.has?.(PermissionsBitField.Flags.ManageGuild);
	if (!hasManageGuild) {
		throw new ValidationError('관리자만 티켓을 닫을 수 있습니다.', { expose: true });
	}
}

async function finalizeClose(channel, ticket, actorId, reason) {
	const updated = await updateTicketByChannelId(channel.id, {
		status: 'closed',
		closedAt: new Date(),
		closedBy: actorId,
		closeScheduledAt: null,
		closeScheduledBy: null,
		originalChannelName: channel.name,
		lastActivityAt: new Date(),
	});
	await updateTicketSummary(channel, updated);

	try {
		const baseName = channel.name.replace(/^closed-/, '');
		await channel.setName(`closed-${baseName}`.slice(0, 100));
	} catch (err) {
		logger.warn(`Failed to rename closed ticket channel ${channel.id}: ${err}`);
	}

  try {
    const settings = await getSetting('guild', channel.guild.id, 'ticket', 'ui');
    const newCategory = await getOrCreateCategory(channel.guild, settings.closeCategory);
    await channel.setParent(newCategory.id);
  } catch (err) {
    logger.warn(`Failed to set category of ticket channel ${channel.id} to ${newCategory.id}: ${err}`);
  }

	try {
		await channel.permissionOverwrites.edit(ticket.userId, {
			SendMessages: false,
			ViewChannel: true,
			ReadMessageHistory: true,
		});
	} catch (err) {
		logger.warn(`Failed to update permissions for closed ticket ${ticket.id}: ${err}`);
	}

	const reasonText = reason ? `\n이유: ${reason}` : '';
	await channel.send(`티켓이 종료되었습니다. 요청자: <@${ticket.userId}>${reasonText}`);
	return updated;
}

function cancelScheduledClose(channelId) {
	const pendingTimer = pendingCloseTimers.get(channelId);
	if (pendingTimer) {
		clearTimeout(pendingTimer);
		pendingCloseTimers.delete(channelId);
	}
}

async function handleScheduledClose(channel, reason) {
	try {
		const ticket = await findTicketByChannelId(channel.id);
		if (!ticket) return;

		if (!ticket.closeScheduledAt) return;

		const now = Date.now();
		if (ticket.closeScheduledAt.getTime() > now) {
			scheduleCloseTimer(channel, ticket.closeScheduledAt, reason);
			return;
		}

		await finalizeClose(channel, ticket, ticket.closeScheduledBy || null, reason);
	} catch (err) {
		logger.error(`Failed to finalize ticket close for channel ${channel.id}: ${err}`);
	} finally {
		pendingCloseTimers.delete(channel.id);
	}
}

function scheduleCloseTimer(channel, closesAt, reason) {
	cancelScheduledClose(channel.id);

	const delay = closesAt.getTime() - Date.now();
	if (delay <= 0) {
		void handleScheduledClose(channel, reason);
		return;
	}

	const timer = setTimeout(() => {
		void handleScheduledClose(channel, reason);
	}, delay);

	pendingCloseTimers.set(channel.id, timer);
}

async function closeTicket(channel, actorMember, reason, options = {}) {
	const delayMs = options.delayMs ?? 5 * 60 * 1000;
	assertAdmin(actorMember);

	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) {
		throw new NotFoundError('티켓을 찾을 수 없습니다.');
	}

	if (ticket.status === 'closed') {
		throw new ValidationError('이미 종료된 티켓입니다.');
	}

	const now = Date.now();
	if (ticket.closeScheduledAt && ticket.closeScheduledAt.getTime() > now) {
		throw new ValidationError('이미 종료 대기 중입니다.');
	}

	const closesAt = new Date(now + delayMs);
	const updated = await updateTicketByChannelId(channel.id, {
		closeScheduledAt: closesAt,
		closeScheduledBy: actorMember.id,
	});
	await updateTicketSummary(channel, updated);

	await channel.send(`티켓 종료 명령이 접수되었습니다. 5분 후 닫힙니다.${reason ? `\n이유: ${reason}` : ''}`);

	scheduleCloseTimer(channel, closesAt, reason);

	return { scheduled: true, closesAt };
}

async function reopenTicket(channel, actorMember) {
	assertAdmin(actorMember);

	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) {
		throw new NotFoundError('티켓을 찾을 수 없습니다.');
	}

	cancelScheduledClose(channel.id);

	const updated = await updateTicketByChannelId(channel.id, {
		status: 'open',
		closedAt: null,
		closedBy: null,
		closeScheduledAt: null,
		closeScheduledBy: null,
		originalChannelName: null,
		lastActivityAt: new Date(),
	});
	await updateTicketSummary(channel, updated);

	try {
		const targetName = ticket.originalChannelName || channel.name.replace(/^closed-/, '');
		await channel.setName(targetName.slice(0, 100));
	} catch (err) {
		logger.warn(`Failed to restore ticket channel name ${channel.id}: ${err}`);
	}

  try {
    const settings = await getSetting('guild', channel.guild.id, 'ticket', 'ui');
    const newCategory = await getOrCreateCategory(channel.guild, settings.openCategory);
    await channel.setParent(newCategory.id);
  } catch (err) {
    logger.warn(`Failed to set category of ticket channel ${channel.id} to ${newCategory.id}: ${err}`);
  }

	try {
		await channel.permissionOverwrites.edit(ticket.userId, {
			SendMessages: true,
			ViewChannel: true,
			ReadMessageHistory: true,
		});
	} catch (err) {
		logger.warn(`Failed to restore permissions for reopened ticket ${ticket.id}: ${err}`);
	}

	await channel.send(`티켓이 다시 열렸습니다. 요청자: <@${ticket.userId}>`);
	return updated;
}

async function bootstrapScheduledCloses(client) {
	const tickets = await findAllTickets({
		closeScheduledAt: { $ne: null },
		status: { $ne: 'closed' },
	});

	for (const ticket of tickets) {
		try {
			const channel = await client.channels.fetch(ticket.channelId).catch(() => null);
			if (!channel) {
				logger.warn(`Failed to find channel for scheduled close: ${ticket.channelId}`);
				continue;
			}

			scheduleCloseTimer(channel, ticket.closeScheduledAt, null);
		} catch (err) {
			logger.error(`Failed to schedule close for ticket ${ticket.id}: ${err}`);
		}
	}
}

module.exports = {
	closeTicket,
	reopenTicket,
	bootstrapScheduledCloses,
};
