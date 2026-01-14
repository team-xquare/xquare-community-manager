const ValidationError = require('@xquare/global/utils/errors/ValidationError');

function sanitizeString(value, fieldName = 'Field', maxLength = 500) {
	if (value === null || value === undefined) {
		return '';
	}

	if (typeof value !== 'string') {
		throw new ValidationError(`${fieldName} must be a string`);
	}

	if (value.length > maxLength) {
		throw new ValidationError(`${fieldName} must not exceed ${maxLength} characters`);
	}

	return value.trim();
}

function sanitizeLabels(labelsString, maxLabels = 10, maxLabelLength = 50) {
	if (!labelsString || typeof labelsString !== 'string') {
		return [];
	}

	const labels = labelsString
		.split(',')
		.map(label => label.trim())
		.filter(Boolean)
		.slice(0, maxLabels);

	for (const label of labels) {
		if (label.length > maxLabelLength) {
			throw new ValidationError(`Each label must not exceed ${maxLabelLength} characters`);
		}
		if (!/^[a-zA-Z0-9가-힣\s\-_]+$/.test(label)) {
			throw new ValidationError(`Label "${label}" contains invalid characters`);
		}
	}

	return labels;
}

function sanitizeTicketStatus(status) {
	const validStatuses = ['open', 'in-progress', 'closed', 'closing'];

	if (!status) {
		return undefined;
	}

	if (typeof status !== 'string') {
		throw new ValidationError('Status must be a string');
	}

	const normalizedStatus = status.toLowerCase().trim();

	if (!validStatuses.includes(normalizedStatus)) {
		throw new ValidationError(`Status must be one of: ${validStatuses.join(', ')}`);
	}

	return normalizedStatus;
}

function sanitizeDiscordId(id, fieldName = 'ID') {
	if (!id) {
		return undefined;
	}

	if (typeof id !== 'string') {
		throw new ValidationError(`${fieldName} must be a string`);
	}

	if (!/^\d{17,20}$/.test(id)) {
		throw new ValidationError(`${fieldName} must be a valid Discord ID`);
	}

	return id;
}

function validateQueryFilters(filters) {
	const sanitized = {};

	if (filters.guildId) {
		sanitized.guildId = sanitizeDiscordId(filters.guildId, 'Guild ID');
	}

	if (filters.status) {
		sanitized.status = sanitizeTicketStatus(filters.status);
	}

	if (filters.label) {
		if (typeof filters.label !== 'string') {
			throw new ValidationError('Label must be a string');
		}
		sanitized.label = sanitizeString(filters.label, 'Label', 50);
	}

	if (filters.assignee) {
		sanitized.assignee = sanitizeDiscordId(filters.assignee, 'Assignee ID');
	}

	return sanitized;
}

module.exports = {
	sanitizeString,
	sanitizeLabels,
	sanitizeTicketStatus,
	sanitizeDiscordId,
	validateQueryFilters,
};
