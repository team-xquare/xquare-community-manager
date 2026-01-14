const { MessageFlags } = require('discord.js');
const policies = require('@xquare/global/configs/errorPolicies');
const UnexpectedError = require('./errors/UnexpectedError');
const logger = require('@xquare/global/utils/loggers/logger');
const { t } = require('@xquare/global/i18n');

const LOG = {
	replyFailed: 'Failed to send error reply',
	defaultError: 'Unhandled error',
};

const resolvePolicy = err => policies[err?.name] || policies.UnexpectedError;

function buildUserMessage(err, policy, overrideMessage) {
	if (overrideMessage) return overrideMessage;
	if (err?.expose && err.userMessage) return err.userMessage;
	if (policy?.expose && err?.userMessage) return err.userMessage;
	return policy?.userMessage || t('errors.generic');
}

async function replySafe(target, content) {
	try {
		if (!target) return;
		if (target.deferred && !target.replied) return target.editReply({ content, flags: MessageFlags.Ephemeral });
		if (target.replied) return target.followUp({ content, flags: MessageFlags.Ephemeral });
		return target.reply({ content, flags: MessageFlags.Ephemeral });
	} catch (replyError) {
		logger.error(LOG.replyFailed, { error: replyError });
	}
}

async function handleError(err, context = {}) {
	const { interaction, message, userMessage } = context;
	const policy = resolvePolicy(err);
	const safeMessage = buildUserMessage(err, policy, userMessage);
	const logMessage = err?.logMessage || policy?.logMessage || err?.name || LOG.defaultError;

	const logPayload = {
		message: logMessage,
		errorMessage: err?.message,
		metadata: err?.metadata || {},
		stack: err?.stack,
	};

	const logFn = logger[policy?.logLevel] || logger.error;
	logFn(logPayload);

	if (interaction) return replySafe(interaction, safeMessage);
	if (message?.reply) return replySafe(message, safeMessage);
}

function wrapUnexpected(err) {
	if (err?.name && policies[err.name]) return err;
	const message = err?.message || String(err);
	const wrapped = new UnexpectedError(message, {
		metadata: {
			originalName: err?.name,
			originalStack: err?.stack,
		},
		logMessage: policies.UnexpectedError?.logMessage || 'UnexpectedError',
	});
	if (err?.stack) {
		wrapped.stack = err.stack;
	}
	return wrapped;
}

module.exports = {
	handleError,
	wrapUnexpected,
};
