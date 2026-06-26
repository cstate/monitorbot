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

console.log('monitorbot incident Markdown verification passed.');
