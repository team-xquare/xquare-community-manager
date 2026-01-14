const BaseError = require('./BaseError');

const DEFAULT_MESSAGE = 'Unexpected error';

class UnexpectedError extends BaseError {
	constructor(message = DEFAULT_MESSAGE, options = {}) {
		super('UnexpectedError', message, { ...options, logLevel: 'error', expose: false });
	}
}

module.exports = UnexpectedError;
