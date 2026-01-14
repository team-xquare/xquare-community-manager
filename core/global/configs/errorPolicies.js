const { t } = require('@xquare/global/i18n');

const USER_MESSAGES = {
	validation: t('errors.validation'),
	notFound: t('errors.notFound'),
	conflict: t('errors.conflict'),
	external: t('errors.external'),
	unexpected: t('errors.unexpected'),
};

const LOG_MESSAGES = {
	validation: 'Validation error',
	notFound: 'Resource not found',
	conflict: 'Conflict error',
	external: 'External service error',
	unexpected: 'Unexpected error',
};

const policies = {
	ValidationError: {
		logLevel: 'warn',
		userMessage: USER_MESSAGES.validation,
		logMessage: LOG_MESSAGES.validation,
		expose: true,
	},
	NotFoundError: {
		logLevel: 'warn',
		userMessage: USER_MESSAGES.notFound,
		logMessage: LOG_MESSAGES.notFound,
		expose: true,
	},
	ConflictError: {
		logLevel: 'warn',
		userMessage: USER_MESSAGES.conflict,
		logMessage: LOG_MESSAGES.conflict,
		expose: true,
	},
	ExternalServiceError: {
		logLevel: 'error',
		userMessage: USER_MESSAGES.external,
		logMessage: LOG_MESSAGES.external,
		expose: false,
	},
	UnexpectedError: {
		logLevel: 'error',
		userMessage: USER_MESSAGES.unexpected,
		logMessage: LOG_MESSAGES.unexpected,
		expose: false,
	},
};

module.exports = policies;
