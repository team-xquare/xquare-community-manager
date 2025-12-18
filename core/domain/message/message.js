const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
	ticketId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'tbl_ticket',
		required: true,
		index: true,
	},
	channelId: {
		type: String,
		required: true,
		index: true,
	},
	messageId: {
		type: String,
		required: true,
		unique: true,
	},
	authorId: {
		type: String,
		required: true,
	},
	authorName: {
		type: String,
		required: true,
	},
	content: {
		type: String,
		default: '',
	},
	timestamp: {
		type: Date,
		default: Date.now,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('tbl_messages', messageSchema);
