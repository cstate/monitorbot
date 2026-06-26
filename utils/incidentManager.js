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
		const outputMode = this.getOutputMode(type, site);
		if (outputMode === 'experiment') {
			return this.createOrUpdateExperimentRecord(type, title, description, severity, site);
		}
		if (outputMode === 'announcement' || outputMode === 'maintenance') {
			return this.createOrUpdateInformationalIssue(type, title, description, severity, site, outputMode);
		}

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
				this.normalizeIncidentSeverity(severity),
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
		const outputMode = this.getOutputMode(type, site);

		if (outputMode === 'experiment') {
			return this.completeExperimentRecordIfExisting(type, site);
		}

		if (outputMode === 'announcement' || outputMode === 'maintenance') {
			return;
		}

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
severity: "${this.normalizeIncidentSeverity(severity)}"
affected:
  - ${this.formatYamlString(site.name)}
id: ${this.formatYamlString(id)}
section: issue
automated: true
---

${description}`;
		return frontmatter;
	}

	async createOrUpdateExperimentRecord(type, title, description, severity, site) {
		const recordKey = `${site.name}-${type}-experiment`;
		const now = new Date();
		const recordId = this.recordId(type, site);
		const recordFile = this.state[recordKey]?.recordFile || path.join(
			'content',
			'experiments',
			`${now.toISOString().slice(0, 10)}-${recordId}.md`
		);

		if (!this.state[recordKey]) {
			this.state[recordKey] = {
				recordCreated: false,
				recordFile: null,
				initialRecordDate: null,
				state: null,
			};
		}

		const state = this.state[recordKey];
		const recordConfig = this.getRecordConfig(type, site);
		const recordData = this.generateExperimentRecordMarkdown({
			id: recordId,
			title,
			description: this.formatRecordBody(description, now.toISOString()),
			date: state.initialRecordDate || now.toISOString(),
			state: recordConfig.state || 'active',
			severity: recordConfig.severity || this.experimentSeverity(severity),
			pin: recordConfig.pin ?? false,
			summary: recordConfig.summary || description,
			site,
		});

		state.recordCreated = true;
		state.recordFile = recordFile;
		state.initialRecordDate = state.initialRecordDate || now.toISOString();
		state.state = recordConfig.state || 'active';

		await this.deployer.deploy(recordData, recordFile);
		this.saveState();
		console.log(chalk.green(`[${site.name}] [${type}] Experiment record written: ${recordFile}`));
	}

	async completeExperimentRecordIfExisting(type, site) {
		const recordKey = `${site.name}-${type}-experiment`;
		const state = this.state[recordKey];
		if (!state?.recordCreated || !state.recordFile) {
			return;
		}

		const now = new Date();
		const recordConfig = this.getRecordConfig(type, site);
		const recordData = this.generateExperimentRecordMarkdown({
			id: this.recordId(type, site),
			title: recordConfig.resolvedTitle || `${site.name} experiment completed`,
			description: this.formatRecordBody(recordConfig.resolvedSummary || `"${site.name}" is passing checks again.`, now.toISOString()),
			date: state.initialRecordDate || now.toISOString(),
			state: 'completed',
			severity: 'none',
			pin: recordConfig.pin ?? false,
			summary: recordConfig.resolvedSummary || `"${site.name}" is passing checks again.`,
			site,
		});

		state.state = 'completed';
		await this.deployer.deploy(recordData, state.recordFile);
		this.resetState(recordKey);
		this.saveState();
		console.log(chalk.green(`[${site.name}] [${type}] Experiment record completed: ${state.recordFile}`));
	}

	async createOrUpdateInformationalIssue(type, title, description, severity, site, recordKind) {
		const now = new Date();
		const recordId = this.recordId(type, site);
		const recordFile = path.join(
			'content',
			'issues',
			`${now.toISOString().slice(0, 10)}-${recordId}.md`
		);
		const recordConfig = this.getRecordConfig(type, site);
		const data = this.generateInformationalIssueMarkdown({
			id: recordId,
			title,
			description: this.formatRecordBody(description, now.toISOString()),
			date: now.toISOString(),
			recordKind,
			severity: this.normalizeIncidentSeverity(recordConfig.severity || 'notice', 'notice'),
			pin: recordConfig.pin ?? (recordKind === 'announcement'),
			summary: recordConfig.summary || description,
			site,
		});

		await this.deployer.deploy(data, recordFile);
		console.log(chalk.green(`[${site.name}] [${type}] ${recordKind} written: ${recordFile}`));
	}

	generateExperimentRecordMarkdown({
		id,
		title,
		description,
		date,
		state = 'active',
		severity = 'none',
		pin = false,
		summary = '',
		site,
	}) {
		return `---
title: ${this.formatYamlString(title)}
date: ${this.formatDateValue(date)}
recordType: experiment
recordKind: experiment
state: ${this.normalizeRecordState(state)}
severity: ${this.normalizeRecordSeverity(severity)}
pin: ${Boolean(pin)}
affected:
  - ${this.formatYamlString(site.name)}
summary: ${this.formatYamlString(summary)}
id: ${this.formatYamlString(id)}
automated: true
---

${description}`;
	}

	generateInformationalIssueMarkdown({
		id,
		title,
		description,
		date,
		recordKind,
		severity = 'notice',
		pin = false,
		summary = '',
		site,
	}) {
		return `---
title: ${this.formatYamlString(title)}
date: ${this.formatDateValue(date)}
resolved: true
informational: true
severity: "${this.normalizeIncidentSeverity(severity, 'notice')}"
affected:
  - ${this.formatYamlString(site.name)}
id: ${this.formatYamlString(id)}
section: issue
recordKind: ${recordKind}
pin: ${Boolean(pin)}
summary: ${this.formatYamlString(summary)}
automated: true
---

${description}`;
	}

	getOutputMode(type, site) {
		const mode = site.outputModes?.[type]
			|| site.cstate?.outputModes?.[type]
			|| site.monitorbot?.outputModes?.[type]
			|| site.outputMode
			|| site.cstate?.outputMode
			|| site.monitorbot?.outputMode
			|| config.outputModes?.[type]
			|| config.outputMode
			|| 'incident';
		return ['incident', 'experiment', 'announcement', 'maintenance'].includes(mode)
			? mode
			: 'incident';
	}

	getRecordConfig(type, site) {
		return site.records?.[type]
			|| site.cstate?.records?.[type]
			|| site.monitorbot?.records?.[type]
			|| site.record
			|| site.cstate?.record
			|| site.monitorbot?.record
			|| {};
	}

	recordId(type, site) {
		const explicitId = this.getRecordConfig(type, site).id || site.id;
		if (explicitId) {
			return `${type}-${String(explicitId).replace(/\s+/g, '-').toLowerCase()}`;
		}
		return `${type}-${site.name.replace(/\s+/g, '-').toLowerCase()}`;
	}

	formatRecordBody(message, timestamp) {
		return `${message}\n\n{{< track "${timestamp}" >}}\n`;
	}

	normalizeIncidentSeverity(severity, fallback = 'disrupted') {
		return ['notice', 'disrupted', 'down'].includes(severity) ? severity : fallback;
	}

	normalizeRecordSeverity(severity) {
		return ['none', 'notice'].includes(severity) ? severity : 'none';
	}

	normalizeRecordState(state) {
		return ['active', 'completed', 'archived'].includes(state) ? state : 'active';
	}

	experimentSeverity(severity) {
		return severity === 'notice' ? 'notice' : 'none';
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
