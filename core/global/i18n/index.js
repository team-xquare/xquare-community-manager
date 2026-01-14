const ko = require('./ko');

const DEFAULT_LOCALE = 'ko';
const messages = { ko };

function getMessage(locale, path) {
	if (!path) return undefined;
	const source = messages[locale] || messages[DEFAULT_LOCALE];
	return path.split('.').reduce((current, key) => {
		if (!current || typeof current !== 'object') return undefined;
		return current[key];
	}, source);
}

function t(path, params = {}, locale = DEFAULT_LOCALE) {
	const template = getMessage(locale, path);
	if (typeof template !== 'string') return path;
	return Object.entries(params).reduce((result, [key, value]) => {
		const token = new RegExp(`\\{${key}\\}`, 'g');
		return result.replace(token, String(value));
	}, template);
}

module.exports = {
	DEFAULT_LOCALE,
	messages,
	t,
};
