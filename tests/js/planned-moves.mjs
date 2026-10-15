// Unit tests for the Cluster Map planned-move helper (plannedMoves.js).
// Run: node tests/js/planned-moves.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/plannedMoves.js'],
  bundle: true, format: 'esm', write: false,
});
const { groupPlannedMoves, layoutPlannedMoves, plannedMovesTop, routeEdge, edgeTitle, edgeWidth } =
  await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const now = new Date('2026-10-14T12:00:00Z');
const rec = (vmid, name, source_node, target_node) => ({ vmid, name, source_node, target_node });
const guests = {
  101: { vmid: 101, name: 'nextcloud', node: 'orion' },
  102: { vmid: 102, name: 'mqtt-broker', node: 'orion' },
  103: { vmid: 103, name: 'loki', node: 'orion' },
  104: { vmid: 104, name: 'web01', node: 'rigel' },
  105: { vmid: 105, name: 'db01', node: 'vega' },
};

test('one edge per source → target pair, guests sorted by name', () => {
  const edges = groupPlannedMoves({ recommendations: [
    rec(101, 'nextcloud', 'orion', 'vega'), rec(102, 'mqtt-broker', 'orion', 'vega'), rec(103, 'loki', 'orion', 'rigel'),
  ], guests, now });
  assert.deepEqual(edges.map(e => [e.key, e.count, e.kind]), [['orion->rigel', 1, 'suggested'], ['orion->vega', 2, 'suggested']]);
  assert.deepEqual(edges[1].guests.map(g => g.name), ['mqtt-broker', 'nextcloud']);
  assert.equal(edgeTitle(edges[1]), 'orion → vega: mqtt-broker, nextcloud');
});

test('nothing pending: no edges', () => {
  assert.deepEqual(groupPlannedMoves({ recommendations: [], now }), []);
  assert.deepEqual(groupPlannedMoves({ recommendations: null, approvalQueue: null, now }), []);
});

test('migrating, just-migrated and already-moved guests are not drawn', () => {
  const edges = groupPlannedMoves({
    recommendations: [rec(101, 'nextcloud', 'orion', 'vega'), rec(102, 'mqtt-broker', 'orion', 'vega'), rec(104, 'web01', 'orion', 'vega')],
    guests, inFlight: { 101: true }, now,
  });
  // 101 in flight; 104 is on rigel already, not on its source.
  assert.deepEqual(edges.map(e => [e.key, e.guests.map(g => g.vmid)]), [['orion->vega', [102]]]);
  assert.deepEqual(groupPlannedMoves({ recommendations: [rec(101, 'nextcloud', 'orion', 'vega')], guests, inFlight: { 101: true }, now }), []);
});

test('malformed and same-node entries are skipped', () => {
  const edges = groupPlannedMoves({ recommendations: [
    null, { vmid: 1 }, rec(null, 'x', 'orion', 'vega'), rec(105, 'db01', 'vega', 'vega'),
  ], now });
  assert.deepEqual(edges, []);
});

test('approval-queue entries: own kind, win over the suggestion, skip decided or expired', () => {
  const queue = [
    { ...rec(105, 'db01', 'vega', 'lyra'), status: 'pending', expires_at: '2026-10-15T00:00:00Z' },
    { ...rec(101, 'nextcloud', 'orion', 'vega'), status: 'pending', expires_at: '2026-10-15T00:00:00Z' },
    { ...rec(103, 'loki', 'orion', 'rigel'), status: 'dismissed' },
    { ...rec(104, 'web01', 'rigel', 'lyra'), status: 'approved' },
    { ...rec(102, 'mqtt-broker', 'orion', 'lyra'), status: 'pending', expires_at: '2026-10-14T11:00:00Z' },
  ];
  const edges = groupPlannedMoves({
    recommendations: [rec(101, 'nextcloud', 'orion', 'vega'), rec(102, 'mqtt-broker', 'orion', 'vega')],
    approvalQueue: queue, guests, now,
  });
  assert.deepEqual(edges.map(e => [e.key, e.kind, e.guests.map(g => [g.vmid, g.approval])]), [
    ['orion->vega', 'suggested', [[102, false], [101, true]]],
    ['vega->lyra', 'approval', [[105, true]]],
  ]);
  assert.equal(edgeTitle(edges[0]), 'orion → vega: mqtt-broker, nextcloud (awaiting approval)');
  assert.equal(edgeTitle(edges[1]), 'vega → lyra · awaiting approval: db01');
});

