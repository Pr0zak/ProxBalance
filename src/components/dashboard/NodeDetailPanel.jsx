import {
  Activity, AlertTriangle, MoveRight, Loader, Lock, Check, ChevronLeft, ChevronRight
} from '../Icons.jsx';
import {
  INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER,
  PROGRESS_BAR_BG, metricColor, metricTextColor, headroomTextColor, TAP_TARGET } from '../../utils/designTokens.js';
import MiniTrendChart from './MiniTrendChart.jsx';
import Section from './CollapsibleSection.jsx';
import DetailPanel, { PeriodChips } from './DetailPanel.jsx';
import { guestMobility } from './guestMobility.js';
import { ScoreBreakdown } from './ScoreBreakdown.jsx';

const { useState, useEffect, useMemo } = React;

const headroomTone = headroomTextColor;

const fmtUptime = (sec) => {
  if (!sec) return null;
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  return d > 0 ? `${d}d ${h}h` : `${h}h`;
};

const PENALTY_SEGMENTS = [
  { key: 'iowait', label: 'IOWait', color: 'bg-orange-500' },
  { key: 'cpu', label: 'CPU', color: 'bg-red-500' },
  { key: 'memory', label: 'Memory', color: 'bg-blue-500' },
  { key: 'spikes', label: 'Spikes', color: 'bg-purple-500' },
  { key: 'trends', label: 'Trends', color: 'bg-yellow-500' },
];

// Text colour for each guestMobility() verdict in the guest list.
const MOBILITY_TEXT = {
  green: 'text-blue-600 dark:text-blue-300',
  orange: 'text-amber-600 dark:text-amber-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  red: 'text-red-600 dark:text-red-400',
  blue: 'text-indigo-600 dark:text-indigo-300',
  gray: 'text-pb-text2 dark:text-gray-400',
};

const HATCH = { backgroundImage: 'repeating-linear-gradient(135deg, rgba(100,116,139,0.85) 0 3px, rgba(71,85,105,0.85) 3px 6px)' };

// Highest sample we know of (24h max, 7d max of hourly averages, or now).
const peakOf = (...vals) => Math.max(0, ...vals.filter(v => typeof v === 'number'));

// One load row: bar = now (with an optional hatched unmovable part), then the
// 24h / 7d averages and peak underneath.
function LoadRow({ label, sub, now, avg24, avg7, peak, anchored = 0 }) {
  const n = now || 0;
  const a = Math.min(anchored || 0, n);
  return (
    <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-x-3 gap-y-0.5">
      <div className="min-w-0 row-span-2 self-start">
        <div className="text-xs font-semibold text-pb-text dark:text-white">{label}</div>
        {sub && <div className="text-[10px] text-pb-text2 dark:text-gray-500 truncate">{sub}</div>}
      </div>
      <div className={`${PROGRESS_BAR_BG} flex overflow-hidden`}>
        {a > 0 && <div className="h-full" style={{ width: `${a}%`, ...HATCH }} />}
        <div className={`h-full ${metricColor(n)} ${a > 0 ? '' : 'rounded-full'}`} style={{ width: `${Math.max(0, Math.min(100, n) - a)}%` }} />
      </div>
      <span className={`text-sm font-bold tabular-nums text-right ${metricTextColor(n)}`}>{n.toFixed(1)}%</span>
      <div className="col-start-2 col-span-2 flex gap-3 text-[11px] tabular-nums text-pb-text2 dark:text-gray-400">
        <span>24h <span className="text-pb-text dark:text-gray-200">{(avg24 || 0).toFixed(0)}%</span></span>
        <span>7d <span className="text-pb-text dark:text-gray-200">{(avg7 || 0).toFixed(0)}%</span></span>
        {peak != null && <span title="Highest sample in the last 24h / 7d">peak <span className="text-pb-text dark:text-gray-200">{peak.toFixed(0)}%</span></span>}
      </div>
    </div>
  );
}

