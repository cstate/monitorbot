import { promises as dns } from 'dns'; // Use promises-based version
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function dnsMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] ${message}`));
	};
	try {
		const addresses = await dns.resolve(site.dnsConfig.host, site.dnsConfig.recordType);

		if (!addresses.includes(site.dnsConfig.expectedValue)) {
			logStatus(
				`DNS Check failed: Expected ${site.dnsConfig.expectedValue}, got ${addresses}`,
				'fail'
			);
			if (!config.testMode) {
				logStatus('Taking action: create or update incident', 'fail');
				await incidentManager.createOrUpdateIncident(
					'dns-error',
					`${site.name} DNS resolution error!`,
					`Expected ${site.dnsConfig.expectedValue}, got ${addresses}`,
					'major',
					site
				);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would create or update incident: dns-error'
					)
				);
			}
		} else {
			logStatus(`DNS Check successful`, 'success');
			if (!config.testMode) {
				logStatus('Taking action: resolve incident if existing', 'success');
				await incidentManager.resolveIncidentIfExisting('dns-error', site);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would resolve incident if existing: dns-error'
					)
				);
			}
		}
	} catch (error) {
		logStatus(`DNS Check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			logStatus('Taking action: create or update incident', 'fail');
			await incidentManager.createOrUpdateIncident(
				'dns-error',
				`${site.name} DNS resolution error!`,
				error.message,
				'major',
				site
			);
		} else {
			console.log(
				chalk.yellow(
					'  [TEST MODE] Would create or update incident: dns-error'
				)
			);
		}
	}
}

export default dnsMonitor;