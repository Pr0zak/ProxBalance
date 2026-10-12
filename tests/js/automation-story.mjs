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
  decisions: [{ action: 'executed', status: 'completed', name: 'zentry-det-pve5', vmid: 245, type: 'CT', source_node: 'pve5', target_node: 'pve3',
    priority_rank: 1, total_candidates: 1, target_node_score: 40.87, confidence_score: 92.7,
    reason: 'zentry-det-pve5 should move to pve3 because pve5 has elevated CPU usage (51% CPU, 30% of it unmovable, 45% mem; CPU rising), while pve3 has more capacity (18% CPU, 49% mem).',
    selected_reason: '✅ SELECTED - Highest priority recommendation (ranked #1 of 1)' }],
};
const realMove = { ...dryRun, mode: 'live', decisions: [{ ...dryRun.decisions[0], name: 'web01' }] };
const nothing = (min) => ({ timestamp: ago(min), status: 'no_action', mode: 'live', migrations_executed: 0, migrations_successful: 0, decisions: [], safety_checks: inWindow });
const waiting = { ...nothing(3), mode: 'dry_run', decisions: [{ action: 'observing', name: 'zentry-det-pve5', vmid: 245, source_node: 'pve5', target_node: 'pve3', reason: 'Observing 2/3 consecutive runs' }] };
const skippedWindow = { timestamp: ago(3), status: 'skipped', mode: 'unknown', decisions: [],
  safety_checks: { migration_window: 'Outside all migration windows (Current time: Monday 01:00 America/Chicago)', cluster_health: 'Unknown', running_migrations: 0 } };
const skippedCluster = { ...skippedWindow, safety_checks: { ...inWindow, cluster_health: 'Cluster status unknown: the last collection could not read it (Proxmox API timeout)' } };
const failed = { timestamp: ago(3), status: 'failed', mode: 'live', decisions: [], safety_checks: { ...inWindow, cluster_health: 'Cluster not quorate' } };
const held = { ...nothing(3), decisions: [{ action: 'filtered', name: 'db01', vmid: 300, source_node: 'pve4', target_node: 'pve3', reason: 'In cooldown period' },
  { action: 'skipped', name: 'web02', vmid: 301, source_node: 'pve4', target_node: 'pve3', skip_code: 'target_inflow_cap', reason: 'pve3 already received 1 migration this run' }] };

// --- banner sentence ----------------------------------------------------------
eq('dry run sentence', S.lastCheckSentence(dryRun, { now }),
  'Last check 3 min ago: would have moved zentry-det-pve5 pve5 → pve3 — dry run, nothing moved.');
eq('real move sentence', S.lastCheckSentence(realMove, { now }), 'Last check 3 min ago: moved web01 pve5 → pve3.');
eq('nothing-to-do sentence', S.lastCheckSentence(nothing(3), { now }), 'Last check 3 min ago: nothing to do — all nodes within thresholds.');
eq('waiting sentence', S.lastCheckSentence(waiting, { now }), 'Last check 3 min ago: 1 suggestion still waiting (2 of 3 checks).');
eq('skipped outside window', S.lastCheckSentence(skippedWindow, { now, opensAt: '03:00' }),
  'Last check skipped (3 min ago): outside the migration window (opens 03:00).');
eq('skipped cluster unreadable', S.lastCheckSentence(skippedCluster, { now }), 'Last check skipped (3 min ago): cluster status unreadable.');
eq('failed sentence', S.lastCheckSentence(failed, { now }), 'Last check 3 min ago: failed — Cluster not quorate.');
has('held sentence names reason', S.lastCheckSentence(held, { now }), 'held back db01 — In cooldown period (+1 more)');

// --- outcome kinds / chips -----------------------------------------------------
eq('dry-run chip', S.runOutcome(dryRun).chip, 'would move 1');
eq('live chip', S.runOutcome(realMove).chip, 'moved 1');
eq('waiting kind', S.runOutcome(waiting).kind, 'waiting');
eq('skipped kind', S.runOutcome(skippedWindow).kind, 'skipped');
eq('failed kind', S.runOutcome(failed).kind, 'failed');
eq('nothing kind', S.runOutcome(nothing(1)).kind, 'nothing');

