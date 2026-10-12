// Pure helpers behind the compact suggestion card: the one status chip, the
// metric the move is about, its before/after bars, the one-line reason and
// the details bullets. No React in here, so tests/js/suggestion-card.mjs can
// import it directly.
//
// Missing data stays missing: a helper returns null (rendered as "—" or left
// out) and never fills in a zero.

import { seenCountInfo, seenCountDetail } from './seenCount.js';

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const clampPct = (v) => (v == null ? null : Math.min(100, Math.max(0, v)));
const round1 = (v) => Math.round(v * 10) / 10;

/** Display a percentage, or "—" when unknown. */
export function fmtPct(v) {
  const n = num(v);
  return n == null ? '—' : `${Math.round(n)}%`;
}

// ---------------------------------------------------------------------------
// Status chip
// ---------------------------------------------------------------------------

/**
 * Why automation would never act on this suggestion by itself (ignore tag,
 * pinned disk, unshared bind mount). Checks both the rec and the guest's
 * collector record; returns short reasons.
 */
export function manualOnlyReasons(rec, guest) {
  const out = [];
  if (rec?.tags?.has_ignore || guest?.tags?.has_ignore) out.push('has the ignore tag');
  if (rec?.mount_point_info?.has_unshared_bind_mount || guest?.mount_points?.has_unshared_bind_mount) {
    out.push('unshared bind mount needs a manual move');
  }
  const pinned = rec?.local_disks?.is_pinned ? rec.local_disks : guest?.local_disks?.is_pinned ? guest.local_disks : null;
  if (pinned) out.push(pinned.pinned_reason || 'pinned to a local disk');
  return out;
}

/** HA rule blocks for moving the guest to the rec's target (from guest.ha_placement). */
export function haBlocks(rec, guest) {
  const v = guest?.ha_placement?.[rec?.target_node];
  return Array.isArray(v?.blocks) ? v.blocks.filter(Boolean) : [];
}

/** HA rule warnings, from the rec (engine) and the guest's placement verdicts, de-duplicated. */
export function haWarnings(rec, guest) {
  const v = guest?.ha_placement?.[rec?.target_node];
  const all = [...(rec?.ha_warnings || []), ...((v && v.warnings) || [])].filter(Boolean);
  return [...new Set(all)];
}

// ---------------------------------------------------------------------------
// Target storage after the move (rec.target_storage, from the server's
// storage_projection). Shared storage never appears; an empty or missing list
// shows nothing.
// ---------------------------------------------------------------------------

const STORAGE_RANK = { ok: 0, warning: 1, critical: 2, wont_fit: 3 };

/** Projection entries at `level` or worse (default: anything above ok). */
export function storageEntries(rec, level = 'warning') {
  const list = Array.isArray(rec?.target_storage) ? rec.target_storage : [];
  const floor = STORAGE_RANK[level] ?? 1;
  return list.filter(e => (STORAGE_RANK[e?.level] ?? -1) >= floor);
}

/** "local-lvm on pve6: 72% → 88%", plus planned-move and won't-fit notes. */
export function storageLine(e) {
  const pct = (v) => (num(v) == null ? '—' : `${Math.round(v)}%`);
  const base = `${e?.storage || '—'} on ${e?.node || '—'}: ${pct(e?.used_before_pct)} → ${pct(e?.used_after_pct)}`;
  const extras = [];
  if (num(e?.pending_gb) > 0) extras.push(`incl. ${Math.round(e.pending_gb)} GB from other planned moves`);
  if (e?.level === 'wont_fit' && num(e?.size_gb) != null) extras.push(`${Math.round(e.size_gb)} GB won't fit`);
  return extras.length ? `${base} (${extras.join('; ')})` : base;
}

/** Details warning lines for every target storage above 80% after the move. */
export function storageWarnings(rec) {
  return storageEntries(rec, 'warning').map(e => `Target storage: ${storageLine(e)}`);
}

