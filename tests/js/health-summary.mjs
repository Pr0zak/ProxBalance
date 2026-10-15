// Unit tests for the plain-words cluster health helper (healthSummary.js).
// Run: node tests/js/health-summary.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/healthSummary.js'],
  bundle: true, format: 'esm', write: false,
});
const M = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

test('phrases: every scoring key maps to a plain phrase', () => {
  const cases = {
    iowait_current: 'disk wait high now',
    iowait_sustained: 'disk wait high this week',
    current_cpu: 'CPU busy now',
    sustained_cpu: 'CPU busy all week',
    cpu_spikes: 'CPU peaks this week',
    cpu_trend: 'CPU rising',
    current_mem: 'memory nearly full',
    mem_trend: 'memory rising',
    predicted_cpu: 'load forecast to rise',
    predicted_mem: 'load forecast to rise',
  };
  for (const [key, phrase] of Object.entries(cases)) assert.equal(M.problemPhrase({ key, label: 'x' }), phrase, key);
});

test('phrases: unknown key falls back to label patterns, then the label', () => {
  assert.equal(M.problemPhrase({ key: 'new_io', label: 'IOWait 7-day avg' }), 'disk wait high this week');
  assert.equal(M.problemPhrase({ key: 'new_io', label: 'IOWait now (15-min avg)' }), 'disk wait high now');
  assert.equal(M.problemPhrase({ key: 'x', label: 'Spike count' }), 'CPU spikes');
  assert.equal(M.problemPhrase({ key: 'x', label: 'Swap Pressure' }), 'swap pressure');
  assert.equal(M.problemPhrase(null), null);
});

test('biggest problem: largest penalty_items entry, else penalty_breakdown', () => {
  const s = { penalty_items: [
    { key: 'current_cpu', label: 'CPU now', points: 5 },
    { key: 'iowait_sustained', label: 'IOWait 7-day avg', points: 20 },
  ] };
  assert.equal(M.biggestProblem(s).key, 'iowait_sustained');
  assert.equal(M.biggestProblem({ penalty_breakdown: { current_mem: 8, cpu_trend: 3, x: 0 } }).key, 'current_mem');
  assert.equal(M.biggestProblem({ penalty_items: [] }), null);
});

test('summary: room on every node', () => {
  const r = M.healthSummary({ node: 'orion', headroom: 57.4, score: {} });
  assert.equal(r.level, 'ok');
  assert.equal(r.headline, 'All nodes have room');
  assert.equal(r.sub, 'Least room: orion · headroom 57/100');
});

test('summary: busy node names its biggest problem', () => {
  const score = { penalty_items: [{ key: 'iowait_sustained', label: 'IOWait 7-day avg', points: 20 }] };
  const warn = M.healthSummary({ node: 'orion', headroom: 33, score });
  assert.equal(warn.level, 'warn');
  assert.equal(warn.headline, 'orion: disk wait high this week');
  assert.equal(warn.sub, 'Busiest node · headroom 33/100');
  assert.equal(M.healthSummary({ node: 'orion', headroom: 12, score }).level, 'crit');
});

test('summary: no penalties but low headroom reads as high base load', () => {
  assert.equal(M.healthSummary({ node: 'rigel', headroom: 40, score: { penalty_items: [] } }).headline, 'rigel: high base load');
});

test('summary: missing headroom is a dash', () => {
  const r = M.healthSummary({ node: null, headroom: null });
  assert.equal(r.headline, '—');
  assert.equal(r.level, null);
});
