import axios from 'axios';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function apiMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] [API] ${message}`));
	};

	try {
		const response = await axios.get(site.apiUrl, {
			headers: site.apiHeaders, // e.g., for authentication tokens
		});

		if (response.status === 200 && response.data.someExpectedField) { // Check for status and specific data
			logStatus('API check successful', 'success');
			if (!config.testMode) {
				await incidentManager.resolveIncidentIfExisting('api-error', site);
			}
		} else {
			logStatus(`API check failed: Unexpected response`, 'fail');
			if (!config.testMode) {
				await incidentManager.createOrUpdateIncident(
					'api-error',
					`${site.name} API error!`,
					`API check failed: Unexpected response`,
					'disrupted',
					site
				);
			}
		}
	} catch (error) {
		logStatus(`API check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			await incidentManager.createOrUpdateIncident(
				'api-error',
				`${site.name} API error!`,
				`API check failed: ${error.message}`,
				'disrupted',
				site
			);
		}
	}
}

export default apiMonitor;