import path from 'path';
import config from '../config/config.js';
import Deployer from './deployer.js';
import fs from 'fs';
import chalk from 'chalk';

class IncidentManager {
	constructor() {
		this.deployer = new Deployer();
		this.stateFilePath = path.join(process.cwd(), 'incident_state.json');
		this.state = this.loadState();
	}

	async createOrUpdateIncident(type, title, description, severity, site) {
		const incidentKey = `${site.name}-${type}`;
		const now = Date.now();
		const thedate = new Date();
		const dateString = thedate.toISOString().slice(0, 10);
		const incidentId = `${type}-${site.name.replace(/\s+/g, '-').toLowerCase()}`;
		const incidentFile = this.state[incidentKey]?.incidentFile || path.join(
			'content',
			'issues',
			`${dateString}-${incidentId}.md`
		);

		if (!this.state[incidentKey]) {
			this.state[incidentKey] = {
				consecutiveFailures: 0,
				lastFailure: null,
				severity: 'none',
				incidentCreated: false,
				initialIncidentDate: null, // Store the initial incident date
				incidentFile: null,
			};
		}

		let state = this.state[incidentKey];
		state.consecutiveFailures++;

		if (
			state.consecutiveFailures === config.initialDelay &&
			!state.incidentCreated
		) {
			console.log(
				chalk.blue(`[${site.name}] [${type}] Creating new incident...`)
			);

			state.initialIncidentDate = thedate.toISOString(); // Set the initial date
			state.incidentFile = incidentFile;
			state.severity = severity;
			const initialDescription = config.incidentMessages.initial
				.replace('{{type}}', type)
				.replace('{{site.name}}', site.name);

			const incidentData = this.generateIncidentMarkdown(
				incidentId,
				title,
				this.formatIncidentUpdate(initialDescription, thedate.toISOString()),
				severity,
				state.initialIncidentDate,
				false,
				null,
				site
			);

			state.incidentCreated = true;

			await this.deployer.deploy(incidentData, incidentFile);
			console.log(
				chalk.green(
					`[${site.name}] [${type}] Incident created: ${incidentFile}`
				)
			);
		} else if (
			state.consecutiveFailures === config.escalationThreshold &&
			state.severity !== 'down'
		) {
			console.log(
				chalk.blue(
					`[${site.name}] [${type}] Escalating incident to 'down' status...`
				)
			);

			const existingContent = fs.readFileSync(
				path.join(process.cwd(), process.env.LOCAL_CSTATE_PATH, incidentFile),
				'utf-8'
			);
			const frontmatterMatch = existingContent.match(/^---[\s\S]*?---\n/);
			const existingUpdates = existingContent.substring(
				frontmatterMatch ? frontmatterMatch[0].length : 0
			);

			const incidentData = this.generateIncidentMarkdown(
				incidentId,
				title,
				this.formatIncidentUpdate(
					config.incidentMessages.escalated,
					thedate.toISOString()
				) + existingUpdates, // Append new update to existing content
				'down',
				state.initialIncidentDate, // Use initialIncidentDate
				false,
				null,
				site
			);

			state.severity = 'down';

			await this.deployer.deploy(incidentData, incidentFile);
			console.log(
				chalk.green(
					`[${site.name}] [${type}] Incident escalated to 'down' status: ${incidentFile}`
				)
			);
		} else if (state.consecutiveFailures < config.initialDelay) {
			console.log(
				chalk.yellow(
					`[${site.name}] [${type}] ${state.consecutiveFailures}/${config.initialDelay} failures recorded (below delay threshold).`
				)
			);
		} else if (
			state.consecutiveFailures > config.initialDelay &&
			state.consecutiveFailures < config.escalationThreshold
		) {
			console.log(
				chalk.yellow(
					`[${site.name}] [${type}] ${state.consecutiveFailures}/${config.escalationThreshold} failures recorded (below escalation threshold).`
				)
			);
		}

		state.lastFailure = now;
		this.saveState(); // Save the state after each update
	}