/**
 * The single status chip: auto-eligibility and the seen count merged.
 *
 * @param rec               the recommendation
 * @param ctx.automation    /api/automigrate/status payload (enabled, dry_run, timer_active)
 * @param ctx.config        automation config (rules.intelligent_migrations)
 * @param ctx.guest         the guest's collector record, if known
 * @param ctx.inflow        { target, cap } when the per-node inflow cap leaves
 *                          this move out of automation's next run
 * @returns {{ key, label, color, lines: string[] }}
 *   key ∈ manual | paused | waiting | blocked | storage | ready
 *   (blocked also covers "won't fit on the target storage"; storage means the
 *   target storage ends above 90% but automation would still run the move)
 */
export function autoStatus(rec, ctx = {}) {
  // A move whose disks won't fit can't run at all, manually or automatically.
  const full = storageEntries(rec, 'wont_fit');
  if (full.length) {
    return {
      key: 'blocked', label: 'Blocked: storage full', color: 'red',
      lines: [`Not enough room on the target: ${full.map(storageLine).join('; ')}. Automation skips this move.`],
    };
  }
  const base = baseAutoStatus(rec, ctx);
  const critical = storageEntries(rec, 'critical');
  if (critical.length && base.key !== 'blocked' && base.key !== 'manual') {
    return {
      key: 'storage', label: 'Storage nearly full', color: 'orange',
      lines: [
        `The target's storage ends above 90%: ${critical.map(storageLine).join('; ')}.`,
        `Automation still runs it (${base.label}).`,
        ...base.lines,
      ],
    };
  }
  return base;
}

function baseAutoStatus(rec, { automation, config, guest, inflow } = {}) {
  const seen = seenCountInfo(rec);
  const seenLines = seenCountDetail(rec, seen);
  const make = (key, label, color, lines) => ({ key, label, color, lines: lines.filter(Boolean) });

  if (!automation || !automation.enabled) {
    return make('manual', 'Manual only', 'gray', ['Automation is off, so this only happens if you run it.']);
  }
  const manual = manualOnlyReasons(rec, guest);
  if (manual.length) {
    return make('manual', 'Manual only', 'gray', [`Automation skips this guest: ${manual.join('; ')}.`]);
  }
  const ha = haBlocks(rec, guest);
  if (ha.length) {
    return make('blocked', 'Blocked: HA rule', 'red', [`An HA rule refuses ${rec.target_node}: ${ha[0]}`]);
  }
  if (!automation.timer_active) {
    return make('paused', 'Automation paused', 'orange', ['The automation timer is paused; resume it to let automation act.', ...seenLines]);
  }

  // Maintenance evacuations and distribution moves are not gated on the count.
  const gated = !rec.distribution_balancing && rec.structured_reason?.primary_reason !== 'maintenance_evacuation';
  const im = config?.rules?.intelligent_migrations;
  if (gated && seen && !seen.met) {
    return make('waiting', `Waiting ${seen.count}/${seen.required} runs`, seen.targetNewer ? 'yellow' : 'purple', seenLines);
  }
  if (gated && seen && seen.met && !seen.ready) {
    return make('waiting', 'Waiting for data', 'purple', seenLines);
  }
  if (gated && !seen && im?.enabled) {
    const req = num(im.observation_periods) || 3;
    return make('waiting', 'Waiting · not counted yet', 'purple', [
      `Automation hasn't counted this suggestion yet; it acts after ${req} consecutive runs recommend it.`,
    ]);
  }
  if (inflow) {
    return make('blocked', 'Blocked: inflow cap', 'red', [
      `${inflow.target} already gets ${inflow.cap} move${inflow.cap === 1 ? '' : 's'} earlier in the plan; automation sends at most ${inflow.cap} into one node per run, so this one waits for a later run.`,
      ...seenLines,
    ]);
  }
  if (automation.dry_run) {
    return make('ready', 'Ready · dry run', 'blue', ['Automation would pick this up, but dry-run mode only logs it.', ...seenLines]);
  }
  return make('ready', 'Ready · will run next check', 'green', ['Automation will run this on its next check unless a safety check stops it.', ...seenLines]);
}

