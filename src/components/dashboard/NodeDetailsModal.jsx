import {
  Server, X, Activity, CheckCircle, XCircle, AlertTriangle, MoveRight, Loader, Lock
} from '../Icons.jsx';

export default function NodeDetailsModal({
  selectedNode, setSelectedNode,
  maintenanceNodes, setMaintenanceNodes,
  canMigrate,
  evacuatingNodes, planningNodes, setPlanningNodes,
  setEvacuationPlan, setPlanNode,
  setError,
  nodeScores, penaltyConfig,
  generateSparkline,
  API_BASE,
  setGuestTargets
}) {
  if (!selectedNode) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4" onClick={() => setSelectedNode(null)}>
      <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header - sticky so close button is always reachable */}
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Server size={24} className={`shrink-0 ${maintenanceNodes.has(selectedNode.name) ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'}`} />
            <div className="min-w-0">
              <h3 className="text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate">{selectedNode.name}</h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Node Details</p>
            </div>
            {maintenanceNodes.has(selectedNode.name) && (
              <span className="hidden sm:inline px-2.5 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shrink-0">
                MAINTENANCE
              </span>
            )}
          </div>
          <button
            onClick={() => setSelectedNode(null)}
            className="ml-2 shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Body */}
        {/* Scrollable Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto">
          {/* Node Stats Grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Guests</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                {selectedNode.guests ? Object.keys(selectedNode.guests).length : 0}
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
              {/* Sparkline background */}
              <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-blue-600 dark:text-blue-400"
                  points={generateSparkline(selectedNode.cpu_percent || 0, 100, 40, 0.3)}
                />
              </svg>
              <div className="relative z-10">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">CPU Usage</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(selectedNode.cpu_percent || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{selectedNode.cpu_cores || 0} cores</div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
              {/* Sparkline background */}
              <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-purple-600 dark:text-purple-400"
                  points={generateSparkline(selectedNode.mem_percent || 0, 100, 40, 0.25)}
                />
              </svg>
              <div className="relative z-10">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Memory Usage</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(selectedNode.mem_percent || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{((selectedNode.mem_used || 0) / 1073741824).toFixed(1)} GB / {((selectedNode.mem_total || 0) / 1073741824).toFixed(1)} GB</div>
              </div>
            </div>
            <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
              {/* Sparkline background */}
              <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-orange-600 dark:text-orange-400"
                  points={generateSparkline(selectedNode.metrics?.current_iowait || 0, 100, 40, 0.35)}
                />
              </svg>
              <div className="relative z-10">
                <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">IOWait</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {(selectedNode.metrics?.current_iowait || 0).toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">I/O latency</div>
              </div>
            </div>
          </div>

          {/* Additional Node Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
              <div className={`text-lg font-semibold ${
                selectedNode.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
              }`}>
                {selectedNode.status || 'unknown'}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uptime</div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedNode.uptime ? Math.floor(selectedNode.uptime / 86400) + 'd' : 'N/A'}
              </div>
            </div>
          </div>

          {/* Migration Suitability Metrics */}
          {selectedNode.metrics && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={16} className="text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Migration Target Suitability</h4>
              </div>

              {/* Overall Score Display */}
              {nodeScores && nodeScores[selectedNode.name] && (
                <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-300 dark:border-blue-600">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suitability Rating</div>
                      <div className={`text-2xl font-bold ${
                        nodeScores[selectedNode.name].suitability_rating >= 70 ? 'text-green-600 dark:text-green-400' :
                        nodeScores[selectedNode.name].suitability_rating >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                        nodeScores[selectedNode.name].suitability_rating >= 30 ? 'text-orange-600 dark:text-orange-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {nodeScores[selectedNode.name].suitability_rating}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                        nodeScores[selectedNode.name].suitable
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                      }`}>
                        {nodeScores[selectedNode.name].suitable ? (
                          <><CheckCircle size={12} /> Suitable</>
                        ) : (
                          <><XCircle size={12} /> Not Suitable</>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {nodeScores[selectedNode.name].reason}
                      </div>
                    </div>
                  </div>

                  {/* Detailed Penalty Breakdown */}
                  {nodeScores[selectedNode.name].penalty_categories && (() => {
                    const cats = nodeScores[selectedNode.name].penalty_categories;
                    const total = cats.cpu + cats.memory + cats.iowait + cats.trends + cats.spikes;
                    if (total === 0) return (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-green-600 dark:text-green-400">No active penalties</div>
                      </div>
                    );
                    const segments = [
                      { key: 'cpu', value: cats.cpu, color: 'bg-red-500', textColor: 'text-red-600 dark:text-red-400', label: 'CPU' },
                      { key: 'memory', value: cats.memory, color: 'bg-blue-500', textColor: 'text-blue-600 dark:text-blue-400', label: 'Memory' },
                      { key: 'iowait', value: cats.iowait, color: 'bg-orange-500', textColor: 'text-orange-600 dark:text-orange-400', label: 'IOWait' },
                      { key: 'trends', value: cats.trends, color: 'bg-yellow-500', textColor: 'text-yellow-600 dark:text-yellow-400', label: 'Trends' },
                      { key: 'spikes', value: cats.spikes, color: 'bg-purple-500', textColor: 'text-purple-600 dark:text-purple-400', label: 'Spikes' },
                    ].filter(s => s.value > 0);
                    return (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1.5">Penalty Breakdown ({total} pts total)</div>
                        <div className="flex h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                          {segments.map(s => (
                            <div key={s.key} className={`${s.color} transition-all`} style={{ width: `${(s.value / total * 100)}%` }} title={`${s.label}: ${s.value} pts`} />
                          ))}
                        </div>
                        <div className="grid grid-cols-3 gap-1 mt-1.5">
                          {segments.map(s => (
                            <div key={s.key} className="flex items-center gap-1 text-[10px]">
                              <span className={`inline-block w-2 h-2 rounded-full ${s.color}`}></span>
                              <span className="text-gray-600 dark:text-gray-400">{s.label}</span>
                              <span className={`font-semibold ${s.textColor}`}>{s.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Weighted scoring used for recommendations: {penaltyConfig ? `${(penaltyConfig.weight_current * 100).toFixed(0)}% current, ${(penaltyConfig.weight_24h * 100).toFixed(0)}% 24h avg, ${(penaltyConfig.weight_7d * 100).toFixed(0)}% 7-day avg` : '50% current, 30% 24h avg, 20% 7-day avg'}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPU Score</div>
                  <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {(() => {
                      const current = selectedNode.cpu_percent || 0;
                      const short = selectedNode.metrics.avg_cpu || current;
                      const long = selectedNode.metrics.avg_cpu_week || short;
                      const wCurrent = penaltyConfig?.weight_current ?? 0.5;
                      const w24h = penaltyConfig?.weight_24h ?? 0.3;
                      const w7d = penaltyConfig?.weight_7d ?? 0.2;
                      return ((current * wCurrent) + (short * w24h) + (long * w7d)).toFixed(1);
                    })()}%
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Now: {(selectedNode.cpu_percent || 0).toFixed(1)}% | 24h: {(selectedNode.metrics.avg_cpu || 0).toFixed(1)}% | 7d: {(selectedNode.metrics.avg_cpu_week || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Memory Score</div>
                  <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                    {(() => {
                      const current = selectedNode.mem_percent || 0;
                      const short = selectedNode.metrics.avg_mem || current;
                      const long = selectedNode.metrics.avg_mem_week || short;
                      const wCurrent = penaltyConfig?.weight_current ?? 0.5;
                      const w24h = penaltyConfig?.weight_24h ?? 0.3;
                      const w7d = penaltyConfig?.weight_7d ?? 0.2;
                      return ((current * wCurrent) + (short * w24h) + (long * w7d)).toFixed(1);
                    })()}%
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Now: {(selectedNode.mem_percent || 0).toFixed(1)}% | 24h: {(selectedNode.metrics.avg_mem || 0).toFixed(1)}% | 7d: {(selectedNode.metrics.avg_mem_week || 0).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded p-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">IOWait Score</div>
                  <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    {(() => {
                      const current = selectedNode.metrics.current_iowait || 0;
                      const short = selectedNode.metrics.avg_iowait || current;
                      const long = selectedNode.metrics.avg_iowait_week || short;
                      const wCurrent = penaltyConfig?.weight_current ?? 0.5;
                      const w24h = penaltyConfig?.weight_24h ?? 0.3;
                      const w7d = penaltyConfig?.weight_7d ?? 0.2;
                      return ((current * wCurrent) + (short * w24h) + (long * w7d)).toFixed(1);
                    })()}%
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Now: {(selectedNode.metrics.current_iowait || 0).toFixed(1)}% | 24h: {(selectedNode.metrics.avg_iowait || 0).toFixed(1)}% | 7d: {(selectedNode.metrics.avg_iowait_week || 0).toFixed(1)}%
                  </div>
                </div>
              </div>
              <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
                Suitability Rating: 0-100% score showing how well the target node fits this VM (higher is better). Based on current load, sustained averages, and historical trends. <span className="text-green-600 dark:text-green-400 font-semibold">70%+</span> = Excellent, <span className="text-yellow-600 dark:text-yellow-400 font-semibold">50-69%</span> = Good, <span className="text-orange-600 dark:text-orange-400 font-semibold">30-49%</span> = Fair, <span className="text-red-600 dark:text-red-400 font-semibold">&lt;30%</span> = Poor.
              </div>
            </div>
          )}

          {/* Maintenance Mode Info */}
          {maintenanceNodes.has(selectedNode.name) && (
            <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-semibold mb-1">Maintenance Mode Active</p>
                  <p>This node is excluded from load balancing and migration recommendations. Use "Plan Evacuation" to migrate all VMs/CTs before performing maintenance tasks.</p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={() => {
                if (maintenanceNodes.has(selectedNode.name)) {
                  // Remove from maintenance
                  setMaintenanceNodes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedNode.name);
                    return newSet;
                  });
                } else {
                  // Add to maintenance
                  setMaintenanceNodes(prev => new Set([...prev, selectedNode.name]));
                }
              }}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] ${
                maintenanceNodes.has(selectedNode.name)
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                  : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white'
              }`}
            >
              <span className="flex items-center justify-center gap-2">
                {maintenanceNodes.has(selectedNode.name) ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Exit Maintenance Mode
                  </>
                ) : (
                  <>
                    <AlertTriangle size={16} />
                    Enter Maintenance Mode
                  </>
                )}
              </span>
            </button>

            <button
              onClick={async () => {
                if (!canMigrate) {
                  setError('Read-only API token (PVEAuditor) - Cannot perform migrations');
                  return;
                }

                const guestCount = selectedNode.guests ? Object.keys(selectedNode.guests).length : 0;
                if (guestCount === 0) {
                  setError(`Node ${selectedNode.name} has no VMs/CTs to evacuate`);
                  return;
                }

                // Set planning state
                // console.log('Setting planning state for:', selectedNode.name);
                setPlanningNodes(prev => {
                  const newSet = new Set([...prev, selectedNode.name]);
                  // console.log('Planning nodes now:', Array.from(newSet));
                  return newSet;
                });

                // Fetch evacuation plan first
                try {
                  const planResponse = await fetch(`${API_BASE}/nodes/evacuate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      node: selectedNode.name,
                      maintenance_nodes: Array.from(maintenanceNodes),
                      confirm: false,  // Request plan only
                      target_node: null,  // Auto-select target
                      guest_targets: {}  // No per-guest overrides initially
                    })
                  });

                  const planResult = await planResponse.json();
                  // console.log('Plan result:', planResult);

                  if (planResult.success && planResult.plan) {
                    // Show the plan modal
                    // console.log('Setting evacuation plan for node:', selectedNode.name);
                    setEvacuationPlan(planResult);
                    setPlanNode(selectedNode.name);
                    setSelectedNode(null); // Close the node details modal
                  } else {
                    console.error('Plan generation failed:', planResult);
                    setError(`Failed to generate evacuation plan: ${planResult.error}`);
                  }
                } catch (error) {
                  console.error('Plan fetch error:', error);
                  setError(`Error generating plan: ${error.message}`);
                } finally {
                  // Clear planning state
                  // console.log('Clearing planning state for:', selectedNode.name);
                  setPlanningNodes(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(selectedNode.name);
                    // console.log('Planning nodes after clear:', Array.from(newSet));
                    return newSet;
                  });
                }
              }}
              disabled={!canMigrate || evacuatingNodes.has(selectedNode.name) || planningNodes.has(selectedNode.name) || !selectedNode.guests || Object.keys(selectedNode.guests).length === 0}
              className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm transform ${
                !canMigrate || !selectedNode.guests || Object.keys(selectedNode.guests).length === 0
                  ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60'
                  : planningNodes.has(selectedNode.name)
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white cursor-wait'
                  : evacuatingNodes.has(selectedNode.name)
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white cursor-wait'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
              }`}
              title={!canMigrate ? 'Read-only API token - Cannot migrate' : (!selectedNode.guests || Object.keys(selectedNode.guests).length === 0) ? 'No guests to evacuate' : ''}
            >
              {!canMigrate ? (
                <span className="flex items-center justify-center gap-2">
                  <Lock size={16} />
                  Read-only Mode
                </span>
              ) : planningNodes.has(selectedNode.name) ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="animate-spin" size={16} />
                  Planning Migration...
                </span>
              ) : evacuatingNodes.has(selectedNode.name) ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader className="animate-spin" size={16} />
                  Evacuating...
                </span>
              ) : (!selectedNode.guests || Object.keys(selectedNode.guests).length === 0) ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  No Guests
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <MoveRight size={16} />
                  Plan Evacuation
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
