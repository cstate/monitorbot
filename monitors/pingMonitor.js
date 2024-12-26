import ping from 'ping';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function pingMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] ${message}`));
	};
	try {
		const result = await ping.promise.probe(site.url.replace(/https?:\/\//, ''), {
			timeout: config.pingMonitor.timeout,
		});

		if (!result.alive) {
			logStatus(`Ping Check failed: Host unreachable`, 'fail');
			if (!config.testMode) {
				logStatus('Taking action: create or update incident', 'fail');
				await incidentManager.createOrUpdateIncident(
					'ping-error',
					`${site.name} is unreachable (ping)!`,
					'Host unreachable',
					'major',
					site
				);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would create or update incident: ping-error'
					)
				);
			}
		} else {
			logStatus(`Ping Check successful: RTT ${result.time}ms`, 'success');
			if (!config.testMode) {
				logStatus('Taking action: resolve incident if existing', 'success');
				await incidentManager.resolveIncidentIfExisting('ping-error', site);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would resolve incident if existing: ping-error'
					)
				);
			}
		}
	} catch (error) {
		logStatus(`Ping Check failed: ${error}`, 'fail');
		if (!config.testMode) {
			logStatus('Taking action: create or update incident', 'fail');
			await incidentManager.createOrUpdateIncident(
				'ping-error',
				`${site.name} is unreachable (ping)!`,
				error.toString(),
				'major',
				site
			);
		} else {
			console.log(
				chalk.yellow(
					'  [TEST MODE] Would create or update incident: ping-error'
				)
			);
		}
	}
}

export default pingMonitor;