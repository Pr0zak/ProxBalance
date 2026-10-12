// Text for right-sizing hints (/api/insights/rightsizing and the
// `rightsizing` block of /api/guests/<vmid>/history). Shared by the Insights
// card and the guest side panel so both say the same thing.

/** "8 GB", "2.5 GB", "512 MB" — memory sizes as people write them. */
export function formatSize(gb) {
  if (gb == null || !Number.isFinite(gb)) return '—';
  if (gb < 1) return `${Math.round(gb * 1024)} MB`;
  const r = Math.round(gb * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} GB`;
}

function pct(v) {
  if (v == null || !Number.isFinite(v)) return '—';
  return v < 1 && v > 0 ? '<1%' : `${Math.round(v)}%`;
}

/**
 * One hint as a short phrase. With `limit` (a container, whose cores and
 * memory are limits rather than reservations) the size reads "(limit)".
 */
export function hintText(h, { limit = false } = {}) {
  if (!h) return '';
  const tail = (detail) => (limit ? ` (limit) · ${detail}` : ` (${detail})`);
  if (h.kind === 'cpu') {
    return `${h.current} vCPU → ${h.suggested}${tail(`avg ${pct(h.avg_pct)}, p95 ${pct(h.p95_pct)}`)}`;
  }
  if (h.kind === 'memory') {
    return `${formatSize(h.current_gb)} → ${formatSize(h.suggested_gb)}${tail(`avg ${formatSize(h.avg_gb)}, p95 ${formatSize(h.p95_gb)}`)}`;
  }
  if (h.kind === 'stopped') {
    return `mostly stopped (running ${pct(h.running_pct)} of the week)`;
  }
  return '';
}

/** "could free 9 vCPUs and 14 GB", or null when nothing is freed. */
export function totalsText(totals) {
  if (!totals) return null;
  const parts = [];
  const v = totals.vcpus_freed || 0;
  const g = totals.gb_freed || 0;
  if (v > 0) parts.push(`${v} vCPU${v === 1 ? '' : 's'}`);
  if (g > 0) parts.push(formatSize(g));
  return parts.length ? `could free ${parts.join(' and ')}` : null;
}

/**
 * The Insights card's header, from a /api/insights/rightsizing response.
 * Only VMs are counted: container limits aren't reserved on the host.
 * Returns `{ lead, rest }`; `lead` is the bold part (or null).
 */
export function summaryText(data) {
  const days = data?.window_days || 7;
  const vm = data?.totals?.vm || {};
  const n = vm.guests_with_hints || 0;
  const free = totalsText(vm);
  if (n === 0) return { lead: null, rest: `No VM is oversized for its last ${days} days of use.` };
  return {
    lead: free ? `VMs ${free}` : null,
    rest: `${free ? 'across' : 'Hints for'} ${n} VM${n === 1 ? '' : 's'}, from the last ${days} days of use.`,
  };
}

/**
 * The guest side panel's one line, from the history payload's `rightsizing`
 * block. Returns null when there is nothing worth a row (no block, no data,
 * template).
 */
export function panelLine(rs) {
  const parts = panelParts(rs);
  return parts ? parts.join(' · ') : null;
}

/** Same as panelLine, one entry per hint, so the panel can break between hints rather than inside one. */
export function panelParts(rs) {
  if (!rs) return null;
  if (rs.status === 'not_enough_history') return [`Not enough history yet (${rs.days ?? 0} of 3 days)`];
  if (rs.status !== 'ok') return null;
  if (!rs.hints || rs.hints.length === 0) return ['Fits its allocation'];
  return rs.hints.map(h => hintText(h, { limit: rs.kind === 'ct' }));
}
