// Unit tests for the Diagnostics copy-as-text helper (diagnosticsReport.js).
// Run: node tests/js/diagnostics-report.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/diagnosticsReport.js'],
  bundle: true, format: 'esm', write: false,
});
const M = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const run = {
  ran_at: '2026-10-14T10:00:00+00:00', duration_ms: 812,
  summary: { pass: 2, warn: 1, fail: 1, skip: 0 },
  results: [
    { id: 'api_host', group: 'Proxmox', name: 'Proxmox API (10.0.0.3)', status: 'pass', fact: 'Reachable in 12 ms', details: { latency_ms: 12 } },
    { id: 'permissions', group: 'Proxmox', name: 'Token permissions', status: 'warn',
      fact: "Token lacks VM.Migrate — automation can't move guests", details: { token_id: 'pb@pam!pb' } },
    { id: 'collector', group: 'ProxBalance', name: 'Collector', status: 'fail', fact: 'Last run failed', details: {} },
    { id: 'cache', group: 'ProxBalance', name: 'Cluster data cache', status: 'pass', fact: 'Collected 3 min ago',
      details: { error: 'Authorization: PVEAPIToken=pb@pam!pb=a1b2c3d4-dead-beef-0000-123456789abc' } },
  ],
};

test('summary text lists non-zero counts', () => {
  assert.equal(M.summaryText(run.summary), '1 failed · 1 warning · 2 passed');
  assert.equal(M.summaryText({ pass: 3 }), '3 passed');
  assert.equal(M.summaryText(null), '');
});

test('overall status is the worst line', () => {
  assert.equal(M.overallStatus(run.results), 'fail');
  assert.equal(M.overallStatus(run.results.filter(r => r.status !== 'fail')), 'warn');
  assert.equal(M.overallStatus([{ status: 'pass' }]), 'pass');
  assert.equal(M.overallStatus([]), null);
});

test('report has one line per check, grouped, with version', () => {
  const text = M.formatReport(run, { version: 'v2.18.0' });
  assert.match(text, /Version: v2\.18\.0/);
  assert.match(text, /\[Proxmox\]\nPASS  Proxmox API \(10\.0\.0\.3\): Reachable in 12 ms/);
  assert.match(text, /WARN  Token permissions: Token lacks VM\.Migrate/);
  assert.match(text, /\[ProxBalance\]\nFAIL  Collector: Last run failed/);
  assert.match(text, /api_host: \{"latency_ms":12\}/);
  assert.doesNotMatch(text, /^collector:/m); // empty details are left out
});

test('report redacts secret-shaped values', () => {
  const text = M.formatReport(run);
  assert.doesNotMatch(text, /a1b2c3d4-dead-beef/);
  assert.match(text, /PVEAPIToken=pb@pam!pb=\*\*\*/);
  assert.match(text, /pb@pam!pb/); // the token id is not a secret
  assert.equal(M.redactText('password=hunter2 x'), 'password=*** x');
  assert.equal(M.redactText('"api_key": "sk-abc"'), '"api_key": "***"');
  assert.equal(M.redactText('{"api_token":"tok123","token_id":"pb@pam!pb"}'), '{"api_token":"***","token_id":"pb@pam!pb"}');
  assert.equal(M.redactText('https://user:pw@hooks.example/x'), 'https://***@hooks.example/x');
});

test('no run, no report', () => {
  assert.equal(M.formatReport(null), '');
});
