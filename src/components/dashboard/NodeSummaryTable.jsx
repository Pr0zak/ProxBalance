import {
  GLASS_CARD, TABLE_HEADER, TABLE_ROW, PROGRESS_BAR_BG,
  metricColor, metricTextColor, scoreColor, TEXT_HEADING, ICON, nodeRoleEdge,
} from '../../utils/designTokens.js';
import { AlertTriangle, ChevronDown, Tag, X } from '../Icons.jsx';
import { failedDiskCount } from '../../utils/diskHealth.js';
import { recBadgeTooltip } from './recsHelpers.js';
import { HEADROOM_HINT, DEFAULT_CPU_THRESHOLD, DEFAULT_MEM_THRESHOLD, DEFAULT_IOWAIT_THRESHOLD } from '../../utils/constants.js';
import { penaltyList, penaltyTooltip, toNodeSet, ioPressureFact } from '../../utils/nodeCondition.js';
import { nodeRoles } from '../../utils/nodeRoles.js';
import { NodeRoleMarker, NodeRoleLegend } from './NodeRoleMarker.jsx';
import MoreInfo from '../MoreInfo.jsx';

const { useState, useMemo } = React;

const WORKLOAD_BADGE_COLORS = {
  steady: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  bursty: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  growing: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  cyclical: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
};

const TOTAL_COLS = 12;

// Narrower cell padding on phones so the visible columns fit without scrolling.
const PHONE_PAD_X = '!px-2 md:!px-3';

/** Inline progress bar with label */
function MetricBar({ pct, detail, title }) {
  const clampedPct = Math.min(100, Math.max(0, pct || 0));
  return (
    <div className="min-w-[56px] md:min-w-[120px]" title={title}>
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-xs font-mono tabular-nums ${metricTextColor(clampedPct)}`}>
          {Math.round(clampedPct)}%
        </span>
        {detail && <span className="text-[10px] text-pb-text2 dark:text-gray-500 ml-1 hidden xl:inline">{detail}</span>}
      </div>
      <div className={PROGRESS_BAR_BG}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${metricColor(clampedPct)}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}

/** CPU bar split into the share held by guests ProxBalance won't move
 *  (ignored / passthrough-pinned — muted, hatched) and the movable rest. */
function CpuBar({ pct, anchored, anchoredGuests, detail, nodeName }) {
  const total = Math.min(100, Math.max(0, pct || 0));
  const fixed = Math.min(total, Math.max(0, anchored || 0));
  const movable = total - fixed;
  const names = (anchoredGuests || []).filter(g => (g.cpu_share || 0) >= 0.5);
  const title = fixed >= 0.5
    ? `${Math.round(total)}% CPU in use on ${nodeName}.\n`
      + `${names.length ? names.map(g => g.name).join(', ') : 'Guests that stay put'} ${names.length === 1 ? 'holds' : 'hold'} ${Math.round(fixed)}% — can't be moved`
      + (names.length > 1 ? ` (${names.map(g => `${g.name} ${Math.round(g.cpu_share)}%`).join(', ')})` : '')
      + `.\nThe other ${Math.round(movable)}% is guests ProxBalance can move.`
    : `${Math.round(total)}% CPU in use on ${nodeName}`;
  return (
    <div className="min-w-[56px] md:min-w-[120px]" title={title}>
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-xs font-mono tabular-nums ${metricTextColor(total)}`}>{Math.round(total)}%</span>
        {fixed >= 0.5
          ? <span className="text-[10px] text-pb-text2 dark:text-gray-500 ml-1 hidden xl:inline tabular-nums">{Math.round(fixed)}% fixed</span>
          : detail && <span className="text-[10px] text-pb-text2 dark:text-gray-500 ml-1 hidden xl:inline">{detail}</span>}
      </div>
      <div className={`${PROGRESS_BAR_BG} flex`}>
        {fixed > 0 && (
          <div
            className="h-full bg-slate-400 dark:bg-slate-500"
            style={{ width: `${fixed}%`, backgroundImage: HATCH }}
          />
        )}
        {movable > 0 && (
          <div
            className={`h-full ${metricColor(total)} ${fixed > 0 ? 'border-l-2 border-white dark:border-pb-surface-dark' : ''}`}
            style={{ width: `${movable}%` }}
          />
        )}
      </div>
    </div>
  );
}

const HATCH = 'repeating-linear-gradient(135deg, rgba(255,255,255,0.45) 0 2px, transparent 2px 4px)';

/** Last-24h CPU line from the node's RRD trend data. Renders nothing with
 *  fewer than two points (no placeholder chart). */
function CpuSparkline({ trendData, nodeName }) {
  const [hover, setHover] = useState(null);
  const series = useMemo(() => {
    const raw = trendData?.day || [];
    if (raw.length < 2) return null;
    const latest = raw.reduce((m, p) => Math.max(m, p.time || 0), 0);
    const pts = raw.filter(p => typeof p.cpu === 'number' && latest - p.time <= 86400).sort((a, b) => a.time - b.time);
    if (pts.length < 2) return null;
    // ~72 buckets (20 min each over a day): averaged, so a single sample can't dominate
    const n = Math.min(72, pts.length);
    const out = [];
    for (let i = 0; i < n; i++) {
      const win = pts.slice(Math.floor(i * pts.length / n), Math.floor((i + 1) * pts.length / n));
      if (!win.length) continue;
      out.push({ time: win[win.length - 1].time, cpu: win.reduce((s, p) => s + p.cpu, 0) / win.length });
    }
    return out.length >= 2 ? out : null;
  }, [trendData]);
  if (!series) return null;

  const W = 120, H = 28, PAD = 2;
  const max = Math.max(...series.map(p => p.cpu));
  const yMax = Math.max(25, Math.ceil(max / 25) * 25);
  const x = (i) => PAD + (i / (series.length - 1)) * (W - 2 * PAD);
  const y = (v) => H - PAD - (v / yMax) * (H - 2 * PAD);
  const line = series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cpu).toFixed(1)}`).join('');
  const area = `${line}L${x(series.length - 1).toFixed(1)},${H - PAD}L${x(0).toFixed(1)},${H - PAD}Z`;
  const avg = series.reduce((s, p) => s + p.cpu, 0) / series.length;
  const h = hover != null ? series[hover] : null;
  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left) / r.width) * (series.length - 1));
    setHover(Math.max(0, Math.min(series.length - 1, i)));
  };
  const fmt = (t) => new Date(t * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-center gap-2" title={`${nodeName} CPU, last 24 h: average ${Math.round(avg)}%, peak ${Math.round(max)}% (20-min averages, scale 0–${yMax}%)`}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="text-blue-500 dark:text-blue-400 shrink-0 cursor-crosshair"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} onClick={(e) => e.stopPropagation()} role="img" aria-label={`${nodeName} CPU over the last 24 hours`}>
        <path d={area} fill="currentColor" opacity="0.12" />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <>
            <line x1={x(hover)} x2={x(hover)} y1={0} y2={H} className="stroke-slate-400 dark:stroke-slate-500" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(h.cpu)} r="2.5" fill="currentColor" className="stroke-white dark:stroke-pb-surface-dark" strokeWidth="1" />
          </>
        )}
      </svg>
      <span className="text-[10px] tabular-nums text-pb-text2 dark:text-gray-500 w-14 leading-tight">
        {h ? <>{fmt(h.time)}<br /><span className="text-pb-text dark:text-gray-300">{Math.round(h.cpu)}%</span></> : <>peak<br /><span className="text-pb-text dark:text-gray-300">{Math.round(max)}%</span></>}
      </span>
    </div>
  );
}

