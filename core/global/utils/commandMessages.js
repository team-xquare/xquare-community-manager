const { FLAGS } = require('@xquare/global/utils/commandFlags');
const { LIMITS } = require('@xquare/global/utils/commandLimits');

const splitLongLine = (line, maxLength) => {
	if (line.length <= maxLength) return [line];
	const parts = [];
	for (let index = 0; index < line.length; index += maxLength) {
		parts.push(line.slice(index, index + maxLength));
	}
	return parts;
};

const chunkLines = (lines, maxLength) => {
	const chunks = [];
	let current = '';
	lines.forEach(line => {
		splitLongLine(line, maxLength).forEach(part => {
			const next = current ? `${current}\n${part}` : part;
			if (next.length <= maxLength) return current = next;
			if (current) chunks.push(current);
			current = part;
		});
	});
	if (current) chunks.push(current);
	return chunks;
};

const sendLines = async (interaction, lines, emptyMessage) => {
	const chunks = chunkLines(lines, LIMITS.messageMax);
	const [first, ...rest] = chunks;
	if (!first) return interaction.editReply({ content: emptyMessage });
	await interaction.editReply({ content: first });
	for (const chunk of rest) await interaction.followUp({ content: chunk, ...FLAGS });
};

module.exports = { sendLines };
