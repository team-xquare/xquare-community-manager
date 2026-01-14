const BaseError = require('./BaseError');

const DEFAULT_MESSAGE = 'Conflict occurred';

class ConflictError extends BaseError {
	constructor(message = DEFAULT_MESSAGE, options = {}) {
		super('ConflictError', message, { ...options, logLevel: 'warn', expose: true });
	}
}

module.exports = ConflictError;
