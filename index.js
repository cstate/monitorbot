import config from './config.js';
import httpMonitor from './monitors/httpMonitor.js';
import sslMonitor from './monitors/sslMonitor.js';
import dnsMonitor from './monitors/dnsMonitor.js';
import portMonitor from './monitors/portMonitor.js';
import pingMonitor from './monitors/pingMonitor.js';
import { CronJob } from 'cron';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

async function runChecks() {
	console.log(chalk.blue('Running checks...'));

	// HTTP Checks
	for (const site of config.httpMonitor.urls) {
		await httpMonitor(site);
	}

	// SSL Checks
	for (const site of config.sslMonitor.sites) {
		await sslMonitor(site);
	}

	// DNS Checks
	for (const site of config.dnsMonitor.sites) {
		await dnsMonitor(site);
	}

	// Port Checks
	for (const site of config.portMonitor.sites) {
		await portMonitor(site);
	}

	// Ping Checks
	for (const site of config.pingMonitor.sites) {
		await pingMonitor(site);
	}
}

// Initial run
runChecks();

// Schedule checks using CronJob
const job = new CronJob(
	`*/${config.checkInterval / 1000} * * * * *`, // Run every `checkInterval` seconds
	runChecks,
	null,
	true,
	'America/Los_Angeles' // Adjust the time zone as needed
);

job.start();