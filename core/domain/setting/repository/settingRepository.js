const Setting = require('../setting');

async function findSetting(scope, scopeId, domain, key) {
	return Setting.findOne({ scope, scopeId, domain, key });
}

async function upsertSetting(scope, scopeId, domain, key, values, updatedBy) {
	return Setting.findOneAndUpdate(
		{ scope, scopeId, domain, key },
		{
			$set: { values, updatedBy, updatedAt: new Date() },
			$setOnInsert: { scope, scopeId, domain, key },
		},
		{ new: true, upsert: true }
	);
}

module.exports = {
	findSetting,
	upsertSetting,
};
