import {
  Clock
} from './Icons.jsx';
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

const { useState } = React;

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
  } = props;

  const [activeTab, setActiveTab] = useState('schedule');

  if (!automationConfig) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-400">Loading automation settings...</div>
      </div>
    );
  }

  return (
    <div className="pb-20 sm:pb-0">
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
        <div className="flex items-center gap-0 border-b border-slate-700/50 mb-4 overflow-x-auto">
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

        {/* Tab content */}
        {activeTab === 'schedule' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ScheduleSection
              automationConfig={automationConfig}
              saveAutomationConfig={saveAutomationConfig}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
              setError={setError}
            />
          </div>
        )}

        {activeTab === 'filters' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <GuestSelectionSection
              automationConfig={automationConfig}
              saveAutomationConfig={saveAutomationConfig}
              config={config}
              fetchConfig={fetchConfig}
              setConfig={setConfig}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
            />
          </div>
        )}

        {activeTab === 'behavior' && (
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
        )}

        {activeTab === 'history' && (
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
        )}

        {activeTab === 'reference' && (
          <DecisionTreeFlowchart
            collapsedSections={collapsedSections}
            setCollapsedSections={setCollapsedSections}
          />
        )}
      </div>
    </div>
  );
}
