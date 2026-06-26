import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
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

const testModeFalse = execFileSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "process.env.TESTMODE='false'; const { default: config } = await import('./config/config.js?testmode_false=' + Date.now()); console.log(config.testMode);",
  ],
  { encoding: 'utf8' }
).trim();
assert.equal(testModeFalse, 'false');

const testModeTrue = execFileSync(
  process.execPath,
  [
    '--input-type=module',
    '-e',
    "process.env.TESTMODE='true'; const { default: config } = await import('./config/config.js?testmode_true=' + Date.now()); console.log(config.testMode);",
  ],
  { encoding: 'utf8' }
).trim();
assert.equal(testModeTrue, 'true');

let deployed = null;
manager.deployer = {
  async deploy(content, filePath) {
    deployed = { content, filePath };
  },
};
manager.saveState = () => {};
manager.state['API-http-status'] = {
  consecutiveFailures: 5,
  lastFailure: Date.now(),
  severity: 'down',
  incidentCreated: true,
  initialIncidentDate: '2026-05-09T09:00:00.000Z',
  incidentFile: 'content/issues/2026-05-09-http-status-api.md',
  updates: ['*Earlier update* {{< track "2026-05-09T09:00:00.000Z" >}}\n'],
};

await manager.resolveIncidentIfExisting('http-status', { name: 'API' });

assert.equal(deployed.filePath, 'content/issues/2026-05-09-http-status-api.md');
assert.match(deployed.content, /Earlier update/);
assert.match(deployed.content, /The issue with our system "API" has been resolved/);
assert.match(deployed.content, /resolved: true/);
assert.equal(manager.state['API-http-status'].incidentCreated, false);

console.log('monitorbot cState v7 Markdown verification passed.');
