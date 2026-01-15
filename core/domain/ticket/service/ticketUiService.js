const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { getSetting } = require('@xquare/domain/setting/service/settingService');
const { getCategoryChoices } = require('@xquare/domain/ticket/categories');
const { t } = require('@xquare/global/i18n');

const TEXT = {
	publishPrompt: t('ticket.ui.publishPrompt'),
	missingChannel: t('ticket.ui.missingChannel'),
	channelNotFound: t('ticket.ui.channelNotFound'),
	selectPlaceholder: '이슈 종류를 선택해주세요',
};

const buildCategorySelectMenu = () => {
	const choices = getCategoryChoices();
	return new ActionRowBuilder().addComponents(
		new StringSelectMenuBuilder()
			.setCustomId('ticket:category-select')
			.setPlaceholder(TEXT.selectPlaceholder)
			.addOptions(choices)
	);
};

async function publishTicketUi(guild, actor) {
	const settings = await getSetting('guild', guild.id, 'ticket', 'ui');
	if (!settings.creationChannelId) throw new ValidationError(TEXT.missingChannel);

	const channel = guild.channels.cache.get(settings.creationChannelId)
		|| await guild.channels.fetch(settings.creationChannelId).catch(() => null);
	if (!channel) throw new ValidationError(TEXT.channelNotFound);

	const rawText = settings.uiMessage?.replace('{user}', `${actor}`) || TEXT.publishPrompt;
	const welcomeText = rawText.replace(/\\n/g, '\n');
	const components = [buildCategorySelectMenu()];

	await channel.send({ content: welcomeText, components });
}

module.exports = { publishTicketUi };
