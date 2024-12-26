const ping = require('ping');
const config = require('../config');
const IncidentManager = require('../utils/incidentManager');

async function pingMonitor(site) {
	try {
		const result = await ping.promise.probe(site.url.replace(/https?:\/\//, ''), {
			timeout: config.pingMonitor.timeout,
		});

		if (!result.alive) {
			console.error(`Ping Check failed for ${site.url}: Host unreachable`);
			const incidentManager = new IncidentManager();
			await incidentManager.createOrUpdateIncident(
				'ping-error',
				`${site.name} is unreachable (ping)!`,
				'Host unreachable',
				'major',
				site
			);
		} else {
			console.log(`Ping Check successful for ${site.url}: RTT ${result.time}ms`);
			// If the ping is successful, check if there's an ongoing incident and resolve it
			const incidentManager = new IncidentManager();
			await incidentManager.resolveIncidentIfExisting('ping-error', site);
		}
	} catch (error) {
		console.error(`Ping Check failed for ${site.url}: ${error}`);
		const incidentManager = new IncidentManager();
		await incidentManager.createOrUpdateIncident(
			'ping-error',
			`${site.name} is unreachable (ping)!`,
			error.toString(),
			'major',
			site
		);
	}
}

module.exports = pingMonitor;