// Unit tests for the Simple view helpers (simpleView.js).
// Run: node tests/js/simple-view.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/simpleView.js'],
  bundle: true, format: 'esm', write: false,
});
const S = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const mem = () => {
  const m = new Map();
  return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('layout defaults to Calm and survives junk', () => {
  assert.equal(S.matchingPreset(S.readLayout(mem())), 'calm');
  const st = mem();
  st.setItem(S.LAYOUT_KEY, '{not json');
  assert.equal(S.matchingPreset(S.readLayout(st)), 'calm');
  assert.deepEqual(S.normalizeLayout([{ id: 'nodes', wide: 1 }, 'nodes', { id: 'nope' }, 'backups']),
    [{ id: 'nodes', wide: true }, { id: 'backups', wide: false }]);
});

test('layout edits round-trip through storage', () => {
  const st = mem();
  let l = S.presetLayout('wall');
  l = S.toggleWidget(l, 'backups');
  l = S.moveWidget(l, 'backups', -1);
  l = S.toggleWide(l, 'backups');
  assert.equal(S.matchingPreset(l), null);
  S.writeLayout(l, st);
  assert.deepEqual(S.readLayout(st), l);
  assert.deepEqual(l.map(x => x.id), ['status', 'nodes', 'moves', 'backups', 'timeline']);
  assert.equal(S.moveWidget(l, 'status', -1), l);
  assert.deepEqual(S.toggleWidget(l, 'status').map(x => x.id)[0], 'nodes');
});

test('view mode defaults to full', () => {
  const st = mem();
  assert.equal(S.readViewMode(st), 'full');
  S.writeViewMode('simple', st);
  assert.equal(S.readViewMode(st), 'simple');
  assert.equal(S.readViewMode({ getItem() { throw new Error('blocked'); } }), 'full');
});

const NODES = {
  a: { name: 'a', status: 'online', cpu_percent: 72, mem_percent: 50, total_mem_gb: 64 },
  b: { name: 'b', status: 'online', cpu_percent: 20, mem_percent: 91, total_mem_gb: 64 },
  c: { name: 'c', status: 'offline' },
};

test('node rows and tones', () => {
  const r = S.nodeRows(NODES, { cpuLimit: 60, memLimit: 70, maintenanceNodes: ['b'] });
  assert.deepEqual(r.map(x => [x.name, x.cpuTone, x.memTone, x.maintenance]),
    [['a', 'warn', 'ok', false], ['b', 'ok', 'bad', true], ['c', 'none', 'none', false]]);
});

test('cluster line', () => {
  const guests = { 1: { status: 'running' }, 2: { status: 'stopped' }, 3: { template: 1 } };
  assert.deepEqual(S.clusterLine({ nodes: NODES, guests, attentionCount: 2, automationOn: true }),
    { tone: 'bad', text: '1 of 3 nodes down · 2 things need a look', sub: '2 guests, 1 running · automation on' });
  const up = { a: NODES.a, b: NODES.b };
  assert.equal(S.clusterLine({ nodes: up, attentionCount: 0 }).text, 'All 2 nodes up · nothing needs you');
  assert.equal(S.clusterLine({ nodes: up, attentionCount: 1 }).tone, 'warn');
});

test('backup tally', () => {
  const now = 2_000_000_000;
  const g = (name, backup) => ({ name, vmid: name, backup });
  const t = S.backupTally({
    a: g('a', { last_ok: now - 3600, last_attempt_ok: true }),
    b: g('b', { last_ok: now - 5 * 86400, last_attempt_ok: true }),
    c: g('c', { last_ok: now - 86400, last_attempt_ok: false }),
    d: g('d', null),
    e: { name: 'e' },
  }, now);
  assert.equal(t.known, true);
  assert.equal(t.good, 1);
  assert.deepEqual([t.failed, t.stale, t.none].map(l => l.map(x => x.name)), [['c'], ['b'], ['d']]);
  assert.equal(S.backupTally({ x: { name: 'x' } }).known, false);
});

test('recent moves and timeline', () => {
  const now = Date.parse('2026-10-15T20:00:00Z');
  const migs = [
    { vmid: 1, name: 'web', source_node: 'a', target_node: 'b', status: 'completed', timestamp: '2026-10-15T19:00:00+00:00', initiated_by: 'automated',
      reason: 'web should move to b because a has high CPU usage (72% CPU, 50% mem), while b has more capacity.' },
    { vmid: 2, name: 'old', status: 'completed', timestamp: '2026-10-13T19:00:00+00:00' },
    { vmid: 3, name: 'dry', status: 'completed', dry_run: true, timestamp: '2026-10-15T19:30:00+00:00' },
    { vmid: 4, name: 'db', source_node: 'a', target_node: 'c', status: 'failed', error_message: 'no space', timestamp: '2026-10-15T18:00:00+00:00' },
  ];
  const m = S.recentMoves(migs, now);
  assert.deepEqual(m.map(x => [x.name, x.ok, x.why, x.by]), [['web', true, 'CPU on a high', 'automation'], ['db', false, 'no space', 'manual']]);
  const guests = { 9: { vmid: 9, name: 'gpu', backup: { last_ok: now / 1000 - 3 * 86400, last_attempt: now / 1000 - 5400, last_attempt_ok: false, last_error: 'timeout' } },
    8: { vmid: 8, name: 'wiki', backup: { last_ok: now / 1000 - 3600, last_attempt: now / 1000 - 3600, last_attempt_ok: true } } };
  const ev = S.timelineEvents({ migrations: migs, guests, nowMs: now });
  assert.deepEqual(ev.map(e => [e.tone, e.text]), [
    ['info', 'Moved web from a to b'], ['ok', 'Backups: 1 good'], ['bad', 'Backup of gpu failed'], ['bad', 'Move of db failed']]);
});

test('room left counts 4 GB slots under the memory limit', () => {
  const r = S.roomLeft(NODES, { memLimit: 70 });
  // a: 64 GB * 20% = 12.8 GB -> 3; b is over the limit -> 0; c offline.
  assert.equal(r.count, 3);
  assert.deepEqual(r.per, [{ name: 'a', fit: 3 }, { name: 'b', fit: 0 }]);
  assert.equal(S.roomLeft(NODES, { memLimit: 70, maintenanceNodes: ['a'] }).count, 0);
  assert.equal(S.roomLeft(NODES, {}), null);
});

test('needs you merges and ranks', () => {
  const rows = S.needsYou({
    attention: [{ id: 'maintenance', label: 'b in maintenance', tone: 'warn', href: '#/dashboard/nodes' }],
    approvals: [{ vmid: 5, name: 'ci' }],
    backups: { failed: [{ vmid: 9, name: 'gpu' }] },
    crossings: [{ node: 'lyra', metric: 'memory', kind: 'over', days: 9.6 }, { node: 'x', metric: 'cpu', kind: 'crossing', days: 40 }],
  });
  assert.deepEqual(rows.map(r => r.text), [
    'Backup of gpu failed', 'b in maintenance', 'Approve or skip the move of ci', 'lyra memory full in about 10 days']);
  assert.equal(rows[0].href, '#/dashboard/guests/guest/9');
});
