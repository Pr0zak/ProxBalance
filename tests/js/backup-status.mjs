// Unit tests for the guest backup line (backupStatus.js).
// Run: node tests/js/backup-status.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/backupStatus.js'],
  bundle: true, format: 'esm', write: false,
});
const { backupView, fmtAge, fmtDuration } =
  await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const NOW = 2_000_000_000;
const H = 3600;
const ok = (over = {}) => ({
  last_ok: NOW - 7 * H, last_ok_storage: 'vault-pbs', last_ok_duration_s: 26,
  last_attempt: NOW - 7 * H, last_attempt_ok: true, last_error: null,
  last_node: 'draco', ok_count: 14, fail_count: 0, ...over,
});

test('recent good backup is ok with age and storage', () => {
  const v = backupView({ has_backup: true, backup: ok() }, NOW);
  assert.equal(v.text, '7h ago · vault-pbs');
  assert.equal(v.tone, 'ok');
  assert.equal(v.detail, 'Took 26s on draco. 14 good, 0 failed in 14 days.');
});

test('good backup older than 3 days is amber', () => {
  const v = backupView({ has_backup: true, backup: ok({ last_ok: NOW - 4 * 86400 }) }, NOW);
  assert.equal(v.text, '4d ago · vault-pbs');
  assert.equal(v.tone, 'warn');
});

test('failed last attempt shows the error and the last good one', () => {
  const v = backupView({ has_backup: true, backup: ok({
    last_ok: NOW - 2 * 86400, last_attempt: NOW - 5 * H, last_attempt_ok: false,
    last_error: 'unable to open file', ok_count: 12, fail_count: 1,
  }) }, NOW);
  assert.equal(v.text, 'Failed 5h ago · last good 2d ago');
  assert.equal(v.tone, 'bad');
  assert.equal(v.detail, 'unable to open file (on draco). 12 good, 1 failed in 14 days.');
});

test('failed with no good backup in the window', () => {
  const v = backupView({ has_backup: true, backup: ok({ last_ok: null, last_attempt_ok: false, ok_count: 0, fail_count: 3 }) }, NOW);
  assert.equal(v.text, 'Failed 7h ago · none good in 14 days');
});

test('none found, in a job vs not', () => {
  assert.deepEqual(backupView({ has_backup: true, backup: null }, NOW).text, 'None in 14 days');
  assert.deepEqual(backupView({ has_backup: false, backup: null }, NOW).text, 'Not backed up');
});

test('manual backup outside a job says so', () => {
  const v = backupView({ has_backup: false, backup: ok() }, NOW);
  assert.match(v.detail, /run by hand/);
});

test('no task data falls back to job coverage', () => {
  assert.equal(backupView({ has_backup: true }, NOW).text, 'In a backup job');
  assert.equal(backupView({ has_backup: false }, NOW).tone, 'warn');
});

test('formatters', () => {
  assert.equal(fmtAge(NOW - 30, NOW), '1m ago');
  assert.equal(fmtAge(NOW - 3 * 86400, NOW), '3d ago');
  assert.equal(fmtDuration(3723), '1 h 2 min');
  assert.equal(fmtDuration(600), '10 min');
  assert.equal(fmtDuration(null), null);
});
