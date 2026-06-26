import assert from 'node:assert/strict';
import IncidentManager from '../utils/incidentManager.js';

process.env.LOCAL_CSTATE_PATH = process.env.LOCAL_CSTATE_PATH || '.';

const manager = new IncidentManager();
const markdown = manager.generateIncidentMarkdown(
  'dns-api',
  'API DNS resolution error',
  '*Automated system alert* - DNS checks are failing. {{< track "2026-05-09T09:00:00.000Z" >}}\n',
  'down',
  '2026-05-09T09:00:00.000Z',
  false,
  null,
  { name: 'API' }
);

assert.match(markdown, /section: issue/);
assert.match(markdown, /automated: true/);
assert.match(markdown, /severity: "down"/);
assert.match(markdown, /affected:\n  - "API"/);
assert.match(markdown, /id: "dns-api"/);
assert.doesNotMatch(markdown, /resolvedWhen:/);
assert.match(markdown, /\{\{< track "2026-05-09T09:00:00.000Z" >\}\}/);

const resolved = manager.generateIncidentMarkdown(
  'dns-api',
  'API is back online!',
  '*Resolved* {{< track "2026-05-09T10:00:00.000Z" >}}\n',
  'down',
  '2026-05-09T09:00:00.000Z',
  true,
  new Date('2026-05-09T10:00:00.000Z'),
  { name: 'API' }
);

assert.match(resolved, /resolved: true/);
assert.match(resolved, /resolvedWhen: 2026-05-09T10:00:00.000Z/);
assert.match(resolved, /automated: true/);

const experiment = manager.generateExperimentRecordMarkdown({
  id: 'experiment-api',
  title: 'API cache rollout',
  description: 'Testing cache behavior.\n',
  date: '2026-05-09T09:00:00.000Z',
  state: 'active',
  severity: 'notice',
  pin: true,
  summary: 'Testing API cache behavior.',
  site: { name: 'API' },
});

assert.match(experiment, /recordType: experiment/);
assert.match(experiment, /recordKind: experiment/);
assert.match(experiment, /state: active/);
assert.match(experiment, /severity: notice/);
assert.match(experiment, /pin: true/);
assert.match(experiment, /summary: "Testing API cache behavior."/);
assert.match(experiment, /affected:\n  - "API"/);
assert.doesNotMatch(experiment, /^kind:/m);
assert.doesNotMatch(experiment, /section: issue/);
assert.doesNotMatch(experiment, /resolved:/);

const announcement = manager.generateInformationalIssueMarkdown({
  id: 'announcement-api',
  title: 'API maintenance window',
  description: 'Maintenance is planned.\n',
  date: '2026-05-09T09:00:00.000Z',
  recordKind: 'announcement',
  severity: 'notice',
  pin: true,
  summary: 'Maintenance is planned.',
  site: { name: 'API' },
});

assert.match(announcement, /section: issue/);
assert.match(announcement, /resolved: true/);
assert.match(announcement, /informational: true/);
assert.match(announcement, /recordKind: announcement/);
assert.match(announcement, /severity: "notice"/);
assert.match(announcement, /pin: true/);
assert.doesNotMatch(announcement, /^kind:/m);

const maintenance = manager.generateInformationalIssueMarkdown({
  id: 'maintenance-api',
  title: 'API maintenance',
  description: 'Maintenance is active.\n',
  date: '2026-05-09T09:00:00.000Z',
  recordKind: 'maintenance',
  severity: 'notice',
  pin: false,
  summary: 'Maintenance is active.',
  site: { name: 'API' },
});

assert.match(maintenance, /recordKind: maintenance/);
assert.match(maintenance, /pin: false/);
assert.match(maintenance, /resolved: true/);

assert.equal(manager.getOutputMode('http-status', { name: 'API' }), 'incident');
assert.equal(manager.getOutputMode('http-status', { name: 'API', outputMode: 'experiment' }), 'experiment');
assert.equal(
  manager.getOutputMode('http-status', {
    name: 'API',
    outputModes: { 'http-status': 'maintenance' },
  }),
  'maintenance'
);

console.log('monitorbot cState v7 Markdown verification passed.');
