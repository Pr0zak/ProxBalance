import {
  AlertTriangle, CheckCircle, XCircle, RefreshCw, MoveRight, TrendingUp, Lock, Info
} from '../Icons.jsx';
import {
  INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, statusBadge, headroomTextColor, metricTextColor, TAP_TARGET } from '../../utils/designTokens.js';
import MiniTrendChart from './MiniTrendChart.jsx';
import DetailPanel, { PeriodChips, FactRow, PANEL_PERIODS } from './DetailPanel.jsx';
import { behaviorTitle } from './workloadBehavior.js';
import { guestMobility } from './guestMobility.js';
import { seenCountDetail } from './recommendations/seenCount.js';
import { storageEntries, storageLine } from './recommendations/cardModel.js';
import { panelParts } from '../../utils/rightsizing.js';

const { useState, useEffect } = React;

const BEHAVIOR_META = {
  steady:    { label: 'Steady',    cls: 'text-green-600 dark:text-green-400' },
  bursty:    { label: 'Bursty',    cls: 'text-orange-600 dark:text-orange-400' },
  growing:   { label: 'Growing',   cls: 'text-red-600 dark:text-red-400' },
  cyclical:  { label: 'Cyclical',  cls: 'text-blue-600 dark:text-blue-400' },
  unknown:   { label: 'Unknown',   cls: 'text-pb-text2 dark:text-gray-400' },
};

