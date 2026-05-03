import ErrorBoundary from './components/ErrorBoundary.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import AutomationPage from './components/AutomationPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import TopNav from './components/TopNav.jsx';
import IconLegend from './components/IconLegend.jsx';
import useIsMobile from './utils/useIsMobile.js';
import { formatLocalTime, getTimezoneAbbr } from './utils/formatters.js';
import { useUIState } from './hooks/useUIState.js';
import { useDarkMode } from './hooks/useDarkMode.js';
import { useAuth } from './hooks/useAuth.js';
import { useConfig } from './hooks/useConfig.js';
import { useClusterData } from './hooks/useClusterData.js';
import { useRecommendations } from './hooks/useRecommendations.js';
import { useAIRecommendations } from './hooks/useAIRecommendations.js';
import { useMigrations } from './hooks/useMigrations.js';
import { useAutomation } from './hooks/useAutomation.js';
import { useEvacuation } from './hooks/useEvacuation.js';
import { useUpdates } from './hooks/useUpdates.js';
import {
  AlertCircle, RefreshCw, Info, Sun, Moon, Settings, X, ProxBalanceLogo,
  Activity, Clock, HelpCircle
} from './components/Icons.jsx';
import { API_BASE, RECOMMENDATIONS_REFRESH_INTERVAL, AUTOMATION_STATUS_REFRESH_INTERVAL } from './utils/constants.js';
import { GLASS_CARD, BTN_PRIMARY, BTN_SECONDARY, BTN_ICON, ICON, PAGE_BG } from './utils/designTokens.js';
import MobileTabBar from './components/MobileTabBar.jsx';

const { useState, useEffect } = React;

