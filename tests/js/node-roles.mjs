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

const nodes = { pve3: { name: 'pve3' }, pve4: { name: 'pve4' }, pve5: { name: 'pve5' }, pve6: { name: 'pve6' } };
const rec = (vmid, name, source_node, target_node) => ({ vmid, name, source_node, target_node });

test('no suggestions and no maintenance: every node has no role, legend hidden', () => {
  const roles = nodeRoles({ nodes, recommendations: [], maintenanceNodes: new Set() });
  assert.deepEqual(Object.keys(roles).sort(), ['pve3', 'pve4', 'pve5', 'pve6']);
  assert.ok(Object.values(roles).every(r => r === null));
  assert.equal(anyRole(roles), false);
});

test('giving and receiving with counts and the sentence', () => {
  const roles = nodeRoles({ nodes, recommendations: [
    rec(101, 'sonarr', 'pve4', 'pve6'), rec(102, 'prowlarr', 'pve4', 'pve6'), rec(103, 'grafana', 'pve4', 'pve6'),
  ] });
  assert.equal(roles.pve4.kind, 'giving');
  assert.equal(roles.pve4.count, 3);
  assert.equal(roles.pve4.sentence, 'Giving 3 guests: sonarr, prowlarr, grafana → pve6');
  assert.equal(roles.pve6.kind, 'receiving');
  assert.equal(roles.pve6.count, 3);
  assert.equal(roles.pve6.sentence, 'Receiving 3 guests: sonarr, prowlarr, grafana from pve4');
  assert.equal(roles.pve3, null);
  assert.equal(anyRole(roles), true);
});

test('names are grouped by the other node', () => {
  const roles = nodeRoles({ nodes, recommendations: [
    rec(1, 'a', 'pve4', 'pve6'), rec(2, 'b', 'pve4', 'pve5'), rec(3, 'c', 'pve4', 'pve6'),
  ] });
  assert.equal(roles.pve4.sentence, 'Giving 3 guests: a, c → pve6; b → pve5');
});

test('both ways: net direction wins, tooltip keeps both counts', () => {
  const roles = nodeRoles({ nodes, recommendations: [
    rec(1, 'a', 'pve4', 'pve6'), rec(2, 'b', 'pve4', 'pve5'), rec(3, 'c', 'pve3', 'pve4'),
  ] });
  assert.equal(roles.pve4.kind, 'giving');
  assert.equal(roles.pve4.outCount, 2);
  assert.equal(roles.pve4.inCount, 1);
  assert.match(roles.pve4.tooltip, /Giving 2 guests/);
  assert.match(roles.pve4.tooltip, /Receiving 1 guest: c from pve3/);
  assert.match(roles.pve4.tooltip, /2 off, 1 on/);
  assert.match(roles.pve4.sentence, /Also receiving 1 guest/);

  const more = nodeRoles({ nodes, recommendations: [
    rec(1, 'a', 'pve4', 'pve6'), rec(2, 'b', 'pve3', 'pve4'), rec(3, 'c', 'pve5', 'pve4'),
  ] });
  assert.equal(more.pve4.kind, 'receiving');
  assert.equal(more.pve4.count, 2);
});

test('a tie counts as giving', () => {
  const roles = nodeRoles({ nodes, recommendations: [rec(1, 'a', 'pve4', 'pve6'), rec(2, 'b', 'pve3', 'pve4')] });
  assert.equal(roles.pve4.kind, 'giving');
  assert.equal(roles.pve4.count, 1);
});

test('maintenance wins over giving and keeps the guests leaving', () => {
  const roles = nodeRoles({
    nodes, maintenanceNodes: ['pve5'],
    recommendations: [rec(1, 'grafana', 'pve5', 'pve3'), rec(2, 'influx', 'pve5', 'pve3')],
  });
  assert.equal(roles.pve5.kind, 'maintenance');
  assert.equal(roles.pve5.count, 2);
  assert.equal(roles.pve5.sentence, 'In maintenance — 2 guests suggested to leave: grafana, influx → pve3');
  assert.equal(roles.pve3.kind, 'receiving');
  const idle = nodeRoles({ nodes, maintenanceNodes: new Set(['pve6']) });
  assert.equal(idle.pve6.kind, 'maintenance');
  assert.equal(idle.pve6.count, 0);
});

test('long lists are cut with a +N more', () => {
  const recs = Array.from({ length: 9 }, (_, i) => rec(i, `g${i}`, 'pve4', 'pve6'));
  const roles = nodeRoles({ nodes, recommendations: recs });
  assert.equal(roles.pve4.count, 9);
  assert.match(roles.pve4.sentence, /g5 → pve6 \+3 more$/);
});

test('tolerates missing input, nodes as an array, and same-node junk', () => {
  assert.deepEqual(nodeRoles(), {});
  const roles = nodeRoles({ nodes: ['pve3', { name: 'pve4' }], recommendations: [null, rec(1, 'x', 'pve3', 'pve3'), rec(2, '', 'pve3', 'pve4')] });
  assert.equal(roles.pve3.kind, 'giving');
  assert.equal(roles.pve3.sentence, 'Giving 1 guest: guest 2 → pve4');
});
