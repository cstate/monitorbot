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
		host: site.url.replace(/https?:\/\//, ''),
		port: 443,
		servername: site.url.replace(/https?:\/\//, ''),
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
						'ssl-certificate',
						`${site.name} SSL certificate expiring soon!`,
						`SSL Check failed: Certificate expires in ${daysUntilExpiration} days`,
						'notice',
						site
					);
				} else {
					console.log(
						chalk.yellow(
							'  [TEST MODE] Would create or update incident: ssl-certificate'
						)
					);
				}
			} else {
				logStatus(`SSL Check successful`, 'success');
				if (!config.testMode) {
					logStatus('Taking action: resolve incident if existing', 'success');
					incidentManager.resolveIncidentIfExisting('ssl-certificate', site);
				} else {
					console.log(
						chalk.yellow(
							'  [TEST MODE] Would resolve incident if existing: ssl-certificate'
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
					'ssl-certificate',
					`${site.name} SSL connection error!`,
					`SSL Check failed: ${error.message}`,
					'disrupted',
					site
				);
			} else {
				console.log(
					chalk.yellow(
						'  [TEST MODE] Would create or update incident: ssl-certificate'
					)
				);
			}
		});
	} catch (error) {
		logStatus(`SSL Check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			logStatus('Taking action: create or update incident', 'fail');
			incidentManager.createOrUpdateIncident(
				'ssl-certificate',
				`${site.name} SSL connection error!`,
				`SSL Check failed: ${error.message}`,
				'disrupted',
				site
			);
		} else {
			console.log(
				chalk.yellow(
					'  [TEST MODE] Would create or update incident: ssl-certificate'
				)
			);
		}
	}
}

export default sslMonitor;