const ProxmoxBalanceManager = () => {
  const isMobile = useIsMobile(640);

  // Initialize hooks
  const { darkMode, toggleDarkMode } = useDarkMode();
  const ui = useUIState();
  const auth = useAuth(API_BASE);
  const automation = useAutomation(API_BASE, { setError: (e) => cluster.setError(e) });
  const evacuation = useEvacuation({ saveAutomationConfig: automation.saveAutomationConfig, automationConfig: automation.automationConfig });
  const configHook = useConfig(API_BASE, { setError: (e) => cluster.setError(e) });
  const updates = useUpdates(API_BASE, { setError: (e) => cluster.setError(e) });
  const cluster = useClusterData(API_BASE, {
    setTokenAuthError: auth.setTokenAuthError,
    checkPermissions: auth.checkPermissions,
    autoRefreshInterval: configHook.autoRefreshInterval
  });
  const recs = useRecommendations(API_BASE, {
    data: cluster.data,
    maintenanceNodes: evacuation.maintenanceNodes
  });
  const ai = useAIRecommendations(API_BASE, {
    data: cluster.data,
    setError: cluster.setError
  });
  const migrations = useMigrations(API_BASE, {
    setData: cluster.setData,
    setError: cluster.setError,
    fetchGuestLocations: cluster.fetchGuestLocations
  });

  // Initialize on mount
  useEffect(() => {
    document.documentElement.classList.add('dark');
    configHook.fetchConfig().then(cfg => {
      if (cfg) {
        ai.initFromConfig(cfg);
        auth.setProxmoxTokenId(cfg.proxmox_api_token_id || '');
        auth.setProxmoxTokenSecret(cfg.proxmox_api_token_secret || '');
      }
    });
    updates.fetchSystemInfo();
    automation.fetchAutomationStatus();
    automation.fetchAutomationConfig();
    automation.fetchRunHistory();
    automation.fetchMigrationHistory();
    auth.checkPermissions();
    configHook.fetchPenaltyConfig();
    configHook.fetchMigrationSettings();
  }, []);

  // Hide splash screen when data loads
  useEffect(() => {
    if (cluster.data) {
      const splashScreen = document.getElementById('loading-screen');
      if (splashScreen) {
        splashScreen.classList.add('hidden');
        setTimeout(() => { splashScreen.style.display = 'none'; }, 500);
      }
    }
  }, [cluster.data]);

  // Auto-refresh automation status every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      automation.fetchAutomationStatus();
      automation.fetchRunHistory();
    }, AUTOMATION_STATUS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  // Auto-fetch on initial data load
  useEffect(() => { cluster.fetchAnalysis(); }, []);
  useEffect(() => {
    const interval = setInterval(() => {
      cluster.fetchAnalysis();
    }, configHook.autoRefreshInterval);
    return () => clearInterval(interval);
  }, [configHook.autoRefreshInterval]);

  // Auto-fetch recommendations when data or thresholds change
  useEffect(() => {
    if (cluster.data && !recs.loadingRecommendations) {
      recs.fetchCachedRecommendations();
      cluster.fetchNodeScores(
        { cpu: recs.cpuThreshold, mem: recs.memThreshold, iowait: recs.iowaitThreshold },
        evacuation.maintenanceNodes
      );
    }
  }, [cluster.data, recs.cpuThreshold, recs.memThreshold, recs.iowaitThreshold, evacuation.maintenanceNodes]);

  // Auto-refresh recommendations on fixed 2-minute interval
  useEffect(() => {
    if (!cluster.data) return;
    const interval = setInterval(() => {
      recs.fetchCachedRecommendations();
    }, RECOMMENDATIONS_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [cluster.data]);

  // Fetch guest profiles and score history when cluster data loads
  useEffect(() => {
    if (cluster.data) {
      cluster.fetchGuestProfiles();
      cluster.fetchScoreHistory();
    }
  }, [cluster.data]);

  // Handle auto-expansion of Penalty Config when navigating from Migration Recommendations
  useEffect(() => {
    if (ui.currentPage === 'automation' && configHook.openPenaltyConfigOnAutomation) {
      requestAnimationFrame(() => {
        ui.setCollapsedSections(prev => ({ ...prev, penaltyScoring: false }));
        setTimeout(() => {
          const penaltySection = document.getElementById('penalty-config-section');
          if (penaltySection) {
            penaltySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
            penaltySection.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
            setTimeout(() => { penaltySection.style.boxShadow = ''; }, 2000);
          }
        }, 200);
        setTimeout(() => { configHook.setOpenPenaltyConfigOnAutomation(false); }, 300);
      });
    }
  }, [ui.currentPage, configHook.openPenaltyConfigOnAutomation]);

  // Scroll to Proxmox API Configuration when navigating from error banner
  useEffect(() => {
    if (ui.scrollToApiConfig && ui.currentPage === 'settings') {
      ui.setShowAdvancedSettings(true);
      setTimeout(() => {
        const element = document.getElementById('proxmox-api-config');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          element.classList.add('ring-4', 'ring-red-500', 'ring-opacity-50', 'rounded-lg');
          setTimeout(() => {
            element.classList.remove('ring-4', 'ring-red-500', 'ring-opacity-50', 'rounded-lg');
          }, 3000);
        }
        ui.setScrollToApiConfig(false);
      }, 400);
    }
  }, [ui.scrollToApiConfig, ui.currentPage]);

  // Lazy load Chart.js when Node Status section is expanded
  useEffect(() => {
    if (!ui.collapsedSections.nodeStatus && !cluster.chartJsLoaded) {
      cluster.loadChartJs();
    }
  }, [ui.collapsedSections.nodeStatus]);

  // Reset guest modal collapse state when a new guest is selected
  useEffect(() => {
    if (migrations.selectedGuestDetails) {
      ui.setGuestModalCollapsed({ mountPoints: true, passthroughDisks: true });
    }
  }, [migrations.selectedGuestDetails?.vmid]);

  // Composite handleRefresh that refreshes all domains
  const handleRefresh = async () => {
    await cluster.handleRefresh({ setRefreshElapsed: ui.setRefreshElapsed });
  };

  // Composite saveSettings that gathers state from multiple hooks
  const saveSettings = async () => {
    const result = await configHook.saveSettings({
      collection_interval_minutes: configHook.tempBackendInterval,
      ui_refresh_interval_minutes: configHook.tempUiInterval,
      proxmox_auth_method: 'api_token',
      proxmox_api_token_id: auth.proxmoxTokenId,
      proxmox_api_token_secret: auth.proxmoxTokenSecret,
      ...ai.getSettingsPayload()
    });

    if (result.success) {
      ui.setShowSettings(false);
      const now = new Date();
      cluster.setLastUpdate(now);
      cluster.setNextUpdate(new Date(now.getTime() + result.intervalMs));
    }
  };

  // Wrapper functions that pass current data
  const wrappedHandleAddTag = () => migrations.handleAddTag(cluster.data);
  const wrappedConfirmAndRemoveTag = () => migrations.confirmAndRemoveTag(cluster.data);
  const wrappedConfirmAndChangeHost = () => migrations.confirmAndChangeHost(configHook.fetchConfig);
  const wrappedCancelMigration = (vmid, targetNode) => migrations.cancelMigration(vmid, targetNode, cluster.data);
  const wrappedCheckAffinityViolations = () => migrations.checkAffinityViolations(cluster.data);
  const wrappedFetchAiRecommendations = () => ai.fetchAiRecommendations(
    { cpu: recs.cpuThreshold, mem: recs.memThreshold },
    evacuation.maintenanceNodes
  );
  const wrappedFetchGuestMigrationOptions = (vmid) => migrations.fetchGuestMigrationOptions(
    vmid,
    { cpu: recs.cpuThreshold, mem: recs.memThreshold },
    evacuation.maintenanceNodes
  );
  const wrappedFetchNodeScores = () => cluster.fetchNodeScores(
    { cpu: recs.cpuThreshold, mem: recs.memThreshold, iowait: recs.iowaitThreshold },
    evacuation.maintenanceNodes
  );

  // Icon Legend modal - rendered on all pages
  const iconLegendModal = ui.showIconLegend ? (
    <IconLegend onClose={() => ui.setShowIconLegend(false)} />
  ) : null;

  // Shared TopNav across all pages
  const topNav = (
    <TopNav
      currentPage={ui.currentPage}
      setCurrentPage={ui.setCurrentPage}
      darkMode={darkMode}
      toggleDarkMode={toggleDarkMode}
      connected={!!cluster.data && !cluster.error}
      lastUpdate={cluster.lastUpdate}
      onRefresh={handleRefresh}
      refreshing={cluster.loading}
      systemInfo={updates.systemInfo}
      onShowUpdate={() => updates.setShowUpdateModal(true)}
      onShowBranches={() => { updates.fetchBranches(); updates.setShowBranchModal(true); }}
    />
  );

  // Settings Page
  if (ui.currentPage === 'settings') {
    return <div className={PAGE_BG}>{topNav}{iconLegendModal}<SettingsPage
      setCurrentPage={ui.setCurrentPage}
      aiEnabled={ai.aiEnabled} setAiEnabled={ai.setAiEnabled}
      aiProvider={ai.aiProvider} setAiProvider={ai.setAiProvider}
      openaiKey={ai.openaiKey} setOpenaiKey={ai.setOpenaiKey}
      openaiModel={ai.openaiModel} setOpenaiModel={ai.setOpenaiModel}
      anthropicKey={ai.anthropicKey} setAnthropicKey={ai.setAnthropicKey}
      anthropicModel={ai.anthropicModel} setAnthropicModel={ai.setAnthropicModel}
      localUrl={ai.localUrl} setLocalUrl={ai.setLocalUrl}
      localModel={ai.localModel} setLocalModel={ai.setLocalModel}
      localAvailableModels={ai.localAvailableModels} setLocalAvailableModels={ai.setLocalAvailableModels}
      localLoadingModels={ai.localLoadingModels} setLocalLoadingModels={ai.setLocalLoadingModels}
      backendCollected={cluster.backendCollected}
      loading={cluster.loading}
      handleRefresh={handleRefresh}
      data={cluster.data}
      config={configHook.config}
      fetchConfig={configHook.fetchConfig}
      savingCollectionSettings={configHook.savingCollectionSettings} setSavingCollectionSettings={configHook.setSavingCollectionSettings}
      collectionSettingsSaved={configHook.collectionSettingsSaved} setCollectionSettingsSaved={configHook.setCollectionSettingsSaved}
      setError={cluster.setError}
      automationConfig={automation.automationConfig}
      saveAutomationConfig={automation.saveAutomationConfig}
      showAdvancedSettings={ui.showAdvancedSettings} setShowAdvancedSettings={ui.setShowAdvancedSettings}
      logLevel={configHook.logLevel} setLogLevel={configHook.setLogLevel}
      verboseLogging={configHook.verboseLogging} setVerboseLogging={configHook.setVerboseLogging}
      proxmoxTokenId={auth.proxmoxTokenId} setProxmoxTokenId={auth.setProxmoxTokenId}
      proxmoxTokenSecret={auth.proxmoxTokenSecret} setProxmoxTokenSecret={auth.setProxmoxTokenSecret}
      validatingToken={auth.validatingToken}
      validateToken={auth.validateToken}
      tokenValidationResult={auth.tokenValidationResult}
      confirmHostChange={migrations.confirmHostChange} setConfirmHostChange={migrations.setConfirmHostChange}
      confirmAndChangeHost={wrappedConfirmAndChangeHost}
      savingSettings={configHook.savingSettings}
      saveSettings={saveSettings}
      formatLocalTime={formatLocalTime}
      getTimezoneAbbr={getTimezoneAbbr}
    />
    {isMobile && <MobileTabBar activePage={ui.currentPage} onNavigate={ui.setCurrentPage} lastUpdate={cluster.lastUpdate} />}
    </div>;
  }

  // Automation Settings Page
  if (ui.currentPage === 'automation') {
    return <div className={PAGE_BG}>{topNav}{iconLegendModal}<AutomationPage
      automationConfig={automation.automationConfig}
      automationStatus={automation.automationStatus}
      automigrateLogs={automation.automigrateLogs}
      collapsedSections={ui.collapsedSections}
      config={configHook.config}
      confirmRemoveWindow={automation.confirmRemoveWindow}
      editingWindowIndex={automation.editingWindowIndex}
      fetchAutomationStatus={automation.fetchAutomationStatus}
      fetchConfig={configHook.fetchConfig}
      logRefreshTime={automation.logRefreshTime}
      migrationHistoryPage={automation.migrationHistoryPage}
      migrationHistoryPageSize={automation.migrationHistoryPageSize}
      migrationLogsTab={automation.migrationLogsTab}
      newWindowData={automation.newWindowData}
      penaltyConfig={configHook.penaltyConfig}
      setPenaltyConfig={configHook.setPenaltyConfig}
      penaltyDefaults={configHook.penaltyDefaults}
      penaltyConfigSaved={configHook.penaltyConfigSaved}
      savingPenaltyConfig={configHook.savingPenaltyConfig}
      penaltyPresets={configHook.penaltyPresets}
      activePreset={configHook.activePreset}
      applyPenaltyPreset={configHook.applyPenaltyPreset}
      cpuThreshold={recs.cpuThreshold}
      memThreshold={recs.memThreshold}
      iowaitThreshold={recs.iowaitThreshold}
      savePenaltyConfig={configHook.savePenaltyConfig}
      resetPenaltyConfig={configHook.resetPenaltyConfig}
      migrationSettings={configHook.migrationSettings}
      setMigrationSettings={configHook.setMigrationSettings}
      migrationSettingsDefaults={configHook.migrationSettingsDefaults}
      migrationSettingsDescriptions={configHook.migrationSettingsDescriptions}
      effectivePenaltyConfig={configHook.effectivePenaltyConfig}
      hasExpertOverrides={configHook.hasExpertOverrides}
      savingMigrationSettings={configHook.savingMigrationSettings}
      migrationSettingsSaved={configHook.migrationSettingsSaved}
      saveMigrationSettingsAction={configHook.saveMigrationSettingsAction}
      resetMigrationSettingsAction={configHook.resetMigrationSettingsAction}
      fetchMigrationSettingsAction={configHook.fetchMigrationSettings}
      saveAutomationConfig={automation.saveAutomationConfig}
      setAutomigrateLogs={automation.setAutomigrateLogs}
      setCollapsedSections={ui.setCollapsedSections}
      setConfig={configHook.setConfig}
      setConfirmRemoveWindow={automation.setConfirmRemoveWindow}
      setCurrentPage={ui.setCurrentPage}
      setEditingWindowIndex={automation.setEditingWindowIndex}
      setError={cluster.setError}
      setLogRefreshTime={automation.setLogRefreshTime}
      setMigrationHistoryPage={automation.setMigrationHistoryPage}
      setMigrationHistoryPageSize={automation.setMigrationHistoryPageSize}
      setMigrationLogsTab={automation.setMigrationLogsTab}
      setNewWindowData={automation.setNewWindowData}
      setShowTimeWindowForm={automation.setShowTimeWindowForm}
      setTestResult={automation.setTestResult}
      showTimeWindowForm={automation.showTimeWindowForm}
      testAutomation={automation.testAutomation}
      testingAutomation={automation.testingAutomation}
      testResult={automation.testResult}
    />
    {isMobile && <MobileTabBar activePage={ui.currentPage} onNavigate={ui.setCurrentPage} lastUpdate={cluster.lastUpdate} />}
    </div>;
  }

  // No data - show loading/error
  if (!cluster.data) {
    return (
      <div className={PAGE_BG}>
        {topNav}
        {iconLegendModal}
        <div className="max-w-screen-2xl mx-auto p-4">
          {cluster.error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={20} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-red-800 dark:text-red-200">Connection Error</h3>
                  <p className="text-sm text-red-700 dark:text-red-300/80 mt-1">{cluster.error}</p>
                  <button onClick={handleRefresh} disabled={cluster.loading} className={`${BTN_DANGER} mt-3 flex items-center gap-2`}>
                    <RefreshCw size={14} className={cluster.loading ? 'animate-spin' : ''} />
                    {cluster.loading ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {cluster.loading && !cluster.error && (
            <div className={`${GLASS_CARD} p-8 text-center`}>
              <div className="flex flex-col items-center gap-4">
                <RefreshCw size={36} className="text-blue-600 dark:text-blue-400 animate-spin" />
                <div>
                  <p className="text-base font-semibold text-pb-text dark:text-white">Loading cluster data...</p>
                  <p className="text-sm text-pb-text2 dark:text-gray-400 mt-1">Please wait 30-60 seconds for initial data collection</p>
                </div>
              </div>
            </div>
          )}

          {!cluster.loading && !cluster.error && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <Info size={36} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-base font-semibold text-blue-800 dark:text-blue-200">No Data Available</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300/70 mt-1">Waiting for cluster data collection. Please wait 30-60 seconds and refresh.</p>
                  <button onClick={handleRefresh} className={`${BTN_PRIMARY} mt-4 flex items-center gap-2 mx-auto`}>
                    <RefreshCw size={14} /> Refresh
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Dashboard Page
  return <div className={PAGE_BG}>{topNav}{iconLegendModal}<DashboardPage
    data={cluster.data} setData={cluster.setData}
    loading={cluster.loading} error={cluster.error} setError={cluster.setError}
    config={configHook.config}
    setCurrentPage={ui.setCurrentPage}
    setScrollToApiConfig={ui.setScrollToApiConfig}
    setOpenPenaltyConfigOnAutomation={configHook.setOpenPenaltyConfigOnAutomation}
    tokenAuthError={auth.tokenAuthError} setTokenAuthError={auth.setTokenAuthError}
    clusterHealth={cluster.clusterHealth}
    systemInfo={updates.systemInfo}
    showUpdateModal={updates.showUpdateModal} setShowUpdateModal={updates.setShowUpdateModal}
    updating={updates.updating} updateLog={updates.updateLog} setUpdateLog={updates.setUpdateLog}
    updateResult={updates.updateResult} setUpdateResult={updates.setUpdateResult} updateError={updates.updateError}
    handleUpdate={updates.handleUpdate}
    showBranchModal={updates.showBranchModal} setShowBranchModal={updates.setShowBranchModal}
    loadingBranches={updates.loadingBranches} availableBranches={updates.availableBranches}
    branchPreview={updates.branchPreview} setBranchPreview={updates.setBranchPreview}
    loadingPreview={updates.loadingPreview} switchingBranch={updates.switchingBranch}
    rollingBack={updates.rollingBack}
    fetchBranches={updates.fetchBranches} switchBranch={updates.switchBranch}
    rollbackBranch={updates.rollbackBranch} clearTestingMode={updates.clearTestingMode} fetchBranchPreview={updates.fetchBranchPreview}
    automationStatus={automation.automationStatus} automationConfig={automation.automationConfig}
    fetchAutomationStatus={automation.fetchAutomationStatus}
    runAutomationNow={automation.runAutomationNow} runningAutomation={automation.runningAutomation}
    runNowMessage={automation.runNowMessage} setRunNowMessage={automation.setRunNowMessage}
    runHistory={automation.runHistory} expandedRun={automation.expandedRun} setExpandedRun={automation.setExpandedRun}
    migrationHistory={automation.migrationHistory}
    recommendations={recs.recommendations} loadingRecommendations={recs.loadingRecommendations}
    generateRecommendations={recs.generateRecommendations}
    recommendationData={recs.recommendationData} penaltyConfig={configHook.penaltyConfig}
    aiEnabled={ai.aiEnabled} aiRecommendations={ai.aiRecommendations}
    loadingAi={ai.loadingAi}
    aiAnalysisPeriod={ai.aiAnalysisPeriod} setAiAnalysisPeriod={ai.setAiAnalysisPeriod}
    fetchAiRecommendations={wrappedFetchAiRecommendations}
    canMigrate={auth.canMigrate}
    migrationStatus={migrations.migrationStatus} setMigrationStatus={migrations.setMigrationStatus}
    completedMigrations={migrations.completedMigrations}
    guestsMigrating={migrations.guestsMigrating} migrationProgress={migrations.migrationProgress}
    cancelMigration={wrappedCancelMigration} trackMigration={migrations.trackMigration}
    showMigrationDialog={migrations.showMigrationDialog} setShowMigrationDialog={migrations.setShowMigrationDialog}
    selectedGuest={migrations.selectedGuest} setSelectedGuest={migrations.setSelectedGuest}
    migrationTarget={migrations.migrationTarget} setMigrationTarget={migrations.setMigrationTarget}
    executeMigration={migrations.executeMigration}
    showTagModal={migrations.showTagModal} setShowTagModal={migrations.setShowTagModal}
    tagModalGuest={migrations.tagModalGuest} setTagModalGuest={migrations.setTagModalGuest}
    newTag={migrations.newTag} setNewTag={migrations.setNewTag}
    handleAddTag={wrappedHandleAddTag} handleRemoveTag={migrations.handleRemoveTag}
    confirmRemoveTag={migrations.confirmRemoveTag} setConfirmRemoveTag={migrations.setConfirmRemoveTag}
    confirmAndRemoveTag={wrappedConfirmAndRemoveTag}
    confirmMigration={migrations.confirmMigration} setConfirmMigration={migrations.setConfirmMigration}
    confirmAndMigrate={migrations.confirmAndMigrate}
    showBatchConfirmation={migrations.showBatchConfirmation} setShowBatchConfirmation={migrations.setShowBatchConfirmation}
    pendingBatchMigrations={migrations.pendingBatchMigrations}
    cancelMigrationModal={migrations.cancelMigrationModal} setCancelMigrationModal={migrations.setCancelMigrationModal}
    cancellingMigration={migrations.cancellingMigration} setCancellingMigration={migrations.setCancellingMigration}
    collapsedSections={ui.collapsedSections} setCollapsedSections={ui.setCollapsedSections}
    toggleSection={ui.toggleSection}
    lastUpdate={cluster.lastUpdate} backendCollected={cluster.backendCollected}
    handleRefresh={handleRefresh}
    clusterMapViewMode={ui.clusterMapViewMode} setClusterMapViewMode={ui.setClusterMapViewMode}
    showPoweredOffGuests={ui.showPoweredOffGuests} setShowPoweredOffGuests={ui.setShowPoweredOffGuests}
    selectedNode={migrations.selectedNode} setSelectedNode={migrations.setSelectedNode}
    selectedGuestDetails={migrations.selectedGuestDetails} setSelectedGuestDetails={migrations.setSelectedGuestDetails}
    nodeGridColumns={ui.nodeGridColumns} setNodeGridColumns={ui.setNodeGridColumns}
    chartPeriod={cluster.chartPeriod} setChartPeriod={cluster.setChartPeriod}
    nodeScores={cluster.nodeScores}
    loadChartJs={cluster.loadChartJs} chartJsLoaded={cluster.chartJsLoaded}
    guestProfiles={cluster.guestProfiles}
    scoreHistory={cluster.scoreHistory}
    maintenanceNodes={evacuation.maintenanceNodes} setMaintenanceNodes={evacuation.setMaintenanceNodes}
    evacuatingNodes={evacuation.evacuatingNodes} setEvacuatingNodes={evacuation.setEvacuatingNodes}
    planningNodes={evacuation.planningNodes} setPlanningNodes={evacuation.setPlanningNodes}
    evacuationPlan={evacuation.evacuationPlan} setEvacuationPlan={evacuation.setEvacuationPlan}
    planNode={evacuation.planNode} setPlanNode={evacuation.setPlanNode}
    guestActions={evacuation.guestActions} setGuestActions={evacuation.setGuestActions}
    guestTargets={evacuation.guestTargets} setGuestTargets={evacuation.setGuestTargets}
    showConfirmModal={evacuation.showConfirmModal} setShowConfirmModal={evacuation.setShowConfirmModal}
    guestSearchFilter={migrations.guestSearchFilter} setGuestSearchFilter={migrations.setGuestSearchFilter}
    guestCurrentPage={migrations.guestCurrentPage} setGuestCurrentPage={migrations.setGuestCurrentPage}
    guestPageSize={migrations.guestPageSize} setGuestPageSize={migrations.setGuestPageSize}
    guestSortField={migrations.guestSortField} setGuestSortField={migrations.setGuestSortField}
    guestSortDirection={migrations.guestSortDirection} setGuestSortDirection={migrations.setGuestSortDirection}
    guestModalCollapsed={ui.guestModalCollapsed} setGuestModalCollapsed={ui.setGuestModalCollapsed}
    checkAffinityViolations={wrappedCheckAffinityViolations}
    generateSparkline={cluster.generateSparkline}
    fetchGuestLocations={cluster.fetchGuestLocations}
    guestMigrationOptions={migrations.guestMigrationOptions}
    loadingGuestOptions={migrations.loadingGuestOptions}
    fetchGuestMigrationOptions={wrappedFetchGuestMigrationOptions}
    setGuestMigrationOptions={migrations.setGuestMigrationOptions}
    API_BASE={API_BASE}
  />
  {isMobile && <MobileTabBar activePage={ui.currentPage} onNavigate={ui.setCurrentPage} lastUpdate={cluster.lastUpdate} />}
  </div>;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ErrorBoundary><ProxmoxBalanceManager /></ErrorBoundary>);
