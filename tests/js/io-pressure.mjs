// Unit tests for the node IO pressure fact (nodeCondition.js ioPressureFact).
// Run: node tests/js/io-pressure.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/nodeCondition.js'],
  bundle: true, format: 'esm', write: false,
});
const { ioPressureFact, penaltyList } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

test('no PSI fields (PVE 8): nothing to show', () => {
  assert.equal(ioPressureFact({ current_iowait: 12, avg_iowait: 8 }), null);
  assert.equal(ioPressureFact(undefined), null);
  assert.equal(ioPressureFact({ recent_io_pressure: null }), null);
});

test('recent average wins over the latest sample, plain words', () => {
  const f = ioPressureFact({ recent_io_pressure: 77.6, current_io_pressure: 10, avg_io_pressure: 20.4, avg_io_pressure_week: 32.6 });
  assert.equal(f.pct, 77.6);
  assert.equal(f.text, 'IO pressure 78% (time tasks waited on disk)');
  assert.match(f.title, /24h avg 20%, 7-day avg 33%/);
});

test('0% pressure is a real reading, not absent', () => {
  const f = ioPressureFact({ current_io_pressure: 0 });
  assert.equal(f.text, 'IO pressure 0% (time tasks waited on disk)');
});

test('the IO pressure penalty has a label', () => {
  const [p] = penaltyList({ penalty_breakdown: { io_pressure_sustained: 10 } });
  assert.equal(p.label, 'IO pressure 7d');
  assert.match(p.description, /waited on disk/);
});
