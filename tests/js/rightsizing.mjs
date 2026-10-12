// Unit tests for the right-sizing text helpers (src/utils/rightsizing.js).
// Run: node tests/js/rightsizing.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/rightsizing.js'],
  bundle: true, format: 'esm', write: false,
});
const M = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

test('cpu hint line', () => {
  assert.equal(M.hintText({ kind: 'cpu', current: 4, suggested: 2, avg_pct: 3.2, p95_pct: 12.4 }),
    '4 vCPU → 2 (avg 3%, p95 12%)');
  assert.equal(M.hintText({ kind: 'cpu', current: 2, suggested: 1, avg_pct: 0.2, p95_pct: 0 }),
    '2 vCPU → 1 (avg <1%, p95 0%)');
});

test('memory hint line uses GB and MB as people write them', () => {
  assert.equal(M.hintText({ kind: 'memory', current_gb: 8, suggested_gb: 3, avg_gb: 1.94, p95_gb: 2.2 }),
    '8 GB → 3 GB (avg 1.9 GB, p95 2.2 GB)');
  assert.equal(M.hintText({ kind: 'memory', current_gb: 2, suggested_gb: 0.5, avg_gb: 0.11, p95_gb: 0.12 }),
    '2 GB → 512 MB (avg 113 MB, p95 123 MB)');
});

test('mostly stopped line', () => {
  assert.equal(M.hintText({ kind: 'stopped', running_pct: 12.3 }), 'mostly stopped (running 12% of the week)');
});

test('totals', () => {
  assert.equal(M.totalsText({ vcpus_freed: 9, gb_freed: 14 }), 'could free 9 vCPUs and 14 GB');
  assert.equal(M.totalsText({ vcpus_freed: 1, gb_freed: 0 }), 'could free 1 vCPU');
  assert.equal(M.totalsText({ vcpus_freed: 0, gb_freed: 0 }), null);
});

test('panel line', () => {
  assert.equal(M.panelLine(null), null);
  assert.equal(M.panelLine({ status: 'no_data', hints: [] }), null);
  assert.equal(M.panelLine({ status: 'not_enough_history', days: 1.5, hints: [] }), 'Not enough history yet (1.5 of 3 days)');
  assert.equal(M.panelLine({ status: 'ok', hints: [] }), 'Fits its allocation');
  assert.equal(M.panelLine({ status: 'ok', hints: [
    { kind: 'cpu', current: 2, suggested: 1, avg_pct: 1, p95_pct: 2 },
    { kind: 'memory', current_gb: 4, suggested_gb: 1, avg_gb: 0.4, p95_gb: 0.5 },
  ] }), '2 vCPU → 1 (avg 1%, p95 2%) · 4 GB → 1 GB (avg 410 MB, p95 512 MB)');
});
