const ValidationError = require('@xquare/global/utils/errors/ValidationError');

const ERROR = {
	notString: field => `${field} must be a string`,
	tooLong: (field, max) => `${field} must not exceed ${max} characters`,
	labelTooLong: max => `Each label must not exceed ${max} characters`,
	labelsTooMany: max => `Labels must not exceed ${max} items`,
	labelInvalid: label => `Label "${label}" contains invalid characters`,
	statusNotString: 'Status must be a string',
	statusInvalid: valid => `Status must be one of: ${valid.join(', ')}`,
	idNotString: field => `${field} must be a string`,
	idInvalid: field => `${field} must be a valid Discord ID`,
	labelNotString: 'Label must be a string',
};

const DEFAULTS = {
	stringMax: 500,
	labelsMax: 10,
	labelLength: 50,
	statusList: ['open', 'in-progress', 'closed', 'closing'],
	discordId: /^\d{17,20}$/,
	labelPattern: /^[a-zA-Z0-9가-힣\s\-_]+$/,
};

const ensureString = (value, fieldName) => {
	if (value === null || value === undefined) return '';
	if (typeof value !== 'string') throw new ValidationError(ERROR.notString(fieldName));
	return value;
};

function sanitizeString(value, fieldName = 'Field', maxLength = DEFAULTS.stringMax) {
	const raw = ensureString(value, fieldName);
	if (raw.length > maxLength) throw new ValidationError(ERROR.tooLong(fieldName, maxLength));
	return raw.trim();
}

function sanitizeLabels(labelsString, maxLabels = DEFAULTS.labelsMax, maxLabelLength = DEFAULTS.labelLength) {
	if (!labelsString || typeof labelsString !== 'string') return [];

	const rawLabels = labelsString
		.split(',')
		.map(label => label.trim())
		.filter(Boolean);

	if (rawLabels.length > maxLabels) throw new ValidationError(ERROR.labelsTooMany(maxLabels));

	const labels = rawLabels.slice(0, maxLabels);

	labels.forEach(label => {
		if (label.length > maxLabelLength) throw new ValidationError(ERROR.labelTooLong(maxLabelLength));
		if (!DEFAULTS.labelPattern.test(label)) throw new ValidationError(ERROR.labelInvalid(label));
	});

	return labels;
}

function sanitizeTicketStatus(status) {
	if (!status) return undefined;
	if (typeof status !== 'string') throw new ValidationError(ERROR.statusNotString);

	const normalizedStatus = status.toLowerCase().trim();
	if (!DEFAULTS.statusList.includes(normalizedStatus)) throw new ValidationError(ERROR.statusInvalid(DEFAULTS.statusList));
	return normalizedStatus;
}

function sanitizeDiscordId(id, fieldName = 'ID') {
	if (!id) return undefined;
	if (typeof id !== 'string') throw new ValidationError(ERROR.idNotString(fieldName));
	if (!DEFAULTS.discordId.test(id)) throw new ValidationError(ERROR.idInvalid(fieldName));
	return id;
}

function validateQueryFilters(filters) {
	const sanitized = {};
	if (filters.guildId) sanitized.guildId = sanitizeDiscordId(filters.guildId, 'Guild ID');
	if (filters.status) sanitized.status = sanitizeTicketStatus(filters.status);
	if (filters.label) {
		if (typeof filters.label !== 'string') throw new ValidationError(ERROR.labelNotString);
		sanitized.label = sanitizeString(filters.label, 'Label', DEFAULTS.labelLength);
	}
	if (filters.assignee) sanitized.assignee = sanitizeDiscordId(filters.assignee, 'Assignee ID');
	return sanitized;
}

module.exports = {
	sanitizeString,
	sanitizeLabels,
	sanitizeTicketStatus,
	sanitizeDiscordId,
	validateQueryFilters,
};
