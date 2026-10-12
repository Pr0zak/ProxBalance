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
  if (r?.observation_count != null && r?.required_observations != null) {
    return { seen: Number(r.observation_count), need: Number(r.required_observations) };
  }
  const m = /(\d+)\s*\/\s*(\d+)/.exec(d?.reason || '');
  return m ? { seen: Number(m[1]), need: Number(m[2]) } : null;
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
      ? { kind: 'would_move', count: movedCount, chip: `would move ${movedCount}`, tone: 'yellow', reason: null, failed: failedMoves.length }
      : { kind: 'moved', count: movedCount, chip: `moved ${movedCount}`, tone: failedMoves.length ? 'orange' : 'green', reason: null, failed: failedMoves.length };
  }
  if (failedMoves.length > 0) {
    return { kind: 'failed', count: failedMoves.length, chip: 'failed', tone: 'red', reason: failedMoves[0].error || runFailureReason(run) };
  }
  const observing = decisions.filter(d => d.action === 'observing');
  const held = decisions.filter(d => HELD_ACTIONS.has(d.action));
  if (held.length > 0) return { kind: 'held', count: held.length, chip: `held back ${held.length}`, tone: 'orange', reason: null };
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
 * Short story of one run for the expanded view.
 * Returns { lines: string[], held: [{ name, text }], moreHeld: number }.
 *   ctx.observationPeriods — checks in a row a guest must be suggested (intelligent mode)
 */
export function runStory(run, ctx = {}) {
  if (!run) return { lines: ['No checks have run yet.'], held: [], moreHeld: 0 };
  const o = runOutcome(run, ctx);
  const decisions = Array.isArray(run.decisions) ? run.decisions : [];
  const dry = isDryRun(run);
  const moved = decisions.filter(d => MOVE_ACTIONS.has(d.action));
  const failed = decisions.filter(d => d.action === 'failed');
  const observing = decisions.filter(d => d.action === 'observing');
  const heldDs = decisions.filter(d => HELD_ACTIONS.has(d.action));
  const lines = [];

  if (o.kind === 'skipped') {
    lines.push(`Skipped before looking at guests: ${o.reason || 'the run exited early'}.`);
  } else if (o.kind === 'failed' && moved.length === 0 && failed.length === 0) {
    lines.push(`The check failed${o.reason ? `: ${o.reason}` : ''}.`);
  } else if (o.kind === 'running') {
    lines.push('This check is still running.');
  } else if (o.kind === 'off') {
    lines.push('Automation was switched off, so nothing was checked.');
  } else if (o.kind === 'nothing') {
    lines.push('No guest was suggested for a move — all nodes are within their thresholds.');
  } else {
    const vmids = new Set(decisions.map(d => String(d.vmid)));
    const total = Math.max(vmids.size, Number(moved[0]?.total_candidates || 0));
    lines.push(`Checked ${plural(total, 'suggestion')}.`);
    const n = ctx.observationPeriods;
    for (const d of moved.slice(0, 3)) {
      const ready = d.distribution_balancing
        ? 'It was picked to even out guest counts'
        : n ? `It had been suggested ${n} checks in a row, so it was ready` : 'It was the top suggestion';
      const why = whyText(d);
      lines.push(`${guestName(d)} ${route(d)}: ${why ? `${why}. ` : ''}${ready}.`.replace(/\s+/g, ' '));
    }
    for (const d of failed.slice(0, 2)) {
      lines.push(`Moving ${guestName(d)} ${route(d)} failed${d.error ? `: ${d.error}` : ''}.`.replace(/\s+/g, ' '));
    }
    if (moved.length > 0) lines.push(dry ? 'Dry run: logged, not moved.' : `Moved ${plural(moved.length, 'guest')}.`);
    if (observing.length > 0) {
      const names = observing.slice(0, 3).map(d => {
        const p = observationProgress(d);
        return `${guestName(d)}${p ? ` (${p.seen} of ${p.need})` : ''}`;
      });
      const more = observing.length > 3 ? ` and ${observing.length - 3} more` : '';
      lines.push(`Still watching ${names.join(', ')}${more} — a guest moves once it has been suggested enough checks in a row.`);
    }
  }
  const held = heldDs.slice(0, 3).map(d => ({ name: guestName(d), text: heldReason(d) }));
  return { lines, held, moreHeld: Math.max(0, heldDs.length - 3) };
}

/** Key used to decide whether two neighbouring runs read the same. */
function sameKey(run, ctx) {
  const o = runOutcome(run, ctx);
  if (o.kind === 'nothing') return 'nothing';
  if (o.kind === 'skipped') return `skipped:${o.reason || ''}`;
  return null;
}

/**
 * Group runs (newest first) for the "Recent checks" list. Consecutive runs
 * that read the same — "nothing to do", or skipped for the same reason —
 * collapse into one group. Returns [{ runs, outcome, count, newest, oldest }].
 */
export function groupRuns(runs, ctx = {}) {
  const out = [];
  for (const run of runs || []) {
    const key = sameKey(run, ctx);
    const prev = out[out.length - 1];
    if (key && prev && prev.key === key) {
      prev.runs.push(run);
      prev.count += 1;
      prev.oldest = run.timestamp;
      continue;
    }
    out.push({ key, runs: [run], outcome: runOutcome(run, ctx), count: 1, newest: run.timestamp, oldest: run.timestamp });
  }
  return out;
}

/** One-line text for a group in "Recent checks". */
export function groupLine(group, ctx = {}) {
  if (group.count > 1) {
    const span = `${clockTime(group.oldest)}–${clockTime(group.newest)}`;
    if (group.outcome.kind === 'nothing') return `${group.count} checks, nothing to do · ${span}`;
    return `${group.count} checks skipped: ${group.outcome.reason || 'exited early'} · ${span}`;
  }
  return runSummary(group.runs[0], ctx);
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

export { pct as formatPct };
