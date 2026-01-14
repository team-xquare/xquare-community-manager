const { t } = require('@xquare/global/i18n');

const policies = {
	ValidationError: {
		logLevel: 'warn',
		userMessage: t('errors.validation'),
		expose: true,
	},
	NotFoundError: {
		logLevel: 'warn',
		userMessage: t('errors.notFound'),
		expose: true,
	},
	ConflictError: {
		logLevel: 'warn',
		userMessage: t('errors.conflict'),
		expose: true,
	},
	ExternalServiceError: {
		logLevel: 'error',
		userMessage: t('errors.external'),
		expose: false,
	},
	UnexpectedError: {
		logLevel: 'error',
		userMessage: t('errors.unexpected'),
		expose: false,
	},
};

module.exports = policies;
