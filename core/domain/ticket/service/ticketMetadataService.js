const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const NotFoundError = require('@xquare/global/utils/errors/NotFoundError');

async function addLabels(channel, labels) {
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError('티켓을 찾을 수 없습니다.');
	const current = new Set(ticket.labels || []);
	labels.forEach(label => current.add(label));
	const updated = await updateTicketByChannelId(channel.id, { labels: Array.from(current), lastActivityAt: new Date() });
	await updateTicketSummary(channel, updated);
	return updated;
}

async function removeLabels(channel, labels) {
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError('티켓을 찾을 수 없습니다.');
	const removeSet = new Set(labels);
	const next = (ticket.labels || []).filter(label => !removeSet.has(label));
	const updated = await updateTicketByChannelId(channel.id, { labels: next, lastActivityAt: new Date() });
	await updateTicketSummary(channel, updated);
	return updated;
}

async function addAssignees(channel, assigneeIds) {
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError('티켓을 찾을 수 없습니다.');
	const current = new Set(ticket.assignees || []);
	assigneeIds.forEach(id => current.add(id));
	const updated = await updateTicketByChannelId(channel.id, { assignees: Array.from(current), lastActivityAt: new Date() });
	await updateTicketSummary(channel, updated);
	return updated;
}

async function removeAssignees(channel, assigneeIds) {
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError('티켓을 찾을 수 없습니다.');
	const removeSet = new Set(assigneeIds);
	const next = (ticket.assignees || []).filter(id => !removeSet.has(id));
	const updated = await updateTicketByChannelId(channel.id, { assignees: next, lastActivityAt: new Date() });
	await updateTicketSummary(channel, updated);
	return updated;
}

module.exports = {
	addLabels,
	removeLabels,
	addAssignees,
	removeAssignees,
};
