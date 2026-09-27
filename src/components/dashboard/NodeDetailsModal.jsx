import {
  Server, X, Activity, AlertTriangle, MoveRight, Loader, Lock, Check
} from '../Icons.jsx';
import {
  MODAL_OVERLAY, MODAL_CONTAINER, INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER,
  PROGRESS_BAR_BG, metricColor, metricTextColor, headroomTextColor } from '../../utils/designTokens.js';
import MiniTrendChart from './MiniTrendChart.jsx';
import Section from './CollapsibleSection.jsx';

const { useState, useEffect } = React;

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

// Highest sample we know of (24h max, 7d max of hourly averages, or now).
const peakOf = (...vals) => Math.max(0, ...vals.filter(v => typeof v === 'number'));

// One row of the Load card: bar = now, numbers = 24h avg / 7d avg / 7d peak.
function LoadRow({ label, sub, now, avg24, avg7, peak }) {
  const n = now || 0;
  return (
    <div className="grid grid-cols-[4.5rem_1fr] sm:grid-cols-[5.5rem_1fr_12.5rem] items-center gap-x-3 gap-y-1">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-pb-text dark:text-white">{label}</div>
        {sub && <div className="text-[10px] text-pb-text2 dark:text-gray-500 truncate">{sub}</div>}
      </div>
      <div className="flex items-center gap-2 min-w-0">
        <div className={`${PROGRESS_BAR_BG} flex-1`}>
          <div className={`h-full rounded-full ${metricColor(n)}`} style={{ width: `${Math.min(100, n)}%` }} />
        </div>
        <span className={`text-sm font-bold tabular-nums w-12 text-right ${metricTextColor(n)}`}>{n.toFixed(1)}%</span>
      </div>
      <div className="col-start-2 sm:col-start-3 flex gap-3 text-[11px] tabular-nums text-pb-text2 dark:text-gray-400 sm:justify-end">
        <span>24h <span className="text-pb-text dark:text-gray-200">{(avg24 || 0).toFixed(0)}%</span></span>
        <span>7d <span className="text-pb-text dark:text-gray-200">{(avg7 || 0).toFixed(0)}%</span></span>
        {peak != null && <span title="Highest sample in the last 24h / 7d">peak <span className="text-pb-text dark:text-gray-200">{peak.toFixed(0)}%</span></span>}
      </div>
    </div>
  );
}

