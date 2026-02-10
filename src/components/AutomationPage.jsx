import {
  ArrowLeft, CheckCircle, Clock, Info, Play, RefreshCw,
  Settings, X, XCircle
} from './Icons.jsx';

import MainSettingsSection from './automation/MainSettingsSection.jsx';
import DecisionTreeFlowchart from './automation/DecisionTreeFlowchart.jsx';
import SafetyRulesSection from './automation/SafetyRulesSection.jsx';
import DistributionBalancingSection from './automation/DistributionBalancingSection.jsx';
import TimeWindowsSection from './automation/TimeWindowsSection.jsx';
import MigrationLogsSection from './automation/MigrationLogsSection.jsx';
import PenaltyScoringSection from './automation/PenaltyScoringSection.jsx';

export default function AutomationPage(props) {
  const {
    automationConfig,
    automationStatus,
    automigrateLogs,
    collapsedSections,
    config,
    confirmAllowContainerRestarts,
    confirmApplyPreset,
    confirmDisableDryRun,
    confirmEnableAutomation,
    confirmRemoveWindow,
    editingPreset,
    editingWindowIndex,
    fetchAutomationStatus,
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
    saveAutomationConfig,
    setAutomigrateLogs,
    setCollapsedSections,
    setConfig,
    setConfirmAllowContainerRestarts,
    setConfirmApplyPreset,
    setConfirmDisableDryRun,
    setConfirmEnableAutomation,
    setConfirmRemoveWindow,
    setCurrentPage,
    setEditingPreset,
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
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
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700" style={{minWidth: '280px'}}>
                    <div className="font-semibold mb-1.5">How Automated Migrations Work</div>
                    <div className="space-y-1 text-gray-300">
                      <p>1. Runs on a schedule (every N minutes)</p>
                      <p>2. Fetches current recommendations from the engine</p>
                      <p>3. Validates each migration against safety rules</p>
                      <p>4. Executes approved migrations one at a time</p>
                      <p>5. Waits for cooldown between migrations</p>
                    </div>
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full">
                      <div className="border-8 border-transparent border-b-gray-900 dark:border-b-gray-800"></div>
                    </div>
                  </div>
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={testAutomation}
                disabled={testingAutomation}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {testingAutomation ? (
                  <><RefreshCw size={16} className="animate-spin" /> Testing...</>
                ) : (
                  <><Play size={16} /> Test Run</>
                )}
              </button>
              <button
                onClick={() => setCurrentPage('dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            </div>
          </div>
        </div>

        {/* Test Result */}
        {testResult && (
          <div className={`mb-6 p-4 rounded-lg border ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'}`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                {testResult.success ? <CheckCircle size={20} className="text-green-600 dark:text-green-400 mt-0.5" /> : <XCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />}
                <div>
                  <h3 className={`font-semibold ${testResult.success ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                    {testResult.success ? 'Test Run Complete' : 'Test Run Failed'}
                  </h3>
                  <p className="text-sm mt-1 text-gray-700 dark:text-gray-300">{testResult.message || testResult.error}</p>
                </div>
              </div>
              <button onClick={() => setTestResult(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <MainSettingsSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          confirmEnableAutomation={confirmEnableAutomation}
          setConfirmEnableAutomation={setConfirmEnableAutomation}
          confirmDisableDryRun={confirmDisableDryRun}
          setConfirmDisableDryRun={setConfirmDisableDryRun}
          editingPreset={editingPreset}
          setEditingPreset={setEditingPreset}
          confirmApplyPreset={confirmApplyPreset}
          setConfirmApplyPreset={setConfirmApplyPreset}
          penaltyConfig={penaltyConfig}
        />

        <DecisionTreeFlowchart
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
        />

        <SafetyRulesSection
          automationConfig={automationConfig}
          saveAutomationConfig={saveAutomationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          confirmAllowContainerRestarts={confirmAllowContainerRestarts}
          setConfirmAllowContainerRestarts={setConfirmAllowContainerRestarts}
        />

        <PenaltyScoringSection
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
        />

        <DistributionBalancingSection
          config={config}
          automationConfig={automationConfig}
          collapsedSections={collapsedSections}
          setCollapsedSections={setCollapsedSections}
          setConfig={setConfig}
          saveAutomationConfig={saveAutomationConfig}
        />

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
      </div>
    </div>
  );
}
