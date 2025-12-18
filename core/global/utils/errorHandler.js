const { MessageFlags } = require('discord.js');
const policies = require('@xquare/global/configs/errorPolicies');
const UnexpectedError = require('./errors/UnexpectedError');
const logger = require('@xquare/global/utils/loggers/logger');

function resolvePolicy(err) {
	if (policies[err.name]) return policies[err.name];
	return policies.UnexpectedError;
}

function buildUserMessage(err, policy) {
	if (err.expose && err.userMessage) return err.userMessage;
	if (policy.expose && err.userMessage) return err.userMessage;
	return policy.userMessage || '오류가 발생했습니다.';
}

async function replySafe(target, content) {
	try {
		if (!target) return;
		if (target.replied || target.deferred) {
			await target.followUp({ content, flags: MessageFlags.Ephemeral });
		} else {
			await target.reply({ content, flags: MessageFlags.Ephemeral });
		}
	} catch (replyError) {
		logger.error(`Failed to send error reply: ${replyError}`);
	}
}

async function handleError(err, context = {}) {
	const { interaction, message } = context;
	const policy = resolvePolicy(err);
	const safeMessage = buildUserMessage(err, policy);

	const logPayload = {
		message: err.logMessage || err.message,
		metadata: err.metadata || {},
		stack: err.stack,
	};

	const logFn = logger[policy.logLevel] || logger.error;
	logFn(logPayload);

	if (interaction) {
		await replySafe(interaction, safeMessage);
		return;
	}

	if (message && message.reply) {
		await replySafe(message, safeMessage);
	}
}

function wrapUnexpected(err) {
	if (err.name && policies[err.name]) return err;
	return new UnexpectedError(err.message, { metadata: { originalName: err.name } });
}

module.exports = {
	handleError,
	wrapUnexpected,
};