// ---------------------------------------------------------------------------
// Driving metric and before/after bars
// ---------------------------------------------------------------------------

const METRIC_LABEL = { cpu: 'CPU', mem: 'Memory', iowait: 'IOWait' };

/** Which metric the move is about: 'cpu' | 'mem' | 'iowait'. */
export function drivingMetric(rec) {
  const r = rec?.structured_reason?.primary_reason;
  if (r === 'iowait_relief') return 'iowait';
  if (r === 'mem_imbalance') return 'mem';
  if (r === 'cpu_imbalance') return 'cpu';
  const text = String(rec?.reason || '').toLowerCase();
  if (/memory|\bmem\b/.test(text)) return 'mem';
  if (/i\/o|iowait/.test(text)) return 'iowait';
  return 'cpu';
}

export function metricLabel(metric) {
  return METRIC_LABEL[metric] || metric;
}

/**
 * Before/after for source and target on the driving metric.
 *
 * CPU and memory use the same numbers as the impact strip: the node's current
 * value from summary.batch_impact.before.node_scores, and this move's own
 * delta from summary.batch_impact.moves (estimate_move_deltas on the server).
 * IOWait has no batch delta, so it uses the engine's scoring for this move:
 * the node's recent IOWait, shifted by (predicted − weighted) from
 * score_details. Anything unknown is null; the card then draws no marker.
 *
 * @returns {{ metric, label, limit, source: Side, target: Side }}
 *   Side = { node, before: number|null, after: number|null }
 */
export function moveBars(rec, summary, params) {
  const metric = drivingMetric(rec);
  const bi = summary?.batch_impact;
  const before = bi?.before?.node_scores || {};
  const move = (bi?.moves || []).find(m => String(m.vmid) === String(rec?.vmid)
    && m.source_node === rec?.source_node && m.target_node === rec?.target_node);
  const limits = bi?.limits || {};
  const side = (node, sign, role) => {
    let b = null; let a = null;
    if (metric === 'cpu' || metric === 'mem') {
      b = num(before[node]?.[metric]);
      const d = num(move?.[`${role}_${metric}`]);
      if (b != null && d != null) a = b + sign * d;
    } else {
      const m = rec?.score_details?.[role]?.metrics;
      b = num(m?.immediate_iowait);
      const w = num(m?.weighted_iowait); const p = num(m?.predicted_iowait);
      if (b != null && w != null && p != null) a = b + (p - w);
    }
    b = clampPct(b); a = clampPct(a);
    return { node, before: b == null ? null : round1(b), after: a == null ? null : round1(a) };
  };
  const limit = metric === 'iowait' ? num(params?.iowait_threshold) : num(limits[metric]) ?? num(params?.[`${metric}_threshold`]);
  return {
    metric,
    label: metricLabel(metric),
    limit,
    source: side(rec?.source_node, -1, 'source'),
    target: side(rec?.target_node, +1, 'target'),
  };
}

// ---------------------------------------------------------------------------
// Reason sentence and details bullets
// ---------------------------------------------------------------------------

/** CPU trend rate on the source node (percentage points per day), when rising. */
function sourceCpuRise(rec) {
  const ta = rec?.score_details?.source?.trend_analysis;
  const rate = num(ta?.cpu_rate_per_day);
  const dir = ta?.cpu_direction;
  if (rate != null && rate > 0 && (dir === 'rising' || dir === 'sustained_increase')) return rate;
  return null;
}

const factorOf = (rec, key) => (rec?.structured_reason?.contributing_factors || []).find(f => f.factor === key);

