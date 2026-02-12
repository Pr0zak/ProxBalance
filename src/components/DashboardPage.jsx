import {
  AlertCircle, Settings, X
} from './Icons.jsx';

const { useState } = React;

import NodeDetailsModal from './dashboard/NodeDetailsModal.jsx';
import GuestDetailsModal from './dashboard/GuestDetailsModal.jsx';
import EvacuationModals from './dashboard/EvacuationModals.jsx';
import MigrationModals from './dashboard/MigrationModals.jsx';
import AutomationStatusSection from './dashboard/AutomationStatusSection.jsx';
import GuestTagManagement from './dashboard/GuestTagManagement.jsx';
import DashboardHeader from './dashboard/DashboardHeader.jsx';
import ClusterMap from './dashboard/ClusterMap.jsx';
import NodeStatusSection from './dashboard/NodeStatusSection.jsx';
import MigrationRecommendationsSection from './dashboard/MigrationRecommendationsSection.jsx';
import AIRecommendationsSection from './dashboard/AIRecommendationsSection.jsx';
import SystemModals from './dashboard/SystemModals.jsx';
import DashboardFooter from './dashboard/DashboardFooter.jsx';

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

        <DashboardHeader
          data={data}
          darkMode={darkMode}
          toggleDarkMode={toggleDarkMode}
          setCurrentPage={setCurrentPage}
          dashboardHeaderCollapsed={dashboardHeaderCollapsed}
          setDashboardHeaderCollapsed={setDashboardHeaderCollapsed}
          handleLogoHover={handleLogoHover}
          logoBalancing={logoBalancing}
          clusterHealth={clusterHealth}
          systemInfo={systemInfo}
          setShowUpdateModal={setShowUpdateModal}
          setShowBranchModal={setShowBranchModal}
          fetchBranches={fetchBranches}
          recommendations={recommendations}
        />

        {/* Automated Migrations Status */}
        <AutomationStatusSection
          automationStatus={automationStatus}
          automationConfig={automationConfig}
          scoreHistory={scoreHistory}
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

        <GuestTagManagement
          data={data}
          guestProfiles={guestProfiles}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          guestSearchFilter={guestSearchFilter}
          setGuestSearchFilter={setGuestSearchFilter}
          guestCurrentPage={guestCurrentPage}
          setGuestCurrentPage={setGuestCurrentPage}
          guestPageSize={guestPageSize}
          setGuestPageSize={setGuestPageSize}
          guestSortField={guestSortField}
          setGuestSortField={setGuestSortField}
          guestSortDirection={guestSortDirection}
          setGuestSortDirection={setGuestSortDirection}
          canMigrate={canMigrate}
          setTagModalGuest={setTagModalGuest}
          setShowTagModal={setShowTagModal}
          handleRemoveTag={handleRemoveTag}
          ignoredGuests={ignoredGuests}
          excludeGuests={excludeGuests}
          affinityGuests={affinityGuests}
          autoMigrateOkGuests={autoMigrateOkGuests}
        />

        <ClusterMap
          data={data}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          showPoweredOffGuests={showPoweredOffGuests}
          setShowPoweredOffGuests={setShowPoweredOffGuests}
          clusterMapViewMode={clusterMapViewMode}
          setClusterMapViewMode={setClusterMapViewMode}
          maintenanceNodes={maintenanceNodes}
          setSelectedNode={setSelectedNode}
          setSelectedGuestDetails={setSelectedGuestDetails}
          guestsMigrating={guestsMigrating}
          migrationProgress={migrationProgress}
          completedMigrations={completedMigrations}
        />

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

        <NodeStatusSection
          data={data}
          collapsedSections={collapsedSections}
          toggleSection={toggleSection}
          showPredicted={showPredicted}
          setShowPredicted={setShowPredicted}
          recommendationData={recommendationData}
          recommendations={recommendations}
          nodeGridColumns={nodeGridColumns}
          setNodeGridColumns={setNodeGridColumns}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          nodeScores={nodeScores}
          generateSparkline={generateSparkline}
        />

        <MigrationRecommendationsSection
          data={data}
          recommendations={recommendations}
          loadingRecommendations={loadingRecommendations}
          generateRecommendations={generateRecommendations}
          recommendationData={recommendationData}
          penaltyConfig={penaltyConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          toggleSection={toggleSection}
          canMigrate={canMigrate}
          migrationStatus={migrationStatus}
          setMigrationStatus={setMigrationStatus}
          completedMigrations={completedMigrations}
          guestsMigrating={guestsMigrating}
          migrationProgress={migrationProgress}
          cancelMigration={cancelMigration}
          trackMigration={trackMigration}
          setConfirmMigration={setConfirmMigration}
          feedbackGiven={feedbackGiven}
          onFeedback={onFeedback}
          setCurrentPage={setCurrentPage}
          setOpenPenaltyConfigOnAutomation={setOpenPenaltyConfigOnAutomation}
          thresholdSuggestions={thresholdSuggestions}
          cpuThreshold={cpuThreshold}
          setCpuThreshold={setCpuThreshold}
          memThreshold={memThreshold}
          setMemThreshold={setMemThreshold}
          iowaitThreshold={iowaitThreshold}
          setIowaitThreshold={setIowaitThreshold}
          nodeScores={nodeScores}
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

    <DashboardFooter
      lastUpdate={lastUpdate}
      backendCollected={backendCollected}
      handleRefresh={handleRefresh}
      loading={loading}
      systemInfo={systemInfo}
      data={data}
      fetchBranches={fetchBranches}
      setShowBranchModal={setShowBranchModal}
      clearTestingMode={clearTestingMode}
    />
  </>);
}
