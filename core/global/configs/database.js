const mongoose = require('mongoose');
const logger = require('@xquare/global/utils/loggers/logger');

async function connectDB() {
	try {
		await mongoose.connect(process.env.MONGODB_URI, {
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
			family: 4,
		});
		logger.info('MongoDB connected successfully');

		mongoose.connection.on('error', (err) => {
			logger.error('MongoDB connection error', { error: err });
		});

		mongoose.connection.on('disconnected', () => {
			logger.warn('MongoDB disconnected');
		});

		mongoose.connection.on('reconnected', () => {
			logger.info('MongoDB reconnected');
		});
	} catch (error) {
		logger.error('MongoDB connection error', { error });
		process.exit(1);
	}
}

module.exports = connectDB;
