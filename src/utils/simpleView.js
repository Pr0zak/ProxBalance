// Simple view: the widget catalog, presets, the saved layout and the plain
// summaries each widget shows. Pure (no React), so tests/js/simple-view.mjs
// can check it.

import { parseTimestamp } from './formatters.js';
import { shortWhy } from './automationStory.js';
import { BACKUP_STALE_DAYS } from './backupStatus.js';

// ---------------------------------------------------------------------------
// Catalog and presets
// ---------------------------------------------------------------------------

/** Every widget, in the order the picker lists unpicked ones. */
export const WIDGETS = [
  { id: 'status', name: 'Cluster status', desc: 'Gauges: nodes up, guests running, CPU, memory, moves, backups.' },
  { id: 'attention', name: 'Needs you', desc: 'Only things with something to do.' },
  { id: 'nodes', name: 'Node load', desc: 'CPU and memory gauges per node with the last 24 hours.' },
  { id: 'moves', name: 'Moves', desc: 'Moves per day for a week, and the latest ones.' },
  { id: 'backups', name: 'Backups', desc: 'Last backup of each guest, and results per day for two weeks.' },
  { id: 'forecast', name: 'Coming up', desc: 'The node nearest a limit, charted, and when it gets there.' },
  { id: 'automation', name: 'Automation', desc: 'On or off, and every check in the last 24 hours.' },
  { id: 'approvals', name: 'Waiting for approval', desc: 'Moves that need your yes (semi-automatic mode).' },
  { id: 'timeline', name: 'What happened', desc: 'The last 24 hours on a time line, newest first.' },
  { id: 'capacity', name: 'Room left', desc: 'Memory per node up to your limit, and how many 4 GB guests fit.' },
  { id: 'guests', name: 'Guests', desc: 'Running and stopped guests on each node.' },
  { id: 'load', name: 'Load, 24 h', desc: 'A line per node for CPU, memory or IO wait; touch the chart to read a time.' },
  { id: 'rhythm', name: 'Busy hours', desc: 'Cluster CPU by hour of day for the last 7 days, as a heat map.' },
  { id: 'topguests', name: 'Busiest guests', desc: 'The guests using the most CPU, memory, network or disk right now.' },
  { id: 'storage', name: 'Storage', desc: 'How full each storage pool is, fullest first.' },
  { id: 'memmap', name: 'Memory map', desc: 'Each node’s memory split into its guests, the host, and free.' },
  { id: 'maintenance', name: 'Maintenance', desc: 'Nodes in maintenance and the guests still on them.' },
];

const WIDGET_IDS = new Set(WIDGETS.map(w => w.id));
export const widgetById = (id) => WIDGETS.find(w => w.id === id) || null;

const L = (...items) => items.map(([id, wide]) => ({ id, wide: !!wide }));

/** Calm is the default: what a first-time viewer sees. */
export const PRESETS = [
  { id: 'calm', label: 'Calm', layout: L(['status', 1], ['nodes', 1], ['attention'], ['backups'], ['moves'], ['forecast'], ['automation'], ['capacity']) },
  { id: 'operator', label: 'Operator', layout: L(['status', 1], ['attention'], ['approvals'], ['automation'], ['nodes', 1], ['moves'], ['backups'], ['forecast'], ['guests'], ['capacity'], ['timeline']) },
  { id: 'wall', label: 'Wall', layout: L(['status', 1], ['load', 1], ['nodes', 1], ['moves'], ['backups'], ['timeline']) },
  { id: 'charts', label: 'Charts', layout: L(['status', 1], ['load', 1], ['memmap', 1], ['rhythm'], ['topguests'], ['storage'], ['moves'], ['backups'], ['forecast']) },
];
export const DEFAULT_PRESET = 'calm';
export const presetLayout = (id) => (PRESETS.find(p => p.id === id) || PRESETS[0]).layout.map(x => ({ ...x }));

/** The preset a layout matches exactly, or null once it has been changed. */
export function matchingPreset(layout) {
  const key = (l) => l.map(x => `${x.id}:${x.wide ? 1 : 0}`).join(',');
  const k = key(layout || []);
  return PRESETS.find(p => key(p.layout) === k)?.id || null;
}