// Node trend points for the chosen period, from the RRD series the collector keeps.
function trendFor(trend, period) {
  const pick = (k) => (Array.isArray(trend[k]) ? trend[k] : []);
  if (period === '1h') return pick('hour').length >= 2 ? pick('hour') : pick('day').slice(-60);
  if (period === '7d') return pick('week');
  const day = pick('day');
  if (period === '6h' && day.length) {
    const last = day[day.length - 1].time;
    return day.filter(p => last - p.time <= 6 * 3600);
  }
  return day;
}

const nameList = (names) => names.length <= 1 ? (names[0] || '')
  : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export default function NodeDetailPanel({
  selectedNode, setSelectedNode,
  maintenanceNodes,
  canMigrate,
  evacuatingNodes, planningNodes, setPlanningNodes,
  setEvacuationPlan, setPlanNode,
  setError,
  nodeScores, penaltyConfig,
  API_BASE,
  data, recommendations, guestRecMap, skippedGuests,
  setSelectedGuestDetails, setConfirmMigration,
  // Maintenance mode (server-backed, see useEvacuation)
  setNodeMaintenance, maintenanceSaving,
  automationStatus, automationConfig
}) {
  const [scoringOpen, setScoringOpen] = useState(false);
  const [showStopped, setShowStopped] = useState(false);
  const [period, setPeriod] = useState('24h');
  const [confirmMaint, setConfirmMaint] = useState(false);
  const [maintError, setMaintError] = useState(null);
  const nodeName = selectedNode && selectedNode.name;

  // A different node (or closing) drops any half-finished confirmation.
  useEffect(() => { setConfirmMaint(false); setMaintError(null); setShowStopped(false); }, [nodeName]);

  const skippedByVmid = useMemo(() => {
    const out = {};
    for (const sg of skippedGuests || []) out[String(sg.vmid)] = sg;
    return out;
  }, [skippedGuests]);

  if (!selectedNode) return null;

  // Always read the node from the latest collection, so an open panel refreshes.
  const node = (data && data.nodes && data.nodes[selectedNode.name]) || selectedNode;
  const nodeNames = data && data.nodes ? Object.keys(data.nodes).sort() : [node.name];
  const idx = nodeNames.indexOf(node.name);
  const prevNode = idx > 0 ? nodeNames[idx - 1] : nodeNames[nodeNames.length - 1];
  const nextNode = idx < nodeNames.length - 1 ? nodeNames[idx + 1] : nodeNames[0];
  const goTo = (name) => { if (data?.nodes?.[name]) setSelectedNode(data.nodes[name]); };

  const trend = node.trend_data || {};
  const trendPoints = trendFor(trend, period);
  const nodeGuests = data && data.guests
    ? Object.values(data.guests).filter(g => g.node === node.name)
    : [];
  const recs = Array.isArray(recommendations) ? recommendations : [];
  const movingOff = recs.filter(r => r.source_node === node.name);
  const movingHere = recs.filter(r => r.target_node === node.name);
  const openGuest = (g) => { setSelectedNode(null); if (setSelectedGuestDetails) setSelectedGuestDetails({ ...g, currentNode: node.name }); };

  const m = node.metrics || {};
  const score = nodeScores && nodeScores[node.name];
  const inMaintenance = maintenanceNodes.has(node.name);
  const guestCount = node.guests ? Object.keys(node.guests).length : nodeGuests.length;
  // Automation only evacuates running guests; stopped ones stay until planned by hand.
  const running = nodeGuests.filter(g => g.status === 'running');
  const stopped = nodeGuests.filter(g => g.status !== 'running');
  const runningCount = running.length;
  const stoppedCount = stopped.length;
  const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;
  const memTotal = node.total_mem_gb || 0;
  const memUsed = memTotal * (node.mem_percent || 0) / 100;
  const cpuNow = node.cpu_percent || 0;

  // Unmovable CPU: running guests ProxBalance won't move (pinned or ignored),
  // as a share of this node's CPU. Capped at what the node uses now, since the
  // guest figures are hour averages and the node figure is a recent reading.
  const anchoredGuests = (node.anchored_guests || []).slice().sort((a, b) => (b.cpu_share || 0) - (a.cpu_share || 0));
  const anchoredShown = Math.min(node.anchored_cpu || 0, cpuNow);
  const shareOf = (g) => {
    const a = anchoredGuests.find(x => String(x.vmid) === String(g.vmid));
    if (a) return a.cpu_share || 0;
    const per = typeof g.cpu_avg_hour === 'number' ? g.cpu_avg_hour : (g.cpu_current || 0);
    return node.cpu_cores ? Math.min(100, per * (g.cpu_cores || 1) / node.cpu_cores) : 0;
  };
  const rows = (list) => list
    .map(g => ({ g, share: g.status === 'running' ? shareOf(g) : 0, mob: guestMobility(g, guestRecMap?.[String(g.vmid)], skippedByVmid[String(g.vmid)]) }))
    .sort((a, b) => b.share - a.share || String(a.g.name).localeCompare(String(b.g.name)));

  const cats = score && score.penalty_categories;
  // Headroom = 100 - score, where score = base load (weighted health, predicted
  // load, capacity, storage fill) + penalty points. Show every part on a fixed
  // 100-point track so the bar says how much is used, not just who has the most.
  const penaltySegs = cats
    ? PENALTY_SEGMENTS.map(seg => ({ ...seg, value: cats[seg.key] || 0 })).filter(seg => seg.value > 0).sort((a, b) => b.value - a.value)
    : [];
  const penaltyTotal = penaltySegs.reduce((t, seg) => t + seg.value, 0);
  const rawScore = score ? (typeof score.score === 'number' ? score.score : 100 - (score.suitability_rating || 0)) : 0;
  const baseLoad = Math.max(0, rawScore - penaltyTotal);
  const usedSegs = score
    ? [{ key: 'base', label: 'Base load', color: 'bg-slate-400 dark:bg-slate-500', value: baseLoad, hint: 'Weighted current and predicted CPU/RAM/IOWait, capacity and storage fill' }, ...penaltySegs]
        .filter(seg => seg.value > 0)
    : [];
  const usedTotal = usedSegs.reduce((t, seg) => t + seg.value, 0);
  // Past 100 points headroom is 0; squeeze the segments so they still fit the track.
  const trackScale = usedTotal > 100 ? 100 / usedTotal : 1;
  const fmtPts = (v) => (v >= 10 ? v.toFixed(0) : v.toFixed(1).replace(/\.0$/, ''));
  const isPlanning = planningNodes.has(node.name);
  const isEvacuating = evacuatingNodes.has(node.name);
  const canPlan = canMigrate && guestCount > 0 && !isPlanning && !isEvacuating;

  // What automation will do with a node in maintenance. The automigrate run
  // turns every guest on a maintenance node, running or stopped (see
  // recommendations.py: stopped guests are only skipped off maintenance nodes),
  // into an evacuation recommendation,
  // bypassing observation and cooldown, capped by max_migrations_per_run.
  const auto = { ...(automationConfig || {}), ...(automationStatus || {}) };
  const autoLive = !!auto.enabled && !auto.dry_run;
  const autoInterval = auto.check_interval_minutes;
  const maxPerRun = automationConfig && automationConfig.rules && automationConfig.rules.max_migrations_per_run;
  const hasWindows = !!(automationConfig?.schedule?.migration_windows || []).some(w => w && w.enabled !== false)
    || !!(automationConfig?.schedule?.blackout_windows || []).length;
  const savingMaint = maintenanceSaving === node.name;

  const applyMaintenance = async (enter) => {
    if (!setNodeMaintenance) return;
    setMaintError(null);
    const res = await setNodeMaintenance(node.name, enter);
    if (res && res.error) setMaintError(res.message || 'Could not update maintenance mode');
    else setConfirmMaint(false);
  };

  const handlePlanEvacuation = async () => {
    if (!canMigrate) {
      setError('Read-only API token (PVEAuditor) - Cannot perform migrations');
      return;
    }
    if (guestCount === 0) {
      setError(`Node ${node.name} has no VMs/CTs to evacuate`);
      return;
    }
    const nodeName = node.name;
    setPlanningNodes(prev => new Set([...prev, nodeName]));
    try {
      const planResponse = await fetch(`${API_BASE}/nodes/evacuate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node: nodeName,
          maintenance_nodes: Array.from(maintenanceNodes),
          confirm: false,  // Request plan only
          target_node: null,  // Auto-select target
          guest_targets: {}  // No per-guest overrides initially
        })
      });
      const planResult = await planResponse.json();
      if (planResult.success && planResult.plan) {
        setEvacuationPlan(planResult);
        setPlanNode(nodeName);
        setSelectedNode(null);
      } else {
        console.error('Plan generation failed:', planResult);
        setError(`Failed to generate evacuation plan: ${planResult.error}`);
      }
    } catch (error) {
      console.error('Plan fetch error:', error);
      setError(`Error generating plan: ${error.message}`);
    } finally {
      setPlanningNodes(prev => {
        const next = new Set(prev);
        next.delete(nodeName);
        return next;
      });
    }
  };

  const online = node.status === 'online';
  const stepBtn = 'shrink-0 w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg border border-pb-border dark:border-slate-700 text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 hover:bg-pb-surface2 dark:hover:bg-slate-800';

  const header = (
    <div className="flex items-center gap-2">
      {nodeNames.length > 1 && (
        <button onClick={() => goTo(prevNode)} className={stepBtn} aria-label={`Previous node, ${prevNode}`} title={prevNode}><ChevronLeft size={16} /></button>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-pb-text dark:text-white truncate">{node.name}</h3>
          {inMaintenance && <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full shrink-0">MAINTENANCE</span>}
        </div>
        <p className="text-xs text-pb-text2 dark:text-gray-400">
          <span className={`font-medium ${online ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
            ● <span className="capitalize">{node.status || 'unknown'}</span>
          </span>
          {fmtUptime(node.uptime) && <> · <span className="whitespace-nowrap">up {fmtUptime(node.uptime)}</span></>}
          {' · '}<span className="whitespace-nowrap">{runningCount} of {nodeGuests.length} running</span>
        </p>
      </div>
      {score && (
        <div className="shrink-0 text-right leading-tight px-1" title="Headroom: 0–100, how much room this node has to take on guests (higher = more room)">
          <div className={`text-2xl font-bold tabular-nums ${headroomTone(score.suitability_rating)}`}>{Math.round(score.suitability_rating)}</div>
          <div className="text-[9px] uppercase tracking-wide text-pb-text2 dark:text-gray-500">Headroom</div>
        </div>
      )}
      {nodeNames.length > 1 && (
        <button onClick={() => goTo(nextNode)} className={stepBtn} aria-label={`Next node, ${nextNode}`} title={nextNode}><ChevronRight size={16} /></button>
      )}
    </div>
  );

  // Sticky action footer; entering maintenance asks first, in place.
  const footer = confirmMaint && !inMaintenance ? (
    <div role="alertdialog" aria-labelledby="maint-confirm-title">
      <p id="maint-confirm-title" className="text-sm font-semibold text-pb-text dark:text-white flex items-center gap-1.5">
        <AlertTriangle size={16} className="text-amber-500 shrink-0" /> Put {node.name} in maintenance?
      </p>
      <ul className="mt-1.5 mb-3 space-y-1 text-xs text-pb-text2 dark:text-gray-300 list-disc pl-5 max-h-40 overflow-y-auto">
        <li>No guests will be placed here: recommendations, automation and evacuation plans skip it as a target.</li>
        {guestCount === 0 ? (
          <li>The node has no guests, so nothing needs to move.</li>
        ) : autoLive ? (
          <li className="text-amber-800 dark:text-amber-200 font-medium">
            Automation is live{autoInterval ? ` (runs every ${autoInterval} min)` : ''}: its next run starts moving
            {' '}{guestCount === 1 ? 'the 1 guest' : `all ${guestCount} guests`} on this node to other nodes
            {stoppedCount > 0 ? `, stopped ones included` : ''}
            {maxPerRun ? `, up to ${maxPerRun} per run` : ''}{hasWindows ? ', inside its migration windows' : ''},
            skipping the usual observation, cooldown and ignore-tag checks, and keeps going every run until none are left.
            {runningCount > 0 ? ' Running containers restart when they move.' : ''}
          </li>
        ) : auto.enabled ? (
          <li>Automation is in dry-run, so nothing moves on its own; its runs only log the evacuation moves they would make.</li>
        ) : (
          <li>Automation is off, so nothing moves on its own. Use Plan evacuation to move the guests yourself.</li>
        )}
        <li>Saved on the server, so it applies in every browser until someone exits maintenance.</li>
      </ul>
      {maintError && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{maintError}</p>}
      <div className="flex items-center gap-2">
        <button onClick={() => { setConfirmMaint(false); setMaintError(null); }} disabled={savingMaint} className={`${BTN_SECONDARY} flex-1 justify-center`}>
          Cancel
        </button>
        <button onClick={() => applyMaintenance(true)} disabled={savingMaint} className={`${autoLive && guestCount > 0 ? BTN_DANGER : BTN_PRIMARY} flex-1 justify-center whitespace-nowrap`}>
          {savingMaint ? <><Loader className="animate-spin" size={16} /> Saving…</> : 'Enter maintenance'}
        </button>
      </div>
    </div>
  ) : (
    <div>
      {maintError && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{maintError}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={() => (inMaintenance ? applyMaintenance(false) : setConfirmMaint(true))}
          disabled={!setNodeMaintenance || savingMaint}
          className={`${BTN_SECONDARY} flex-1 justify-center whitespace-nowrap !px-3`}
        >
          {savingMaint ? <><Loader className="animate-spin" size={16} /> Saving…</>
            : inMaintenance
              ? <><Check size={16} /> Exit maintenance</>
              : <><AlertTriangle size={16} className="text-amber-500" /> Maintenance…</>}
        </button>
        <button
          onClick={handlePlanEvacuation}
          disabled={!canPlan}
          className={`${BTN_PRIMARY} flex-1 justify-center whitespace-nowrap !px-3`}
          title={!canMigrate ? 'Read-only API token - Cannot migrate' : guestCount === 0 ? 'No guests to evacuate' : 'Build a plan to move every guest off this node (nothing moves until you confirm)'}
        >
          {!canMigrate ? <><Lock size={16} /> Read-only</>
            : isPlanning ? <><Loader className="animate-spin" size={16} /> Planning…</>
            : isEvacuating ? <><Loader className="animate-spin" size={16} /> Evacuating…</>
            : guestCount === 0 ? 'No guests'
            : <><MoveRight size={16} /> Plan evacuation</>}
        </button>
      </div>
    </div>
  );

  const guestRow = ({ g, share, mob }) => {
    const isVM = ['VM', 'QEMU'].includes((g.type || '').toUpperCase());
    const isRunning = g.status === 'running';
    return (
      <button
        key={g.vmid}
        onClick={() => openGuest(g)}
        className="w-full flex items-center gap-2 py-2 text-left text-[13px] border-b border-pb-border dark:border-slate-700/70 last:border-b-0 hover:bg-pb-surface2 dark:hover:bg-slate-800/60 -mx-1 px-1 rounded transition-colors"
        title={mob.detail}
      >
        <span className={`shrink-0 w-6 text-[10px] font-bold ${isVM ? 'text-purple-600 dark:text-purple-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{isVM ? 'VM' : 'CT'}</span>
        <span className="min-w-0 flex-1 truncate text-pb-text dark:text-gray-200">
          {g.name || `Guest ${g.vmid}`} <span className="text-pb-text3 dark:text-gray-500 text-[11px]">{g.vmid}</span>
        </span>
        {isRunning && <span className="shrink-0 tabular-nums text-pb-text dark:text-gray-200" title={`Share of ${node.name}'s CPU, last hour`}>{share.toFixed(0)}%</span>}
        <span className={`shrink-0 w-20 text-right text-[11px] font-medium ${MOBILITY_TEXT[mob.color] || MOBILITY_TEXT.gray}`}>{mob.label}</span>
      </button>
    );
  };

  return (
    <DetailPanel onClose={() => setSelectedNode(null)} header={header} footer={footer} label={`Node ${node.name}`}>
      {/* Maintenance state (wording follows what automation will actually do) */}
      {inMaintenance && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2.5">
          <AlertTriangle size={18} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            <span className="font-semibold">In maintenance.</span>{' '}
            No guests are placed here.{' '}
            {guestCount === 0
              ? 'The node is empty.'
              : autoLive
                ? `Live automation is moving its ${plural(guestCount, 'guest')} off${stoppedCount > 0 ? ` (including ${stoppedCount} stopped)` : ''}${maxPerRun ? `, up to ${maxPerRun} per run` : ''}.`
                : `Automation is ${auto.enabled ? 'in dry-run' : 'off'}, so its guests stay until you use Plan evacuation.`}
          </p>
        </div>
      )}

      {/* Load now, with the unmovable part of CPU hatched */}
      <div className="space-y-3">
        <LoadRow label="CPU" sub={`${node.cpu_cores || 0} cores`} now={cpuNow} avg24={m.avg_cpu} avg7={m.avg_cpu_week} peak={peakOf(cpuNow, m.max_cpu, m.max_cpu_week)} anchored={anchoredShown} />
        <LoadRow label="Memory" sub={memTotal ? `${memUsed.toFixed(1)} / ${memTotal.toFixed(0)} GB` : null} now={node.mem_percent} avg24={m.avg_mem} avg7={m.avg_mem_week} peak={peakOf(node.mem_percent, m.max_mem, m.max_mem_week)} />
        <LoadRow label="IOWait" sub="I/O latency" now={m.current_iowait} avg24={m.avg_iowait} avg7={m.avg_iowait_week} peak={peakOf(m.current_iowait, m.max_iowait)} />
        {anchoredShown >= 1 && (
          <p className="text-xs text-pb-text2 dark:text-gray-400">
            <span className="inline-block w-2.5 h-2.5 rounded-sm align-middle mr-1" style={HATCH} />
            {anchoredShown.toFixed(0)}% of CPU is {nameList(anchoredGuests.filter(a => (a.cpu_share || 0) >= 0.5).map(a => a.name))}, which won't be moved.
          </p>
        )}
      </div>

      {/* History, always visible */}
      <div className={`${INNER_CARD} !p-3`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-pb-text dark:text-gray-200">History</span>
          <PeriodChips value={period} onChange={setPeriod} />
        </div>
        <MiniTrendChart
          points={trendPoints}
          height={100}
          band={anchoredShown}
          bandLabel="unmovable CPU now"
          series={[
            { key: 'cpu', label: 'CPU', color: '#3b82f6' },
            { key: 'mem', label: 'Mem', color: '#10b981' },
            { key: 'iowait', label: 'IOWait', color: '#f59e0b' },
          ]}
        />
      </div>

      {/* What is using headroom */}
      {score && (
        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs mb-1.5">
            <span className="text-pb-text dark:text-gray-200 font-semibold">What is using headroom</span>
            <span className="text-pb-text2 dark:text-gray-400 tabular-nums">
              <span className="font-semibold text-pb-text dark:text-gray-200">{fmtPts(Math.min(100, usedTotal))}</span> of 100 used
              {' · '}<span className={`font-semibold ${headroomTone(score.suitability_rating)}`}>{Math.round(score.suitability_rating)}</span> left
            </span>
          </div>
          <div
            className="relative flex h-2.5 rounded-full overflow-hidden bg-pb-track dark:bg-pb-track-dark"
            role="img"
            aria-label={`${fmtPts(Math.min(100, usedTotal))} of 100 points used: ${usedSegs.map(seg => `${seg.label} ${fmtPts(seg.value)}`).join(', ')}`}
          >
            {usedSegs.map(seg => (
              <div key={seg.key} className={`${seg.color} h-full border-r border-white/60 dark:border-slate-900/60 last:border-r-0`} style={{ width: `${seg.value * trackScale}%` }} title={`${seg.label}: ${fmtPts(seg.value)} pts`} />
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
            {usedSegs.map(seg => (
              <span key={seg.key} className="flex items-center gap-1 text-pb-text2 dark:text-gray-400" title={seg.hint || `${seg.label} penalty points`}>
                <span className={`inline-block w-2 h-2 rounded-full ${seg.color}`} />
                {seg.label} <span className="font-semibold text-pb-text dark:text-gray-200 tabular-nums">{fmtPts(seg.value)}</span>
              </span>
            ))}
          </div>
          {/* Each penalty with the reading behind it, and the arithmetic */}
          <div className={`${INNER_CARD} !p-3 mt-2`}>
            <ScoreBreakdown score={score} />
          </div>
        </div>
      )}

      {/* Suggested moves involving this node */}
      {(movingOff.length > 0 || movingHere.length > 0) && (
        <div>
          <div className="text-xs font-semibold text-pb-text dark:text-gray-200 mb-1 flex items-center gap-1.5">
            <MoveRight size={14} className="text-amber-600 dark:text-amber-400" /> Suggested moves
            <span className="font-normal text-pb-text2 dark:text-gray-400">{movingOff.length} off · {movingHere.length} here</span>
          </div>
          {[...movingOff.map(r => ({ r, dir: 'off' })), ...movingHere.map(r => ({ r, dir: 'in' }))].map(({ r, dir }) => (
            <div key={`${dir}-${r.vmid}`} className="flex items-center justify-between gap-2 py-1.5 text-xs border-b border-pb-border dark:border-slate-700/70 last:border-b-0">
              <span className="text-pb-text dark:text-gray-200 truncate">
                {r.name} <span className="text-pb-text2 dark:text-gray-400">· {r.source_node} → {r.target_node}</span>
              </span>
              {canMigrate && setConfirmMigration && (
                <button
                  onClick={() => { setSelectedNode(null); setConfirmMigration(r); }}
                  className="shrink-0 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium"
                >Review</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Guests, ranked by how much of this node's CPU they use */}
      {nodeGuests.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-xs font-semibold text-pb-text dark:text-gray-200">
              Running guests <span className="font-normal text-pb-text2 dark:text-gray-400">· share of CPU</span>
            </span>
            {stoppedCount > 0 && (
              <button onClick={() => setShowStopped(s => !s)} className={`${TAP_TARGET} text-[11px] text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200`}>
                {showStopped ? 'Hide stopped' : `+${stoppedCount} stopped`}
              </button>
            )}
          </div>
          {runningCount === 0 && <p className="text-xs text-pb-text2 dark:text-gray-400 py-1">Nothing running.</p>}
          <div>{rows(running).map(guestRow)}</div>
          {showStopped && stoppedCount > 0 && (
            <div className="mt-2 opacity-70">{rows(stopped).map(guestRow)}</div>
          )}
        </div>
      )}

      {/* How headroom is scored (explainer, collapsed) */}
      {score && (
        <Section
          title={<><Activity size={14} className="text-blue-600 dark:text-blue-400" /> How headroom is scored</>}
          isOpen={scoringOpen}
          onToggle={() => setScoringOpen(o => !o)}
        >
          <p className="text-xs text-pb-text2 dark:text-gray-400">
            Headroom is 0–100 (higher = more room to take guests): 100 minus a weighted base load (current and predicted CPU/RAM/IOWait, capacity in use, storage fill) minus penalty points for high load, sustained averages, IOWait, spikes and trends. The list above shows each part.
            Load is weighted {penaltyConfig ? `${(penaltyConfig.weight_current * 100).toFixed(0)}% now, ${(penaltyConfig.weight_24h * 100).toFixed(0)}% 24h avg, ${(penaltyConfig.weight_7d * 100).toFixed(0)}% 7-day avg` : '50% now, 30% 24h avg, 20% 7-day avg'}.
            {' '}<span className="text-green-600 dark:text-green-400 font-semibold">70+</span> plenty · <span className="text-yellow-600 dark:text-yellow-400 font-semibold">50–69</span> good · <span className="text-orange-600 dark:text-orange-400 font-semibold">30–49</span> tight · <span className="text-red-600 dark:text-red-400 font-semibold">&lt;30</span> under pressure.
            {score.reason ? ` Engine summary: ${score.reason}.` : ''}
          </p>
        </Section>
      )}
    </DetailPanel>
  );
}
