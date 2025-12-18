const repository = require('@xquare/domain/setting/repository/settingRepository');
const ValidationError = require('@xquare/global/utils/errors/ValidationError');

function isPlainObject(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeDeep(base, patch) {
	const result = { ...(base || {}) };
	for (const [key, patchValue] of Object.entries(patch || {})) {
		const baseValue = result[key];
		if (isPlainObject(baseValue) && isPlainObject(patchValue)) {
			result[key] = mergeDeep(baseValue, patchValue);
		} else {
			result[key] = patchValue;
		}
	}
	return result;
}

async function getSetting(scope, scopeId, domain, key) {
	const doc = await repository.findSetting(scope, scopeId, domain, key);
	if (!doc) {
		throw new ValidationError(`Setting not configured for domain=${domain}, key=${key}`);
	}
	return doc.values || {};
}

async function updateSetting(scope, scopeId, domain, key, values, updatedBy) {
	const existing = await repository.findSetting(scope, scopeId, domain, key);
	const mergedValues = mergeDeep(existing?.values || {}, values || {});
	const updated = await repository.upsertSetting(scope, scopeId, domain, key, mergedValues, updatedBy);
	return updated.values || {};
}

module.exports = {
	getSetting,
	updateSetting,
};
