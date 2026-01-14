const BaseError = require('./BaseError');

const DEFAULT_MESSAGE = 'External service error';

class ExternalServiceError extends BaseError {
	constructor(message = DEFAULT_MESSAGE, options = {}) {
		super('ExternalServiceError', message, { ...options, logLevel: 'error', expose: false });
	}
}

module.exports = ExternalServiceError;