// Storage types that are shared between nodes (NAS, backup server, Ceph,
// ZFS-over-iSCSI). They report the same fill on every node, so a 50 TB CIFS
// share at 69% would otherwise paint every node's disk bar amber.
const SHARED_STORAGE_TYPES = new Set(['cifs', 'nfs', 'pbs', 'rbd', 'cephfs', 'glusterfs', 'iscsi', 'iscsidirect', 'zfs']);

function isSharedStorage(s) {
  // PVE's own `shared` flag wins when the collector passes it through.
  if (s.shared === true || s.shared === 1 || s.shared === '1') return true;
  if (s.shared === false || s.shared === 0 || s.shared === '0') return false;
  return SHARED_STORAGE_TYPES.has(String(s.type || '').toLowerCase());
}

/** Fullest active local pool on a node, or null when it has only shared storage. */
function fullestLocalPool(storageArr) {
  const pctOf = s => (typeof s.usage_pct === 'number' ? s.usage_pct : ((s.used_gb || 0) / s.total_gb) * 100);
  const pools = (storageArr || []).filter(s => s.active !== false && (s.total_gb || 0) > 0 && !isSharedStorage(s));
  if (pools.length === 0) return null;
  const fullest = pools.reduce((a, b) => (pctOf(b) > pctOf(a) ? b : a));
  return {
    pct: pctOf(fullest),
    name: fullest.storage,
    title: `Fullest local pool: ${fullest.storage}\n`
      + pools.map(s => `${s.storage} (${s.type}) ${pctOf(s).toFixed(1)}% of ${Math.round(s.total_gb)} GB`).join('\n')
      + '\nShared storage (CIFS/NFS/PBS/Ceph...) is left out: it shows the same fill on every node.',
  };
}

/** IOWait cell — different scale than CPU/Mem (5% is fine, 30% is critical) so
 *  we don't use the standard MetricBar coloring. On io-exempt nodes (a guest
 *  with passthrough disks or an io-exempt tag) IOWait doesn't count toward the
 *  score, so it stays neutral with an "exempt" badge. */
function IOWaitCell({ pct, avg, exempt, exemptGuests, ioPressure }) {
  const v = pct || 0;
  const cls = exempt ? 'text-pb-text2 dark:text-gray-400'
            : v > 30 ? 'text-red-600 dark:text-red-400'
            : v > 15 ? 'text-orange-600 dark:text-orange-400'
            : v > 5  ? 'text-yellow-600 dark:text-yellow-400'
            : 'text-pb-text2 dark:text-gray-400';
  const who = (exemptGuests || []).map(g => g.name).join(', ') || 'a passthrough guest';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`text-xs font-mono tabular-nums ${cls}`} title={`24h avg ${(avg || 0).toFixed(1)}%${ioPressure ? `\n${ioPressure.text}` : ''}`}>
        {v.toFixed(1)}%
      </span>
      {exempt && (
        <span
          className="text-[9px] font-semibold px-1 rounded bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300"
          title={`Not counted against this node: the IOWait comes from ${who}, which has its own disks.`}
        >exempt</span>
      )}
    </span>
  );
}