// Verdict banner colours, keyed by tone.
const TONE = {
  red:   { box: 'bg-red-50 border-red-200 dark:bg-red-950/40 dark:border-red-900', title: 'text-red-800 dark:text-red-200', body: 'text-red-700 dark:text-red-300', icon: 'text-red-500' },
  amber: { box: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-900', title: 'text-amber-900 dark:text-amber-200', body: 'text-amber-800 dark:text-amber-300', icon: 'text-amber-500' },
  blue:  { box: 'bg-blue-50 border-blue-200 dark:bg-blue-950/40 dark:border-blue-900', title: 'text-blue-900 dark:text-blue-200', body: 'text-blue-800 dark:text-blue-300', icon: 'text-blue-500' },
  gray:  { box: 'bg-pb-surface2 border-pb-border dark:bg-slate-800/60 dark:border-slate-700', title: 'text-pb-text dark:text-gray-100', body: 'text-pb-text2 dark:text-gray-400', icon: 'text-pb-text2 dark:text-gray-400' },
};

const ratingTone = headroomTextColor;

const fmtRate = (bps) => {
  const b = bps || 0;
  if (b >= 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB/s`;
  if (b >= 1024) return `${(b / 1024).toFixed(0)} KB/s`;
  return b > 0 ? '<1 KB/s' : '0';
};

// Every node ranked for this guest (from /api/guest/<vmid>/migration-options).
function TargetList({ opts, canMove, hostNode, hostRating, onMove }) {
  const candidates = opts.options.filter(o => !o.is_current && !o.disqualified)
    .sort((a, b) => (b.suitability_rating || 0) - (a.suitability_rating || 0));
  const blocked = opts.options.filter(o => !o.is_current && o.disqualified);
  return (
    <div className="mt-3 space-y-1.5">
      {candidates.map((opt, i) => {
        const mt = opt.metrics || {};
        const oc = opt.overcommit_ratio || 0;
        const dir = opt.trend_analysis && opt.trend_analysis.cpu_direction;
        return (
          <div key={opt.node} className={`${INNER_CARD} !p-2.5 flex items-center gap-3`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-sm">
                <span className="font-semibold text-pb-text dark:text-white">{opt.node}</span>
                {i === 0 && (hostRating == null || opt.suitability_rating > hostRating) && <span className={statusBadge('blue')}>Best</span>}
                {(dir === 'rising' || dir === 'sustained_increase') && <TrendingUp size={12} className="text-orange-500" />}
                <span className={`ml-auto font-bold tabular-nums ${ratingTone(opt.suitability_rating)}`} title="Headroom this node would have with the guest on it">
                  {Math.round(opt.suitability_rating)}
                </span>
              </div>
              <div className="text-[11px] text-pb-text2 dark:text-gray-400 tabular-nums">
                after: CPU {Math.round(mt.predicted_cpu || 0)}% · RAM {Math.round(mt.predicted_mem || 0)}%
                {oc > 1.0 && <span className="ml-1 text-orange-600 dark:text-orange-400" title={`Memory committed: ${(oc * 100).toFixed(0)}% of physical`}>· committed {(oc * 100).toFixed(0)}%</span>}
              </div>
              {storageEntries(opt, 'warning').map((e) => (
                <div
                  key={e.storage}
                  className={`flex items-start gap-1 text-[11px] ${e.level === 'critical' ? 'text-red-600 dark:text-red-400' : 'text-amber-700 dark:text-amber-300'}`}
                >
                  <AlertTriangle size={11} className="mt-0.5 shrink-0" /> <span>{storageLine(e)}</span>
                </div>
              ))}
            </div>
            {canMove && (
              <button onClick={() => onMove(opt)} className={`${i === 0 && (hostRating == null || opt.suitability_rating > hostRating) ? BTN_PRIMARY : BTN_SECONDARY} !px-2.5 !py-1 !text-xs shrink-0`}>
                Move here
              </button>
            )}
          </div>
        );
      })}
      {blocked.map(opt => (
        <div key={opt.node} className="flex items-center gap-1.5 text-[11px] text-pb-text2 dark:text-gray-400 px-1">
          <XCircle size={12} className="text-pb-text3 dark:text-gray-500 shrink-0" />
          <span className="font-medium text-pb-text dark:text-gray-300">{opt.node}</span> — {opt.reason}
        </div>
      ))}
      {hostRating != null && (
        <p className="text-[11px] text-pb-text2 dark:text-gray-400 px-1">
          Numbers are the headroom each node would have with it. {hostNode} has <span className={`font-semibold ${ratingTone(hostRating)}`}>{Math.round(hostRating)}</span> now.
        </p>
      )}
    </div>
  );
}

function StatTile({ label, children, sub }) {
  return (
    <div className={`${INNER_CARD} !p-2.5`}>
      <div className="text-[11px] text-pb-text2 dark:text-gray-400">{label}</div>
      {children}
      {sub && <div className="text-[11px] text-pb-text2 dark:text-gray-400">{sub}</div>}
    </div>
  );
}

export default function GuestDetailPanel({
  selectedGuestDetails, setSelectedGuestDetails, setSelectedNode,
  data, nodeScores, guestRecMap, skippedGuests,
  guestMigrationOptions, loadingGuestOptions, fetchGuestMigrationOptions,
  canMigrate,
  setSelectedGuest, setMigrationTarget, setShowMigrationDialog,
  setConfirmMigration, guestProfiles,
  setError,
  API_BASE
}) {
  const [togglingExempt, setTogglingExempt] = useState(false);
  const [exemptError, setExemptError] = useState(null);
  const [optsDoneFor, setOptsDoneFor] = useState(null);
  const [history, setHistory] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  // Right-sizing rides along with the history payload; it always covers the
  // last 7 days whatever chart period is picked.
  const [rightsizing, setRightsizing] = useState(null);
  const [period, setPeriod] = useState('24h');
  const [showTargets, setShowTargets] = useState(false);
  const [showDisks, setShowDisks] = useState(false);

  const vmid = selectedGuestDetails?.vmid;
  // Prefer the latest collection's copy so an open panel refreshes, but keep
  // fields the panel itself changed (tags after an IOWait toggle).
  const live = vmid != null && data?.guests ? data.guests[String(vmid)] : null;
  const guest = selectedGuestDetails ? { ...(live || {}), ...selectedGuestDetails, ...(live ? {
    cpu_current: live.cpu_current, cpu_avg_hour: live.cpu_avg_hour, mem_used_gb: live.mem_used_gb, status: live.status,
    disk_read_bps: live.disk_read_bps, disk_write_bps: live.disk_write_bps, net_in_bps: live.net_in_bps, net_out_bps: live.net_out_bps,
  } : {}) } : null;
  const pinned = !!guest?.local_disks?.is_pinned;

  const hours = (PANEL_PERIODS.find(p => p.id === period) || PANEL_PERIODS[2]).hours;
  useEffect(() => {
    if (vmid == null) { setHistory(null); setRightsizing(null); return; }
    let cancelled = false;
    setLoadingHistory(true); setHistory(null);
    fetch(`${API_BASE}/guests/${vmid}/history?hours=${hours}`)
      .then(r => r.json())
      .then(j => {
        if (cancelled || !j.success) return;
        setHistory(j.points || []);
        setRightsizing(j.rightsizing || null);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [vmid, hours, API_BASE]);

  // Score every node for this guest as soon as it opens, unless it's pinned to
  // its host. Results are matched to this vmid below, so a slow answer for the
  // previous guest is never shown as this one's.
  const loadOptions = () => {
    if (vmid == null || !fetchGuestMigrationOptions || pinned) return () => {};
    let cancelled = false;
    setOptsDoneFor(null);
    Promise.resolve(fetchGuestMigrationOptions(vmid))
      .catch(() => {})
      .finally(() => { if (!cancelled) setOptsDoneFor(vmid); });
    return () => { cancelled = true; };
  };
  useEffect(() => { setExemptError(null); setShowTargets(false); setShowDisks(false); setRightsizing(null); return loadOptions(); }, [vmid]);

  if (!guest) return null;

  const allTags = (guest.tags && guest.tags.all_tags) || [];
  const hasExemptTag = allTags.includes('io_exempt') || allTags.includes('proxbalance_io_exempt');
  const isPassthroughExempt = guest.io_exempt_reason === 'passthrough';
  const isVM = guest.type === 'qemu' || (guest.type || '').toUpperCase() === 'VM';
  // Rows from the Guests tab carry `node`; rows from a node view carry `currentNode`.
  const hostNode = (live && live.node) || guest.currentNode || guest.node;
  const hostData = data?.nodes?.[hostNode];
  const hostRating = nodeScores?.[hostNode]?.suitability_rating;
  const moveOpts = guestMigrationOptions && String(guestMigrationOptions.vmid) === String(vmid) ? guestMigrationOptions : null;
  const optsLoading = !pinned && (loadingGuestOptions || optsDoneFor !== vmid) && !moveOpts;
  const optsFailed = !pinned && optsDoneFor === vmid && !loadingGuestOptions && !moveOpts;
  const candidates = moveOpts?.options
    ? moveOpts.options.filter(o => !o.is_current && !o.disqualified).sort((a, b) => (b.suitability_rating || 0) - (a.suitability_rating || 0))
    : [];
  const best = candidates[0] || null;
  // A move only helps if the target ends up with more headroom than the guest's node has now.
  const bestHelps = !!best && (hostRating == null || best.suitability_rating > hostRating);
  const profile = guestProfiles && (guestProfiles[vmid] || guestProfiles[String(vmid)]);
  const affinityGroups = (guest.tags && guest.tags.affinity_groups) || [];
  const excludeGroups = (guest.tags && guest.tags.exclude_groups) || [];
  const mounts = guest.mount_points || {};
  const disks = guest.local_disks || {};
  const skipped = (skippedGuests || []).find(s => String(s.vmid) === String(vmid));
  const rec = guestRecMap?.[String(vmid)];
  const mob = guestMobility(guest, rec, skipped);
  const anchored = (hostData?.anchored_guests || []).find(a => String(a.vmid) === String(vmid));
  const isRunning = guest.status === 'running';
  const memPct = guest.mem_max_gb > 0 ? ((guest.mem_used_gb || 0) / guest.mem_max_gb) * 100 : 0;
  const cpuHour = typeof guest.cpu_avg_hour === 'number' ? guest.cpu_avg_hour : (guest.cpu_current || 0);
  const canMove = canMigrate && !!setConfirmMigration && !pinned;

  const migrateTo = (opt) => {
    if (!setConfirmMigration) return;
    setConfirmMigration({
      vmid: guest.vmid,
      name: guest.name || `Guest ${guest.vmid}`,
      type: isVM ? 'VM' : 'CT',
      source_node: (moveOpts && moveOpts.current_node) || hostNode,
      target_node: opt.node,
      mem_gb: guest.mem_max_gb || 0,
      suitability_rating: opt.suitability_rating,
      score_improvement: opt.improvement,
      reason: opt.reason,
      // Projected target storage (absent on the option = nothing local above 0)
      target_storage: opt.target_storage || [],
    });
    setSelectedGuestDetails(null);
  };
  const openHost = () => {
    if (!hostData || !setSelectedNode) return;
    setSelectedGuestDetails(null);
    setSelectedNode(hostData);
  };

  const toggleIoExempt = async () => {
    if (togglingExempt) return;
    setTogglingExempt(true);
    setExemptError(null);
    // Read a JSON reply and turn any failure into an Error with the server's message.
    const expectOk = async (res, what) => {
      let body = null;
      try { body = await res.json(); } catch (e) { /* non-JSON error page */ }
      if (!res.ok || (body && body.success === false)) {
        throw new Error(`${what}: ${(body && (body.error || body.message)) || `HTTP ${res.status}`}`);
      }
      return body || {};
    };
    try {
      if (hasExemptTag) {
        await expectOk(await fetch(`${API_BASE}/guests/${vmid}/tags/io_exempt`, { method: 'DELETE' }), 'Removing the io_exempt tag failed');
      } else {
        await expectOk(await fetch(`${API_BASE}/guests/${vmid}/tags`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'io_exempt' })
        }), 'Adding the io_exempt tag failed');
      }
      const rj = await expectOk(await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, { method: 'POST' }), 'Tag saved, but re-reading the tags failed');
      if (rj.tags) {
        const nowExempt = (rj.tags.all_tags || []).includes('io_exempt');
        setSelectedGuestDetails(prev => prev ? {
          ...prev,
          tags: rj.tags,
          io_exempt: nowExempt || prev.io_exempt_reason === 'passthrough',
          io_exempt_reason: nowExempt ? 'tag' : (prev.io_exempt_reason === 'passthrough' ? 'passthrough' : null),
        } : prev);
        // Recompute node scoring/flags on the next collection.
        fetch(`${API_BASE}/refresh`, { method: 'POST' }).catch(() => {});
      }
    } catch (e) {
      setExemptError(e.message);
      if (setError) setError(e.message);
    }
    setTogglingExempt(false);
  };

  // The verdict: can this guest move, and where to. Answers first, details below.
  let verdict;
  const anchoredLine = anchored && isRunning && (anchored.cpu_share || 0) >= 0.5
    ? `Counted as unmovable load: ${anchored.cpu_share.toFixed(0)}% of ${hostNode}'s CPU, so ${hostNode} isn't drained because of it.`
    : null;
  if (mob.key === 'pinned') {
    const n = disks.total_pinned_disks || disks.passthrough_count;
    verdict = {
      tone: 'red', icon: Lock, title: `Stays on ${hostNode}`,
      body: [`${n ? `${n} ` : ''}${(disks.pinned_reason || 'Local hardware').toLowerCase()} tie it to this host.${guest.tags?.has_ignore ? ' It also has the ignore tag.' : ''}`, anchoredLine],
    };
  } else if (mob.key === 'suggested') {
    verdict = {
      tone: 'amber', icon: MoveRight, title: `Suggested: move to ${rec.target_node}`,
      // Plain text rather than a tooltip so phones see it too.
      body: [rec.reason || null, ...seenCountDetail(rec)],
      action: canMigrate && setConfirmMigration ? { label: 'Review move', run: () => { setSelectedGuestDetails(null); setConfirmMigration(rec); } } : null,
    };
  } else if (mob.key === 'manual') {
    verdict = {
      tone: 'amber', icon: AlertTriangle, title: 'Moves by hand only',
      body: ['A folder from this host is mounted into it, so ProxBalance won\'t move it. Move it with a restart after checking the folder exists on the new node.'],
    };
  } else if (mob.key === 'ha') {
    verdict = { tone: 'blue', icon: Info, title: 'Proxmox HA places it', body: ['ProxBalance leaves HA-managed guests to the Proxmox balancer.'] };
  } else if (mob.key === 'ignored') {
    verdict = { tone: 'gray', icon: Info, title: 'Not moved automatically', body: ['It has the ignore tag. You can still move it yourself.', anchoredLine] };
  } else if (mob.key === 'stopped') {
    verdict = { tone: 'gray', icon: Info, title: 'Powered off', body: ['Only moved when its node is emptied for maintenance. You can still move it yourself.'] };
  } else if (optsLoading) {
    verdict = { tone: 'blue', icon: RefreshCw, spin: true, title: 'Can move', body: ['Scoring the other nodes for it…'] };
  } else if (best && !bestHelps) {
    verdict = {
      tone: 'gray', icon: CheckCircle, title: 'Best where it is',
      body: [`No other node would have more headroom with it: ${best.node} would have ${Math.round(best.suitability_rating)}, ${hostNode} has ${Math.round(hostRating)} now.`],
    };
  } else if (best) {
    verdict = {
      tone: 'blue', icon: CheckCircle, title: `Can move · best is ${best.node}`,
      body: [
        `${best.node} would have ${Math.round(best.suitability_rating)} headroom with it${hostRating != null ? `; ${hostNode} has ${Math.round(hostRating)} now` : ''}.`,
        mob.hint ? `${mob.hint}.` : 'Not suggested right now.',
      ],
    };
  } else {
    verdict = { tone: 'gray', icon: Info, title: 'Can move, but not now', body: [optsFailed ? "Couldn't score the other nodes." : 'No other node can take it right now.'] };
  }
  const tone = TONE[verdict.tone];
  const VerdictIcon = verdict.icon;
  const showMoveButtons = canMove && !optsLoading && bestHelps && mob.key !== 'suggested' && mob.key !== 'ha';

  const header = (
    <div className="flex items-center gap-2.5">
      <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-bold text-white ${isVM ? 'bg-purple-600' : 'bg-emerald-600'}`}>{isVM ? 'VM' : 'CT'}</div>
      <div className="min-w-0">
        <div className="text-[11px] text-pb-text2 dark:text-gray-400">
          {hostData && setSelectedNode
            ? <button onClick={openHost} className="relative hover:underline text-blue-600 dark:text-blue-400 before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']" title={`Open ${hostNode}`}>{hostNode}</button>
            : hostNode}
          {' › '}{guest.name || guest.vmid}
        </div>
        <h3 className="text-lg font-bold text-pb-text dark:text-white truncate leading-tight">{guest.name || `Guest ${guest.vmid}`}</h3>
        <p className="text-xs text-pb-text2 dark:text-gray-400 truncate">
          <span className={isRunning ? 'text-green-600 dark:text-green-400' : ''}>● <span className="capitalize">{guest.status}</span></span>
          {' · '}{isVM ? 'VM' : 'CT'} {guest.vmid} · {guest.cpu_cores || 0} cores · {(guest.mem_max_gb || 0).toFixed(guest.mem_max_gb >= 10 ? 0 : 1)} GB
        </p>
      </div>
    </div>
  );

  return (
    <DetailPanel onClose={() => setSelectedGuestDetails(null)} header={header} label={`Guest ${guest.name || guest.vmid}`}>
      {/* Verdict */}
      <div className={`rounded-xl border p-3 ${tone.box}`}>
        <div className="flex items-start gap-2.5">
          <VerdictIcon size={18} className={`shrink-0 mt-0.5 ${tone.icon} ${verdict.spin ? 'animate-spin' : ''}`} />
          <div className="min-w-0 flex-1">
            <div className={`text-[15px] font-bold ${tone.title}`}>{verdict.title}</div>
            {verdict.body.filter(Boolean).map((t, i) => (
              <p key={i} className={`text-[13px] mt-0.5 ${tone.body}`}>{t}</p>
            ))}
            {(verdict.action || showMoveButtons || optsFailed || (canMove && candidates.length > 0)) && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {verdict.action && <button onClick={verdict.action.run} className={`${BTN_PRIMARY} !px-3 !py-1.5 !text-xs`}><MoveRight size={14} /> {verdict.action.label}</button>}
                {showMoveButtons && <button onClick={() => migrateTo(best)} className={`${BTN_PRIMARY} !px-3 !py-1.5 !text-xs`}><MoveRight size={14} /> Move to {best.node}</button>}
                {moveOpts && candidates.length > 0 && !pinned && mob.key !== 'ha' && (
                  <button onClick={() => setShowTargets(s => !s)} className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs`}>
                    {showTargets ? 'Hide nodes' : 'Other nodes…'}
                  </button>
                )}
                {optsFailed && <button onClick={loadOptions} className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs`}><RefreshCw size={12} /> Retry</button>}
              </div>
            )}
          </div>
        </div>
        {showTargets && moveOpts && (
          <TargetList opts={moveOpts} canMove={canMove && mob.key !== 'ha'} hostNode={hostNode} hostRating={hostRating} onMove={migrateTo} />
        )}
      </div>

      {/* Usage now */}
      <div className="grid grid-cols-2 gap-2">
        <StatTile label="CPU · last hour" sub={`of its ${guest.cpu_cores || 0} cores · now ${(guest.cpu_current || 0).toFixed(0)}%`}>
          <div className={`text-xl font-bold tabular-nums ${metricTextColor(cpuHour)}`}>{cpuHour.toFixed(1)}%</div>
        </StatTile>
        <StatTile label="Memory" sub={`${(guest.mem_used_gb || 0).toFixed(1)} of ${(guest.mem_max_gb || 0).toFixed(1)} GB`}>
          <div className={`text-xl font-bold tabular-nums ${metricTextColor(memPct)}`}>{memPct.toFixed(0)}%</div>
        </StatTile>
        <StatTile label="Disk read / write">
          <div className="text-sm font-semibold tabular-nums text-pb-text dark:text-white">{fmtRate(guest.disk_read_bps)} / {fmtRate(guest.disk_write_bps)}</div>
        </StatTile>
        <StatTile label="Network in / out">
          <div className="text-sm font-semibold tabular-nums text-pb-text dark:text-white">{fmtRate(guest.net_in_bps)} / {fmtRate(guest.net_out_bps)}</div>
        </StatTile>
      </div>

      {/* History */}
      <div className={`${INNER_CARD} !p-3`}>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-pb-text dark:text-gray-200">History</span>
          <PeriodChips value={period} onChange={setPeriod} />
        </div>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8 text-xs text-pb-text2 dark:text-gray-400"><RefreshCw size={14} className="animate-spin mr-2" /> Loading history…</div>
        ) : (
          <MiniTrendChart
            points={history || []}
            height={100}
            series={[
              { key: 'cpu', label: 'CPU (of its cores)', color: '#3b82f6' },
              { key: 'mem', label: 'Mem', color: '#10b981' },
            ]}
          />
        )}
      </div>

      {/* Facts */}
      <div>
        <FactRow label="Behaviour">
          {profile ? (() => {
            const meta = BEHAVIOR_META[profile.behavior] || BEHAVIOR_META.unknown;
            return (
              <span title={behaviorTitle(profile)}>
                <span className={`font-semibold ${meta.cls}`}>{meta.label}</span>
                {profile.confidence === 'low' ? ' (low confidence)' : ''}
                {profile.peak_multiplier > 1.5 ? <span className="text-pb-text2 dark:text-gray-400"> · peaks {profile.peak_multiplier.toFixed(1)}× its average</span> : null}
              </span>
            );
          })() : <span className="text-pb-text2 dark:text-gray-500">No profile yet</span>}
        </FactRow>

        {panelParts(rightsizing) && (
          <FactRow label="Right-sizing">
            <span
              className={rightsizing.status === 'ok' && rightsizing.hints?.length ? 'text-pb-text dark:text-gray-200' : 'text-pb-text2 dark:text-gray-400'}
              title="From the last 7 days of samples"
            >
              {panelParts(rightsizing).map((p, i) => <span key={i} className="block">{p}</span>)}
            </span>
          </FactRow>
        )}

        {(affinityGroups.length > 0 || excludeGroups.length > 0) && (
          <FactRow label="Placement rules">
            <span className="flex flex-wrap justify-end gap-1">
              {affinityGroups.map(g => <span key={`a-${g}`} className="px-1.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs" title="Keep together">together: {g}</span>)}
              {excludeGroups.map(g => <span key={`x-${g}`} className="px-1.5 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 text-xs" title="Keep apart">apart: {g}</span>)}
            </span>
          </FactRow>
        )}

        {mounts.has_mount_points && (mounts.mount_points || []).map((mp, i) => (
          <FactRow key={`mp-${i}`} label={i === 0 ? `Mount${mounts.mount_points.length > 1 ? 's' : ''}` : ''}>
            <span title={`Source: ${mp.source}`}>
              <span className="font-mono text-xs">{mp.mount_path}</span>
              {' · '}
              {mp.is_bind_mount
                ? (mp.is_shared
                  ? <span className="text-sky-700 dark:text-sky-300">shared</span>
                  : <span className="text-orange-600 dark:text-orange-400">host folder</span>)
                : <span className="text-pb-text2 dark:text-gray-400">storage</span>}
            </span>
            {mp.is_bind_mount && !mp.is_shared && (
              <div className="text-[11px] text-orange-700 dark:text-orange-300 mt-0.5">
                Move by hand: <span className="font-mono">pct migrate {guest.vmid} &lt;target&gt; --restart</span>, after creating {mp.source} on the target.
              </div>
            )}
          </FactRow>
        ))}

        {pinned && (
          <FactRow label="Pinned disks">
            <button onClick={() => setShowDisks(s => !s)} className="text-blue-600 dark:text-blue-400 hover:underline">
              {disks.total_pinned_disks || (disks.passthrough_disks || []).length} {showDisks ? '· hide' : '· show'}
            </button>
            {showDisks && (
              <div className="mt-1 space-y-0.5 text-left">
                {(disks.passthrough_disks || []).map((d, i) => (
                  <div key={i} className="text-[11px] text-pb-text2 dark:text-gray-400 break-all"><span className="font-mono text-pb-text dark:text-gray-200">{d.key}</span> {d.device}</div>
                ))}
              </div>
            )}
          </FactRow>
        )}

        {allTags.length > 0 && (
          <FactRow label="Tags">
            <span className="flex flex-wrap justify-end gap-1">
              {allTags.map(tag => (
                <span key={tag} className="px-1.5 py-0.5 rounded bg-pb-surface2 dark:bg-slate-800 text-pb-text dark:text-gray-300 text-xs">{tag}</span>
              ))}
            </span>
          </FactRow>
        )}

        <FactRow label="IOWait scoring">
          {isPassthroughExempt ? (
            <span>Not counted against {hostNode} <span className="text-pb-text2 dark:text-gray-400">(passthrough disks)</span></span>
          ) : (
            <span className="flex items-center justify-end gap-2">
              <span>{hasExemptTag ? `Not counted against ${hostNode}` : 'Counted'}</span>
              <button
                onClick={toggleIoExempt}
                disabled={togglingExempt}
                title={hasExemptTag ? 'Remove the io_exempt tag' : "Add the io_exempt tag: use when its I/O is on dedicated storage a move can't relieve"}
                className={`${TAP_TARGET} text-xs text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50`}
              >
                {togglingExempt ? 'Saving…' : hasExemptTag ? 'Count it' : 'Exempt…'}
              </button>
            </span>
          )}
          {exemptError && <div className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{exemptError}</div>}
        </FactRow>

        <FactRow label="Other">
          {[
            guest.has_backup ? 'Backed up' : 'No backup found',
            isVM ? (guest.agent_running ? 'guest agent running' : 'no guest agent') : null,
            guest.ha_managed ? `HA${guest.ha_state ? ` (${guest.ha_state})` : ''}` : 'not HA',
          ].filter(Boolean).join(' · ')}
        </FactRow>
      </div>

      {/* Fallback: open the full migrate dialog when no ranked target is available */}
      {canMove && optsFailed && setShowMigrationDialog && (
        <button
          onClick={() => {
            setSelectedGuest({ ...guest, currentNode: hostNode });
            setMigrationTarget('');
            setShowMigrationDialog(true);
            setSelectedGuestDetails(null);
          }}
          className={`${BTN_SECONDARY} w-full justify-center`}
        >
          <MoveRight size={16} /> Migrate…
        </button>
      )}
    </DetailPanel>
  );
}
