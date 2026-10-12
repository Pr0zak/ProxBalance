export function formatLocalTime(dateInput) {
  return new Date(dateInput).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });
}

export function getTimezoneAbbr() {
  const date = new Date();
  const timeZoneName = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
  return timeZoneName;
}

/**
 * Best label for an automigrate run. The raw status field collapses several
 * different "didn't migrate" cases into 'no_action' — but in the UI those
 * cases mean very different things to the operator. Inspect the decisions
 * array to disambiguate "genuinely balanced" from "held back by the
 * intelligent observation gate" or "filtered by per-VM rules".
 *
 * Returns { label, tone, banner } where:
 *   label  — short text for the status pill
 *   tone   — semantic color: 'success' | 'warn' | 'error' | 'info' | 'neutral'
 *   banner — longer sentence for the explanatory banner (or null)
 */
/**
 * Why a run failed, in words, or null when the run records no reason.
 * Failed runs store their reason in different places depending on where they
 * stopped: a top-level error, the cluster safety check, or the activity log.
 */
export function runFailureReason(run) {
  if (!run) return null;
  if (run.error) return String(run.error);
  const health = run.safety_checks?.cluster_health;
  if (health && !/passed|disabled/i.test(health)) return health;
  const log = Array.isArray(run.activity_log) ? run.activity_log : [];
  const bad = [...log].reverse().find(e => /fail|error/i.test(String(e?.status || e?.level || e?.message || '')));
  if (bad) return String(bad.message || bad.status);
  return null;
}

/**
 * Readable labels for the machine-readable `skip_code` automigrate stores on
 * some decisions (the free-text `reason` stays the detailed explanation).
 */
export const SKIP_CODE_LABELS = {
  target_inflow_cap: 'Per-node inflow cap',
  target_storage_full: 'Target storage full',
};

/** Short label for a decision's skip code, or null when it has none. */
export function decisionSkipLabel(decision) {
  const code = decision && decision.skip_code;
  if (!code) return null;
  return SKIP_CODE_LABELS[code] || String(code).replace(/_/g, ' ');
}

/** Distinct guests in a run held back by the per-node inflow cap. */
export function inflowCappedCount(run) {
  const decisions = Array.isArray(run?.decisions) ? run.decisions : [];
  return new Set(decisions.filter(d => d.skip_code === 'target_inflow_cap').map(d => String(d.vmid))).size;
}

const inflowCapNote = (n) => `${n} move${n === 1 ? '' : 's'} held back by the per-node inflow cap; reconsidered next run.`;

export function runStatusLabel(run) {
  if (!run) return { label: '—', tone: 'neutral', banner: null };
  const status = run.status;
  const capped = inflowCappedCount(run);
  if (status === 'success') return { label: 'Success', tone: 'success', banner: capped ? inflowCapNote(capped) : null };
  if (status === 'partial') return { label: 'Partial', tone: 'warn', banner: capped ? inflowCapNote(capped) : null };
  if (status === 'failed')  return { label: 'Failed',  tone: 'error', banner: runFailureReason(run) };
  if (status === 'skipped') {
    const why = run.safety_checks?.cluster_health || run.safety_checks?.migration_window;
    return { label: 'Skipped', tone: 'neutral', banner: why ? `Skipped: ${why}` : null };
  }
  if (status !== 'no_action') return { label: status || '—', tone: 'neutral', banner: null };

  // no_action — figure out *why*
  const decisions = Array.isArray(run.decisions) ? run.decisions : [];
  const observing = decisions.filter(d => d.action === 'observing').length;
  const filtered  = decisions.filter(d => (d.action === 'filtered' || d.action === 'skipped') && d.skip_code !== 'target_inflow_cap').length;

  if (observing > 0 && filtered === 0 && !capped) {
    return {
      label: 'Awaiting Observations',
      tone: 'info',
      banner: `${observing} candidate${observing === 1 ? '' : 's'} in observation window — Intelligent mode is collecting data before acting.`,
    };
  }
  if (filtered > 0 || observing > 0 || capped > 0) {
    const parts = [];
    if (observing) parts.push(`${observing} observing`);
    if (filtered)  parts.push(`${filtered} filtered`);
    if (capped)    parts.push(`${capped} held by the per-node inflow cap`);
    return {
      label: 'No Action',
      tone: 'info',
      banner: `No migrations this cycle — ${parts.join(', ')}. See decisions below for details.`,
    };
  }
  // Genuinely no recommendations to act on.
  return {
    label: 'No Action',
    tone: 'success',
    banner: 'No actionable recommendations — cluster is balanced this cycle.',
  };
}

/**
 * Parse a backend timestamp into a Date. Naive ISO strings are treated as
 * UTC; strings that already carry an offset ("Z" or "+00:00") are left alone.
 * Appending "Z" to an offset string yields "Invalid Date".
 */
export function parseTimestamp(timestamp) {
  if (timestamp == null || timestamp === '') return null;
  if (typeof timestamp !== 'string') return new Date(timestamp);
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/.test(timestamp);
  const d = new Date(hasOffset ? timestamp : timestamp + 'Z');
  return isNaN(d) ? null : d;
}

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  try {
    const date = parseTimestamp(timestamp);
    if (!date) return '';
    const diffMs = Date.now() - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMs / 3600000);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  } catch (e) {
    return '';
  }
}
