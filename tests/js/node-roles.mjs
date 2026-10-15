// Unit tests for the node role helper (nodeRoles.js).
// Run: node tests/js/node-roles.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/nodeRoles.js'],
  bundle: true, format: 'esm', write: false,
});
const { nodeRoles, anyRole } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const nodes = { lyra: { name: 'lyra' }, orion: { name: 'orion' }, rigel: { name: 'rigel' }, vega: { name: 'vega' } };
const rec = (vmid, name, source_node, target_node) => ({ vmid, name, source_node, target_node });

test('no suggestions and no maintenance: every node has no role, legend hidden', () => {
  const roles = nodeRoles({ nodes, recommendations: [], maintenanceNodes: new Set() });
  assert.deepEqual(Object.keys(roles).sort(), ['lyra', 'orion', 'rigel', 'vega']);
  assert.ok(Object.values(roles).every(r => r === null));
  assert.equal(anyRole(roles), false);
});

test('giving and receiving with counts and the sentence', () => {
  const roles = nodeRoles({ nodes, recommendations: [
    rec(101, 'nextcloud', 'orion', 'vega'), rec(102, 'mqtt-broker', 'orion', 'vega'), rec(103, 'loki', 'orion', 'vega'),
  ] });
  assert.equal(roles.orion.kind, 'giving');
  assert.equal(roles.orion.count, 3);
  assert.equal(roles.orion.sentence, 'Giving 3 guests: nextcloud, mqtt-broker, loki → vega');
  assert.equal(roles.vega.kind, 'receiving');
  assert.equal(roles.vega.count, 3);
  assert.equal(roles.vega.sentence, 'Receiving 3 guests: nextcloud, mqtt-broker, loki from orion');
  assert.equal(roles.lyra, null);
  assert.equal(anyRole(roles), true);
});

test('names are grouped by the other node', () => {
  const roles = nodeRoles({ nodes, recommendations: [
    rec(1, 'a', 'orion', 'vega'), rec(2, 'b', 'orion', 'rigel'), rec(3, 'c', 'orion', 'vega'),
  ] });
  assert.equal(roles.orion.sentence, 'Giving 3 guests: a, c → vega; b → rigel');
});

test('both ways: net direction wins, tooltip keeps both counts', () => {
  const roles = nodeRoles({ nodes, recommendations: [
    rec(1, 'a', 'orion', 'vega'), rec(2, 'b', 'orion', 'rigel'), rec(3, 'c', 'lyra', 'orion'),
  ] });
  assert.equal(roles.orion.kind, 'giving');
  assert.equal(roles.orion.outCount, 2);
  assert.equal(roles.orion.inCount, 1);
  assert.match(roles.orion.tooltip, /Giving 2 guests/);
  assert.match(roles.orion.tooltip, /Receiving 1 guest: c from lyra/);
  assert.match(roles.orion.tooltip, /2 off, 1 on/);
  assert.match(roles.orion.sentence, /Also receiving 1 guest/);

  const more = nodeRoles({ nodes, recommendations: [
    rec(1, 'a', 'orion', 'vega'), rec(2, 'b', 'lyra', 'orion'), rec(3, 'c', 'rigel', 'orion'),
  ] });
  assert.equal(more.orion.kind, 'receiving');
  assert.equal(more.orion.count, 2);
});

test('a tie counts as giving', () => {
  const roles = nodeRoles({ nodes, recommendations: [rec(1, 'a', 'orion', 'vega'), rec(2, 'b', 'lyra', 'orion')] });
  assert.equal(roles.orion.kind, 'giving');
  assert.equal(roles.orion.count, 1);
});

test('maintenance wins over giving and keeps the guests leaving', () => {
  const roles = nodeRoles({
    nodes, maintenanceNodes: ['rigel'],
    recommendations: [rec(1, 'loki', 'rigel', 'lyra'), rec(2, 'postgres', 'rigel', 'lyra')],
  });
  assert.equal(roles.rigel.kind, 'maintenance');
  assert.equal(roles.rigel.count, 2);
  assert.equal(roles.rigel.sentence, 'In maintenance — 2 guests suggested to leave: loki, postgres → lyra');
  assert.equal(roles.lyra.kind, 'receiving');
  const idle = nodeRoles({ nodes, maintenanceNodes: new Set(['vega']) });
  assert.equal(idle.vega.kind, 'maintenance');
  assert.equal(idle.vega.count, 0);
});

test('long lists are cut with a +N more', () => {
  const recs = Array.from({ length: 9 }, (_, i) => rec(i, `g${i}`, 'orion', 'vega'));
  const roles = nodeRoles({ nodes, recommendations: recs });
  assert.equal(roles.orion.count, 9);
  assert.match(roles.orion.sentence, /g5 → vega \+3 more$/);
});

test('tolerates missing input, nodes as an array, and same-node junk', () => {
  assert.deepEqual(nodeRoles(), {});
  const roles = nodeRoles({ nodes: ['lyra', { name: 'orion' }], recommendations: [null, rec(1, 'x', 'lyra', 'lyra'), rec(2, '', 'lyra', 'orion')] });
  assert.equal(roles.lyra.kind, 'giving');
  assert.equal(roles.lyra.sentence, 'Giving 1 guest: guest 2 → orion');
});
