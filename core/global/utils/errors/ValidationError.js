const BaseError = require('./BaseError');

class ValidationError extends BaseError {
	constructor(message = 'Validation failed', options = {}) {
		super('ValidationError', message, { ...options, logLevel: 'warn', expose: true });
	}
}

module.exports = ValidationError;
