import {
  AlertCircle, Server, HardDrive, Activity, RefreshCw, Play, CheckCircle,
  XCircle, ClipboardList, Tag, AlertTriangle, Info, Shield, Clock, Sun, Moon,
  Settings, X, ChevronDown, ChevronUp, ChevronRight, GitHub, GitBranch,
  ArrowLeft, Lock, Download, MoveRight, Loader, Plus, List, Terminal,
  ArrowRight, Pause, Package, MinusCircle, Folder, Minus, ProxBalanceLogo,
  Edit, Trash, Check, ChevronLeft, ChevronsLeft, ChevronsRight, RotateCcw,
  Cpu, MemoryStick, Globe, Zap, Database, Copy, Save, Calendar, HelpCircle,
  Eye, Search, Filter, Upload, Power, Square, ThumbsUp, ThumbsDown, BarChart2
} from './Icons.jsx';

import { formatLocalTime, getTimezoneAbbr } from '../utils/formatters.js';
import NodeDetailsModal from './dashboard/NodeDetailsModal.jsx';
import GuestDetailsModal from './dashboard/GuestDetailsModal.jsx';
import EvacuationModals from './dashboard/EvacuationModals.jsx';
import MigrationModals from './dashboard/MigrationModals.jsx';
import AutomationStatusSection from './dashboard/AutomationStatusSection.jsx';

