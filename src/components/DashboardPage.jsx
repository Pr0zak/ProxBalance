import {
  AlertCircle, Server, HardDrive, Activity, RefreshCw, Play, CheckCircle,
  XCircle, ClipboardList, Tag, AlertTriangle, Info, Shield, Clock, Sun, Moon,
  Settings, X, ChevronDown, ChevronUp, ChevronRight, GitHub, GitBranch,
  ArrowLeft, Lock, Download, MoveRight, Loader, Plus, List, Terminal,
  ArrowRight, Pause, Package, MinusCircle, Folder, Minus, ProxBalanceLogo
} from './Icons.jsx';

import { formatLocalTime, getTimezoneAbbr } from '../utils/formatters.js';

export default function DashboardPage({
  // Data & loading
  data, setData, loading, error, setError, config,
  // Dark mode
  darkMode, toggleDarkMode,
  // Navigation
  setCurrentPage, setScrollToApiConfig, setOpenPenaltyConfigOnSettings,
  // Token auth
  tokenAuthError, setTokenAuthError,
  // Dashboard header
  dashboardHeaderCollapsed, setDashboardHeaderCollapsed, handleLogoHover, logoBalancing,
  // Cluster health
  clusterHealth,
  // System info & updates
  systemInfo, showUpdateModal, setShowUpdateModal, updating, updateLog, setUpdateLog, handleUpdate,
  // Branch management
  showBranchModal, setShowBranchModal, loadingBranches, availableBranches, branchPreview, setBranchPreview,
  loadingPreview, switchingBranch, rollingBack, fetchBranches, switchBranch, rollbackBranch, fetchBranchPreview,
  // Automation
  automationStatus, automationConfig, fetchAutomationStatus, runAutomationNow, runningAutomation,
  runNowMessage, setRunNowMessage, runHistory, expandedRun, setExpandedRun,
  // Recommendations
  recommendations, loadingRecommendations, generateRecommendations, recommendationData, penaltyConfig,
  // AI recommendations
  aiEnabled, aiRecommendations, loadingAi, aiAnalysisPeriod, setAiAnalysisPeriod, fetchAiRecommendations,
  // Migrations
  canMigrate, migrationStatus, setMigrationStatus, completedMigrations, guestsMigrating, migrationProgress,
  cancelMigration, trackMigration,
  // Migration dialog
  showMigrationDialog, setShowMigrationDialog, selectedGuest, setSelectedGuest, migrationTarget, setMigrationTarget,
  executeMigration,
  // Tag management
  showTagModal, setShowTagModal, tagModalGuest, setTagModalGuest, newTag, setNewTag,
  handleAddTag, handleRemoveTag,
  // Remove tag confirmation
  confirmRemoveTag, setConfirmRemoveTag, confirmAndRemoveTag,
  // Migration confirmation
  confirmMigration, setConfirmMigration, confirmAndMigrate,
  // Batch migration
  showBatchConfirmation, setShowBatchConfirmation, pendingBatchMigrations, confirmBatchMigration,
  // Cancel migration
  cancelMigrationModal, setCancelMigrationModal, cancellingMigration, setCancellingMigration,
  // Section collapse
  collapsedSections, setCollapsedSections, toggleSection,
  // Timestamps
  lastUpdate, backendCollected, handleRefresh,
  // Cluster map
  clusterMapViewMode, setClusterMapViewMode, showPoweredOffGuests, setShowPoweredOffGuests,
  selectedNode, setSelectedNode, selectedGuestDetails, setSelectedGuestDetails,
  // Node status
  nodeGridColumns, setNodeGridColumns, chartPeriod, setChartPeriod, nodeScores,
  // Maintenance & evacuation
  maintenanceNodes, setMaintenanceNodes, evacuatingNodes, setEvacuatingNodes, planningNodes, setPlanningNodes,
  evacuationPlan, setEvacuationPlan, planNode, setPlanNode,
  guestActions, setGuestActions, guestTargets, setGuestTargets,
  showConfirmModal, setShowConfirmModal,
  // Guest tag management table
  guestSearchFilter, setGuestSearchFilter, guestCurrentPage, setGuestCurrentPage,
  guestPageSize, setGuestPageSize, guestSortField, setGuestSortField,
  guestSortDirection, setGuestSortDirection,
  // Guest modal collapsed state
  guestModalCollapsed, setGuestModalCollapsed,
  // Helper functions
  checkAffinityViolations, generateSparkline, fetchGuestLocations,
  // API base
  API_BASE
}) {
  // Dashboard Page - data is guaranteed to be available here
  const ignoredGuests = Object.values(data.guests || {}).filter(g => g.tags?.has_ignore);
  const excludeGuests = Object.values(data.guests || {}).filter(g => g.tags?.exclude_groups?.length > 0);
  const violations = checkAffinityViolations();

  return (<>
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pb-20 sm:pb-4 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        {/* Token Authentication Error Banner */}
        {tokenAuthError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 dark:border-red-400 p-4 rounded-r-lg shadow-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-red-900 dark:text-red-200 mb-1">
                  API Token Authentication Failed
                </h3>
                <p className="text-sm text-red-800 dark:text-red-300 mb-3">
                  ProxBalance cannot connect to the Proxmox API due to invalid or misconfigured token credentials.
                  This prevents cluster data collection and monitoring.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setScrollToApiConfig(true);
                      setCurrentPage('settings');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 font-medium"
                  >
                    <Settings size={16} />
                    Fix Token Configuration
                  </button>
                  <button
                    onClick={() => setTokenAuthError(false)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    <X size={16} />
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* Automated Migrations Status */}
        {automationStatus && (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-y-3 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className={`p-2.5 rounded-lg shadow-md shrink-0 ${
                  automationStatus.enabled
                    ? 'bg-gradient-to-br from-green-600 to-emerald-600'
                    : 'bg-gradient-to-br from-gray-500 to-gray-600'
                }`}>
                  <Clock size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate">Automated Migrations</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Scheduled automatic balancing</p>
                </div>
                <button
                  onClick={() => toggleSection('automatedMigrations')}
                  className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  title={collapsedSections.automatedMigrations ? "Expand section" : "Collapse section"}
                >
                  {collapsedSections.automatedMigrations ? (
                    <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                {collapsedSections.automatedMigrations && (() => {
                  const now = new Date();
                  const last24h = now - (24 * 60 * 60 * 1000);
                  const last7d = now - (7 * 24 * 60 * 60 * 1000);

                  // Calculate 24h stats
                  const stats24h = automationStatus.recent_migrations ? automationStatus.recent_migrations.filter(m => {
                    const timestamp = m.timestamp.endsWith('Z') ? m.timestamp : m.timestamp + 'Z';
                    return new Date(timestamp) > last24h;
                  }) : [];
                  const success24h = stats24h.filter(m => m.status === 'completed').length;
                  const successRate24h = stats24h.length > 0 ? Math.round((success24h / stats24h.length) * 100) : 0;

                  // Calculate 7d stats
                  const stats7d = automationStatus.recent_migrations ? automationStatus.recent_migrations.filter(m => {
                    const timestamp = m.timestamp.endsWith('Z') ? m.timestamp : m.timestamp + 'Z';
                    return new Date(timestamp) > last7d;
                  }) : [];

                  return (
                    <div className="flex items-center gap-4">
                      {/* Dry run indicator */}
                      {automationStatus.dry_run && automationStatus.enabled && (
                        <div className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">DRY RUN MODE</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Combined Status & Pause/Resume Button */}
                <button
                  onClick={async () => {
                    if (!automationStatus.enabled) return;
                    try {
                      const response = await fetch('/api/automigrate/toggle-timer', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ active: !automationStatus.timer_active })
                      });
                      if (response.ok) {
                        fetchAutomationStatus();
                      } else {
                        console.error('Failed to toggle timer');
                      }
                    } catch (error) {
                      console.error('Error toggling timer:', error);
                    }
                  }}
                  disabled={!automationStatus.enabled}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors flex items-center gap-2 ${
                    !automationStatus.enabled
                      ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                      : automationStatus.timer_active
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 cursor-pointer'
                  }`}
                  title={
                    !automationStatus.enabled
                      ? 'Enable automation in settings first'
                      : automationStatus.timer_active
                      ? 'Click to pause scheduled checks'
                      : 'Click to resume scheduled checks'
                  }
                >
                  <div className={`w-2 h-2 rounded-full ${
                    !automationStatus.enabled
                      ? 'bg-gray-400'
                      : automationStatus.timer_active
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-yellow-500'
                  }`}></div>
                  {!automationStatus.enabled
                    ? 'Disabled'
                    : automationStatus.timer_active
                    ? 'Active'
                    : 'Paused'
                  }
                  {automationStatus.enabled && (
                    automationStatus.timer_active ? <Pause size={14} /> : <Play size={14} />
                  )}
                </button>

                {/* Configure Button */}
                <button
                  onClick={() => setCurrentPage('automation')}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                >
                  <Settings size={16} />
                  Configure
                </button>

                {/* Run Now Button */}
                <button
                  type="button"
                  onClick={runAutomationNow}
                  disabled={!automationStatus.enabled || runningAutomation}
                  className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                    automationStatus.enabled && !runningAutomation
                      ? 'bg-green-600 hover:bg-green-700 text-white'
                      : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                  title={!automationStatus.enabled ? "Enable automation first" : runningAutomation ? "Running..." : "Run automation check now"}
                >
                  {runningAutomation ? (
                    <>
                      <Loader size={14} className="animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Play size={14} />
                      Run Now
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.automatedMigrations && (
            <>
            {runNowMessage && (
              <div className={`mb-4 p-3 rounded-lg text-sm ${
                runNowMessage.type === 'success'
                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                  : runNowMessage.type === 'info'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                  : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    {runNowMessage.type === 'success' ? (
                      <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                    ) : runNowMessage.type === 'info' ? (
                      <Info size={16} className="mt-0.5 flex-shrink-0" />
                    ) : (
                      <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                    )}
                    <span style={{whiteSpace: 'pre-line'}}>{runNowMessage.text}</span>
                  </div>
                  <button
                    onClick={() => setRunNowMessage(null)}
                    className="flex-shrink-0 hover:opacity-70 transition-opacity"
                    aria-label="Close message"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            )}
            {automationStatus.dry_run && automationStatus.enabled && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />
                  <span className="font-semibold text-yellow-700 dark:text-yellow-300">DRY RUN MODE</span>
                  <span className="text-yellow-600 dark:text-yellow-400">- No actual migrations will be performed</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Automation Status</div>
                <div className={`flex items-center gap-2 ${
                  automationStatus.timer_active
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-gray-600 dark:text-gray-400'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    automationStatus.timer_active
                      ? 'bg-green-500 animate-pulse'
                      : 'bg-gray-400'
                  }`}></div>
                  <div className="text-sm font-semibold">
                    {automationStatus.timer_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next Check</div>
                <div className="flex items-center gap-2">
                  {(() => {
                    // Check if automated migrations are currently running
                    const hasRunningMigrations = automationStatus.in_progress_migrations &&
                      automationStatus.in_progress_migrations.some(m => m.initiated_by === 'automated');

                    // Priority 1: Show "Running" badge if migrations are active
                    if (hasRunningMigrations) {
                      return (
                        <span className="px-2 py-0.5 rounded-lg border text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                          Running
                        </span>
                      );
                    }

                    // Priority 2: Show countdown if next check time is available
                    if (automationStatus.next_check && automationStatus.enabled) {
                      const nextCheckTime = new Date(automationStatus.next_check);
                      const now = new Date();
                      const diffMs = nextCheckTime - now;
                      const diffMins = Math.floor(diffMs / 60000);

                      if (diffMins > 0) {
                        return (
                          <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                            in {diffMins} {diffMins === 1 ? 'min' : 'mins'}
                          </div>
                        );
                      } else {
                        // Show "Now" for 0 or negative (automation should be running/about to run)
                        return (
                          <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                            Now
                          </div>
                        );
                      }
                    }

                    // Priority 3: Fallback to interval display
                    return (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Every {automationStatus.check_interval_minutes} {automationStatus.check_interval_minutes === 1 ? 'min' : 'mins'}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Migration History Chart */}
            {(() => {
              const migrations = automationStatus.recent_migrations || [];
              if (migrations.length === 0) return null;

              // Group migrations by date (last 7 days)
              const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                date.setHours(0, 0, 0, 0);
                return date;
              });

              const dailyStats = last7Days.map(date => {
                const dayStart = new Date(date);
                const dayEnd = new Date(date);
                dayEnd.setHours(23, 59, 59, 999);

                const dayMigrations = migrations.filter(m => {
                  let timestamp = m.timestamp;
                  if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
                    timestamp += 'Z';
                  }
                  const migDate = new Date(timestamp);
                  return migDate >= dayStart && migDate <= dayEnd;
                });

                const successful = dayMigrations.filter(m => m.status === 'completed').length;
                const failed = dayMigrations.filter(m => m.status === 'failed').length;
                const skipped = dayMigrations.filter(m => m.status === 'skipped').length;

                return {
                  date,
                  total: dayMigrations.length,
                  successful,
                  failed,
                  skipped,
                  label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                };
              });

              const maxMigrations = Math.max(...dailyStats.map(d => d.total), 1);

              return (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Migration History (Last 7 Days)</h3>
                  <div className="flex items-end justify-between gap-1 h-32">
                    {dailyStats.map((day, idx) => {
                      const heightPercent = (day.total / maxMigrations) * 100;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                          {/* Bar */}
                          <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '100px' }}>
                            {day.total > 0 ? (
                              <>
                                {day.successful > 0 && (
                                  <div
                                    className="w-full bg-green-500 dark:bg-green-600 rounded-t"
                                    style={{ height: `${(day.successful / day.total) * heightPercent}%` }}
                                    title={`${day.successful} successful`}
                                  />
                                )}
                                {day.failed > 0 && (
                                  <div
                                    className="w-full bg-red-500 dark:bg-red-600"
                                    style={{ height: `${(day.failed / day.total) * heightPercent}%` }}
                                    title={`${day.failed} failed`}
                                  />
                                )}
                                {day.skipped > 0 && (
                                  <div
                                    className="w-full bg-yellow-500 dark:bg-yellow-600 rounded-b"
                                    style={{ height: `${(day.skipped / day.total) * heightPercent}%` }}
                                    title={`${day.skipped} skipped`}
                                  />
                                )}
                              </>
                            ) : (
                              <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded" />
                            )}
                          </div>
                          {/* Count */}
                          <div className="text-xs font-semibold text-gray-900 dark:text-white">
                            {day.total > 0 ? day.total : ''}
                          </div>
                          {/* Date Label */}
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                            {day.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Success</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Failed</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-600 rounded"></div>
                      <span className="text-gray-600 dark:text-gray-400">Skipped</span>
                    </div>
                  </div>
                </div>
              );
            })()}

            {automationStatus.state && (
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Current Window:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{automationStatus.state.current_window || 'Loading...'}</span>
                </div>
                {automationStatus.state.last_run && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Last Run:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {(() => {
                        // Handle both old string format and new object format
                        let timestamp = automationStatus.state.last_run;
                        if (typeof timestamp === 'object' && timestamp !== null) {
                          timestamp = timestamp.timestamp;
                        }
                        if (timestamp && typeof timestamp === 'string') {
                          if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
                            timestamp += 'Z'; // Assume UTC if no timezone specified
                          }
                          return new Date(timestamp).toLocaleString();
                        }
                        return 'Never';
                      })()}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* In-Progress Migrations */}
            {automationStatus.in_progress_migrations && automationStatus.in_progress_migrations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <RefreshCw size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                  Migrations In Progress
                </h4>
                <div className="space-y-2">
                  {automationStatus.in_progress_migrations.map((migration, idx) => {
                    // Calculate elapsed time with robust error handling
                    let elapsedTime = 'N/A';
                    if (migration.starttime && typeof migration.starttime === 'number' && migration.starttime > 0) {
                      try {
                        const elapsedSeconds = Math.floor(Date.now() / 1000 - migration.starttime);
                        if (elapsedSeconds >= 0) {
                          const minutes = Math.floor(elapsedSeconds / 60);
                          const seconds = elapsedSeconds % 60;
                          elapsedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                        }
                      } catch (err) {
                        console.error('Error calculating elapsed time:', err);
                      }
                    }

                    // Determine if automated or manual
                    const isAutomated = migration.initiated_by === 'automated';

                    return (
                      <div key={idx} className={`text-sm rounded p-2 border-2 animate-pulse ${
                        isAutomated
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                          : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 flex-1">
                            <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                            <span className="text-gray-500 dark:text-gray-400 text-xs">
                              {migration.source_node} → {migration.target_node || '?'}
                            </span>
                            {migration.type === 'VM' ? (
                              <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-semibold rounded border border-green-300 dark:border-green-600" title="Live migration (no downtime)">
                                LIVE
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-semibold rounded border border-orange-300 dark:border-orange-600" title="Migration with restart (brief downtime)">
                                RESTART
                              </span>
                            )}
                            {!isAutomated && (
                              <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold rounded border border-purple-300 dark:border-purple-600">
                                MANUAL
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                              isAutomated
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                            }`}>
                              <RefreshCw size={12} className="animate-spin" />
                              Running
                            </span>
                            <button
                              onClick={() => setCancelMigrationModal(migration)}
                              className="px-2 py-0.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                              title="Cancel migration"
                            >
                              <X size={12} />
                              Cancel
                            </button>
                          </div>
                        </div>
                        <div className={`mt-1 text-xs flex items-center gap-3 ${
                          isAutomated
                            ? 'text-gray-600 dark:text-gray-400'
                            : 'text-purple-600 dark:text-purple-400'
                        }`}>
                          {migration.starttime && migration.starttime > 0 ? (
                            <span>Started: {new Date(migration.starttime * 1000).toLocaleTimeString()}</span>
                          ) : (
                            <span>Started: Unknown</span>
                          )}
                          <span className={`font-semibold ${
                            isAutomated
                              ? 'text-blue-600 dark:text-blue-400'
                              : 'text-purple-600 dark:text-purple-400'
                          }`}>Elapsed: {elapsedTime}</span>
                        </div>
                        {migration.progress && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className={isAutomated ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-purple-600 dark:text-purple-400 font-semibold'}>
                                Progress: {migration.progress.percentage}%
                                {migration.progress.speed_mib_s && (
                                  <span className="ml-2 font-normal text-[10px]">
                                    ({migration.progress.speed_mib_s.toFixed(1)} MiB/s)
                                  </span>
                                )}
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                                {migration.progress.human_readable}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isAutomated
                                    ? 'bg-blue-600 dark:bg-blue-500'
                                    : 'bg-purple-600 dark:bg-purple-500'
                                }`}
                                style={{ width: `${migration.progress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Last Run Summary - Collapsible */}
            {automationStatus.state?.last_run && typeof automationStatus.state.last_run === 'object' && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setCollapsedSections(prev => ({...prev, lastRunSummary: !prev.lastRunSummary}))}
                  className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <ClipboardList size={16} className="text-blue-600 dark:text-blue-400" />
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Last Run Summary</h4>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(automationStatus.state.last_run.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {collapsedSections.lastRunSummary ? (
                    <ChevronDown size={18} className="text-gray-500" />
                  ) : (
                    <ChevronUp size={18} className="text-gray-500" />
                  )}
                </button>

                {!collapsedSections.lastRunSummary && (
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    {/* Run Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</div>
                        <div className={`text-sm font-bold ${
                          automationStatus.state.last_run.status === 'success' ? 'text-green-600 dark:text-green-400' :
                          automationStatus.state.last_run.status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                          automationStatus.state.last_run.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                          'text-gray-600 dark:text-gray-400'
                        }`}>
                          {automationStatus.state.last_run.status === 'success' ? '✓ Success' :
                           automationStatus.state.last_run.status === 'partial' ? '◐ Partial' :
                           automationStatus.state.last_run.status === 'failed' ? '✗ Failed' :
                           automationStatus.state.last_run.status === 'no_action' ? '○ No Action' :
                           automationStatus.state.last_run.status}
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Migrations</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.migrations_successful || 0} / {automationStatus.state.last_run.migrations_executed || 0}
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.duration_seconds ? `${Math.floor(automationStatus.state.last_run.duration_seconds / 60)}m ${automationStatus.state.last_run.duration_seconds % 60}s` : 'N/A'}
                        </div>
                      </div>
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mode</div>
                        <div className="text-sm font-bold text-gray-900 dark:text-white">
                          {automationStatus.state.last_run.mode === 'dry_run' ? '🧪 Dry Run' : '🚀 Live'}
                        </div>
                      </div>
                    </div>

                    {/* Decision Details */}
                    {automationStatus.state.last_run.decisions && automationStatus.state.last_run.decisions.length > 0 && (
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3 mb-3 max-h-64 overflow-y-auto">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Decisions Made:</div>
                        <div className="space-y-2">
                          {[...automationStatus.state.last_run.decisions].sort((a, b) => {
                            // Sort by priority: executed/pending first, then skipped by rank, then filtered last
                            const getOrder = (d) => {
                              if (d.action === 'executed' || d.action === 'pending' || d.action === 'failed') return 0;
                              if (d.action === 'skipped') return 1;
                              return 2; // filtered
                            };
                            const orderA = getOrder(a);
                            const orderB = getOrder(b);
                            if (orderA !== orderB) return orderA - orderB;
                            // Within same group, sort by priority rank
                            return (a.priority_rank || 999) - (b.priority_rank || 999);
                          }).map((decision, idx) => {
                            const isExecuted = decision.action === 'executed' || decision.action === 'failed';
                            const isPending = decision.action === 'pending';
                            const borderColor = isExecuted ? 'border-green-500' :
                                               isPending ? 'border-blue-500' :
                                               decision.action === 'skipped' ? 'border-yellow-500' :
                                               'border-gray-400';
                            const bgColor = isExecuted ? 'bg-green-50 dark:bg-green-900/20' :
                                           isPending ? 'bg-blue-50 dark:bg-blue-900/20' :
                                           'bg-gray-50 dark:bg-gray-700';

                            return (
                              <div key={idx} className={`text-xs ${bgColor} rounded p-2 border-l-4 ${borderColor} ${isPending ? 'animate-pulse' : ''}`}>
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {/* Priority Rank Badge */}
                                      {decision.priority_rank && (
                                        <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                          decision.priority_rank === 1
                                            ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                                            : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                                        }`}>
                                          #{decision.priority_rank}
                                        </span>
                                      )}

                                      <span className="font-semibold text-gray-900 dark:text-white">
                                        {decision.action === 'filtered' ? '⊗' :
                                         decision.action === 'skipped' ? '⏭' :
                                         decision.action === 'pending' ? '🔄' :
                                         decision.action === 'executed' ? '✅' : '✗'} {decision.name || `VM/CT ${decision.vmid}`}
                                      </span>

                                      {decision.type && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                          {decision.type}
                                        </span>
                                      )}

                                      {decision.distribution_balancing && (
                                        <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" title="Distribution Balancing">
                                          ⚖️ Balance
                                        </span>
                                      )}
                                    </div>

                                    <span className="text-gray-600 dark:text-gray-400">
                                      {decision.source_node} → {decision.target_node}
                                      {decision.target_node_score && ` (score: ${decision.target_node_score})`}
                                    </span>
                                  </div>

                                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    decision.action === 'executed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                    decision.action === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                    decision.action === 'skipped' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                    decision.action === 'filtered' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                  }`}>
                                    {decision.action}
                                  </span>
                                </div>

                                {/* Show selected_reason for executed, regular reason for others */}
                                <div className="mt-1 text-gray-600 dark:text-gray-400">
                                  {decision.selected_reason || decision.reason}
                                </div>

                                {decision.confidence_score && (
                                  <div className="mt-1 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                                    Confidence: {decision.confidence_score}%
                                  </div>
                                )}

                                {decision.error && (
                                  <div className="mt-1 text-red-600 dark:text-red-400 text-[10px]">
                                    Error: {decision.error}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Safety Checks */}
                    {automationStatus.state.last_run.safety_checks && (
                      <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                        <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Safety Checks:</div>
                        <div className="grid grid-cols-1 gap-2 text-xs">
                          <div className="flex items-start gap-2">
                            <CheckCircle size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white">Migration Window</div>
                              <div className="text-gray-600 dark:text-gray-400">{automationStatus.state.last_run.safety_checks.migration_window}</div>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <CheckCircle size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 dark:text-white">Cluster Health</div>
                              <div className="text-gray-600 dark:text-gray-400">{automationStatus.state.last_run.safety_checks.cluster_health}</div>
                            </div>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400">
                            <span className="font-semibold text-gray-900 dark:text-white">Running migrations:</span> {automationStatus.state.last_run.safety_checks.running_migrations || 0}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 recent-auto-migrations">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Auto-Migrations</h4>
                  <button
                    onClick={() => {
                      // Export migration history to CSV
                      const migrations = automationStatus.recent_migrations || [];
                      if (migrations.length === 0) return;

                      // CSV headers
                      const headers = ['Timestamp', 'VM ID', 'VM Name', 'Source Node', 'Target Node', 'Suitability %', 'Reason', 'Confidence Score', 'Status', 'Duration (s)', 'Dry Run', 'Window'];

                      // CSV rows
                      const rows = migrations.map(m => [
                        m.timestamp || '',
                        m.vmid || '',
                        m.name || '',
                        m.source_node || '',
                        m.target_node || '',
                        m.suitability_rating || m.target_node_score || '',
                        (m.reason || '').replace(/,/g, ';'), // Replace commas in reason
                        m.confidence_score || '',
                        m.status || '',
                        m.duration_seconds || '',
                        m.dry_run ? 'Yes' : 'No',
                        (m.window_name || '').replace(/,/g, ';')
                      ]);

                      // Combine headers and rows
                      const csv = [
                        headers.join(','),
                        ...rows.map(row => row.join(','))
                      ].join('\n');

                      // Create download link
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `proxbalance-migrations-${new Date().toISOString().split('T')[0]}.csv`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                    title="Export migration history to CSV"
                  >
                    <Download size={12} />
                    Export CSV
                  </button>
                </div>
                <div className="space-y-2">
                  {(() => {
                    // Deduplicate migrations by VMID+source+target, keeping only the most recent
                    const seen = new Map();
                    const uniqueMigrations = [];

                    // Sort by timestamp descending (most recent first)
                    const sortedMigrations = [...automationStatus.recent_migrations].sort((a, b) => {
                      return new Date(b.timestamp) - new Date(a.timestamp);
                    });

                    // Keep only first occurrence of each VMID+source+target combo
                    for (const migration of sortedMigrations) {
                      const key = `${migration.vmid}-${migration.source_node}-${migration.target_node}`;
                      if (!seen.has(key)) {
                        seen.set(key, true);
                        uniqueMigrations.push(migration);
                      }
                    }

                    return uniqueMigrations.slice(0, 3);
                  })().map((migration) => {

                    // Format timestamp
                    let timeDisplay = '';
                    if (migration.timestamp) {
                      try {
                        // Parse timestamp - add 'Z' if not present to indicate UTC
                        const timestamp = migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z';
                        const migrationDate = new Date(timestamp);
                        const now = new Date();
                        const diffMs = now - migrationDate;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);
                        const diffDays = Math.floor(diffMs / 86400000);

                        if (diffMins < 1) {
                          timeDisplay = 'Just now';
                        } else if (diffMins < 60) {
                          timeDisplay = `${diffMins}m ago`;
                        } else if (diffHours < 24) {
                          timeDisplay = `${diffHours}h ago`;
                        } else if (diffDays < 7) {
                          timeDisplay = `${diffDays}d ago`;
                        } else {
                          timeDisplay = migrationDate.toLocaleDateString();
                        }
                      } catch (e) {
                        timeDisplay = '';
                      }
                    }

                    return (
                    <div key={migration.id} className="text-sm bg-white dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                          <span className="text-gray-500 dark:text-gray-400 text-xs">
                            {migration.source_node} → {migration.target_node}
                            {(migration.suitability_rating !== undefined || migration.target_node_score !== undefined) && (() => {
                              // Convert raw penalty score to suitability percentage
                              const suitabilityPercent = migration.suitability_rating !== undefined
                                ? migration.suitability_rating
                                : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));

                              return (
                              <span className="ml-1 text-[10px] inline-flex items-center gap-1">
                                <span className="text-gray-600 dark:text-gray-400">Score:</span>{' '}
                                <span className={`font-semibold ${
                                  suitabilityPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                                  suitabilityPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                  suitabilityPercent >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                  'text-red-600 dark:text-red-400'
                                }`}>
                                  {suitabilityPercent}%
                                </span>
                                <span className="relative group inline-block">
                                  <Info size={10} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                                    <div className="font-semibold mb-1 text-blue-400">Scoring Breakdown</div>
                                    <div className="text-[10px] space-y-0.5">
                                      <div>Target: {migration.target_node}</div>
                                      <div>Penalty Score: {migration.target_node_score?.toFixed(1) || 'N/A'}</div>
                                      <div>Suitability: {suitabilityPercent}%</div>
                                      <div className="border-t border-gray-700 pt-1 mt-1">
                                        <div className="text-gray-400">Lower penalty = better target</div>
                                        <div>• CPU Load × 30%</div>
                                        <div>• Memory Load × 30%</div>
                                        <div>• IOWait × 20%</div>
                                        <div>• Load Avg × 10%</div>
                                        <div>• Storage Pressure × 10%</div>
                                        <div className="mt-1 text-gray-400">+ Penalties for high usage/trends</div>
                                      </div>
                                      {migration.target_node_score > 100 && (
                                        <div className="border-t border-gray-700 pt-1 mt-1 text-red-400">
                                          ⚠ Penalty score &gt;100 indicates heavy load/trends
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </span>
                              </span>
                              );
                            })()}
                          </span>
                          {migration.dry_run && (
                            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                              DRY RUN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {timeDisplay && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {timeDisplay}
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                            migration.status === 'completed'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : migration.status === 'failed'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : migration.status === 'skipped'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : migration.status === 'timeout'
                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {migration.status === 'completed' && <CheckCircle size={12} />}
                            {migration.status === 'failed' && <XCircle size={12} />}
                            {migration.status === 'skipped' && <AlertTriangle size={12} />}
                            {migration.status === 'timeout' && <Clock size={12} />}
                            {migration.status}
                          </span>
                        </div>
                      </div>
                      {migration.reason && (
                        <div className="mt-1 flex items-center gap-3">
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {migration.reason}
                          </span>
                          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                            {migration.confidence_score !== undefined && (
                              <span title="Penalty point reduction achieved by this migration">
                                Improvement: +{(migration.confidence_score / 2).toFixed(1)}
                              </span>
                            )}
                            {migration.duration_seconds !== undefined && migration.duration_seconds > 0 && (
                              <>
                                <span className="text-gray-400 dark:text-gray-600">•</span>
                                <span title="Migration Duration">
                                  Duration: {migration.duration_seconds}s
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                      {/* Error Message for Failed Migrations */}
                      {migration.status === 'failed' && (
                        <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded flex items-start gap-2">
                          <XCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                          <div className="text-xs text-red-800 dark:text-red-300 flex-1">
                            <span className="font-semibold">Error:</span> {migration.error || 'Migration failed (check logs for details)'}
                          </div>
                        </div>
                      )}
                      {/* Rollback Detection */}
                      {(() => {
                        // Only show rollback warning if rollback detection is enabled in settings
                        if (!automationConfig?.rules?.rollback_detection_enabled) {
                          return null;
                        }

                        // Use configured rollback window (default 24 hours if not set)
                        const rollbackWindowHours = automationConfig?.rules?.rollback_window_hours || 24;
                        const rollbackWindow = rollbackWindowHours * 60 * 60 * 1000; // Convert to ms
                        const currentTime = new Date(migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z');

                        // Find potential rollback - look for migration where this VM went back
                        const rollback = automationStatus.recent_migrations.find(m => {
                          if (m.vmid !== migration.vmid) return false;
                          if (m.id === migration.id) return false;

                          // Check if it's a rollback (went from target back to source)
                          const isRollback = m.source_node === migration.target_node && m.target_node === migration.source_node;

                          // Check time window
                          const mTime = new Date(m.timestamp.endsWith('Z') ? m.timestamp : m.timestamp + 'Z');
                          const timeDiff = Math.abs(mTime - currentTime);
                          const withinWindow = timeDiff < rollbackWindow;

                          return isRollback && withinWindow;
                        });

                        if (rollback) {
                          return (
                            <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded flex items-start gap-2">
                              <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                              <div className="text-xs text-orange-800 dark:text-orange-300">
                                <span className="font-semibold">Rollback Detected:</span> This VM was migrated back to its original node within {rollbackWindowHours} hour{rollbackWindowHours !== 1 ? 's' : ''}. This may indicate a problem with the target node or migration configuration.
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Past Automation Runs */}
            {runHistory.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                  <Clock size={14} />
                  Past Automation Runs
                </h4>
                <div className="space-y-2">
                  {runHistory.slice(0, 5).map((run, idx) => {
                    const isExpanded = expandedRun === run.timestamp;

                    // Format timestamp
                    let timeDisplay = '';
                    try {
                      const timestamp = run.timestamp.endsWith('Z') ? run.timestamp : run.timestamp + 'Z';
                      const runDate = new Date(timestamp);
                      const now = new Date();
                      const diffMs = now - runDate;
                      const diffMins = Math.floor(diffMs / 60000);
                      const diffHours = Math.floor(diffMs / 3600000);
                      const diffDays = Math.floor(diffMs / 86400000);

                      if (diffMins < 1) {
                        timeDisplay = 'Just now';
                      } else if (diffMins < 60) {
                        timeDisplay = `${diffMins}m ago`;
                      } else if (diffHours < 24) {
                        timeDisplay = `${diffHours}h ago`;
                      } else if (diffDays < 7) {
                        timeDisplay = `${diffDays}d ago`;
                      } else {
                        timeDisplay = runDate.toLocaleDateString();
                      }
                    } catch (e) {
                      timeDisplay = '';
                    }

                    return (
                      <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 border border-gray-200 dark:border-gray-700">
                        <div
                          className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded p-1 transition-colors"
                          onClick={() => setExpandedRun(isExpanded ? null : run.timestamp)}
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronDown size={14} className="text-gray-600 dark:text-gray-400" /> : <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />}
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                              {timeDisplay}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                              run.status === 'success'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : run.status === 'partial'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                : run.status === 'no_action'
                                ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                            }`}>
                              {run.status}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                            <span>{run.migrations_executed || 0} migration{run.migrations_executed !== 1 ? 's' : ''}</span>
                            <span>{run.duration_seconds || 0}s</span>
                          </div>
                        </div>

                        {isExpanded && run.decisions && run.decisions.length > 0 && (
                          <div className="mt-2 pl-5 space-y-1">
                            <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                              Decisions ({run.decisions.length})
                            </div>
                            {run.decisions.map((decision, didx) => (
                              <div key={didx} className={`text-xs p-1.5 rounded ${
                                decision.action === 'executed'
                                  ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                                  : decision.action === 'pending'
                                  ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                  : decision.action === 'skipped'
                                  ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700'
                                  : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1">
                                    {decision.action === 'executed' && <CheckCircle size={10} className="text-green-600 dark:text-green-400" />}
                                    {decision.action === 'pending' && <RefreshCw size={10} className="text-blue-600 dark:text-blue-400" />}
                                    {decision.action === 'skipped' && <Minus size={10} className="text-yellow-600 dark:text-yellow-400" />}
                                    {decision.action === 'filtered' && <XCircle size={10} className="text-gray-600 dark:text-gray-400" />}
                                    <span className="font-medium text-gray-900 dark:text-gray-100">{decision.name}</span>
                                    <span className="text-gray-500 dark:text-gray-400">({decision.vmid})</span>
                                    {decision.distribution_balancing && (
                                      <span className="ml-1" title="Distribution Balancing">⚖️</span>
                                    )}
                                  </div>
                                  {decision.priority_rank && (
                                    <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                      #{decision.priority_rank}
                                    </span>
                                  )}
                                </div>
                                {decision.reason && (
                                  <div className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5">
                                    {decision.reason}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Activity Log */}
            {automationStatus.state?.activity_log && automationStatus.state.activity_log.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Activity Log (Last Check)</h4>
                <div className="space-y-2">
                  {automationStatus.state.activity_log.slice(0, 10).map((activity, idx) => {
                    // Format timestamp
                    let timeDisplay = '';
                    if (activity.timestamp) {
                      try {
                        const timestamp = activity.timestamp.endsWith('Z') ? activity.timestamp : activity.timestamp + 'Z';
                        const activityDate = new Date(timestamp);
                        const now = new Date();
                        const diffMs = now - activityDate;
                        const diffMins = Math.floor(diffMs / 60000);
                        const diffHours = Math.floor(diffMs / 3600000);

                        if (diffMins < 1) {
                          timeDisplay = 'Just now';
                        } else if (diffMins < 60) {
                          timeDisplay = `${diffMins}m ago`;
                        } else if (diffHours < 24) {
                          timeDisplay = `${diffHours}h ago`;
                        } else {
                          timeDisplay = activityDate.toLocaleDateString();
                        }
                      } catch (e) {
                        timeDisplay = '';
                      }
                    }

                    const isSkipped = activity.action === 'skipped';

                    return (
                      <div key={idx} className="text-xs bg-white dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600 flex items-center gap-2" title={activity.reason}>
                        {isSkipped && <MinusCircle size={14} className="text-yellow-600 dark:text-yellow-400 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-white">{activity.name}</span>
                            <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                              SKIPPED
                            </span>
                          </div>
                          <div className="text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                            {activity.reason}
                          </div>
                        </div>
                        {timeDisplay && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                            {timeDisplay}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            </>
            )}
          </div>
        )}


        {data && (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg shadow-md shrink-0">
                  <Tag size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Guest Tag Management</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Manage ignore tags and affinity rules for all guests</p>
                </div>
                <button
                  onClick={() => toggleSection('taggedGuests')}
                  className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  title={collapsedSections.taggedGuests ? "Expand section" : "Collapse section"}
                >
                  {collapsedSections.taggedGuests ? (
                    <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {collapsedSections.taggedGuests ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded">
                  <HardDrive size={18} className="text-gray-600 dark:text-gray-400" />
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Total Guests</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{Object.keys(data.guests).length} guests</div>
                  </div>
                </div>
                {ignoredGuests.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded">
                    <Shield size={18} className="text-yellow-600 dark:text-yellow-400" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Ignored</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{ignoredGuests.length} guest{ignoredGuests.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}
                {excludeGuests.length > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded">
                    <Shield size={18} className="text-blue-600 dark:text-blue-400" />
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white">Affinity Rules</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{excludeGuests.length} guest{excludeGuests.length !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                {/* Search and controls */}
                <div className="mb-4 flex flex-wrap gap-2 sm:gap-3 items-center justify-between">
                  <div className="flex-1 min-w-[150px] sm:min-w-[200px]">
                    <input
                      type="text"
                      placeholder="Search guests by ID, name, node..."
                      value={guestSearchFilter}
                      onChange={(e) => {
                        setGuestSearchFilter(e.target.value);
                        setGuestCurrentPage(1);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Per page:</span>
                    <select
                      value={guestPageSize}
                      onChange={(e) => {
                        setGuestPageSize(Number(e.target.value));
                        setGuestCurrentPage(1);
                      }}
                      className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                    >
                      <option value="10">10</option>
                      <option value="25">25</option>
                      <option value="50">50</option>
                      <option value="100">100</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th
                          onClick={() => {
                            if (guestSortField === 'type') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('type');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Type
                            {guestSortField === 'type' && (
                              <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'vmid') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('vmid');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className="hidden sm:table-cell text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        >
                          <div className="flex items-center gap-1">
                            ID
                            {guestSortField === 'vmid' && (
                              <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'name') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('name');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Name
                            {guestSortField === 'name' && (
                              <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'node') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('node');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Node
                            {guestSortField === 'node' && (
                              <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'status') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('status');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Status
                            {guestSortField === 'status' && (
                              <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          onClick={() => {
                            if (guestSortField === 'tags') {
                              setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                            } else {
                              setGuestSortField('tags');
                              setGuestSortDirection('asc');
                            }
                          }}
                          className="hidden sm:table-cell text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                        >
                          <div className="flex items-center gap-1">
                            Tags
                            {guestSortField === 'tags' && (
                              <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        {canMigrate && <th className="hidden sm:table-cell text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {(() => {
                        // Filter guests
                        let filteredGuests = Object.values(data.guests);
                        if (guestSearchFilter) {
                          const searchLower = guestSearchFilter.toLowerCase();
                          filteredGuests = filteredGuests.filter(guest =>
                            guest.vmid.toString().includes(searchLower) ||
                            (guest.name || '').toLowerCase().includes(searchLower) ||
                            guest.node.toLowerCase().includes(searchLower) ||
                            guest.type.toLowerCase().includes(searchLower) ||
                            guest.status.toLowerCase().includes(searchLower)
                          );
                        }

                        // Sort guests
                        filteredGuests.sort((a, b) => {
                          let aVal, bVal;
                          switch (guestSortField) {
                            case 'vmid':
                              aVal = a.vmid;
                              bVal = b.vmid;
                              break;
                            case 'name':
                              aVal = (a.name || '').toLowerCase();
                              bVal = (b.name || '').toLowerCase();
                              break;
                            case 'node':
                              aVal = a.node.toLowerCase();
                              bVal = b.node.toLowerCase();
                              break;
                            case 'type':
                              aVal = a.type.toLowerCase();
                              bVal = b.type.toLowerCase();
                              break;
                            case 'status':
                              aVal = a.status.toLowerCase();
                              bVal = b.status.toLowerCase();
                              break;
                            case 'tags':
                              // Sort by tag count (has_ignore + exclude_groups count)
                              // Then by first tag alphabetically
                              const aTagCount = (a.tags.has_ignore ? 1 : 0) + a.tags.exclude_groups.length;
                              const bTagCount = (b.tags.has_ignore ? 1 : 0) + b.tags.exclude_groups.length;
                              if (aTagCount !== bTagCount) {
                                aVal = aTagCount;
                                bVal = bTagCount;
                              } else {
                                // Same tag count, sort by tag name
                                const aFirstTag = a.tags.has_ignore ? 'ignore' : (a.tags.exclude_groups[0] || '');
                                const bFirstTag = b.tags.has_ignore ? 'ignore' : (b.tags.exclude_groups[0] || '');
                                aVal = aFirstTag.toLowerCase();
                                bVal = bFirstTag.toLowerCase();
                              }
                              break;
                            default:
                              aVal = a.vmid;
                              bVal = b.vmid;
                          }

                          if (guestSortDirection === 'asc') {
                            return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                          } else {
                            return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                          }
                        });

                        // Pagination
                        const totalGuests = filteredGuests.length;
                        const totalPages = Math.ceil(totalGuests / guestPageSize);
                        const startIndex = (guestCurrentPage - 1) * guestPageSize;
                        const endIndex = startIndex + guestPageSize;
                        const paginatedGuests = filteredGuests.slice(startIndex, endIndex);

                        return (
                          <>
                            {paginatedGuests.map(guest => (
                      <tr key={guest.vmid} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            guest.type === 'VM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          }`}>
                            {guest.type}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell p-3 text-sm font-mono text-gray-900 dark:text-white">{guest.vmid}</td>
                        <td className="p-3 text-sm text-gray-900 dark:text-white">{guest.name}</td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{guest.node}</td>
                        <td className="p-3">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${
                            guest.status === 'migrating' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                            guest.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                            'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                            {guest.status === 'migrating' && (
                              <Loader size={12} className="animate-spin" />
                            )}
                            {guest.status}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell p-3">
                          <div className="flex flex-wrap gap-1">
                            {guest.tags.has_ignore && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">
                                ignore
                                {canMigrate && (
                                  <button
                                    onClick={() => handleRemoveTag(guest, 'ignore')}
                                    className="hover:bg-yellow-300 dark:hover:bg-yellow-700 rounded-full p-0.5"
                                    title="Remove ignore tag"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            )}
                            {guest.tags.all_tags?.includes('auto_migrate_ok') && (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded font-medium">
                                auto_migrate_ok
                                {canMigrate && (
                                  <button
                                    onClick={() => handleRemoveTag(guest, 'auto_migrate_ok')}
                                    className="hover:bg-green-300 dark:hover:bg-green-700 rounded-full p-0.5"
                                    title="Remove auto_migrate_ok tag"
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            )}
                            {guest.tags.exclude_groups.map(tag => (
                              <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium">
                                {tag}
                                {canMigrate && (
                                  <button
                                    onClick={() => handleRemoveTag(guest, tag)}
                                    className="hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                                    title={`Remove tag "${tag}"`}
                                  >
                                    <X size={12} />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        {canMigrate && (
                          <td className="hidden sm:table-cell p-3">
                            <button
                              onClick={() => {
                                setTagModalGuest(guest);
                                setShowTagModal(true);
                              }}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                              title="Add tag"
                            >
                              <Plus size={12} />
                              Add
                            </button>
                          </td>
                        )}
                      </tr>
                            ))}
                          </>
                        );
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* Pagination controls */}
                {(() => {
                  const filteredGuestsCount = guestSearchFilter
                    ? Object.values(data.guests).filter(guest => {
                        const searchLower = guestSearchFilter.toLowerCase();
                        return guest.vmid.toString().includes(searchLower) ||
                          (guest.name || '').toLowerCase().includes(searchLower) ||
                          guest.node.toLowerCase().includes(searchLower) ||
                          guest.type.toLowerCase().includes(searchLower) ||
                          guest.status.toLowerCase().includes(searchLower);
                      }).length
                    : Object.keys(data.guests).length;

                  const totalPages = Math.ceil(filteredGuestsCount / guestPageSize);

                  if (totalPages <= 1) return null;

                  const startIndex = (guestCurrentPage - 1) * guestPageSize + 1;
                  const endIndex = Math.min(guestCurrentPage * guestPageSize, filteredGuestsCount);

                  return (
                    <div className="mt-4 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        Showing {startIndex}-{endIndex} of {filteredGuestsCount} guests
                      </div>
                      <div className="flex items-center gap-1 sm:gap-2">
                        <button
                          onClick={() => setGuestCurrentPage(1)}
                          disabled={guestCurrentPage === 1}
                          className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          First
                        </button>
                        <button
                          onClick={() => setGuestCurrentPage(guestCurrentPage - 1)}
                          disabled={guestCurrentPage === 1}
                          className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Prev
                        </button>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {guestCurrentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setGuestCurrentPage(guestCurrentPage + 1)}
                          disabled={guestCurrentPage === totalPages}
                          className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Next
                        </button>
                        <button
                          onClick={() => setGuestCurrentPage(totalPages)}
                          disabled={guestCurrentPage === totalPages}
                          className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Last
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {data && (
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
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        clusterMapViewMode === 'cpu'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      CPU
                    </button>
                    <button
                      onClick={() => setClusterMapViewMode('memory')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        clusterMapViewMode === 'memory'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Memory
                    </button>
                    <button
                      onClick={() => setClusterMapViewMode('allocated')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        clusterMapViewMode === 'allocated'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Allocated
                    </button>
                    <button
                      onClick={() => setClusterMapViewMode('disk_io')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        clusterMapViewMode === 'disk_io'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Disk I/O
                    </button>
                    <button
                      onClick={() => setClusterMapViewMode('network')}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        clusterMapViewMode === 'network'
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                      }`}
                    >
                      Network
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
        )}

        {/* Node Details Modal (from Cluster Map click) */}
        {selectedNode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={() => setSelectedNode(null)}>
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
        )}

        {/* Guest Details Modal (from Cluster Map click) */}
        {selectedGuestDetails && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={() => setSelectedGuestDetails(null)}>
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
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setSelectedGuestDetails(null)}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium"
                >
                  Close
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
        )}

        {/* Global Evacuation Plan Modal */}
        {evacuationPlan && planNode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => {
            setEvacuationPlan(null);
            setPlanNode(null);
            setGuestTargets({});
          }}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
                  Evacuation Plan for {evacuationPlan.source_node}
                </h3>
                <button
                  onClick={() => {
                    setEvacuationPlan(null);
                    setPlanNode(null);
                    setGuestTargets({});
                  }}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
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
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">VM/CT</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Storage</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Target</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Will Restart?</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {evacuationPlan.plan.map((item) => (
                        <tr key={item.vmid} className={item.skipped ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.vmid}</td>
                          <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.name}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded ${
                              item.type === 'qemu' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                              item.type === 'lxc' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`}>
                              {item.type === 'qemu' ? 'VM' : item.type === 'lxc' ? 'CT' : 'Unknown'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {item.storage_volumes && item.storage_volumes.length > 0 ? (
                              <span className={`text-xs ${!item.storage_compatible ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                {item.storage_volumes.join(', ')}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">none</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 text-xs rounded ${
                              item.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                              item.status === 'stopped' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' :
                              'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
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
                                className="text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
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
                              <span className="text-xs text-gray-400 dark:text-gray-500 italic">N/A</span>
                            ) : (
                              <select
                                value={guestActions[item.vmid] || 'migrate'}
                                onChange={(e) => setGuestActions({...guestActions, [item.vmid]: e.target.value})}
                                className="text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
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
                  <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Important Notes:</h4>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                    <li>Running VMs will use live migration (no downtime)</li>
                    <li>Running containers will restart during migration (brief downtime)</li>
                    <li>Stopped VMs/CTs will be moved without starting</li>
                    <li>Migrations are performed one at a time to avoid overloading hosts</li>
                    <li>Available target nodes: {evacuationPlan.available_targets.join(', ')}</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => {
                    setEvacuationPlan(null);
                    setPlanNode(null);
                    setGuestActions({});
                    setGuestTargets({});
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
                >
                  Review & Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Confirmation Modal */}
        {showConfirmModal && evacuationPlan && planNode && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmModal(false)}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Confirm Evacuation</h3>
                <button onClick={() => setShowConfirmModal(false)}>
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
                          <h4 className="text-lg font-semibold text-gray-600 mb-2">Ignore ({toIgnore.length})</h4>
                          <div className="text-sm text-gray-600">
                            {toIgnore.map(item => item.vmid).join(', ')}
                          </div>
                        </div>
                      )}
                      {toPowerOff.length > 0 && (
                        <div>
                          <h4 className="text-lg font-semibold text-red-600 mb-2">Power Off ({toPowerOff.length})</h4>
                          <div className="text-sm text-gray-600">
                            {toPowerOff.map(item => item.vmid).join(', ')}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                >
                  Cancel
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
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                >
                  Confirm Evacuation
                </button>
              </div>
            </div>
          </div>
        )}


        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg shadow-md shrink-0">
                <HardDrive size={24} className="text-white" />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Node Status</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Detailed node metrics</p>
              </div>
              <button
                onClick={() => toggleSection('nodeStatus')}
                className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                title={collapsedSections.nodeStatus ? "Expand section" : "Collapse section"}
              >
                {collapsedSections.nodeStatus ? (
                  <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Grid:</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(cols => (
                    <button
                      key={cols}
                      onClick={() => setNodeGridColumns(cols)}
                      className={`px-3 py-1 text-sm rounded transition-colors ${
                        nodeGridColumns === cols
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }`}
                      title={`${cols} column${cols > 1 ? 's' : ''}`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 dark:text-gray-400">Chart Period:</label>
                <select
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="1h">1 Hour</option>
                  <option value="6h">6 Hours</option>
                  <option value="12h">12 Hours</option>
                  <option value="24h">24 Hours</option>
                  <option value="7d">7 Days</option>
                  <option value="30d">30 Days</option>
                  <option value="1y">1 Year</option>
                </select>
              </div>
            </div>
          </div>

          {collapsedSections.nodeStatus ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {Object.values(data.nodes).map(node => (
                <div key={node.name} className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                    <span className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={node.status}></span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {/* CPU with sparkline */}
                    <div className="relative">
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                        <span className="font-semibold text-blue-600 dark:text-blue-400">
                          {(node.cpu_percent || 0).toFixed(1)}%
                        </span>
                      </div>
                      <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-blue-500"
                          points={generateSparkline(node.cpu_percent || 0, 100, 30, 0.3)}
                        />
                      </svg>
                    </div>

                    {/* Memory with sparkline */}
                    <div className="relative">
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {(node.mem_percent || 0).toFixed(1)}%
                        </span>
                      </div>
                      <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-purple-500"
                          points={generateSparkline(node.mem_percent || 0, 100, 30, 0.25)}
                        />
                      </svg>
                    </div>

                    {/* IOWait with sparkline */}
                    <div className="relative">
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-gray-600 dark:text-gray-400">IOWait:</span>
                        <span className="font-semibold text-orange-600 dark:text-orange-400">
                          {(node.metrics?.current_iowait || 0).toFixed(1)}%
                        </span>
                      </div>
                      <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="4"
                          className="text-orange-500"
                          points={generateSparkline(node.metrics?.current_iowait || 0, 100, 30, 0.35)}
                        />
                      </svg>
                    </div>

                    <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                      <span className="text-gray-600 dark:text-gray-400">Suitability:</span>
                      <span className={`font-semibold ${
                        nodeScores && nodeScores[node.name] ? (
                          nodeScores[node.name].suitability_rating >= 70 ? 'text-green-600 dark:text-green-400' :
                          nodeScores[node.name].suitability_rating >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                          nodeScores[node.name].suitability_rating >= 30 ? 'text-orange-600 dark:text-orange-400' :
                          'text-red-600 dark:text-red-400'
                        ) : 'text-gray-900 dark:text-white'
                      }`}>
                        {nodeScores && nodeScores[node.name] ? `${nodeScores[node.name].suitability_rating}%` : 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Guests:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{node.guests?.length || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
          <div className={`grid gap-4 transition-all duration-300 ease-in-out ${
            nodeGridColumns === 1 ? 'grid-cols-1' :
            nodeGridColumns === 2 ? 'grid-cols-1 lg:grid-cols-2' :
            nodeGridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
            'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
          }`}>
            {Object.values(data.nodes).map(node => (
              <div key={node.name} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                  <span className={`text-sm font-medium ${node.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{node.status}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-sm mb-4">
                  <div><span className="text-gray-600 dark:text-gray-400">CPU:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{(node.cpu_percent || 0).toFixed(1)}%</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">Memory:</span> <span className="font-semibold text-purple-600 dark:text-purple-400">{(node.mem_percent || 0).toFixed(1)}%</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">IOWait:</span> <span className="font-semibold text-orange-600 dark:text-orange-400">{(node.metrics?.current_iowait || 0).toFixed(1)}%</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">Cores:</span> <span className="font-semibold text-gray-900 dark:text-white">{node.cpu_cores || 0}</span></div>
                  <div><span className="text-gray-600 dark:text-gray-400">Guests:</span> <span className="font-semibold text-gray-900 dark:text-white">{node.guests?.length || 0}</span></div>
                </div>

                {node.trend_data && typeof node.trend_data === 'object' && Object.keys(node.trend_data).length > 0 && (
                  <div className="mt-4" style={{height: '200px'}}>
                    <canvas id={`chart-${node.name}`}></canvas>
                  </div>
                )}
              </div>
            ))}
          </div>
          )}
        </div>

        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-24 overflow-hidden">
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-y-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg shadow-md shrink-0">
                  <Activity size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Migration Recommendations</h2>
                    <button
                      onClick={() => toggleSection('recommendations')}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200"
                      title={collapsedSections.recommendations ? "Expand section" : "Collapse section"}
                    >
                      {collapsedSections.recommendations ? (
                        <ChevronDown size={20} className="text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronUp size={20} className="text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Suggested optimizations</p>
                    {recommendationData?.ai_enhanced && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 border border-purple-300 dark:border-purple-600 rounded text-xs font-semibold text-purple-700 dark:text-purple-300">
                        AI Enhanced
                      </span>
                    )}
                    {recommendationData?.generated_at && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        • Generated: {(() => {
                          const genTime = new Date(recommendationData.generated_at);
                          return formatLocalTime(genTime);
                        })()} (backend auto-generates every 10-60min based on cluster size)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={generateRecommendations}
                  disabled={loadingRecommendations || !data}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                  title="Manually generate new recommendations now"
                >
                  {loadingRecommendations ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      Generate Now
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Score-Based Recommendation Info */}
            {!collapsedSections.recommendations && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
                <button
                  onClick={() => setCollapsedSections(prev => ({ ...prev, scoringInfo: !prev.scoringInfo }))}
                  className="w-full p-4 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">Penalty-Based Scoring System</span>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-blue-600 dark:text-blue-400 transition-transform ${collapsedSections.scoringInfo ? '' : 'rotate-180'}`}
                  />
                </button>
                {!collapsedSections.scoringInfo && (
                  <div className="px-4 pb-4">
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="text-blue-800 dark:text-blue-200 mb-2">
                        ProxBalance uses a penalty-based scoring system to evaluate every guest on every node. Migrations are recommended when moving a guest would improve its suitability rating by <span className="font-bold">{penaltyConfig?.min_score_improvement || 15}+ points</span>.
                      </p>
                      <ul className="ml-4 space-y-1 text-blue-700 dark:text-blue-300 text-xs list-disc">
                        <li><span className="font-semibold">Suitability Rating:</span> 0-100% (lower penalties = higher rating). Penalties accumulate for unfavorable conditions.</li>
                        <li><span className="font-semibold">Time weighting:</span> Current load ({penaltyConfig ? (penaltyConfig.weight_current * 100).toFixed(0) : '50'}%), 24h average ({penaltyConfig ? (penaltyConfig.weight_24h * 100).toFixed(0) : '30'}%), 7-day average ({penaltyConfig ? (penaltyConfig.weight_7d * 100).toFixed(0) : '20'}%)</li>
                        <li><span className="font-semibold">Penalties applied for:</span> High CPU/memory/IOWait, rising trends, historical spikes, predicted post-migration overload</li>
                        <li><span className="font-semibold">Smart decisions:</span> Balances immediate needs with long-term stability and capacity planning</li>
                      </ul>
                      <div className="mt-3 text-xs">
                        <button
                          onClick={() => {
                            setCurrentPage('settings');
                            setOpenPenaltyConfigOnSettings(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
                        >
                          Configure penalty scoring weights in Settings →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!collapsedSections.recommendations && (
          <div className="transition-all duration-300 ease-in-out">
          {loadingRecommendations ? (
            <div className="text-center py-8">
              <RefreshCw size={48} className="mx-auto mb-3 text-blue-500 dark:text-blue-400 animate-spin" />
              <p className="font-medium text-gray-700 dark:text-gray-300">Generating recommendations...</p>
              {recommendationData?.ai_enhanced && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">AI enhancement in progress</p>
              )}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-2 text-green-500 dark:text-green-400" />
              <p className="font-medium">Cluster is balanced!</p>
              <p className="text-sm">No migrations needed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recommendations.map((rec, idx) => {
                const key = `${rec.vmid}-${rec.target_node}`;
                const status = migrationStatus[key];
                const completed = completedMigrations[rec.vmid];
                const isCompleted = completed !== undefined;
                const isMaintenance = rec.reason && rec.reason.toLowerCase().includes('maintenance');

                return (
                  <div key={idx} className={`border rounded p-4 transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75'
                      : isMaintenance
                      ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`font-semibold ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                            [{rec.type} {rec.vmid}] {rec.name}
                          </span>
                          {rec.mount_point_info?.has_mount_points && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 ${
                              rec.mount_point_info.has_unshared_bind_mount
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                            } text-white text-[10px] font-bold rounded`}
                            title={`${rec.mount_point_info.mount_count} mount point(s)${rec.mount_point_info.has_shared_mount ? ' (shared - can migrate)' : ' (requires manual migration)'}`}>
                              <Folder size={10} />
                              {rec.mount_point_info.mount_count} MP
                            </span>
                          )}
                          {isMaintenance && !isCompleted && (
                            <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                              MAINTENANCE
                            </span>
                          )}
                          {isCompleted && <CheckCircle size={18} className="text-green-600 dark:text-green-400" />}
                          {status === 'failed' && <XCircle size={18} className="text-red-600 dark:text-red-400" />}
                        </div>
                        <div className={`text-sm mt-1 flex items-center gap-2 flex-wrap ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {isCompleted ? (
                            <>
                              <span className="font-medium">MIGRATED:</span> {rec.source_node} → {completed.newNode} ✓
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-semibold">
                                <span className="text-xs">FROM:</span>
                                <span>{rec.source_node}</span>
                              </span>
                              <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold">
                                <span className="text-xs">TO:</span>
                                <span>{rec.target_node}</span>
                              </span>
                              {rec.score_improvement !== undefined && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                                  rec.score_improvement >= 50 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                  rec.score_improvement >= 30 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                  rec.score_improvement >= (penaltyConfig?.min_score_improvement || 15) ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                  'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                }`} title="How much better the target node is (penalty point reduction)">
                                  <span className="text-xs">Improvement:</span>
                                  <span className="text-sm">+{rec.score_improvement.toFixed(1)}</span>
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'}`}>
                          <span className="font-medium">Reason:</span> <span className={isMaintenance ? 'font-bold text-yellow-600 dark:text-yellow-400' : ''}>{rec.reason}</span> | <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB
                          {rec.ai_confidence_adjustment && rec.ai_confidence_adjustment !== 0 && (
                            <span className="ml-2" title="AI-adjusted confidence modification">
                              | <span className="font-medium">AI Adjustment:</span>{' '}
                              <span className={`font-semibold ${
                                rec.ai_confidence_adjustment > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {rec.ai_confidence_adjustment > 0 ? '+' : ''}{rec.ai_confidence_adjustment}
                              </span>
                            </span>
                          )}
                        </div>
                        {rec.ai_insight && (
                          <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 font-semibold shrink-0">AI:</span>
                              <span className="text-gray-700 dark:text-gray-300">{rec.ai_insight}</span>
                            </div>
                          </div>
                        )}
                        {rec.bind_mount_warning && (
                          <div className={`mt-2 p-2 ${
                            rec.mount_point_info?.has_unshared_bind_mount
                              ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-300 dark:border-orange-700'
                              : 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-300 dark:border-green-700'
                          } rounded text-xs`}>
                            <div className="flex items-start gap-2">
                              <Folder size={14} className={`shrink-0 ${
                                rec.mount_point_info?.has_unshared_bind_mount
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`} />
                              <span className="text-gray-700 dark:text-gray-300">{rec.bind_mount_warning}</span>
                            </div>
                          </div>
                        )}
                        <div className="mt-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const commandKey = `command-${idx}`;
                              setCollapsedSections(prev => ({
                                ...prev,
                                [commandKey]: !prev[commandKey]
                              }));
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Terminal size={12} />
                            {collapsedSections[`command-${idx}`] ? 'Hide command' : 'Show command'}
                          </button>
                          {collapsedSections[`command-${idx}`] && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(rec.command);
                                // Show tooltip or feedback
                                const btn = e.currentTarget;
                                const originalText = btn.textContent;
                                btn.textContent = 'Copied!';
                                btn.classList.add('bg-green-100', 'dark:bg-green-900');
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                  btn.classList.remove('bg-green-100', 'dark:bg-green-900');
                                }, 1000);
                              }}
                              className={`text-xs font-mono p-2 rounded mt-1 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
                                isCompleted
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                              }`}
                              title="Click to copy"
                            >
                              {rec.command}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="sm:ml-4 flex items-center gap-2 shrink-0">
                        {(() => {
                          // If migration is completed, show "Migrated" badge
                          if (isCompleted) {
                            return (
                              <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                                <CheckCircle size={16} />
                                Migrated
                              </div>
                            );
                          }

                          // Check if guest is migrating (from Proxmox API via guestsMigrating state)
                          const isMigrating = guestsMigrating[rec.vmid] === true;
                          const migrationKey = `${rec.vmid}-${rec.target_node}`;

                          if (isMigrating && canMigrate) {
                            const progress = migrationProgress[rec.vmid];
                            let progressText = '';
                            let tooltipText = 'Cancel migration in progress';

                            if (progress) {
                              if (progress.percentage) {
                                progressText = ` ${progress.percentage}%`;
                                if (progress.total_human_readable) {
                                  tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
                                }
                              } else {
                                progressText = ` (${progress.human_readable})`;
                              }
                            }

                            return (
                              <button
                                onClick={() => cancelMigration(rec.vmid, rec.target_node)}
                                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse"
                                title={tooltipText}
                              >
                                <RefreshCw size={16} className="animate-spin" />
                                Cancel{progressText}
                              </button>
                            );
                          }

                          return (
                            <button
                              onClick={() => setConfirmMigration(rec)}
                              disabled={!canMigrate || status === 'running' || isMigrating}
                              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                              title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : ''}
                            >
                              {!canMigrate ? (
                                <>
                                  <Lock size={16} />
                                  Read-Only
                                </>
                              ) : isMigrating ? (
                                <>
                                  <RefreshCw size={16} className="animate-spin" />
                                  Migrating...
                                </>
                              ) : status === 'running' ? (
                                <>
                                  <RefreshCw size={16} className="animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <Play size={16} />
                                  Migrate
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
          )}
        </div>

        {config?.ai_recommendations_enabled && aiEnabled && (
          <div className="hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-wrap items-center justify-between gap-y-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-md shrink-0">
                  <Activity size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">AI-Enhanced Recommendations</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">AI-powered migration insights</p>
                </div>
                <button
                  onClick={() => toggleSection('aiRecommendations')}
                  className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                  title={collapsedSections.aiRecommendations ? "Expand section" : "Collapse section"}
                >
                  {collapsedSections.aiRecommendations ? (
                    <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                  ) : (
                    <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                  )}
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Period:</label>
                  <select
                    value={aiAnalysisPeriod}
                    onChange={(e) => setAiAnalysisPeriod(e.target.value)}
                    className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="1h">Last Hour</option>
                    <option value="6h">Last 6 Hours</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>
                </div>
                <button
                  onClick={fetchAiRecommendations}
                  disabled={loadingAi}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400"
                >
                  {loadingAi ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      Get AI Analysis
                    </>
                  )}
                </button>
              </div>
            </div>

            {!collapsedSections.aiRecommendations && (
            <div className="transition-all duration-300 ease-in-out">
            {!aiRecommendations && !loadingAi && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Activity size={48} className="mx-auto mb-2" />
                <p className="font-medium">AI Analysis Available</p>
                <p className="text-sm">Click "Get AI Analysis" to receive AI-powered migration recommendations</p>
              </div>
            )}

            {aiRecommendations && !aiRecommendations.success && (
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
                <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                  <AlertCircle size={20} />
                  <span className="font-medium">AI Analysis Error</span>
                </div>
                <p className="text-sm text-red-700 dark:text-red-300 mt-2">{aiRecommendations.error}</p>
              </div>
            )}

            {aiRecommendations && aiRecommendations.success && (
              <div className="space-y-4">
                {aiRecommendations.analysis && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                      <span className="font-medium text-blue-900 dark:text-blue-200">Cluster Analysis</span>
                    </div>
                    <p className="text-sm text-blue-800 dark:text-blue-200">{aiRecommendations.analysis}</p>
                  </div>
                )}

                {aiRecommendations.predicted_issues && aiRecommendations.predicted_issues.length > 0 && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
                      <span className="font-medium text-yellow-900 dark:text-yellow-200">Predicted Issues</span>
                    </div>
                    <div className="space-y-2">
                      {aiRecommendations.predicted_issues.map((issue, idx) => (
                        <div key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                          <span className="font-medium">{issue.node}</span> - {issue.prediction}
                          <span className="ml-2 text-xs">({((issue.confidence || 0) * 100).toFixed(0)}% confidence)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {aiRecommendations.recommendations && aiRecommendations.recommendations.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <CheckCircle size={48} className="mx-auto mb-2 text-green-500 dark:text-green-400" />
                    <p className="font-medium">No AI Recommendations</p>
                    <p className="text-sm">AI analysis found cluster is well-balanced</p>
                  </div>
                )}

                {aiRecommendations.recommendations && aiRecommendations.recommendations.filter(rec => rec.priority !== 'skipped').length > 0 && (
                  <div className="space-y-4">
                    {aiRecommendations.recommendations.filter(rec => rec.priority !== 'skipped').map((rec, idx) => {
                      const key = `ai-${rec.vmid}-${rec.target_node}`;
                      const status = migrationStatus[key];
                      const completed = completedMigrations[rec.vmid];
                      const isCompleted = completed !== undefined;

                      const priorityColors = {
                        high: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
                        medium: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
                        low: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                      };

                      const riskColor = rec.risk_score > 0.5 ? 'text-red-600 dark:text-red-400' :
                                       rec.risk_score > 0.2 ? 'text-yellow-600 dark:text-yellow-400' :
                                       'text-green-600 dark:text-green-400';

                      return (
                        <div key={idx} className={`border rounded-lg p-4 transition-all duration-300 ${
                          isCompleted
                            ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75'
                            : priorityColors[rec.priority] || priorityColors.medium
                        }`}>
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-bold text-lg">[{rec.type} {rec.vmid}] {rec.name}</span>
                                <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                  rec.priority === 'high' ? 'bg-red-600 text-white' :
                                  rec.priority === 'medium' ? 'bg-yellow-600 text-white' :
                                  'bg-green-600 text-white'
                                }`}>
                                  {rec.priority} Priority
                                </span>
                              </div>

                              <div className="text-sm mb-2">
                                <span className="font-semibold text-red-700 dark:text-red-300">FROM:</span> {rec.source_node}
                                <span className="mx-2">→</span>
                                <span className="font-semibold text-green-700 dark:text-green-300">TO:</span> {rec.target_node}
                              </div>

                              <div className="bg-white dark:bg-gray-800 rounded p-3 mb-2">
                                <div className="flex items-start gap-2 mb-1">
                                  <Shield size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                                  <div className="flex-1">
                                    <span className="font-semibold text-sm">AI Reasoning:</span>
                                    <p className="text-sm mt-1">{rec.reasoning}</p>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs mb-2">
                                <AlertTriangle size={14} className={riskColor} />
                                <span className="font-medium">Risk Score:</span>
                                <span className={`font-bold ${riskColor}`}>{((rec.risk_score || 0) * 100).toFixed(0)}%</span>
                              </div>

                              {rec.estimated_impact && (
                                <div className="bg-green-50 dark:bg-green-900/30 rounded p-2 text-xs">
                                  <span className="font-semibold">Expected Impact:</span> {rec.estimated_impact}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              {(() => {
                                // If migration is completed, show "Migrated" badge
                                if (isCompleted) {
                                  return (
                                    <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                                      <CheckCircle size={16} />
                                      Migrated
                                    </div>
                                  );
                                }

                                // Check if guest is migrating (from Proxmox API via guestsMigrating state)
                                const isMigrating = guestsMigrating[rec.vmid] === true;
                                const migrationKey = `${rec.vmid}-${rec.target_node}`;

                                if (isMigrating && canMigrate) {
                                  const progress = migrationProgress[rec.vmid];
                                  let progressText = '';
                                  let tooltipText = 'Cancel migration in progress';

                                  if (progress) {
                                    if (progress.percentage) {
                                      progressText = ` ${progress.percentage}%`;
                                      if (progress.total_human_readable) {
                                        tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
                                      }
                                    } else {
                                      progressText = ` (${progress.human_readable})`;
                                    }
                                  }

                                  return (
                                    <button
                                      onClick={() => cancelMigration(rec.vmid, rec.target_node)}
                                      className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse"
                                      title={tooltipText}
                                    >
                                      <RefreshCw size={16} className="animate-spin" />
                                      Cancel{progressText}
                                    </button>
                                  );
                                }

                                return (
                                  <button
                                    onClick={() => {
                                      // console.log(`[AI Migration] Starting migration for VMID ${rec.vmid} from ${rec.source_node} to ${rec.target_node}`);
                                      // Use the AI-specific key format
                                      const aiKey = `ai-${rec.vmid}-${rec.target_node}`;
                                      setMigrationStatus(prev => ({ ...prev, [aiKey]: 'running' }));

                                      fetch(`${API_BASE}/migrate`, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          source_node: rec.source_node,
                                          vmid: rec.vmid,
                                          target_node: rec.target_node,
                                          type: rec.type
                                        })
                                      })
                                      .then(response => response.json())
                                      .then(result => {
                                        // console.log(`[AI Migration] API response for VMID ${rec.vmid}:`, result);
                                        if (result.success) {
                                          // console.log(`[AI Migration] Migration started successfully, calling trackMigration with taskId: ${result.task_id}`);
                                          // Start tracking (button logic will prioritize activeMigrations over migrationStatus)
                                          trackMigration(rec.vmid, result.source_node, result.target_node, result.task_id, rec.type);
                                          // Migration tracking provides visual feedback - no alert needed
                                        } else {
                                          console.error(`[AI Migration] Migration failed for VMID ${rec.vmid}:`, result.error);
                                          setMigrationStatus(prev => ({ ...prev, [aiKey]: 'failed' }));
                                        }
                                      })
                                      .catch((err) => {
                                        console.error(`[AI Migration] Exception for VMID ${rec.vmid}:`, err);
                                        setMigrationStatus(prev => ({ ...prev, [aiKey]: 'failed' }));
                                      });
                                    }}
                                    disabled={!canMigrate || status === 'running' || isMigrating}
                                    className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                                    title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : ''}
                                  >
                                    {!canMigrate ? (
                                      <>
                                        <Lock size={16} />
                                        Read-Only
                                      </>
                                    ) : isMigrating ? (
                                      <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Migrating...
                                      </>
                                    ) : status === 'running' ? (
                                      <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        Starting...
                                      </>
                                    ) : (
                                      <>
                                        <Play size={16} />
                                        Migrate
                                      </>
                                    )}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            </div>
            )}
          </div>
        )}
      </div>
    </div>

    {showUpdateModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg shadow-md ${updating ? 'animate-pulse' : ''}`}>
                <RefreshCw size={24} className={updating ? "text-white animate-spin" : "text-white"} />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Update ProxBalance</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">System update management</p>
              </div>
            </div>
            {!updating && (
              <button
                onClick={() => setShowUpdateModal(false)}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          {systemInfo && !updating && updateLog.length === 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <RefreshCw size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Update Available</h3>
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <p><span className="font-medium">Current Branch:</span> {systemInfo.branch}</p>
                      <p><span className="font-medium">Current Commit:</span> {systemInfo.commit}</p>
                      <p><span className="font-medium">Commits Behind:</span> {systemInfo.commits_behind}</p>
                      <p><span className="font-medium">Last Updated:</span> {systemInfo.last_commit_date}</p>
                    </div>
                  </div>
                </div>
              </div>

              {systemInfo.changelog && systemInfo.changelog.length > 0 && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded p-4">
                  <h3 className="font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2">
                    <span>📋 What's New</span>
                    <span className="text-xs px-2 py-0.5 bg-green-200 dark:bg-green-800 rounded-full">
                      {systemInfo.changelog.length} update{systemInfo.changelog.length > 1 ? 's' : ''}
                    </span>
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {systemInfo.changelog.map((item, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="text-green-600 dark:text-green-400 flex-shrink-0">●</span>
                        <div className="flex-1">
                          <span className="text-green-900 dark:text-green-100">{item.message}</span>
                          <span className="ml-2 text-xs font-mono text-green-600 dark:text-green-400">
                            ({item.commit})
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-300">
                    <p className="font-semibold mb-1">This will:</p>
                    <ul className="list-disc ml-4 space-y-1">
                      <li>Pull the latest code from branch: <span className="font-mono">{systemInfo.branch}</span></li>
                      <li>Update Python dependencies</li>
                      <li>Restart ProxBalance services</li>
                      <li>The page will automatically reload after update</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={systemInfo && systemInfo.update_in_progress}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={18} />
                  {systemInfo && systemInfo.update_in_progress ? 'Operation in progress...' : 'Update Now'}
                </button>
              </div>
            </div>
          )}

          {(updating || updateLog.length > 0) && (
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="font-mono text-sm space-y-1">
                  {updateLog.map((line, idx) => (
                    <div key={idx} className="text-gray-800 dark:text-gray-200">
                      {line.includes('✓') ? (
                        <span className="text-green-600 dark:text-green-400">{line}</span>
                      ) : line.includes('Error') || line.includes('⚠') || line.includes('Failed') ? (
                        <span className="text-red-600 dark:text-red-400">{line}</span>
                      ) : line.includes('━') ? (
                        <span className="text-blue-600 dark:text-blue-400">{line}</span>
                      ) : (
                        <span>{line}</span>
                      )}
                    </div>
                  ))}
                  {updating && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <RefreshCw size={16} className="animate-spin" />
                      <span>Updating...</span>
                    </div>
                  )}
                </div>
              </div>

              {!updating && (
                <div className="flex justify-end">
                  <button
                    onClick={() => {
                      setShowUpdateModal(false);
                      setUpdateLog([]);
                    }}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )}

    {showBranchModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg shadow-md">
                  <GitBranch size={24} className="text-white" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Branch Manager</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Test feature branches before pushing to main</p>
                </div>
              </div>
              <button
                onClick={() => { setShowBranchModal(false); setBranchPreview(null); }}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            {loadingBranches ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={24} className="animate-spin text-blue-600 dark:text-blue-400" />
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading branches...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Operation in progress banner */}
                {systemInfo && systemInfo.update_in_progress && (
                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <RefreshCw size={18} className="text-blue-600 dark:text-blue-400 animate-spin" />
                      <span className="text-sm text-blue-800 dark:text-blue-300">
                        An update or branch switch is in progress. Health check is verifying the service...
                      </span>
                    </div>
                  </div>
                )}

                {/* Return to previous branch banner */}
                {systemInfo && systemInfo.previous_branch && systemInfo.previous_branch !== systemInfo.branch && (
                  <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ArrowLeft size={18} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-sm text-amber-800 dark:text-amber-300">
                          Testing a branch? Return to <span className="font-mono font-semibold">{systemInfo.previous_branch}</span>
                        </span>
                      </div>
                      <button
                        onClick={rollbackBranch}
                        disabled={rollingBack || switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                        className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {rollingBack ? 'Switching...' : (systemInfo && systemInfo.update_in_progress ? 'Busy...' : 'Go Back')}
                      </button>
                    </div>
                  </div>
                )}

                {/* Branch preview panel */}
                {branchPreview && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                        <GitBranch size={16} />
                        <span className="font-mono">{branchPreview.branch}</span>
                      </h3>
                      <button
                        onClick={() => setBranchPreview(null)}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Close preview
                      </button>
                    </div>
                    <div className="text-sm text-indigo-800 dark:text-indigo-300 space-y-2">
                      <div className="flex gap-4 text-xs">
                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                          +{branchPreview.ahead} ahead
                        </span>
                        <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded">
                          -{branchPreview.behind} behind
                        </span>
                        <span className="text-indigo-600 dark:text-indigo-400">
                          vs {branchPreview.base_branch}
                        </span>
                      </div>
                      {branchPreview.commits && branchPreview.commits.length > 0 && (
                        <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                          {branchPreview.commits.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs">
                              <span className="text-indigo-500 dark:text-indigo-400 flex-shrink-0">●</span>
                              <span className="text-indigo-900 dark:text-indigo-100">{item.message}</span>
                              <span className="font-mono text-indigo-500 dark:text-indigo-400 flex-shrink-0">({item.commit})</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {branchPreview.commits && branchPreview.commits.length === 0 && (
                        <p className="text-xs text-indigo-600 dark:text-indigo-400 italic">No unique commits (branch is up to date with {branchPreview.base_branch})</p>
                      )}
                    </div>
                    <div className="mt-3 flex justify-end">
                      <button
                        onClick={() => switchBranch(branchPreview.branch)}
                        disabled={switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                        className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white text-sm rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {switchingBranch ? 'Switching...' : (systemInfo && systemInfo.update_in_progress ? 'Operation in progress...' : `Switch to ${branchPreview.branch}`)}
                      </button>
                    </div>
                  </div>
                )}

                {loadingPreview && (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw size={18} className="animate-spin text-indigo-600 dark:text-indigo-400" />
                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading branch preview...</span>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Available Branches</h3>
                  {availableBranches.length === 0 ? (
                    <p className="text-gray-600 dark:text-gray-400 text-sm">No branches found</p>
                  ) : (
                    availableBranches.map((branch) => (
                      <div
                        key={branch.name}
                        className={`border rounded-lg p-4 transition-all duration-200 ${
                          branch.current
                            ? 'border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                            : branch.previous
                              ? 'border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10'
                              : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <GitBranch size={16} className={branch.current ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'} />
                              <span className={`font-mono font-semibold ${
                                branch.current
                                  ? 'text-purple-700 dark:text-purple-300'
                                  : 'text-gray-900 dark:text-white'
                              }`}>
                                {branch.name}
                              </span>
                              {branch.current && (
                                <span className="px-2 py-0.5 bg-purple-600 dark:bg-purple-500 text-white text-xs rounded-full">
                                  Current
                                </span>
                              )}
                              {branch.previous && !branch.current && (
                                <span className="px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full">
                                  Previous
                                </span>
                              )}
                              {branch.ahead_of_base > 0 && (
                                <span className="px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded">
                                  +{branch.ahead_of_base}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 ml-6">
                              {branch.last_commit && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                                  {branch.last_commit.substring(0, 60)}{branch.last_commit.length > 60 ? '...' : ''}
                                </p>
                              )}
                              {branch.last_commit_date && (
                                <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                                  {branch.last_commit_date}
                                </span>
                              )}
                            </div>
                          </div>
                          {!branch.current && (
                            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                              <button
                                onClick={() => fetchBranchPreview(branch.name)}
                                disabled={loadingPreview || (systemInfo && systemInfo.update_in_progress)}
                                className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
                                title="Preview branch changes"
                              >
                                Preview
                              </button>
                              <button
                                onClick={() => switchBranch(branch.name)}
                                disabled={switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                                className="px-3 py-2 text-sm bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {switchingBranch ? 'Switching...' : (systemInfo && systemInfo.update_in_progress ? 'Busy...' : 'Switch')}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => { setShowBranchModal(false); setBranchPreview(null); }}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* Migration Dialog Modal */}
    {showMigrationDialog && selectedGuest && canMigrate && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowMigrationDialog(false)}>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
              <Activity size={24} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Migrate Guest</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Move VM or container</p>
            </div>
          </div>

          <div className="mb-4 space-y-2">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Guest:</strong> {selectedGuest.name || `Guest ${selectedGuest.vmid}`} ({selectedGuest.vmid})
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Type:</strong> {((selectedGuest.type || '').toUpperCase() === 'VM' || (selectedGuest.type || '').toUpperCase() === 'QEMU') ? 'VM' : 'Container'}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <strong>Current Node:</strong> {selectedGuest.currentNode}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Node
            </label>
            <select
              value={migrationTarget}
              onChange={(e) => setMigrationTarget(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select target node...</option>
              {data && data.nodes && Object.values(data.nodes)
                .filter(node => node.name !== selectedGuest.currentNode && node.status === 'online')
                .map(node => (
                  <option key={node.name} value={node.name}>
                    {node.name}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowMigrationDialog(false)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (migrationTarget) {
                  executeMigration({
                    vmid: selectedGuest.vmid,
                    source_node: selectedGuest.currentNode,
                    target_node: migrationTarget,
                    type: selectedGuest.type,
                    name: selectedGuest.name
                  });
                  setShowMigrationDialog(false);
                }
              }}
              disabled={!migrationTarget}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Migrate
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Tag Management Modal */}
    {showTagModal && tagModalGuest && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Add Tag</h3>
            <button
              onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XCircle size={24} />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Guest: <span className="font-semibold text-gray-900 dark:text-white">[{tagModalGuest.type} {tagModalGuest.vmid}] {tagModalGuest.name}</span>
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Node: <span className="font-semibold text-gray-900 dark:text-white">{tagModalGuest.node}</span>
              </p>
            </div>

            {/* Quick Add Buttons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Quick Add
              </label>
              <div className="flex flex-wrap gap-2">
                {!tagModalGuest.tags.has_ignore && (
                  <button
                    onClick={async () => {
                      try {
                        const vmid = tagModalGuest.vmid;

                        const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tag: 'ignore' })
                        });

                        const result = await response.json();

                        if (result.success) {
                          setShowTagModal(false);
                          setNewTag('');
                          setTagModalGuest(null);

                          // Fast refresh - just update this guest's tags
                          const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                            method: 'POST'
                          });
                          const refreshResult = await refreshResponse.json();

                          if (refreshResult.success && data) {
                            // Update just this guest in the data state
                            setData({
                              ...data,
                              guests: {
                                ...data.guests,
                                [vmid]: {
                                  ...data.guests[vmid],
                                  tags: refreshResult.tags
                                }
                              }
                            });
                          }
                        } else {
                          setError(`Error: ${result.error}`);
                        }
                      } catch (error) {
                        setError(`Error adding tag: ${error.message}`);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                  >
                    + ignore
                  </button>
                )}
                {!tagModalGuest.tags.all_tags?.includes('auto_migrate_ok') && (
                  <button
                    onClick={async () => {
                      try {
                        const vmid = tagModalGuest.vmid;

                        const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ tag: 'auto_migrate_ok' })
                        });

                        const result = await response.json();

                        if (result.success) {
                          setShowTagModal(false);
                          setNewTag('');
                          setTagModalGuest(null);

                          // Fast refresh - just update this guest's tags
                          const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                            method: 'POST'
                          });
                          const refreshResult = await refreshResponse.json();

                          if (refreshResult.success && data) {
                            // Update just this guest in the data state
                            setData({
                              ...data,
                              guests: {
                                ...data.guests,
                                [vmid]: {
                                  ...data.guests[vmid],
                                  tags: refreshResult.tags
                                }
                              }
                            });
                          }
                        } else {
                          setError(`Error: ${result.error}`);
                        }
                      } catch (error) {
                        setError(`Error adding tag: ${error.message}`);
                      }
                    }}
                    className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                  >
                    + auto_migrate_ok
                  </button>
                )}
                <button
                  onClick={() => setNewTag('exclude_')}
                  className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                >
                  + exclude_...
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Enter Custom Tag
              </label>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleAddTag();
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., exclude_database, exclude_web"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                <span className="font-mono">ignore</span> = never migrate | <span className="font-mono">exclude_[name]</span> = anti-affinity group
              </p>
            </div>

            {/* Current Tags */}
            {tagModalGuest.tags.all_tags.length > 0 && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Tags
                </label>
                <div className="flex flex-wrap gap-1">
                  {tagModalGuest.tags.all_tags.map(tag => (
                    <span key={tag} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={handleAddTag}
              disabled={!newTag.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Add Tag
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Remove Tag Confirmation Modal */}
    {confirmRemoveTag && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmRemoveTag(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Confirm Tag Removal</h3>
            <button onClick={() => setConfirmRemoveTag(null)}>
              <XCircle size={24} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-gray-700 dark:text-gray-300">
              Remove tag <span className="font-mono font-semibold text-red-600 dark:text-red-400">"{confirmRemoveTag.tag}"</span> from {confirmRemoveTag.guest.type} <span className="font-semibold">{confirmRemoveTag.guest.vmid}</span> ({confirmRemoveTag.guest.name})?
            </p>
          </div>

          <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setConfirmRemoveTag(null)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={confirmAndRemoveTag}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Remove Tag
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Migration Confirmation Modal */}
    {confirmMigration && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmMigration(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">Confirm Migration</h3>
            <button onClick={() => setConfirmMigration(null)}>
              <XCircle size={24} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
            </button>
          </div>

          <div className="p-4 sm:p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Start migration for <span className="font-semibold text-blue-600 dark:text-blue-400">{confirmMigration.type} {confirmMigration.vmid}</span> ({confirmMigration.name})?
            </p>

            <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">From:</span>
                <span className="font-semibold text-red-600 dark:text-red-400">{confirmMigration.source_node}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">To:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">{confirmMigration.target_node}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{(confirmMigration.mem_gb || 0).toFixed(1)} GB</span>
              </div>
              {confirmMigration.score_improvement !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Improvement:</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">+{confirmMigration.score_improvement.toFixed(1)}</span>
                </div>
              )}
            </div>

            {confirmMigration.reason && (
              <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                <span className="font-medium">Reason:</span> {confirmMigration.reason}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setConfirmMigration(null)}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              onClick={confirmAndMigrate}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
            >
              <Play size={16} />
              Start Migration
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Batch Migration Confirmation Modal */}
    {showBatchConfirmation && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Modal Header */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={24} className="text-yellow-500" />
                Confirm Batch Migration
              </h2>
              <button
                onClick={() => setShowBatchConfirmation(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X size={24} />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Review the migration plan below. Migrations will be executed <strong>sequentially</strong> (one at a time).
            </p>
          </div>

          {/* Modal Body - Scrollable Task List */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
              <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                <Info size={20} />
                <div>
                  <p className="font-semibold">Total Migrations: {pendingBatchMigrations.length}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Each migration will be tracked with real-time progress. You can monitor the status panel for updates.
                  </p>
                </div>
              </div>
            </div>

            <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <List size={18} />
              Migration Tasks
            </h3>

            <div className="space-y-3">
              {pendingBatchMigrations.map((rec, idx) => {
                const sourceNode = data?.nodes?.[rec.source_node];
                const targetNode = data?.nodes?.[rec.target_node];

                return (
                  <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                            #{idx + 1}
                          </span>
                          <span className="font-bold text-gray-900 dark:text-white">
                            [{rec.type} {rec.vmid}] {rec.name}
                          </span>
                          {rec.priority && (
                            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                              rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                              rec.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                              'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                            }`}>
                              {rec.priority}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 text-sm">
                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source Node</div>
                            <div className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                              <ArrowRight size={14} />
                              {rec.source_node}
                            </div>
                            {sourceNode && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                CPU: {sourceNode.cpu_percent?.toFixed(1)}% | RAM: {sourceNode.mem_percent?.toFixed(1)}%
                              </div>
                            )}
                          </div>

                          <div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Node</div>
                            <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                              <ArrowRight size={14} />
                              {rec.target_node}
                            </div>
                            {targetNode && (
                              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                CPU: {targetNode.cpu_percent?.toFixed(1)}% | RAM: {targetNode.mem_percent?.toFixed(1)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {rec.reasoning && (
                          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                            <span className="font-semibold">Reason:</span> {rec.reasoning}
                          </div>
                        )}

                        <div className="mt-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const commandKey = `ai-command-${idx}`;
                              setCollapsedSections(prev => ({
                                ...prev,
                                [commandKey]: !prev[commandKey]
                              }));
                            }}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                          >
                            <Terminal size={12} />
                            {collapsedSections[`ai-command-${idx}`] ? 'Show' : 'Hide'} command
                          </button>
                          {!collapsedSections[`ai-command-${idx}`] && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(rec.command);
                                const btn = e.currentTarget;
                                const originalText = btn.textContent;
                                btn.textContent = 'Copied!';
                                btn.classList.add('bg-green-100', 'dark:bg-green-900');
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                  btn.classList.remove('bg-green-100', 'dark:bg-green-900');
                                }, 1000);
                              }}
                              className="text-xs font-mono bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-gray-700 dark:text-gray-300 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                              title="Click to copy"
                            >
                              {rec.command}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center justify-between gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <AlertTriangle size={16} className="inline mr-1 text-yellow-500" />
                Migrations will execute one at a time to ensure system stability
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowBatchConfirmation(false)}
                  className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                >
                  <X size={16} />
                  Cancel
                </button>
                <button
                  onClick={confirmBatchMigration}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-semibold"
                >
                  <CheckCircle size={16} />
                  Start {pendingBatchMigrations.length} Migration{pendingBatchMigrations.length !== 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Footer with timestamp and system info - desktop only */}
    <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 py-2 px-4 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>UI refreshed: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatLocalTime(lastUpdate)} {getTimezoneAbbr()}</span></span>
            </div>
          )}
          {backendCollected && (
            <>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <div className="flex items-center gap-1.5">
                <Server size={12} />
                <span>Data collected: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatLocalTime(backendCollected)} {getTimezoneAbbr()}</span>{data?.performance?.total_time && <span className="text-gray-500 dark:text-gray-400 ml-1">({data.performance.total_time}s)</span>}</span>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Refresh data collection now"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} />
                </button>
              </div>
            </>
          )}
          {systemInfo && (
            <>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <div className="flex items-center gap-2">
                <span>Branch: <button
                  onClick={() => { fetchBranches(); setShowBranchModal(true); }}
                  className="font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-dotted cursor-pointer"
                  title="Click to manage branches"
                >{systemInfo.branch}</button></span>
                {systemInfo.previous_branch && systemInfo.previous_branch !== systemInfo.branch && (
                  <span className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded" title={`Return to ${systemInfo.previous_branch}`}>
                    testing
                  </span>
                )}
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span>Commit: <span className="font-mono text-gray-600 dark:text-gray-400">{systemInfo.commit}</span></span>
                {systemInfo.updates_available && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">|</span>
                    <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                      {systemInfo.commits_behind} update{systemInfo.commits_behind > 1 ? 's' : ''} available
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="text-xs font-semibold bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          ProxBalance
        </div>
      </div>
    </div>

    {/* Cancel Migration Confirmation Modal */}
    {cancelMigrationModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setCancelMigrationModal(null)}>
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-start gap-3 mb-4">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cancel Migration?</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                This will stop the migration in progress
              </p>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                {cancelMigrationModal.name}
              </span>
              <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                {cancelMigrationModal.type === 'qemu' ? 'VM' : 'CT'} {cancelMigrationModal.vmid}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <span className="font-mono">{cancelMigrationModal.source_node}</span>
              <ArrowRight size={14} />
              <span className="font-mono">{cancelMigrationModal.target_node}</span>
            </div>
            {cancelMigrationModal.progress_info && (
              <div className="text-xs text-gray-500 dark:text-gray-500">
                Progress: {cancelMigrationModal.progress_info.human_readable}
              </div>
            )}
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setCancelMigrationModal(null)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
            >
              Keep Running
            </button>
            <button
              onClick={async () => {
                setCancellingMigration(true);
                try {
                  // Use custom onConfirm handler if provided (for manual migrations), otherwise use default API
                  if (cancelMigrationModal.onConfirm) {
                    await cancelMigrationModal.onConfirm();
                  } else {
                    const response = await fetch(`/api/migrations/${cancelMigrationModal.task_id}/cancel`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' }
                    });
                    if (response.ok) {
                      setCancelMigrationModal(null);
                      fetchAutomationStatus();
                    } else {
                      setError('Failed to cancel migration');
                    }
                  }
                } catch (error) {
                  console.error('Error cancelling migration:', error);
                  setError('Error cancelling migration');
                } finally {
                  setCancellingMigration(false);
                }
              }}
              disabled={cancellingMigration}
              className={`px-4 py-2 ${cancellingMigration ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-semibold transition-colors flex items-center gap-2`}
            >
              {cancellingMigration ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Cancelling...
                </>
              ) : (
                <>
                  <X size={16} />
                  Cancel Migration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )}

  </>);
}
