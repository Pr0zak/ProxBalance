// Unit tests for the quick search ranking helper (quickSearch.js).
// Run: node tests/js/quick-search.mjs
import { build } from 'esbuild';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const out = await build({
  entryPoints: ['src/utils/quickSearch.js'],
  bundle: true, format: 'esm', write: false,
});
const { buildSearchItems, rankSearch, scoreToken, isOpenShortcut } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

const tags = (...t) => ({ has_ignore: false, all_tags: t });
const data = {
  nodes: { lyra: { name: 'lyra', status: 'online' }, orion: { name: 'orion', status: 'online' } },
  guests: {
    100: { vmid: 100, name: 'proxbalance', type: 'CT', node: 'lyra', status: 'running', tags: tags('ignore') },
    1001: { vmid: 1001, name: 'media-nextcloud', type: 'CT', node: 'orion', status: 'running', tags: tags('media') },
    106: { vmid: 106, name: 'fileserver', type: 'VM', node: 'lyra', status: 'running', tags: tags() },
    201: { vmid: 201, name: 'proxbalance-mcp', type: 'CT', node: 'orion', status: 'stopped', tags: tags('backup') },
    10: { vmid: 10, name: '100-days', type: 'VM', node: 'orion', status: 'stopped', tags: tags() },
  },
};
const items = buildSearchItems(data);
const keys = (q, n) => rankSearch(items, q, n).map(i => i.key);

test('items: guests, nodes with guest counts, four pages', () => {
  assert.equal(items.filter(i => i.kind === 'guest').length, 5);
  const orion = items.find(i => i.key === 'node:orion');
  assert.equal(orion.guestCount, 3);
  assert.deepEqual(items.filter(i => i.kind === 'page').map(i => i.page), ['dashboard', 'insights', 'automation', 'settings']);
  const g = items.find(i => i.key === 'guest:106');
  assert.equal(g.vmid, '106');
  assert.equal(g.node, 'lyra');
  assert.equal(g.guestType, 'VM');
});

test('exact vmid ranks first, ahead of a name that starts with it', () => {
  assert.deepEqual(keys('100').slice(0, 3), ['guest:100', 'guest:10', 'guest:1001']);
});

test('vmid prefix ranks below name prefix', () => {
  assert.equal(scoreToken(items.find(i => i.key === 'guest:1001'), '10'), 3);
  assert.equal(scoreToken(items.find(i => i.key === 'guest:10'), '10'), 0);
  assert.equal(scoreToken(items.find(i => i.key === 'guest:10'), '100'), 2);
});

test('name prefix, then word start, then substring', () => {
  assert.deepEqual(keys('prox'), ['guest:100', 'guest:201']);
  assert.deepEqual(keys('nextcloud'), ['guest:1001']);
  assert.deepEqual(keys('serv'), ['guest:106']);
});

test('tags match exact and partial', () => {
  assert.deepEqual(keys('media'), ['guest:1001']);
  assert.deepEqual(keys('back'), ['guest:201']);
});

test('nodes and pages are searchable; empty query lists them, not guests', () => {
  assert.deepEqual(keys('orion'), ['node:orion']);
  assert.deepEqual(keys('sett'), ['page:settings']);
  const empty = keys('');
  assert.ok(empty.every(k => !k.startsWith('guest:')));
  assert.equal(empty.length, 6);
});

test('subsequence fallback, case-insensitive, multi-token AND', () => {
  assert.deepEqual(keys('FLSV'), ['guest:106']);
  assert.deepEqual(keys('prox mcp'), ['guest:201']);
  assert.deepEqual(keys('zzz'), []);
  assert.equal(scoreToken(items.find(i => i.key === 'guest:106'), 'f'), 2);
});

test('limit caps results', () => {
  assert.equal(rankSearch(items, 'p', 2).length, 2);
});

test('missing data is safe', () => {
  assert.equal(buildSearchItems(null).length, 4);
  assert.deepEqual(rankSearch([], 'x'), []);
});

test('shortcuts: Ctrl/Cmd+K anywhere, "/" only outside text fields', () => {
  const div = { tagName: 'DIV' };
  assert.equal(isOpenShortcut({ key: 'k', ctrlKey: true, target: { tagName: 'INPUT' } }), true);
  assert.equal(isOpenShortcut({ key: 'K', metaKey: true, target: div }), true);
  assert.equal(isOpenShortcut({ key: 'k', target: div }), false);
  assert.equal(isOpenShortcut({ key: '/', target: div }), true);
  assert.equal(isOpenShortcut({ key: '/', target: { tagName: 'INPUT' } }), false);
  assert.equal(isOpenShortcut({ key: '/', target: { tagName: 'TEXTAREA' } }), false);
  assert.equal(isOpenShortcut({ key: '/', target: { tagName: 'DIV', isContentEditable: true } }), false);
  assert.equal(isOpenShortcut({ key: '/', ctrlKey: true, target: div }), false);
});
