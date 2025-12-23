const { ChannelType } = require('discord.js');

export async function getOrCreateCategory(guild, categoryName) {
	await guild.channels.fetch();
	const category = guild.channels.cache.find(channel =>
		channel.type === ChannelType.GuildCategory
		  && channel.name.toLowerCase() === categoryName
	);

	if (category) {
		return category;
	}

	return guild.channels.create({
		name: categoryName,
		type: ChannelType.GuildCategory,
	});
}
