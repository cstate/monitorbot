import tls from 'tls';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function sslMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] ${message}`));
	};
	const options = {
		host: site.url.replace(/https?:\/\//, ''), // Remove protocol from hostname
		port: 443,
		servername: site.url.replace(/https?:\/\//, ''), // Ensure SNI is used
	};

	try {
		const socket = tls.connect(options, () => {
			const cert = socket.getPeerCertificate();
			const validTo = new Date(cert.valid_to);
			const daysUntilExpiration = Math.round((validTo - new Date()) / (1000 * 60 * 60 * 24));

			if (daysUntilExpiration < config.sslMonitor.expirationThresholdDays) {
				logStatus(
					`SSL Check failed: Certificate expires in ${daysUntilExpiration} days`,
					'fail'
				);
				if (!config.testMode) {
					logStatus('Taking action: create or update incident', 'fail');
					incidentManager.createOrUpdateIncident(
						'ssl-expiry',
						`${site.name} SSL certificate expiring soon!`,
						`Certificate expires in ${daysUntilExpiration} days`,
						'warning',
						site
					);
				} else {
					console.log(
						chalk.yellow(
							'  [TEST MODE] Would create or update incident: ssl-expiry'
						)
					);
				}
			} else {
				logStatus(`SSL Check successful`, 'success');
				if (!config.testMode) {
					logStatus('Taking action: resolve incident if existing', 'success');
					incidentManager.resolveIncidentIfExisting('ssl-expiry', site);
				} else {
					console.log(
						chalk.yellow(
							'  [TEST MODE] Would resolve incident if existing: ssl-expiry'
						)
					);
				}
			}

			socket.end();
		});

		socket.on('error', (error) => {
			logStatus(`SSL Check failed: ${error.message}`, 'fail');
			if (!config.testMode) {
				logStatus('Taking action: create or update incident', 'fail');
				incidentManager.createOrUpdateIncident(
					'ssl-error',
					`${site.name} SSL connection error!`,
					error.message,
					'major',
					site
				);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would create or update incident: ssl-error'
					)
				);
			}
		});
	} catch (error) {
		logStatus(`SSL Check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			logStatus('Taking action: create or update incident', 'fail');
			incidentManager.createOrUpdateIncident(
				'ssl-error',
				`${site.name} SSL connection error!`,
				error.message,
				'major',
				site
			);
		} else {
			console.log(
				chalk.yellow(
					'  [TEST MODE] Would create or update incident: ssl-error'
				)
			);
		}
	}
}

export default sslMonitor;