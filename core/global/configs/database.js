const mongoose = require('mongoose');
const logger = require('@xquare/global/utils/loggers/logger');

const LOG = {
	connected: 'MongoDB connected',
	connectionError: 'MongoDB connection error',
	disconnected: 'MongoDB disconnected',
	reconnected: 'MongoDB reconnected',
};

async function connectDB() {
	try {
		await mongoose.connect(process.env.MONGODB_URI, {
			serverSelectionTimeoutMS: 5000,
			socketTimeoutMS: 45000,
			family: 4,
		});
		logger.info(LOG.connected);

		mongoose.connection.on('error', err => logger.error(LOG.connectionError, { error: err }));
		mongoose.connection.on('disconnected', () => logger.warn(LOG.disconnected));
		mongoose.connection.on('reconnected', () => logger.info(LOG.reconnected));
	} catch (error) {
		logger.error(LOG.connectionError, { error });
		process.exit(1);
	}
}

module.exports = connectDB;
