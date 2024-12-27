import os from 'os';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function memoryMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] [MEMORY] ${message}`));
	};

	const totalMemory = os.totalmem();
	const freeMemory = os.freemem();
	const usedMemoryPercentage = ((totalMemory - freeMemory) / totalMemory) * 100;

	if (usedMemoryPercentage > config.memoryUsageThreshold) {
		logStatus(`Memory usage high: ${usedMemoryPercentage.toFixed(2)}% used`, 'fail');
		if (!config.testMode) {
			await incidentManager.createOrUpdateIncident(
				'memory-usage',
				`${site.name} memory usage high!`,
				`Memory usage high: ${usedMemoryPercentage.toFixed(2)}% used`,
				'warning',
				site
			);
		}
	} else {
		logStatus('Memory usage check successful', 'success');
		if (!config.testMode) {
			await incidentManager.resolveIncidentIfExisting('memory-usage', site);
		}
	}
}

export default memoryMonitor;