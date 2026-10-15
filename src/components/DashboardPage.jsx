import {
  AlertCircle, Settings, X
} from './Icons.jsx';
import { BTN_DANGER, BTN_SECONDARY } from '../utils/designTokens.js';

const { useState, useEffect, useMemo, useRef } = React;

import KpiRow from './dashboard/KpiRow.jsx';
import NeedsAttentionStrip from './dashboard/NeedsAttentionStrip.jsx';
import ClusterSection from './dashboard/ClusterSection.jsx';
import AutoStatusPill from './dashboard/AutoStatusPill.jsx';
import CrsStatusBanner, { crsDynamicActive } from './dashboard/CrsStatusBanner.jsx';
import CrsEditorModal from './dashboard/CrsEditorModal.jsx';
import ClusterMap from './dashboard/ClusterMap.jsx';
import ClusterHealthChart from './dashboard/ClusterHealthChart.jsx';
import NodeStatusSection from './dashboard/NodeStatusSection.jsx';
import MigrationRecommendationsSection from './dashboard/MigrationRecommendationsSection.jsx';
import { recsByGuest } from './dashboard/recsHelpers.js';
import { nodeRoles } from '../utils/nodeRoles.js';
import NodeDetailPanel from './dashboard/NodeDetailPanel.jsx';
import GuestDetailPanel from './dashboard/GuestDetailPanel.jsx';
import EvacuationModals from './dashboard/EvacuationModals.jsx';
import MigrationModals from './dashboard/MigrationModals.jsx';
import AIRecommendationsSection from './dashboard/AIRecommendationsSection.jsx';

