import { promises as dns } from 'dns';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function dnsMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] [DNS] ${message}`));
	};
	try {
		const addresses = await dns.resolve(site.dnsConfig.host, site.dnsConfig.recordType);

		if (!addresses.includes(site.dnsConfig.expectedValue)) {
			logStatus(`DNS Check failed`, 'fail');
			if (!config.testMode) {
				await incidentManager.createOrUpdateIncident(
					'dns-resolution',
					`${site.name} DNS resolution error!`,
					`DNS resolution issue detected.`,
					'disrupted',
					site
				);
			} else {
				console.log(
					chalk.yellow('  [TEST MODE] Would create or update incident: dns-resolution')
				);
			}
		} else {
			logStatus(`DNS Check successful`, 'success');
			if (!config.testMode) {
				await incidentManager.resolveIncidentIfExisting('dns-resolution', site);
			} else {
				console.log(
					chalk.yellow('  [TEST MODE] Would resolve incident if existing: dns-resolution')
				);
			}
		}
	} catch (error) {
		logStatus(`DNS Check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			await incidentManager.createOrUpdateIncident(
				'dns-resolution',
				`${site.name} DNS resolution error!`,
				`DNS Check failed: ${error.message}`,
				'disrupted',
				site
			);
		} else {
			console.log(
				chalk.yellow('  [TEST MODE] Would create or update incident: dns-resolution')
			);
		}
	}
}

export default dnsMonitor;