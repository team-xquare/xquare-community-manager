const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
	ticketNumber: {
		type: Number,
		required: true,
		unique: true,
	},
	channelId: {
		type: String,
		required: true,
	},
	userId: {
		type: String,
		required: true,
	},
	username: {
		type: String,
		required: true,
	},
	guildId: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		enum: ['open', 'closed'],
		default: 'open',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	closedAt: {
		type: Date,
	},
});

module.exports = mongoose.model('tbl_ticket', ticketSchema);
