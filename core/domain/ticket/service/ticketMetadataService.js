const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const NotFoundError = require('@xquare/global/utils/errors/NotFoundError');
const { t } = require('@xquare/global/i18n');

async function updateTicketArray(channel, fieldName, items, operation) {
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) {
		throw new NotFoundError(t('ticket.errors.ticketNotFound'));
	}

	let updatedArray;
	if (operation === 'add') {
		const current = new Set(ticket[fieldName] || []);
		items.forEach(item => current.add(item));
		updatedArray = Array.from(current);
	} else if (operation === 'remove') {
		const removeSet = new Set(items);
		updatedArray = (ticket[fieldName] || []).filter(item => !removeSet.has(item));
	}

	const updateData = {
		[fieldName]: updatedArray,
		lastActivityAt: new Date(),
	};

	const updated = await updateTicketByChannelId(channel.id, updateData);
	await updateTicketSummary(channel, updated);
	return updated;
}

async function addLabels(channel, labels) {
	return updateTicketArray(channel, 'labels', labels, 'add');
}

async function removeLabels(channel, labels) {
	return updateTicketArray(channel, 'labels', labels, 'remove');
}

async function addAssignees(channel, assigneeIds) {
	return updateTicketArray(channel, 'assignees', assigneeIds, 'add');
}

async function removeAssignees(channel, assigneeIds) {
	return updateTicketArray(channel, 'assignees', assigneeIds, 'remove');
}

module.exports = {
	addLabels,
	removeLabels,
	addAssignees,
	removeAssignees,
};
