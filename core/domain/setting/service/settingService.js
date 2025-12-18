const repository = require('@xquare/domain/setting/repository/settingRepository');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');

async function getSetting(scope, scopeId, domain, key) {
	const doc = await repository.findSetting(scope, scopeId, domain, key);
	if (!doc) {
		throw new ValidationError(`Setting not configured for domain=${domain}, key=${key}`);
	}
	return doc.values || {};
}

async function updateSetting(scope, scopeId, domain, key, values, updatedBy) {
	const updated = await repository.upsertSetting(scope, scopeId, domain, key, values, updatedBy);
	return updated.values || {};
}

module.exports = {
	getSetting,
	updateSetting,
};
