const Counter = require('@xquare/domain/ticket/counter');
const logger = require('@xquare/global/utils/loggers/logger');

const MIGRATION_ID = 'ticketCounterMigration';
const MIGRATION_VERSION = 1;

const LOG = {
	migrationCheck: 'Checking migration status',
	migrationNeeded: version => `Migration needed: version ${version}`,
	migrationSkipped: 'Migration already completed',
	migrationCompleted: version => `Migration completed: version ${version}`,
	migrationFailed: 'Migration failed',
};

async function getMigrationStatus() {
	const migration = await Counter.findById(MIGRATION_ID).lean();
	return migration?.sequence || 0;
}

async function setMigrationStatus(version) {
	await Counter.updateOne(
		{ _id: MIGRATION_ID },
		{ $set: { sequence: version } },
		{ upsert: true }
	);
}

async function runMigrationOnce(migrationFn, version = MIGRATION_VERSION) {
	try {
		logger.info(LOG.migrationCheck);
		const currentVersion = await getMigrationStatus();

		if (currentVersion >= version) {
			logger.info(LOG.migrationSkipped);
			return false;
		}

		logger.info(LOG.migrationNeeded(version));
		await migrationFn();
		await setMigrationStatus(version);
		logger.info(LOG.migrationCompleted(version));
		return true;
	} catch (error) {
		logger.error(LOG.migrationFailed, { error });
		throw error;
	}
}

module.exports = {
	runMigrationOnce,
	getMigrationStatus,
};
