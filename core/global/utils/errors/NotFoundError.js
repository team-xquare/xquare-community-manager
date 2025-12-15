const BaseError = require('./BaseError');

class NotFoundError extends BaseError {
	constructor(message = 'Resource not found', options = {}) {
		super('NotFoundError', message, { ...options, logLevel: 'warn', expose: true });
	}
}

module.exports = NotFoundError;
