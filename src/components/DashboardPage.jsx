import {
  AlertCircle, Settings, X
} from './Icons.jsx';
import { BTN_DANGER, BTN_SECONDARY } from '../utils/designTokens.js';

const { useState, useMemo } = React;

import KpiRow from './dashboard/KpiRow.jsx';
import ClusterSection from './dashboard/ClusterSection.jsx';
import AutoStatusPill from './dashboard/AutoStatusPill.jsx';
import { recsByNode, recsByGuest } from './dashboard/recsHelpers.js';
import NodeDetailsModal from './dashboard/NodeDetailsModal.jsx';
import GuestDetailsModal from './dashboard/GuestDetailsModal.jsx';
import EvacuationModals from './dashboard/EvacuationModals.jsx';
import MigrationModals from './dashboard/MigrationModals.jsx';
import AIRecommendationsSection from './dashboard/AIRecommendationsSection.jsx';
import SystemModals from './dashboard/SystemModals.jsx';

export default function DashboardPage({
  // Data & loading
  data, setData, loading, error, setError, config,
  // Dark mode
  darkMode, toggleDarkMode,
  // Navigation
  setCurrentPage, setScrollToApiConfig, setOpenPenaltyConfigOnAutomation,
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
  // Guest profiles & score history
  guestProfiles, scoreHistory,
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
  // Chart.js lazy loader
  loadChartJs, chartJsLoaded,
  // Helper functions
  checkAffinityViolations, generateSparkline, fetchGuestLocations,
  // Guest migration options
  guestMigrationOptions, loadingGuestOptions, fetchGuestMigrationOptions, setGuestMigrationOptions,
  // API base
  API_BASE
}) {
  // Dashboard Page - data is guaranteed to be available here
  const [showPredicted, setShowPredicted] = useState(false);

  // Recommendation cross-reference badges shown on Nodes/Guests tabs
  const nodeRecCounts = useMemo(() => recsByNode(recommendations), [recommendations]);
  const guestRecMap = useMemo(() => recsByGuest(recommendations), [recommendations]);

  const ignoredGuests = Object.values(data.guests || {}).filter(g => g.tags?.has_ignore);
  const excludeGuests = Object.values(data.guests || {}).filter(g => g.tags?.exclude_groups?.length > 0);
  const affinityGuests = Object.values(data.guests || {}).filter(g => (g.tags?.affinity_groups?.length > 0) || g.tags?.all_tags?.some(t => t.startsWith('affinity_')));
  const autoMigrateOkGuests = Object.values(data.guests || {}).filter(g => g.tags?.all_tags?.includes('auto_migrate_ok'));
  const violations = checkAffinityViolations();

  return (<>
    <div className="p-4 pb-20 sm:pb-4 overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto">
        {/* Token Authentication Error Banner */}
        {tokenAuthError && (
          <div className="mb-4 bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-bold text-red-200 mb-1">API Token Authentication Failed</h3>
                <p className="text-sm text-red-300/80 mb-3">
                  ProxBalance cannot connect to the Proxmox API due to invalid or misconfigured token credentials.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button onClick={() => { setScrollToApiConfig(true); setCurrentPage('settings'); }} className={`${BTN_DANGER} flex items-center gap-2`}>
                    <Settings size={14} /> Fix Token Configuration
                  </button>
                  <button onClick={() => setTokenAuthError(false)} className={`${BTN_SECONDARY} flex items-center gap-2`}>
                    <X size={14} /> Dismiss
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* KPI Summary Row */}
        <KpiRow
          data={data}
          nodeScores={nodeScores}
          automationStatus={automationStatus}
          recommendations={recommendations}
          ignoredGuests={ignoredGuests}
          autoMigrateOkGuests={autoMigrateOkGuests}
          affinityGuests={affinityGuests}
          excludeGuests={excludeGuests}
        />

        {/* Auto-migration status banner — expandable to show last-run + run history */}
        <div className="mb-3">
          <AutoStatusPill
            size="banner"
            automationStatus={automationStatus}
            fetchAutomationStatus={fetchAutomationStatus}
            runAutomationNow={runAutomationNow}
            runningAutomation={runningAutomation}
            setCurrentPage={setCurrentPage}
            runHistory={runHistory}
          />
        </div>

        {/* Unified Cluster section — Nodes / Guests / Map / Charts / Recs / Auto tabs */}
        <ClusterSection
          data={data}
          nodeScores={nodeScores}
          recommendationData={recommendationData}
          recommendations={recommendations}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          darkMode={darkMode}
          generateSparkline={generateSparkline}
          setSelectedNode={setSelectedNode}
          setSelectedGuestDetails={setSelectedGuestDetails}
          showPoweredOffGuests={showPoweredOffGuests}
          setShowPoweredOffGuests={setShowPoweredOffGuests}
          clusterMapViewMode={clusterMapViewMode}
          setClusterMapViewMode={setClusterMapViewMode}
          maintenanceNodes={maintenanceNodes}
          guestsMigrating={guestsMigrating}
          migrationProgress={migrationProgress}
          completedMigrations={completedMigrations}
          showPredicted={showPredicted}
          setShowPredicted={setShowPredicted}
          nodeGridColumns={nodeGridColumns}
          setNodeGridColumns={setNodeGridColumns}
          loadChartJs={loadChartJs}
          chartJsLoaded={chartJsLoaded}
          canMigrate={canMigrate}
          guestProfiles={guestProfiles}
          handleRemoveTag={handleRemoveTag}
          setTagModalGuest={setTagModalGuest}
          setShowTagModal={setShowTagModal}
          nodeRecCounts={nodeRecCounts}
          guestRecMap={guestRecMap}
          loadingRecommendations={loadingRecommendations}
          generateRecommendations={generateRecommendations}
          penaltyConfig={penaltyConfig}
          toggleSection={toggleSection}
          migrationStatus={migrationStatus}
          setMigrationStatus={setMigrationStatus}
          cancelMigration={cancelMigration}
          trackMigration={trackMigration}
          setConfirmMigration={setConfirmMigration}
          setCurrentPage={setCurrentPage}
          setOpenPenaltyConfigOnAutomation={setOpenPenaltyConfigOnAutomation}
          API_BASE={API_BASE}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          automationStatus={automationStatus}
          automationConfig={automationConfig}
          scoreHistory={scoreHistory}
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

        {/* AutomationStatusSection removed — its content (last-run detail + run history)
            now lives inside the expandable auto-migration banner above. The score-history
            chart that lived here was dropped per direction. */}

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


        <AIRecommendationsSection
          config={config}
          aiEnabled={aiEnabled}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          aiRecommendations={aiRecommendations}
          loadingAi={loadingAi}
          aiAnalysisPeriod={aiAnalysisPeriod}
          setAiAnalysisPeriod={setAiAnalysisPeriod}
          fetchAiRecommendations={fetchAiRecommendations}
          migrationStatus={migrationStatus}
          setMigrationStatus={setMigrationStatus}
          completedMigrations={completedMigrations}
          guestsMigrating={guestsMigrating}
          migrationProgress={migrationProgress}
          cancelMigration={cancelMigration}
          canMigrate={canMigrate}
          trackMigration={trackMigration}
          API_BASE={API_BASE}
        />
      </div>
    </div>

    <SystemModals
      showUpdateModal={showUpdateModal}
      setShowUpdateModal={setShowUpdateModal}
      updating={updating}
      updateLog={updateLog}
      setUpdateLog={setUpdateLog}
      updateResult={updateResult}
      setUpdateResult={setUpdateResult}
      updateError={updateError}
      handleUpdate={handleUpdate}
      systemInfo={systemInfo}
      showBranchModal={showBranchModal}
      setShowBranchModal={setShowBranchModal}
      loadingBranches={loadingBranches}
      availableBranches={availableBranches}
      branchPreview={branchPreview}
      setBranchPreview={setBranchPreview}
      loadingPreview={loadingPreview}
      switchingBranch={switchingBranch}
      rollingBack={rollingBack}
      fetchBranches={fetchBranches}
      switchBranch={switchBranch}
      rollbackBranch={rollbackBranch}
      clearTestingMode={clearTestingMode}
      fetchBranchPreview={fetchBranchPreview}
    />

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

  </>);
}
