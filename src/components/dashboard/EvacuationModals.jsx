import { X, Check, XCircle, AlertTriangle } from '../Icons.jsx';
import { MODAL_OVERLAY, MODAL_CONTAINER } from '../../utils/designTokens.js';

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
  API_BASE
}) {
  return (
    <>
      {/* Global Evacuation Plan Modal */}
      {evacuationPlan && planNode && (
        <div className={MODAL_OVERLAY} onClick={() => {
          setEvacuationPlan(null);
          setPlanNode(null);
          setGuestTargets({});
        }}>
          <div className={MODAL_CONTAINER.replace('max-w-md', 'max-w-4xl').replace('overflow-y-auto', 'overflow-hidden')} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700">
              <h3 className="text-lg sm:text-xl font-bold text-pb-text dark:text-white">
                Evacuation Plan for {evacuationPlan.source_node}
              </h3>
              <button
                onClick={() => {
                  setEvacuationPlan(null);
                  setPlanNode(null);
                  setGuestTargets({});
                }}
                className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
                aria-label="Close"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {evacuationPlan.will_skip > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    <span className="font-semibold">{evacuationPlan.will_skip}</span> guest(s) cannot be migrated. Reasons may include: missing storage on target nodes, errors, or "ignore" tag. These are shown in yellow below.
                  </p>
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
                            <select
                              value={guestTargets[item.vmid] || item.target}
                              onChange={(e) => setGuestTargets({...guestTargets, [item.vmid]: e.target.value})}
                              className="text-sm px-2 py-1 border rounded bg-pb-surface2 dark:bg-gray-700 border-gray-600 text-pb-text dark:text-white font-medium"
                            >
                              {evacuationPlan.available_targets.map(target => (
                                <option key={target} value={target}>{target}</option>
                              ))}
                            </select>
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
                              value={guestActions[item.vmid] || 'migrate'}
                              onChange={(e) => setGuestActions({...guestActions, [item.vmid]: e.target.value})}
                              className="text-sm px-2 py-1 border rounded bg-pb-surface2 dark:bg-gray-700 border-gray-600 text-pb-text dark:text-white"
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
                  <li>Stopped VMs/CTs will be moved without starting</li>
                  <li>Migrations are performed one at a time to avoid overloading hosts</li>
                  <li>Available target nodes: {evacuationPlan.available_targets.join(', ')}</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-pb-border dark:border-slate-700">
              <button
                onClick={() => {
                  setEvacuationPlan(null);
                  setPlanNode(null);
                  setGuestActions({});
                  setGuestTargets({});
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-pb-text dark:text-gray-300 bg-pb-surface2 dark:bg-gray-700 hover:bg-gray-600 rounded font-medium"
              >
                <X size={16} className="sm:hidden" /><span className="hidden sm:inline">Cancel</span>
              </button>
              <button
                onClick={() => setShowConfirmModal(true)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-100 dark:hover:bg-orange-700 text-white rounded font-medium"
              >
                <Check size={16} className="sm:hidden" /><span className="hidden sm:inline">Review & Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global Confirmation Modal */}
      {showConfirmModal && evacuationPlan && planNode && (
        <div className={MODAL_OVERLAY} onClick={() => setShowConfirmModal(false)}>
          <div className={MODAL_CONTAINER.replace('max-w-md', 'max-w-2xl')} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-pb-border dark:border-slate-700">
              <h3 className="text-lg sm:text-xl font-semibold text-pb-text dark:text-white">Confirm Evacuation</h3>
              <button onClick={() => setShowConfirmModal(false)} aria-label="Close">
                <XCircle size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6">
              {(() => {
                const toMigrate = [];
                const toIgnore = [];
                const toPowerOff = [];

                evacuationPlan.plan.forEach(item => {
                  if (item.skipped) return;
                  const action = guestActions[item.vmid] || 'migrate';
                  if (action === 'migrate') toMigrate.push(item);
                  else if (action === 'ignore') toIgnore.push(item);
                  else if (action === 'poweroff') toPowerOff.push(item);
                });

                return (
                  <div className="space-y-4">
                    {toMigrate.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-blue-600 mb-2">Migrate ({toMigrate.length})</h4>
                        <div className="space-y-2">
                          {toMigrate.map(item => (
                            <div key={item.vmid} className="flex justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                              <span>{item.vmid} - {item.name}</span>
                              <span>→ {item.target}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {toIgnore.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-pb-text2 dark:text-gray-600 mb-2">Ignore ({toIgnore.length})</h4>
                        <div className="text-sm text-pb-text2 dark:text-gray-600">
                          {toIgnore.map(item => item.vmid).join(', ')}
                        </div>
                      </div>
                    )}
                    {toPowerOff.length > 0 && (
                      <div>
                        <h4 className="text-lg font-semibold text-red-600 mb-2">Power Off ({toPowerOff.length})</h4>
                        <div className="text-sm text-pb-text2 dark:text-gray-600">
                          {toPowerOff.map(item => item.vmid).join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-pb-border dark:border-slate-700">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-pb-surface2 dark:bg-gray-700 rounded"
              >
                <X size={16} className="sm:hidden" /><span className="hidden sm:inline">Cancel</span>
              </button>
              <button
                onClick={async () => {
                  setShowConfirmModal(false);
                  setEvacuatingNodes(prev => new Set([...prev, planNode]));

                  try {
                    const response = await fetch(`${API_BASE}/nodes/evacuate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        node: planNode,
                        maintenance_nodes: Array.from(maintenanceNodes),
                        confirm: true,
                        guest_actions: guestActions,
                        guest_targets: guestTargets  // Include per-guest target overrides
                      })
                    });

                    const result = await response.json();
                    if (result.success) {
                      setEvacuationPlan(null);
                      setPlanNode(null);
                      setGuestActions({});
                      setGuestTargets({});  // Reset per-guest target overrides
                      // Success - evacuation tracking provides visual feedback
                      fetchGuestLocations(); // Refresh data
                    } else {
                      throw new Error(result.error || 'Failed to start evacuation');
                    }
                  } catch (error) {
                    console.error('Evacuation error:', error);
                    setError(`Error: ${error.message}`);
                  } finally {
                    setEvacuatingNodes(prev => {
                      const newSet = new Set(prev);
                      newSet.delete(planNode);
                      return newSet;
                    });
                  }
                }}
                className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-100 dark:hover:bg-red-700 text-white rounded"
              >
                <AlertTriangle size={14} /> Confirm Evacuation
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
