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

/** One hint as a short phrase. */
export function hintText(h) {
  if (!h) return '';
  if (h.kind === 'cpu') {
    return `${h.current} vCPU → ${h.suggested} (avg ${pct(h.avg_pct)}, p95 ${pct(h.p95_pct)})`;
  }
  if (h.kind === 'memory') {
    return `${formatSize(h.current_gb)} → ${formatSize(h.suggested_gb)} (avg ${formatSize(h.avg_gb)}, p95 ${formatSize(h.p95_gb)})`;
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
  return rs.hints.map(hintText);
}
