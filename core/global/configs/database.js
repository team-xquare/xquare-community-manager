const mongoose = require('mongoose');
const logger = require('@xquare/global/utils/loggers/logger');

async function connectDB() {
	try {
		await mongoose.connect(process.env.MONGODB_URI);
		logger.info('MongoDB connected successfully');
	} catch (error) {
		logger.error(`MongoDB connection error: ${error}`);
		process.exit(1);
	}
}

module.exports = connectDB;
