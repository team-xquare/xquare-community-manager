const BaseError = require('./BaseError');

class ConflictError extends BaseError {
	constructor(message = 'Conflict occurred', options = {}) {
		super('ConflictError', message, { ...options, logLevel: 'warn', expose: true });
	}
}

module.exports = ConflictError;
