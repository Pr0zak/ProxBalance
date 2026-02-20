import {
  Server, ChevronDown, ChevronUp, Cpu, MemoryStick, Database, Zap, Globe,
  RefreshCw, CheckCircle, Folder
} from '../Icons.jsx';

export default function ClusterMap({
  data,
  collapsedSections,
  toggleSection,
  showPoweredOffGuests,
  setShowPoweredOffGuests,
  clusterMapViewMode,
  setClusterMapViewMode,
  maintenanceNodes,
  setSelectedNode,
  setSelectedGuestDetails,
  guestsMigrating,
  migrationProgress,
  completedMigrations
}) {
  if (!data) return null;

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md shrink-0">
            <Server size={24} className="text-white" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Cluster Map</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Visual cluster overview</p>
          </div>
          <button
            onClick={() => toggleSection('clusterMap')}
            className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
            title={collapsedSections.clusterMap ? "Expand section" : "Collapse section"}
          >
            {collapsedSections.clusterMap ? (
              <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
            ) : (
              <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
        {!collapsedSections.clusterMap && (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">Show Powered Off:</span>
              <button
                onClick={() => setShowPoweredOffGuests(!showPoweredOffGuests)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  showPoweredOffGuests ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                }`}
                title={showPoweredOffGuests ? 'Click to hide powered off VMs/CTs' : 'Click to show powered off VMs/CTs'}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                    showPoweredOffGuests ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <span className="text-sm text-gray-600 dark:text-gray-400">View by:</span>
            <div className="flex flex-wrap rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
              <button
                onClick={() => setClusterMapViewMode('cpu')}
                className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                  clusterMapViewMode === 'cpu'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="CPU"
              >
                <Cpu size={14} /><span className="hidden sm:inline ml-1">CPU</span>
              </button>
              <button
                onClick={() => setClusterMapViewMode('memory')}
                className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                  clusterMapViewMode === 'memory'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Memory"
              >
                <MemoryStick size={14} /><span className="hidden sm:inline ml-1">Memory</span>
              </button>
              <button
                onClick={() => setClusterMapViewMode('allocated')}
                className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                  clusterMapViewMode === 'allocated'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Allocated"
              >
                <Database size={14} /><span className="hidden sm:inline ml-1">Allocated</span>
              </button>
              <button
                onClick={() => setClusterMapViewMode('disk_io')}
                className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                  clusterMapViewMode === 'disk_io'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Disk I/O"
              >
                <Zap size={14} /><span className="hidden sm:inline ml-1">Disk I/O</span>
              </button>
              <button
                onClick={() => setClusterMapViewMode('network')}
                className={`flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${
                  clusterMapViewMode === 'network'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
                title="Network"
              >
                <Globe size={14} /><span className="hidden sm:inline ml-1">Network</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {!collapsedSections.clusterMap && (
        <div className="relative" style={{minHeight: '400px'}}>
          <div className="flex flex-wrap gap-4 sm:gap-8 justify-center items-start py-8">
            {Object.values(data.nodes).map(node => {
              const allNodeGuests = Object.values(data.guests || {}).filter(g => g.node === node.name);
              const poweredOffCount = allNodeGuests.filter(g => g.status !== 'running').length;
              const nodeGuests = showPoweredOffGuests
                ? allNodeGuests
                : allNodeGuests.filter(g => g.status === 'running');
              const maxResources = Math.max(...Object.values(data.guests || {}).filter(g =>
                showPoweredOffGuests || g.status === 'running'
              ).map(g => {
                if (clusterMapViewMode === 'cpu') {
                  // Use CPU usage %
                  return g.cpu_current || 0;
                } else if (clusterMapViewMode === 'memory') {
                  // Use Memory usage %
                  return g.mem_max_gb > 0 ? ((g.mem_used_gb || 0) / g.mem_max_gb) * 100 : 0;
                } else if (clusterMapViewMode === 'allocated') {
                  // Use allocated resources (cores + GB)
                  const cpuCores = g.cpu_cores || 0;
                  const memGB = g.mem_max_gb || 0;
                  return cpuCores + memGB;
                } else if (clusterMapViewMode === 'disk_io') {
                  // Use disk I/O (read + write in MB/s)
                  const diskRead = (g.disk_read_bps || 0) / (1024 * 1024);
                  const diskWrite = (g.disk_write_bps || 0) / (1024 * 1024);
                  return diskRead + diskWrite;
                } else if (clusterMapViewMode === 'network') {
                  // Use network I/O (in + out in MB/s)
                  const netIn = (g.net_in_bps || 0) / (1024 * 1024);
                  const netOut = (g.net_out_bps || 0) / (1024 * 1024);
                  return netIn + netOut;
                } else {
                  // Default: Use CPU usage
                  return g.cpu_current || 0;
                }
              }), 1);

              return (
                <div key={node.name} className="flex flex-col items-center gap-4">
                  {/* Host Node */}
                  <div className="relative group">
                    <div
                      onClick={() => setSelectedNode(node)}
                      className={`w-28 sm:w-32 rounded-lg border-4 flex flex-col items-center justify-between p-2 sm:p-2 cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                      maintenanceNodes.has(node.name)
                        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-600 hover:border-yellow-600 dark:hover:border-yellow-500'
                        : node.status === 'online'
                        ? 'bg-gray-50 dark:bg-gray-900 border-blue-500 dark:border-blue-600 hover:border-blue-600 dark:hover:border-blue-500'
                        : 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600'
                    }`}>
                      {/* Node header */}
                      <div className="flex flex-col items-center z-10">
                        <Server className={`w-5 h-5 sm:w-7 sm:h-7 ${maintenanceNodes.has(node.name) ? 'text-yellow-600 dark:text-yellow-400' : node.status === 'online' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} />
                        <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">{node.name}</div>
                        {maintenanceNodes.has(node.name) && (
                          <div className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500 text-white rounded mt-0.5">
                            MAINTENANCE
                          </div>
                        )}
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {nodeGuests.length} guests
                          {!showPoweredOffGuests && poweredOffCount > 0 && (
                            <span className="text-gray-500 dark:text-gray-500"> (+{poweredOffCount} off)</span>
                          )}
                        </div>
                      </div>

                      {/* Capacity indicators */}
                      <div className="w-full space-y-1.5 z-10 mt-1.5">
                        {/* CPU Bar */}
                        <div>
                          <div className="text-[10px] sm:text-xs mb-0.5">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">CPU</span>
                          </div>
                          <div className="w-full h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                (node.cpu_percent || 0) > 80 ? 'bg-red-500' :
                                (node.cpu_percent || 0) > 60 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{width: `${Math.min(100, node.cpu_percent || 0)}%`}}
                            ></div>
                          </div>
                        </div>

                        {/* Memory Bar */}
                        <div>
                          <div className="text-[10px] sm:text-xs mb-0.5">
                            <span className="text-gray-600 dark:text-gray-400 font-medium">MEM</span>
                          </div>
                          <div className="w-full h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                (node.mem_percent || 0) > 80 ? 'bg-red-500' :
                                (node.mem_percent || 0) > 70 ? 'bg-yellow-500' :
                                'bg-blue-500'
                              }`}
                              style={{width: `${Math.min(100, node.mem_percent || 0)}%`}}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Host tooltip */}
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white text-xs rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10">
                      <div className="font-bold text-sm mb-2 text-blue-400 border-b border-gray-700 pb-2">{node.name}</div>
                      {maintenanceNodes.has(node.name) && (
                        <div className="text-yellow-400 font-bold bg-yellow-900/30 px-2 py-1 rounded mb-2">🔧 MAINTENANCE MODE</div>
                      )}
                      <div className="space-y-1.5">
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">CPU:</span>
                          <span className="font-semibold text-green-400">{(node.cpu_percent || 0).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">Memory:</span>
                          <span className="font-semibold text-blue-400">{(node.mem_percent || 0).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-gray-300">IOWait:</span>
                          <span className="font-semibold text-purple-400">{(node.metrics?.current_iowait || 0).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between gap-4 border-t border-gray-700 pt-1.5 mt-1.5">
                          <span className="text-gray-300">Cores:</span>
                          <span className="font-semibold text-orange-400">{node.cpu_cores || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Connection line */}
                  {nodeGuests.length > 0 && (
                    <div className="w-0.5 h-8 bg-gradient-to-b from-blue-400 to-transparent dark:from-blue-600"></div>
                  )}

                  {/* Guests */}
                  <div className="flex flex-wrap gap-3 justify-center max-w-xs">
                    {nodeGuests.map(guest => {
                      const cpuUsage = guest.cpu_current || 0;
                      const memPercent = guest.mem_max_gb > 0 ? ((guest.mem_used_gb || 0) / guest.mem_max_gb) * 100 : 0;

                      let resourceValue;
                      if (clusterMapViewMode === 'cpu') {
                        // Use CPU usage %
                        resourceValue = cpuUsage;
                      } else if (clusterMapViewMode === 'memory') {
                        // Use Memory usage %
                        resourceValue = memPercent;
                      } else if (clusterMapViewMode === 'allocated') {
                        // Use allocated resources (cores + GB)
                        const cpuCores = guest.cpu_cores || 0;
                        const memGB = guest.mem_max_gb || 0;
                        resourceValue = cpuCores + memGB;
                      } else if (clusterMapViewMode === 'disk_io') {
                        // Use disk I/O (read + write in MB/s)
                        const diskRead = (guest.disk_read_bps || 0) / (1024 * 1024);
                        const diskWrite = (guest.disk_write_bps || 0) / (1024 * 1024);
                        resourceValue = diskRead + diskWrite;
                      } else if (clusterMapViewMode === 'network') {
                        // Use network I/O (in + out in MB/s)
                        const netIn = (guest.net_in_bps || 0) / (1024 * 1024);
                        const netOut = (guest.net_out_bps || 0) / (1024 * 1024);
                        resourceValue = netIn + netOut;
                      } else {
                        // Default: Use CPU usage
                        resourceValue = cpuUsage;
                      }

                      const sizeRatio = maxResources > 0 ? (resourceValue / maxResources) : 0.3;
                      const size = Math.max(30, Math.min(80, 30 + (sizeRatio * 50)));

                      const getGuestColor = () => {
                        const guestType = (guest.type || '').toUpperCase();
                        if (guestType === 'CT' || guestType === 'LXC') return 'bg-green-500 dark:bg-green-600';
                        if (guestType === 'VM' || guestType === 'QEMU') return 'bg-purple-500 dark:bg-purple-600';
                        return 'bg-gray-500 dark:bg-gray-600';
                      };

                      // Check migration status for this guest
                      const isMigrating = guestsMigrating[guest.vmid] === true;
                      const progress = migrationProgress[guest.vmid];
                      const isCompleted = completedMigrations[guest.vmid] !== undefined;
                      const isStopped = guest.status !== 'running';

                      return (
                        <div key={guest.vmid} className="relative group">
                          <div
                            className={`rounded-full ${getGuestColor()} flex items-center justify-center text-white font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer hover:ring-2 hover:ring-blue-400 ${isMigrating ? 'animate-pulse ring-2 ring-yellow-400' : ''} ${isCompleted ? 'ring-2 ring-green-400' : ''} ${isStopped ? 'opacity-40' : ''}`}
                            style={{width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, size/4)}px`}}
                            onClick={() => {
                              if (!isMigrating) {
                                setSelectedGuestDetails({...guest, currentNode: node.name});
                              }
                            }}
                          >
                            {guest.vmid}
                          </div>

                          {/* Migration status badge */}
                          {isMigrating && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                              <RefreshCw size={12} className="animate-spin" />
                            </div>
                          )}

                          {isCompleted && !isMigrating && (
                            <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                              <CheckCircle size={12} />
                            </div>
                          )}

                          {/* Mount Point Indicator - Border Dot (Top Right) */}
                          {guest.mount_points?.has_mount_points && !isMigrating && !isCompleted && (
                            <div
                              className={`absolute -top-0.5 -right-0.5 ${
                                guest.mount_points.has_unshared_bind_mount
                                  ? 'bg-orange-500'
                                  : 'bg-cyan-400'
                              } rounded-full w-3 h-3 shadow-lg ring-2 ring-white dark:ring-gray-800`}
                              title={`${guest.mount_points.mount_count} mount point(s)${guest.mount_points.has_shared_mount ? ' (shared - safe to migrate)' : ' (requires manual migration)'}`}
                            />
                          )}

                          {/* Pinned Disk Indicator - Border Dot (Top Left) */}
                          {guest.local_disks?.is_pinned && !isMigrating && !isCompleted && (
                            <div
                              className="absolute -top-0.5 -left-0.5 bg-red-500 rounded-full w-3 h-3 shadow-lg ring-2 ring-white dark:ring-gray-800"
                              title={`Cannot migrate: ${guest.local_disks.pinned_reason} (${guest.local_disks.total_pinned_disks} disk(s))`}
                            />
                          )}

                          {/* Guest tooltip */}
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white text-xs rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10">
                            <div className="font-bold text-sm mb-2 text-blue-400 border-b border-gray-700 pb-2">
                              {guest.name || `Guest ${guest.vmid}`}
                              <span className="ml-2 text-gray-400 font-normal text-xs">
                                ({((guest.type || '').toUpperCase() === 'VM' || (guest.type || '').toUpperCase() === 'QEMU') ? 'VM' : 'CT'})
                              </span>
                            </div>

                            {isMigrating && (
                              <div className="text-yellow-400 font-bold bg-yellow-900/30 px-2 py-1 rounded mb-2">
                                🔄 Migrating... {progress?.percentage ? `${progress.percentage}%` : ''}
                              </div>
                            )}
                            {isCompleted && !isMigrating && (
                              <div className="text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded mb-2">
                                ✓ Migration Complete
                              </div>
                            )}

                            <div className="space-y-1.5">
                              {clusterMapViewMode === 'allocated' ? (
                                <>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">CPU Cores:</span>
                                    <span className="font-semibold text-orange-400">{guest.cpu_cores || 0}</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Memory Allocated:</span>
                                    <span className="font-semibold text-blue-400">{(guest.mem_max_gb || 0).toFixed(1)} GB</span>
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">CPU Usage:</span>
                                    <span className="font-semibold text-green-400">{cpuUsage.toFixed(1)}%</span>
                                  </div>
                                  <div className="flex justify-between gap-4">
                                    <span className="text-gray-300">Memory Usage:</span>
                                    <span className="font-semibold text-blue-400">{memPercent.toFixed(1)}%</span>
                                  </div>
                                  <div className="text-gray-400 text-xs ml-auto">
                                    ({(guest.mem_used_gb || 0).toFixed(1)} / {(guest.mem_max_gb || 0).toFixed(1)} GB)
                                  </div>
                                </>
                              )}

                              <div className="flex justify-between gap-4">
                                <span className="text-gray-300">Status:</span>
                                <span className={`font-semibold ${guest.status === 'running' ? 'text-green-400' : 'text-gray-400'}`}>
                                  {guest.status}
                                </span>
                              </div>

                              <div className="border-t border-gray-700 pt-1.5 mt-1.5 space-y-1">
                                <div className="flex justify-between gap-4">
                                  <span className="text-gray-300">Disk Read:</span>
                                  <span className="font-semibold text-cyan-400">{((guest.disk_read_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-gray-300">Disk Write:</span>
                                  <span className="font-semibold text-cyan-400">{((guest.disk_write_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-gray-300">Net In:</span>
                                  <span className="font-semibold text-purple-400">{((guest.net_in_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                                <div className="flex justify-between gap-4">
                                  <span className="text-gray-300">Net Out:</span>
                                  <span className="font-semibold text-purple-400">{((guest.net_out_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                </div>
                              </div>

                              {/* Mount Point Info */}
                              {guest.mount_points?.has_mount_points && (
                                <div className={`border-t border-gray-700 pt-1.5 mt-1.5 flex items-center gap-2 ${
                                  guest.mount_points.has_unshared_bind_mount ? 'text-orange-400' : 'text-green-400'
                                } bg-gray-800/50 px-2 py-1 rounded`}>
                                  <Folder size={14} />
                                  <div className="flex flex-col">
                                    <span className="text-xs font-semibold">
                                      {guest.mount_points.mount_count} mount point{guest.mount_points.mount_count > 1 ? 's' : ''}
                                      {guest.mount_points.has_shared_mount && ' (shared)'}
                                      {guest.mount_points.has_unshared_bind_mount && ' (manual migration required)'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-purple-500 dark:bg-purple-600"></div>
              <span>VM</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-green-500 dark:bg-green-600"></div>
              <span>Container</span>
            </div>
            <div className="flex items-center gap-2">
              <span>
                {clusterMapViewMode === 'cpu'
                  ? 'Circle size = CPU usage (%)'
                  : clusterMapViewMode === 'memory'
                  ? 'Circle size = Memory usage (%)'
                  : clusterMapViewMode === 'allocated'
                  ? 'Circle size = CPU cores + Memory allocated (GB)'
                  : clusterMapViewMode === 'disk_io'
                  ? 'Circle size = Disk I/O (Read + Write MB/s)'
                  : clusterMapViewMode === 'network'
                  ? 'Circle size = Network I/O (In + Out MB/s)'
                  : 'Circle size = CPU usage (%)'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
