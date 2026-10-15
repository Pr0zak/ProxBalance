// Semi-automatic mode in the automation story helpers: queued decisions get
// their own outcome, chip, strip category and status label; queue rows.
// Run: node tests/js/semi-auto.mjs
import { build } from 'esbuild';
const out = await build({
  stdin: { contents: "export * as S from './src/utils/automationStory.js'; export * as F from './src/utils/formatters.js';", resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'esm', write: false,
});
const { S, F } = await import('data:text/javascript,' + encodeURIComponent(out.outputFiles[0].text));

let bad = 0;
const eq = (label, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g !== w) { bad++; console.log(`FAIL ${label}\n  got:  ${g}\n  want: ${w}`); }
  else console.log(`ok   ${label}`);
};

const now = new Date('2026-10-14T12:00:00Z');
const ago = (min) => new Date(now - min * 60000).toISOString();
const inMin = (min) => new Date(now.getTime() + min * 60000).toISOString();
const reason = 'web01 should move to pve6 because pve4 has elevated CPU usage (71% CPU, 50% mem), while pve6 has more capacity (20% CPU, 30% mem).';
const queuedD = { action: 'queued', name: 'web01', vmid: 101, source_node: 'pve4', target_node: 'pve6', reason };
const live = (decisions, extra = {}) => ({ timestamp: ago(2), status: 'no_action', mode: 'live', decisions, safety_checks: {}, ...extra });

// --- outcome ---------------------------------------------------------------------
const q = live([queuedD]);
eq('queued kind', S.runOutcome(q).kind, 'queued');
eq('queued chip', S.runOutcome(q).chip, 'needs approval');
eq('queued tone differs from moved', [S.runOutcome(q).tone, S.runOutcome(live([{ ...queuedD, action: 'executed' }], { status: 'success' })).tone], ['blue', 'green']);
eq('dry-run queued chip', S.runOutcome({ ...q, mode: 'dry_run' }).chip, 'would ask');
eq('queued strip category', S.runCategory(q), 'queued');
eq('legend has queued', S.CATEGORY_LABELS.some(([c, l]) => c === 'queued' && l === 'needs approval'), true);
eq('queued summary', S.runSummary(q), 'asks approval to move web01 pve4 → pve6');
eq('dry-run queued summary', S.runSummary({ ...q, mode: 'dry_run' }), 'would ask approval to move web01 pve4 → pve6 — dry run, nothing queued');
eq('queued last-check subject', S.lastCheckParts(q, { now }).subject, 'web01 pve4 → pve6');

// A run that moved one guest and queued another: moved wins, summary says both.
const mixed = live([{ action: 'executed', name: 'db01', vmid: 102, source_node: 'pve5', target_node: 'pve6', reason, auto_run: 'critical', auto_run_detail: 'pve5 CPU 92% > 85%' }, queuedD], { status: 'success' });
eq('mixed kind', S.runOutcome(mixed).kind, 'moved');
eq('mixed summary', S.runSummary(mixed), 'moved db01 pve5 → pve6; 1 move needs approval');
const rows = S.lastCheckRows(mixed, { now });
eq('mixed rows chips', rows.map(r => r.chip), ['moved', 'needs approval']);
eq('critical auto-run why', rows[0].why, 'pve5 CPU 92% > 85%');
eq('approved auto-run why', S.autoRunWhy({ ...queuedD, auto_run: 'approved' }), 'approved · CPU on pve4 elevated');

// Automatic-mode runs are unchanged by the new kind.
eq('plain held run still held', S.runOutcome(live([{ ...queuedD, action: 'filtered', reason: 'In cooldown period' }])).kind, 'held');

// --- status label ------------------------------------------------------------------
eq('status label', F.runStatusLabel(q).label, 'Needs Approval');
eq('status banner', F.runStatusLabel(q).banner, '1 move waiting for approval on the Automation page.');
eq('dry-run status banner', F.runStatusLabel({ ...q, mode: 'dry_run' }).banner, '1 move would wait for approval (dry run: nothing queued).');

// --- modes and queue rows ------------------------------------------------------------
eq('mode lines', S.automationModes({ cpu: 80, mem: 88 }).map(m => [m.id, m.line]), [
  ['automatic', 'Runs every move that passes the rules.'],
  ['semi', 'Runs evacuations and moves off nodes over 80% CPU or 88% memory; asks you about the rest.'],
]);
const entry = { vmid: 101, name: 'web01', source_node: 'pve4', target_node: 'pve6', reason, confidence: 81.6,
  status: 'pending', queued_at: ago(90), expires_at: inMin(22 * 60 + 30) };
const r = S.approvalRow(entry, now);
eq('row parts', [r.name, r.route, r.why, r.approved], ['web01', 'pve4 → pve6', 'CPU on pve4 elevated', false]);
eq('row detail', r.detail, `${reason.replace(/\.$/, '')} · confidence 82% · queued 1 h ago · expires in 22 h`);
eq('approved row', S.approvalRow({ ...entry, status: 'approved' }, now).approved, true);
eq('pending approvals', S.pendingApprovals([entry, { ...entry, vmid: 2, status: 'approved' }, { ...entry, vmid: 3, status: 'dismissed' }]).map(e => e.vmid), [101]);
eq('inText past', S.inText(ago(5), now), '');
eq('inText minutes', S.inText(inMin(40.5), now), 'in 40 min');

if (bad) { console.log(`\n${bad} failed`); process.exit(1); }
console.log('\nall passed');
