const { findTicketByChannelId } = require('@xquare/domain/ticket/repository/findTicketByChannelIdRepository');
const { updateTicketByChannelId } = require('@xquare/domain/ticket/repository/updateTicketRepository');
const { updateTicketSummary } = require('@xquare/domain/ticket/service/ticketSummaryService');
const NotFoundError = require('@xquare/global/utils/errors/NotFoundError');
const { t } = require('@xquare/global/i18n');

const ERROR = { ticketNotFound: t('ticket.errors.ticketNotFound') };

const buildUpdatedArray = (currentValues, items, operation) => {
	const current = new Set(currentValues || []);
	if (operation === 'add') return [...new Set([...current, ...items])];
	if (operation === 'remove') return [...current].filter(item => !items.includes(item));
	return currentValues || [];
};

async function updateTicketArray(channel, fieldName, items, operation) {
	const ticket = await findTicketByChannelId(channel.id);
	if (!ticket) throw new NotFoundError(ERROR.ticketNotFound);

	const updatedArray = buildUpdatedArray(ticket[fieldName], items, operation);
	const updated = await updateTicketByChannelId(channel.id, { [fieldName]: updatedArray, lastActivityAt: new Date() });
	await updateTicketSummary(channel, updated);
	return updated;
}

const addLabels = (channel, labels) => updateTicketArray(channel, 'labels', labels, 'add');
const removeLabels = (channel, labels) => updateTicketArray(channel, 'labels', labels, 'remove');
const addAssignees = (channel, assigneeIds) => updateTicketArray(channel, 'assignees', assigneeIds, 'add');
const removeAssignees = (channel, assigneeIds) => updateTicketArray(channel, 'assignees', assigneeIds, 'remove');

module.exports = { addLabels, removeLabels, addAssignees, removeAssignees };
