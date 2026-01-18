const { PermissionFlagsBits } = require('discord.js');
const { FLAGS } = require('@xquare/global/utils/commandFlags');

const hasAdminPermission = interaction => interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild);

const ensureAdmin = async (interaction, message) => {
	if (hasAdminPermission(interaction)) return true;
	await interaction.reply({ content: message, ...FLAGS }).catch(() => null);
	return false;
};

module.exports = { ensureAdmin };
