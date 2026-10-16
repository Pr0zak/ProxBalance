import test from 'node:test';
import assert from 'node:assert/strict';
import { ruleLinks } from '../../src/components/dashboard/clusterMapHelpers.js';

const rules = [
  { id: 'tag:affinity_mon', name: 'affinity_monitoring', kind: 'affinity', hard: false, source: 'tag',
    members: [{ vmid: 150, name: 'prometheus' }, { vmid: 151, name: 'grafana' }, { vmid: 152, name: 'loki' }] },
  { id: 'tag:exclude_web', name: 'exclude_web', kind: 'anti-affinity', hard: true, source: 'tag',
    members: [{ vmid: 150, name: 'prometheus' }, { vmid: 101, name: 'web-01' }] },
  { id: 'pool:solo', name: 'solo', kind: 'affinity', members: [{ vmid: 150 }] },
];
const where = { 150: 'orion', 151: 'orion', 152: 'lyra', 101: 'orion' };

test('links a guest to its rule partners with whether each holds', () => {
  const r = ruleLinks(rules, 150, v => where[v]);
  assert.deepEqual([...r.partners], [['151', 'affinity'], ['152', 'affinity'], ['101', 'anti-affinity']]);
  assert.equal(r.rules.length, 2);
  assert.deepEqual(r.rules[0].others.map(o => [o.name, o.ok]), [['grafana', true], ['loki', false]]);
  assert.deepEqual(r.rules[1].others.map(o => [o.name, o.node, o.ok]), [['web-01', 'orion', false]]);
  assert.equal(r.rules[1].hard, true);
});

test('no rules, or a guest in none', () => {
  assert.equal(ruleLinks(null, 1, () => null).rules.length, 0);
  assert.equal(ruleLinks(rules, 999, v => where[v]).partners.size, 0);
});
