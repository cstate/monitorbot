import disk from 'node-disk-info';
import config from '../config.js';
import IncidentManager from '../utils/incidentManager.js';
import chalk from 'chalk';

async function diskSpaceMonitor(site) {
	const incidentManager = new IncidentManager();
	const logStatus = (message, status) => {
		const color = status === 'success' ? chalk.green : chalk.red;
		console.log(color(`[${site.name}] [DISK SPACE] ${message}`));
	};

	try {
		const disks = await disk.getDiskInfo();
		const diskToMonitor = disks.find(d => d.mounted === site.mountPoint); // Assuming you monitor a specific mount point

		if (diskToMonitor) {
			const freeSpacePercentage = (diskToMonitor.available / diskToMonitor.blocks) * 100;

			if (freeSpacePercentage < config.diskSpaceThreshold) {
				logStatus(`Disk space low: ${freeSpacePercentage.toFixed(2)}% free`, 'fail');
				if (!config.testMode) {
					await incidentManager.createOrUpdateIncident(
						'disk-space',
						`${site.name} disk space low!`,
						`Disk space low: ${freeSpacePercentage.toFixed(2)}% free`,
						'warning',
						site
					);
				}
			} else {
				logStatus('Disk space check successful', 'success');
				if (!config.testMode) {
					await incidentManager.resolveIncidentIfExisting('disk-space', site);
				}
			}
		} else {
			logStatus(`Mount point ${site.mountPoint} not found`, 'fail');
		}
	} catch (error) {
		logStatus(`Disk space check failed: ${error.message}`, 'fail');
		if (!config.testMode) {
			await incidentManager.createOrUpdateIncident(
				'disk-space',
				`${site.name} disk space check error!`,
				`Disk space check failed: ${error.message}`,
				'warning',
				site
			);
		}
	}
}

export default diskSpaceMonitor;