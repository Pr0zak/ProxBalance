import {
  ArrowLeft, ChevronDown, Clock, Info
} from './Icons.jsx';

import MainSettingsSection from './automation/MainSettingsSection.jsx';
import DecisionTreeFlowchart from './automation/DecisionTreeFlowchart.jsx';
import SmartMigrationsSection from './automation/SmartMigrationsSection.jsx';
import SafetyRulesSection from './automation/SafetyRulesSection.jsx';
import DistributionBalancingSection from './automation/DistributionBalancingSection.jsx';
import TimeWindowsSection from './automation/TimeWindowsSection.jsx';
import MigrationLogsSection from './automation/MigrationLogsSection.jsx';
import PenaltyScoringSection from './automation/PenaltyScoringSection.jsx';
import RecommendationThresholdsSection from './settings/RecommendationThresholdsSection.jsx';

export default function AutomationPage(props) {
  const {
    automationConfig,
    automationStatus,
    automigrateLogs,
    collapsedSections,
    config,
    confirmRemoveWindow,
    editingWindowIndex,
    fetchAutomationStatus,
    fetchConfig,
    logRefreshTime,
    migrationHistoryPage,
    migrationHistoryPageSize,
    migrationLogsTab,
    newWindowData,
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
    setConfirmRemoveWindow,
    setCurrentPage,
    setEditingWindowIndex,
    setError,
    setLogRefreshTime,
    setMigrationHistoryPage,
    setMigrationHistoryPageSize,
    setMigrationLogsTab,
    setNewWindowData,
    setShowTimeWindowForm,
    setTestResult,
    showTimeWindowForm,
    testAutomation,
    testingAutomation,
    testResult,
  } = props;

  if (!automationConfig) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading automation settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0">
      <div className="max-w-5xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-y-3">
            <div className="flex items-center gap-4 min-w-0">
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shrink-0"
                title="Back to Dashboard"
              >
                <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
              </button>
              <div className="flex items-center gap-3 min-w-0">
                <Clock size={28} className="text-blue-600 dark:text-blue-400 shrink-0" />
                <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Automated Migrations</h1>
                <span className="relative group inline-block">
                  <Info size={18} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                  <div className="absolute top-full right-0 sm:right-auto sm:left-1/2 sm:transform sm:-translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-gray-700 w-72" style={{whiteSpace: 'normal'}}>
                    <div className="font-semibold mb-1.5">How Automated Migrations Work</div>
                    <div className="space-y-1 text-gray-300">
                      <p>1. Runs on a schedule (every N minutes)</p>
                      <p>2. Fetches current recommendations from the engine</p>
                      <p>3. Validates each migration against safety rules</p>
                      <p>4. Executes approved migrations one at a time</p>
                      <p>5. Waits for cooldown between migrations</p>
                    </div>
                    <div className="absolute top-0 right-1 sm:right-auto sm:left-1/2 sm:transform sm:-translate-x-1/2 -translate-y-full">
                      <div className="border-8 border-transparent border-b-gray-900 dark:border-b-gray-800"></div>
                    </div>
                  </div>
                </span>
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              <ArrowLeft size={16} />
              Back
            </button>
          </div>
        </div>

        {/* 1. Core Settings */}
        <MainSettingsSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          testAutomation={testAutomation}
          testingAutomation={testingAutomation}
          testResult={testResult}
          setTestResult={setTestResult}
        />

        {/* 2. Safety & Guardrails */}
        <SafetyRulesSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
        />

        {/* 3. Migration Settings (grouped: Scoring, Thresholds, Smart Migrations, Distribution) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, migrationSettingsGroup: !prev.migrationSettingsGroup }))}
            className="w-full flex items-center justify-between text-left p-4 sm:p-6 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Migration Settings</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.migrationSettingsGroup ? '' : '-rotate-180'}`}
            />
          </button>

          {!collapsedSections.migrationSettingsGroup && (
            <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-6">
              <PenaltyScoringSection
                embedded
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

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <RecommendationThresholdsSection
                  embedded
                  config={config}
                  fetchConfig={fetchConfig}
                  collapsedSections={collapsedSections}
                  setCollapsedSections={setCollapsedSections}
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <SmartMigrationsSection
                  embedded
                  automationConfig={automationConfig}
                  automationStatus={automationStatus}
                  saveAutomationConfig={saveAutomationConfig}
                  collapsedSections={collapsedSections}
                  setCollapsedSections={setCollapsedSections}
                />
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <DistributionBalancingSection
                  embedded
                  config={config}
                  automationConfig={automationConfig}
                  collapsedSections={collapsedSections}
                  setCollapsedSections={setCollapsedSections}
                  setConfig={setConfig}
                  saveAutomationConfig={saveAutomationConfig}
                />
              </div>
            </div>
          )}
        </div>

        {/* 4. Time Windows */}
        <TimeWindowsSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          editingWindowIndex={editingWindowIndex}
          setEditingWindowIndex={setEditingWindowIndex}
          showTimeWindowForm={showTimeWindowForm}
          setShowTimeWindowForm={setShowTimeWindowForm}
          newWindowData={newWindowData}
          setNewWindowData={setNewWindowData}
          confirmRemoveWindow={confirmRemoveWindow}
          setConfirmRemoveWindow={setConfirmRemoveWindow}
          setError={setError}
        />

        {/* 5. Migration Logs & History */}
        <MigrationLogsSection
          automationStatus={automationStatus}
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
          setCurrentPage={setCurrentPage}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          automationConfig={automationConfig}
        />

        {/* 6. Migration Decision Flowchart (reference, at bottom) */}
        <DecisionTreeFlowchart
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
        />
      </div>
    </div>
  );
}
