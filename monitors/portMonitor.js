import net from 'net';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function portMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] ${message}`));
	};
	const client = new net.Socket();

	try {
		await new Promise((resolve, reject) => {
			client.connect(site.portConfig.port, site.url.replace(/https?:\/\//, ''), () => {
				logStatus(`Port Check successful`, 'success');
				resolve();
			});

			client.on('error', (error) => {
				logStatus(`Port Check failed: ${error.message}`, 'fail');
				reject(error);
			});

			client.setTimeout(config.portMonitor.timeout, () => {
				logStatus(`Port Check timed out`, 'fail');
				client.destroy(new Error('Timeout'));
			});
		});

		if (!config.testMode) {
			logStatus('Taking action: resolve incident if existing', 'success');
			await incidentManager.resolveIncidentIfExisting('port-connectivity', site);
		} else {
			console.log(
				chalk.yellow(
					'  [TEST MODE] Would resolve incident if existing: port-connectivity'
				)
			);
		}
	} catch (error) {
		if (!config.testMode) {
			logStatus('Taking action: create or update incident', 'fail');
			await incidentManager.createOrUpdateIncident(
				'port-connectivity',
				`${site.name} port connection error!`,
				`Port Check failed: ${error.message}`,
				'disrupted',
				site
			);
		} else {
			console.log(
				chalk.yellow(
					'  [TEST MODE] Would create or update incident: port-connectivity'
				)
			);
		}
	} finally {
		client.destroy();
	}
}

export default portMonitor;