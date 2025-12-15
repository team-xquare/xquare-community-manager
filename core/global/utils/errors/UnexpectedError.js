const BaseError = require('./BaseError');

class UnexpectedError extends BaseError {
	constructor(message = 'Unexpected error', options = {}) {
		super('UnexpectedError', message, { ...options, logLevel: 'error', expose: false });
	}
}

module.exports = UnexpectedError;
