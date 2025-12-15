const BaseError = require('./BaseError');

class ExternalServiceError extends BaseError {
	constructor(message = 'External service error', options = {}) {
		super('ExternalServiceError', message, { ...options, logLevel: 'error', expose: false });
	}
}

module.exports = ExternalServiceError;
