import SettingsPage from './components/SettingsPage.jsx';
import AutomationPage from './components/AutomationPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import IconLegend from './components/IconLegend.jsx';
import useIsMobile from './utils/useIsMobile.js';
import { formatLocalTime, getTimezoneAbbr } from './utils/formatters.js';
import { useDarkMode } from './hooks/useDarkMode.js';
import { useUIState } from './hooks/useUIState.js';
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

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const ProxmoxBalanceManager = () => {
  const isMobile = useIsMobile(640);

  // Initialize hooks
  const { darkMode, setDarkMode, toggleDarkMode } = useDarkMode(true);
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
    auth.checkPermissions();
    configHook.fetchPenaltyConfig();
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

  // Chart rendering effect
  useEffect(() => {
    if (!cluster.data || !cluster.data.nodes) return;
    if (ui.collapsedSections.nodeStatus) return;
    if (!cluster.chartJsLoaded || typeof Chart === 'undefined') return;

    Object.values(cluster.charts).forEach(chart => {
      try { chart.destroy(); } catch (e) { console.error('Error destroying chart:', e); }
    });
    const newCharts = {};

    Object.values(cluster.data.nodes).forEach(node => {
      if (!node.trend_data || typeof node.trend_data !== 'object') return;

      const canvas = document.getElementById(`chart-${node.name}`);
      if (!canvas) return;

      let sourceTimeframe = 'day';
      const periodSeconds = {
        '1h': 3600, '6h': 6 * 3600, '12h': 12 * 3600, '24h': 24 * 3600,
        '7d': 7 * 24 * 3600, '30d': 30 * 24 * 3600, '1y': 365 * 24 * 3600
      }[cluster.chartPeriod] || 24 * 3600;

      if (cluster.chartPeriod === '1h') sourceTimeframe = 'hour';
      else if (['6h', '12h', '24h'].includes(cluster.chartPeriod)) sourceTimeframe = 'day';
      else if (cluster.chartPeriod === '7d') sourceTimeframe = 'week';
      else if (cluster.chartPeriod === '30d') sourceTimeframe = 'month';
      else if (cluster.chartPeriod === '1y') sourceTimeframe = 'year';

      const trendData = node.trend_data?.[sourceTimeframe] || node.trend_data?.day || [];
      if (!trendData || trendData.length === 0) return;

      const now = Math.floor(Date.now() / 1000);
      const filteredData = trendData.filter(point => (now - point.time) <= periodSeconds);
      if (filteredData.length === 0) return;

      const sampleRate = { '1h': 2, '6h': 5, '12h': 10, '24h': 20, '7d': 20, '30d': 25, '1y': 25 }[cluster.chartPeriod] || 1;
      const sampledData = filteredData.filter((point, index, arr) =>
        index === 0 || index === arr.length - 1 || index % sampleRate === 0
      );

      const ctx = canvas.getContext('2d');
      const isDark = darkMode;

      try {
        newCharts[node.name] = new Chart(ctx, {
          type: 'line',
          data: {
            labels: sampledData.map(point => {
              const date = new Date(point.time * 1000);
              return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [
              { label: 'CPU %', data: sampledData.map(p => p.cpu), borderColor: 'rgb(59, 130, 246)', backgroundColor: 'rgba(59, 130, 246, 0.1)', tension: 0.4, fill: true },
              { label: 'Memory %', data: sampledData.map(p => p.mem), borderColor: 'rgb(16, 185, 129)', backgroundColor: 'rgba(16, 185, 129, 0.1)', tension: 0.4, fill: true },
              { label: 'IOWait %', data: sampledData.map(p => p.iowait || 0), borderColor: 'rgb(245, 158, 11)', backgroundColor: 'rgba(245, 158, 11, 0.1)', tension: 0.4, fill: true }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
              legend: { display: true, position: 'top', labels: { color: isDark ? '#9ca3af' : '#4b5563', font: { size: 11 } } },
              tooltip: { backgroundColor: isDark ? '#1f2937' : '#ffffff', titleColor: isDark ? '#f3f4f6' : '#111827', bodyColor: isDark ? '#d1d5db' : '#374151', borderColor: isDark ? '#374151' : '#e5e7eb', borderWidth: 1 },
              annotation: {
                annotations: cluster.nodeScores && cluster.nodeScores[node.name] ? {
                  scoreLine: {
                    type: 'line',
                    yMin: cluster.nodeScores[node.name].suitability_rating,
                    yMax: cluster.nodeScores[node.name].suitability_rating,
                    borderColor: (() => { const r = cluster.nodeScores[node.name].suitability_rating; if (r >= 70) return 'rgba(34, 197, 94, 0.7)'; if (r >= 50) return 'rgba(234, 179, 8, 0.7)'; if (r >= 30) return 'rgba(249, 115, 22, 0.7)'; return 'rgba(239, 68, 68, 0.7)'; })(),
                    borderWidth: 3, borderDash: [5, 5],
                    label: {
                      display: true, content: `Suitability: ${cluster.nodeScores[node.name].suitability_rating}%`, position: 'start',
                      backgroundColor: (() => { const r = cluster.nodeScores[node.name].suitability_rating; if (r >= 70) return 'rgba(34, 197, 94, 0.9)'; if (r >= 50) return 'rgba(234, 179, 8, 0.9)'; if (r >= 30) return 'rgba(249, 115, 22, 0.9)'; return 'rgba(239, 68, 68, 0.9)'; })(),
                      color: '#ffffff', font: { size: 11, weight: 'bold' }, padding: 4
                    }
                  }
                } : {}
              }
            },
            scales: {
              x: { display: true, grid: { color: isDark ? '#374151' : '#e5e7eb' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280', maxTicksLimit: 8, font: { size: 10 } } },
              y: { display: true, min: 0, max: 100, grid: { color: isDark ? '#374151' : '#e5e7eb' }, ticks: { color: isDark ? '#9ca3af' : '#6b7280', font: { size: 10 }, callback: function(value) { return value + '%'; } } }
            }
          }
        });
      } catch (error) {
        console.error(`Error creating chart for node ${node.name}:`, error);
      }
    });

    cluster.setCharts(newCharts);
    return () => { Object.values(newCharts).forEach(chart => chart.destroy()); };
  }, [cluster.data, cluster.chartPeriod, darkMode, ui.collapsedSections.nodeStatus, recs.cpuThreshold, recs.memThreshold, ui.currentPage, cluster.chartJsLoaded]);

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
    <IconLegend darkMode={darkMode} onClose={() => ui.setShowIconLegend(false)} />
  ) : null;

  // Settings Page
  if (ui.currentPage === 'settings') {
    return <>{iconLegendModal}<SettingsPage
      darkMode={darkMode} setDarkMode={setDarkMode}
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
    {isMobile && (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden">
        <div className="flex items-center justify-around h-14">
          <button onClick={() => ui.setCurrentPage('dashboard')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
            <Activity size={20} />
            <span className="text-xs">Dashboard</span>
          </button>
          <button onClick={() => ui.setCurrentPage('automation')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
            <Clock size={20} />
            <span className="text-xs">Automation</span>
          </button>
          <button onClick={() => {}} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400">
            <Settings size={20} />
            <span className="text-xs font-semibold">Settings</span>
          </button>
        </div>
      </div>
    )}
    </>;
  }

  // Automation Settings Page
  if (ui.currentPage === 'automation') {
    return <>{iconLegendModal}<AutomationPage
      automationConfig={automation.automationConfig}
      automationStatus={automation.automationStatus}
      automigrateLogs={automation.automigrateLogs}
      collapsedSections={ui.collapsedSections}
      config={configHook.config}
      confirmRemoveWindow={automation.confirmRemoveWindow}
      editingWindowIndex={automation.editingWindowIndex}
      fetchAutomationStatus={automation.fetchAutomationStatus}
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
    {isMobile && (
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden">
        <div className="flex items-center justify-around h-14">
          <button onClick={() => ui.setCurrentPage('dashboard')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
            <Activity size={20} />
            <span className="text-xs">Dashboard</span>
          </button>
          <button onClick={() => {}} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400">
            <Clock size={20} />
            <span className="text-xs font-semibold">Automation</span>
          </button>
          <button onClick={() => ui.setCurrentPage('settings')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
            <Settings size={20} />
            <span className="text-xs">Settings</span>
          </button>
        </div>
      </div>
    )}
    </>;
  }

  // No data - show loading/error
  if (!cluster.data) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pb-20 sm:pb-4">
        {iconLegendModal}
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <ProxBalanceLogo size={40} />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ProxBalance</h1>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => ui.setShowIconLegend(true)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" title="Icon Reference">
                <HelpCircle size={20} className="text-gray-600 dark:text-gray-300" />
              </button>
              <button onClick={() => setDarkMode(!darkMode)} className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600" title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-700" />}
              </button>
              <button onClick={() => ui.setCurrentPage('settings')} className="p-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600" title="Settings">
                <Settings size={20} />
              </button>
            </div>
          </div>

          {cluster.error && (
            <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Connection Error</h3>
                  <p className="text-sm text-red-800 dark:text-red-300 mt-1">{cluster.error}</p>
                  <button onClick={handleRefresh} disabled={cluster.loading} className="mt-3 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    <RefreshCw size={16} className={cluster.loading ? 'animate-spin' : ''} />
                    {cluster.loading ? 'Retrying...' : 'Retry'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {cluster.loading && !cluster.error && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw size={48} className="text-blue-600 dark:text-blue-400 animate-spin" />
                <div>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">Loading cluster data...</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Please wait 30-60 seconds for initial data collection</p>
                </div>
              </div>
            </div>
          )}

          {!cluster.loading && !cluster.error && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
              <div className="flex flex-col items-center gap-4">
                <Info size={48} className="text-blue-600 dark:text-blue-400" />
                <div>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-200">No Data Available</p>
                  <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                    Waiting for cluster data collection. Please wait 30-60 seconds and refresh.
                  </p>
                  <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2 mx-auto">
                    <RefreshCw size={16} />
                    Refresh
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
  return <>{iconLegendModal}<DashboardPage
    data={cluster.data} setData={cluster.setData}
    loading={cluster.loading} error={cluster.error} setError={cluster.setError}
    config={configHook.config}
    darkMode={darkMode} toggleDarkMode={toggleDarkMode}
    setCurrentPage={ui.setCurrentPage}
    setScrollToApiConfig={ui.setScrollToApiConfig}
    setOpenPenaltyConfigOnAutomation={configHook.setOpenPenaltyConfigOnAutomation}
    tokenAuthError={auth.tokenAuthError} setTokenAuthError={auth.setTokenAuthError}
    dashboardHeaderCollapsed={ui.dashboardHeaderCollapsed} setDashboardHeaderCollapsed={ui.setDashboardHeaderCollapsed}
    handleLogoHover={ui.handleLogoHover} logoBalancing={ui.logoBalancing}
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
    recommendations={recs.recommendations} loadingRecommendations={recs.loadingRecommendations}
    generateRecommendations={recs.generateRecommendations}
    recommendationData={recs.recommendationData} penaltyConfig={configHook.penaltyConfig}
    thresholdSuggestions={recs.thresholdSuggestions}
    cpuThreshold={recs.cpuThreshold} setCpuThreshold={recs.setCpuThreshold}
    memThreshold={recs.memThreshold} setMemThreshold={recs.setMemThreshold}
    iowaitThreshold={recs.iowaitThreshold} setIowaitThreshold={recs.setIowaitThreshold}
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
    feedbackGiven={recs.feedbackGiven}
    onFeedback={recs.onFeedback}
    guestMigrationOptions={migrations.guestMigrationOptions}
    loadingGuestOptions={migrations.loadingGuestOptions}
    fetchGuestMigrationOptions={wrappedFetchGuestMigrationOptions}
    setGuestMigrationOptions={migrations.setGuestMigrationOptions}
    API_BASE={API_BASE}
  />
  {isMobile && (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden">
      <div className="flex items-center justify-around h-14">
        <button onClick={() => {}} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400">
          <Activity size={20} />
          <span className="text-xs font-semibold">Dashboard</span>
        </button>
        <button onClick={() => ui.setCurrentPage('automation')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
          <Clock size={20} />
          <span className="text-xs">Automation</span>
        </button>
        <button onClick={() => ui.setCurrentPage('settings')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
          <Settings size={20} />
          <span className="text-xs">Settings</span>
        </button>
      </div>
    </div>
  )}
  </>;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<ProxmoxBalanceManager />);
