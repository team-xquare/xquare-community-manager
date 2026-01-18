const Counter = require('@xquare/domain/ticket/counter');
const logger = require('@xquare/global/utils/loggers/logger');

const DEFAULT_MIGRATION_ID = 'ticketCounterMigration';
const DEFAULT_MIGRATION_VERSION = 1;

const LOG = {
	migrationCheck: 'Checking migration status',
	migrationNeeded: version => `Migration needed: version ${version}`,
	migrationSkipped: 'Migration already completed',
	migrationCompleted: version => `Migration completed: version ${version}`,
	migrationFailed: 'Migration failed',
};

async function getMigrationStatus(migrationId = DEFAULT_MIGRATION_ID) {
	const migration = await Counter.findById(migrationId).lean();
	return migration?.sequence || 0;
}

async function setMigrationStatus(migrationId, version) {
	await Counter.updateOne(
		{ _id: migrationId },
		{ $set: { sequence: version } },
		{ upsert: true }
	);
}

async function runMigrationOnce(migrationFn, options = {}) {
	const migrationId = options.id || DEFAULT_MIGRATION_ID;
	const version = options.version ?? DEFAULT_MIGRATION_VERSION;
	try {
		logger.info(LOG.migrationCheck);
		const currentVersion = await getMigrationStatus(migrationId);

		if (currentVersion >= version) {
			logger.info(LOG.migrationSkipped);
			return false;
		}

		logger.info(LOG.migrationNeeded(version));
		await migrationFn();
		await setMigrationStatus(migrationId, version);
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
