const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');
const { getSetting } = require('@xquare/domain/setting/service/settingService');

function buildCreateButton(label) {
	return new ActionRowBuilder().addComponents(
		new ButtonBuilder()
			.setCustomId('ticket:open')
			.setLabel(label || '티켓 생성')
			.setStyle(ButtonStyle.Primary)
	);
}

async function publishTicketUi(guild, actor) {
	const settings = await getSetting('guild', guild.id, 'ticket', 'ui');
	if (!settings.creationChannelId) {
		throw new ValidationError('티켓 생성 UI 채널이 설정되지 않았습니다. /ticket set creation_channel 로 설정해주세요.');
	}

	const channel = guild.channels.cache.get(settings.creationChannelId)
		|| await guild.channels.fetch(settings.creationChannelId).catch(() => null);

	if (!channel) {
		throw new ValidationError('설정된 생성 채널을 찾을 수 없습니다.');
	}

	const rawWelcomeText = settings.uiMessage
		?.replace('{user}', `${actor}`)
		|| '티켓을 생성하려면 아래 버튼을 눌러주세요.';
	const welcomeText = rawWelcomeText.replace(/\\n/g, '\n');

	const buttonLabel = settings.buttonLabels?.create || '티켓 생성';
	const components = [buildCreateButton(buttonLabel)];

	await channel.send({
		content: welcomeText,
		components,
	});
}

module.exports = {
	publishTicketUi,
};
