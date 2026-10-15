// Checks the plain-language automation story helpers (src/utils/automationStory.js):
// banner sentence, run story, run grouping and outcome verdicts.
// Run: node tests/js/automation-story.mjs
import { build } from 'esbuild';
const out = await build({ stdin: { contents: "export * as S from './src/utils/automationStory.js';", resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', write: false });
const { S } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

let bad = 0;
const eq = (label, got, want) => {
  if (got !== want) { bad++; console.log(`FAIL ${label}\n  got:  ${JSON.stringify(got)}\n  want: ${JSON.stringify(want)}`); }
  else console.log(`ok   ${label}`);
};
const has = (label, got, frag) => {
  if (!String(got).includes(frag)) { bad++; console.log(`FAIL ${label}\n  got:  ${JSON.stringify(got)}\n  missing: ${JSON.stringify(frag)}`); }
  else console.log(`ok   ${label}`);
};
const lacks = (label, got, frag) => {
  if (String(got).includes(frag)) { bad++; console.log(`FAIL ${label}\n  got:  ${JSON.stringify(got)}\n  must not contain: ${JSON.stringify(frag)}`); }
  else console.log(`ok   ${label}`);
};

const now = new Date('2026-10-12T00:36:33Z');
const ago = (min) => new Date(now - min * 60000).toISOString();
const inWindow = { cluster_health: 'Cluster safety checks passed', migration_window: 'In migration window: During the day (America/Chicago time: 19:33)', running_migrations: 0 };

// Staging's real dry-run run (2026-10-12).
const dryRun = {
  timestamp: ago(3), status: 'success', mode: 'dry_run', migrations_executed: 1, migrations_successful: 1, duration_seconds: 1,
  safety_checks: inWindow,
  decisions: [{ action: 'executed', status: 'completed', name: 'worker-02', vmid: 245, type: 'CT', source_node: 'rigel', target_node: 'lyra',
    priority_rank: 1, total_candidates: 1, target_node_score: 40.87, confidence_score: 92.7,
    reason: 'worker-02 should move to lyra because rigel has elevated CPU usage (51% CPU, 30% of it unmovable, 45% mem; CPU rising), while lyra has more capacity (18% CPU, 49% mem).',
    selected_reason: '✅ SELECTED - Highest priority recommendation (ranked #1 of 1)' }],
};
const realMove = { ...dryRun, mode: 'live', decisions: [{ ...dryRun.decisions[0], name: 'web01' }] };
const nothing = (min) => ({ timestamp: ago(min), status: 'no_action', mode: 'live', migrations_executed: 0, migrations_successful: 0, decisions: [], safety_checks: inWindow });
const waiting = { ...nothing(3), mode: 'dry_run', decisions: [{ action: 'observing', name: 'worker-02', vmid: 245, source_node: 'rigel', target_node: 'lyra', reason: 'Observing 2/3 consecutive runs' }] };
const skippedWindow = { timestamp: ago(3), status: 'skipped', mode: 'unknown', decisions: [],
  safety_checks: { migration_window: 'Outside all migration windows (Current time: Monday 01:00 America/Chicago)', cluster_health: 'Unknown', running_migrations: 0 } };
const skippedCluster = { ...skippedWindow, safety_checks: { ...inWindow, cluster_health: 'Cluster status unknown: the last collection could not read it (Proxmox API timeout)' } };
const failed = { timestamp: ago(3), status: 'failed', mode: 'live', decisions: [], safety_checks: { ...inWindow, cluster_health: 'Cluster not quorate' } };
const held = { ...nothing(3), decisions: [{ action: 'filtered', name: 'db01', vmid: 300, source_node: 'orion', target_node: 'lyra', reason: 'In cooldown period' },
  { action: 'skipped', name: 'web02', vmid: 301, source_node: 'orion', target_node: 'lyra', skip_code: 'target_inflow_cap', reason: 'lyra already received 1 migration this run' }] };

// --- banner sentence ----------------------------------------------------------
eq('dry run sentence', S.lastCheckSentence(dryRun, { now }),
  'Last check 3 min ago: would have moved worker-02 rigel → lyra — dry run, nothing moved.');
eq('real move sentence', S.lastCheckSentence(realMove, { now }), 'Last check 3 min ago: moved web01 rigel → lyra.');
eq('nothing-to-do sentence', S.lastCheckSentence(nothing(3), { now }), 'Last check 3 min ago: nothing to do — all nodes within thresholds.');
eq('waiting sentence', S.lastCheckSentence(waiting, { now }), 'Last check 3 min ago: 1 suggestion still waiting (2 of 3 checks).');
eq('skipped outside window', S.lastCheckSentence(skippedWindow, { now, opensAt: '03:00' }),
  'Last check skipped (3 min ago): outside the migration window (opens 03:00).');
eq('skipped cluster unreadable', S.lastCheckSentence(skippedCluster, { now }), 'Last check skipped (3 min ago): cluster status unreadable.');
eq('failed sentence', S.lastCheckSentence(failed, { now }), 'Last check 3 min ago: failed — Cluster not quorate.');
has('held sentence names reason', S.lastCheckSentence(held, { now }), 'held back db01 — In cooldown period (+1 more)');

// --- outcome kinds / chips -----------------------------------------------------
eq('dry-run chip', S.runOutcome(dryRun).chip, 'would move');
eq('live chip', S.runOutcome(realMove).chip, 'moved');
eq('waiting kind', S.runOutcome(waiting).kind, 'waiting');
eq('skipped kind', S.runOutcome(skippedWindow).kind, 'skipped');
eq('failed kind', S.runOutcome(failed).kind, 'failed');
eq('nothing kind', S.runOutcome(nothing(1)).kind, 'nothing');

// --- banner parts (chip + short subject) ----------------------------------------
const pDry = S.lastCheckParts(dryRun, { now });
eq('dry parts lead', pDry.lead, 'Last check 3 min ago');
eq('dry parts chip', pDry.chip, 'would move');
eq('dry parts subject', pDry.subject, 'worker-02 rigel → lyra');
eq('nothing parts has no subject', S.lastCheckParts(nothing(3), { now }).subject, '');
eq('nothing parts chip', S.lastCheckParts(nothing(3), { now }).chip, 'nothing to do');
eq('waiting parts subject', S.lastCheckParts(waiting, { now }).subject, 'worker-02 rigel → lyra · 2 of 3 checks');
eq('count never exceeds requirement', JSON.stringify(S.observationProgress({ action: 'observing', reason: 'Observing 6/3 consecutive runs' })), JSON.stringify({ seen: 3, need: 3 }));
{
  const run = { timestamp: '2026-10-12T01:45:00Z', mode: 'dry_run', dry_run: true, status: 'success', migrations_executed: 1, migrations_successful: 1,
    decisions: [
      { action: 'executed', name: 'nextcloud', source_node: 'lyra', target_node: 'vega', reason: 'nextcloud must be evacuated because lyra is entering maintenance' },
      ...[2, 3, 4, 5, 6].map(n => ({ action: 'skipped', name: `g${n}`, source_node: 'lyra', target_node: 'vega', reason: `Lower priority - Ranked #${n} of 20` })),
    ] };
  const rows = S.lastCheckRows(run, { now });
  eq('held rows folded into one', rows.filter(r => r.chip === 'held back').length, 1);
  has('held summary text', rows.find(r => r.chip === 'held back').why, '5 guests waiting their turn');
}
eq('skipped parts subject', S.lastCheckParts(skippedWindow, { now, opensAt: '03:00' }).subject, 'outside the migration window (opens 03:00)');
eq('real move parts chip', S.lastCheckParts(realMove, { now }).chip, 'moved');

// --- last-check rows -----------------------------------------------------------------
eq('nothing to do has no rows', S.lastCheckRows(nothing(3)), null);
const rDry = S.lastCheckRows(dryRun, { observationPeriods: 3 });
eq('dry row chip', rDry[0].chip, 'would move');
eq('dry row pips full', JSON.stringify(rDry[0].pips), '{"seen":3,"need":3}');
eq('dry row short why', rDry[0].why, 'CPU on rigel rising');
eq('live row chip', S.lastCheckRows(realMove)[0].chip, 'moved');
const rWait = S.lastCheckRows(waiting, { observationPeriods: 3 });
eq('waiting row pips', JSON.stringify(rWait[0].pips), '{"seen":2,"need":3}');
const rHeld = S.lastCheckRows(held);
eq('held row chip', rHeld[0].chip, 'held back');
has('held row reason', rHeld[0].why, 'cooldown period');
eq('inflow cap row chip', rHeld[1].chip, 'held back');
has('inflow cap row reason', rHeld[1].why, 'per-node limit');
eq('skipped row reason', S.lastCheckRows(skippedWindow)[0].why, 'outside the migration window');
eq('old-format reason rising', S.shortWhy({ reason: 'gitlab should move to vega because rigel has elevated CPU usage (63% CPU, 35% mem with an upward trend), while vega has more capacity (42% CPU, 19% mem).' }), 'CPU on rigel rising');
eq('memory reason not rising', S.shortWhy({ reason: 'x should move to lyra because orion has high memory usage (20% CPU, 81% mem), while lyra has more capacity.' }), 'memory on orion high');
eq('only memory rising does not make CPU rising', S.shortWhy({ reason: 'x should move to lyra because orion has high CPU usage (75% CPU, 40% mem; memory rising), while lyra has more.' }), 'CPU on orion high');

// --- strip layout ------------------------------------------------------------------------
eq('category dry', S.runCategory(dryRun), 'would_move');
eq('category live', S.runCategory(realMove), 'moved');
eq('category skipped', S.runCategory(skippedWindow), 'skipped');
eq('category failed', S.runCategory(failed), 'failed');
eq('category waiting', S.runCategory(waiting), 'waiting');
eq('category nothing', S.runCategory(nothing(1)), 'nothing');
const every30 = Array.from({ length: 60 }, (_, i) => nothing(i * 30)); // 30 h of runs, newest first
const lay = S.stripLayout(every30, { now });
eq('strip keeps only 24 h', lay.items.length, 49);
eq('strip oldest first', lay.items[0].t < lay.items[lay.items.length - 1].t, true);
eq('strip ticks every 6 h', lay.ticks.length >= 3 && lay.ticks.length <= 4, true);
eq('ticks never crowd', lay.ticks.every((t, i) => i === 0 || t.index - lay.ticks[i - 1].index >= 3), true);
eq('tick leaves room for now', lay.ticks.every(t => lay.items.length - t.index >= 3), true);
eq('days split', lay.days.length >= 1 && lay.days.reduce((a, d) => a + d.items.length, 0), 49);
eq('legend only present categories', JSON.stringify(lay.categories), '["nothing"]');
const few = S.stripLayout([dryRun, waiting, nothing(40)], { now });
eq('short history shows what exists', few.items.length, 3);
eq('mixed legend order', JSON.stringify(few.categories), '["nothing","waiting","would_move"]');
eq('empty strip', S.stripLayout([], { now }).items.length, 0);

// --- last real move --------------------------------------------------------------------
const recent = [{ dry_run: true, status: 'completed', name: 'worker-02' }, { dry_run: false, status: 'completed', name: 'gitlab' }];
eq('last real move skips dry run', S.lastRealMove(recent).name, 'gitlab');
eq('no real move', S.lastRealMove([recent[0]]), null);

// --- outcome verdicts ----------------------------------------------------------------------
const snap = (cpu, mem = 40, late = false) => ({ late, source_node: { cpu, mem }, timestamp: '2026-10-10T20:48:16Z' });
const outcome = (verdict, pre, p5, p24, status = 'completed') => ({ status, verdict, source_node: 'rigel', target_node: 'vega',
  pre_migration: { ...snap(pre), timestamp: '2026-10-10T20:30:05Z' }, post_5min: snap(p5), post_24h: p24 == null ? null : snap(p24) });
// A real-world gitlab move: 89% → 70% (5 min) → 72% (24 h), verdict beneficial, 24 h mem up.
const helped = outcome('beneficial', 88.84, 70.48, 72.02);
const h = S.outcomeHeadline(helped);
eq('helped verdict', h.verdict, 'helped');
eq('helped tone green', h.tone, 'green');
eq('headline uses 24 h', S.headlineText(h), 'rigel CPU 89% → 72% after 24 h');
const worse = S.outcomeHeadline(outcome('harmful', 40, 45, 52));
eq('worse verdict', worse.verdict, 'worse');
eq('worse tone red', worse.tone, 'red');
eq('contradictory helped downgraded', S.outcomeHeadline(outcome('beneficial', 40, 38, 50)).verdict, 'no_change');
eq('contradictory worse downgraded', S.outcomeHeadline(outcome('harmful', 60, 50, 40)).verdict, 'no_change');
const pend = S.outcomeHeadline(outcome(null, 80, 60, null, 'pending_24h'));
eq('pending measuring', pend.verdict, 'measuring');
eq('pending headline 5 min', S.headlineText(pend), 'rigel CPU 80% → 60% after 5 min');
const late = S.outcomeHeadline({ ...helped, post_24h: snap(72, 40, true) });
eq('late 24 h is unclear', late.verdict, 'unclear');
eq('summary', S.outcomesSummary([helped, helped, outcome('harmful', 40, 45, 52)]), 'Last 3 moves: 2 helped, 1 made things worse');
eq('summary single', S.outcomesSummary([helped]), 'Last move: helped');
eq('missing value is a dash', S.formatPct(null), '—');

// --- diverging bars ----------------------------------------------------------------------
eq('cpu change helped', S.cpuChange(h), -17);
eq('signed minus', S.signedPoints(-43), '−43');
eq('signed plus', S.signedPoints(14), '+14');
eq('signed missing', S.signedPoints(null), '—');
eq('bar scale rounds up', S.barScale([-43, 14, null]), 50);
eq('bar scale floor', S.barScale([2]), 10);
eq('bar left for quieter', JSON.stringify(S.barGeometry(-25, 50)), '{"side":"left","pct":50}');
eq('bar right for busier', S.barGeometry(14, 50).side, 'right');
eq('bar clamps', S.barGeometry(80, 50).pct, 100);
// Verdict colour must match bar direction for every real-shaped case.
for (const [v, pre, p24] of [['beneficial', 88, 72], ['harmful', 52, 85], ['beneficial', 40, 50], ['harmful', 60, 40], ['neutral', 50, 49]]) {
  const hh = S.outcomeHeadline(outcome(v, pre, pre, p24));
  const side = S.barGeometry(S.cpuChange(hh), 50).side;
  const ok = (hh.tone === 'green' && side === 'left') || (hh.tone === 'red' && side === 'right') || hh.tone === 'gray';
  eq(`bar/verdict agree ${v} ${pre}->${p24}`, ok, true);
}
const tally = S.helpedTally([helped, helped, outcome('harmful', 40, 45, 52), outcome('neutral', 50, 50, 49), outcome(null, 80, 60, null, 'pending_24h')]);
eq('tally helped', tally.helped, 2);
eq('tally excludes measuring', tally.total, 4);
eq('tally segments grouped', tally.segments.join(','), 'green,green,gray,red');

console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
