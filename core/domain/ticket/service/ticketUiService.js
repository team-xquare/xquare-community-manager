const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const { t } = require('@xquare/global/i18n');

function buildCreateButton(label) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('ticket:open')
			.setLabel(label || t('ticket.ui.buttonLabel'))
			.setStyle(ButtonStyle.Primary)
	);
}

async function publishTicketUi(guild, actor) {
	const settings = await getSetting('guild', guild.id, 'ticket', 'ui');
	if (!settings.creationChannelId) {
		throw new ValidationError(t('ticket.ui.missingChannel'));
	}

	const channel = guild.channels.cache.get(settings.creationChannelId)
		|| await guild.channels.fetch(settings.creationChannelId).catch(() => null);

	if (!channel) {
		throw new ValidationError(t('ticket.ui.channelNotFound'));
	}

	const rawWelcomeText = settings.uiMessage
		?.replace('{user}', `${actor}`)
		|| t('ticket.ui.publishPrompt');
	const welcomeText = rawWelcomeText.replace(/\\n/g, '\n');

	const buttonLabel = settings.buttonLabels?.create || t('ticket.defaults.buttonLabel');
	const components = [buildCreateButton(buttonLabel)];

	await channel.send({
		content: welcomeText,
		components,
	});
}

module.exports = {
	publishTicketUi,
};
