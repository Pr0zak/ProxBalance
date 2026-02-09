import {
  Server, HardDrive, Activity, RefreshCw, CheckCircle,
  AlertCircle, AlertTriangle, Sun, Moon, Settings,
  ChevronDown, ChevronUp, GitHub, GitBranch, ProxBalanceLogo
} from '../Icons.jsx';

export default function DashboardHeader({
  data,
  darkMode, toggleDarkMode,
  setCurrentPage,
  dashboardHeaderCollapsed, setDashboardHeaderCollapsed, handleLogoHover, logoBalancing,
  clusterHealth,
  systemInfo, setShowUpdateModal,
  showBranchModal, setShowBranchModal, fetchBranches,
  recommendations
}) {
  return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
          {/* Minimal Header - Always Visible */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
            <div className="flex items-center gap-3">
              <div onMouseEnter={handleLogoHover} className={logoBalancing ? 'logo-balancing' : 'transition-transform'}>
                <ProxBalanceLogo size={dashboardHeaderCollapsed ? 64 : 128} />
              </div>
              <div>
                <h1 className={`font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 bg-clip-text text-transparent transition-all ${dashboardHeaderCollapsed ? 'text-xl' : 'text-2xl sm:text-3xl'}`}>ProxBalance</h1>
                {!dashboardHeaderCollapsed && <p className="text-sm text-gray-500 dark:text-gray-400">Cluster Optimization</p>}
                {dashboardHeaderCollapsed && data && data.nodes && (() => {
                  const nodes = Object.values(data.nodes);
                  const totalCPU = (nodes.reduce((sum, node) => sum + (node.cpu_percent || 0), 0) / nodes.length).toFixed(1);
                  const totalMemory = (nodes.reduce((sum, node) => sum + (node.mem_percent || 0), 0) / nodes.length).toFixed(1);
                  const onlineNodes = nodes.filter(node => node.status === 'online').length;
                  return (
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        Nodes: <span className="font-semibold text-green-600 dark:text-green-400">{onlineNodes}/{nodes.length}</span>
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        CPU: <span className="font-semibold text-blue-600 dark:text-blue-400">{totalCPU}%</span>
                      </span>
                      <span className="text-gray-600 dark:text-gray-400">
                        RAM: <span className="font-semibold text-purple-600 dark:text-purple-400">{totalMemory}%</span>
                      </span>
                      {clusterHealth && (
                        <span className={`flex items-center gap-1 ${clusterHealth.quorate ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} title={clusterHealth.quorate ? 'Cluster is quorate' : 'Cluster NOT quorate!'}>
                          {clusterHealth.quorate ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                          <span className="font-semibold">Quorum</span>
                        </span>
                      )}
                      {systemInfo && (
                        <button
                          onClick={() => { fetchBranches(); setShowBranchModal(true); }}
                          className="sm:hidden flex items-center gap-1 text-gray-500 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400"
                          title="Click to manage branches"
                        >
                          <GitBranch size={12} />
                          <span className="font-mono text-blue-600 dark:text-blue-400 underline decoration-dotted">{systemInfo.branch?.length > 20 ? systemInfo.branch.substring(0, 20) + '...' : systemInfo.branch}</span>
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {systemInfo && systemInfo.updates_available && (
                <button
                  onClick={() => setShowUpdateModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                  title={`${systemInfo.commits_behind} update(s) available`}
                >
                  <RefreshCw size={18} />
                  <span className="hidden sm:inline">Update Available</span>
                </button>
              )}
              <a
                href="https://github.com/Pr0zak/ProxBalance"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                title="View on GitHub"
              >
                <GitHub size={20} className="text-gray-700 dark:text-gray-300" />
              </a>
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              >
                {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-700" />}
              </button>
              <button
                onClick={() => setCurrentPage('settings')}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                title="Settings"
              >
                <Settings size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              <button
                onClick={() => setDashboardHeaderCollapsed(!dashboardHeaderCollapsed)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                title={dashboardHeaderCollapsed ? "Expand Header" : "Collapse Header"}
              >
                {dashboardHeaderCollapsed ? <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" /> : <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Expandable Content */}
          {!dashboardHeaderCollapsed && (
            <div className="px-6 pb-6">

          {/* Cluster Resource Utilization */}
          {data && data.nodes && (() => {
            // Calculate cluster-wide totals
            const nodes = Object.values(data.nodes);
            const totalCPU = nodes.reduce((sum, node) => sum + (node.cpu_percent || 0), 0) / nodes.length;
            const totalMemory = nodes.reduce((sum, node) => sum + (node.mem_percent || 0), 0) / nodes.length;
            const totalIOWait = nodes.reduce((sum, node) => sum + (node.metrics?.current_iowait || 0), 0) / nodes.length;
            const totalNodes = nodes.length;
            const onlineNodes = nodes.filter(node => node.status === 'online').length;

            return (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-y-2 mb-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md shrink-0">
                      <Server size={24} className="text-white" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">Cluster Resource Utilization</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{onlineNodes} of {totalNodes} nodes online</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CPU Utilization */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">CPU</span>
                      <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCPU.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          totalCPU > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          totalCPU > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                        style={{width: `${Math.min(100, totalCPU)}%`}}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Average across all nodes
                    </div>
                  </div>

                  {/* Memory Utilization */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Memory</span>
                      <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMemory.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          totalMemory > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          totalMemory > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-purple-500 to-pink-500'
                        }`}
                        style={{width: `${Math.min(100, totalMemory)}%`}}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Average across all nodes
                    </div>
                  </div>

                  {/* IOWait */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">IOWait</span>
                      <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalIOWait.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          totalIOWait > 20 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                          totalIOWait > 10 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                          'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                        style={{width: `${Math.min(100, totalIOWait)}%`}}
                      ></div>
                    </div>
                    <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                      Average across all nodes
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Server size={20} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs text-gray-500 dark:text-gray-500">Nodes</span>
              </div>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.summary.total_nodes}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <HardDrive size={20} className="text-green-600 dark:text-green-400" />
                <span className="text-xs text-gray-500 dark:text-gray-500">Guests</span>
              </div>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.summary.total_guests}</p>
              <p className="text-xs text-gray-500 dark:text-gray-500">{data.summary.vms} VMs, {data.summary.containers} CTs</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <Activity size={20} className="text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs text-gray-500 dark:text-gray-500">Recommendations</span>
              </div>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{recommendations.length}</p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle size={20} className="text-purple-600 dark:text-purple-400" />
                <span className="text-xs text-gray-500 dark:text-gray-500">Tagged</span>
              </div>
              <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.summary.ignored_guests + data.summary.excluded_guests}</p>
            </div>
          </div>
            </div>
          )}
        </div>
  );
}
