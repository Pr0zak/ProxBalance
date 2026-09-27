import {
  HardDrive, Package, X, Activity, AlertCircle, Folder,
  AlertTriangle, CheckCircle, XCircle,
  RefreshCw, MoveRight, TrendingUp
} from '../Icons.jsx';
import {
  MODAL_OVERLAY, MODAL_CONTAINER, INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, statusBadge, headroomTextColor } from '../../utils/designTokens.js';
import MiniTrendChart from './MiniTrendChart.jsx';
import Section from './CollapsibleSection.jsx';

const { useState, useEffect } = React;

const BEHAVIOR_META = {
  steady:    { label: 'Steady',    cls: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' },
  bursty:    { label: 'Bursty',    cls: 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300' },
  growing:   { label: 'Growing',   cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300' },
  cyclical:  { label: 'Cyclical',  cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300' },
  unknown:   { label: 'Unknown',   cls: 'bg-gray-100 dark:bg-slate-700 text-pb-text2 dark:text-gray-400' },
};

const ratingTone = headroomTextColor;

// Ranked target nodes for this guest (from /api/guest/<vmid>/migration-options),
// shown as soon as the window opens so picking a destination is one click.
function MoveToTargets({ opts, loading, failed, onRetry, canMigrate, hostNode, onMove }) {
  if (loading) {
    return (
      <div className={`${INNER_CARD} !p-3 mb-3 flex items-center gap-2 text-xs text-pb-text2 dark:text-gray-400`}>
        <RefreshCw size={14} className="animate-spin" /> Scoring every node for this guest…
      </div>
    );
  }
  if (failed) {
    return (
      <div className={`${INNER_CARD} !p-3 mb-3 flex items-center justify-between gap-2 text-xs text-red-600 dark:text-red-400`}>
        <span className="flex items-center gap-1.5"><AlertCircle size={14} /> Couldn't score the other nodes for this guest.</span>
        {onRetry && <button onClick={onRetry} className={`${BTN_SECONDARY} !px-2.5 !py-1 !text-xs`}><RefreshCw size={12} /> Retry</button>}
      </div>
    );
  }
  if (!opts || !opts.options) return null;
  const current = opts.options.find(o => o.is_current);
  const candidates = opts.options.filter(o => !o.is_current && !o.disqualified);
  const blocked = opts.options.filter(o => !o.is_current && o.disqualified);
  const best = candidates[0];

  return (
    <div className="mb-3">
      <div className="flex items-baseline justify-between gap-2 mb-1.5">
        <h4 className="text-sm font-semibold text-pb-text dark:text-white flex items-center gap-1.5">
          <MoveRight size={14} className="text-blue-600 dark:text-blue-400" /> Move to
        </h4>
        {current && (
          <span className="text-[11px] text-pb-text2 dark:text-gray-400">
            staying on {hostNode}: <span className={`font-semibold ${ratingTone(current.suitability_rating)}`}>{Math.round(current.suitability_rating)}</span>/100 headroom
          </span>
        )}
      </div>
      {candidates.length === 0 ? (
        <div className={`${INNER_CARD} !p-3 text-xs text-pb-text2 dark:text-gray-400`}>No node can take this guest right now.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {candidates.map(opt => {
            const isBest = opt === best;
            const gain = opt.improvement || 0;
            const mt = opt.metrics || {};
            const oc = opt.overcommit_ratio || 0;
            const dir = opt.trend_analysis && opt.trend_analysis.cpu_direction;
            return (
              <div
                key={opt.node}
                className={`${INNER_CARD} !p-3 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1.5 items-center sm:flex sm:flex-col sm:items-stretch ${isBest ? 'ring-1 ring-pb-accent/60 dark:ring-pb-accent-dark/60' : ''}`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-sm text-pb-text dark:text-white">{opt.node}</span>
                    {isBest && <span className={statusBadge('blue')}>Best</span>}
                    {(dir === 'rising' || dir === 'sustained_increase') && <TrendingUp size={12} className="text-orange-500" />}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className={`text-lg font-bold tabular-nums ${ratingTone(opt.suitability_rating)}`} title="Headroom this node would have with the guest on it">
                      {Math.round(opt.suitability_rating)}<span className="text-[10px] font-medium text-pb-text2 dark:text-gray-500">/100</span>
                    </span>
                    <span className={`text-[11px] font-medium ${gain >= 1 ? 'text-green-600 dark:text-green-400' : 'text-pb-text2 dark:text-gray-500'}`}>
                      {gain >= 1 ? `+${gain.toFixed(0)} vs staying` : 'no gain'}
                    </span>
                  </div>
                </div>
                {canMigrate && onMove && (
                  <button
                    onClick={() => onMove(opt)}
                    className={`${isBest ? BTN_PRIMARY : BTN_SECONDARY} !px-2.5 !py-1 !text-xs justify-center sm:order-last sm:mt-auto`}
                  >
                    Move here
                  </button>
                )}
                <div className="col-span-2 sm:col-span-1 text-[11px] text-pb-text2 dark:text-gray-400 tabular-nums">
                  after move: CPU {Math.round(mt.predicted_cpu || 0)}% · RAM {Math.round(mt.predicted_mem || 0)}%
                  {oc > 1.0 && <span className="ml-1 text-orange-600 dark:text-orange-400" title={`Memory committed: ${(oc * 100).toFixed(0)}% of physical`}>· OC {(oc * 100).toFixed(0)}%</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {blocked.length > 0 && (
        <div className="mt-1.5 space-y-0.5">
          {blocked.map(opt => (
            <div key={opt.node} className="flex items-center gap-1.5 text-[11px] text-pb-text2 dark:text-gray-400">
              <XCircle size={12} className="text-pb-text3 dark:text-gray-500 shrink-0" />
              <span className="font-medium text-pb-text dark:text-gray-300">{opt.node}</span> — {opt.reason}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function GuestDetailsModal({
  selectedGuestDetails, setSelectedGuestDetails,
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
  const [openSec, setOpenSec] = useState({ usage: false, profile: false, iowait: false, tags: false, mounts: false, passthrough: false });
  const toggleSec = (k) => setOpenSec(o => ({ ...o, [k]: !o[k] }));

  const vmid = selectedGuestDetails?.vmid;
  useEffect(() => {
    if (vmid == null) { setHistory(null); return; }
    let cancelled = false;
    setLoadingHistory(true); setHistory(null);
    fetch(`${API_BASE}/guests/${vmid}/history?hours=24`)
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success) setHistory(j.points || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingHistory(false); });
    return () => { cancelled = true; };
  }, [vmid, API_BASE]);

  // Score every node for this guest as soon as it opens, and again for each new
  // guest. The fetcher passed down already sends the thresholds and the current
  // maintenance nodes. Results are matched to this vmid below, so a slow answer
  // for the previous guest is never shown as this one's.
  const loadOptions = () => {
    if (vmid == null || !fetchGuestMigrationOptions) return () => {};
    let cancelled = false;
    setOptsDoneFor(null);
    Promise.resolve(fetchGuestMigrationOptions(vmid))
      .catch(() => {})
      .finally(() => { if (!cancelled) setOptsDoneFor(vmid); });
    return () => { cancelled = true; };
  };
  useEffect(() => { setExemptError(null); return loadOptions(); }, [vmid]);

  if (!selectedGuestDetails) return null;

  const allTags = (selectedGuestDetails.tags && selectedGuestDetails.tags.all_tags) || [];
  const hasExemptTag = allTags.includes('io_exempt') || allTags.includes('proxbalance_io_exempt');
  const isPassthroughExempt = selectedGuestDetails.io_exempt_reason === 'passthrough';
  const isVM = selectedGuestDetails.type === 'qemu' || (selectedGuestDetails.type || '').toUpperCase() === 'VM';
  // Rows from the Guests tab carry `node`; rows from a node window carry `currentNode`.
  const hostNode = selectedGuestDetails.currentNode || selectedGuestDetails.node;
  const moveOpts = guestMigrationOptions && String(guestMigrationOptions.vmid) === String(vmid) ? guestMigrationOptions : null;
  const optsFailed = optsDoneFor === vmid && !loadingGuestOptions && !moveOpts;
  const bestTarget = moveOpts && moveOpts.options ? moveOpts.options.find(o => !o.is_current && !o.disqualified) : null;
  const profile = guestProfiles && (guestProfiles[vmid] || guestProfiles[String(vmid)]);
  const affinityGroups = (selectedGuestDetails.tags && selectedGuestDetails.tags.affinity_groups) || [];
  const excludeGroups = (selectedGuestDetails.tags && selectedGuestDetails.tags.exclude_groups) || [];
  const migrateTo = (opt) => {
    if (!setConfirmMigration) return;
    setConfirmMigration({
      vmid: selectedGuestDetails.vmid,
      name: selectedGuestDetails.name || `Guest ${selectedGuestDetails.vmid}`,
      type: isVM ? 'VM' : 'CT',
      source_node: (moveOpts && moveOpts.current_node) || hostNode,
      target_node: opt.node,
      mem_gb: selectedGuestDetails.mem_max_gb || 0,
      suitability_rating: opt.suitability_rating,
      score_improvement: opt.improvement,
      reason: opt.reason,
    });
    setSelectedGuestDetails(null);
  };

  const toggleIoExempt = async () => {
    if (togglingExempt) return;
    setTogglingExempt(true);
    setExemptError(null);
    const vmid = selectedGuestDetails.vmid;
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

  return (
    <div className={`${MODAL_OVERLAY} !items-end sm:!items-center z-[60]`} onClick={() => setSelectedGuestDetails(null)}>
      <div className={`${MODAL_CONTAINER.replace('max-w-md', 'max-w-3xl')} !p-0 !rounded-t-xl sm:!rounded-2xl !max-h-[85vh] sm:!max-h-[90vh] flex flex-col !overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-pb-border dark:border-slate-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${isVM ? 'bg-purple-500' : 'bg-green-500'}`}>
              {isVM ? <HardDrive size={20} className="text-white" /> : <Package size={20} className="text-white" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-pb-text dark:text-white truncate">
                {selectedGuestDetails.name || `Guest ${selectedGuestDetails.vmid}`}
              </h3>
              <p className="text-xs text-pb-text2 dark:text-gray-400">
                {isVM ? 'VM' : 'CT'} #{selectedGuestDetails.vmid}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedGuestDetails(null)}
            className="ml-2 shrink-0 p-1.5 rounded-lg text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 hover:bg-pb-surface2 dark:hover:bg-gray-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto">
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-pb-border dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                selectedGuestDetails.status === 'running' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                'bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-300'
              }`}>
                {selectedGuestDetails.status === 'running' ? <Activity size={12} /> : <AlertCircle size={12} />}
                {selectedGuestDetails.status}
              </div>
              <span className="text-xs text-pb-text2 dark:text-gray-400">on</span>
              <span className="text-xs font-medium text-pb-text dark:text-white">{hostNode}</span>
            </div>
          </div>

          {/* Resource Usage - Compact 2-Column Grid */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* CPU */}
            <div className="bg-gradient-to-br from-blue-900/20 to-blue-800/20 rounded p-2 border border-blue-200 dark:border-blue-800">
              <div className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium mb-0.5">CPU</div>
              <div className="text-xl font-bold text-pb-text dark:text-white">{(selectedGuestDetails.cpu_current || 0).toFixed(1)}%</div>
              <div className="text-[10px] text-pb-text2 dark:text-gray-400">{selectedGuestDetails.cpu_cores || 0} cores</div>
            </div>

            {/* Memory */}
            <div className="bg-gradient-to-br from-purple-900/20 to-purple-800/20 rounded p-2 border border-purple-200 dark:border-purple-800">
              <div className="text-[10px] uppercase tracking-wide text-purple-600 dark:text-purple-400 font-medium mb-0.5">Memory</div>
              <div className="text-xl font-bold text-pb-text dark:text-white">
                {selectedGuestDetails.mem_max_gb > 0 ? ((selectedGuestDetails.mem_used_gb / selectedGuestDetails.mem_max_gb) * 100).toFixed(1) : 0}%
              </div>
              <div className="text-[10px] text-pb-text2 dark:text-gray-400">
                {(selectedGuestDetails.mem_used_gb || 0).toFixed(1)} / {(selectedGuestDetails.mem_max_gb || 0).toFixed(1)} GB
              </div>
            </div>
          </div>

          {/* I/O Metrics - Compact 2-Column */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* Disk I/O (Read/Write Stacked) */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-200 dark:border-green-800">
              <div className="text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400 font-medium mb-1">Disk I/O</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-pb-text2 dark:text-gray-400">Read</span>
                  <span className="text-sm font-bold text-pb-text dark:text-white">
                    {((selectedGuestDetails.disk_read_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-pb-text2 dark:text-gray-400">Write</span>
                  <span className="text-sm font-bold text-pb-text dark:text-white">
                    {((selectedGuestDetails.disk_write_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                </div>
              </div>
            </div>

            {/* Network I/O (In/Out Stacked) */}
            <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded p-2 border border-cyan-200 dark:border-cyan-800">
              <div className="text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400 font-medium mb-1">Network I/O</div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-pb-text2 dark:text-gray-400">In</span>
                  <span className="text-sm font-bold text-pb-text dark:text-white">
                    {((selectedGuestDetails.net_in_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-pb-text2 dark:text-gray-400">Out</span>
                  <span className="text-sm font-bold text-pb-text dark:text-white">
                    {((selectedGuestDetails.net_out_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Where this guest could go, ranked (auto-loaded) */}
          <MoveToTargets
            opts={moveOpts}
            loading={loadingGuestOptions}
            failed={optsFailed}
            onRetry={loadOptions}
            canMigrate={canMigrate && !!setConfirmMigration}
            hostNode={hostNode}
            onMove={migrateTo}
          />

          {/* Usage history (real time-series) */}
          <Section title="Usage (24h)" isOpen={openSec.usage} onToggle={() => toggleSec('usage')}>
            {loadingHistory ? (
              <div className="flex items-center justify-center py-6 text-xs text-pb-text2 dark:text-gray-400"><RefreshCw size={14} className="animate-spin mr-2" /> Loading history…</div>
            ) : (
              <div className="bg-pb-surface2 dark:bg-slate-800/60 rounded-lg p-2">
                <MiniTrendChart
                  points={history || []}
                  series={[
                    { key: 'cpu', label: 'CPU', color: '#3b82f6' },
                    { key: 'mem', label: 'Mem', color: '#a855f7' },
                  ]}
                />
              </div>
            )}
          </Section>

          {/* Workload profile + affinity */}
          {(profile || affinityGroups.length > 0 || excludeGroups.length > 0) && (
            <Section title="Profile & Affinity" isOpen={openSec.profile} onToggle={() => toggleSec('profile')}>
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {profile && (() => {
                  const meta = BEHAVIOR_META[profile.behavior] || BEHAVIOR_META.unknown;
                  return (
                    <span className={`px-2 py-0.5 rounded font-medium ${meta.cls}`} title={`Confidence: ${profile.confidence} · ${profile.data_points} samples · peak ${profile.peak_multiplier?.toFixed(1)}×`}>
                      {meta.label}{profile.confidence && profile.confidence !== 'low' ? '' : ' (low confidence)'}
                    </span>
                  );
                })()}
                {profile && profile.peak_multiplier > 1.5 && (
                  <span className="text-pb-text2 dark:text-gray-400">peak {profile.peak_multiplier.toFixed(1)}× avg</span>
                )}
                {affinityGroups.map(g => (
                  <span key={`a-${g}`} className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" title="Affinity group — keep together">↔ {g}</span>
                ))}
                {excludeGroups.map(g => (
                  <span key={`x-${g}`} className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300" title="Anti-affinity group — keep apart">⊗ {g}</span>
                ))}
                {!profile && <span className="text-pb-text2 dark:text-gray-500 italic">No behavior profile yet</span>}
              </div>
            </Section>
          )}

          {/* IOWait scoring exemption */}
          <Section title="IOWait scoring" isOpen={openSec.iowait} onToggle={() => toggleSec('iowait')}>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                {isPassthroughExempt ? (
                  <p className="text-xs text-pb-text2 dark:text-gray-400">
                    Auto-exempt — this guest has passthrough disks, so its host IOWait is excluded from node scoring.
                  </p>
                ) : (
                  <p className="text-xs text-pb-text2 dark:text-gray-400">
                    {hasExemptTag
                      ? "Exempt — this guest's IOWait is excluded from its node's health score."
                      : "Counted — exempt this if the guest's I/O is on dedicated/passthrough storage migration can't relieve."}
                  </p>
                )}
              </div>
              <button
                onClick={toggleIoExempt}
                disabled={togglingExempt || isPassthroughExempt}
                title={isPassthroughExempt ? 'Already exempt via passthrough disks' : 'Toggle the io_exempt tag'}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  (hasExemptTag || isPassthroughExempt)
                    ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                    : 'bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-300 hover:bg-pb-surface3 dark:hover:bg-gray-600'
                } ${(togglingExempt || isPassthroughExempt) ? 'opacity-60 cursor-not-allowed' : ''}`}
              >
                {togglingExempt ? '…' : (hasExemptTag || isPassthroughExempt) ? 'IOWait exempt ✓' : 'Exempt from IOWait'}
              </button>
            </div>
            {exemptError && <p className="mt-2 text-xs text-red-600 dark:text-red-400">{exemptError}</p>}
          </Section>

          {/* Tags */}
          {selectedGuestDetails.tags && selectedGuestDetails.tags.all_tags && selectedGuestDetails.tags.all_tags.length > 0 && (
            <Section title="Tags" badge={<span className="text-xs font-normal text-pb-text2 dark:text-gray-400">{selectedGuestDetails.tags.all_tags.length}</span>} isOpen={openSec.tags} onToggle={() => toggleSec('tags')}>
              <div className="flex flex-wrap gap-1.5">
                {selectedGuestDetails.tags.all_tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </Section>
          )}

          {/* Mount Points (Containers only) */}
          {selectedGuestDetails.type === 'CT' && selectedGuestDetails.mount_points && selectedGuestDetails.mount_points.has_mount_points && (
            <Section
              title={<><Folder size={16} className={selectedGuestDetails.mount_points.has_unshared_bind_mount ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'} /> Mount Points</>}
              badge={<span className="text-xs font-normal text-pb-text2 dark:text-gray-400">{selectedGuestDetails.mount_points.mount_count}</span>}
              isOpen={openSec.mounts}
              onToggle={() => toggleSec('mounts')}
            >
              {/* Mount Points List */}
              <div className="space-y-2">
                {selectedGuestDetails.mount_points.mount_points && selectedGuestDetails.mount_points.mount_points.map((mp, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${
                    mp.is_bind_mount && !mp.is_shared
                      ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                      : mp.is_bind_mount && mp.is_shared
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-pb-text dark:text-white">
                            {mp.mount_path}
                          </span>
                          {mp.is_bind_mount && mp.is_shared && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                              SHARED
                            </span>
                          )}
                          {mp.is_bind_mount && !mp.is_shared && (
                            <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">
                              UNSHARED
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-pb-text2 dark:text-gray-400">
                          <span className="font-medium">Source:</span> <span className="font-mono">{mp.source}</span>
                        </div>
                        <div className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
                          <span className="font-medium">Type:</span> {mp.is_bind_mount ? 'Bind Mount' : 'Storage Mount'}
                        </div>
                      </div>
                    </div>
                    {mp.is_bind_mount && !mp.is_shared && (
                      <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                        <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                          ⚠️ Migration requires --restart --force and manual path verification on target node
                        </p>
                      </div>
                    )}
                    {mp.is_bind_mount && mp.is_shared && (
                      <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                        <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                          ✓ Can be migrated (ensure path exists on target node)
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Migration Warning/Info */}
              {selectedGuestDetails.mount_points.has_unshared_bind_mount ? (
                <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-orange-800 dark:text-orange-200">
                      <p className="font-semibold mb-1">Manual Migration Required</p>
                      <p>This container has unshared bind mounts that require manual intervention. Use <span className="font-mono bg-orange-100 dark:bg-orange-800 px-1">pct migrate {selectedGuestDetails.vmid} &lt;target&gt; --restart --force</span> and verify paths exist on target node.</p>
                    </div>
                  </div>
                </div>
              ) : selectedGuestDetails.mount_points.has_shared_mount ? (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-green-800 dark:text-green-200">
                      <p className="font-semibold mb-1">Safe to Migrate</p>
                      <p>All bind mounts are marked as shared. Ensure these paths exist on the target node before migration.</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </Section>
          )}

          {/* Local/Pinned Disks (VMs and CTs) */}
          {selectedGuestDetails.local_disks && selectedGuestDetails.local_disks.is_pinned && (
            <Section
              title={<><AlertTriangle size={16} className="text-red-600 dark:text-red-400" /> Cannot Migrate — {selectedGuestDetails.local_disks.pinned_reason}</>}
              isOpen={openSec.passthrough}
              onToggle={() => toggleSec('passthrough')}
            >
              {/* Passthrough Disks */}
              {selectedGuestDetails.local_disks.passthrough_disks && selectedGuestDetails.local_disks.passthrough_disks.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-semibold text-pb-text dark:text-gray-300 mb-2">
                    Passthrough Disks ({selectedGuestDetails.local_disks.passthrough_count})
                  </h5>
                  <div className="space-y-2">
                    {selectedGuestDetails.local_disks.passthrough_disks.map((disk, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold text-pb-text dark:text-white">
                                {disk.key}
                              </span>
                              <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                                HARDWARE PASSTHROUGH
                              </span>
                            </div>
                            <div className="text-xs text-pb-text2 dark:text-gray-400">
                              <span className="font-medium">Device:</span> <span className="font-mono text-[11px]">{disk.device}</span>
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                          <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                            ⚠️ This disk is physically attached to the current node's hardware. Cannot be migrated.
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Summary Warning */}
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800 dark:text-red-200">
                    <p className="font-semibold mb-1">Migration Blocked</p>
                    <p>This {isVM ? 'VM' : 'container'} has {selectedGuestDetails.local_disks.total_pinned_disks} disk(s) that prevent automatic migration. Manual intervention required.</p>
                  </div>
                </div>
              </div>
            </Section>
          )}

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-pb-border dark:border-slate-700 shrink-0">
          <button
            onClick={() => setSelectedGuestDetails(null)}
            className={BTN_SECONDARY}
          >
            <X size={14} /> Close
          </button>
          {canMigrate && bestTarget && setConfirmMigration ? (
            <button onClick={() => migrateTo(bestTarget)} className={BTN_PRIMARY}>
              <MoveRight size={16} /> Move to {bestTarget.node}
            </button>
          ) : canMigrate && !loadingGuestOptions && (
            <button
              onClick={() => {
                setSelectedGuest({ ...selectedGuestDetails, currentNode: hostNode });
                setMigrationTarget('');
                setShowMigrationDialog(true);
                setSelectedGuestDetails(null);
              }}
              className={BTN_SECONDARY}
            >
              <MoveRight size={16} /> Migrate…
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
