// Change log helpers: query string per filter chip, failure tone, detail rows, time label.
// Run: node tests/js/change-log.mjs
import { build } from 'esbuild';
const out = await build({
  stdin: { contents: "export * as C from './src/utils/changeLog.js';", resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', write: false,
});
const { C } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

let bad = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { bad++; console.log(`FAIL ${label}\n  got:  ${g}\n  want: ${w}`); }
  else console.log(`ok   ${label}`);
};

eq('no filter: limit only', C.buildQuery(), 'limit=50');
eq('source chip', C.buildQuery({ source: 'automation' }), 'limit=50&source=automation');
eq('type chip expands to its groups', C.buildQuery({ type: 'moves' }),
  'limit=50&action=migration%2Cevacuation%2Crules%2Capproval');
eq('unknown type ignored', C.buildQuery({ type: 'nope' }), 'limit=50');
eq('cursor passed through', C.buildQuery({ before: '2026-10-01T00:00:00Z|5', limit: 10 }),
  'limit=10&before=2026-10-01T00%3A00%3A00Z%7C5');

// every server action group is covered by exactly one type chip
const groups = ['migration', 'evacuation', 'rules', 'approval', 'automation', 'maintenance',
  'config', 'tag', 'silence', 'update', 'service'];
eq('chips cover every group once', groups.map(g => C.TYPE_CHIPS.filter(c => c.groups.includes(g)).length),
  groups.map(() => 1));

eq('failed is bad', C.eventTone('migration.failed'), 'bad');
eq('rolled back is bad', C.eventTone('update.rolled_back'), 'bad');
eq('automation error is bad', C.eventTone('automation.error'), 'bad');
eq('done is neutral', C.eventTone('migration.done'), null);

eq('detail rows', C.detailRows({
  action: 'config.change', actor: '192.168.1.50',
  details: { keys: ['a.b', 'c'], endpoint: 'POST /api/config', empty: '', dry_run: false },
}), [['keys', 'a.b, c'], ['endpoint', 'POST /api/config'], ['dry run', 'no'], ['from', '192.168.1.50'],
  ['action', 'config.change']]);
eq('batch moves: one line each', C.detailRows({
  details: { moves: [{ vmid: 1, target_node: 'b', started: true }, { vmid: 2, target_node: 'c', started: false }] },
})[0], ['moves', 'vmid: 1 · target_node: b · started: yes\nvmid: 2 · target_node: c · started: no']);

const now = new Date('2026-10-14T18:00:00Z');
const today = C.formatWhen('2026-10-14T15:05:00Z', now);
eq('today: no day, a time', today.day === '' && /\d{1,2}:\d{2}/.test(today.time), true);
eq('earlier this year shows date', /Oct/.test(C.formatWhen('2026-10-03T15:05:00Z', now).day), true);
eq('other year shows year', /2025/.test(C.formatWhen('2025-10-03T15:05:00Z', now).day), true);
eq('garbage passes through', C.formatWhen('not a date', now), { day: 'not a date', time: '' });

if (bad) { console.log(`\n${bad} failed`); process.exit(1); }
console.log('\nall passed');