/** One plain-language sentence: the single most important reason for the move. */
export function reasonSentence(rec, params) {
  const src = rec?.source_node || 'source';
  const sr = rec?.structured_reason;
  if (sr?.primary_reason === 'maintenance_evacuation' || /maintenance/i.test(rec?.reason || '')) {
    return `${src} is in maintenance mode`;
  }
  if (rec?.distribution_balancing) return rec.reason || `Even out guest counts: ${src} has more guests`;
  const metric = drivingMetric(rec);
  if (metric === 'iowait') {
    const f = factorOf(rec, 'source_iowait');
    return f?.value != null ? `${src} IOWait at ${Math.round(f.value)}%` : `${src} has high I/O wait`;
  }
  if (metric === 'mem') {
    const f = factorOf(rec, 'source_mem');
    const thr = num(params?.mem_threshold);
    if (f?.value != null && thr != null && f.value > thr) return `${src} memory over ${Math.round(thr)}%`;
    if (f?.value != null) return `${src} memory at ${Math.round(f.value)}%`;
    return `${rec?.target_node || 'Target'} has more free memory than ${src}`;
  }
  const f = factorOf(rec, 'source_cpu');
  const thr = num(params?.cpu_threshold);
  if (f?.value != null && thr != null && f.value > thr) return `${src} CPU over ${Math.round(thr)}%`;
  const rise = sourceCpuRise(rec);
  if (rise != null) return `${src} CPU rising ${round1(rise)}%/day`;
  if (f?.value != null) return `${src} CPU at ${Math.round(f.value)}%`;
  if (factorOf(rec, 'source_cpu_trend')) return `${src} CPU trending upward`;
  return `${rec?.target_node || 'Target'} has more CPU headroom than ${src}`;
}

/** Bulleted "why" lines, with node names instead of "Source"/"Target". */
export function whyBullets(rec) {
  const src = rec?.source_node || 'Source';
  const tgt = rec?.target_node || 'Target';
  const factors = rec?.structured_reason?.contributing_factors;
  if (!Array.isArray(factors) || !factors.length) return rec?.reason ? [rec.reason] : [];
  return factors.map((f) => {
    const v = num(f.value);
    switch (f.factor) {
      case 'source_cpu': return v != null ? `${src} CPU at ${Math.round(v)}% (time-weighted)` : f.label;
      case 'source_mem': return v != null ? `${src} memory at ${Math.round(v)}%` : f.label;
      case 'source_iowait': return v != null ? `${src} IOWait at ${Math.round(v)}%` : f.label;
      case 'target_cpu_headroom': return v != null ? `${tgt} keeps ${Math.round(v)}% CPU free after the move` : f.label;
      case 'target_mem_headroom': return v != null ? `${tgt} keeps ${Math.round(v)}% memory free after the move` : f.label;
      case 'source_cpu_trend': {
        const rise = sourceCpuRise(rec);
        return rise != null ? `${src} CPU rising ${round1(rise)}%/day` : `${src} CPU trending upward`;
      }
      case 'source_mem_trend': return `${src} memory trending upward (memory is largely static)`;
      default: return f.label;
    }
  }).filter(Boolean);
}

/** "low" | "medium" | "high" | "very high", or null. */
export function riskLabel(rec) {
  const map = { low: 'low', moderate: 'medium', medium: 'medium', high: 'high', very_high: 'very high' };
  return map[rec?.risk_level] || null;
}

/** "3 of 3 runs, same target" style summary of the seen count, or null. */
export function seenSummary(rec) {
  const s = seenCountInfo(rec);
  if (!s) return null;
  let tail = '';
  if (s.same != null) {
    if (s.same >= s.count) tail = ', same target';
    else if (s.same === 0) tail = `, ${rec.target_node} not counted yet`;
    else tail = `, ${s.same} with ${rec.target_node}`;
  }
  return `${s.count} of ${s.required} run${s.required === 1 ? '' : 's'}${tail}`;
}

/** "3.0 GB memory · 2 cores", or null when nothing is known. */
export function guestSize(rec, guest) {
  const parts = [];
  const mem = num(rec?.mem_gb) ?? num(guest?.mem_max_gb);
  if (mem != null && mem > 0) parts.push(`${mem.toFixed(1)} GB memory`);
  const cores = num(guest?.cpu_cores) ?? num(rec?.cpu_cores);
  if (cores != null && cores > 0) parts.push(`${cores} core${cores === 1 ? '' : 's'}`);
  return parts.length ? parts.join(' · ') : null;
}
