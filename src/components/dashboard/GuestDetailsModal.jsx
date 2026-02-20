import {
  HardDrive, Package, X, Activity, AlertCircle, Folder,
  ChevronDown, ChevronUp, AlertTriangle, CheckCircle,
  BarChart2, RefreshCw, MoveRight, TrendingUp, TrendingDown, Minus
} from '../Icons.jsx';

export default function GuestDetailsModal({
  selectedGuestDetails, setSelectedGuestDetails,
  generateSparkline,
  guestModalCollapsed, setGuestModalCollapsed,
  guestMigrationOptions, loadingGuestOptions, fetchGuestMigrationOptions,
  canMigrate,
  setSelectedGuest, setMigrationTarget, setShowMigrationDialog
}) {
  if (!selectedGuestDetails) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4" onClick={() => setSelectedGuestDetails(null)}>
      <div className="bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`p-1.5 rounded-lg shrink-0 ${selectedGuestDetails.type === 'qemu' ? 'bg-purple-500' : 'bg-green-500'}`}>
              {selectedGuestDetails.type === 'qemu' ? <HardDrive size={20} className="text-white" /> : <Package size={20} className="text-white" />}
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate">
                {selectedGuestDetails.name || `Guest ${selectedGuestDetails.vmid}`}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {selectedGuestDetails.type === 'qemu' ? 'VM' : 'CT'} #{selectedGuestDetails.vmid}
              </p>
            </div>
          </div>
          <button
            onClick={() => setSelectedGuestDetails(null)}
            className="ml-2 shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto">
          {/* Status Bar */}
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                selectedGuestDetails.status === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
              }`}>
                {selectedGuestDetails.status === 'running' ? <Activity size={12} /> : <AlertCircle size={12} />}
                {selectedGuestDetails.status}
              </div>
              <span className="text-xs text-gray-500 dark:text-gray-400">on</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">{selectedGuestDetails.currentNode}</span>
            </div>
          </div>

          {/* Resource Usage - Compact 2-Column Grid with Sparklines */}
          <div className="grid grid-cols-2 gap-2 mb-3">
            {/* CPU */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded p-2 border border-blue-200 dark:border-blue-800">
              {/* Sparkline background */}
              <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-blue-600 dark:text-blue-400"
                  points={generateSparkline(selectedGuestDetails.cpu_current || 0, 100, 30, 0.3)}
                />
              </svg>
              <div className="relative z-10">
                <div className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium mb-0.5">CPU</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">{(selectedGuestDetails.cpu_current || 0).toFixed(1)}%</div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">{selectedGuestDetails.cpu_cores || 0} cores</div>
              </div>
            </div>

            {/* Memory */}
            <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded p-2 border border-purple-200 dark:border-purple-800">
              {/* Sparkline background */}
              <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
                <polyline
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  className="text-purple-600 dark:text-purple-400"
                  points={generateSparkline(selectedGuestDetails.mem_max_gb > 0 ? ((selectedGuestDetails.mem_used_gb / selectedGuestDetails.mem_max_gb) * 100) : 0, 100, 30, 0.25)}
                />
              </svg>
              <div className="relative z-10">
                <div className="text-[10px] uppercase tracking-wide text-purple-600 dark:text-purple-400 font-medium mb-0.5">Memory</div>
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedGuestDetails.mem_max_gb > 0 ? ((selectedGuestDetails.mem_used_gb / selectedGuestDetails.mem_max_gb) * 100).toFixed(1) : 0}%
                </div>
                <div className="text-[10px] text-gray-500 dark:text-gray-400">
                  {(selectedGuestDetails.mem_used_gb || 0).toFixed(1)} / {(selectedGuestDetails.mem_max_gb || 0).toFixed(1)} GB
                </div>
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
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">Read</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {((selectedGuestDetails.disk_read_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">Write</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
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
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">In</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {((selectedGuestDetails.net_in_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-gray-600 dark:text-gray-400">Out</span>
                  <span className="text-sm font-bold text-gray-900 dark:text-white">
                    {((selectedGuestDetails.net_out_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tags */}
          {selectedGuestDetails.tags && selectedGuestDetails.tags.all_tags && selectedGuestDetails.tags.all_tags.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
              <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium mb-1.5">Tags</div>
              <div className="flex flex-wrap gap-1.5">
                {selectedGuestDetails.tags.all_tags.map((tag, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mount Points (Containers only) */}
          {selectedGuestDetails.type === 'CT' && selectedGuestDetails.mount_points && selectedGuestDetails.mount_points.has_mount_points && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => setGuestModalCollapsed(prev => ({
                  ...prev,
                  mountPoints: !prev.mountPoints
                }))}
                className="flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Folder size={16} className={`${
                    selectedGuestDetails.mount_points.has_unshared_bind_mount
                      ? 'text-orange-600 dark:text-orange-400'
                      : 'text-green-600 dark:text-green-400'
                  }`} />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Mount Points ({selectedGuestDetails.mount_points.mount_count})
                  </h4>
                </div>
                {guestModalCollapsed.mountPoints ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
              </button>

              {!guestModalCollapsed.mountPoints && (
              <>
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
                          <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
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
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          <span className="font-medium">Source:</span> <span className="font-mono">{mp.source}</span>
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
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
                <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-orange-800 dark:text-orange-200">
                      <p className="font-semibold mb-1">Manual Migration Required</p>
                      <p>This container has unshared bind mounts that require manual intervention. Use <span className="font-mono bg-orange-200 dark:bg-orange-800 px-1">pct migrate {selectedGuestDetails.vmid} &lt;target&gt; --restart --force</span> and verify paths exist on target node.</p>
                    </div>
                  </div>
                </div>
              ) : selectedGuestDetails.mount_points.has_shared_mount ? (
                <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
                  <div className="flex items-start gap-2">
                    <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <div className="text-xs text-green-800 dark:text-green-200">
                      <p className="font-semibold mb-1">Safe to Migrate</p>
                      <p>All bind mounts are marked as shared. Ensure these paths exist on the target node before migration.</p>
                    </div>
                  </div>
                </div>
              ) : null}
              </>
              )}
            </div>
          )}

          {/* Local/Pinned Disks (VMs and CTs) */}
          {selectedGuestDetails.local_disks && selectedGuestDetails.local_disks.is_pinned && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
              <button
                onClick={() => setGuestModalCollapsed(prev => ({
                  ...prev,
                  passthroughDisks: !prev.passthroughDisks
                }))}
                className="flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Cannot Migrate - {selectedGuestDetails.local_disks.pinned_reason}
                  </h4>
                </div>
                {guestModalCollapsed.passthroughDisks ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
              </button>

              {!guestModalCollapsed.passthroughDisks && (
              <>
              {/* Passthrough Disks */}
              {selectedGuestDetails.local_disks.passthrough_disks && selectedGuestDetails.local_disks.passthrough_disks.length > 0 && (
                <div className="mb-3">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    Passthrough Disks ({selectedGuestDetails.local_disks.passthrough_count})
                  </h5>
                  <div className="space-y-2">
                    {selectedGuestDetails.local_disks.passthrough_disks.map((disk, idx) => (
                      <div key={idx} className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                {disk.key}
                              </span>
                              <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                                HARDWARE PASSTHROUGH
                              </span>
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
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
              <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-red-800 dark:text-red-200">
                    <p className="font-semibold mb-1">Migration Blocked</p>
                    <p>This {selectedGuestDetails.type} has {selectedGuestDetails.local_disks.total_pinned_disks} disk(s) that prevent automatic migration. Manual intervention required.</p>
                  </div>
                </div>
              </div>
              </>
              )}
            </div>
          )}

          {/* Migration Options - Node Score Comparison */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mt-2">
            <button
              onClick={() => {
                setGuestModalCollapsed(prev => ({ ...prev, migrationOptions: !prev.migrationOptions }));
                if (!guestMigrationOptions && fetchGuestMigrationOptions) {
                  fetchGuestMigrationOptions(selectedGuestDetails.vmid);
                }
              }}
              className="flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
            >
              <div className="flex items-center gap-2">
                <BarChart2 size={16} className="text-blue-600 dark:text-blue-400" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Migration Options
                </h4>
                <span className="text-xs text-gray-500 dark:text-gray-400">Score comparison across all nodes</span>
              </div>
              {guestModalCollapsed.migrationOptions ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
            </button>

            {guestModalCollapsed.migrationOptions && (
              <div className="space-y-2">
                {loadingGuestOptions ? (
                  <div className="flex items-center justify-center p-4 text-gray-500 dark:text-gray-400">
                    <RefreshCw size={16} className="animate-spin mr-2" /> Loading migration options...
                  </div>
                ) : guestMigrationOptions?.options ? (
                  <>
                    {guestMigrationOptions.options.map((opt) => {
                      const maxScore = Math.max(...guestMigrationOptions.options.filter(o => !o.disqualified).map(o => o.score), 1);
                      const barWidth = opt.disqualified ? 100 : Math.min(100, (opt.score / maxScore) * 100);
                      return (
                        <div key={opt.node} className={`p-2 rounded border text-xs ${
                          opt.is_current
                            ? 'border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                            : opt.disqualified
                            ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60'
                            : opt.suitable
                            ? 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-gray-700'
                        }`}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900 dark:text-white flex items-center gap-1">
                                {opt.node}
                                {/* CPU trend arrow */}
                                {!opt.disqualified && opt.trend_analysis && (() => {
                                  const dir = opt.trend_analysis.cpu_direction;
                                  if (dir === 'sustained_increase') return <TrendingUp size={10} className="text-red-500" title={`CPU ${opt.trend_analysis.cpu_rate_per_day > 0 ? '+' : ''}${opt.trend_analysis.cpu_rate_per_day?.toFixed(1)}%/day`} />;
                                  if (dir === 'rising') return <TrendingUp size={10} className="text-orange-400" title="CPU rising" />;
                                  if (dir === 'falling' || dir === 'sustained_decrease') return <TrendingDown size={10} className="text-green-500" title="CPU falling" />;
                                  return <Minus size={10} className="text-gray-400" title="CPU stable" />;
                                })()}
                              </span>
                              {opt.is_current && <span className="px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded">CURRENT</span>}
                              {opt.disqualified && <span className="px-1.5 py-0.5 bg-gray-400 text-white text-[9px] font-bold rounded">DISQUALIFIED</span>}
                              {!opt.is_current && !opt.disqualified && opt.improvement > 0 && (
                                <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${
                                  opt.improvement >= 30 ? 'bg-green-500 text-white' :
                                  opt.improvement >= 15 ? 'bg-yellow-500 text-white' :
                                  'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}>+{opt.improvement.toFixed(0)} pts</span>
                              )}
                              {/* Stability badge */}
                              {!opt.disqualified && opt.trend_analysis?.stability_score != null && (() => {
                                const s = opt.trend_analysis.stability_score;
                                const label = s >= 80 ? 'Stable' : s >= 60 ? 'Moderate' : s >= 40 ? 'Variable' : 'Volatile';
                                const color = s >= 80 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                                  : s >= 60 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                  : s >= 40 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
                                return <span className={`px-1 py-0 rounded text-[9px] font-medium ${color}`} title={`Stability: ${s}/100`}>{label}</span>;
                              })()}
                              {/* Overcommit badge */}
                              {!opt.disqualified && opt.overcommit_ratio > 0.85 && (() => {
                                const oc = opt.overcommit_ratio;
                                const color = oc > 1.2 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                  : oc > 1.0 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                  : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
                                return <span className={`px-1 py-0 rounded text-[9px] font-medium ${color}`} title={`Memory overcommit: ${(oc * 100).toFixed(0)}% (${opt.committed_mem_gb?.toFixed(1) || '?'}GB committed)`}>OC {(oc * 100).toFixed(0)}%</span>;
                              })()}
                            </div>
                            <div className="text-right">
                              {opt.disqualified ? (
                                <span className="text-gray-500 dark:text-gray-400">{opt.reason}</span>
                              ) : (
                                <span className={`font-semibold ${
                                  opt.suitability_rating >= 70 ? 'text-green-600 dark:text-green-400' :
                                  opt.suitability_rating >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                  opt.suitability_rating >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>{opt.suitability_rating}%</span>
                              )}
                            </div>
                          </div>
                          {!opt.disqualified && (
                            <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600">
                              <div className={`rounded-full transition-all ${
                                opt.suitability_rating >= 70 ? 'bg-green-500' :
                                opt.suitability_rating >= 50 ? 'bg-yellow-500' :
                                opt.suitability_rating >= 30 ? 'bg-orange-500' :
                                'bg-red-500'
                              }`} style={{ width: `${opt.suitability_rating}%` }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="text-xs text-gray-500 dark:text-gray-400 p-2">No migration data available</div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setSelectedGuestDetails(null)}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium flex items-center justify-center gap-1.5"
          >
            <X size={14} /> Close
          </button>
          {canMigrate && selectedGuestDetails.status === 'running' && (
            <button
              onClick={() => {
                setSelectedGuest(selectedGuestDetails);
                setMigrationTarget('');
                setShowMigrationDialog(true);
                setSelectedGuestDetails(null);
              }}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2"
            >
              <MoveRight size={16} />
              Migrate
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