export default function NodeDetailsModal({
  selectedNode, setSelectedNode,
  maintenanceNodes,
  canMigrate,
  evacuatingNodes, planningNodes, setPlanningNodes,
  setEvacuationPlan, setPlanNode,
  setError,
  nodeScores, penaltyConfig,
  API_BASE,
  data, recommendations, setSelectedGuestDetails, setConfirmMigration,
  // Maintenance mode (server-backed, see useEvacuation)
  setNodeMaintenance, maintenanceSaving,
  automationStatus, automationConfig
}) {
  const [open, setOpen] = useState({ history: false, recs: false, scoring: false, guests: false });
  const toggle = (k) => setOpen(o => ({ ...o, [k]: !o[k] }));
  const [confirmMaint, setConfirmMaint] = useState(false);
  const [maintError, setMaintError] = useState(null);
  const nodeName = selectedNode && selectedNode.name;

  // A different node (or closing) drops any half-finished confirmation.
  useEffect(() => { setConfirmMaint(false); setMaintError(null); }, [nodeName]);

  if (!selectedNode) return null;

  const trend = selectedNode.trend_data || {};
  const trendPoints = (trend.day && trend.day.length >= 2) ? trend.day
    : (trend.hour && trend.hour.length >= 2) ? trend.hour
    : (trend.week || []);
  const nodeGuests = data && data.guests
    ? Object.values(data.guests).filter(g => g.node === selectedNode.name)
    : [];
  const recs = Array.isArray(recommendations) ? recommendations : [];
  const movingOff = recs.filter(r => r.source_node === selectedNode.name);
  const movingHere = recs.filter(r => r.target_node === selectedNode.name);
  const offVmids = new Set(movingOff.map(r => String(r.vmid)));
  const openGuest = (g) => { setSelectedNode(null); if (setSelectedGuestDetails) setSelectedGuestDetails({ ...g, currentNode: selectedNode.name }); };

  const m = selectedNode.metrics || {};
  const score = nodeScores && nodeScores[selectedNode.name];
  const inMaintenance = maintenanceNodes.has(selectedNode.name);
  const guestCount = selectedNode.guests ? Object.keys(selectedNode.guests).length : 0;
  // Automation only evacuates running guests; stopped ones stay until planned by hand.
  const runningCount = nodeGuests.filter(g => g.status === 'running').length;
  const stoppedCount = nodeGuests.length - runningCount;
  const plural = (n, word) => `${n} ${word}${n !== 1 ? 's' : ''}`;
  const vmCount = nodeGuests.filter(g => ['VM', 'QEMU'].includes((g.type || '').toUpperCase())).length;
  const ctCount = nodeGuests.length - vmCount;
  const memTotal = selectedNode.total_mem_gb || 0;
  const memUsed = memTotal * (selectedNode.mem_percent || 0) / 100;
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
  const isPlanning = planningNodes.has(selectedNode.name);
  const isEvacuating = evacuatingNodes.has(selectedNode.name);
  const canPlan = canMigrate && guestCount > 0 && !isPlanning && !isEvacuating;

  // What automation will do with a node in maintenance. The automigrate run
  // turns every guest on a maintenance node into an evacuation recommendation,
  // bypassing observation and cooldown, capped by max_migrations_per_run.
  const auto = { ...(automationConfig || {}), ...(automationStatus || {}) };
  const autoLive = !!auto.enabled && !auto.dry_run;
  const autoInterval = auto.check_interval_minutes;
  const maxPerRun = automationConfig && automationConfig.rules && automationConfig.rules.max_migrations_per_run;
  const hasWindows = !!(automationConfig && Array.isArray(automationConfig.time_windows) && automationConfig.time_windows.length);
  const savingMaint = maintenanceSaving === selectedNode.name;

  const applyMaintenance = async (enter) => {
    if (!setNodeMaintenance) return;
    setMaintError(null);
    const res = await setNodeMaintenance(selectedNode.name, enter);
    if (res && res.error) setMaintError(res.message || 'Could not update maintenance mode');
    else setConfirmMaint(false);
  };

  const handlePlanEvacuation = async () => {
    if (!canMigrate) {
      setError('Read-only API token (PVEAuditor) - Cannot perform migrations');
      return;
    }
    if (guestCount === 0) {
      setError(`Node ${selectedNode.name} has no VMs/CTs to evacuate`);
      return;
    }
    const nodeName = selectedNode.name;
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

  return (
    <div className={`${MODAL_OVERLAY} !items-end sm:!items-center z-[60]`} onClick={() => setSelectedNode(null)}>
      <div className={`${MODAL_CONTAINER.replace('max-w-md', 'max-w-2xl')} !p-0 !rounded-t-xl sm:!rounded-2xl !max-h-[85vh] sm:!max-h-[90vh] flex flex-col !overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        {/* Header: identity, status line and the headroom score, always visible */}
        <div className="flex items-center justify-between gap-3 p-4 sm:px-6 sm:py-5 border-b border-pb-border dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <Server size={24} className={`shrink-0 ${inMaintenance ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`} />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-xl font-bold text-pb-text dark:text-white truncate">{selectedNode.name}</h3>
                {inMaintenance && (
                  <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded-full shrink-0">MAINTENANCE</span>
                )}
              </div>
              <p className="text-xs text-pb-text2 dark:text-gray-400 flex items-center gap-1.5 flex-wrap">
                <span className={`inline-flex items-center gap-1 font-medium ${selectedNode.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${selectedNode.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} />
                  <span className="capitalize">{selectedNode.status || 'unknown'}</span>
                </span>
                {fmtUptime(selectedNode.uptime) && <span>· up {fmtUptime(selectedNode.uptime)}</span>}
                <span>· {vmCount} VM{vmCount !== 1 ? 's' : ''}, {ctCount} CT{ctCount !== 1 ? 's' : ''}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {score && (
              <div className="text-right leading-tight" title="Headroom: 0–100, how much room this node has to take on guests (higher = more room)">
                <div className={`text-2xl font-bold tabular-nums ${headroomTone(score.suitability_rating)}`}>
                  {Math.round(score.suitability_rating)}<span className="text-xs font-medium text-pb-text2 dark:text-gray-500">/100</span>
                </div>
                <div className="text-[10px] uppercase tracking-wide text-pb-text2 dark:text-gray-500">Headroom</div>
              </div>
            )}
            <button
              onClick={() => setSelectedNode(null)}
              className="ml-1 p-1.5 rounded-lg text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 hover:bg-pb-surface2 dark:hover:bg-gray-700"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {/* Load: now / 24h / 7d at a glance, plus what is eating headroom */}
          <div className={`${INNER_CARD} mb-4 space-y-3`}>
            <LoadRow label="CPU" sub={`${selectedNode.cpu_cores || 0} cores`} now={selectedNode.cpu_percent} avg24={m.avg_cpu} avg7={m.avg_cpu_week} peak={peakOf(selectedNode.cpu_percent, m.max_cpu, m.max_cpu_week)} />
            <LoadRow label="Memory" sub={memTotal ? `${memUsed.toFixed(1)} / ${memTotal.toFixed(0)} GB` : null} now={selectedNode.mem_percent} avg24={m.avg_mem} avg7={m.avg_mem_week} peak={peakOf(selectedNode.mem_percent, m.max_mem, m.max_mem_week)} />
            <LoadRow label="IOWait" sub="I/O latency" now={m.current_iowait} avg24={m.avg_iowait} avg7={m.avg_iowait_week} peak={peakOf(m.current_iowait, m.max_iowait)} />

            {score && (
              <div className="pt-3 border-t border-pb-border dark:border-slate-700">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs mb-1.5">
                  <span className="text-pb-text dark:text-gray-200 font-medium">What is using headroom</span>
                  <span className="text-pb-text2 dark:text-gray-400 tabular-nums">
                    <span className="font-semibold text-pb-text dark:text-gray-200">{fmtPts(Math.min(100, usedTotal))}</span> of 100 pts used
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
                  {[25, 50, 75].map(t => (
                    <span key={t} className="absolute top-0 bottom-0 w-px bg-pb-surface/70 dark:bg-slate-900/50" style={{ left: `${t}%` }} />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px]">
                  {usedSegs.map(seg => (
                    <span key={seg.key} className="flex items-center gap-1 text-pb-text2 dark:text-gray-400" title={seg.hint || `${seg.label} penalty points`}>
                      <span className={`inline-block w-2 h-2 rounded-full ${seg.color}`} />
                      {seg.label} <span className="font-semibold text-pb-text dark:text-gray-200 tabular-nums">{fmtPts(seg.value)}</span>
                    </span>
                  ))}
                  {penaltyTotal === 0 && <span className="text-green-600 dark:text-green-400">no penalties</span>}
                </div>
                {score.reason && <div className="mt-1 text-[11px] text-pb-text2 dark:text-gray-500">{score.reason}</div>}
              </div>
            )}
          </div>

          {/* History (real trend data) */}
          <Section title="History (24h)" isOpen={open.history} onToggle={() => toggle('history')}>
            <div className="bg-pb-surface2 dark:bg-slate-800/60 rounded-lg p-2">
              <MiniTrendChart
                points={trendPoints}
                series={[
                  { key: 'cpu', label: 'CPU', color: '#3b82f6' },
                  { key: 'mem', label: 'Mem', color: '#a855f7' },
                  { key: 'iowait', label: 'IOWait', color: '#f59e0b' },
                ]}
              />
            </div>
          </Section>

          {/* Recommendations involving this node */}
          {(movingOff.length > 0 || movingHere.length > 0) && (
            <Section
              title={<><MoveRight size={14} className="text-amber-600 dark:text-amber-400" /> Recommendations</>}
              badge={<span className="text-xs font-normal text-pb-text2 dark:text-gray-400">{movingOff.length} off / {movingHere.length} here</span>}
              isOpen={open.recs}
              onToggle={() => toggle('recs')}
            >
              <div className="space-y-1">
                {[...movingOff.map(r => ({ r, dir: 'off' })), ...movingHere.map(r => ({ r, dir: 'in' }))].map(({ r, dir }) => (
                  <div key={`${dir}-${r.vmid}`} className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-pb-text dark:text-gray-200 truncate">
                      <span className="font-mono text-pb-text2 dark:text-gray-400">{r.type} {r.vmid}</span> {r.name}
                      <span className="text-pb-text2 dark:text-gray-400"> · {r.source_node} → {r.target_node}</span>
                    </span>
                    {canMigrate && setConfirmMigration && (
                      <button
                        onClick={() => { setSelectedNode(null); setConfirmMigration(r); }}
                        className="shrink-0 px-2 py-0.5 rounded bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-medium"
                      >Migrate</button>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Guests on this node */}
          {nodeGuests.length > 0 && (
            <Section
              title="Guests"
              badge={<span className="text-xs font-normal text-pb-text2 dark:text-gray-400">{nodeGuests.length}</span>}
              isOpen={open.guests}
              onToggle={() => toggle('guests')}
            >
              <div className="rounded-lg border border-pb-border dark:border-slate-700 divide-y divide-pb-border dark:divide-slate-700 max-h-52 overflow-y-auto">
                {nodeGuests
                  .slice()
                  .sort((a, b) => (b.cpu_current || 0) - (a.cpu_current || 0))
                  .map(g => {
                    const memPct = g.mem_max_gb > 0 ? ((g.mem_used_gb || 0) / g.mem_max_gb) * 100 : 0;
                    const isVM = (g.type || '').toUpperCase() === 'VM' || (g.type || '').toUpperCase() === 'QEMU';
                    return (
                      <button
                        key={g.vmid}
                        onClick={() => openGuest(g)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 text-left text-xs hover:bg-pb-surface2 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${g.status === 'running' ? 'bg-green-500' : 'bg-gray-400'}`} title={g.status} />
                        <span className={`shrink-0 px-1 rounded text-[10px] font-bold ${isVM ? 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'}`}>{isVM ? 'VM' : 'CT'}</span>
                        <span className="font-mono text-pb-text2 dark:text-gray-400 shrink-0">{g.vmid}</span>
                        <span className="text-pb-text dark:text-gray-200 truncate flex-1">{g.name || ''}</span>
                        {offVmids.has(String(g.vmid)) && (
                          <span className="shrink-0 text-amber-600 dark:text-amber-400 flex items-center gap-0.5" title="Recommended to move off this node"><MoveRight size={11} />move</span>
                        )}
                        <span className="shrink-0 tabular-nums text-pb-text2 dark:text-gray-400">{(g.cpu_current || 0).toFixed(0)}% cpu</span>
                        <span className="shrink-0 tabular-nums text-pb-text2 dark:text-gray-400">{memPct.toFixed(0)}% mem</span>
                      </button>
                    );
                  })}
              </div>
            </Section>
          )}

          {/* How headroom is scored (explainer, collapsed) */}
          {score && (
            <Section
              title={<><Activity size={16} className="text-blue-600 dark:text-blue-400" /> How headroom is scored</>}
              isOpen={open.scoring}
              onToggle={() => toggle('scoring')}
            >
              <p className="text-xs text-pb-text2 dark:text-gray-400">
                Headroom is 0–100 (higher = more room to take guests): 100 minus penalty points for load, sustained averages, IOWait, spikes and trends.
                Load is weighted {penaltyConfig ? `${(penaltyConfig.weight_current * 100).toFixed(0)}% now, ${(penaltyConfig.weight_24h * 100).toFixed(0)}% 24h avg, ${(penaltyConfig.weight_7d * 100).toFixed(0)}% 7-day avg` : '50% now, 30% 24h avg, 20% 7-day avg'}.
                {' '}<span className="text-green-600 dark:text-green-400 font-semibold">70+</span> plenty · <span className="text-yellow-600 dark:text-yellow-400 font-semibold">50–69</span> good · <span className="text-orange-600 dark:text-orange-400 font-semibold">30–49</span> tight · <span className="text-red-600 dark:text-red-400 font-semibold">&lt;30</span> under pressure.
              </p>
            </Section>
          )}

          {/* Maintenance Mode Info (wording follows what automation will actually do) */}
          {inMaintenance && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">In maintenance</p>
                  <p>
                    No guests are placed here: recommendations, automation and evacuation plans skip {selectedNode.name} as a target.{' '}
                    {guestCount === 0
                      ? 'The node is empty.'
                      : autoLive
                        ? (runningCount > 0
                          ? `Live automation is moving its ${plural(runningCount, 'running guest')} off${maxPerRun ? `, up to ${maxPerRun} per run` : ''}.${stoppedCount > 0 ? ` ${plural(stoppedCount, 'stopped guest')} stay until you use Plan evacuation.` : ''}`
                          : `Automation only moves running guests, so the ${plural(stoppedCount, 'stopped guest')} stay until you use Plan evacuation.`)
                        : `Automation is ${auto.enabled ? 'in dry-run' : 'off'}, so its guests stay until you use Plan evacuation.`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky action footer; entering maintenance asks first, in place */}
        {confirmMaint && !inMaintenance ? (
          <div className="p-3 sm:px-6 sm:py-4 border-t border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/15 shrink-0" role="alertdialog" aria-labelledby="maint-confirm-title">
            <p id="maint-confirm-title" className="text-sm font-semibold text-pb-text dark:text-white flex items-center gap-1.5">
              <AlertTriangle size={16} className="text-amber-500 shrink-0" /> Put {selectedNode.name} in maintenance?
            </p>
            <ul className="mt-1.5 mb-3 space-y-1 text-xs text-pb-text2 dark:text-gray-300 list-disc pl-5">
              <li>No guests will be placed here: recommendations, automation and evacuation plans skip it as a target.</li>
              {guestCount === 0 ? (
                <li>The node has no guests, so nothing needs to move.</li>
              ) : autoLive && runningCount > 0 ? (
                <li className="text-amber-800 dark:text-amber-200 font-medium">
                  Automation is live{autoInterval ? ` (runs every ${autoInterval} min)` : ''}: its next run starts moving
                  {' '}{runningCount === 1 ? 'the 1 running guest' : `all ${runningCount} running guests`} on this node to other nodes
                  {maxPerRun ? `, up to ${maxPerRun} per run` : ''}{hasWindows ? ', inside its migration windows' : ''},
                  skipping the usual observation, cooldown and ignore-tag checks, and keeps going every run until none are left.
                  Containers restart when they move.
                  {stoppedCount > 0 ? ` ${plural(stoppedCount, 'stopped guest')} stay put unless you plan an evacuation.` : ''}
                </li>
              ) : autoLive ? (
                <li>Automation only moves running guests, and this node has none running, so nothing moves on its own.</li>
              ) : auto.enabled ? (
                <li>Automation is in dry-run, so nothing moves on its own; its runs only log the evacuation moves they would make.</li>
              ) : (
                <li>Automation is off, so nothing moves on its own. Use Plan evacuation to move the guests yourself.</li>
              )}
              <li>Saved on the server, so it applies in every browser until someone exits maintenance.</li>
            </ul>
            {maintError && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{maintError}</p>}
            <div className="flex items-center justify-end gap-2">
              <button onClick={() => { setConfirmMaint(false); setMaintError(null); }} disabled={savingMaint} className={`${BTN_SECONDARY} flex-1 sm:flex-none justify-center`}>
                Cancel
              </button>
              <button onClick={() => applyMaintenance(true)} disabled={savingMaint} className={`${autoLive && runningCount > 0 ? BTN_DANGER : BTN_PRIMARY} flex-1 sm:flex-none justify-center whitespace-nowrap`}>
                {savingMaint ? <><Loader className="animate-spin" size={16} /> Saving…</> : 'Enter maintenance'}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 sm:px-6 sm:py-4 border-t border-pb-border dark:border-slate-700 shrink-0">
            {maintError && <p className="mb-2 text-xs text-red-600 dark:text-red-400">{maintError}</p>}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={() => (inMaintenance ? applyMaintenance(false) : setConfirmMaint(true))}
                disabled={!setNodeMaintenance || savingMaint}
                className={`${BTN_SECONDARY} flex-1 sm:flex-none justify-center whitespace-nowrap !px-3 sm:!px-4`}
              >
                {savingMaint ? <><Loader className="animate-spin" size={16} /> Saving…</>
                  : inMaintenance
                    ? <><Check size={16} /> Exit<span className="hidden sm:inline"> maintenance</span></>
                    : <><AlertTriangle size={16} className="text-amber-500" /><span className="hidden sm:inline">Enter maintenance…</span><span className="sm:hidden">Maintenance…</span></>}
              </button>
              <div className="hidden sm:block flex-1" />
              <button
                onClick={handlePlanEvacuation}
                disabled={!canPlan}
                className={`${BTN_PRIMARY} flex-1 sm:flex-none justify-center whitespace-nowrap !px-3 sm:!px-4`}
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
        )}
      </div>
    </div>
  );
}