test('stroke width grows with count, capped', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 9].map(edgeWidth), [1.5, 1.5, 2, 2.5, 3, 3]);
});

// Four cards in one row, desktop: 192 px wide, 300 px apart.
const card = (i, top = 24) => ({ left: 54 + i * 300, top, right: 246 + i * 300, bottom: top + 190 });
const row = { lyra: card(0), orion: card(1), rigel: card(2), vega: card(3) };
const inside = (p, r) => p.x > r.left && p.x < r.right && p.y > r.top && p.y < r.bottom;

test('neighbours in a row: straight line between the facing sides, outside both cards', () => {
  const r = routeEdge(row.orion, row.rigel, { others: [row.lyra, row.vega] });
  assert.equal(r.shape, 'line');
  assert.equal(r.d, 'M546,62 L654,62');
  assert.deepEqual(r.mid, { x: 600, y: 62 });
  const back = routeEdge(row.rigel, row.orion, { others: [row.lyra, row.vega] });
  assert.equal(back.d, 'M654,70 L546,70');
});

test('cards in between: arc over the row, label above every card', () => {
  const r = routeEdge(row.lyra, row.vega, { others: [row.orion, row.rigel] });
  assert.equal(r.shape, 'arc');
  assert.ok(r.d.startsWith('M123.1,24 L123.1,'), r.d);
  assert.ok(r.mid.y < 24, `label at y=${r.mid.y} must sit above the cards`);
  Object.values(row).forEach(c => assert.ok(!inside(r.mid, c)));
  // Both endpoints on the left part of the top border (badge is top-right).
  const back = routeEdge(row.vega, row.lyra, { others: [row.orion, row.rigel] });
  assert.ok(back.mid.y < r.mid.y, 'reverse arc rides higher');
});

test('phone width, one column: elbow down the right-hand margin, inside the container', () => {
  const col = { lyra: { left: 75, top: 24, right: 267, bottom: 214 }, vega: { left: 75, top: 900, right: 267, bottom: 1090 } };
  const r = routeEdge(col.lyra, col.vega, { width: 343 });
  assert.equal(r.shape, 'elbow');
  assert.equal(r.d, 'M267,54 L283,54 L283,930 L267,930');
  // Label beside the source card, in the margin.
  assert.deepEqual(r.mid, { x: 283, y: 82 });
  assert.ok(r.mid.x > 267 && r.mid.x < 343 && r.mid.y < col.lyra.bottom);
  const lane3 = routeEdge(col.lyra, col.vega, { width: 280, lane: 3 });
  assert.equal(lane3.mid.x, 276);
  assert.equal(lane3.d.split(' ')[0], 'M267,78');
});

test('two columns, different rows: elbow through the column gap', () => {
  const a = { left: 50, top: 24, right: 242, bottom: 214 };
  const b = { left: 350, top: 600, right: 542, bottom: 790 };
  const r = routeEdge(a, b);
  assert.equal(r.d, 'M242,54 L296,54 L296,630 L350,630');
  assert.deepEqual(r.mid, { x: 296, y: 82 });
  // Short runs keep the label in the middle.
  assert.deepEqual(routeEdge({ ...a, bottom: 60 }, { ...b, top: 70, bottom: 260 }).mid, { x: 296, y: 77 });
});

test('layout: skips unmeasured nodes, gives parallel margin edges their own lane', () => {
  const col = {
    lyra: { left: 75, top: 0, right: 267, bottom: 190 },
    orion: { left: 75, top: 400, right: 267, bottom: 590 },
    rigel: { left: 75, top: 800, right: 267, bottom: 990 },
  };
  const edges = groupPlannedMoves({ recommendations: [
    rec(1, 'a', 'lyra', 'rigel'), rec(2, 'b', 'orion', 'rigel'), rec(3, 'c', 'orion', 'pve9'),
  ], now });
  const laid = layoutPlannedMoves(edges, col, 343);
  assert.deepEqual(laid.map(e => e.key), ['lyra->rigel', 'orion->rigel']);
  assert.deepEqual(laid.map(e => [e.mid.x, e.mid.y]), [[283, 58], [295, 484]]);
});