const CHIP = 'inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap';

/** Condition: Offline / Maintenance, else what is over its threshold
 *  (CPU / memory / IOWait — the same thresholds that trigger suggestions),
 *  else OK. Scoring penalties such as one weekly CPU peak are not a
 *  condition; they live in the expanded row. */
function ConditionCell({ online, maintenance, over }) {
  if (!online) {
    return <span className={`${CHIP} bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/40`}>Offline</span>;
  }
  if (maintenance) {
    return <span className={`${CHIP} bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800/40`} title="In maintenance: guests are being moved off, not onto, this node">Maintenance</span>;
  }
  if (over.length > 0) {
    return (
      <span
        className={`${CHIP} bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800/40`}
        title={over.map(o => `${o.label} ${o.value.toFixed(0)}% — over the ${o.threshold}% threshold`).join('\n')}
      >
        {over[0].label} high{over.length > 1 && <span className="tabular-nums"> +{over.length - 1}</span>}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400" title="Under the CPU, memory and IOWait thresholds">
      <span className="w-2 h-2 rounded-full bg-green-500 dark:bg-green-400" />OK
    </span>
  );
}

/** What lowers a node's headroom, in plain words — shown in the expanded row. */
function HeadroomBreakdown({ score, list }) {
  if (score == null) return null;
  return (
    <div className="px-3 pt-1 pb-2 text-[11px] text-pb-text2 dark:text-gray-400">
      <span className="text-pb-text dark:text-gray-300">Headroom {Math.round(score)}</span>
      {list.length === 0
        ? ' — nothing is lowering it'
        : <> — lowered by: {list.map((p, i) => (
            <span key={p.key}>{i > 0 && ', '}{p.description} <span className="tabular-nums">−{p.pts}</span></span>
          ))}</>}
    </div>
  );
}

function formatUptime(seconds) {
  if (!seconds) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatMem(gb) {
  if (gb == null) return '—';
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

function TagChips({ guest, canMigrate, handleRemoveTag }) {
  const t = guest.tags || {};
  const hasIgnore = !!t.has_ignore;
  const hasAutoMigrate = t.all_tags?.some(t => t === 'auto_migrate_ok' || t === 'auto-migrate-ok');
  const exclude = t.exclude_groups || [];
  const affinity = t.affinity_groups || [];
  if (!hasIgnore && !hasAutoMigrate && exclude.length === 0 && affinity.length === 0) return null;

  const Chip = ({ label, color, onRemove }) => (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>
      {label}
      {canMigrate && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:bg-black/20 rounded-full p-0.5 -mr-0.5"
          title={`Remove "${label}"`}
          aria-label={`Remove tag ${label}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );

  return (
    <div className="flex flex-wrap gap-1">
      {hasIgnore && (
        <Chip label="ignore" color="bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300"
          onRemove={() => handleRemoveTag?.(guest, 'ignore')} />
      )}
      {hasAutoMigrate && (
        <Chip label="auto" color="bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300"
          onRemove={() => handleRemoveTag?.(guest, 'auto_migrate_ok')} />
      )}
      {affinity.map(tag => (
        <Chip key={`aff-${tag}`} label={tag} color="bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300"
          onRemove={() => handleRemoveTag?.(guest, tag)} />
      ))}
      {exclude.map(tag => (
        <Chip key={`exc-${tag}`} label={tag} color="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300"
          onRemove={() => handleRemoveTag?.(guest, tag)} />
      ))}
    </div>
  );
}

function WorkloadBadge({ profile, running }) {
  if (!running) return null;
  if (!profile || profile.confidence === 'low') return null;
  const cls = WORKLOAD_BADGE_COLORS[profile.behavior];
  if (!cls) return null;
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${cls}`}
      title={`${profile.behavior} workload (${profile.confidence} confidence, ${profile.data_points} samples)`}
    >
      {profile.behavior.charAt(0).toUpperCase() + profile.behavior.slice(1)}
    </span>
  );
}

// Sort keys for the per-node guest list. Metric sorts are largest-first so the
// guests loading the node come to the top.
const GUEST_SORTS = [
  { id: 'cpu',  label: 'CPU',      title: "Share of this node's CPU cores the guest is using now" },
  { id: 'mem',  label: 'Memory',   title: "RAM in use, as a share of this node's physical RAM" },
  { id: 'disk', label: 'Disk I/O', title: 'Disk read + write rate at the last collection', wide: true },
  { id: 'net',  label: 'Network',  title: 'Network in + out rate at the last collection', wide: true },
];

// One grid template for the header and every row so the columns line up.
// Phone: guest · CPU · Memory. md+: guest · CPU · Memory · Disk · Net. The
// VM/CT badge sits inside the guest cell, and the name column shares spare
// width with the two bar columns instead of taking all of it, so wide screens
// don't open a gap between the name and the numbers.
const GUEST_GRID = 'grid items-center gap-x-3 grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] md:grid-cols-[minmax(16rem,1.4fr)_minmax(7rem,1fr)_minmax(7rem,1fr)_5.5rem_5.5rem]';

function formatRate(bps) {
  if (!bps) return '—';
  if (bps >= 1e9) return `${(bps / 1e9).toFixed(1)} GB/s`;
  if (bps >= 1e6) return `${(bps / 1e6).toFixed(1)} MB/s`;
  if (bps >= 1e3) return `${Math.round(bps / 1e3)} KB/s`;
  return `${Math.round(bps)} B/s`;
}

function readGuestSort() {
  try { return localStorage.getItem('nodeGuestSort') || 'cpu'; } catch { return 'cpu'; }
}

/** Value + thin bar, where the bar is the share of the node (not of the guest). */
function ShareCell({ pct, label, title }) {
  return (
    <div className="min-w-0" title={title}>
      <div className="text-xs tabular-nums text-pb-text dark:text-gray-200">{label}</div>
      <div className={`${PROGRESS_BAR_BG} mt-0.5`}>
        <div className={`h-full rounded-full ${metricColor(pct)}`} style={{ width: `${Math.min(100, Math.max(pct > 0 ? 2 : 0, pct))}%` }} />
      </div>
    </div>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded justify-self-start ${
      type === 'VM'
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30'
        : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30'
    }`}>
      {type}
    </span>
  );
}

function GuestList({
  guests, node, onGuestClick, canMigrate, guestProfiles, handleRemoveTag, openTagModal,
  guestRecMap, setConfirmMigration, forceShowStopped,
}) {
  const [sortKey, setSortKey] = useState(readGuestSort);
  const [showStopped, setShowStopped] = useState(false);
  const chooseSort = (id) => {
    setSortKey(id);
    try { localStorage.setItem('nodeGuestSort', id); } catch { /* per-viewer nicety only */ }
  };

  const nodeCores = node?.cpu_cores || 0;
  const nodeMemGB = node?.total_mem_gb || 0;

  const { running, stopped, totals } = useMemo(() => {
    const rows = (guests || []).map(g => {
      const isRunning = g.status === 'running';
      // cpu_current is % of the guest's own vCPUs; convert to % of the node.
      const cpuShare = isRunning && nodeCores ? ((g.cpu_current || 0) * (g.cpu_cores || 1)) / nodeCores : 0;
      const memShare = isRunning && nodeMemGB ? ((g.mem_used_gb || 0) / nodeMemGB) * 100 : 0;
      const disk = isRunning ? (g.disk_read_bps || 0) + (g.disk_write_bps || 0) : 0;
      const net = isRunning ? (g.net_in_bps || 0) + (g.net_out_bps || 0) : 0;
      return { g, isRunning, cpuShare, memShare, disk, net };
    });
    const metric = { cpu: r => r.cpuShare, mem: r => r.memShare, disk: r => r.disk, net: r => r.net }[sortKey] || (r => r.cpuShare);
    const run = rows.filter(r => r.isRunning).sort((a, b) => (metric(b) - metric(a)) || ((a.g.vmid || 0) - (b.g.vmid || 0)));
    const stop = rows.filter(r => !r.isRunning).sort((a, b) => (a.g.vmid || 0) - (b.g.vmid || 0));
    return {
      running: run,
      stopped: stop,
      totals: {
        cpu: run.reduce((s, r) => s + r.cpuShare, 0),
        memGB: run.reduce((s, r) => s + (r.g.mem_used_gb || 0), 0),
      },
    };
  }, [guests, sortKey, nodeCores, nodeMemGB]);

  if (!guests || guests.length === 0) {
    return <div className="text-xs text-pb-text2 dark:text-gray-600 italic px-3 py-2">No guests on this node</div>;
  }

  const stoppedOpen = showStopped || forceShowStopped;

  const renderName = (g) => {
    const rec = guestRecMap?.[String(g.vmid)];
    const clickable = canMigrate && setConfirmMigration;
    return (
      <div className="flex items-center gap-1.5 min-w-0 md:flex-wrap">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${g.status === 'running' ? 'bg-green-400' : 'bg-gray-500'}`} />
        <span className="text-sm text-pb-text dark:text-gray-200 truncate min-w-0 max-w-[14rem]">{g.name || `guest-${g.vmid}`}</span>
        <span className="text-[10px] text-pb-text2 dark:text-gray-500 tabular-nums shrink-0">{g.vmid}</span>
        <span className="hidden md:inline-flex shrink-0"><TypeBadge type={g.type} /></span>
        <span className="hidden md:inline-flex"><WorkloadBadge profile={guestProfiles?.[String(g.vmid)]} running={g.status === 'running'} /></span>
        {rec && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); if (clickable) setConfirmMigration(rec); }}
            disabled={!clickable}
            title={recBadgeTooltip(rec)}
            className={`text-[10px] px-1.5 py-0.5 rounded bg-orange-50 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800/40 ${clickable ? 'hover:bg-orange-100 dark:hover:bg-orange-800/60 cursor-pointer' : 'cursor-default'}`}
          >
            ↗ {rec.target_node}
          </button>
        )}
        <span className="hidden md:contents"><TagChips guest={g} canMigrate={canMigrate} handleRemoveTag={handleRemoveTag} /></span>
        {canMigrate && openTagModal && (
          <button
            onClick={(e) => { e.stopPropagation(); openTagModal(g); }}
            className="hidden md:inline-flex p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded transition-colors"
            title="Manage tags"
            aria-label="Manage tags"
          >
            <Tag size={12} />
          </button>
        )}
      </div>
    );
  };

  const rowClass = (g) => {
    const hasRec = !!guestRecMap?.[String(g.vmid)];
    return `${GUEST_GRID} px-3 py-1.5 rounded cursor-pointer transition-colors ${hasRec
      ? 'bg-orange-50 dark:bg-orange-900/15 hover:bg-orange-100/70 dark:hover:bg-orange-900/25'
      : 'hover:bg-slate-100 dark:hover:bg-slate-700/30'}`;
  };

  return (
    <div className="border-l border-pb-border dark:border-slate-700/40 ml-2">
      {/* Caption: what the running guests add up to on this node */}
      <div
        className="px-3 pt-1 pb-1.5 text-[11px] text-pb-text2 dark:text-gray-500 tabular-nums"
        title={running.length > 0 && nodeCores > 0 ? `What the running guests use together, as a share of ${node?.name || 'the node'}` : undefined}
      >
        {running.length} running{stopped.length > 0 && ` · ${stopped.length} stopped`}
        {running.length > 0 && nodeCores > 0 && (
          <> · <span className="text-pb-text dark:text-gray-300">{totals.cpu.toFixed(1)}%</span> CPU
            {' '}· <span className="text-pb-text dark:text-gray-300">{formatMem(totals.memGB)}</span> RAM</>
        )}
      </div>

      {/* Sortable column header */}
      <div className={`${GUEST_GRID} px-3 pb-1 text-[10px] uppercase tracking-wider text-pb-text2 dark:text-gray-500 select-none`}>
        <span>Guest <span className="normal-case tracking-normal">· sorted by {(GUEST_SORTS.find(s => s.id === sortKey) || GUEST_SORTS[0]).label.toLowerCase()}</span></span>
        {GUEST_SORTS.map(s => (
          <button
            key={s.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); chooseSort(s.id); }}
            title={`${s.title} — click to sort, largest first`}
            className={`${s.wide ? 'hidden md:flex' : 'flex'} items-center gap-0.5 uppercase tracking-wider text-left hover:text-pb-text dark:hover:text-gray-200 ${sortKey === s.id ? 'text-pb-accent dark:text-pb-accent-dark font-semibold' : ''}`}
          >
            {s.label}{s.id === 'cpu' && <span className="hidden md:inline normal-case tracking-normal font-normal"> (of node)</span>}
            {sortKey === s.id && <ChevronDown size={10} />}
          </button>
        ))}
      </div>

      {running.map(({ g, cpuShare, memShare, disk, net }) => (
        <div key={g.vmid} onClick={(e) => { e.stopPropagation(); onGuestClick?.(g); }} className={rowClass(g)}>
          {renderName(g)}
          <ShareCell
            pct={cpuShare}
            label={`${cpuShare.toFixed(1)}%`}
            title={`${(g.cpu_current || 0).toFixed(1)}% of its ${g.cpu_cores || 1} vCPU = ${cpuShare.toFixed(1)}% of ${node?.name || 'the node'}'s ${nodeCores} cores`}
          />
          <ShareCell
            pct={memShare}
            label={formatMem(g.mem_used_gb)}
            title={`${formatMem(g.mem_used_gb)} in use of ${formatMem(g.mem_max_gb)} allocated · ${memShare.toFixed(1)}% of the node's RAM`}
          />
          <span
            className={`hidden md:block text-xs tabular-nums ${disk > 0 ? 'text-pb-text dark:text-gray-300' : 'text-pb-text2 dark:text-gray-600'}`}
            title={`Read ${formatRate(g.disk_read_bps)} · Write ${formatRate(g.disk_write_bps)}`}
          >
            {formatRate(disk)}
          </span>
          <span
            className={`hidden md:block text-xs tabular-nums ${net > 0 ? 'text-pb-text dark:text-gray-300' : 'text-pb-text2 dark:text-gray-600'}`}
            title={`In ${formatRate(g.net_in_bps)} · Out ${formatRate(g.net_out_bps)}`}
          >
            {formatRate(net)}
          </span>
        </div>
      ))}

      {stopped.length > 0 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowStopped(v => !v); }}
            disabled={forceShowStopped}
            className="w-full flex items-center gap-1.5 px-3 py-1.5 mt-0.5 text-xs text-pb-text2 dark:text-gray-500 hover:text-pb-text dark:hover:text-gray-300 text-left disabled:cursor-default"
          >
            <ChevronDown size={12} className={`transition-transform duration-200 ${stoppedOpen ? '' : '-rotate-90'}`} />
            {stopped.length} stopped guest{stopped.length !== 1 ? 's' : ''}
            {!stoppedOpen && (
              <span className="truncate text-pb-text2/80 dark:text-gray-600">
                — {stopped.slice(0, 4).map(r => r.g.name || r.g.vmid).join(', ')}{stopped.length > 4 ? ` +${stopped.length - 4}` : ''}
              </span>
            )}
          </button>
          {stoppedOpen && stopped.map(({ g }) => (
            <div key={g.vmid} onClick={(e) => { e.stopPropagation(); onGuestClick?.(g); }} className={`${rowClass(g)} opacity-70`}>
              {renderName(g)}
              <span className="col-span-2 md:col-span-4 text-xs text-pb-text2 dark:text-gray-500">
                stopped<span className="hidden md:inline"> · {formatMem(g.mem_max_gb)} allocated when started</span>
              </span>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

export default function NodeSummaryTable({
  data, nodeScores, onNodeClick, onGuestClick,
  collapsedSections, setCollapsedSections,
  embedded = false,
  // Tag management
  canMigrate, guestProfiles, handleRemoveTag, setTagModalGuest, setShowTagModal,
  // Each node's role in balancing (utils/nodeRoles.js) and per-guest suggestions
  nodeRoleMap, recommendations, guestRecMap, setConfirmMigration,
  // Nodes in maintenance (Set or array of names), for the Condition column
  maintenanceNodes,
  // Thresholds that define "over" in the Condition column
  recommendationData,
}) {
  const openTagModal = setTagModalGuest && setShowTagModal
    ? (guest) => { setTagModalGuest(guest); setShowTagModal(true); }
    : null;
  // When embedded, the parent owns the section header (and thus the
  // collapse state and the collapsed-chip summary). Always render the body.
  const collapsed = embedded ? false : collapsedSections?.nodeOverview;
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());

  // Per-node guests
  const guestsByNode = useMemo(() => {
    const byNode = {};
    Object.values(data?.guests || {}).forEach(guest => {
      const nodeName = guest.node || 'unknown';
      (byNode[nodeName] = byNode[nodeName] || []).push(guest);
    });
    Object.values(byNode).forEach(arr => arr.sort((a, b) => (a.vmid || 0) - (b.vmid || 0)));
    return byNode;
  }, [data]);

  const params = recommendationData?.parameters || {};
  const thresholds = {
    cpu: Number(params.cpu_threshold) || DEFAULT_CPU_THRESHOLD,
    mem: Number(params.mem_threshold) || DEFAULT_MEM_THRESHOLD,
    iowait: Number(params.iowait_threshold) || DEFAULT_IOWAIT_THRESHOLD,
  };

  const toggleNode = (name) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const maintSet = useMemo(() => toNodeSet(maintenanceNodes), [maintenanceNodes]);
  const roles = useMemo(
    () => nodeRoleMap || nodeRoles({ nodes: data?.nodes, recommendations, maintenanceNodes: maintSet }),
    [nodeRoleMap, data, recommendations, maintSet],
  );

  const nodes = useMemo(() => {
    if (!data?.nodes) return [];
    const nodesArr = Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes);
    const guestsDict = data.guests || {};

    return nodesArr.map(node => {
      const cpuPct = node.cpu_percent || 0;
      const memPct = node.mem_percent || 0;
      const iowaitPct = node.metrics?.current_iowait || 0;
      const iowaitAvg = node.metrics?.avg_iowait || 0;
      const totalMemGB = node.total_mem_gb || 0;
      const usedMemGB = totalMemGB * (memPct / 100);

      const disk = fullestLocalPool(node.storage);

      const nodeScore = nodeScores?.[node.name];
      const score = nodeScore?.suitability_rating;
      const penalties = penaltyList(nodeScore);
      const penaltyTip = penaltyTooltip(nodeScore);
      const iowaitExempt = !!node.iowait_exempt;
      const over = [
        cpuPct >= thresholds.cpu && { label: 'CPU', value: cpuPct, threshold: thresholds.cpu },
        memPct >= thresholds.mem && { label: 'Memory', value: memPct, threshold: thresholds.mem },
        !iowaitExempt && iowaitPct >= thresholds.iowait && { label: 'IOWait', value: iowaitPct, threshold: thresholds.iowait },
      ].filter(Boolean);

      const guestVmids = node.guests || [];
      let vms = 0, cts = 0;
      guestVmids.forEach(vmid => {
        const g = guestsDict[String(vmid)];
        if (g) {
          if (g.type === 'VM') vms++;
          else cts++;
        }
      });

      return {
        name: node.name,
        status: node.status,
        online: node.status === 'online',
        uptime: node.uptime,
        maintenance: maintSet.has(node.name),
        cpuPct, memPct, iowaitPct, iowaitAvg, disk, score, penalties, penaltyTip, over, iowaitExempt, vms, cts,
        cpuDetail: `${node.cpu_cores || 0} cores`,
        memDetail: `${usedMemGB.toFixed(1)}/${totalMemGB.toFixed(0)} GB`,
        iowaitDetail: `24h avg ${iowaitAvg.toFixed(1)}%`,
        raw: node
      };
    }).sort((a, b) => {
      const v = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return a.name.localeCompare(b.name) * v;
      if (sortField === 'score') return ((a.score || 0) - (b.score || 0)) * v;
      if (sortField === 'cpu') return (a.cpuPct - b.cpuPct) * v;
      if (sortField === 'mem') return (a.memPct - b.memPct) * v;
      if (sortField === 'iowait') return (a.iowaitPct - b.iowaitPct) * v;
      return 0;
    });
  }, [data, nodeScores, sortField, sortDir, maintSet, thresholds.cpu, thresholds.mem, thresholds.iowait]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortHeader = ({ field, children, title, className = '' }) => (
    <th
      title={title}
      className={`${TABLE_HEADER} ${PHONE_PAD_X} ${className} cursor-pointer hover:text-pb-text dark:hover:text-gray-200`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ChevronDown size={12} className={`transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
        )}
      </span>
    </th>
  );

  const Wrapper = embedded ? React.Fragment : 'div';
  const wrapperProps = embedded ? {} : { className: GLASS_CARD };

  return (
    <Wrapper {...wrapperProps}>
      {!embedded && (
        <button
          onClick={() => setCollapsedSections?.(prev => ({ ...prev, nodeOverview: !prev.nodeOverview }))}
          className="w-full flex items-center justify-between text-left mb-3 hover:opacity-80 transition-opacity"
        >
          <h2 className={TEXT_HEADING}>Nodes</h2>
          <ChevronDown
            size={ICON.section}
            className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${!collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {collapsed && (
        <div className="flex flex-wrap gap-2">
          {nodes.map(node => {
            const isProblem = !node.online
              || node.cpuPct >= 80
              || node.memPct >= 80
              || (node.score != null && node.score < 60);
            const ringClass = isProblem ? 'ring-1 ring-red-500/40' : '';
            return (
              <button
                key={node.name}
                onClick={() => setCollapsedSections?.(prev => ({ ...prev, nodeOverview: false }))}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800/60 border border-pb-border dark:border-slate-700/50 text-xs hover:bg-pb-surface2/60 dark:hover:bg-slate-700/40 transition-colors focus:outline-none ${ringClass}`}
                title={`${node.name} — click to expand`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${node.online ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="font-medium text-pb-text dark:text-gray-200">{node.name}</span>
                {node.online ? (
                  <>
                    <span className="text-pb-text2 dark:text-gray-500">CPU</span>
                    <span className={`tabular-nums ${metricTextColor(node.cpuPct)}`}>{Math.round(node.cpuPct)}%</span>
                    <span className="text-pb-text2 dark:text-gray-500">Mem</span>
                    <span className={`tabular-nums ${metricTextColor(node.memPct)}`}>{Math.round(node.memPct)}%</span>
                    {node.score != null && (
                      <span className={`font-bold tabular-nums ${scoreColor(node.score)}`} title={HEADROOM_HINT}>
                        {Math.round(node.score)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-red-600 dark:text-red-400">offline</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!collapsed && (
        <>
          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full md:min-w-[700px]">
              <thead>
                <tr className="border-b border-pb-border dark:border-slate-700/50">
                  <th className={`${TABLE_HEADER} ${PHONE_PAD_X} w-8`}></th>
                  <SortHeader field="name">Node</SortHeader>
                  <th className={`${TABLE_HEADER} hidden md:table-cell`} title={`Offline, Maintenance, or what is over its threshold (CPU ${thresholds.cpu}%, memory ${thresholds.mem}%, IOWait ${thresholds.iowait}%); otherwise OK`}>Condition</th>
                  <th className={`${TABLE_HEADER} hidden md:table-cell`}>Uptime</th>
                  <SortHeader field="cpu">CPU</SortHeader>
                  <th className={`${TABLE_HEADER} hidden lg:table-cell`} title="CPU over the last 24 hours (20-minute averages). Hover the line for a time.">CPU · 24h</th>
                  <SortHeader field="mem"><span className="hidden sm:inline">Memory</span><span className="sm:hidden">Mem</span></SortHeader>
                  <SortHeader field="iowait" className="hidden md:table-cell">IOWait</SortHeader>
                  <th className={`${TABLE_HEADER} hidden md:table-cell`} title="Fullest local storage pool on the node. Shared storage (CIFS/NFS/PBS/Ceph) is left out: it shows the same fill on every node.">Local disk</th>
                  <SortHeader field="score" title={HEADROOM_HINT}><span className="hidden md:inline">Headroom</span><span className="md:hidden">Room</span></SortHeader>
                  <th className={`${TABLE_HEADER} hidden md:table-cell`}>VMs</th>
                  <th className={`${TABLE_HEADER} hidden md:table-cell`}>CTs</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(node => {
                  const isExpanded = expandedNodes.has(node.name);
                  const nodeGuests = guestsByNode[node.name] || [];
                  const role = roles[node.name];
                  return (
                    <React.Fragment key={node.name}>
                      <tr
                        className={`${TABLE_ROW} cursor-pointer`}
                        onClick={() => onNodeClick?.(node.raw)}
                      >
                        <td className="px-2 py-3 md:p-3 w-8" style={nodeRoleEdge(role)}>
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleNode(node.name); }}
                            className="flex items-center justify-center w-10 h-10 -m-2.5 md:w-5 md:h-5 md:m-0 rounded hover:bg-pb-surface2 dark:hover:bg-slate-700/50 transition-colors"
                            aria-label={isExpanded ? 'Collapse guests' : 'Expand guests'}
                          >
                            <ChevronDown
                              size={14}
                              className={`text-pb-text2 dark:text-gray-500 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                            />
                          </button>
                        </td>
                        <td className="px-2 py-3 md:p-3">
                          <div className="flex items-center gap-2">
                            <span className={`md:hidden w-2 h-2 rounded-full shrink-0 ${node.online ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className="text-sm font-medium text-pb-text dark:text-white">{node.name}</span>
                            {/* Maintenance already reads in the Condition column on md+; the
                                marker stays there only when it carries a count of guests leaving. */}
                            <NodeRoleMarker role={role} className={role?.kind === 'maintenance' && !role.count ? 'md:hidden' : ''} />
                            {failedDiskCount(node.raw.disks) > 0 && (
                              <span
                                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-red-600 dark:text-red-400"
                                title={`${failedDiskCount(node.raw.disks)} disk${failedDiskCount(node.raw.disks) === 1 ? '' : 's'} failed SMART. Open the node for details.`}
                              >
                                <AlertTriangle size={12} /> SMART
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <ConditionCell online={node.online} maintenance={node.maintenance} over={node.over} />
                        </td>
                        <td className="p-3 hidden md:table-cell text-xs text-pb-text2 dark:text-gray-400 font-mono tabular-nums">{formatUptime(node.uptime)}</td>
                        <td className="px-2 py-3 md:p-3">
                          <CpuBar pct={node.cpuPct} anchored={node.raw.anchored_cpu} anchoredGuests={node.raw.anchored_guests} detail={node.cpuDetail} nodeName={node.name} />
                        </td>
                        <td className="p-3 hidden lg:table-cell">
                          <CpuSparkline trendData={node.raw.trend_data} nodeName={node.name} />
                        </td>
                        <td className="px-2 py-3 md:p-3">
                          <MetricBar pct={node.memPct} detail={node.memDetail} />
                        </td>
                        <td className="p-3 hidden md:table-cell"><IOWaitCell pct={node.iowaitPct} avg={node.iowaitAvg} exempt={node.iowaitExempt} exemptGuests={node.raw.iowait_exempt_guests} ioPressure={ioPressureFact(node.raw.metrics)} /></td>
                        <td className="p-3 hidden md:table-cell">
                          {node.disk ? (
                            <MetricBar pct={node.disk.pct} detail={node.disk.name} title={node.disk.title} />
                          ) : (
                            <span className="text-xs text-pb-text2 dark:text-gray-500" title="This node has no local storage pool; only shared storage">shared only</span>
                          )}
                        </td>
                        <td className="px-2 py-3 md:p-3">
                          {node.score != null ? (
                            <span className={`text-sm font-bold font-mono tabular-nums ${scoreColor(node.score)}`} title={`${HEADROOM_HINT}\n\n${node.penaltyTip}`}>
                              {Math.round(node.score)}
                            </span>
                          ) : (
                            <span className="text-xs text-pb-text2 dark:text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell text-xs text-pb-text2 dark:text-gray-400 tabular-nums text-center">{node.vms}</td>
                        <td className="p-3 hidden md:table-cell text-xs text-pb-text2 dark:text-gray-400 tabular-nums text-center">{node.cts}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-900/40">
                          <td colSpan={TOTAL_COLS} className="px-3 pb-3 pt-1">
                            {/* w-0 + min-w-full: fill the row without letting the guest grid widen the table on phones */}
                            <div className="w-0 min-w-full">
                            <HeadroomBreakdown score={node.score} list={node.penalties} />
                            <GuestList
                              guests={nodeGuests}
                              node={node.raw}
                              onGuestClick={onGuestClick}
                              canMigrate={canMigrate}
                              guestProfiles={guestProfiles}
                              handleRemoveTag={handleRemoveTag}
                              openTagModal={openTagModal}
                              guestRecMap={guestRecMap}
                              setConfirmMigration={setConfirmMigration}
                            />
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <NodeRoleLegend roles={roles} className="pt-2" />
          {nodes.some(n => (n.raw.anchored_cpu || 0) >= 0.5) && (
            <div className="flex items-center gap-1.5 pt-2 text-[11px] text-pb-text2 dark:text-gray-500">
              <span className="inline-block w-4 h-1.5 rounded-full bg-slate-400 dark:bg-slate-500" style={{ backgroundImage: HATCH }} />
              <MoreInfo as="span" detail="Guests ProxBalance won't move: ignored ones, or ones tied to the host's hardware (passthrough or local-only disks). On desktop, hover a bar for their names.">
                CPU of guests that stay put
              </MoreInfo>
            </div>
          )}

        </>
      )}
    </Wrapper>
  );
}
