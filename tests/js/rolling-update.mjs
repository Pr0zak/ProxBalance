// Unit tests for the rolling update card's pure helpers (rollingModel.js).
// Run: node tests/js/rolling-update.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/components/insights/rollingModel.js'],
  bundle: true, format: 'esm', write: false,
});
const M = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

test('step chip', () => {
  assert.deepEqual(M.stepChip({ status: 'ok' }), { label: 'ready', tone: 'green' });
  assert.equal(M.stepChip({ status: 'tight' }).tone, 'yellow');
  assert.deepEqual(M.stepChip({ status: 'short', doesnt_fit: [{}, {}] }), { label: "2 don't fit", tone: 'red' });
  assert.deepEqual(M.stepChip({ status: 'no_quorum' }), { label: 'loses quorum', tone: 'red' });
  assert.equal(M.stepChip(null).label, '—');
});

test('step summary', () => {
  assert.equal(M.stepSummary({ status: 'ok', moves: [], must_stop: [], doesnt_fit: [], copy_gb: 0 }), 'nothing to move');
  assert.equal(
    M.stepSummary({ status: 'short', moves: [{}, {}], must_stop: [{}], doesnt_fit: [{}], copy_gb: 247.6 }),
    '2 moves · ~248 GB to copy · 1 must shut down');
  assert.equal(
    M.stepSummary({ status: 'no_quorum', moves: [{}], must_stop: [], doesnt_fit: [{}], copy_gb: 0 }),
    "1 move · 1 don't fit");
  assert.equal(M.stepSummary({ status: 'ok', moves: [{}], copy_gb: 0 }), '1 move');
  assert.equal(M.stepSummary({ status: 'offline' }), 'offline, skipped');
});

test('open by default only on problems', () => {
  assert.equal(M.stepOpenByDefault({ status: 'ok' }), false);
  assert.equal(M.stepOpenByDefault({ status: 'tight' }), false);
  assert.equal(M.stepOpenByDefault({ status: 'short' }), true);
  assert.equal(M.stepOpenByDefault({ status: 'no_quorum' }), true);
});

test('quorum tone, maintenance link, busiest target', () => {
  assert.equal(M.quorumTone({ all_ok: true }), 'green');
  assert.equal(M.quorumTone({ all_ok: false }), 'red');
  assert.equal(M.quorumTone(null), 'gray');
  assert.equal(M.maintenanceHref('pve 4'), '#/dashboard/nodes/node/pve%204');
  const step = { targets: [{ node: 'a', mem_after: 90, added: 0 }, { node: 'b', mem_after: 60, added: 1 }, { node: 'c', mem_after: 70, added: 2 }] };
  assert.equal(M.busiestTarget(step).node, 'c');
  assert.equal(M.busiestTarget({ targets: [] }), null);
});
