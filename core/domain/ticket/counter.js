const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema({
	_id: { type: String, required: true },
	sequence: { type: Number, default: 0 },
});

const Counter = mongoose.model('tbl_counter', counterSchema);

module.exports = Counter;
