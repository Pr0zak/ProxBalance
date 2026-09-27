import {
  Clock, AlertCircle, RefreshCw
} from './Icons.jsx';
import { useAppStatus } from './AppStatus.jsx';
import {
  GLASS_CARD, TEXT_HEADING, TEXT_SUBHEADING,
  SUB_TAB, SUB_TAB_ACTIVE, SUB_TAB_INACTIVE
} from '../utils/designTokens.js';

import QuickSetupSection from './automation/QuickSetupSection.jsx';
import ScheduleSection from './automation/ScheduleSection.jsx';
import GuestSelectionSection from './automation/GuestSelectionSection.jsx';
import MigrationBehaviorSection from './automation/MigrationBehaviorSection.jsx';
import MigrationLogsSection from './automation/MigrationLogsSection.jsx';
import DecisionTreeFlowchart from './automation/DecisionTreeFlowchart.jsx';
import { UnsavedContext, useUnsavedRegistry, UnsavedBar, countChanges, useBeforeUnload } from './UnsavedChanges.jsx';

const { useState, useMemo, useEffect } = React;

const pick = (obj, keys) => Object.fromEntries(keys.map(k => [k, obj?.[k]]));

const TABS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'filters', label: 'Filters' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'history', label: 'History & Logs' },
  { id: 'reference', label: 'Reference' },
];

