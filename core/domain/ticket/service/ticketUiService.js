const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const { t } = require('@xquare/global/i18n');

const TEXT = {
	publishPrompt: t('ticket.ui.publishPrompt'),
	missingChannel: t('ticket.ui.missingChannel'),
	channelNotFound: t('ticket.ui.channelNotFound'),
	buttonLabel: t('ticket.ui.buttonLabel'),
};

const buildCategoryButton = () => new ActionRowBuilder().addComponents(
	new ButtonBuilder()
		.setCustomId('ticket:category-button')
		.setLabel(TEXT.buttonLabel)
		.setStyle(ButtonStyle.Primary)
);

async function publishTicketUi(guild, actor) {
	const settings = await getSetting('guild', guild.id, 'ticket', 'ui');
	if (!settings.creationChannelId) throw new ValidationError(TEXT.missingChannel);

	const channel = guild.channels.cache.get(settings.creationChannelId)
		|| await guild.channels.fetch(settings.creationChannelId).catch(() => null);
	if (!channel) throw new ValidationError(TEXT.channelNotFound);

	const rawText = settings.uiMessage?.replace('{user}', `${actor}`) || TEXT.publishPrompt;
	const welcomeText = rawText.replace(/\\n/g, '\n');
	const components = [buildCategoryButton()];

	await channel.send({ content: welcomeText, components });
}

module.exports = { publishTicketUi };
