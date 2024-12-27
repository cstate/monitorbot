import axios from 'axios';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function httpMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] [HTTP] ${message}`));
	};

	try {
		const response = await axios.request({
			method: site.method || 'GET',
			url: site.url,
			maxRedirects: site.followRedirect ? 5 : 0, // Default to 5 if followRedirect is true
			validateStatus: (status) => status < 500, // Consider all HTTP status codes below 500 valid, so we can check against expected status
		});

		if (response.status === (site.expectStatus || 200)) {
			logStatus('HTTP Check successful', 'success');
			if (!config.testMode) {
				await incidentManager.resolveIncidentIfExisting('http-status', site);
			}
		} else {
			logStatus(
				`HTTP Check failed: Status ${response.status}`,
				'fail'
			);
			if (!config.testMode) {
				await incidentManager.createOrUpdateIncident(
					'http-status',
					`${site.name} is down!`,
					`HTTP Check failed: Status ${response.status}`,
					'disrupted',
					site
				);
			}
		}
	} catch (error) {
		logStatus(`HTTP Check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			await incidentManager.createOrUpdateIncident(
				'http-status',
				`${site.name} is down!`,
				`HTTP Check failed: ${error.message}`,
				'disrupted',
				site
			);
		}
	}
}

export default httpMonitor;