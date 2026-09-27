import { ArrowRight } from '../Icons.jsx';
import { FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE } from '../../utils/designTokens.js';

const { useMemo } = React;

const HOURS = [...Array(24).keys()];
const QUIET_HOURS = 3;

// One single-hue perceptual ramp per metric (OKLCH, equal lightness steps):
// six steps up to the threshold plus one "over threshold" step. Light mode
// runs pale → dark; dark mode flips the anchor so "quiet" sits near the
// surface and load gets brighter. Equal ΔL keeps neighbouring steps visibly
// apart in both themes.
const RAMP_L_LIGHT = [0.965, 0.885, 0.80, 0.715, 0.63, 0.545, 0.45];
const RAMP_C_LIGHT = [0.015, 0.045, 0.08, 0.115, 0.145, 0.165, 0.17];
const RAMP_L_DARK = [0.30, 0.385, 0.47, 0.555, 0.64, 0.725, 0.83];
const RAMP_C_DARK = [0.03, 0.06, 0.09, 0.12, 0.14, 0.145, 0.13];
const STEPS = RAMP_L_LIGHT.length;
const BELOW = STEPS - 1;

export const RHYTHM_METRICS = {
  cpu: { key: 'cpu', label: 'CPU', hue: 255 },
  iowait: { key: 'iowait', label: 'IOWait', hue: 65 },
};

const rampColor = (step, hue, dark) => (dark
  ? `oklch(${RAMP_L_DARK[step]} ${RAMP_C_DARK[step]} ${hue})`
  : `oklch(${RAMP_L_LIGHT[step]} ${RAMP_C_LIGHT[step]} ${hue})`);

/**
 * Ramp step for a value. Bins are square-root spaced up to the threshold
 * (edges at t·(i/6)²) so the quiet end, where most hours sit, gets the most
 * resolution: with a 50 % threshold a 12 % node and a 20 % node land two
 * steps apart instead of sharing one. At or over the threshold is the last step.
 */
function stepFor(value, threshold) {
  const t = threshold || 100;
  if (value >= t) return STEPS - 1;
  return Math.min(BELOW - 1, Math.floor(Math.sqrt(Math.max(0, value) / t) * BELOW));
}
const binEdge = (i, t) => Math.round((t * i * i) / (BELOW * BELOW));

/** CSS custom properties consumed by the `bg-[var(--hl)] dark:bg-[var(--hd)]` classes. */
const rampVars = (step, hue) => ({ '--hl': rampColor(step, hue, false), '--hd': rampColor(step, hue, true) });