export default function DashboardPage({
  // Routing
  routeTab, onRouteTab,
  // Data & loading
  data, setData, loading, error, setError, config,
  // Navigation
  setCurrentPage, setScrollToApiConfig, setOpenPenaltyConfigOnAutomation,
  // Token auth
  tokenAuthError, setTokenAuthError,
  // Cluster health
  clusterHealth,
  // System info & updates
  systemInfo,
  // Automation
  automationStatus, automationConfig, fetchAutomationStatus, runAutomationNow, runningAutomation,
  runNowMessage, setRunNowMessage, runHistory, expandedRun, setExpandedRun,
  migrationHistory,
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
  openRunPlan,
  // Tag management
  showTagModal, setShowTagModal, tagModalGuest, setTagModalGuest, newTag, setNewTag,
  handleAddTag, handleRemoveTag,
  // Remove tag confirmation
  confirmRemoveTag, setConfirmRemoveTag, confirmAndRemoveTag,
  // Migration confirmation
  confirmMigration, setConfirmMigration, confirmAndMigrate,
  // Batch migration
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
  guestProfiles, scoreHistory, fetchScoreHistory,
  // Maintenance & evacuation
  maintenanceNodes, setMaintenanceNodes, setNodeMaintenance, maintenanceSaving, evacuatingNodes, setEvacuatingNodes, planningNodes, setPlanningNodes,
  evacuationPlan, setEvacuationPlan, planNode, setPlanNode,
  guestActions, setGuestActions, guestTargets, setGuestTargets,
  showConfirmModal, setShowConfirmModal,
  // Guest tag management table
  // Guest modal collapsed state
  guestModalCollapsed, setGuestModalCollapsed,
  // Chart.js lazy loader
  loadChartJs, chartJsLoaded,
  // Helper functions
  checkAffinityViolations, fetchGuestLocations,
  // Guest migration options
  guestMigrationOptions, loadingGuestOptions, fetchGuestMigrationOptions, setGuestMigrationOptions,
  // API base
  API_BASE
}) {
  // Dashboard Page - data is guaranteed to be available here
  const [showCrsEditor, setShowCrsEditor] = useState(false);

  // Recommendation cross-reference badges shown on Nodes/Guests tabs
  // Each node's role in balancing (maintenance / giving / receiving), shared by
  // the Nodes table, the Cluster Map and the node panel so all three agree.
  const nodeRoleMap = useMemo(
    () => nodeRoles({ nodes: data?.nodes, recommendations, maintenanceNodes }),
    [data, recommendations, maintenanceNodes],
  );
  const guestRecMap = useMemo(() => recsByGuest(recommendations), [recommendations]);

  // Every path that opens the guest window goes through here, so the window (and
  // the Migrate dialog it opens) always knows which node the guest is on. Rows from
  // the Guests/Nodes tables carry `node`; the map and node window set `currentNode`.
  // The node and guest panels share the right edge, so opening one closes the other.
  const openGuestDetails = (guest) => {
    if (guest) setSelectedNode(null);
    setSelectedGuestDetails(
      guest && typeof guest === 'object' ? { ...guest, currentNode: guest.currentNode || guest.node } : guest
    );
  };
  const openNode = (node) => {
    if (node) setSelectedGuestDetails(null);
    setSelectedNode(node);
  };
  const panelOpen = !!(selectedNode || selectedGuestDetails);

  // Keep the open panel in the address (#/dashboard/<tab>/node/<name> or
  // .../guest/<vmid>) so it survives a reload and can be linked. replaceState
  // doesn't fire hashchange, so the page router never sees these segments.
  // The tab segment is optional: #/dashboard/guest/<vmid> has no tab.
  const dashboardHash = () => {
    const [page = 'dashboard', ...rest] = window.location.hash.replace(/^#\/?/, '').split('/');
    if (rest[0] === 'node' || rest[0] === 'guest') rest.unshift(undefined);
    const [sub, kind, id] = rest;
    return { page, sub, kind, id };
  };
  const deepLinkRead = useRef(false);
  useEffect(() => {
    if (deepLinkRead.current || !data) return;
    deepLinkRead.current = true;
    const { kind, id } = dashboardHash();
    if (kind === 'node' && id && data.nodes?.[decodeURIComponent(id)]) openNode(data.nodes[decodeURIComponent(id)]);
    else if (kind === 'guest' && id && data.guests?.[id]) openGuestDetails(data.guests[id]);
  }, [data]);
  useEffect(() => {
    if (!deepLinkRead.current) return;
    const { page, sub } = dashboardHash();
    if (page !== 'dashboard') return;
    const base = `#/dashboard${sub ? `/${sub}` : ''}`;
    const next = selectedNode ? `${base}/node/${encodeURIComponent(selectedNode.name)}`
      : selectedGuestDetails ? `${base}/guest/${selectedGuestDetails.vmid}`
      : base;
    if (window.location.hash !== next) window.history.replaceState(null, '', next);
  }, [selectedNode?.name, selectedGuestDetails?.vmid]);

  // Section layout — user can promote tabs out of ClusterSection into standalone sections
  const [promotedSections, setPromotedSections] = useState(() => {
    try { return JSON.parse(localStorage.getItem('promotedSections') || '{}'); }
    catch { return {}; }
  });
  useEffect(() => { localStorage.setItem('promotedSections', JSON.stringify(promotedSections)); }, [promotedSections]);

  const violations = checkAffinityViolations();

  return (<>
    <div className={`p-4 overflow-x-hidden ${panelOpen ? 'xl:pr-[496px]' : ''}`}>
      <div className="max-w-screen-2xl mx-auto">
        {/* Token Authentication Error Banner */}
        {tokenAuthError && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="text-base font-bold text-red-800 dark:text-red-200 mb-1">API Token Authentication Failed</h3>
                <p className="text-sm text-red-700 dark:text-red-300/80 mb-3">
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

        {/* One-line "Needs attention" strip — renders nothing when all is well */}
        <NeedsAttentionStrip
          data={data}
          config={config}
          automationStatus={automationStatus}
          maintenanceNodes={maintenanceNodes}
          nodeScores={nodeScores}
          onCollect={handleRefresh}
        />

        {/* KPI Summary Row */}
        <KpiRow
          data={data}
          nodeScores={nodeScores}
          automationStatus={automationStatus}
          recommendations={recommendations}
          recommendationData={recommendationData}
          automationConfig={automationConfig}
          onNavigate={onRouteTab}
          onOpenAutomation={() => setCurrentPage('automation')}
          maintenanceNodes={maintenanceNodes}
          guestsMigrating={guestsMigrating}
          migrationProgress={migrationProgress}
          canMigrate={canMigrate}
          setCancelMigrationModal={setCancelMigrationModal}
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
            API_BASE={API_BASE}
            automationConfig={automationConfig}
          />
        </div>

        {/* PVE Cluster Resource Scheduler — on the dashboard only while Proxmox's
            own dynamic balancer is running (it can fight ProxBalance); otherwise
            it lives under Automation → Behavior. */}
        {crsDynamicActive(data?.pve_crs) && (
          <CrsStatusBanner
            pveCrs={data?.pve_crs}
            automationEnabled={automationStatus?.enabled}
            onEdit={() => setShowCrsEditor(true)}
          />
        )}
        {showCrsEditor && (
          <CrsEditorModal
            pveCrs={data?.pve_crs}
            automationEnabled={automationStatus?.enabled}
            API_BASE={API_BASE}
            onClose={() => setShowCrsEditor(false)}
            onSaved={(normalized) => setData(prev => prev ? { ...prev, pve_crs: normalized } : prev)}
          />
        )}

        {/* Unified Cluster section — Nodes / Guests / Map / Charts / Suggestions / Auto tabs */}
        <ClusterSection
          routeTab={routeTab}
          onRouteTab={onRouteTab}
          data={data}
          nodeScores={nodeScores}
          recommendationData={recommendationData}
          recommendations={recommendations}
          chartPeriod={chartPeriod}
          setChartPeriod={setChartPeriod}
          setSelectedNode={openNode}
          setSelectedGuestDetails={openGuestDetails}
          showPoweredOffGuests={showPoweredOffGuests}
          setShowPoweredOffGuests={setShowPoweredOffGuests}
          clusterMapViewMode={clusterMapViewMode}
          setClusterMapViewMode={setClusterMapViewMode}
          maintenanceNodes={maintenanceNodes}
          guestsMigrating={guestsMigrating}
          migrationProgress={migrationProgress}
          completedMigrations={completedMigrations}
          nodeGridColumns={nodeGridColumns}
          setNodeGridColumns={setNodeGridColumns}
          loadChartJs={loadChartJs}
          chartJsLoaded={chartJsLoaded}
          canMigrate={canMigrate}
          guestProfiles={guestProfiles}
          handleRemoveTag={handleRemoveTag}
          setTagModalGuest={setTagModalGuest}
          setShowTagModal={setShowTagModal}
          nodeRoleMap={nodeRoleMap}
          guestRecMap={guestRecMap}
          loadingRecommendations={loadingRecommendations}
          generateRecommendations={generateRecommendations}
          penaltyConfig={penaltyConfig}
          toggleSection={toggleSection}
          migrationStatus={migrationStatus}
          setMigrationStatus={setMigrationStatus}
          cancelMigration={cancelMigration}
          trackMigration={trackMigration}
          openRunPlan={openRunPlan}
          setConfirmMigration={setConfirmMigration}
          setCurrentPage={setCurrentPage}
          setOpenPenaltyConfigOnAutomation={setOpenPenaltyConfigOnAutomation}
          API_BASE={API_BASE}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          promotedSections={promotedSections}
          setPromotedSections={setPromotedSections}
          automationStatus={automationStatus}
          automationConfig={automationConfig}
          scoreHistory={scoreHistory}
          fetchScoreHistory={fetchScoreHistory}
          fetchAutomationStatus={fetchAutomationStatus}
          runAutomationNow={runAutomationNow}
          runningAutomation={runningAutomation}
          runNowMessage={runNowMessage}
          setRunNowMessage={setRunNowMessage}
          setCancelMigrationModal={setCancelMigrationModal}
          runHistory={runHistory}
          migrationHistory={migrationHistory}
          expandedRun={expandedRun}
          setExpandedRun={setExpandedRun}
        />

        {/* Promoted standalone sections (user-toggled via ClusterSection cog) */}
        {promotedSections.recs && (
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
            setCurrentPage={setCurrentPage}
            setOpenPenaltyConfigOnAutomation={setOpenPenaltyConfigOnAutomation}
            nodeScores={nodeScores}
            API_BASE={API_BASE}
            automationStatus={automationStatus}
            automationConfig={automationConfig}
            openRunPlan={openRunPlan}
          />
        )}
        {promotedSections.map && (
          <ClusterMap
            data={data}
            collapsedSections={collapsedSections}
            toggleSection={toggleSection}
            showPoweredOffGuests={showPoweredOffGuests}
            setShowPoweredOffGuests={setShowPoweredOffGuests}
            clusterMapViewMode={clusterMapViewMode}
            setClusterMapViewMode={setClusterMapViewMode}
            maintenanceNodes={maintenanceNodes}
            nodeRoleMap={nodeRoleMap}
            setSelectedNode={openNode}
            setSelectedGuestDetails={openGuestDetails}
            guestsMigrating={guestsMigrating}
            migrationProgress={migrationProgress}
            completedMigrations={completedMigrations}
            nodeScores={nodeScores}
            recommendations={recommendations}
            approvalQueue={automationStatus?.mode === 'semi' ? automationStatus.approval_queue : null}
            canMigrate={canMigrate}
            setConfirmMigration={setConfirmMigration}
          />
        )}
        {promotedSections.charts && (
          <>
            <ClusterHealthChart scoreHistory={scoreHistory} migrationHistory={migrationHistory} fetchScoreHistory={fetchScoreHistory} />
            <NodeStatusSection
              data={data}
              migrationHistory={migrationHistory}
              collapsedSections={collapsedSections}
              toggleSection={toggleSection}
              recommendationData={recommendationData}
              recommendations={recommendations}
              nodeGridColumns={nodeGridColumns}
              setNodeGridColumns={setNodeGridColumns}
              chartPeriod={chartPeriod}
              setChartPeriod={setChartPeriod}
              nodeScores={nodeScores}
              chartJsLoaded={chartJsLoaded}
              loadChartJs={loadChartJs}
            />
          </>
        )}

        <NodeDetailPanel
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
          API_BASE={API_BASE}
          data={data}
          nodeRoleMap={nodeRoleMap}
          recommendations={recommendations}
          guestRecMap={guestRecMap}
          skippedGuests={recommendationData?.skipped_guests}
          setSelectedGuestDetails={openGuestDetails}
          setConfirmMigration={setConfirmMigration}
          setNodeMaintenance={setNodeMaintenance}
          maintenanceSaving={maintenanceSaving}
          automationStatus={automationStatus}
          automationConfig={automationConfig}
        />

        <GuestDetailPanel
          selectedGuestDetails={selectedGuestDetails}
          setSelectedGuestDetails={setSelectedGuestDetails}
          setSelectedNode={openNode}
          data={data}
          nodeScores={nodeScores}
          guestRecMap={guestRecMap}
          skippedGuests={recommendationData?.skipped_guests}
          guestMigrationOptions={guestMigrationOptions}
          loadingGuestOptions={loadingGuestOptions}
          fetchGuestMigrationOptions={fetchGuestMigrationOptions}
          canMigrate={canMigrate}
          setSelectedGuest={setSelectedGuest}
          setMigrationTarget={setMigrationTarget}
          setShowMigrationDialog={setShowMigrationDialog}
          setConfirmMigration={setConfirmMigration}
          guestProfiles={guestProfiles}
          setError={setError}
          API_BASE={API_BASE}
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
          data={data}
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
