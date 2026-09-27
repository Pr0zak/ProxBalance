import { X, Check, XCircle, AlertTriangle, MoveRight } from '../Icons.jsx';
import {
  MODAL_OVERLAY, MODAL_CONTAINER, INNER_CARD, SELECT_FIELD, PROGRESS_BAR_BG,
  BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, metricColor, metricTextColor
} from '../../utils/designTokens.js';

// Load past this on a target after the plan runs is flagged red.
const TIGHT_PCT = 85;

// Storage IDs a guest needs that the target node does not have active, from the
// collector's per-node storage list. Empty when unknown (no storage data), so we
// only warn when we are sure. The executor fails such a guest rather than
// sending it somewhere else.
function missingStorage(item, target, data) {
  const vols = item.storage_volumes || [];
  const node = data && data.nodes && data.nodes[target];
  if (!vols.length || !node || !Array.isArray(node.storage) || node.storage.length === 0) return [];
  const have = new Set(node.storage.filter(s => s.active !== false).map(s => s.storage));
  return vols.filter(v => !have.has(v));
}

const { useState, useEffect } = React;

// Project each target node's load after the plan runs, from the live cluster data
// and the operator's current per-guest target/action choices.
function projectLanding(plan, targets, actionFor, targetFor, data) {
  const nodes = (data && data.nodes) || {};
  const guests = (data && data.guests) || {};
  const out = {};
  targets.forEach(t => {
    const n = nodes[t] || {};
    const totalGb = n.total_mem_gb || 0;
    out[t] = {
      node: t, count: 0, allocGb: 0, restarts: 0,
      memNow: n.mem_percent || 0, memAfter: n.mem_percent || 0,
      cpuNow: n.cpu_percent || 0, cpuAfter: n.cpu_percent || 0,
      _usedGb: totalGb * (n.mem_percent || 0) / 100, _totalGb: totalGb, _cores: n.cpu_cores || 1,
    };
  });
  plan.forEach(item => {
    if (item.skipped || actionFor(item) !== 'migrate') return;
    const t = out[targetFor(item)];
    if (!t) return;
    const g = guests[String(item.vmid)] || {};
    t.count += 1;
    t.allocGb += g.mem_max_gb || 0;
    if (item.will_restart) t.restarts += 1;
    if (item.status === 'running') {
      t._usedGb += g.mem_used_gb || 0;
      t.cpuAfter += ((g.cpu_current || 0) / 100) * (g.cpu_cores || 1) / t._cores * 100;
    }
  });
  Object.values(out).forEach(t => {
    if (t._totalGb > 0) t.memAfter = (t._usedGb / t._totalGb) * 100;
  });
  return Object.values(out);
}

