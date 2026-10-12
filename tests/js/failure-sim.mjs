// Unit tests for the node-failure card's pure helpers (failureModel.js): the
// N-1 chip, the default node, the short verdict and the memory bar.
// Run: node tests/js/failure-sim.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/components/insights/failureModel.js'],
  bundle: true, format: 'esm', write: false,
});
const M = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

test('chip: green can fail, amber tight / stranded, red left out', () => {
  assert.deepEqual(M.n1Chip({ status: 'ok' }), { label: 'can fail', tone: 'green' });
  assert.equal(M.n1Chip({ status: 'tight' }).tone, 'yellow');
  assert.deepEqual(M.n1Chip({ status: 'stranded', cant_restart: 2 }), { label: "2 can't restart", tone: 'yellow' });
  assert.deepEqual(M.n1Chip({ status: 'short', doesnt_fit: 3 }), { label: '3 left out', tone: 'red' });
  assert.equal(M.n1Chip(null).label, '—');
});

test('default node: routed pick, else worst, else first', () => {
  const rows = [{ node: 'pve3', status: 'ok' }, { node: 'pve4', status: 'tight' }, { node: 'pve5', status: 'short' }];
  assert.equal(M.defaultNode(rows, 'pve3'), 'pve3');
  assert.equal(M.defaultNode(rows, 'nope'), 'pve5');
  assert.equal(M.defaultNode([{ node: 'a', status: 'ok' }, { node: 'b', status: 'ok' }]), 'a');
  assert.equal(M.defaultNode([], null), null);
});

test('short verdict', () => {
  const placed = [{ mem_gb: 2 }, { mem_gb: 4 }];
  assert.equal(
    M.shortVerdict({ status: 'ok', placements: placed, cant_restart: [], doesnt_fit: [], busiest: { node: 'pve3', mem_after: 86.4 } }),
    'all 2 guests restart elsewhere, busiest node pve3 at 86% memory',
  );
  assert.equal(
    M.shortVerdict({ status: 'short', placements: placed, cant_restart: [{}], doesnt_fit: [{ mem_gb: 8 }, { mem_gb: 4 }] }),
    "2 guests (12 GB) don't fit elsewhere, 1 can't restart elsewhere",
  );
  assert.equal(M.shortVerdict({ status: 'short', placements: [], cant_restart: [], doesnt_fit: [{ mem_gb: 2.5 }] }), "1 guest (2.5 GB) doesn't fit elsewhere");
  assert.equal(M.shortVerdict({ status: 'stranded', placements: [], cant_restart: [{}, {}], doesnt_fit: [] }), "all 2 guests can't restart elsewhere");
  assert.equal(M.shortVerdict({ status: 'stranded', placements: [{}], cant_restart: [{}], doesnt_fit: [] }), "1 guest restarts elsewhere, 1 can't");
  assert.equal(M.shortVerdict({ status: 'ok', placements: [], cant_restart: [], doesnt_fit: [] }), 'nothing running here needs a new home');
  assert.equal(M.shortVerdict({ status: 'offline' }), null);
  assert.equal(M.shortVerdict(null), null);
});

test('storage mode defaults to capacity', () => {
  globalThis.localStorage = { store: {}, getItem(k) { return this.store[k] ?? null; }, setItem(k, v) { this.store[k] = v; } };
  assert.equal(M.readStorageMode(), 'capacity');
  M.writeStorageMode('strict');
  assert.equal(M.readStorageMode(), 'strict');
  M.writeStorageMode('capacity');
  assert.equal(M.readStorageMode(), 'capacity');
  delete globalThis.localStorage;
  assert.equal(M.readStorageMode(), 'capacity');
});

test('memory bar clamps and never shrinks', () => {
  assert.deepEqual(M.memBar({ mem_before: 40, mem_after: 70 }), { before: 40, added: 30, after: 70, ceiling: 95 });
  assert.deepEqual(M.memBar({ mem_before: 90, mem_after: 120 }, 90), { before: 90, added: 10, after: 100, ceiling: 90 });
  assert.equal(M.memBar({ mem_before: 50, mem_after: 40 }).added, 0);
});