/** Drop unknown and repeated ids; anything unusable falls back to the default. */
export function normalizeLayout(raw) {
  if (!Array.isArray(raw)) return presetLayout(DEFAULT_PRESET);
  const seen = new Set();
  const out = [];
  for (const it of raw) {
    const id = typeof it === 'string' ? it : it?.id;
    if (!WIDGET_IDS.has(id) || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, wide: !!it?.wide });
  }
  return out;
}

export function toggleWidget(layout, id) {
  return layout.some(x => x.id === id) ? layout.filter(x => x.id !== id) : [...layout, { id, wide: false }];
}

export function moveWidget(layout, id, dir) {
  const i = layout.findIndex(x => x.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= layout.length) return layout;
  const next = [...layout];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export const toggleWide = (layout, id) => layout.map(x => (x.id === id ? { ...x, wide: !x.wide } : x));

// Per-browser storage (a wall screen and a phone can differ).
export const LAYOUT_KEY = 'pb.simpleLayout';
export const MODE_KEY = 'pb.viewMode';

export function readLayout(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(LAYOUT_KEY);
    return raw ? normalizeLayout(JSON.parse(raw)) : presetLayout(DEFAULT_PRESET);
  } catch { return presetLayout(DEFAULT_PRESET); }
}

export function writeLayout(layout, storage = globalThis.localStorage) {
  try { storage?.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* per-browser nicety only */ }
}

/** 'simple' or 'full' (the default: nothing changes until someone switches). */
export function readViewMode(storage = globalThis.localStorage) {
  try { return storage?.getItem(MODE_KEY) === 'simple' ? 'simple' : 'full'; } catch { return 'full'; }
}

export function writeViewMode(mode, storage = globalThis.localStorage) {
  try { storage?.setItem(MODE_KEY, mode === 'simple' ? 'simple' : 'full'); } catch { /* per-browser nicety only */ }
}

// ---------------------------------------------------------------------------
// Summaries
// ---------------------------------------------------------------------------

/** ok under the limit, warn at or over it, bad at 90 % or more. */
export function loadTone(value, limit) {
  if (typeof value !== 'number') return 'none';
  if (value >= 90) return 'bad';
  if (typeof limit === 'number' && value >= limit) return 'warn';
  return 'ok';
}

const inMaint = (maintenanceNodes, name) => {
  if (!maintenanceNodes) return false;
  if (maintenanceNodes instanceof Set) return maintenanceNodes.has(name);
  if (Array.isArray(maintenanceNodes)) return maintenanceNodes.includes(name);
  return !!maintenanceNodes[name];
};

