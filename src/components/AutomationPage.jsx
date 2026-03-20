import {
  ArrowLeft, Clock
} from './Icons.jsx';
import { GLASS_CARD, BTN_ICON } from '../utils/designTokens.js';

import QuickSetupSection from './automation/QuickSetupSection.jsx';
import ScheduleSection from './automation/ScheduleSection.jsx';
import GuestSelectionSection from './automation/GuestSelectionSection.jsx';
import MigrationBehaviorSection from './automation/MigrationBehaviorSection.jsx';
import MigrationLogsSection from './automation/MigrationLogsSection.jsx';
import DecisionTreeFlowchart from './automation/DecisionTreeFlowchart.jsx';

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
  } = props;

  if (!automationConfig) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Loading automation settings...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950 pb-20 sm:pb-0">
      <div className="max-w-5xl mx-auto p-4">
        {/* Header */}
        <div className={GLASS_CARD}>
          <div className="flex items-center gap-4 min-w-0">
            <button
              onClick={() => setCurrentPage('dashboard')}
              className={BTN_ICON}
              title="Back to Dashboard"
            >
              <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
            </button>
            <div className="flex items-center gap-3 min-w-0">
              <Clock size={28} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <h1 className="text-xl sm:text-3xl font-bold text-gray-900 dark:text-white">Automated Migrations</h1>
            </div>
          </div>
        </div>

        {/* 1. Quick Setup (always open) */}
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

        {/* 2. When to Migrate */}
        <ScheduleSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          setError={setError}
        />

        {/* 3. What to Migrate */}
        <GuestSelectionSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          config={config}
          fetchConfig={fetchConfig}
          setConfig={setConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
        />

        {/* 4. How to Migrate */}
        <MigrationBehaviorSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
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

        {/* 5. History & Logs */}
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
        />

        {/* Reference: Decision Flowchart */}
        <DecisionTreeFlowchart
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
        />
      </div>
    </div>
  );
}
