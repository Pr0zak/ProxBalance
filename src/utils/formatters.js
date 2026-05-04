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
export function runStatusLabel(run) {
  if (!run) return { label: '—', tone: 'neutral', banner: null };
  const status = run.status;
  if (status === 'success') return { label: 'Success', tone: 'success', banner: null };
  if (status === 'partial') return { label: 'Partial', tone: 'warn', banner: null };
  if (status === 'failed')  return { label: 'Failed',  tone: 'error', banner: null };
  if (status !== 'no_action') return { label: status || '—', tone: 'neutral', banner: null };

  // no_action — figure out *why*
  const decisions = Array.isArray(run.decisions) ? run.decisions : [];
  const observing = decisions.filter(d => d.action === 'observing').length;
  const filtered  = decisions.filter(d => d.action === 'filtered' || d.action === 'skipped').length;

  if (observing > 0 && filtered === 0) {
    return {
      label: 'Awaiting Observations',
      tone: 'info',
      banner: `${observing} candidate${observing === 1 ? '' : 's'} in observation window — Intelligent mode is collecting data before acting.`,
    };
  }
  if (filtered > 0 || observing > 0) {
    const parts = [];
    if (observing) parts.push(`${observing} observing`);
    if (filtered)  parts.push(`${filtered} filtered`);
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

export function formatRelativeTime(timestamp) {
  if (!timestamp) return '';
  try {
    const ts = typeof timestamp === 'string'
      ? (timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z')
      : timestamp;
    const date = new Date(ts);
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
