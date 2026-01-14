class BaseError extends Error {
	constructor(name, message, options = {}) {
		super(message);
		this.name = name;
		this.userMessage = options.userMessage;
		this.logLevel = options.logLevel || 'error';
		this.metadata = options.metadata;
		this.expose = options.expose || false;
		this.logMessage = options.logMessage;
	}
}

module.exports = BaseError;
