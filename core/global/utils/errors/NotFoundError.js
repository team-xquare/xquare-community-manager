const BaseError = require('./BaseError');

const DEFAULT_MESSAGE = 'Resource not found';

class NotFoundError extends BaseError {
	constructor(message = DEFAULT_MESSAGE, options = {}) {
		super('NotFoundError', message, { ...options, logLevel: 'warn', expose: true });
	}
}

module.exports = NotFoundError;