/** Node rows for the load bars, by name. */
export function nodeRows(nodes, { cpuLimit, memLimit, maintenanceNodes } = {}) {
  return Object.values(nodes || {})
    .map(n => {
      const online = n.status === 'online';
      const cpu = online && typeof n.cpu_percent === 'number' ? n.cpu_percent : null;
      const mem = online && typeof n.mem_percent === 'number' ? n.mem_percent : null;
      return {
        name: n.name, online, maintenance: inMaint(maintenanceNodes, n.name),
        cpu, mem, cpuTone: loadTone(cpu, cpuLimit), memTone: loadTone(mem, memLimit),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** The one-line verdict: { tone: ok|warn|bad, text, sub }. */
export function clusterLine({ nodes, guests, attentionCount = 0, badCount = 0, automationOn = null }) {
  const all = Object.values(nodes || {});
  const up = all.filter(n => n.status === 'online').length;
  const down = all.length - up;
  const gl = Object.values(guests || {}).filter(g => !g.template);
  const running = gl.filter(g => g.status === 'running').length;
  const parts = [];
  if (down > 0) parts.push(`${down} of ${all.length} nodes down`);
  else parts.push(all.length === 1 ? 'The node is up' : `All ${all.length} nodes up`);
  if (attentionCount > 0) parts.push(`${attentionCount} ${attentionCount === 1 ? 'thing needs' : 'things need'} a look`);
  else if (down === 0) parts.push('nothing needs you');
  const tone = down > 0 || badCount > 0 ? 'bad' : attentionCount > 0 ? 'warn' : 'ok';
  const sub = [
    gl.length ? `${gl.length} guests, ${running} running` : null,
    automationOn == null ? null : `automation ${automationOn ? 'on' : 'off'}`,
  ].filter(Boolean).join(' · ');
  return { tone, text: parts.join(' · '), sub };
}

/**
 * Backups across guests (from the collector's per-guest `backup`):
 * { known, good, failed: [guest], stale: [guest], none: [guest] }.
 * `known` is false when the collector didn't read backup results.
 */
export function backupTally(guests, nowSec = Date.now() / 1000) {
  const gl = Object.values(guests || {}).filter(g => !g.template);
  const known = gl.some(g => g.backup !== undefined);
  const out = { known, good: 0, failed: [], stale: [], none: [] };
  if (!known) return out;
  for (const g of gl) {
    const b = g.backup;
    if (b === undefined) continue;
    if (b === null) out.none.push(g);
    else if (b.last_attempt_ok === false) out.failed.push(g);
    else if (nowSec - b.last_ok > BACKUP_STALE_DAYS * 86400) out.stale.push(g);
    else out.good += 1;
  }
  return out;
}

const tsMs = (ts) => parseTimestamp(ts)?.getTime() ?? null;

/** Moves (manual and automatic) in the last `hours`, newest first. */
export function recentMoves(migrations, nowMs = Date.now(), hours = 24) {
  return (migrations || [])
    .map(m => ({ m, t: tsMs(m.timestamp) }))
    .filter(({ m, t }) => t != null && nowMs - t <= hours * 3600e3 && !m.dry_run
      && ['completed', 'failed'].includes(m.status))
    .sort((a, b) => b.t - a.t)
    .map(({ m, t }) => ({
      time: t, vmid: m.vmid, name: m.name || m.guest_name || `guest ${m.vmid}`,
      from: m.source_node, to: m.target_node, ok: m.status === 'completed',
      why: m.status === 'completed' ? shortWhy(m) : (m.error_message || 'failed'),
      by: m.initiated_by === 'automated' ? 'automation' : 'manual',
    }));
}

/**
 * How many more guests of `sizeGb` fit on online, non-maintenance nodes
 * before each passes `memLimit` percent memory.
 */
export function roomLeft(nodes, { memLimit, maintenanceNodes, sizeGb = 4 } = {}) {
  if (typeof memLimit !== 'number') return null;
  let count = 0;
  const per = [];
  for (const n of Object.values(nodes || {})) {
    if (n.status !== 'online' || inMaint(maintenanceNodes, n.name)) continue;
    if (typeof n.total_mem_gb !== 'number' || typeof n.mem_percent !== 'number') continue;
    const free = n.total_mem_gb * (memLimit - n.mem_percent) / 100;
    const fit = Math.max(0, Math.floor(free / sizeGb));
    count += fit;
    per.push({ name: n.name, fit });
  }
  per.sort((a, b) => b.fit - a.fit);
  return { count, sizeGb, memLimit, per };
}

/**
 * The last day in order, newest first: moves, failed backups and the last
 * backup round. [{ time, tone: ok|info|warn|bad, text, detail, href }]
 */
export function timelineEvents({ migrations, guests, nowMs = Date.now(), hours = 24 }) {
  const ev = recentMoves(migrations, nowMs, hours).map(m => ({
    time: m.time,
    tone: m.ok ? 'info' : 'bad',
    text: m.ok ? `Moved ${m.name} from ${m.from} to ${m.to}` : `Move of ${m.name} failed`,
    detail: `${m.by === 'automation' ? 'Automation' : 'By hand'} · ${m.why}`,
    href: '#/automation/history',
  }));
  const since = (nowMs - hours * 3600e3) / 1000;
  const gl = Object.values(guests || {}).filter(g => g.backup);
  for (const g of gl) {
    const b = g.backup;
    if (b.last_attempt_ok === false && b.last_attempt >= since) {
      ev.push({
        time: b.last_attempt * 1000, tone: 'bad', text: `Backup of ${g.name} failed`,
        detail: b.last_error || '', href: `#/dashboard/guests/guest/${g.vmid}`,
      });
    }
  }
  const okTimes = gl.map(g => g.backup.last_ok).filter(t => typeof t === 'number' && t >= since);
  if (okTimes.length) {
    ev.push({
      time: Math.max(...okTimes) * 1000, tone: 'ok',
      text: `Backups: ${okTimes.length} good`, detail: 'Last backup round', href: '#/dashboard/guests',
    });
  }
  return ev.sort((a, b) => b.time - a.time);
}

/** "14:32" today, "Tue 01:00" earlier. */
export function eventTime(ms, nowMs = Date.now()) {
  const d = new Date(ms);
  const now = new Date(nowMs);
  const hm = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  return d.toDateString() === now.toDateString() ? hm : `${d.toLocaleDateString([], { weekday: 'short' })} ${hm}`;
}

/**
 * Everything that needs the operator, most serious first:
 * [{ id, tone: warn|bad, text, href }]. Built from the dashboard's attention
 * rules plus approvals waiting, failed backups and limits coming up.
 */
export function needsYou({ attention = [], approvals = [], backups = null, crossings = [] }) {
  const rows = attention.map(a => ({ id: a.id, tone: a.tone === 'error' ? 'bad' : 'warn', text: a.label, href: a.href }));
  if (approvals.length) {
    rows.push({
      id: 'approvals', tone: 'warn', href: '#/automation',
      text: approvals.length === 1 ? `Approve or skip the move of ${approvals[0].name || `guest ${approvals[0].vmid}`}` : `${approvals.length} moves waiting for approval`,
    });
  }
  if (backups?.failed?.length) {
    const f = backups.failed;
    rows.push({
      id: 'backup-failed', tone: 'bad', href: f.length === 1 ? `#/dashboard/guests/guest/${f[0].vmid}` : '#/dashboard/guests',
      text: f.length === 1 ? `Backup of ${f[0].name} failed` : `${f.length} backups failed`,
    });
  }
  const soon = crossings.filter(c => typeof c.days === 'number' && c.days <= 14);
  if (soon.length) {
    const c = soon[0];
    rows.push({
      id: 'forecast', tone: 'warn', href: '#/insights',
      text: `${c.node} ${c.metric === 'cpu' ? 'CPU' : c.metric === 'iowait' ? 'IO wait' : c.metric} ${c.kind === 'over' ? 'full' : 'over its limit'} in about ${Math.max(1, Math.round(c.days))} days${soon.length > 1 ? ` (+${soon.length - 1} more)` : ''}`,
    });
  }
  const rank = { bad: 0, warn: 1 };
  return rows.sort((a, b) => rank[a.tone] - rank[b.tone]);
}

// ---------------------------------------------------------------------------
// Chart data
// ---------------------------------------------------------------------------

/**
 * Average a [{time, <key>}] series down to `n` buckets for a sparkline.
 * Missing samples stay null (a gap, not a zero).
 */
export function downsample(points, key, n = 48) {
  const pts = (points || []).filter(p => p && typeof p.time === 'number');
  if (pts.length < 2) return [];
  if (pts.length <= n) return pts.map(p => (typeof p[key] === 'number' ? p[key] : null));
  const step = pts.length / n;
  const out = [];
  for (let b = 0; b < n; b++) {
    const vals = pts.slice(Math.floor(b * step), Math.floor((b + 1) * step))
      .map(p => p[key]).filter(v => typeof v === 'number' && isFinite(v));
    out.push(vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null);
  }
  return out;
}

/** Local-day buckets, oldest first: [{ key: 'YYYY-MM-DD', label, start, end }] (ms). */
export function dayBuckets(nowMs, days) {
  const out = [];
  const today = new Date(nowMs);
  today.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const end = new Date(d);
    end.setDate(d.getDate() + 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const label = i === 0 ? 'Today' : d.toLocaleDateString([], { weekday: 'short' });
    out.push({ key, label, start: d.getTime(), end: end.getTime() });
  }
  return out;
}

const bucketOf = (buckets, ms) => buckets.find(b => ms >= b.start && ms < b.end) || null;

/** Moves per local day: [{ key, label, auto, manual, failed }], oldest first. */
export function movesByDay(migrations, nowMs = Date.now(), days = 7) {
  const buckets = dayBuckets(nowMs, days).map(b => ({ ...b, auto: 0, manual: 0, failed: 0 }));
  for (const m of migrations || []) {
    if (m.dry_run || !['completed', 'failed'].includes(m.status)) continue;
    const t = tsMs(m.timestamp);
    const b = t == null ? null : bucketOf(buckets, t);
    if (!b) continue;
    if (m.status === 'failed') b.failed += 1;
    else if (m.initiated_by === 'automated') b.auto += 1;
    else b.manual += 1;
  }
  return buckets;
}

/**
 * Backup results per local day from GET /api/backups/runs rows
 * ([vmid, epochSec, ok]): [{ key, label, ok, failed, known }], oldest first.
 * `known` is false for days before recording started.
 */
export function backupsByDay(runs, nowMs = Date.now(), days = 14, recordedFrom = null) {
  const buckets = dayBuckets(nowMs, days).map(b => ({
    ...b, ok: 0, failed: 0,
    known: typeof recordedFrom === 'number' ? b.end > recordedFrom * 1000 : true,
  }));
  for (const [, ts, ok] of runs || []) {
    const b = bucketOf(buckets, ts * 1000);
    if (!b) continue;
    if (ok) b.ok += 1; else b.failed += 1;
  }
  return buckets;
}

const avg = (xs) => (xs.length ? xs.reduce((a, v) => a + v, 0) / xs.length : null);

/**
 * The headline numbers: nodes up, guests running, average CPU and memory
 * over online nodes, with tones against the limits.
 */
export function clusterKpis(nodes, guests, { cpuLimit, memLimit } = {}) {
  const all = Object.values(nodes || {});
  const online = all.filter(n => n.status === 'online');
  const gl = Object.values(guests || {}).filter(g => !g.template);
  const cpu = avg(online.map(n => n.cpu_percent).filter(v => typeof v === 'number'));
  const mem = avg(online.map(n => n.mem_percent).filter(v => typeof v === 'number'));
  return {
    nodesUp: online.length, nodesTotal: all.length,
    running: gl.filter(g => g.status === 'running').length, guestsTotal: gl.length,
    cpu, mem, cpuTone: loadTone(cpu, cpuLimit), memTone: loadTone(mem, memLimit),
  };
}

/** Guests per node, running and stopped, by name: [{ name, running, stopped }]. */
export function guestSpread(nodes, guests) {
  const rows = {};
  for (const n of Object.values(nodes || {})) rows[n.name] = { name: n.name, running: 0, stopped: 0 };
  for (const g of Object.values(guests || {})) {
    if (g.template || !rows[g.node]) continue;
    if (g.status === 'running') rows[g.node].running += 1; else rows[g.node].stopped += 1;
  }
  return Object.values(rows).sort((a, b) => a.name.localeCompare(b.name));
}

/** Where an epoch-ms time sits on the last `hours`, 0 (oldest) to 1 (now). */
export function trackPos(ms, nowMs = Date.now(), hours = 24) {
  return Math.max(0, Math.min(1, 1 - (nowMs - ms) / (hours * 3600e3)));
}

/**
 * Average each node's [{time (s), <key>}] samples into `n` equal time buckets
 * ending at `nowSec` and covering `hours`. Returns { times: [bucket start s],
 * lines: { node: [value|null] } } so every node shares one time axis.
 */
export function alignedSeries(seriesByNode, key, { nowSec = Date.now() / 1000, hours = 24, n = 96 } = {}) {
  const span = hours * 3600;
  const start = nowSec - span;
  const step = span / n;
  const times = Array.from({ length: n }, (_, i) => start + i * step);
  const lines = {};
  for (const [node, pts] of Object.entries(seriesByNode || {})) {
    const sum = new Array(n).fill(0);
    const cnt = new Array(n).fill(0);
    for (const p of pts || []) {
      const v = p?.[key];
      if (typeof p?.time !== 'number' || typeof v !== 'number' || !isFinite(v)) continue;
      const b = Math.floor((p.time - start) / step);
      if (b < 0 || b >= n) continue;
      sum[b] += v; cnt[b] += 1;
    }
    lines[node] = sum.map((s, i) => (cnt[i] ? s / cnt[i] : null));
  }
  return { times, lines };
}

/**
 * Cluster-wide average of `key` per local day and hour over the last `days`
 * days: { rows: [{ key, label, cells: [24 × value|null] }], max, min, peak }.
 * `peak` is the busiest cell { label, hour, value }. Hours still to come
 * today are null.
 */
export function hourGrid(seriesByNode, key, nowMs = Date.now(), days = 7) {
  const buckets = dayBuckets(nowMs, days);
  const sum = buckets.map(() => new Array(24).fill(0));
  const cnt = buckets.map(() => new Array(24).fill(0));
  for (const pts of Object.values(seriesByNode || {})) {
    for (const p of pts || []) {
      const v = p?.[key];
      if (typeof p?.time !== 'number' || typeof v !== 'number' || !isFinite(v)) continue;
      const ms = p.time * 1000;
      const d = buckets.findIndex(b => ms >= b.start && ms < b.end);
      if (d < 0) continue;
      const h = new Date(ms).getHours();
      sum[d][h] += v; cnt[d][h] += 1;
    }
  }
  let max = 0;
  let min = null;
  let peak = null;
  const rows = buckets.map((b, d) => ({
    key: b.key, label: b.label,
    cells: sum[d].map((s, h) => {
      if (!cnt[d][h]) return null;
      const v = s / cnt[d][h];
      if (v > max) { max = v; peak = { label: b.label, hour: h, value: v }; }
      if (min == null || v < min) min = v;
      return v;
    }),
  }));
  return { rows, max, min, peak };
}

/** Bytes per second as "1.2 MB/s". */
export function fmtRate(bps) {
  if (typeof bps !== 'number' || !isFinite(bps)) return '—';
  const u = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  let v = bps;
  let i = 0;
  while (v >= 1000 && i < u.length - 1) { v /= 1000; i += 1; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${u[i]}`;
}

export const GUEST_METRICS = [
  { id: 'cpu', label: 'CPU' },
  { id: 'mem', label: 'Memory' },
  { id: 'net', label: 'Network' },
  { id: 'disk', label: 'Disk' },
];

/**
 * The `n` busiest running guests by one metric:
 * [{ vmid, name, node, type, value, max, text }], biggest first. CPU is the
 * share of the guest's own cores, memory is used GB against its maximum,
 * network and disk are in + out (read + write) per second.
 */
export function topGuests(guests, metric = 'cpu', n = 6) {
  const num = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const rows = Object.values(guests || {})
    .filter(g => !g.template && g.status === 'running')
    .map(g => {
      let value = null;
      let max = null;
      let text = '—';
      if (metric === 'cpu') {
        value = num(g.cpu_current);
        max = 100;
        if (value != null) text = `${Math.round(value)}% of ${g.cpu_cores || '?'} core${g.cpu_cores === 1 ? '' : 's'}`;
      } else if (metric === 'mem') {
        value = num(g.mem_used_gb);
        max = num(g.mem_max_gb);
        if (value != null) text = `${value.toFixed(1)} of ${max != null ? max.toFixed(0) : '?'} GB`;
      } else if (metric === 'net') {
        const a = num(g.net_in_bps);
        const b = num(g.net_out_bps);
        if (a != null || b != null) { value = (a || 0) + (b || 0); text = fmtRate(value); }
      } else if (metric === 'disk') {
        const a = num(g.disk_read_bps);
        const b = num(g.disk_write_bps);
        if (a != null || b != null) { value = (a || 0) + (b || 0); text = fmtRate(value); }
      }
      return { vmid: g.vmid, name: g.name || `guest ${g.vmid}`, node: g.node, type: g.type, value, max, text };
    })
    .filter(r => r.value != null && r.value > 0)
    .sort((a, b) => b.value - a.value);
  return rows.slice(0, n);
}

/**
 * Storage pools by how full they are: shared pools once, local pools per
 * node. [{ id, name, node, shared, type, usedGb, totalGb, pct, tone }].
 */
export function storagePools(nodes) {
  const seen = new Set();
  const out = [];
  for (const n of Object.values(nodes || {})) {
    if (n.status !== 'online') continue;
    for (const s of n.storage || []) {
      if (!s || s.active === false || typeof s.total_gb !== 'number' || s.total_gb <= 0) continue;
      const id = s.shared ? s.storage : `${s.storage}@${n.name}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const pct = typeof s.usage_pct === 'number' ? s.usage_pct : (s.used_gb / s.total_gb) * 100;
      out.push({
        id, name: s.storage, node: s.shared ? null : n.name, shared: !!s.shared, type: s.type,
        usedGb: s.used_gb, totalGb: s.total_gb, pct, tone: pct >= 90 ? 'bad' : pct >= 80 ? 'warn' : 'ok',
      });
    }
  }
  return out.sort((a, b) => b.pct - a.pct || a.id.localeCompare(b.id));
}

/** "936 GB", "9.4 TB". */
export function fmtGb(gb) {
  if (typeof gb !== 'number' || !isFinite(gb)) return '—';
  return gb >= 1000 ? `${(gb / 1000).toFixed(gb >= 10000 ? 0 : 1)} TB` : `${Math.round(gb)} GB`;
}

/**
 * One column per online node for the memory map: its running guests by
 * memory used (largest first), what the host and anything else uses, and
 * what is free. [{ name, totalGb, guests: [{ vmid, name, type, gb }],
 * otherGb, freeGb }].
 */
export function memoryColumns(nodes, guests) {
  return Object.values(nodes || {})
    .filter(n => n.status === 'online' && typeof n.total_mem_gb === 'number' && n.total_mem_gb > 0)
    .map(n => {
      const usedGb = typeof n.mem_percent === 'number' ? (n.mem_percent / 100) * n.total_mem_gb : null;
      const gl = (n.guests || []).map(v => guests?.[v]).filter(g => g && !g.template && g.status === 'running'
        && typeof g.mem_used_gb === 'number' && g.mem_used_gb > 0)
        .map(g => ({ vmid: g.vmid, name: g.name || `guest ${g.vmid}`, type: g.type, gb: g.mem_used_gb }))
        .sort((a, b) => b.gb - a.gb);
      const guestGb = gl.reduce((a, g) => a + g.gb, 0);
      const otherGb = usedGb == null ? 0 : Math.max(0, usedGb - guestGb);
      const freeGb = Math.max(0, n.total_mem_gb - guestGb - otherGb);
      return { name: n.name, totalGb: n.total_mem_gb, guests: gl, otherGb, freeGb };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// Named layouts (per browser, like the layout itself)
// ---------------------------------------------------------------------------

export const SAVED_KEY = 'pb.simpleSaved';
export const MAX_NAME = 40;

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const layoutKey = (l) => (l || []).map(x => `${x.id}:${x.wide ? 1 : 0}`).join(',');

/** Saved layouts [{ name, layout }]; junk entries are dropped. */
export function readSaved(storage = globalThis.localStorage) {
  try {
    const raw = JSON.parse(storage?.getItem(SAVED_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(s => s && typeof s.name === 'string' && s.name.trim() && Array.isArray(s.layout))
      .map(s => ({ name: s.name.trim().slice(0, MAX_NAME), layout: normalizeLayout(s.layout) }));
  } catch { return []; }
}

export function writeSaved(list, storage = globalThis.localStorage) {
  try { storage?.setItem(SAVED_KEY, JSON.stringify(list)); } catch { /* per-browser nicety only */ }
}

/**
 * Why a name can't be used, or null. A preset's name is taken; an existing
 * saved name is fine (saving replaces it).
 */
export function nameProblem(name) {
  const n = (name || '').trim();
  if (!n) return 'Give it a name.';
  if (n.length > MAX_NAME) return `At most ${MAX_NAME} characters.`;
  if (PRESETS.some(p => sameName(p.label, n))) return `"${PRESETS.find(p => sameName(p.label, n)).label}" is a preset name.`;
  return null;
}

/** Save `layout` as `name`, replacing a saved layout of the same name (any case). */
export function saveNamed(list, name, layout) {
  const n = name.trim().slice(0, MAX_NAME);
  const entry = { name: n, layout: layout.map(x => ({ id: x.id, wide: !!x.wide })) };
  const i = list.findIndex(s => sameName(s.name, n));
  if (i < 0) return [...list, entry];
  const next = [...list];
  next[i] = entry;
  return next;
}

export const deleteNamed = (list, name) => list.filter(s => !sameName(s.name, name));

/** The saved layout `layout` matches exactly, by name, or null. */
export function matchingSaved(layout, list) {
  const k = layoutKey(layout);
  return (list || []).find(s => layoutKey(s.layout) === k)?.name || null;
}
