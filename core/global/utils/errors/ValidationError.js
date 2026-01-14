const BaseError = require('./BaseError');

const DEFAULT_MESSAGE = 'Validation failed';

class ValidationError extends BaseError {
	constructor(message = DEFAULT_MESSAGE, options = {}) {
		super('ValidationError', message, { ...options, logLevel: 'warn', expose: true });
	}
}

module.exports = ValidationError;
