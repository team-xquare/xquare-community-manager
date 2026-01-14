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
const { t } = require('@xquare/global/i18n');

const pendingCloseTimers = new Map();

function assertAdmin(actorMember) {
	const hasManageGuild = actorMember?.permissions?.has?.(PermissionsBitField.Flags.ManageGuild);
	if (!hasManageGuild) {
		throw new ValidationError(t('ticket.errors.adminOnlyClose'), { expose: true });
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
		logger.warn('Failed to rename closed ticket channel', { error: err, channelId: channel.id });
	}

	try {
		const settings = await getSetting('guild', channel.guild.id, 'ticket', 'ui');
		const newCategory = await getOrCreateCategory(channel.guild, settings.closeCategory);
		await channel.setParent(newCategory.id);
	} catch (err) {
		logger.warn('Failed to set category of ticket channel', { error: err, channelId: channel.id });
	}

	try {
		await channel.permissionOverwrites.edit(ticket.userId, {
			SendMessages: false,
			ViewChannel: true,
			ReadMessageHistory: true,
		});
	} catch (err) {
		logger.warn('Failed to update permissions for closed ticket', { error: err, channelId: channel.id, userId: ticket.userId });
	}

	const reasonText = reason ? t('ticket.lifecycle.reasonLine', { reason }) : '';
	await channel.send(t('ticket.lifecycle.closed', { userId: ticket.userId, reason: reasonText }));
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
		logger.error('Failed to finalize ticket close for channel', { error: err, channelId: channel.id });
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
		throw new NotFoundError(t('ticket.errors.ticketNotFound'));
	}

	if (ticket.status === 'closed') {
		throw new ValidationError(t('ticket.errors.alreadyClosed'));
	}

	const now = Date.now();
	if (ticket.closeScheduledAt && ticket.closeScheduledAt.getTime() > now) {
		throw new ValidationError(t('ticket.errors.alreadyClosing'));
	}

	const closesAt = new Date(now + delayMs);
	const updated = await updateTicketByChannelId(channel.id, {
		closeScheduledAt: closesAt,
		closeScheduledBy: actorMember.id,
	});
	await updateTicketSummary(channel, updated);

	const reasonText = reason ? t('ticket.lifecycle.reasonLine', { reason }) : '';
	const minutes = Math.max(1, Math.round(delayMs / 60000));
	await channel.send(t('ticket.lifecycle.closeScheduled', { minutes, reason: reasonText }));

	scheduleCloseTimer(channel, closesAt, reason);

	return { scheduled: true, closesAt };
}

async function reopenTicket(channel, actorMember) {
	assertAdmin(actorMember);

	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) {
		throw new NotFoundError(t('ticket.errors.ticketNotFound'));
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
		logger.warn('Failed to restore ticket channel name', { error: err, channelId: channel.id });
	}

	let targetCategoryId = null;
	try {
		const settings = await getSetting('guild', channel.guild.id, 'ticket', 'ui');
		const newCategory = await getOrCreateCategory(channel.guild, settings.openCategory);
		targetCategoryId = newCategory.id;
		await channel.setParent(newCategory.id);
	} catch (err) {
		logger.warn('Failed to set category of ticket channel', { error: err, channelId: channel.id, categoryId: targetCategoryId });
	}

	try {
		await channel.permissionOverwrites.edit(ticket.userId, {
			SendMessages: true,
			ViewChannel: true,
			ReadMessageHistory: true,
		});
	} catch (err) {
		logger.warn('Failed to restore permissions for reopened ticket', { error: err, ticketId: ticket.id });
	}

	await channel.send(t('ticket.lifecycle.reopened', { userId: ticket.userId }));
	return updated;
}

async function bootstrapScheduledCloses(client) {
	const tickets = await findAllTickets({
		closeScheduledAt: { $ne: null },
		status: { $ne: 'closed' },
	});

	const channelIds = [...new Set(tickets.map(ticket => ticket.channelId).filter(Boolean))];
	const channelMap = new Map();

	for (const channelId of channelIds) {
		const cached = client.channels.cache.get(channelId);
		if (cached) {
			channelMap.set(channelId, cached);
		}
	}

	const fetchIds = channelIds.filter(channelId => !channelMap.has(channelId));
	const fetchResults = await Promise.allSettled(
		fetchIds.map(channelId => client.channels.fetch(channelId))
	);

	fetchResults.forEach((result, index) => {
		const channelId = fetchIds[index];
		if (result.status === 'fulfilled' && result.value) {
			channelMap.set(channelId, result.value);
		} else {
			logger.warn('Failed to find channel for scheduled close', {
				channelId,
				error: result.status === 'rejected' ? result.reason : null,
			});
		}
	});

	for (const ticket of tickets) {
		try {
			const channel = channelMap.get(ticket.channelId);
			if (!channel) {
				logger.warn('Failed to find channel for scheduled close', { channelId: ticket.channelId });
				continue;
			}

			scheduleCloseTimer(channel, ticket.closeScheduledAt, null);
		} catch (err) {
			logger.error('Failed to schedule close for ticket', { error: err, ticketId: ticket.id });
		}
	}
}

module.exports = {
	closeTicket,
	reopenTicket,
	bootstrapScheduledCloses,
};
