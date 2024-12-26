import axios from 'axios';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function httpMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] ${message}`));
	};
	try {
		const response = await axios.get(site.url);
		if (response.status !== 200) {
			logStatus(
				`HTTP Check failed: Status ${response.status}`,
				'fail'
			);
			if (!config.testMode) {
				logStatus('Taking action: create or update incident', 'fail');
				await incidentManager.createOrUpdateIncident(
					'http-status',
					`${site.name} is down!`,
					`Received HTTP status ${response.status}`,
					'major',
					site
				);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would create or update incident: http-status'
					)
				);
			}
		} else {
			logStatus(
				`HTTP Check successful`,
				'success'
			);
			if (!config.testMode) {
				logStatus('Taking action: resolve incident if existing', 'success');
				await incidentManager.resolveIncidentIfExisting('http-status', site);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would resolve incident if existing: http-status'
					)
				);
			}
		}
	} catch (error) {
		logStatus(`HTTP Check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			logStatus('Taking action: create or update incident', 'fail');
			await incidentManager.createOrUpdateIncident(
				'http-status',
				`${site.name} is down!`,
				error.message,
				'major',
				site
			);
		} else {
			console.log(
				chalk.yellow(
					'  [TEST MODE] Would create or update incident: http-status'
				)
			);
		}
	}
}

export default httpMonitor;