export default function AutomationPage(props) {
  const {
    automationConfig,
    automationStatus,
    automigrateLogs,
    collapsedSections,
    config,
    fetchAutomationStatus,
    fetchConfig,
    logRefreshTime,
    migrationHistoryPage,
    migrationHistoryPageSize,
    migrationLogsTab,
    penaltyConfig, setPenaltyConfig, penaltyDefaults,
    penaltyConfigSaved, savingPenaltyConfig,
    penaltyPresets, activePreset, applyPenaltyPreset,
    cpuThreshold, memThreshold, iowaitThreshold,
    savePenaltyConfig, resetPenaltyConfig,
    migrationSettings, setMigrationSettings,
    migrationSettingsDefaults, migrationSettingsDescriptions,
    effectivePenaltyConfig, hasExpertOverrides,
    savingMigrationSettings, migrationSettingsSaved,
    saveMigrationSettingsAction, resetMigrationSettingsAction,
    fetchMigrationSettingsAction,
    saveAutomationConfig,
    setAutomigrateLogs,
    setCollapsedSections,
    setConfig,
    setCurrentPage,
    setError,
    setLogRefreshTime,
    setMigrationHistoryPage,
    setMigrationHistoryPageSize,
    setMigrationLogsTab,
    savedMigrationSettings, savedPenaltyConfig, fetchPenaltyConfig,
    setNavGuard,
  } = props;

  // Sub-tab lives in the URL (#/automation/<tab>) so reload and Back keep it.
  const activeTab = TABS.some(t => t.id === props.routeTab) ? props.routeTab : 'schedule';
  const setActiveTab = (id) => props.onRouteTab?.(id);

  // ── One save model ────────────────────────────────────────────────────────
  // Everything on this page is staged and saved together from the bar at the
  // bottom. The only exceptions are the master Enable / Dry-run switches in
  // Quick Setup, which act immediately (they have their own confirmations).
  const registry = useUnsavedRegistry();
  const { register, unregister } = registry.context;

  // Automation config: stage top-level partial updates over the live config.
  const [draftUpdates, setDraftUpdates] = useState({});
  const draftConfig = useMemo(
    () => (automationConfig ? { ...automationConfig, ...draftUpdates } : automationConfig),
    [automationConfig, draftUpdates]
  );
  const stageAutomationConfig = (updates) => setDraftUpdates(prev => ({ ...prev, ...updates }));
  const draftKeys = Object.keys(draftUpdates);
  const configChangeCount = countChanges(pick(draftConfig, draftKeys), pick(automationConfig, draftKeys));

  useEffect(() => {
    register('automationConfig', configChangeCount, async () => {
      const ok = await saveAutomationConfig(draftUpdates);
      if (ok !== false) setDraftUpdates({});
    }, () => {
      // Distribution balancing edits also optimistically update the app config.
      if ('distribution_balancing' in draftUpdates) fetchConfig?.();
      setDraftUpdates({});
    });
  });

  // Simplified scoring settings (sensitivity, trend weight, lookback).
  const migrationChangeCount = savedMigrationSettings ? countChanges(migrationSettings, savedMigrationSettings) : 0;
  useEffect(() => {
    register('migrationSettings', migrationChangeCount, saveMigrationSettingsAction,
      () => setMigrationSettings(savedMigrationSettings));
  });

  // Expert penalty overrides — saved after the simplified settings.
  const penaltyChangeCount = savedPenaltyConfig ? countChanges(penaltyConfig, savedPenaltyConfig) : 0;
  useEffect(() => {
    register('penaltyConfig', penaltyChangeCount, async () => {
      // Saving migration settings first rewrites the mapped penalty weights, so
      // apply only the keys the user edited on top of the latest server config.
      const edited = Object.keys(penaltyConfig || {}).filter(
        k => JSON.stringify(penaltyConfig[k]) !== JSON.stringify(savedPenaltyConfig?.[k])
      );
      const latest = (await fetchPenaltyConfig()) || savedPenaltyConfig;
      await savePenaltyConfig({ ...latest, ...pick(penaltyConfig, edited) });
    }, () => setPenaltyConfig(savedPenaltyConfig), 1);
  });

  useEffect(() => () => ['automationConfig', 'migrationSettings', 'penaltyConfig'].forEach(unregister), []);

  useBeforeUnload(registry.total > 0);
  // Ask before leaving the page with staged edits (they'd be lost).
  useEffect(() => {
    if (!setNavGuard) return;
    setNavGuard(registry.total > 0
      ? () => window.confirm(`Discard ${registry.total} unsaved change${registry.total !== 1 ? 's' : ''} on Automation?`)
      : null);
    return () => setNavGuard(null);
  }, [registry.total]);

  // Nothing here renders (so no live toggle can act) until the real config
  // has loaded; a failed load shows why, with a retry.
  const { automationConfigError, retryAutomationConfig, automationStatusError, retryAutomationStatus } = useAppStatus();
  const loadError = automationConfigError || automationStatusError;
  const errorCard = loadError && (
    <div className="max-w-screen-2xl mx-auto px-4 pt-4">
      <div className="flex items-start gap-3 p-4 rounded-xl border bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50">
        <AlertCircle size={18} className="shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-semibold text-red-800 dark:text-red-200">
            {automationConfigError ? "Couldn't load automation settings" : "Couldn't load automation status"}
          </p>
          <p className="text-red-700 dark:text-red-300/80 mt-0.5 break-words">{loadError}</p>
        </div>
        <button
          onClick={() => { if (automationConfigError) retryAutomationConfig?.(); if (automationStatusError) retryAutomationStatus?.(); }}
          className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-red-700 dark:text-red-300 hover:underline"
        >
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    </div>
  );

  if (!automationConfig) {
    return errorCard || (
      <div className="flex items-center justify-center p-8">
        <div className="text-pb-text2 dark:text-gray-400">Loading automation settings...</div>
      </div>
    );
  }

  return (
    <UnsavedContext.Provider value={registry.context}>
    <div className="pb-4 sm:pb-0">
      {errorCard}
      <div className="max-w-screen-2xl mx-auto p-4">
        {/* Page header */}
        <div className="mb-4">
          <h1 className={TEXT_HEADING}>Automation Configuration</h1>
          <p className={`${TEXT_SUBHEADING} mt-1`}>Configure automated migration scheduling and behavior</p>
        </div>

        {/* Quick Setup — always visible above tabs */}
        <QuickSetupSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          migrationSettings={migrationSettings}
          setMigrationSettings={setMigrationSettings}
          savingMigrationSettings={savingMigrationSettings}
          migrationSettingsSaved={migrationSettingsSaved}
          saveMigrationSettingsAction={saveMigrationSettingsAction}
          resetMigrationSettingsAction={resetMigrationSettingsAction}
          fetchMigrationSettingsAction={fetchMigrationSettingsAction}
        />

        {/* Horizontal sub-tabs */}
        <div className="flex items-center gap-0 border-b border-pb-border dark:border-slate-700/50 mb-4 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${SUB_TAB} ${activeTab === tab.id ? SUB_TAB_ACTIVE : SUB_TAB_INACTIVE}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content — every section spans full width to match Quick Setup */}
        <div hidden={activeTab !== 'schedule'}>{(
          <ScheduleSection
            automationConfig={draftConfig}
            saveAutomationConfig={stageAutomationConfig}
            collapsedSections={collapsedSections}
            setCollapsedSections={setCollapsedSections}
            setError={setError}
          />
        )}</div>

        <div hidden={activeTab !== 'filters'}>{(
          <GuestSelectionSection
            automationConfig={draftConfig}
            saveAutomationConfig={stageAutomationConfig}
            config={config}
            fetchConfig={fetchConfig}
            setConfig={setConfig}
            collapsedSections={collapsedSections}
            setCollapsedSections={setCollapsedSections}
          />
        )}</div>

        <div hidden={activeTab !== 'behavior'}>{(
          <MigrationBehaviorSection
            automationConfig={draftConfig}
            saveAutomationConfig={stageAutomationConfig}
            automationStatus={automationStatus}
            collapsedSections={collapsedSections}
            setCollapsedSections={setCollapsedSections}
            penaltyConfig={penaltyConfig}
            setPenaltyConfig={setPenaltyConfig}
            penaltyDefaults={penaltyDefaults}
            penaltyConfigSaved={penaltyConfigSaved}
            savingPenaltyConfig={savingPenaltyConfig}
            penaltyPresets={penaltyPresets}
            activePreset={activePreset}
            applyPenaltyPreset={applyPenaltyPreset}
            cpuThreshold={cpuThreshold}
            memThreshold={memThreshold}
            iowaitThreshold={iowaitThreshold}
            savePenaltyConfig={savePenaltyConfig}
            resetPenaltyConfig={resetPenaltyConfig}
            migrationSettings={migrationSettings}
            setMigrationSettings={setMigrationSettings}
            migrationSettingsDefaults={migrationSettingsDefaults}
            migrationSettingsDescriptions={migrationSettingsDescriptions}
            effectivePenaltyConfig={effectivePenaltyConfig}
            hasExpertOverrides={hasExpertOverrides}
            savingMigrationSettings={savingMigrationSettings}
            migrationSettingsSaved={migrationSettingsSaved}
            saveMigrationSettingsAction={saveMigrationSettingsAction}
            resetMigrationSettingsAction={resetMigrationSettingsAction}
            fetchMigrationSettingsAction={fetchMigrationSettingsAction}
          />
        )}</div>

        <div hidden={activeTab !== 'history'}>{(
          <MigrationLogsSection
            automationStatus={automationStatus || {}}
            automigrateLogs={automigrateLogs}
            migrationHistoryPage={migrationHistoryPage}
            setMigrationHistoryPage={setMigrationHistoryPage}
            migrationHistoryPageSize={migrationHistoryPageSize}
            setMigrationHistoryPageSize={setMigrationHistoryPageSize}
            migrationLogsTab={migrationLogsTab}
            setMigrationLogsTab={setMigrationLogsTab}
            setAutomigrateLogs={setAutomigrateLogs}
            logRefreshTime={logRefreshTime}
            setLogRefreshTime={setLogRefreshTime}
            fetchAutomationStatus={fetchAutomationStatus}
          />
        )}</div>

        <div hidden={activeTab !== 'reference'}>{(
          <DecisionTreeFlowchart
            collapsedSections={collapsedSections}
            setCollapsedSections={setCollapsedSections}
          />
        )}</div>

        <UnsavedBar total={registry.total} saving={registry.saving} onSave={registry.saveAll} onDiscard={registry.discardAll} />
      </div>
    </div>
    </UnsavedContext.Provider>
  );
}