test('layout: a margin run and a column-gap run next to it are kept apart', () => {
  // Three columns at ~760 px: vega wraps under lyra.
  const rects = {
    lyra: { left: 34, top: 24, right: 226, bottom: 234 },
    orion: { left: 270, top: 24, right: 462, bottom: 234 },
    vega: { left: 34, top: 560, right: 226, bottom: 770 },
  };
  const edges = groupPlannedMoves({ recommendations: [rec(1, 'a', 'lyra', 'vega'), rec(2, 'b', 'orion', 'vega')], now });
  const xs = layoutPlannedMoves(edges, rects, 744).map(e => e.mid.x);
  assert.equal(xs[0], 242);
  assert.ok(Math.abs(xs[1] - xs[0]) >= 8, `runs at ${xs}`);
  assert.ok(xs[1] > 226 && xs[1] < 270, 'gap run stays between the columns');
});

// Five cards in one row, like the 1440 px dashboard.
const five = { a: card(0), b: card(1), c: card(2), d: card(3), e: card(4) };
const endpoints = (e) => { const n = e.d.match(/-?[\d.]+/g).map(Number); return { x1: n[0], x2: n[n.length - 2] }; };

test('layout: long arcs over one row get their own height, endpoints and badge spot', () => {
  const edges = groupPlannedMoves({ recommendations: [
    rec(1, 'g1', 'c', 'a'), rec(2, 'g2', 'c', 'a'),   // c → a, one card between
    rec(3, 'g3', 'b', 'd'), rec(4, 'g4', 'b', 'd'), rec(5, 'g5', 'b', 'd'), // b → d
    rec(6, 'g6', 'b', 'e'),                            // b → e, the longest
    rec(7, 'g7', 'b', 'c'),                            // neighbours: a straight line
  ], now });
  const laid = layoutPlannedMoves(edges, five, 1500);
  const arcs = laid.filter(e => e.shape === 'arc');
  assert.equal(arcs.length, 3);
  assert.equal(laid.find(e => e.key === 'b->c').shape, 'line');
  // Overlapping spans: every arc on its own level, the longest on top.
  assert.equal(new Set(arcs.map(e => e.level)).size, 3);
  const be = arcs.find(e => e.key === 'b->e');
  assert.ok(arcs.every(e => e === be || e.mid.y > be.mid.y), 'longest arc rides highest');
  // No two arc ends share a point, and all sit on the left part of the top border.
  const pts = arcs.flatMap(e => { const p = endpoints(e); return [[e.from, p.x1], [e.to, p.x2]]; });
  pts.forEach(([n, x], i) => {
    assert.ok(x > five[n].left && x < five[n].left + (five[n].right - five[n].left) * 0.55, `${n} end at ${x}`);
    pts.slice(i + 1).forEach(([m, y]) => assert.ok(n !== m || Math.abs(x - y) >= 8, `${n}: ends ${x} and ${y} too close`));
  });
  // Badges don't touch each other.
  laid.forEach((p, i) => laid.slice(i + 1).forEach(q => {
    assert.ok(Math.abs(p.mid.x - q.mid.x) >= 22 || Math.abs(p.mid.y - q.mid.y) >= 16, `${p.key} / ${q.key} badges overlap`);
  }));
  assert.ok(plannedMovesTop(laid) < five.a.top - 26);
});

test('layout: arcs over separate stretches share the lowest level', () => {
  const six = { ...five, f: card(5) };
  const edges = groupPlannedMoves({ recommendations: [rec(1, 'x', 'a', 'c'), rec(2, 'y', 'd', 'f')], now });
  assert.deepEqual(layoutPlannedMoves(edges, six, 2000).map(e => e.level), [0, 0]);
});

test('layout: an elbow badge slides off a line badge in the same column gap', () => {
  // Three columns, e wraps under a. b → a is a straight line, b → e an
  // elbow down the same gap.
  const rects = { a: card(0), b: card(1), c: card(2), e: card(0, 600) };
  const edges = groupPlannedMoves({ recommendations: [rec(1, 'x', 'b', 'a'), rec(2, 'y', 'b', 'e')], now });
  const laid = layoutPlannedMoves(edges, rects, 900);
  const line = laid.find(e => e.shape === 'line');
  const elbow = laid.find(e => e.shape === 'elbow');
  assert.ok(Math.abs(line.mid.x - elbow.mid.x) < 22, 'same gap');
  assert.ok(Math.abs(line.mid.y - elbow.mid.y) >= 16, `badges at ${line.mid.y} and ${elbow.mid.y}`);
  assert.ok(elbow.mid.y > elbow.run[0] && elbow.mid.y < elbow.run[1], 'still on the vertical run');
});

test('plannedMovesTop: highest point, Infinity when nothing is drawn', () => {
  assert.equal(plannedMovesTop([]), Infinity);
  assert.equal(plannedMovesTop([{ top: 12 }, { top: -40 }, {}]), -40);
});
