import path from 'path';
import config from '../config.js';
import Deployer from './deployer.js'; // Use the combined deployer
import fs from 'fs';

class IncidentManager {
	constructor() {
		this.deployer = new Deployer();
	}

	async createOrUpdateIncident(type, title, description, severity, site) {
		const incidentId = `${type}-${site.name.replace(/\s+/g, '-').toLowerCase()}`;
		const incidentFile = path.join('content', 'incidents', `${incidentId}.md`);
		const incidentData = this.generateIncidentMarkdown(
			incidentId,
			title,
			description,
			severity,
			new Date(),
			'investigating',
			site
		);

		try {
			// Check if an incident file already exists (only if not in test mode)
			if (!config.testMode && fs.existsSync(path.join(process.cwd(), process.env.LOCAL_CSTATE_PATH, incidentFile))) {
				console.log('Incident already exists, updating...');
				// In a real scenario, you might want to check the status in the existing file
				// and only update if the status has changed
				await this.deployer.deploy(incidentData, incidentFile);
				console.log(`Incident updated: ${incidentFile}`);
			} else {
				console.log('Creating new incident...');
				await this.deployer.deploy(incidentData, incidentFile);
				console.log(`Incident created: ${incidentFile}`);
			}
		} catch (error) {
			console.error('Error creating or updating incident:', error);
		}
	}

	async resolveIncidentIfExisting(type, site) {
		const incidentId = `${type}-${site.name.replace(/\s+/g, '-').toLowerCase()}`;
		const incidentFile = path.join('content', 'incidents', `${incidentId}.md`);

		try {
			// Check if an incident file exists (only if not in test mode)
			if (!config.testMode && fs.existsSync(path.join(process.cwd(), process.env.LOCAL_CSTATE_PATH, incidentFile))) {
				const incidentData = this.generateIncidentMarkdown(
					incidentId,
					`${site.name} is back online!`,
					'The issue has been resolved.',
					'resolved',
					new Date(),
					'resolved',
					site
				);
				await this.deployer.deploy(incidentData, incidentFile);
				console.log(`Incident resolved: ${incidentFile}`);
			}
		} catch (error) {
			console.error('Error resolving incident:', error);
		}
	}

	generateIncidentMarkdown(id, title, message, severity, date, status, site) {
		const frontmatter = `---
title: "${title}"
date: ${date.toISOString()}
draft: false
section: issue
automated: true
severity: "${severity}"
status: "${status}"
affected: ["${site.name}"]
id: "${id}"
---

${message}
    `;
		return frontmatter;
	}
}

export default IncidentManager;