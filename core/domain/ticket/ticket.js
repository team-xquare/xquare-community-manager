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
	title: {
		type: String,
		default: '',
	},
	description: {
		type: String,
		default: '',
	},
	labels: {
		type: [String],
		default: [],
	},
	assignees: {
		type: [String],
		default: [],
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
		enum: ['open', 'in-progress', 'closed'],
		default: 'open',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	closedAt: {
		type: Date,
	},
	closedBy: {
		type: String,
	},
	closeScheduledAt: {
		type: Date,
		default: null,
	},
	closeScheduledBy: {
		type: String,
		default: null,
	},
	originalChannelName: {
		type: String,
		default: null,
	},
	summaryMessageId: {
		type: String,
		default: null,
	},
	welcomeText: {
		type: String,
		default: null,
	},
	lastActivityAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('tbl_ticket', ticketSchema);