// --- story -----------------------------------------------------------------------
const story = S.runStory(dryRun, { observationPeriods: 3 });
eq('story first line', story.lines[0], 'Checked 1 suggestion.');
has('story says why', story.lines[1], 'pve5 has elevated CPU usage');
has('story says ready', story.lines[1], 'suggested 3 checks in a row, so it was ready');
eq('story dry-run ending', story.lines[story.lines.length - 1], 'Dry run: logged, not moved.');
lacks('story has no jargon', story.lines.join(' '), 'SELECTED');
lacks('story has no score', story.lines.join(' '), '40.87');
eq('live story ending', S.runStory(realMove).lines.slice(-1)[0], 'Moved 1 guest.');
const heldStory = S.runStory(held);
eq('held lines', heldStory.held.length, 2);
has('inflow cap reason', heldStory.held[1].text, 'tried again next check');
const manyHeld = { ...held, decisions: Array.from({ length: 5 }, (_, i) => ({ action: 'filtered', name: `g${i}`, vmid: i, reason: 'Has \'ignore\' tag' })) };
eq('held top 3', S.runStory(manyHeld).held.length, 3);
eq('held +N more', S.runStory(manyHeld).moreHeld, 2);
has('skipped story', S.runStory(skippedWindow, { opensAt: '03:00' }).lines[0], 'outside the migration window (opens 03:00)');

// --- grouping ----------------------------------------------------------------------
const runs = [dryRun, nothing(30), nothing(60), nothing(90), skippedWindow, { ...skippedWindow, timestamp: ago(150) }, realMove, nothing(240)];
const groups = S.groupRuns(runs);
eq('group count', groups.length, 5);
eq('nothing runs collapse', groups[1].count, 3);
eq('same-reason skips collapse', groups[2].count, 2);
has('collapsed line', S.groupLine(groups[1]), '3 checks, nothing to do · ');
eq('single run line', S.groupLine(groups[0]), 'would have moved zentry-det-pve5 pve5 → pve3 — dry run, nothing moved');
eq('non-adjacent nothing stays separate', groups[4].count, 1);

// --- last real move --------------------------------------------------------------------
const recent = [{ dry_run: true, status: 'completed', name: 'zentry-det-pve5' }, { dry_run: false, status: 'completed', name: 'atlas' }];
eq('last real move skips dry run', S.lastRealMove(recent).name, 'atlas');
eq('no real move', S.lastRealMove([recent[0]]), null);

// --- outcome verdicts ----------------------------------------------------------------------
const snap = (cpu, mem = 40, late = false) => ({ late, source_node: { cpu, mem }, timestamp: '2026-10-10T20:48:16Z' });
const outcome = (verdict, pre, p5, p24, status = 'completed') => ({ status, verdict, source_node: 'pve5', target_node: 'pve6',
  pre_migration: { ...snap(pre), timestamp: '2026-10-10T20:30:05Z' }, post_5min: snap(p5), post_24h: p24 == null ? null : snap(p24) });
// Production's atlas move: 89% → 70% (5 min) → 72% (24 h), verdict beneficial, 24 h mem up.
const helped = outcome('beneficial', 88.84, 70.48, 72.02);
const h = S.outcomeHeadline(helped);
eq('helped verdict', h.verdict, 'helped');
eq('helped tone green', h.tone, 'green');
eq('headline uses 24 h', S.headlineText(h), 'pve5 CPU 89% → 72% after 24 h');
const worse = S.outcomeHeadline(outcome('harmful', 40, 45, 52));
eq('worse verdict', worse.verdict, 'worse');
eq('worse tone red', worse.tone, 'red');
eq('contradictory helped downgraded', S.outcomeHeadline(outcome('beneficial', 40, 38, 50)).verdict, 'no_change');
eq('contradictory worse downgraded', S.outcomeHeadline(outcome('harmful', 60, 50, 40)).verdict, 'no_change');
const pend = S.outcomeHeadline(outcome(null, 80, 60, null, 'pending_24h'));
eq('pending measuring', pend.verdict, 'measuring');
eq('pending headline 5 min', S.headlineText(pend), 'pve5 CPU 80% → 60% after 5 min');
const late = S.outcomeHeadline({ ...helped, post_24h: snap(72, 40, true) });
eq('late 24 h is unclear', late.verdict, 'unclear');
eq('summary', S.outcomesSummary([helped, helped, outcome('harmful', 40, 45, 52)]), 'Last 3 moves: 2 helped, 1 made things worse');
eq('summary single', S.outcomesSummary([helped]), 'Last move: helped');
eq('missing value is a dash', S.formatPct(null), '—');

console.log(bad ? `${bad} failed` : 'all passed'); process.exit(bad ? 1 : 0);
