const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const { t } = require('@xquare/global/i18n');

const TEXT = {
	buttonLabel: t('ticket.ui.buttonLabel'),
	publishPrompt: t('ticket.ui.publishPrompt'),
	missingChannel: t('ticket.ui.missingChannel'),
	channelNotFound: t('ticket.ui.channelNotFound'),
	defaultButtonLabel: t('ticket.defaults.buttonLabel'),
};

const buildCreateButton = label => new ActionRowBuilder().addComponents(
	new ButtonBuilder().setCustomId('ticket:open').setLabel(label || TEXT.buttonLabel).setStyle(ButtonStyle.Primary)
);

async function publishTicketUi(guild, actor) {
	const settings = await getSetting('guild', guild.id, 'ticket', 'ui');
	if (!settings.creationChannelId) throw new ValidationError(TEXT.missingChannel);

	const channel = guild.channels.cache.get(settings.creationChannelId)
		|| await guild.channels.fetch(settings.creationChannelId).catch(() => null);
	if (!channel) throw new ValidationError(TEXT.channelNotFound);

	const rawText = settings.uiMessage?.replace('{user}', `${actor}`) || TEXT.publishPrompt;
	const welcomeText = rawText.replace(/\\n/g, '\n');
	const buttonLabel = settings.buttonLabels?.create || TEXT.defaultButtonLabel;
	const components = [buildCreateButton(buttonLabel)];

	await channel.send({ content: welcomeText, components });
}

module.exports = { publishTicketUi };