function LandingCard({ t }) {
  const tight = t.memAfter > TIGHT_PCT || t.cpuAfter > TIGHT_PCT;
  return (
    <div className={`${INNER_CARD} !p-3 ${tight ? '!border-red-400 dark:!border-red-500/60' : ''}`}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-semibold text-sm text-pb-text dark:text-white">{t.node}</span>
        <span className="text-[11px] text-pb-text2 dark:text-gray-400 tabular-nums">
          {t.count === 0 ? 'nothing lands here' : `+${t.count} guest${t.count !== 1 ? 's' : ''} · +${t.allocGb.toFixed(0)} GB alloc`}
        </span>
      </div>
      {[['RAM', t.memNow, t.memAfter], ['CPU', t.cpuNow, t.cpuAfter]].map(([label, now, after]) => (
        <div key={label} className="mt-2">
          <div className="flex items-center justify-between text-[11px] tabular-nums mb-0.5">
            <span className="text-pb-text2 dark:text-gray-400">{label}</span>
            <span className="text-pb-text2 dark:text-gray-400">
              {now.toFixed(0)}% → <span className={`font-semibold ${after > TIGHT_PCT ? 'text-red-600 dark:text-red-400' : metricTextColor(after)}`}>{after.toFixed(0)}%</span>
            </span>
          </div>
          <div className={`${PROGRESS_BAR_BG} flex`}>
            <div className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${Math.min(100, now)}%` }} />
            <div className={`h-full ${after > TIGHT_PCT ? 'bg-red-500' : metricColor(after)}`} style={{ width: `${Math.max(0, Math.min(100, after) - Math.min(100, now))}%` }} />
          </div>
        </div>
      ))}
      {tight && <div className="mt-1.5 text-[11px] font-medium text-red-600 dark:text-red-400">Over {TIGHT_PCT}% after the move — send some guests elsewhere</div>}
    </div>
  );
}

export default function EvacuationModals({
  evacuationPlan, setEvacuationPlan,
  planNode, setPlanNode,
  guestTargets, setGuestTargets,
  guestActions, setGuestActions,
  showConfirmModal, setShowConfirmModal,
  setEvacuatingNodes,
  maintenanceNodes,
  fetchGuestLocations,
  setError,
  data,
  API_BASE
}) {
  // Plan-stage toggle. By default stopped guests are ignored — no point streaming
  // cold disks during a routine load-rebalance. Enable to fold them in, e.g. when
  // evacuating a node for maintenance/upgrade where the disks must move off before
  // a reboot.
  const [includeStopped, setIncludeStopped] = useState(false);

  // Reset per plan so choices for one node don't silently carry to the next. Keyed on
  // source_node, so it fires both when a new plan opens and when the modal closes
  // (source_node → null) — covering the X/overlay close paths that miss guestActions.
  useEffect(() => {
    setIncludeStopped(false);
    setGuestActions({});
  }, [evacuationPlan && evacuationPlan.source_node]);

  const defaultActionFor = (item) =>
    (item.status === 'stopped' && !includeStopped) ? 'ignore' : 'migrate';

  const stoppedCount = evacuationPlan
    ? evacuationPlan.plan.filter(p => !p.skipped && p.status === 'stopped').length
    : 0;

  const actionFor = (item) => guestActions[item.vmid] || defaultActionFor(item);
  const targetFor = (item) => guestTargets[item.vmid] || item.target;
  const landing = evacuationPlan
    ? projectLanding(evacuationPlan.plan, evacuationPlan.available_targets || [], actionFor, targetFor, data)
    : [];
  const movingItems = evacuationPlan ? evacuationPlan.plan.filter(p => !p.skipped && actionFor(p) === 'migrate') : [];
  const restartCount = movingItems.filter(p => p.will_restart).length;
  const ignoredCount = evacuationPlan ? evacuationPlan.plan.filter(p => !p.skipped && actionFor(p) === 'ignore').length : 0;
  const bulkTarget = (() => {
    const ts = new Set(movingItems.map(targetFor));
    const overridden = movingItems.some(p => guestTargets[p.vmid]);
    return !overridden ? '' : ts.size === 1 ? [...ts][0] : '__mixed';
  })();
  const storageProblems = movingItems
    .map(item => ({ item, target: targetFor(item), missing: missingStorage(item, targetFor(item), data) }))
    .filter(p => p.missing.length > 0);
  const tightTargets = landing.filter(t => t.count > 0 && (t.memAfter > TIGHT_PCT || t.cpuAfter > TIGHT_PCT));
  const closePlan = () => {
    setEvacuationPlan(null);
    setPlanNode(null);
    setGuestActions({});
    setGuestTargets({});
  };
  const setAllTargets = (target) => {
    if (!target) { setGuestTargets({}); return; }
    const next = {};
    evacuationPlan.plan.forEach(item => { if (!item.skipped) next[item.vmid] = target; });
    setGuestTargets(next);
  };

  return (
    <>
      {/* Global Evacuation Plan Modal */}
      {evacuationPlan && planNode && (
        <div className={MODAL_OVERLAY} onClick={closePlan}>
          <div className={MODAL_CONTAINER.replace('max-w-md', 'max-w-4xl').replace('overflow-y-auto', 'overflow-hidden')} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-pb-text dark:text-white">
                Evacuation Plan for {evacuationPlan.source_node}
              </h3>
              <button
                onClick={closePlan}
                className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {/* Where it lands: projected load per target, live with the choices below */}
              <div className="mb-4">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="text-sm text-pb-text dark:text-gray-200">
                    <span className="font-semibold">{movingItems.length}</span> to migrate
                    {ignoredCount > 0 && <> · <span className="font-semibold">{ignoredCount}</span> left in place</>}
                    {evacuationPlan.will_skip > 0 && <> · <span className="font-semibold text-yellow-600 dark:text-yellow-400">{evacuationPlan.will_skip}</span> can't move</>}
                    {restartCount > 0 && <> · <span className="font-semibold text-orange-600 dark:text-orange-400">{restartCount}</span> will restart</>}
                  </div>
                  <label className="flex items-center gap-2 text-xs text-pb-text2 dark:text-gray-400">
                    Send all to
                    <select value={bulkTarget} onChange={(e) => setAllTargets(e.target.value)} className={`${SELECT_FIELD} !py-1 !text-xs`}>
                      <option value="">Auto (spread)</option>
                      {bulkTarget === '__mixed' && <option value="__mixed" disabled>Mixed</option>}
                      {evacuationPlan.available_targets.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </label>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {landing.map(t => <LandingCard key={t.node} t={t} />)}
                </div>
                {(storageProblems.length > 0 || tightTargets.length > 0) && (
                  <ul className="mt-2 space-y-0.5 text-xs text-red-600 dark:text-red-400">
                    {storageProblems.length > 0 && (
                      <li className="flex items-start gap-1.5">
                        <AlertTriangle size={13} className="shrink-0 mt-px" />
                        <span>
                          {storageProblems.length === 1 ? '1 guest is' : `${storageProblems.length} guests are`} sent to a node without its storage
                          ({storageProblems.map(p => `${p.item.vmid} → ${p.target}`).join(', ')}) and will fail instead of moving.
                        </span>
                      </li>
                    )}
                    {tightTargets.length > 0 && (
                      <li className="flex items-start gap-1.5">
                        <AlertTriangle size={13} className="shrink-0 mt-px" />
                        <span>{tightTargets.map(t => t.node).join(', ')} would be over {TIGHT_PCT}% after the move.</span>
                      </li>
                    )}
                  </ul>
                )}
              </div>

              {evacuationPlan.will_skip > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="font-semibold">{evacuationPlan.will_skip}</span> guest(s) cannot be migrated. Reasons may include: missing storage on target nodes, errors, or "ignore" tag. These are shown in yellow below.
                  </p>
                </div>
              )}

              {stoppedCount > 0 && (
                <div className="mb-4 p-3 bg-pb-surface2 dark:bg-slate-700/40 border border-pb-border dark:border-slate-700 rounded flex flex-wrap items-center gap-x-2 gap-y-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-pb-text dark:text-gray-200">
                    <input
                      type="checkbox"
                      checked={includeStopped}
                      onChange={(e) => setIncludeStopped(e.target.checked)}
                      className="w-4 h-4"
                    />
                    Include {stoppedCount} stopped guest{stoppedCount !== 1 ? 's' : ''} in the migration
                  </label>
                  <span className="text-xs text-pb-text2 dark:text-gray-400">
                    Off by default — stopped guests are ignored so their cold disks aren't streamed. Enable for maintenance/upgrade evacuations where the disks must move off the node.
                  </span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-pb-surface2 dark:bg-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">VM/CT</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">Storage</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">Target</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">Will Restart?</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-pb-text dark:text-gray-300 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {evacuationPlan.plan.map((item) => (
                      <tr key={item.vmid} className={item.skipped ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                        <td className="px-4 py-3 font-medium text-pb-text dark:text-white">{item.vmid}</td>
                        <td className="px-4 py-3 text-pb-text dark:text-gray-300">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.type === 'qemu' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' :
                            item.type === 'lxc' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' :
                            'bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-300'
                          }`}>
                            {item.type === 'qemu' ? 'VM' : item.type === 'lxc' ? 'CT' : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.storage_volumes && item.storage_volumes.length > 0 ? (
                            <span className={`text-xs ${!item.storage_compatible ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-pb-text2 dark:text-gray-400'}`}>
                              {item.storage_volumes.join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-pb-text2 dark:text-gray-500 italic">none</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded ${
                            item.status === 'running' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                            item.status === 'stopped' ? 'bg-pb-surface2 dark:bg-gray-700 text-pb-text dark:text-gray-300' :
                            'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {item.skipped ? (
                            <span className="text-yellow-600 dark:text-yellow-400 text-xs italic">{item.skip_reason}</span>
                          ) : (
                            <>
                              <select
                                value={targetFor(item)}
                                onChange={(e) => setGuestTargets({...guestTargets, [item.vmid]: e.target.value})}
                                className={`${SELECT_FIELD} !py-1 !text-sm font-medium`}
                                aria-label={`Target node for ${item.name || item.vmid}`}
                              >
                                {evacuationPlan.available_targets.map(target => (
                                  <option key={target} value={target}>
                                    {target}{missingStorage(item, target, data).length ? ' (no storage)' : ''}
                                  </option>
                                ))}
                              </select>
                              {actionFor(item) === 'migrate' && missingStorage(item, targetFor(item), data).length > 0 && (
                                <div className="mt-1 text-[11px] text-red-600 dark:text-red-400">
                                  missing {missingStorage(item, targetFor(item), data).join(', ')}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!item.skipped && (
                            item.will_restart ? (
                              <span className="text-orange-600 dark:text-orange-400 font-medium">Yes</span>
                            ) : (
                              <span className="text-green-600 dark:text-green-400">No</span>
                            )
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {item.skipped ? (
                            <span className="text-xs text-pb-text2 dark:text-gray-500 italic">N/A</span>
                          ) : (
                            <select
                              value={guestActions[item.vmid] || defaultActionFor(item)}
                              onChange={(e) => setGuestActions({...guestActions, [item.vmid]: e.target.value})}
                              className={`${SELECT_FIELD} !py-1 !text-sm`}
                              aria-label={`Action for ${item.name || item.vmid}`}
                            >
                              <option value="migrate">Migrate</option>
                              <option value="ignore">Ignore</option>
                              <option value="poweroff">Power Off</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                <h4 className="font-semibold text-blue-100 mb-2">Important Notes:</h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                  <li>Running VMs will use live migration (no downtime)</li>
                  <li>Running containers will restart during migration (brief downtime)</li>
                  <li>Stopped guests are <span className="font-semibold">ignored by default</span> — tick "Include stopped guests" above to move their disks too (recommended for maintenance/upgrade evacuations)</li>
                  <li>Migrations are performed one at a time to avoid overloading hosts</li>
                  <li>Available target nodes: {evacuationPlan.available_targets.join(', ')}</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-4 sm:p-6 border-t border-pb-border dark:border-slate-700">
              <button onClick={closePlan} className={`${BTN_SECONDARY} flex-1 sm:flex-none justify-center`}>
                <X size={16} /> Cancel
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                disabled={movingItems.length === 0 && !evacuationPlan.plan.some(p => !p.skipped && actionFor(p) === 'poweroff')}
                className={`${BTN_PRIMARY} flex-1 sm:flex-none justify-center`}
              >
                <Check size={16} /> Review & confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Confirmation Modal: exactly what will be sent, grouped by target */}
      {showConfirmModal && evacuationPlan && planNode && (() => {
        const toMigrate = [];
        const toIgnore = [];
        const toPowerOff = [];
        evacuationPlan.plan.forEach(item => {
          if (item.skipped) return;
          const action = actionFor(item);
          if (action === 'migrate') toMigrate.push(item);
          else if (action === 'ignore') toIgnore.push(item);
          else if (action === 'poweroff') toPowerOff.push(item);
        });
        const byTarget = {};
        toMigrate.forEach(item => { (byTarget[targetFor(item)] = byTarget[targetFor(item)] || []).push(item); });
        const landingFor = Object.fromEntries(landing.map(t => [t.node, t]));

        const startEvacuation = async () => {
          setShowConfirmModal(false);
          setEvacuatingNodes(prev => new Set([...prev, planNode]));

          // Send every choice explicitly. The backend's fallback for an unlisted
          // guest is 'migrate' to an auto-picked node, which would move stopped
          // guests we mean to ignore and could land guests somewhere other than
          // the target shown here.
          const finalActions = {};
          const finalTargets = {};
          evacuationPlan.plan.forEach(item => {
            if (item.skipped) return;
            finalActions[item.vmid] = actionFor(item);
            if (finalActions[item.vmid] === 'migrate' && targetFor(item)) finalTargets[item.vmid] = targetFor(item);
          });

          try {
            const response = await fetch(`${API_BASE}/nodes/evacuate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                node: planNode,
                maintenance_nodes: Array.from(maintenanceNodes),
                confirm: true,
                guest_actions: finalActions,
                guest_targets: finalTargets
              })
            });
            const result = await response.json();
            if (result.success) {
              closePlan();
              fetchGuestLocations(); // evacuation tracking provides visual feedback
            } else {
              throw new Error(result.error || 'Failed to start evacuation');
            }
          } catch (error) {
            console.error('Evacuation error:', error);
            setError(`Evacuation of ${planNode} did not start: ${error.message}`);
          } finally {
            setEvacuatingNodes(prev => {
              const next = new Set(prev);
              next.delete(planNode);
              return next;
            });
          }
        };

        return (
          <div className={MODAL_OVERLAY} onClick={() => setShowConfirmModal(false)}>
            <div className={`${MODAL_CONTAINER.replace('max-w-md', 'max-w-2xl')} !p-0 flex flex-col !overflow-hidden`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700 shrink-0">
                <h3 className="text-lg sm:text-xl font-semibold text-pb-text dark:text-white">Confirm evacuation of {planNode}</h3>
                <button onClick={() => setShowConfirmModal(false)} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200">
                  <XCircle size={24} />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-3">
                <p className="text-sm text-pb-text2 dark:text-gray-300">
                  Guests move one at a time to the node shown. If a node can't take a guest (for example it lacks the guest's storage), that guest fails and stays on {planNode}; it is not sent anywhere else.
                </p>

                {Object.keys(byTarget).sort().map(target => {
                  const t = landingFor[target];
                  const tight = t && (t.memAfter > TIGHT_PCT || t.cpuAfter > TIGHT_PCT);
                  return (
                    <div key={target} className={`${INNER_CARD} !p-3 ${tight ? '!border-red-400 dark:!border-red-500/60' : ''}`}>
                      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1.5">
                        <span className="text-sm font-semibold text-pb-text dark:text-white flex items-center gap-1.5">
                          <MoveRight size={14} className="text-blue-600 dark:text-blue-400" /> {target}
                          <span className="font-normal text-pb-text2 dark:text-gray-400">· {byTarget[target].length} guest{byTarget[target].length !== 1 ? 's' : ''}</span>
                        </span>
                        {t && (
                          <span className={`text-[11px] tabular-nums ${tight ? 'text-red-600 dark:text-red-400 font-medium' : 'text-pb-text2 dark:text-gray-400'}`}>
                            RAM {t.memNow.toFixed(0)}% → {t.memAfter.toFixed(0)}% · CPU {t.cpuNow.toFixed(0)}% → {t.cpuAfter.toFixed(0)}%
                          </span>
                        )}
                      </div>
                      <ul className="space-y-0.5 text-xs">
                        {byTarget[target].map(item => {
                          const missing = missingStorage(item, target, data);
                          return (
                            <li key={item.vmid} className="flex flex-wrap items-baseline gap-x-2 text-pb-text dark:text-gray-200">
                              <span className="font-mono text-pb-text2 dark:text-gray-400">{item.vmid}</span>
                              <span className="truncate">{item.name}</span>
                              {item.will_restart && <span className="text-orange-600 dark:text-orange-400">restarts</span>}
                              {missing.length > 0 && <span className="text-red-600 dark:text-red-400">will fail: missing {missing.join(', ')}</span>}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}

                {toPowerOff.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-1">Power off ({toPowerOff.length})</h4>
                    <div className="text-xs text-pb-text2 dark:text-gray-400">{toPowerOff.map(item => `${item.vmid} ${item.name || ''}`.trim()).join(', ')}</div>
                  </div>
                )}
                {toIgnore.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-pb-text2 dark:text-gray-400 mb-1">Left on {planNode} ({toIgnore.length})</h4>
                    <div className="text-xs text-pb-text2 dark:text-gray-400">{toIgnore.map(item => `${item.vmid} ${item.name || ''}`.trim()).join(', ')}</div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-pb-border dark:border-slate-700 shrink-0">
                <button onClick={() => setShowConfirmModal(false)} className={`${BTN_SECONDARY} flex-1 sm:flex-none justify-center`}>
                  Back
                </button>
                <button onClick={startEvacuation} className={`${BTN_DANGER} flex-1 sm:flex-none justify-center`}>
                  <AlertTriangle size={14} /> Start evacuation
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