const pad = h => `${String(((h % 24) + 24) % 24).padStart(2, '0')}:00`;
const toMin = t => {
  const [h, m] = String(t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

function makeFormatter(timeZone, withDay) {
  const opts = { hour: 'numeric', minute: 'numeric', hourCycle: 'h23', ...(withDay ? { weekday: 'long' } : {}) };
  try {
    return new Intl.DateTimeFormat('en-US', { ...opts, timeZone });
  } catch {
    return new Intl.DateTimeFormat('en-US', opts);
  }
}

function localParts(fmt, date) {
  const out = {};
  for (const p of fmt.formatToParts(date)) out[p.type] = p.value;
  return { day: (out.weekday || '').toLowerCase(), minute: (Number(out.hour) % 24) * 60 + Number(out.minute) };
}

/** Same rule the backend applies: inclusive bounds, overnight windows wrap. */
function windowActive(w, parts) {
  if (w.enabled === false) return false;
  const days = (w.days || []).map(d => String(d).toLowerCase());
  if (days.length && !days.includes(parts.day)) return false;
  const s = toMin(w.start_time);
  const e = toMin(w.end_time);
  return s <= e ? parts.minute >= s && parts.minute <= e : parts.minute >= s || parts.minute <= e;
}

/**
 * Share (0–1) of each schedule-timezone hour, across the past week, in which
 * automated migrations may run. Sampled as real instants so per-window
 * timezones and DST are handled exactly as the backend would see them.
 */
function scheduleMask(schedule, tz) {
  const mig = (schedule?.migration_windows || []).filter(w => w.enabled !== false);
  const black = (schedule?.blackout_windows || []).filter(w => w.enabled !== false);
  if (!mig.length && !black.length) return null;
  const hourFmt = makeFormatter(tz, false);
  const fmts = {};
  const fmtFor = w => {
    const z = w.timezone || tz;
    if (!fmts[z]) fmts[z] = makeFormatter(z, true);
    return fmts[z];
  };
  const allowed = Array(24).fill(0);
  const total = Array(24).fill(0);
  const STEP_MIN = 10;
  const start = Date.now() - 7 * 86400000;
  for (let i = 0; i < (7 * 24 * 60) / STEP_MIN; i++) {
    const at = new Date(start + (i * STEP_MIN + 5) * 60000);
    const h = Math.floor(localParts(hourFmt, at).minute / 60);
    total[h] += 1;
    const inMig = !mig.length || mig.some(w => windowActive(w, localParts(fmtFor(w), at)));
    const inBlack = black.some(w => windowActive(w, localParts(fmtFor(w), at)));
    if (inMig && !inBlack) allowed[h] += 1;
  }
  return HOURS.map(h => (total[h] ? allowed[h] / total[h] : 0));
}

/**
 * Mean and peak of each hour-of-day over the collector's RRD `month` series
 * (30-min samples, ~30 days), bucketed in the schedule timezone.
 */
function hourlyProfile(trendData, key, fmt) {
  const sum = Array(24).fill(0);
  const cnt = Array(24).fill(0);
  const peak = Array(24).fill(0);
  const pts = (trendData?.month || []).filter(p => typeof p[key] === 'number' && typeof p.time === 'number');
  for (const p of pts) {
    const h = Math.floor(localParts(fmt, new Date(p.time * 1000)).minute / 60);
    sum[h] += p[key];
    cnt[h] += 1;
    peak[h] = Math.max(peak[h], p[key]);
  }
  if (!pts.length) return null;
  const days = Math.max(1, Math.round((pts[pts.length - 1].time - pts[0].time) / 86400));
  return { avg: sum.map((s, h) => (cnt[h] ? s / cnt[h] : null)), peak, days };
}

/** Quietest contiguous `len`-hour stretch (wrapping midnight) of a 24-value series. */
function quietest(series, len = QUIET_HOURS) {
  let best = null;
  for (let s = 0; s < 24; s++) {
    const vals = HOURS.slice(0, len).map(i => series[(s + i) % 24]);
    if (vals.some(v => v == null)) continue;
    const avg = vals.reduce((a, b) => a + b, 0) / len;
    if (!best || avg < best.avg) best = { start: s, avg };
  }
  return best;
}

function Cell({ value, threshold, hue, title }) {
  if (value == null) return <div className="h-6 rounded-sm bg-slate-100 dark:bg-slate-800/60" title={title} />;
  const hot = threshold && value >= threshold;
  return (
    <div
      className={`h-6 rounded-sm bg-[var(--hl)] dark:bg-[var(--hd)] ${hot ? 'ring-2 ring-inset ring-red-600 dark:ring-red-400' : ''}`}
      style={rampVars(stepFor(value, threshold), hue)}
      title={title}
    />
  );
}

export function MetricPicker({ value, onChange }) {
  return (
    <div className="flex items-center gap-1.5" role="group" aria-label="Heatmap metric">
      {Object.entries(RHYTHM_METRICS).map(([k, { label }]) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          aria-pressed={value === k}
          className={`${FILTER_CHIP} ${value === k ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Hour-of-day load per node (30 days) against the automation schedule, so an
 * operator can check that migrations are allowed when the cluster is quiet.
 * `patterns` (from /api/workload-patterns) only adds weekly-cycle and burst notes.
 */
export default function RhythmHeatmap({ clusterNodes, schedule, metric = 'cpu', threshold, patterns = [], patternsTz }) {
  const m = RHYTHM_METRICS[metric];
  const tz = schedule?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { rows, cluster, days } = useMemo(() => {
    const fmt = makeFormatter(tz, false);
    const out = Object.keys(clusterNodes || {}).sort()
      .map(node => ({ node, prof: hourlyProfile(clusterNodes[node]?.trend_data, m.key, fmt) }))
      .filter(r => r.prof);
    const clusterAvg = HOURS.map(h => {
      const vals = out.map(r => r.prof.avg[h]).filter(v => v != null);
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    });
    const clusterPeak = HOURS.map(h => Math.max(0, ...out.map(r => r.prof.peak[h])));
    return { rows: out, cluster: { avg: clusterAvg, peak: clusterPeak }, days: Math.max(0, ...out.map(r => r.prof.days)) };
  }, [clusterNodes, tz, m.key]);

  const mask = useMemo(() => scheduleMask(schedule, tz), [schedule, tz]);

  if (!rows.length) return <p className="text-sm text-pb-text2 dark:text-gray-400">No hourly history yet — the collector hasn't gathered a month series.</p>;

  const quiet = quietest(cluster.avg);
  const quietAllowed = mask && quiet ? HOURS.slice(0, QUIET_HOURS).map(i => mask[(quiet.start + i) % 24]) : null;
  const quietOpen = quietAllowed ? (quietAllowed.every(v => v > 0) ? 'open' : quietAllowed.some(v => v > 0) ? 'partial' : 'blocked') : null;
  const openHours = mask ? HOURS.filter(h => mask[h] > 0) : HOURS;
  const busiestOpen = openHours.reduce((b, h) => (cluster.avg[h] != null && (b == null || cluster.avg[h] > cluster.avg[b]) ? h : b), null);
  const busiestNode = busiestOpen != null
    ? rows.reduce((b, r) => (!b || (r.prof.avg[busiestOpen] ?? -1) > (b.prof.avg[busiestOpen] ?? -1) ? r : b), null)
    : null;
  const hotHours = HOURS.filter(h => rows.some(r => threshold && r.prof.avg[h] != null && r.prof.avg[h] >= threshold));
  const notes = patterns.filter(p => p.weekly_pattern || p.daily_pattern || p.burst_detection?.detected);
  const noteTz = patternsTz || 'UTC';

  const grid = 'grid grid-cols-[3.25rem_repeat(24,minmax(0,1fr))] gap-0.5 items-center';
  const cellTitle = (who, h, avg, peak) => `${who} · ${pad(h)}–${pad(h + 1)}: avg ${m.label} ${avg == null ? '—' : `${Math.round(avg)}%`}, peak ${Math.round(peak || 0)}%`;
  const t = threshold || 100;

  return (
    <div className="space-y-3">
      <ul className="text-sm text-pb-text dark:text-gray-300 space-y-1">
        {quiet && (
          <li>
            Quietest {QUIET_HOURS} hours for the cluster: <strong>{pad(quiet.start)}–{pad(quiet.start + QUIET_HOURS)}</strong> (avg {m.label} {Math.round(quiet.avg)}%)
            {quietOpen === 'open' && <span className="text-emerald-700 dark:text-emerald-400"> — inside your migration window</span>}
            {quietOpen === 'partial' && <span className="text-amber-700 dark:text-amber-400"> — only partly inside your migration window</span>}
            {quietOpen === 'blocked' && <span className="text-amber-700 dark:text-amber-400"> — your schedule blocks migrations then</span>}
          </li>
        )}
        {busiestOpen != null && mask && (
          <li>
            Busiest hour your schedule allows: <strong>{pad(busiestOpen)}</strong> (cluster avg {Math.round(cluster.avg[busiestOpen])}%
            {busiestNode && <>, {busiestNode.node} {Math.round(busiestNode.prof.avg[busiestOpen])}%</>})
            {busiestNode && threshold && busiestNode.prof.avg[busiestOpen] >= threshold && (
              <span className="text-amber-700 dark:text-amber-400"> — {busiestNode.node} is over the {threshold}% threshold then</span>
            )}
          </li>
        )}
        {!mask && <li className="text-pb-text2 dark:text-gray-400">No migration or blackout windows set — automated migrations may run at any hour.</li>}
        {threshold && (
          <li className="text-pb-text2 dark:text-gray-400">
            {hotHours.length
              ? <>Hourly average over the {threshold}% threshold at {hotHours.length} hour{hotHours.length === 1 ? '' : 's'} of the day (outlined).</>
              : <>No node's hourly average reaches the {threshold}% threshold.</>}
          </li>
        )}
      </ul>

      <div className="space-y-0.5">
        <div className={grid}>
          <span />
          {HOURS.map(h => (
            <span key={h} className="text-[10px] text-pb-text3 dark:text-gray-500 tabular-nums">{h % 3 === 0 ? String(h).padStart(2, '0') : ''}</span>
          ))}
        </div>
        {mask && (
          <div className={`${grid} mb-1.5`}>
            <span className="text-[10px] font-medium text-pb-text2 dark:text-gray-400">Allowed</span>
            {HOURS.map(h => (
              <div
                key={h}
                className={`h-2 rounded-sm ${mask[h] > 0 ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-200 dark:bg-slate-700/70'}`}
                style={mask[h] > 0 && mask[h] < 1 ? { opacity: 0.35 + 0.65 * mask[h] } : undefined}
                title={`${pad(h)}–${pad(h + 1)}: ${mask[h] >= 0.999 ? 'migrations allowed' : mask[h] > 0 ? `allowed ${Math.round(mask[h] * 100)}% of the time (some days or part of the hour)` : 'no automated migrations (outside window or blackout)'}`}
              />
            ))}
          </div>
        )}
        {rows.map(({ node, prof }) => (
          <div key={node} className={grid}>
            <span className="text-xs font-medium text-pb-text dark:text-white truncate">{node}</span>
            {HOURS.map(h => (
              <Cell key={h} value={prof.avg[h]} threshold={threshold} hue={m.hue} title={cellTitle(node, h, prof.avg[h], prof.peak[h])} />
            ))}
          </div>
        ))}
        <div className={`${grid} pt-1 mt-1 border-t border-pb-border dark:border-slate-700/50`}>
          <span className="text-[10px] font-medium text-pb-text2 dark:text-gray-400">Cluster</span>
          {HOURS.map(h => (
            <Cell key={h} value={cluster.avg[h]} threshold={threshold} hue={m.hue} title={cellTitle('Cluster', h, cluster.avg[h], cluster.peak[h])} />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-pb-text3 dark:text-gray-500">
        <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
          <span>Avg {m.label} by hour, last {days || 30} days ({tz})</span>
          <span className="inline-flex items-center gap-1 tabular-nums">
            0%
            {[...Array(BELOW).keys()].map(i => (
              <span
                key={i}
                className="inline-block w-3 h-3 rounded-sm bg-[var(--hl)] dark:bg-[var(--hd)]"
                style={rampVars(i, m.hue)}
                title={`${binEdge(i, t)}–${binEdge(i + 1, t)}%`}
              />
            ))}
            {t}%
            <span
              className="inline-block w-3 h-3 rounded-sm bg-[var(--hl)] dark:bg-[var(--hd)] ring-2 ring-inset ring-red-600 dark:ring-red-400 ml-1"
              style={rampVars(STEPS - 1, m.hue)}
              title={`${t}% and over`}
            />
            over
          </span>
        </span>
        <a href="#/automation/schedule" className="inline-flex items-center gap-1 font-medium text-pb-accent dark:text-pb-accent-dark hover:underline">
          Edit migration windows <ArrowRight size={12} />
        </a>
      </div>

      {notes.length > 0 && (
        <div className="text-xs text-pb-text2 dark:text-gray-400 space-y-0.5">
          {notes.map(p => (
            <div key={p.node}>
              <strong className="text-pb-text dark:text-gray-300">{p.node}</strong>
              {p.weekly_pattern && <> · weekly cycle, busier {(p.weekly_pattern.peak_days || []).join(', ')} (CPU {Math.round(p.weekly_pattern.weekday_avg)}% weekdays vs {Math.round(p.weekly_pattern.weekend_avg)}% weekends)</>}
              {p.daily_pattern && <> · daily cycle, CPU {Math.round(p.daily_pattern.business_hours_avg)}% business hours vs {Math.round(p.daily_pattern.off_hours_avg)}% off-hours</>}
              {p.burst_detection?.detected && <> · recurring bursts at {p.burst_detection.burst_hours.map(pad).join(', ')} {noteTz}</>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
