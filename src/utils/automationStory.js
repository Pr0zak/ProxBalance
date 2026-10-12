/**
 * Plain-language story of what auto-migration did and why.
 *
 * Pure helpers (no React) so they can be unit-tested with node:
 * `node tests/js/automation-story.mjs`.
 *
 * A run from /api/automigrate/history looks like
 *   { timestamp, status: success|partial|failed|skipped|no_action|running|disabled,
 *     mode: live|dry_run, decisions: [...], safety_checks: {...}, ... }
 * and each decision has an `action`: executed|failed|pending|observing|
 * deferred|skipped|filtered. In a dry run, "executed" means the engine
 * logged the move without making it.
 */
import { parseTimestamp, runFailureReason, decisionSkipLabel } from './formatters.js';

const MOVE_ACTIONS = new Set(['executed', 'pending']);
const HELD_ACTIONS = new Set(['filtered', 'skipped', 'deferred']);

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const guestName = (d) => d?.name || (d?.vmid != null ? `guest ${d.vmid}` : 'a guest');
const route = (d) => (d?.source_node && d?.target_node ? `${d.source_node} → ${d.target_node}` : '');

export const isDryRun = (run) => run?.mode === 'dry_run';

/** "just now" / "3 min ago" / "2 h ago" / "4 d ago", or "" without a time. */
export function agoText(ts, now = new Date()) {
  const d = ts instanceof Date ? ts : parseTimestamp(ts);
  if (!d) return '';
  const mins = Math.floor((now - d) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  if (mins < 1440) return `${Math.floor(mins / 60)} h ago`;
  return `${Math.floor(mins / 1440)} d ago`;
}

/** "Oct 10, 15:31" — local wall clock, 24 h. */
export function shortDateTime(ts) {
  const d = ts instanceof Date ? ts : parseTimestamp(ts);
  if (!d) return '';
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${date}, ${time}`;
}

/** "14:00" — local wall clock, 24 h. */
export function clockTime(ts) {
  const d = ts instanceof Date ? ts : parseTimestamp(ts);
  if (!d) return '';
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
}

/** "2 of 3" from an observing decision ("Observing 2/3 consecutive runs"). */
export function observationProgress(d) {
  const r = d?.reasoning;
  let p = null;
  if (r?.observation_count != null && r?.required_observations != null) {
    p = { seen: Number(r.observation_count), need: Number(r.required_observations) };
  } else {
    const m = /(\d+)\s*\/\s*(\d+)/.exec(d?.reason || '');
    if (m) p = { seen: Number(m[1]), need: Number(m[2]) };
  }
  // Runs from before v2.16.0 could count past the requirement ("6/3"); a
  // count can't usefully exceed what's needed, so show it as complete.
  if (p && p.need > 0 && p.seen > p.need) p.seen = p.need;
  return p;
}

/**
 * The "because …" half of a recommendation reason, e.g.
 * "pve5 has elevated CPU usage (51% CPU), while pve3 has more capacity".
 */
export function whyText(d) {
  const reason = d?.reason || '';
  const i = reason.indexOf(' because ');
  if (i >= 0) return reason.slice(i + ' because '.length).replace(/\.\s*$/, '');
  return reason.replace(/\.\s*$/, '');
}

/** Human reason a guest was held back this run. */
export function heldReason(d) {
  const label = decisionSkipLabel(d);
  const reason = (d?.reason || '').replace(/\.\s*$/, '');
  if (d?.skip_code === 'target_inflow_cap') return `${reason || label}; tried again next check`;
  if (label && reason) return `${label}: ${reason}`;
  return reason || label || (d?.action === 'deferred' ? 'deferred' : 'held back');
}

/** Why a whole run was skipped, as a lower-case phrase, or null. */
export function skipReason(run, { opensAt } = {}) {
  const sc = run?.safety_checks || {};
  const win = String(sc.migration_window || '');
  const health = String(sc.cluster_health || '');
  if (/^outside/i.test(win)) return `outside the migration window${opensAt ? ` (opens ${opensAt})` : ''}`;
  const blackout = /^in blackout:\s*([^(]+)/i.exec(win);
  if (blackout) return `inside the ${blackout[1].trim()} blackout${opensAt ? ` (ends ${opensAt})` : ''}`;
  if (/^cluster status unknown/i.test(health)) return 'cluster status unreadable';
  if (/not quorate/i.test(health)) return 'cluster not quorate';
  if (sc.running_migrations > 0) return `${plural(sc.running_migrations, 'migration')} already running`;
  if (health && !/passed|disabled|unknown/i.test(health)) return health.charAt(0).toLowerCase() + health.slice(1);
  return null;
}

/**
 * What one run amounted to.
 * Returns { kind, count, chip, tone, reason }:
 *   kind  — moved | would_move | nothing | waiting | held | skipped | failed | running | off
 *   chip  — short label for an outcome chip ("would move 1", "skipped")
 *   tone  — green | blue | gray | yellow | red | purple (statusBadge colours)
 */
export function runOutcome(run, ctx = {}) {
  if (!run) return { kind: 'none', count: 0, chip: '—', tone: 'gray', reason: null };
  const decisions = Array.isArray(run.decisions) ? run.decisions : [];
  const dry = isDryRun(run);
  const status = run.status;
  if (status === 'running') return { kind: 'running', count: 0, chip: 'running', tone: 'blue', reason: null };
  if (status === 'disabled') return { kind: 'off', count: 0, chip: 'off', tone: 'gray', reason: null };
  if (status === 'skipped') {
    const reason = skipReason(run, ctx);
    return { kind: 'skipped', count: 0, chip: 'skipped', tone: 'gray', reason };
  }
  const moved = decisions.filter(d => MOVE_ACTIONS.has(d.action));
  const failedMoves = decisions.filter(d => d.action === 'failed');
  if (status === 'failed' && moved.length === 0) {
    const reason = failedMoves[0]?.error || runFailureReason(run);
    return { kind: 'failed', count: failedMoves.length, chip: 'failed', tone: 'red', reason: reason || null };
  }
  const movedCount = moved.length || Number(run.migrations_successful || 0);
  if (movedCount > 0) {
    return dry
      ? { kind: 'would_move', count: movedCount, chip: movedCount > 1 ? `would move ${movedCount}` : 'would move', tone: 'yellow', reason: null, failed: failedMoves.length }
      : { kind: 'moved', count: movedCount, chip: movedCount > 1 ? `moved ${movedCount}` : 'moved', tone: failedMoves.length ? 'orange' : 'green', reason: null, failed: failedMoves.length };
  }
  if (failedMoves.length > 0) {
    return { kind: 'failed', count: failedMoves.length, chip: 'failed', tone: 'red', reason: failedMoves[0].error || runFailureReason(run) };
  }
  const observing = decisions.filter(d => d.action === 'observing');
  const held = decisions.filter(d => HELD_ACTIONS.has(d.action));
  if (held.length > 0) return { kind: 'held', count: held.length, chip: 'held back', tone: 'orange', reason: null };
  if (observing.length > 0) return { kind: 'waiting', count: observing.length, chip: 'waiting', tone: 'purple', reason: null };
  return { kind: 'nothing', count: 0, chip: 'nothing to do', tone: 'gray', reason: null };
}

function movePhrase(ds, verb) {
  const first = ds[0];
  const rest = ds.length - 1;
  return `${verb} ${guestName(first)} ${route(first)}${rest > 0 ? ` and ${plural(rest, 'other guest')}` : ''}`.replace(/\s+/g, ' ').trim();
}

function waitingPhrase(observing) {
  const prog = observing.map(observationProgress).filter(Boolean);
  const best = prog.sort((a, b) => b.seen - a.seen)[0];
  const n = observing.length;
  const tail = best ? ` (${n > 1 ? 'furthest along ' : ''}${best.seen} of ${best.need} checks)` : '';
  return `${plural(n, 'suggestion')} still waiting${tail}`;
}

/** What the run did, after the colon: "would have moved x pve5 → pve3 — dry run, nothing moved". */
export function runSummary(run, ctx = {}) {
  const o = runOutcome(run, ctx);
  const decisions = Array.isArray(run?.decisions) ? run.decisions : [];
  const moved = decisions.filter(d => MOVE_ACTIONS.has(d.action));
  switch (o.kind) {
    case 'would_move':
      return `${movePhrase(moved.length ? moved : [{}], 'would have moved')} — dry run, nothing moved`;
    case 'moved': {
      const base = movePhrase(moved.length ? moved : [{}], 'moved');
      return o.failed ? `${base}; ${plural(o.failed, 'move')} failed` : base;
    }
    case 'waiting':
      return waitingPhrase(decisions.filter(d => d.action === 'observing'));
    case 'held': {
      const held = decisions.filter(d => HELD_ACTIONS.has(d.action));
      const first = held[0];
      const more = held.length > 1 ? ` (+${held.length - 1} more)` : '';
      return `held back ${guestName(first)} — ${heldReason(first)}${more}`;
    }
    case 'nothing':
      return 'nothing to do — all nodes within thresholds';
    case 'skipped':
      return o.reason || 'run exited early';
    case 'failed':
      return o.reason ? `failed — ${o.reason}` : 'failed';
    case 'running':
      return 'checking now…';
    case 'off':
      return 'automation was off';
    default:
      return '—';
  }
}

/**
 * The one-sentence banner line for the latest run, e.g.
 *   "Last check 3 min ago: would have moved zentry-det-pve5 pve5 → pve3 — dry run, nothing moved."
 *   "Last check skipped: outside the migration window (opens 03:00)."
 */
export function lastCheckSentence(run, ctx = {}) {
  if (!run) return 'No checks have run yet.';
  const now = ctx.now || new Date();
  const ago = agoText(run.timestamp, now);
  const o = runOutcome(run, ctx);
  if (o.kind === 'running') return 'Checking now…';
  if (o.kind === 'skipped') {
    return `Last check skipped${ago ? ` (${ago})` : ''}: ${o.reason || 'it exited early'}.`;
  }
  return `Last check${ago ? ` ${ago}` : ''}: ${runSummary(run, ctx)}.`;
}

/**
 * A short "why" for a moved/suggested guest, from the engine's reason:
 * "pve5 has elevated CPU usage (51% CPU, 45% mem; CPU rising), …" → "CPU on pve5 rising".
 */
export function shortWhy(d) {
  const reason = d?.reason || '';
  const evac = /because (\S+) is entering maintenance/.exec(reason);
  if (evac) return `${evac[1]} entering maintenance`;
  const m = /because (\S+) has (\w+) (I\/O wait|CPU usage|memory usage)\s*\(([^)]*)\)/.exec(reason);
  if (m) {
    const [, node, severity, what, detail] = m;
    const metric = what.startsWith('I/O') ? 'I/O wait' : what.startsWith('CPU') ? 'CPU' : 'memory';
    const trend = detail.split(';')[1] || '';
    const rising = /upward trend/.test(detail)
      || (/rising/.test(trend) && (metric === 'I/O wait' || new RegExp(metric, 'i').test(trend)));
    return `${metric} on ${node} ${rising ? 'rising' : severity}`;
  }
  if (d?.distribution_balancing) return 'evens out guest counts';
  const why = whyText(d);
  return why.length > 60 ? `${why.slice(0, 57)}…` : why;
}

/** Shorten a held-back reason to fit a chip. */
/**
 * Held-back reason as a short phrase that groups well: every "lower
 * priority, ranked #N of M" guest is simply waiting for a later check.
 */
export function heldKey(d) {
  if (/ranked\s*#?\d+/i.test(d?.reason || '') || /lower priority/i.test(d?.reason || '')) return 'waiting their turn (one move per check)';
  if (d?.skip_code === 'target_inflow_cap') return 'held by the per-node limit, next check';
  return shortHeld(d);
}

function shortHeld(d) {
  const label = decisionSkipLabel(d);
  if (label) return label.toLowerCase();
  const r = (d?.reason || 'held back').replace(/\.\s*$/, '');
  return r.length > 48 ? `${r.slice(0, 45)}…` : r;
}

/**
 * The banner's last-check line as parts: lead text, an outcome chip and a
 * short subject ("zentry-det-pve5 pve5 → pve3"). Returns
 * { lead, chip, tone, kind, subject }.
 */
export function lastCheckParts(run, ctx = {}) {
  if (!run) return { lead: 'No checks yet', chip: null, tone: 'gray', kind: 'none', subject: '' };
  const now = ctx.now || new Date();
  const o = runOutcome(run, ctx);
  const ago = agoText(run.timestamp, now);
  const decisions = Array.isArray(run.decisions) ? run.decisions : [];
  const lead = o.kind === 'running' ? 'Checking now' : `Last check${ago ? ` ${ago}` : ''}`;
  let subject = '';
  const first = (ds) => (ds.length ? `${guestName(ds[0])} ${route(ds[0])}${ds.length > 1 ? ` +${ds.length - 1} more` : ''}`.replace(/\s+/g, ' ').trim() : '');
  if (o.kind === 'moved' || o.kind === 'would_move') subject = first(decisions.filter(d => MOVE_ACTIONS.has(d.action)));
  else if (o.kind === 'waiting') {
    const obs = decisions.filter(d => d.action === 'observing');
    const p = observationProgress(obs[0]);
    subject = `${first(obs)}${p ? ` · ${p.seen} of ${p.need} checks` : ''}`;
  } else if (o.kind === 'held') {
    const held = decisions.filter(d => HELD_ACTIONS.has(d.action));
    subject = `${first(held)} · ${shortHeld(held[0])}`;
  } else if (o.kind === 'skipped' || o.kind === 'failed') subject = o.reason || '';
  return { lead, chip: o.kind === 'running' ? null : o.chip, tone: o.tone, kind: o.kind, subject };
}

/**
 * One row per guest worth mentioning in a run, or null when the run had
 * nothing to say ("nothing to do"). Each row:
 *   { name, route, chip, tone, pips: { seen, need } | null, why }
 * Skipped/failed runs return a single row with no guest and the reason.
 */
export function lastCheckRows(run, ctx = {}) {
  if (!run) return null;
  const o = runOutcome(run, ctx);
  if (o.kind === 'nothing' || o.kind === 'none') return null;
  if (o.kind === 'skipped' || o.kind === 'off' || o.kind === 'running' || (o.kind === 'failed' && !(run.decisions || []).some(d => d.action === 'failed'))) {
    return [{ name: null, route: '', chip: o.chip, tone: o.tone, pips: null, why: o.reason || '' }];
  }
  const dry = isDryRun(run);
  const n = ctx.observationPeriods || null;
  const rows = [];
  const held = new Map(); // reason → guest names, folded into one row each
  for (const d of run.decisions || []) {
    const base = { name: guestName(d), route: route(d) };
    if (MOVE_ACTIONS.has(d.action)) {
      rows.push({ ...base, chip: dry ? 'would move' : 'moved', tone: dry ? 'yellow' : 'green',
        pips: n && !d.distribution_balancing ? { seen: n, need: n } : null, why: shortWhy(d), order: 0 });
    } else if (d.action === 'failed') {
      rows.push({ ...base, chip: 'failed', tone: 'red', pips: null, why: d.error || shortWhy(d), order: 0 });
    } else if (d.action === 'observing') {
      rows.push({ ...base, chip: 'waiting', tone: 'purple', pips: observationProgress(d), why: '', order: 1 });
    } else if (HELD_ACTIONS.has(d.action)) {
      const key = heldKey(d);
      if (!held.has(key)) held.set(key, { names: [], first: { ...base, title: heldReason(d) } });
      held.get(key).names.push(base.name);
    }
  }
  for (const [key, g] of held) {
    rows.push(g.names.length === 1
      ? { ...g.first, chip: 'held back', tone: 'gray', pips: null, why: key, order: 2 }
      : { name: null, route: '', chip: 'held back', tone: 'gray', pips: null, order: 2,
          why: `${g.names.length} guests ${key}`, title: g.names.join(', ') });
  }
  return rows.sort((a, b) => a.order - b.order);
}

// ---------------------------------------------------------------------------
// Recent checks: one square per run over the last 24 h
// ---------------------------------------------------------------------------

/** Strip category of a run: nothing | waiting | would_move | moved | held | failed | skipped | running. */
export function runCategory(run) {
  const k = runOutcome(run).kind;
  if (k === 'off' || k === 'none') return 'skipped';
  return k;
}

/** Legend order and labels for the strip. */
export const CATEGORY_LABELS = [
  ['nothing', 'nothing to do'],
  ['waiting', 'waiting'],
  ['would_move', 'would move (dry run)'],
  ['moved', 'moved'],
  ['held', 'held back'],
  ['skipped', 'skipped'],
  ['failed', 'failed'],
  ['running', 'running'],
];

const dayKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * Lay out runs (any order) for the 24 h strip, oldest at the left.
 * Returns {
 *   items: [{ run, t, cat }],
 *   ticks: [{ index, label }] — first run at/after each local 00/06/12/18 h,
 *          dropped when it would crowd the previous tick or the "now" label,
 *   days:  [{ label, items }] — the same items split by local day (phones),
 *   categories: categories present, in legend order,
 * }
 */
export function stripLayout(runs, { now = new Date(), hours = 24, tickEveryHours = 6 } = {}) {
  const start = now.getTime() - hours * 3600000;
  const items = (runs || [])
    .map(run => ({ run, t: parseTimestamp(run?.timestamp) }))
    .filter(x => x.t && x.t.getTime() >= start && x.t.getTime() <= now.getTime() + 60000)
    .sort((a, b) => a.t - b.t)
    .map(x => ({ ...x, cat: runCategory(x.run) }));
  const n = items.length;
  const ticks = [];
  if (n > 0) {
    const minGap = Math.max(3, Math.ceil(n * 0.12));
    const b = new Date(items[0].t);
    b.setMinutes(0, 0, 0);
    while (b < items[0].t || b.getHours() % tickEveryHours !== 0) b.setHours(b.getHours() + 1);
    for (; b.getTime() <= now.getTime(); b.setHours(b.getHours() + tickEveryHours)) {
      const index = items.findIndex(x => x.t >= b);
      if (index < 0) break;
      const prev = ticks[ticks.length - 1];
      if (prev && index - prev.index < minGap) continue;
      if (n - index < minGap) continue; // leave room for "now"
      ticks.push({ index, label: clockTime(b) });
    }
  }
  const days = [];
  const today = dayKey(now);
  const yest = dayKey(new Date(now.getTime() - 86400000));
  for (const it of items) {
    const k = dayKey(it.t);
    let day = days[days.length - 1];
    if (!day || day.key !== k) {
      const label = k === today ? 'Today' : k === yest ? 'Yesterday' : it.t.toLocaleDateString('en-US', { weekday: 'short' });
      day = { key: k, label, items: [] };
      days.push(day);
    }
    day.items.push(it);
  }
  const present = new Set(items.map(x => x.cat));
  return { items, ticks, days, categories: CATEGORY_LABELS.filter(([c]) => present.has(c)).map(([c]) => c) };
}

/** The latest real (not dry-run) move from status.recent_migrations, or null. */
export function lastRealMove(recentMigrations) {
  return (recentMigrations || []).find(m => !m.dry_run && (m.status === 'completed' || m.status === 'failed')) || null;
}

// ---------------------------------------------------------------------------
// Outcomes: did past moves help?
// ---------------------------------------------------------------------------

const VERDICTS = {
  beneficial: { verdict: 'helped', label: 'helped', tone: 'green' },
  harmful: { verdict: 'worse', label: 'worse', tone: 'red' },
  neutral: { verdict: 'no_change', label: 'no change', tone: 'gray' },
  inconclusive: { verdict: 'unclear', label: 'unclear', tone: 'gray' },
};

/**
 * The one number that decides an outcome — source-node CPU before the move
 * vs. 24 h after (the backend's verdict is computed from exactly this) or,
 * while the 24 h snapshot is pending, 5 min after — plus a verdict whose
 * colour always agrees with that number.
 * Returns { node, metric, before, after, window, verdict, label, tone, pending }.
 */
export function outcomeHeadline(o) {
  const pre = o?.pre_migration?.source_node || {};
  const p24 = o?.post_24h && !o.post_24h.late ? o.post_24h : null;
  const p5 = o?.post_5min || o?.post_migration || null;
  const post = p24 || p5;
  const before = pre.cpu ?? null;
  const after = post?.source_node?.cpu ?? null;
  const pending = typeof o?.status === 'string' && o.status.startsWith('pending_');
  const base = { node: o?.source_node || '—', metric: 'CPU', before, after, window: p24 ? '24 h' : p5 ? '5 min' : null, pending };
  if (pending) return { ...base, verdict: 'measuring', label: 'measuring', tone: 'blue' };
  // A 24 h verdict measured from a late snapshot doesn't measure the move.
  if (o?.post_24h?.late) return { ...base, verdict: 'unclear', label: 'unclear', tone: 'gray' };
  let v = VERDICTS[o?.verdict] || VERDICTS.inconclusive;
  // Never let the chip and the number disagree.
  if (before != null && after != null) {
    if (v.verdict === 'helped' && after > before) v = VERDICTS.neutral;
    if (v.verdict === 'worse' && after < before) v = VERDICTS.neutral;
  }
  return { ...base, ...v };
}

const pct = (v) => (v == null || Number.isNaN(Number(v)) ? '—' : `${Math.round(Number(v))}%`);

/** "pve5 CPU 89% → 72% after 24 h". */
export function headlineText(h) {
  if (h.before == null && h.after == null) return `${h.node} CPU —`;
  return `${h.node} CPU ${pct(h.before)} → ${pct(h.after)}${h.window ? ` after ${h.window}` : ''}`;
}

/** "Last 10 moves: 8 helped, 2 made things worse" (counts only what was shown). */
export function outcomesSummary(outcomes) {
  const hs = (outcomes || []).map(outcomeHeadline);
  if (hs.length === 0) return 'No measured moves yet.';
  const count = (v) => hs.filter(h => h.verdict === v).length;
  const parts = [];
  if (count('helped')) parts.push(`${count('helped')} helped`);
  if (count('no_change')) parts.push(`${count('no_change')} made no difference`);
  if (count('worse')) parts.push(`${count('worse')} made things worse`);
  if (count('unclear')) parts.push(`${count('unclear')} unclear`);
  if (count('measuring')) parts.push(`${count('measuring')} still measuring`);
  return hs.length === 1 ? `Last move: ${parts.join(', ').replace(/^1 /, '')}` : `Last ${hs.length} moves: ${parts.join(', ')}`;
}

/**
 * Change in source-node CPU after the move, in percentage points (after −
 * before; negative = quieter), or null when either side is missing.
 */
export function cpuChange(h) {
  if (h?.before == null || h?.after == null) return null;
  return Math.round(Number(h.after) - Number(h.before));
}

/** "−43" / "+14" / "0" with a true minus sign, or "—". */
export function signedPoints(v) {
  if (v == null || Number.isNaN(v)) return '—';
  if (v === 0) return '0';
  return v < 0 ? `−${Math.abs(v)}` : `+${v}`;
}

/** Shared bar scale: the largest |change| rounded up to 10 points (at least 10). */
export function barScale(changes) {
  const max = Math.max(0, ...(changes || []).filter(c => c != null).map(c => Math.abs(c)));
  return Math.max(10, Math.ceil(max / 10) * 10);
}

/**
 * Geometry for a diverging bar around a centre zero line:
 * { side: 'left' | 'right' | null, pct } where pct is the share of HALF the
 * track (0–100). Left = quieter (negative change), right = busier.
 */
export function barGeometry(change, scale) {
  if (change == null || !scale) return { side: null, pct: 0 };
  const pctOfHalf = Math.min(100, (Math.abs(change) / scale) * 100);
  if (change === 0) return { side: null, pct: 0 };
  return { side: change < 0 ? 'left' : 'right', pct: pctOfHalf };
}

/**
 * Tally of measured moves for "Helped 8 of 10": still-measuring moves are
 * left out. Returns { helped, worse, other, total, segments } where segments
 * lists each move's tone, grouped green, gray, red.
 */
export function helpedTally(outcomes) {
  const hs = (outcomes || []).map(outcomeHeadline).filter(h => h.verdict !== 'measuring');
  const helped = hs.filter(h => h.verdict === 'helped').length;
  const worse = hs.filter(h => h.verdict === 'worse').length;
  const rank = { green: 0, gray: 1, red: 2 };
  const segments = hs.map(h => h.tone).sort((a, b) => (rank[a] ?? 1) - (rank[b] ?? 1));
  return { helped, worse, other: hs.length - helped - worse, total: hs.length, segments };
}

export { pct as formatPct };