	async resolveIncidentIfExisting(type, site) {
		const incidentKey = `${site.name}-${type}`;

		if (this.state[incidentKey] && this.state[incidentKey].incidentCreated) {
			const thedate = new Date();
			const dateString = thedate.toISOString().slice(0, 10);
			const incidentId = `${type}-${site.name.replace(/\s+/g, '-').toLowerCase()}`;
			const incidentFile = this.state[incidentKey].incidentFile || path.join(
				'content',
				'issues',
				`${dateString}-${incidentId}.md`
			);

			if (
				!config.testMode &&
				fs.existsSync(
					path.join(process.cwd(), process.env.LOCAL_CSTATE_PATH, incidentFile)
				)
			) {
				const existingContent = fs.readFileSync(
					path.join(process.cwd(), process.env.LOCAL_CSTATE_PATH, incidentFile),
					'utf-8'
				);
				const frontmatterMatch = existingContent.match(/^---[\s\S]*?---\n/);
				const existingFrontmatter = frontmatterMatch ? frontmatterMatch[0] : '';
				const existingUpdates = existingContent.substring(
					existingFrontmatter.length
				);

				const resolvedDescription = config.incidentMessages.resolved.replace(
					'{{site.name}}',
					site.name
				);

				// Use initial incident date for resolved incident
				const incidentData = this.generateIncidentMarkdown(
					incidentId,
					`${site.name} is back online!`,
					this.formatIncidentUpdate(
						resolvedDescription,
						thedate.toISOString()
					) + existingUpdates,
					this.state[incidentKey].severity === 'none' ? 'notice' : this.state[incidentKey].severity,
					this.state[incidentKey].initialIncidentDate,
					true,
					thedate,
					site
				);

				await this.deployer.deploy(incidentData, incidentFile);
				console.log(
					chalk.green(
						`[${site.name}] [${type}] Incident resolved: ${incidentFile}`
					)
				);

				// Reset state on resolution
				this.resetState(incidentKey);
				this.saveState();
			}
		}
	}

	generateIncidentMarkdown(
		id,
		title,
		description,
		severity,
		date,
		resolved,
		resolvedWhen,
		site
	) {
		const resolvedWhenLine = resolvedWhen
			? `\nresolvedWhen: ${this.formatDateValue(resolvedWhen)}`
			: '';
		const frontmatter = `---
title: ${this.formatYamlString(title)}
date: ${this.formatDateValue(date)}
resolved: ${resolved}${resolvedWhenLine}
severity: "${severity}"
affected:
  - ${this.formatYamlString(site.name)}
id: ${this.formatYamlString(id)}
section: issue
automated: true
---

${description}`;
		return frontmatter;
	}

	formatDateValue(value) {
		return value instanceof Date ? value.toISOString() : value;
	}

	formatYamlString(value) {
		return JSON.stringify(value || '');
	}

	formatIncidentUpdate(message, timestamp) {
		return `*${message}* {{< track "${timestamp}" >}}\n`;
	}

	resetState(incidentKey) {
		if (this.state[incidentKey]) {
			this.state[incidentKey] = {
				consecutiveFailures: 0,
				lastFailure: null,
				severity: 'none',
				incidentCreated: false,
				initialIncidentDate: null,
				incidentFile: null,
			};
		}
	}

	loadState() {
		try {
			if (fs.existsSync(this.stateFilePath)) {
				const rawData = fs.readFileSync(this.stateFilePath);
				return JSON.parse(rawData);
			}
		} catch (error) {
			console.error(chalk.red(`Error loading incident state: ${error}`));
		}
		return {};
	}

	saveState() {
		try {
			const data = JSON.stringify(this.state, null, 2);
			fs.writeFileSync(this.stateFilePath, data);
		} catch (error) {
			console.error(chalk.red(`Error saving incident state: ${error}`));
		}
	}
}

export default IncidentManager;