const { useState } = React;

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
  systemInfo, showUpdateModal, setShowUpdateModal, updating, updateLog, setUpdateLog,
  updateResult, setUpdateResult, updateError, handleUpdate,
  // Branch management
  showBranchModal, setShowBranchModal, loadingBranches, availableBranches, branchPreview, setBranchPreview,
  loadingPreview, switchingBranch, rollingBack, fetchBranches, switchBranch, rollbackBranch, clearTestingMode, fetchBranchPreview,
  // Automation
  automationStatus, automationConfig, fetchAutomationStatus, runAutomationNow, runningAutomation,
  runNowMessage, setRunNowMessage, runHistory, expandedRun, setExpandedRun,
  // Recommendations
  recommendations, loadingRecommendations, generateRecommendations, recommendationData, penaltyConfig,
  // Threshold suggestions
  thresholdSuggestions,
  cpuThreshold, setCpuThreshold, memThreshold, setMemThreshold, iowaitThreshold, setIowaitThreshold,
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
  // Feedback
  feedbackGiven, onFeedback,
  // Guest migration options
  guestMigrationOptions, loadingGuestOptions, fetchGuestMigrationOptions, setGuestMigrationOptions,
  // API base
  API_BASE
}) {
  // Dashboard Page - data is guaranteed to be available here
  const [showPredicted, setShowPredicted] = useState(false);

  // J2: Recommendation filter state
  const [recFilterConfidence, setRecFilterConfidence] = useState('');
  const [recFilterTargetNode, setRecFilterTargetNode] = useState('');
  const [recFilterSourceNode, setRecFilterSourceNode] = useState('');
  const [recSortBy, setRecSortBy] = useState('');
  const [recSortDir, setRecSortDir] = useState('desc');
  const [showRecFilters, setShowRecFilters] = useState(false);

  // E1: Migration outcomes state
  const [migrationOutcomes, setMigrationOutcomes] = useState(null);
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);

  // C4: Recommendation history timeline state
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyHours, setHistoryHours] = useState(24);

  // F2: Workload patterns state
  const [workloadPatterns, setWorkloadPatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);

  // C4: Fetch score history when hours change or section is opened
  React.useEffect(() => {
    if (collapsedSections.recHistory) return; // Don't fetch if collapsed
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`${API_BASE}/score-history?hours=${historyHours}`)
      .then(r => r.json())
      .then(res => { if (!cancelled) setHistoryData(res.history || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [historyHours, collapsedSections.recHistory]);

  const ignoredGuests = Object.values(data.guests || {}).filter(g => g.tags?.has_ignore);
  const excludeGuests = Object.values(data.guests || {}).filter(g => g.tags?.exclude_groups?.length > 0);
  const affinityGuests = Object.values(data.guests || {}).filter(g => (g.tags?.affinity_groups?.length > 0) || g.tags?.all_tags?.some(t => t.startsWith('affinity_')));
  const autoMigrateOkGuests = Object.values(data.guests || {}).filter(g => g.tags?.all_tags?.includes('auto_migrate_ok'));
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
        <AutomationStatusSection
          automationStatus={automationStatus}
          automationConfig={automationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          toggleSection={toggleSection}
          setCurrentPage={setCurrentPage}
          fetchAutomationStatus={fetchAutomationStatus}
          runAutomationNow={runAutomationNow}
          runningAutomation={runningAutomation}
          runNowMessage={runNowMessage}
          setRunNowMessage={setRunNowMessage}
          setCancelMigrationModal={setCancelMigrationModal}
          runHistory={runHistory}
          expandedRun={expandedRun}
          setExpandedRun={setExpandedRun}
        />

        {data && (
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-6 mb-6 overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3 sm:mb-6">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div className="p-1.5 sm:p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg shadow-md shrink-0">
                  <Tag size={18} className="text-white sm:hidden" />
                  <Tag size={24} className="text-white hidden sm:block" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-2xl font-bold text-gray-900 dark:text-white">Guest Tag Management</h2>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 hidden sm:block">Manage ignore tags and affinity rules for all guests</p>
                </div>
              </div>
              <button
                onClick={() => toggleSection('taggedGuests')}
                className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 shrink-0"
                title={collapsedSections.taggedGuests ? "Expand section" : "Collapse section"}
              >
                {collapsedSections.taggedGuests ? (
                  <ChevronDown size={20} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <ChevronUp size={20} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>
            </div>

            {collapsedSections.taggedGuests ? (
              <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
                <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded">
                  <HardDrive size={16} className="text-gray-600 dark:text-gray-400 shrink-0 sm:hidden" />
                  <HardDrive size={18} className="text-gray-600 dark:text-gray-400 shrink-0 hidden sm:block" />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Total</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{Object.keys(data.guests).length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${ignoredGuests.length > 0 ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <Shield size={16} className={`shrink-0 sm:hidden ${ignoredGuests.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <Shield size={18} className={`shrink-0 hidden sm:block ${ignoredGuests.length > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Ignored</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{ignoredGuests.length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${autoMigrateOkGuests.length > 0 ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <CheckCircle size={16} className={`shrink-0 sm:hidden ${autoMigrateOkGuests.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <CheckCircle size={18} className={`shrink-0 hidden sm:block ${autoMigrateOkGuests.length > 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Auto-Migrate</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{autoMigrateOkGuests.length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${excludeGuests.length > 0 ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <Shield size={16} className={`shrink-0 sm:hidden ${excludeGuests.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <Shield size={18} className={`shrink-0 hidden sm:block ${excludeGuests.length > 0 ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Anti-Affinity</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{excludeGuests.length}</div>
                  </div>
                </div>
                <div className={`flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${affinityGuests.length > 0 ? 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800' : 'bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60'}`}>
                  <Shield size={16} className={`shrink-0 sm:hidden ${affinityGuests.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <Shield size={18} className={`shrink-0 hidden sm:block ${affinityGuests.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-gray-400 dark:text-gray-500'}`} />
                  <div className="min-w-0">
                    <div className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate">Affinity</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{affinityGuests.length}</div>
                  </div>
                </div>
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
                            {paginatedGuests.map(guest => {
                      const guestHasTags = guest.tags.has_ignore || guest.tags.all_tags?.includes('auto_migrate_ok') || guest.tags.exclude_groups?.length > 0 || guest.tags.affinity_groups?.length > 0;
                      return (
                      <tr
                        key={guest.vmid}
                        className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${canMigrate ? 'sm:cursor-default cursor-pointer' : ''}`}
                        onClick={() => {
                          if (canMigrate && window.innerWidth < 640) {
                            setTagModalGuest(guest);
                            setShowTagModal(true);
                          }
                        }}
                      >
                        <td className="p-3">
                          <span className={`px-2 py-1 text-xs rounded font-medium ${
                            guest.type === 'VM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                            'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                          }`}>
                            {guest.type}
                          </span>
                        </td>
                        <td className="hidden sm:table-cell p-3 text-sm font-mono text-gray-900 dark:text-white">{guest.vmid}</td>
                        <td className="p-3">
                          <div className="text-sm text-gray-900 dark:text-white">{guest.name}</div>
                          {/* Mobile: show tag badges below name */}
                          {guestHasTags && (
                            <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                              {guest.tags.has_ignore && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">
                                  ignore
                                </span>
                              )}
                              {guest.tags.all_tags?.includes('auto_migrate_ok') && (
                                <span className="text-[10px] px-1.5 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded font-medium">
                                  auto_migrate
                                </span>
                              )}
                              {guest.tags.exclude_groups?.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium">
                                  {tag}
                                </span>
                              ))}
                              {guest.tags.affinity_groups?.map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded font-medium">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{guest.node}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${
                              guest.status === 'migrating' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                              guest.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                            }`} title={guest.status.charAt(0).toUpperCase() + guest.status.slice(1)}>
                              {guest.status === 'migrating' ? (
                                <Loader size={12} className="animate-spin" />
                              ) : guest.status === 'running' ? (
                                <Play size={12} />
                              ) : (
                                <Power size={12} />
                              )}
                              <span className="hidden sm:inline">{guest.status}</span>
                            </span>
                            {/* Mobile: tag manage button */}
                            {canMigrate && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTagModalGuest(guest);
                                  setShowTagModal(true);
                                }}
                                className="sm:hidden p-1 text-purple-500 hover:text-purple-400 hover:bg-purple-900/30 rounded transition-colors"
                                title="Manage tags"
                              >
                                <Tag size={14} />
                              </button>
                            )}
                          </div>
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
                      );
                    })}
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
                          title="First"
                        >
                          <ChevronsLeft size={14} className="sm:hidden" /><span className="hidden sm:inline">First</span>
                        </button>
                        <button
                          onClick={() => setGuestCurrentPage(guestCurrentPage - 1)}
                          disabled={guestCurrentPage === 1}
                          className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Previous"
                        >
                          <ChevronLeft size={14} className="sm:hidden" /><span className="hidden sm:inline">Prev</span>
                        </button>
                        <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                          {guestCurrentPage} / {totalPages}
                        </span>
                        <button
                          onClick={() => setGuestCurrentPage(guestCurrentPage + 1)}
                          disabled={guestCurrentPage === totalPages}
                          className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Next"
                        >
                          <ChevronRight size={14} className="sm:hidden" /><span className="hidden sm:inline">Next</span>
                        </button>
                        <button
                          onClick={() => setGuestCurrentPage(totalPages)}
                          disabled={guestCurrentPage === totalPages}
                          className="px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                          title="Last"
                        >
                          <ChevronsRight size={14} className="sm:hidden" /><span className="hidden sm:inline">Last</span>
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
                {/* C2: Migration Flow Arrows — visual summary of proposed migrations */}
                {recommendations.length > 0 && (
                  <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <MoveRight size={14} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Proposed Migration Flows</span>
                      <span className="text-[10px] text-blue-500 dark:text-blue-400">({recommendations.length} migration{recommendations.length !== 1 ? 's' : ''})</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        // Group migrations by source->target pairs
                        const flows = {};
                        recommendations.forEach(rec => {
                          const flowKey = `${rec.source_node}→${rec.target_node}`;
                          if (!flows[flowKey]) flows[flowKey] = { source: rec.source_node, target: rec.target_node, guests: [], totalImprovement: 0 };
                          flows[flowKey].guests.push({ vmid: rec.vmid, name: rec.name, type: rec.type });
                          flows[flowKey].totalImprovement += rec.score_improvement || 0;
                        });
                        return Object.values(flows).map((flow, idx) => {
                          const confColor = flow.totalImprovement > 40 ? 'bg-green-500' : flow.totalImprovement > 20 ? 'bg-yellow-500' : 'bg-gray-400';
                          return (
                            <div key={idx} className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[11px] group relative" title={flow.guests.map(g => `${g.type} ${g.vmid} (${g.name})`).join(', ')}>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{flow.source}</span>
                              <div className="flex items-center gap-0.5">
                                <div className={`w-8 h-0.5 ${confColor} rounded`}></div>
                                <ArrowRight size={10} className="text-gray-500 dark:text-gray-400 -ml-0.5" />
                              </div>
                              <span className="font-semibold text-gray-700 dark:text-gray-300">{flow.target}</span>
                              <span className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[9px] font-medium">{flow.guests.length}×</span>
                              <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[180px]">
                                {flow.guests.map((g, i) => (
                                  <div key={i} className="text-[10px] text-gray-600 dark:text-gray-400 py-0.5">[{g.type} {g.vmid}] {g.name}</div>
                                ))}
                                <div className="text-[10px] text-green-600 dark:text-green-400 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">Total improvement: +{flow.totalImprovement.toFixed(0)} pts</div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
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

        <NodeDetailsModal
          selectedNode={selectedNode}
          setSelectedNode={setSelectedNode}
          maintenanceNodes={maintenanceNodes}
          setMaintenanceNodes={setMaintenanceNodes}
          canMigrate={canMigrate}
          evacuatingNodes={evacuatingNodes}
          planningNodes={planningNodes}
          setPlanningNodes={setPlanningNodes}
          setEvacuationPlan={setEvacuationPlan}
          setPlanNode={setPlanNode}
          setError={setError}
          nodeScores={nodeScores}
          penaltyConfig={penaltyConfig}
          generateSparkline={generateSparkline}
          API_BASE={API_BASE}
        />

        <GuestDetailsModal
          selectedGuestDetails={selectedGuestDetails}
          setSelectedGuestDetails={setSelectedGuestDetails}
          generateSparkline={generateSparkline}
          guestModalCollapsed={guestModalCollapsed}
          setGuestModalCollapsed={setGuestModalCollapsed}
          guestMigrationOptions={guestMigrationOptions}
          loadingGuestOptions={loadingGuestOptions}
          fetchGuestMigrationOptions={fetchGuestMigrationOptions}
          canMigrate={canMigrate}
          setSelectedGuest={setSelectedGuest}
          setMigrationTarget={setMigrationTarget}
          setShowMigrationDialog={setShowMigrationDialog}
        />

        <EvacuationModals
          evacuationPlan={evacuationPlan}
          setEvacuationPlan={setEvacuationPlan}
          planNode={planNode}
          setPlanNode={setPlanNode}
          guestTargets={guestTargets}
          setGuestTargets={setGuestTargets}
          guestActions={guestActions}
          setGuestActions={setGuestActions}
          showConfirmModal={showConfirmModal}
          setShowConfirmModal={setShowConfirmModal}
          setEvacuatingNodes={setEvacuatingNodes}
          maintenanceNodes={maintenanceNodes}
          fetchGuestLocations={fetchGuestLocations}
          setError={setError}
          API_BASE={API_BASE}
        />


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
              {/* B4: Predicted Impact Toggle */}
              {recommendationData?.summary?.batch_impact && recommendations.length > 0 && (
                <button
                  onClick={() => setShowPredicted(!showPredicted)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    showPredicted
                      ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                  }`}
                  title="Show predicted node metrics after all recommended migrations"
                >
                  <Eye size={14} />
                  {showPredicted ? 'Showing Predicted' : 'Show Predicted'}
                </button>
              )}
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
              {Object.values(data.nodes).map(node => {
                const predicted = showPredicted && recommendationData?.summary?.batch_impact?.after?.node_scores?.[node.name];
                const before = showPredicted && recommendationData?.summary?.batch_impact?.before?.node_scores?.[node.name];
                return (
                <div key={node.name} className={`border rounded p-3 hover:shadow-md transition-shadow ${
                  showPredicted && predicted ? 'border-indigo-300 dark:border-indigo-600 ring-1 ring-indigo-200 dark:ring-indigo-800' : 'border-gray-200 dark:border-gray-700'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                    <div className="flex items-center gap-1">
                      {showPredicted && predicted && before && (
                        <span className={`text-[9px] font-medium px-1 py-0.5 rounded ${
                          predicted.cpu < before.cpu - 0.5 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' :
                          predicted.cpu > before.cpu + 0.5 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' :
                          'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        }`}>
                          {predicted.guest_count !== before.guest_count
                            ? `${predicted.guest_count > before.guest_count ? '+' : ''}${predicted.guest_count - before.guest_count} guest${Math.abs(predicted.guest_count - before.guest_count) !== 1 ? 's' : ''}`
                            : 'no change'
                          }
                        </span>
                      )}
                      <span className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={node.status}></span>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {/* CPU with sparkline */}
                    <div className="relative">
                      <div className="flex justify-between items-center relative z-10">
                        <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                        {showPredicted && predicted ? (
                          <span className="font-semibold">
                            <span className="text-gray-400 line-through mr-1">{(node.cpu_percent || 0).toFixed(0)}%</span>
                            <span className={`${predicted.cpu < (node.cpu_percent || 0) - 0.5 ? 'text-green-600 dark:text-green-400' : predicted.cpu > (node.cpu_percent || 0) + 0.5 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                              {predicted.cpu.toFixed(1)}%
                            </span>
                          </span>
                        ) : (
                          <span className="font-semibold text-blue-600 dark:text-blue-400">
                            {(node.cpu_percent || 0).toFixed(1)}%
                          </span>
                        )}
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
                        {showPredicted && predicted ? (
                          <span className="font-semibold">
                            <span className="text-gray-400 line-through mr-1">{(node.mem_percent || 0).toFixed(0)}%</span>
                            <span className={`${predicted.mem < (node.mem_percent || 0) - 0.5 ? 'text-green-600 dark:text-green-400' : predicted.mem > (node.mem_percent || 0) + 0.5 ? 'text-orange-600 dark:text-orange-400' : 'text-purple-600 dark:text-purple-400'}`}>
                              {predicted.mem.toFixed(1)}%
                            </span>
                          </span>
                        ) : (
                        <span className="font-semibold text-purple-600 dark:text-purple-400">
                          {(node.mem_percent || 0).toFixed(1)}%
                        </span>
                        )}
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

                    {/* Penalty Breakdown Bar */}
                    {nodeScores && nodeScores[node.name] && nodeScores[node.name].penalty_categories && (() => {
                      const cats = nodeScores[node.name].penalty_categories;
                      const total = cats.cpu + cats.memory + cats.iowait + cats.trends + cats.spikes;
                      if (total === 0) return null;
                      const segments = [
                        { key: 'cpu', value: cats.cpu, color: 'bg-red-500', label: 'CPU' },
                        { key: 'memory', value: cats.memory, color: 'bg-blue-500', label: 'Memory' },
                        { key: 'iowait', value: cats.iowait, color: 'bg-orange-500', label: 'IOWait' },
                        { key: 'trends', value: cats.trends, color: 'bg-yellow-500', label: 'Trends' },
                        { key: 'spikes', value: cats.spikes, color: 'bg-purple-500', label: 'Spikes' },
                      ].filter(s => s.value > 0);
                      return (
                        <div className="mt-1">
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5">Penalty Sources ({total} pts)</div>
                          <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600" title={segments.map(s => `${s.label}: ${s.value}`).join(', ')}>
                            {segments.map(s => (
                              <div key={s.key} className={`${s.color}`} style={{ width: `${(s.value / total * 100)}%` }} />
                            ))}
                          </div>
                          <div className="flex flex-wrap gap-x-2 mt-0.5">
                            {segments.map(s => (
                              <span key={s.key} className="text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5">
                                <span className={`inline-block w-1.5 h-1.5 rounded-full ${s.color}`}></span>
                                {s.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Guests:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">{node.guests?.length || 0}</span>
                    </div>
                  </div>
                </div>
                );
              })}
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
                {/* J3: Export Dropdown */}
                {recommendations.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setCollapsedSections(prev => ({ ...prev, exportDropdown: !prev.exportDropdown }))}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-all duration-200"
                      title="Export recommendations"
                    >
                      <Download size={16} />
                      Export
                      <ChevronDown size={14} />
                    </button>
                    {collapsedSections.exportDropdown && (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
                        <a href="/api/recommendations/export?format=csv" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <ClipboardList size={14} /> Recommendations CSV
                        </a>
                        <a href="/api/recommendations/export?format=json" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <ClipboardList size={14} /> Recommendations JSON
                        </a>
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                        <a href="/api/automigrate/history/export?format=csv" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <Activity size={14} /> Migration History CSV
                        </a>
                        <a href="/api/automigrate/history/export?format=json" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <Activity size={14} /> Migration History JSON
                        </a>
                      </div>
                    )}
                  </div>
                )}
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
                      <p className="text-blue-800 dark:text-blue-200 mb-3">
                        ProxBalance uses a penalty-based scoring system to evaluate every guest on every node. Migrations are recommended when moving a guest would improve its suitability rating by <span className="font-bold">{penaltyConfig?.min_score_improvement || 15}+ points</span>.
                      </p>

                      {/* C3: Score Legend */}
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1.5">Suitability Rating Scale</h5>
                        <div className="flex rounded overflow-hidden h-5 mb-1">
                          <div className="bg-red-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">0-30</div>
                          <div className="bg-orange-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">30-50</div>
                          <div className="bg-yellow-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">50-70</div>
                          <div className="bg-green-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">70-100</div>
                        </div>
                        <div className="flex text-[10px] text-blue-700 dark:text-blue-300">
                          <div className="flex-1 text-center">Poor</div>
                          <div className="flex-1 text-center">Fair</div>
                          <div className="flex-1 text-center">Good</div>
                          <div className="flex-1 text-center">Excellent</div>
                        </div>
                      </div>

                      {/* Your Configuration Summary */}
                      <div className="p-2.5 bg-blue-100 dark:bg-blue-800/30 rounded mb-3">
                        <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">Your Configuration</h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-blue-700 dark:text-blue-300">
                          <span>CPU weight: <span className="font-mono font-semibold">30%</span></span>
                          <span>Memory weight: <span className="font-mono font-semibold">30%</span></span>
                          <span>IOWait weight: <span className="font-mono font-semibold">20%</span></span>
                          <span>Other factors: <span className="font-mono font-semibold">20%</span></span>
                          <span>Current period: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_current * 100).toFixed(0) : '50'}%</span></span>
                          <span>24h average: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_24h * 100).toFixed(0) : '30'}%</span></span>
                          <span>7-day average: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_7d * 100).toFixed(0) : '20'}%</span></span>
                          <span>Min improvement: <span className="font-mono font-semibold">{penaltyConfig?.min_score_improvement || 15} pts</span></span>
                        </div>
                      </div>

                      <ul className="ml-4 space-y-1 text-blue-700 dark:text-blue-300 text-xs list-disc">
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

          {/* Threshold Suggestions Banner */}
          {thresholdSuggestions && thresholdSuggestions.confidence && (
            (() => {
              const hasDiff = (
                Math.abs((thresholdSuggestions.suggested_cpu_threshold || 60) - (cpuThreshold || 60)) >= 3 ||
                Math.abs((thresholdSuggestions.suggested_mem_threshold || 70) - (memThreshold || 70)) >= 3
              );
              if (!hasDiff) return null;
              return (
                <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                          Threshold Suggestions
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          thresholdSuggestions.confidence === 'high'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {thresholdSuggestions.confidence} confidence
                        </span>
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                        {thresholdSuggestions.summary}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          CPU: <span className="font-mono">{cpuThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_cpu_threshold}%</span>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Memory: <span className="font-mono">{memThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_mem_threshold}%</span>
                        </span>
                        {thresholdSuggestions.suggested_iowait_threshold && (
                          <span className="text-gray-600 dark:text-gray-400">
                            IOWait: <span className="font-mono">{iowaitThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_iowait_threshold}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCpuThreshold(thresholdSuggestions.suggested_cpu_threshold);
                        setMemThreshold(thresholdSuggestions.suggested_mem_threshold);
                        if (thresholdSuggestions.suggested_iowait_threshold) {
                          setIowaitThreshold(thresholdSuggestions.suggested_iowait_threshold);
                        }
                      }}
                      className="shrink-0 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      Apply All
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {/* I1: Engine Diagnostics Panel */}
          {!loadingRecommendations && recommendationData?.generated_at && (
            <details className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <summary className="cursor-pointer p-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg">
                <Terminal size={16} />
                Engine Diagnostics
                {recommendationData.generation_time_ms && (
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                    Generated in {recommendationData.generation_time_ms}ms
                  </span>
                )}
              </summary>
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Generation Time</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.generation_time_ms ? `${recommendationData.generation_time_ms}ms` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Recommendations</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.count || recommendations.length}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Guests Evaluated</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {(recommendationData.count || 0) + (recommendationData.skipped_guests?.length || 0)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Skipped</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.skipped_guests?.length || 0}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">AI Enhanced</div>
                    <div className={`font-semibold ${recommendationData.ai_enhanced ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {recommendationData.ai_enhanced ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Conflicts / Advisories</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.conflicts?.length || 0} / {recommendationData.capacity_advisories?.length || 0}
                    </div>
                  </div>
                </div>
                {recommendationData.parameters && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Thresholds: </span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      CPU {recommendationData.parameters.cpu_threshold}% | Mem {recommendationData.parameters.mem_threshold}% | IOWait {recommendationData.parameters.iowait_threshold}%
                    </span>
                    {recommendationData.parameters.maintenance_nodes?.length > 0 && (
                      <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                        | Maintenance: {recommendationData.parameters.maintenance_nodes.join(', ')}
                      </span>
                    )}
                  </div>
                )}
                {/* Skip reason breakdown from summary */}
                {recommendationData.summary?.skip_reasons && Object.keys(recommendationData.summary.skip_reasons).length > 0 && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 block mb-1">Skip Reasons:</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(recommendationData.summary.skip_reasons).map(([reason, count]) => (
                        <span key={reason} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono">
                          {reason}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* F2: Workload Patterns Panel */}
          {!loadingRecommendations && recommendationData?.generated_at && (
            <details className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              onToggle={(e) => {
                if (e.target.open && !workloadPatterns && !patternsLoading) {
                  setPatternsLoading(true);
                  fetch(`${API_BASE}/workload-patterns?hours=168`)
                    .then(r => r.json())
                    .then(res => { if (res.success) setWorkloadPatterns(res.patterns || []); })
                    .catch(() => {})
                    .finally(() => setPatternsLoading(false));
                }
              }}
            >
              <summary className="cursor-pointer p-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg">
                <Activity size={16} />
                Workload Patterns
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">Daily/weekly cycle analysis</span>
              </summary>
              <div className="px-3 pb-3">
                {patternsLoading ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2 flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Analyzing patterns...</div>
                ) : !workloadPatterns || workloadPatterns.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500 py-2">Insufficient history data for pattern analysis. Patterns emerge after several days of data collection.</div>
                ) : (
                  <div className="space-y-3">
                    {workloadPatterns.map((p, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900/50 rounded p-2.5 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Server size={12} className="text-blue-500" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{p.node}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{p.data_points} data points</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          {p.daily_pattern ? (
                            <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <div className="font-medium text-blue-700 dark:text-blue-300 mb-0.5">Daily Cycle <span className="text-blue-500">({p.daily_pattern.pattern_confidence})</span></div>
                              <div className="text-gray-600 dark:text-gray-400">Peak: {p.daily_pattern.peak_avg_cpu}% | Trough: {p.daily_pattern.trough_avg_cpu}%</div>
                              <div className="text-gray-500 dark:text-gray-500">Biz hrs: {p.daily_pattern.business_hours_avg}% | Off hrs: {p.daily_pattern.off_hours_avg}%</div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No daily cycle detected</div>
                          )}
                          {p.weekly_pattern ? (
                            <div className="p-1.5 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                              <div className="font-medium text-purple-700 dark:text-purple-300 mb-0.5">Weekly Cycle <span className="text-purple-500">({p.weekly_pattern.pattern_confidence})</span></div>
                              <div className="text-gray-600 dark:text-gray-400">Weekday: {p.weekly_pattern.weekday_avg}% | Weekend: {p.weekly_pattern.weekend_avg}%</div>
                              <div className="text-gray-500 dark:text-gray-500">Peak days: {p.weekly_pattern.peak_days?.join(', ')}</div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No weekly cycle detected</div>
                          )}
                          {p.burst_detection?.detected ? (
                            <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                              <div className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">Burst Detection</div>
                              <div className="text-gray-600 dark:text-gray-400">{p.burst_detection.recurring_bursts} recurring burst hour(s)</div>
                              <div className="text-gray-500 dark:text-gray-500">Avg burst: {p.burst_detection.avg_burst_cpu}% at hours {p.burst_detection.burst_hours?.join(', ')}</div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No recurring bursts</div>
                          )}
                        </div>
                        {p.recommendation_timing && (
                          <div className="mt-1.5 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Clock size={10} /> {p.recommendation_timing}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Recommendation Summary Digest */}
          {!loadingRecommendations && recommendationData?.summary && (
            <div className={`mb-4 rounded-lg border p-4 ${
              recommendationData.summary.urgency === 'high'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                : recommendationData.summary.urgency === 'medium'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                : recommendationData.summary.urgency === 'none'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity size={18} className={
                    recommendationData.summary.urgency === 'high' ? 'text-yellow-600 dark:text-yellow-400' :
                    recommendationData.summary.urgency === 'medium' ? 'text-orange-600 dark:text-orange-400' :
                    recommendationData.summary.urgency === 'none' ? 'text-green-600 dark:text-green-400' :
                    'text-blue-600 dark:text-blue-400'
                  } />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    Cluster Health: {recommendationData.summary.cluster_health}/100
                  </span>
                </div>
                {recommendationData.summary.urgency !== 'none' && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    recommendationData.summary.urgency === 'high'
                      ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                      : recommendationData.summary.urgency === 'medium'
                      ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                      : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                  }`}>
                    {recommendationData.summary.urgency_label}
                  </span>
                )}
              </div>
              {/* Health bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    recommendationData.summary.cluster_health >= 70 ? 'bg-green-500' :
                    recommendationData.summary.cluster_health >= 50 ? 'bg-yellow-500' :
                    recommendationData.summary.cluster_health >= 30 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${recommendationData.summary.cluster_health}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                <span>{recommendationData.summary.total_recommendations} migration{recommendationData.summary.total_recommendations !== 1 ? 's' : ''} recommended</span>
                {recommendationData.summary.reasons_breakdown?.length > 0 && (
                  <span>({recommendationData.summary.reasons_breakdown.join(', ')})</span>
                )}
                {recommendationData.summary.total_improvement > 0 && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    +{recommendationData.summary.total_improvement.toFixed(0)} pts total improvement
                  </span>
                )}
                {recommendationData.summary.predicted_health > recommendationData.summary.cluster_health && (
                  <span className="text-green-600 dark:text-green-400">
                    Predicted health after: {recommendationData.summary.predicted_health}/100
                  </span>
                )}
              </div>
            </div>
          )}

          {/* G3: Batch Impact Assessment */}
          {!loadingRecommendations && recommendationData?.summary?.batch_impact && recommendations.length > 0 && (
            <details className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 group">
              <summary className="p-3 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors rounded-lg list-none">
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Batch Migration Impact</span>
                  {recommendationData.summary.batch_impact.improvement && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                      {recommendationData.summary.batch_impact.improvement.variance_reduction_pct > 0
                        ? `${recommendationData.summary.batch_impact.improvement.variance_reduction_pct.toFixed(0)}% variance reduction`
                        : `+${recommendationData.summary.batch_impact.improvement.health_delta.toFixed(0)} health`
                      }
                    </span>
                  )}
                </div>
                <ChevronDown size={16} className="text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(recommendationData.summary.batch_impact.before?.node_scores || {}).map(([node, before]) => {
                    const after = recommendationData.summary.batch_impact.after?.node_scores?.[node];
                    if (!after) return null;
                    const cpuDelta = after.cpu - before.cpu;
                    const memDelta = after.mem - before.mem;
                    const guestDelta = after.guest_count - before.guest_count;
                    return (
                      <div key={node} className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded">
                        <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{node}</div>
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">CPU</span>
                            <div className="font-mono">
                              {before.cpu.toFixed(0)}%
                              <span className={`ml-1 ${cpuDelta < -0.5 ? 'text-green-600 dark:text-green-400' : cpuDelta > 0.5 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                {cpuDelta !== 0 ? `→${after.cpu.toFixed(0)}%` : ''}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Mem</span>
                            <div className="font-mono">
                              {before.mem.toFixed(0)}%
                              <span className={`ml-1 ${memDelta < -0.5 ? 'text-green-600 dark:text-green-400' : memDelta > 0.5 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                {memDelta !== 0 ? `→${after.mem.toFixed(0)}%` : ''}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Guests</span>
                            <div className="font-mono">
                              {before.guest_count}
                              {guestDelta !== 0 && (
                                <span className={`ml-1 ${guestDelta < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                  →{after.guest_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {recommendationData.summary.batch_impact.improvement && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>Health: {recommendationData.summary.cluster_health} → {recommendationData.summary.predicted_health}
                      <span className="text-green-600 dark:text-green-400 font-medium ml-1">
                        (+{recommendationData.summary.batch_impact.improvement.health_delta.toFixed(1)})
                      </span>
                    </span>
                    <span>Variance: {recommendationData.summary.batch_impact.before.score_variance.toFixed(1)} → {recommendationData.summary.batch_impact.after.score_variance.toFixed(1)}</span>
                    {recommendationData.summary.batch_impact.improvement.all_nodes_improved && (
                      <span className="text-green-600 dark:text-green-400 font-medium">All nodes improved or stable</span>
                    )}
                  </div>
                )}
              </div>
            </details>
          )}

          {/* I3: Recommendation Change Log Summary */}
          {!loadingRecommendations && recommendationData?.changes_since_last && (
            (() => {
              const changes = recommendationData.changes_since_last;
              const hasChanges = changes.new_recommendations?.length > 0 ||
                changes.removed_recommendations?.length > 0 ||
                changes.changed_targets?.length > 0;
              if (!hasChanges) return null;
              return (
                <details className="mb-4 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <summary className="cursor-pointer p-3 flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors rounded-lg">
                    <RefreshCw size={16} />
                    Changes Since Last Generation
                    <div className="flex gap-1.5 ml-2">
                      {changes.new_recommendations?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                          +{changes.new_recommendations.length} new
                        </span>
                      )}
                      {changes.removed_recommendations?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          -{changes.removed_recommendations.length} removed
                        </span>
                      )}
                      {changes.changed_targets?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                          {changes.changed_targets.length} changed
                        </span>
                      )}
                      {changes.unchanged > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {changes.unchanged} unchanged
                        </span>
                      )}
                    </div>
                  </summary>
                  <div className="px-3 pb-3 space-y-2 text-xs">
                    {changes.new_recommendations?.map((r, i) => (
                      <div key={`new-${i}`} className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Plus size={12} />
                        <span className="font-medium">[{r.vmid}] {r.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{r.source_node} → {r.target_node}</span>
                      </div>
                    ))}
                    {changes.removed_recommendations?.map((r, i) => (
                      <div key={`rem-${i}`} className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <Minus size={12} />
                        <span className="font-medium">[{r.vmid}] {r.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{r.source_node} → {r.target_node} (no longer needed)</span>
                      </div>
                    ))}
                    {changes.changed_targets?.map((r, i) => (
                      <div key={`chg-${i}`} className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <ArrowRight size={12} />
                        <span className="font-medium">[{r.vmid}] {r.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">target changed: {r.old_target} → {r.new_target}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })()
          )}

          {/* F3: Capacity Planning Advisories */}
          {!loadingRecommendations && recommendationData?.capacity_advisories?.length > 0 && (
            <div className="mb-4 space-y-2">
              {recommendationData.capacity_advisories.map((adv, i) => (
                <div key={i} className={`rounded-lg border p-3 text-sm ${
                  adv.severity === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                    : adv.severity === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${
                      adv.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                      adv.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-xs uppercase tracking-wide mb-0.5">
                        {adv.severity === 'critical' ? 'Critical' : adv.severity === 'warning' ? 'Warning' : 'Info'}: {adv.type.replace(/_/g, ' ')}
                      </div>
                      <div>{adv.message}</div>
                      {adv.suggestions?.length > 0 && (
                        <ul className="mt-1 text-xs opacity-80 list-disc list-inside">
                          {adv.suggestions.map((s, j) => <li key={j}>{s}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* G1: Migration Conflict Warnings */}
          {!loadingRecommendations && recommendationData?.conflicts?.length > 0 && (
            <div className="mb-4 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400" />
                <span className="font-semibold text-orange-800 dark:text-orange-200">
                  Migration Conflicts Detected ({recommendationData.conflicts.length})
                </span>
              </div>
              <div className="space-y-2 text-xs text-orange-700 dark:text-orange-300">
                {recommendationData.conflicts.map((c, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-gray-800/50 rounded border border-orange-200 dark:border-orange-800">
                    <div className="font-medium mb-1">
                      Target: {c.target_node} — {c.incoming_guests.length} incoming migrations
                    </div>
                    <div className="flex flex-wrap gap-2 mb-1">
                      {c.exceeds_cpu && <span className="text-red-600 dark:text-red-400">Combined CPU: {c.combined_predicted_cpu}% (threshold: {c.cpu_threshold}%)</span>}
                      {c.exceeds_mem && <span className="text-red-600 dark:text-red-400">Combined Memory: {c.combined_predicted_mem}% (threshold: {c.mem_threshold}%)</span>}
                    </div>
                    <div className="italic">{c.resolution}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* F1: Forecast Alerts — Proactive Trend-Based Threshold Warnings */}
          {!loadingRecommendations && recommendationData?.forecasts?.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, forecastAlerts: !prev.forecastAlerts }))}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.forecastAlerts ? '' : 'rotate-180'}`} />
                <Zap size={14} className="text-amber-500" />
                Trend Forecasts ({recommendationData.forecasts.length})
                <span className="text-xs text-gray-400 dark:text-gray-500">— Projected threshold crossings</span>
              </button>
              {!collapsedSections.forecastAlerts && (
                <div className="space-y-2">
                  {recommendationData.forecasts.map((fc, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      fc.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      : fc.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    }`}>
                      <div className={`shrink-0 p-1.5 rounded-full ${
                        fc.severity === 'critical' ? 'bg-red-100 dark:bg-red-800' : fc.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-800' : 'bg-blue-100 dark:bg-blue-800'
                      }`}>
                        <AlertTriangle size={14} className={
                          fc.severity === 'critical' ? 'text-red-600 dark:text-red-400' : fc.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">{fc.node}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                            fc.severity === 'critical' ? 'bg-red-600 text-white' : fc.severity === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                          }`}>{fc.severity}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 uppercase">{fc.metric}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{fc.message}</p>
                        <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-500">
                          <span>Current: <strong className="text-gray-700 dark:text-gray-300">{fc.current_value?.toFixed(1)}%</strong></span>
                          <span>Threshold: <strong className="text-gray-700 dark:text-gray-300">{fc.threshold}%</strong></span>
                          <span>Projected: <strong className="text-gray-700 dark:text-gray-300">{fc.projected_value?.toFixed(1)}%</strong></span>
                          {fc.estimated_hours_to_crossing && <span>ETA: <strong className="text-gray-700 dark:text-gray-300">~{fc.estimated_hours_to_crossing < 24 ? `${fc.estimated_hours_to_crossing.toFixed(0)}h` : `${(fc.estimated_hours_to_crossing / 24).toFixed(1)}d`}</strong></span>}
                          <span>Rate: <strong className="text-gray-700 dark:text-gray-300">{fc.trend_rate_per_day > 0 ? '+' : ''}{fc.trend_rate_per_day?.toFixed(1)}%/day</strong></span>
                          <span>Confidence: <strong className="text-gray-700 dark:text-gray-300">{fc.confidence}</strong> (R²={fc.r_squared?.toFixed(2)})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* J2: Recommendation Filter Controls */}
          {!loadingRecommendations && recommendations.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowRecFilters(prev => !prev)}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-2"
              >
                <Filter size={12} />
                {showRecFilters ? 'Hide Filters' : 'Filter & Sort'}
                {(recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded text-[10px] font-medium">Active</span>
                )}
              </button>
              {showRecFilters && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-2">
                  <select
                    value={recFilterConfidence}
                    onChange={e => setRecFilterConfidence(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Min Confidence: Any</option>
                    <option value="80">≥ 80%</option>
                    <option value="60">≥ 60%</option>
                    <option value="40">≥ 40%</option>
                    <option value="20">≥ 20%</option>
                  </select>
                  <select
                    value={recFilterSourceNode}
                    onChange={e => setRecFilterSourceNode(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Source: All Nodes</option>
                    {[...new Set(recommendations.map(r => r.source_node))].sort().map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <select
                    value={recFilterTargetNode}
                    onChange={e => setRecFilterTargetNode(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Target: All Nodes</option>
                    {[...new Set(recommendations.map(r => r.target_node))].sort().map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <select
                    value={recSortBy}
                    onChange={e => setRecSortBy(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Sort: Default</option>
                    <option value="score_improvement">Score Improvement</option>
                    <option value="confidence_score">Confidence</option>
                    <option value="risk_score">Risk Score</option>
                  </select>
                  <button
                    onClick={() => setRecSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    title={`Sort direction: ${recSortDir}`}
                  >
                    {recSortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
                  </button>
                  {(recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && (
                    <button
                      onClick={() => { setRecFilterConfidence(''); setRecFilterTargetNode(''); setRecFilterSourceNode(''); setRecSortBy(''); }}
                      className="text-xs px-2 py-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

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
              {(() => {
                // J2: Apply client-side filters and sorting
                let filtered = [...recommendations];
                if (recFilterConfidence) {
                  const minConf = parseInt(recFilterConfidence);
                  filtered = filtered.filter(r => (r.confidence_score || 0) >= minConf);
                }
                if (recFilterSourceNode) {
                  filtered = filtered.filter(r => r.source_node === recFilterSourceNode);
                }
                if (recFilterTargetNode) {
                  filtered = filtered.filter(r => r.target_node === recFilterTargetNode);
                }
                if (recSortBy) {
                  filtered.sort((a, b) => {
                    const va = a[recSortBy] || 0;
                    const vb = b[recSortBy] || 0;
                    return recSortDir === 'asc' ? va - vb : vb - va;
                  });
                }
                return filtered;
              })().map((rec, idx) => {
                const key = `${rec.vmid}-${rec.target_node}`;
                const status = migrationStatus[key];
                const completed = completedMigrations[rec.vmid];
                const isCompleted = completed !== undefined;
                const isMaintenance = rec.reason && rec.reason.toLowerCase().includes('maintenance');
                // I3: Check if this recommendation is new or changed
                const changeLog = recommendationData?.changes_since_last;
                const isNewRec = changeLog?.new_recommendations?.some(r => String(r.vmid) === String(rec.vmid));
                const changedTarget = changeLog?.changed_targets?.find(r => String(r.vmid) === String(rec.vmid));

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
                          {/* I3: Change status badges */}
                          {isNewRec && !isCompleted && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">NEW</span>
                          )}
                          {changedTarget && !isCompleted && (
                            <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded"
                              title={`Target changed from ${changedTarget.old_target} → ${changedTarget.new_target}`}>
                              TARGET CHANGED
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
                                {rec.score_details?.source?.metrics && (
                                  <span className="text-[10px] font-normal opacity-75 ml-0.5">
                                    ({rec.score_details.source.metrics.current_cpu?.toFixed(0) || '?'}% CPU)
                                  </span>
                                )}
                              </span>
                              <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold">
                                <span className="text-xs">TO:</span>
                                <span>{rec.target_node}</span>
                                {rec.score_details?.target?.metrics && (
                                  <span className="text-[10px] font-normal opacity-75 ml-0.5">
                                    ({rec.score_details.target.metrics.predicted_cpu?.toFixed(0) || '?'}% CPU)
                                  </span>
                                )}
                              </span>
                              {/* Score Improvement Progress Bar */}
                              {rec.score_improvement !== undefined && (() => {
                                const maxImprovement = 80;
                                const pct = Math.min(100, (rec.score_improvement / maxImprovement) * 100);
                                const barColor = rec.score_improvement >= 50 ? 'bg-green-500' :
                                  rec.score_improvement >= 30 ? 'bg-yellow-500' :
                                  rec.score_improvement >= (penaltyConfig?.min_score_improvement || 15) ? 'bg-orange-500' :
                                  'bg-red-500';
                                return (
                                  <span className="inline-flex items-center gap-1.5 min-w-[120px]" title={`Score improvement: +${rec.score_improvement.toFixed(1)} penalty points`}>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">+{rec.score_improvement.toFixed(0)}</span>
                                    <span className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden min-w-[60px]">
                                      <span className={`block h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                    </span>
                                  </span>
                                );
                              })()}
                            </>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {/* Structured reason with contributing factors */}
                          {rec.structured_reason ? (
                            <div>
                              <span className={`font-medium ${isMaintenance ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                                {rec.structured_reason.primary_label}
                              </span>
                              {rec.structured_reason.contributing_factors?.length > 0 && (
                                <span className="ml-1 text-gray-500 dark:text-gray-500">
                                  — {rec.structured_reason.contributing_factors.slice(0, 3).map(f => f.label).join('; ')}
                                </span>
                              )}
                              <span className="ml-2">| <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB</span>
                              {/* Confidence Dot Indicator */}
                              {rec.confidence_score !== undefined && (
                                <span className="ml-2 inline-flex items-center gap-1" title={`Confidence: ${rec.confidence_score}%`}>
                                  <span className="text-gray-500 dark:text-gray-400">|</span>
                                  <span className="inline-flex gap-0.5">
                                    {[20, 40, 60, 80, 100].map((threshold) => (
                                      <span key={threshold} className={`w-1.5 h-1.5 rounded-full ${
                                        rec.confidence_score >= threshold
                                          ? rec.confidence_score >= 70 ? 'bg-green-500' : rec.confidence_score >= 40 ? 'bg-yellow-500' : 'bg-orange-500'
                                          : 'bg-gray-300 dark:bg-gray-600'
                                      }`} />
                                    ))}
                                  </span>
                                  <span className={`font-semibold text-[10px] ${
                                    rec.confidence_score >= 70 ? 'text-green-600 dark:text-green-400' :
                                    rec.confidence_score >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-orange-600 dark:text-orange-400'
                                  }`}>{rec.confidence_score}%</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">Reason:</span> <span className={isMaintenance ? 'font-bold text-yellow-600 dark:text-yellow-400' : ''}>{rec.reason}</span> | <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB
                            </div>
                          )}
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

                        {/* Risk Badge + Conflict Warning */}
                        {!isCompleted && (rec.risk_level || rec.has_conflict) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {rec.risk_level && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec.risk_level === 'very_high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                rec.risk_level === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                rec.risk_level === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              }`} title={rec.risk_factors?.map(f => f.detail).join('\n') || ''}>
                                <AlertTriangle size={10} />
                                Risk: {rec.risk_level === 'very_high' ? 'Very High' : rec.risk_level.charAt(0).toUpperCase() + rec.risk_level.slice(1)}
                                ({rec.risk_score}/100)
                              </span>
                            )}
                            {rec.has_conflict && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                title={`Multiple migrations targeting ${rec.conflict_target} — combined load may exceed thresholds`}>
                                <XCircle size={10} />
                                Target Conflict
                              </span>
                            )}
                          </div>
                        )}

                        {/* Score Breakdown (expandable) */}
                        {rec.score_details && !isCompleted && (
                          <div className="mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const breakdownKey = `breakdown-${idx}`;
                                setCollapsedSections(prev => ({
                                  ...prev,
                                  [breakdownKey]: !prev[breakdownKey]
                                }));
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Info size={12} />
                              {collapsedSections[`breakdown-${idx}`] ? 'Hide score breakdown' : 'Show score breakdown'}
                            </button>
                            {collapsedSections[`breakdown-${idx}`] && (
                              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded text-xs">
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Source node breakdown */}
                                  <div>
                                    <div className="font-semibold text-red-600 dark:text-red-400 mb-1">Source: {rec.source_node}</div>
                                    <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                                      <div>Score: {rec.score_details.source?.total_score?.toFixed(1) || 'N/A'}</div>
                                      <div className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500">Penalties:</div>
                                      {Object.entries(rec.score_details.source?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                                        <div key={key} className="flex justify-between">
                                          <span>{key.replace(/_/g, ' ')}</span>
                                          <span className="text-red-500 dark:text-red-400 font-mono">+{val}</span>
                                        </div>
                                      ))}
                                      {Object.values(rec.score_details.source?.penalties || {}).every(v => v === 0) && (
                                        <div className="text-green-600 dark:text-green-400">No penalties</div>
                                      )}
                                    </div>
                                  </div>
                                  {/* Target node breakdown */}
                                  <div>
                                    <div className="font-semibold text-green-600 dark:text-green-400 mb-1">Target: {rec.target_node}</div>
                                    <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                                      <div>Score: {rec.score_details.target?.total_score?.toFixed(1) || 'N/A'}</div>
                                      <div className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500">Penalties:</div>
                                      {Object.entries(rec.score_details.target?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                                        <div key={key} className="flex justify-between">
                                          <span>{key.replace(/_/g, ' ')}</span>
                                          <span className="text-red-500 dark:text-red-400 font-mono">+{val}</span>
                                        </div>
                                      ))}
                                      {Object.values(rec.score_details.target?.penalties || {}).every(v => v === 0) && (
                                        <div className="text-green-600 dark:text-green-400">No penalties</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {/* Predicted metrics */}
                                {rec.score_details.target?.metrics && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-1">After migration on {rec.target_node}:</div>
                                    <div className="flex gap-4 text-gray-600 dark:text-gray-400">
                                      <span>CPU: {rec.score_details.target.metrics.predicted_cpu}%</span>
                                      <span>Memory: {rec.score_details.target.metrics.predicted_mem}%</span>
                                      <span>Headroom: {rec.score_details.target.metrics.cpu_headroom}% CPU, {rec.score_details.target.metrics.mem_headroom}% mem</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

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
                          <div className="flex flex-wrap items-center gap-3">
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

                            {/* Recommendation Feedback Widget */}
                            {!isCompleted && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-gray-400 dark:text-gray-500">Helpful?</span>
                                {feedbackGiven[`${rec.vmid}-${rec.target_node}`] ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    feedbackGiven[`${rec.vmid}-${rec.target_node}`] === 'helpful'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  }`}>
                                    {feedbackGiven[`${rec.vmid}-${rec.target_node}`] === 'helpful' ? 'Thanks!' : 'Noted'}
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onFeedback(rec, 'helpful'); }}
                                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                      title="This recommendation is helpful"
                                    >
                                      <ThumbsUp size={12} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onFeedback(rec, 'not_helpful'); }}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                      title="This recommendation is not helpful"
                                    >
                                      <ThumbsDown size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {collapsedSections[`command-${idx}`] && (
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
                          // If migration is completed, show "Migrated" badge + rollback button
                          if (isCompleted) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                                  <CheckCircle size={16} />
                                  Migrated
                                </div>
                                {canMigrate && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { fetchRollbackInfo, executeRollback } = await import('../api/client.js');
                                        const infoRes = await fetchRollbackInfo(rec.vmid);
                                        if (infoRes.error || !infoRes.success) {
                                          setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'unavailable' }));
                                          return;
                                        }
                                        const info = infoRes.rollback_info;
                                        if (!info.available) {
                                          alert(`Rollback unavailable: ${info.detail}`);
                                          return;
                                        }
                                        if (!info.rollback_safe) {
                                          if (!confirm(`Rollback may be risky: ${info.detail}\n\nProceed anyway?`)) return;
                                        }
                                        if (!confirm(`Rollback ${rec.type} ${rec.vmid} (${rec.name}) back to ${info.original_node}?`)) return;
                                        setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'running' }));
                                        const result = await executeRollback(rec.vmid);
                                        if (result.success) {
                                          setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'done' }));
                                        } else {
                                          alert(`Rollback failed: ${result.error || 'Unknown error'}`);
                                          setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'failed' }));
                                        }
                                      } catch (err) {
                                        alert(`Rollback error: ${err.message}`);
                                      }
                                    }}
                                    disabled={migrationStatus[`rollback-${rec.vmid}`] === 'running'}
                                    className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1 transition-colors"
                                    title="Rollback: migrate back to original node"
                                  >
                                    {migrationStatus[`rollback-${rec.vmid}`] === 'running' ? (
                                      <><RefreshCw size={12} className="animate-spin" /> Rolling back...</>
                                    ) : migrationStatus[`rollback-${rec.vmid}`] === 'done' ? (
                                      <><CheckCircle size={12} /> Rolled back</>
                                    ) : (
                                      <><RotateCcw size={12} /> Rollback</>
                                    )}
                                  </button>
                                )}
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

          {/* Skipped Guests — "Why Not?" Section */}
          {!loadingRecommendations && recommendationData?.skipped_guests?.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, skippedGuests: !prev.skippedGuests }))}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${collapsedSections.skippedGuests ? '' : 'rotate-180'}`}
                />
                <span className="font-medium">Not Recommended ({recommendationData.skipped_guests.length} guests evaluated)</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">— Why weren't these guests recommended?</span>
              </button>
              {!collapsedSections.skippedGuests && (
                <div className="mt-2 space-y-1">
                  {recommendationData.skipped_guests.slice(0, 20).map((skipped, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                      <span className={`shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold ${
                        skipped.reason === 'insufficient_improvement'
                          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                          : skipped.reason === 'ha_managed'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                          : skipped.reason === 'no_suitable_target'
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {skipped.reason === 'insufficient_improvement' ? '~' :
                         skipped.reason === 'ha_managed' ? 'H' :
                         skipped.reason === 'no_suitable_target' ? '!' :
                         skipped.reason === 'stopped' ? 'S' :
                         skipped.reason === 'passthrough_disk' ? 'P' :
                         skipped.reason === 'has_ignore_tag' ? 'I' :
                         skipped.reason === 'unshared_bind_mount' ? 'B' : '?'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          [{skipped.type} {skipped.vmid}] {skipped.name}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 ml-1">on {skipped.node}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">— {skipped.detail}</span>
                        {skipped.score_improvement !== undefined && (
                          <span className="ml-1 text-yellow-600 dark:text-yellow-400 font-mono">
                            (+{skipped.score_improvement} pts, need {penaltyConfig?.min_score_improvement || 15})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {recommendationData.skipped_guests.length > 20 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">
                      ...and {recommendationData.skipped_guests.length - 20} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* G2: Execution Plan — Migration Ordering & Dependencies */}
          {!loadingRecommendations && recommendationData?.execution_plan?.ordered_recommendations?.length > 1 && (
            <div className="mt-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, executionPlan: !prev.executionPlan }))}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.executionPlan ? '' : 'rotate-180'}`} />
                <List size={14} className="text-indigo-500" />
                Execution Plan ({recommendationData.execution_plan.total_steps} steps)
                {recommendationData.execution_plan.can_parallelize && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">Parallel groups available</span>
                )}
              </button>
              {!collapsedSections.executionPlan && (
                <div className="space-y-1.5">
                  {recommendationData.execution_plan.ordered_recommendations.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                      <div className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          [{step.vmid}] {step.name}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 mx-1">{step.source_node}</span>
                        <ArrowRight size={10} className="inline text-gray-400" />
                        <span className="text-gray-400 dark:text-gray-500 mx-1">{step.target_node}</span>
                      </div>
                      {step.parallel_group !== undefined && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          Group {step.parallel_group + 1}
                        </span>
                      )}
                      {step.reason_for_order && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[200px] truncate" title={step.reason_for_order}>
                          {step.reason_for_order}
                        </span>
                      )}
                    </div>
                  ))}
                  {recommendationData.execution_plan.can_parallelize && recommendationData.execution_plan.parallel_groups?.length > 0 && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-2">
                      Steps within the same group can run in parallel. Groups must execute sequentially.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* E1: Migration Outcome Tracking */}
          {!loadingRecommendations && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  setCollapsedSections(prev => ({ ...prev, migrationOutcomes: !prev.migrationOutcomes }));
                  if (!migrationOutcomes && !loadingOutcomes) {
                    setLoadingOutcomes(true);
                    try {
                      const { fetchMigrationOutcomes, refreshMigrationOutcomes } = await import('../api/client.js');
                      await refreshMigrationOutcomes();
                      const res = await fetchMigrationOutcomes(null, 10);
                      if (res.success) setMigrationOutcomes(res.outcomes || []);
                    } catch (e) { console.error('Error loading outcomes:', e); }
                    setLoadingOutcomes(false);
                  }
                }}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.migrationOutcomes ? '' : 'rotate-180'}`} />
                <BarChart2 size={14} className="text-green-500" />
                Migration Outcomes
                <span className="text-xs text-gray-400 dark:text-gray-500">— Predicted vs. actual results</span>
              </button>
              {!collapsedSections.migrationOutcomes && (
                <div className="space-y-2">
                  {loadingOutcomes ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 py-2 flex items-center gap-2">
                      <RefreshCw size={12} className="animate-spin" /> Loading outcomes...
                    </div>
                  ) : !migrationOutcomes || migrationOutcomes.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
                      No migration outcomes tracked yet. Outcomes are recorded automatically when migrations are executed.
                    </div>
                  ) : (
                    migrationOutcomes.map((outcome, idx) => {
                      const pre = outcome.pre_migration || {};
                      const post = outcome.post_migration || {};
                      const isPending = outcome.status === 'pending_post_capture';
                      return (
                        <div key={idx} className={`text-xs p-2.5 rounded border ${isPending ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              [{outcome.guest_type} {outcome.vmid}] {outcome.source_node} → {outcome.target_node}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${isPending ? 'bg-amber-500 text-white' : outcome.accuracy_pct >= 70 ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                              {isPending ? 'PENDING' : outcome.accuracy_pct != null ? `${outcome.accuracy_pct}% accurate` : 'COMPLETED'}
                            </span>
                          </div>
                          {!isPending && post && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Source CPU</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600 dark:text-gray-400">{pre.source_node?.cpu}%</span>
                                  <ArrowRight size={8} className="text-gray-400" />
                                  <span className={`font-medium ${(pre.source_node?.cpu || 0) > (post.source_node?.cpu || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{post.source_node?.cpu}%</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Source Memory</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600 dark:text-gray-400">{pre.source_node?.mem}%</span>
                                  <ArrowRight size={8} className="text-gray-400" />
                                  <span className={`font-medium ${(pre.source_node?.mem || 0) > (post.source_node?.mem || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{post.source_node?.mem}%</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {isPending && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">Post-migration metrics pending (captured after 5 minute cooldown)</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* C4: Recommendation History — Score Trend Timeline */}
          {!loadingRecommendations && (
            <div className="mt-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, recHistory: !prev.recHistory }))}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.recHistory ? '' : 'rotate-180'}`} />
                <Calendar size={14} className="text-purple-500" />
                Recommendation History
                <span className="text-xs text-gray-400 dark:text-gray-500">— Score trends over time</span>
              </button>
              {!collapsedSections.recHistory && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  {historyLoading ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 py-2 flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Loading history...</div>
                  ) : !historyData || historyData.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 py-2">No score history data yet. History is recorded automatically every time recommendations are generated.</div>
                  ) : (() => {
                    const entries = historyData.slice(-48);
                    const healthValues = entries.map(e => e.cluster_health || 0);
                    const recCounts = entries.map(e => e.recommendation_count || 0);
                    const maxRec = Math.max(...recCounts, 1);
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Cluster Health</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full inline-block"></span> Rec Count</span>
                          </div>
                          <select value={historyHours} onChange={e => setHistoryHours(Number(e.target.value))} className="text-[10px] px-1.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <option value={6}>6h</option>
                            <option value={24}>24h</option>
                            <option value={72}>3 days</option>
                            <option value={168}>7 days</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-px h-16">
                          {entries.map((entry, i) => {
                            const healthPct = (healthValues[i] / 100) * 100;
                            const recPct = recCounts[i] > 0 ? Math.max(10, (recCounts[i] / maxRec) * 100) : 0;
                            const ts = new Date(entry.timestamp);
                            const timeLabel = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${timeLabel}\nHealth: ${healthValues[i].toFixed(0)}%\nRecs: ${recCounts[i]}`}>
                                <div className="w-full flex flex-col justify-end h-16">
                                  <div className="w-full bg-green-400 dark:bg-green-500 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity" style={{ height: `${healthPct}%`, minHeight: healthPct > 0 ? '1px' : '0' }}></div>
                                </div>
                                {recPct > 0 && <div className="absolute bottom-0 w-1 bg-orange-500 rounded-t-sm opacity-70" style={{ height: `${recPct * 0.6}%`, minHeight: '2px' }}></div>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-gray-400 dark:text-gray-500">
                          <span>{entries.length > 0 ? new Date(entries[0].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          <span>{entries.length > 0 ? new Date(entries[entries.length - 1].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                          {entries.length} snapshots over last {historyHours}h — Latest health: <strong className="text-gray-700 dark:text-gray-300">{healthValues[healthValues.length - 1]?.toFixed(0)}%</strong>, Recs: <strong className="text-gray-700 dark:text-gray-300">{recCounts[recCounts.length - 1]}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
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
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
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
            {!updating && updateResult !== 'success' && (
              <button
                onClick={() => { setShowUpdateModal(false); setUpdateLog([]); setUpdateResult(null); }}
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
              >
                <X size={20} className="text-gray-600 dark:text-gray-400" />
              </button>
            )}
          </div>

          {systemInfo && !updating && updateResult === null && (
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
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
                >
                  <X size={14} /> Cancel
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

          {updating && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <RefreshCw size={40} className="text-blue-600 dark:text-blue-400 animate-spin" />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Updating ProxBalance...</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This may take a minute.</p>
              </div>
            </div>
          )}

          {!updating && updateResult === 'success' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Update complete!</p>
              </div>
              {updateLog.length > 0 && (
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
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
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button
                  onClick={() => window.location.reload()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                >
                  <RefreshCw size={16} />
                  Close & Reload
                </button>
              </div>
            </div>
          )}

          {!updating && updateResult === 'up-to-date' && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <CheckCircle size={40} className="text-blue-600 dark:text-blue-400" />
              <div className="text-center">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">Already up to date</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">No new updates available.</p>
              </div>
              <button
                onClick={() => { setShowUpdateModal(false); setUpdateLog([]); setUpdateResult(null); }}
                className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
              >
                Close
              </button>
            </div>
          )}

          {!updating && updateResult === 'error' && (
            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-200">Update failed</h3>
                    <p className="text-sm text-red-800 dark:text-red-300 mt-1">{updateError}</p>
                  </div>
                </div>
              </div>

              {updateLog.length > 0 && (
                <details>
                  <summary className="text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200">
                    Show update log
                  </summary>
                  <div className="mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto">
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
                    </div>
                  </div>
                </details>
              )}

              <div className="flex justify-end">
                <button
                  onClick={() => { setShowUpdateModal(false); setUpdateLog([]); setUpdateResult(null); }}
                  className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center gap-1.5"
                >
                  <X size={14} /> Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {showBranchModal && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={clearTestingMode}
                          disabled={rollingBack || switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                          className="px-3 py-1.5 text-amber-700 dark:text-amber-300 text-sm rounded border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Stay on current branch and dismiss this banner"
                        >
                          Dismiss
                        </button>
                        <button
                          onClick={rollbackBranch}
                          disabled={rollingBack || switchingBranch || (systemInfo && systemInfo.update_in_progress)}
                          className="px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {rollingBack ? 'Switching...' : (systemInfo && systemInfo.update_in_progress ? 'Busy...' : 'Go Back')}
                        </button>
                      </div>
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
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <X size={12} /> Close preview
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
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
                  >
                    <X size={14} /> Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    <MigrationModals
      showMigrationDialog={showMigrationDialog}
      setShowMigrationDialog={setShowMigrationDialog}
      selectedGuest={selectedGuest}
      canMigrate={canMigrate}
      migrationTarget={migrationTarget}
      setMigrationTarget={setMigrationTarget}
      data={data}
      setData={setData}
      executeMigration={executeMigration}
      showTagModal={showTagModal}
      setShowTagModal={setShowTagModal}
      tagModalGuest={tagModalGuest}
      setTagModalGuest={setTagModalGuest}
      newTag={newTag}
      setNewTag={setNewTag}
      handleAddTag={handleAddTag}
      setError={setError}
      confirmRemoveTag={confirmRemoveTag}
      setConfirmRemoveTag={setConfirmRemoveTag}
      confirmAndRemoveTag={confirmAndRemoveTag}
      confirmMigration={confirmMigration}
      setConfirmMigration={setConfirmMigration}
      confirmAndMigrate={confirmAndMigrate}
      showBatchConfirmation={showBatchConfirmation}
      setShowBatchConfirmation={setShowBatchConfirmation}
      pendingBatchMigrations={pendingBatchMigrations}
      confirmBatchMigration={confirmBatchMigration}
      collapsedSections={collapsedSections}
      setCollapsedSections={setCollapsedSections}
      cancelMigrationModal={cancelMigrationModal}
      setCancelMigrationModal={setCancelMigrationModal}
      cancellingMigration={cancellingMigration}
      setCancellingMigration={setCancellingMigration}
      fetchAutomationStatus={fetchAutomationStatus}
    />

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
                  <button
                    onClick={clearTestingMode}
                    className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800/50 cursor-pointer"
                    title={`Click to dismiss — previously on ${systemInfo.previous_branch}`}
                  >
                    testing &times;
                  </button>
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


  </>);
}
