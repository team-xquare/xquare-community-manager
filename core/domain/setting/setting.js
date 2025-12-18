const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema({
	scope: {
		type: String,
		enum: ['global', 'guild', 'user'],
		default: 'guild',
	},
	scopeId: {
		type: String,
		default: null,
	},
	domain: {
		type: String,
		required: true,
	},
	key: {
		type: String,
		required: true,
	},
	values: {
		type: mongoose.Schema.Types.Mixed,
		default: {},
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
	updatedBy: String,
});

settingSchema.index({ scope: 1, scopeId: 1, domain: 1, key: 1 }, { unique: true });

module.exports = mongoose.model('tbl_setting', settingSchema);
