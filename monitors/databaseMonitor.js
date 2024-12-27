import pg from 'pg';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function databaseMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] [DATABASE] ${message}`));
	};
	const client = new pg.Client(site.databaseConfig);

	try {
		await client.connect();
		const result = await client.query('SELECT 1'); // Simple query to test connection

		if (result.rows.length > 0) {
			logStatus('Database check successful', 'success');
			if (!config.testMode) {
				await incidentManager.resolveIncidentIfExisting('database', site);
			}
		} else {
			logStatus('Database check failed: Empty result', 'fail');
			if (!config.testMode) {
				await incidentManager.createOrUpdateIncident(
					'database',
					`${site.name} database connection error!`,
					`Database check failed: Empty result`,
					'disrupted',
					site
				);
			}
		}
	} catch (error) {
		logStatus(`Database check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			await incidentManager.createOrUpdateIncident(
				'database',
				`${site.name} database connection error!`,
				`Database check failed: ${error.message}`,
				'disrupted',
				site
			);
		}
	} finally {
		await client.end();
	}
}

export default databaseMonitor;