import {
  AlertTriangle, ArrowLeft, ArrowRight, Activity, Bell, CheckCircle,
  ChevronDown, ChevronUp, Clock, Download, Info, Play, RefreshCw,
  Settings, Shield, X, XCircle
} from './Icons.jsx';
import { formatLocalTime, getTimezoneAbbr } from '../utils/formatters.js';

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
    penaltyConfig,
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
    setOpenPenaltyConfigOnSettings,
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-32 sm:pb-0">
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
                    <div className="font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-2">Migration Scoring System</div>
                    <div className="text-[11px] space-y-1">
                      <div className="text-gray-300">Migrations are scored using a penalty-based system:</div>
                      <div className="mt-2 space-y-0.5">
                        <div>• <span className="text-blue-300">CPU Load</span> × 30%</div>
                        <div>• <span className="text-blue-300">Memory Load</span> × 30%</div>
                        <div>• <span className="text-blue-300">IOWait</span> × 20%</div>
                        <div>• <span className="text-blue-300">Load Average</span> × 10%</div>
                        <div>• <span className="text-blue-300">Storage Pressure</span> × 10%</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div className="text-gray-400">Lower penalty score = better target</div>
                        <div className="text-gray-400">Plus penalties for high usage & trends</div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-700">
                        <div><span className="text-green-400 font-semibold">70%+</span> = Excellent</div>
                        <div><span className="text-yellow-400 font-semibold">50-69%</span> = Good</div>
                        <div><span className="text-orange-400 font-semibold">30-49%</span> = Fair</div>
                        <div><span className="text-red-400 font-semibold">&lt;30%</span> = Poor</div>
                      </div>
                    </div>
                  </div>
                </span>
              </div>
            </div>
            <button
              onClick={testAutomation}
              disabled={testingAutomation}
              className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
            >
              <Play size={18} />
              {testingAutomation ? 'Running Test...' : 'Test Now'}
            </button>
          </div>
        </div>

        {/* Experimental Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertTriangle size={24} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-yellow-900 dark:text-yellow-200 mb-2 text-lg">⚠️ Experimental Feature</div>
              <div className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                <p>Automated Migrations is an <strong>experimental feature</strong>. Please use with caution:</p>
                <ul className="list-disc list-inside ml-2 space-y-1">
                  <li>Keep <strong>Dry Run Mode enabled</strong> until you're confident in the configuration</li>
                  <li>Monitor the system closely when enabling real migrations</li>
                  <li>Start with conservative settings (low migration limits, high confidence scores)</li>
                  <li>Test thoroughly in a non-production environment if possible</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Test Results */}
        {testResult && (
          <div className={`rounded-lg shadow p-6 mb-6 ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'}`}>
            <div className="flex items-start gap-3">
              <div className="shrink-0">
                {testResult.success ? (
                  <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle size={24} className="text-red-600 dark:text-red-400" />
                )}
              </div>
              <div className="flex-1">
                <div className={`font-semibold mb-2 ${testResult.success ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                  {testResult.success ? 'Test Completed Successfully' : 'Test Failed'}
                </div>
                <pre className={`text-sm whitespace-pre-wrap font-mono p-3 rounded ${testResult.success ? 'bg-green-100 dark:bg-green-800/30 text-green-900 dark:text-green-100' : 'bg-red-100 dark:bg-red-800/30 text-red-900 dark:text-red-100'}`}>
                  {testResult.output || testResult.error || 'No output available'}
                </pre>
              </div>
              <button
                onClick={() => setTestResult(null)}
                className={`shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                title="Dismiss"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        )}

        {/* Main Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, mainSettings: !prev.mainSettings }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Main Settings</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.mainSettings ? '-rotate-180' : ''}`}
            />
          </button>

          {!collapsedSections.mainSettings && (<div className="space-y-4">
            {/* Enable/Disable */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Enable Automated Migrations</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Turn automation on or off</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.enabled || false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Show confirmation for enabling
                        setConfirmEnableAutomation(true);
                      } else {
                        // Disabling doesn't need confirmation
                        saveAutomationConfig({ enabled: false });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
              {confirmEnableAutomation && (
                <div className="px-4 pb-4">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-orange-900 dark:text-orange-200 mb-2">Enable Automated Migrations?</div>
                        <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                          The system will automatically migrate VMs based on your configured rules.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              saveAutomationConfig({ enabled: true });
                              setConfirmEnableAutomation(false);
                            }}
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium"
                          >
                            Enable Automation
                          </button>
                          <button
                            onClick={() => setConfirmEnableAutomation(false)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dry Run */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Dry Run Mode</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Test without actual migrations (recommended)</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.dry_run !== false}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        // Show CRITICAL warning for disabling dry run
                        setConfirmDisableDryRun(true);
                      } else {
                        // Enabling dry run is safe, no confirmation needed
                        saveAutomationConfig({ dry_run: true });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600"></div>
                </label>
              </div>
              {confirmDisableDryRun && (
                <div className="px-4 pb-4">
                  <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-bold text-red-900 dark:text-red-200 mb-2 text-lg">DISABLE DRY RUN MODE?</div>
                        <div className="text-sm text-red-800 dark:text-red-300 space-y-2 mb-4">
                          <p className="font-semibold">This will enable REAL automated migrations!</p>
                          <p>VMs will actually be migrated automatically based on your configured rules.</p>
                          <p className="font-semibold">Are you absolutely sure?</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              saveAutomationConfig({ dry_run: false });
                              setConfirmDisableDryRun(false);
                            }}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold"
                          >
                            Yes, Disable Dry Run
                          </button>
                          <button
                            onClick={() => setConfirmDisableDryRun(false)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                          >
                            Cancel (Keep Dry Run On)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Check Interval */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                Check Interval (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={automationConfig.check_interval_minutes || 5}
                onChange={(e) => saveAutomationConfig({ check_interval_minutes: parseInt(e.target.value) })}
                className="w-32 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                How often to check for migrations
              </div>
            </div>

            {/* Schedule Presets */}
            <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <label className="block font-semibold text-gray-900 dark:text-white">
                  Quick Configuration Presets
                </label>
                <button
                  onClick={() => setEditingPreset(editingPreset ? null : 'info')}
                  className="text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 flex items-center gap-1"
                >
                  <Settings size={14} />
                  {editingPreset ? 'Done Editing' : 'Customize Presets'}
                </button>
              </div>

              {(() => {
                const presets = automationConfig.presets || {
                  conservative: { min_confidence_score: 80, max_migrations_per_run: 1, cooldown_minutes: 120, check_interval_minutes: 30 },
                  balanced: { min_confidence_score: 70, max_migrations_per_run: 3, cooldown_minutes: 60, check_interval_minutes: 15 },
                  aggressive: { min_confidence_score: 60, max_migrations_per_run: 5, cooldown_minutes: 30, check_interval_minutes: 5 }
                };

                const presetInfo = {
                  conservative: { icon: Shield, color: 'blue', label: 'Conservative', desc: 'High confidence, low frequency, safest option' },
                  balanced: { icon: Activity, color: 'green', label: 'Balanced', desc: 'Medium confidence and frequency, recommended' },
                  aggressive: { icon: AlertTriangle, color: 'orange', label: 'Aggressive', desc: 'Lower confidence, high frequency, use with care' }
                };

                return (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {Object.entries(presets).map(([key, preset]) => {
                      const info = presetInfo[key];
                      const Icon = info.icon;
                      const editing = editingPreset === key;

                      return (
                        <div key={key} className={`p-3 bg-white dark:bg-gray-700 border-2 border-${info.color}-300 dark:border-${info.color}-600 rounded-lg ${!editing && 'hover:bg-' + info.color + '-50 dark:hover:bg-' + info.color + '-900/30'} transition-colors`}>
                          {editing ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Icon size={16} className={`text-${info.color}-600 dark:text-${info.color}-400`} />
                                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{info.label}</span>
                                </div>
                                <button
                                  onClick={() => setEditingPreset(null)}
                                  className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Min Confidence</label>
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={preset.min_confidence_score}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, min_confidence_score: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Max Migrations</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="20"
                                  value={preset.max_migrations_per_run}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, max_migrations_per_run: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Cooldown (min)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="1440"
                                  value={preset.cooldown_minutes}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, cooldown_minutes: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-gray-600 dark:text-gray-400">Check Interval (min)</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="1440"
                                  value={preset.check_interval_minutes}
                                  onChange={(e) => saveAutomationConfig({
                                    presets: {
                                      ...presets,
                                      [key]: { ...preset, check_interval_minutes: parseInt(e.target.value) }
                                    }
                                  })}
                                  className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                if (editingPreset) {
                                  setEditingPreset(key);
                                } else if (confirmApplyPreset === key) {
                                  // Second click - execute the preset application
                                  saveAutomationConfig({
                                    check_interval_minutes: preset.check_interval_minutes,
                                    rules: {
                                      ...automationConfig.rules,
                                      min_confidence_score: preset.min_confidence_score,
                                      max_migrations_per_run: preset.max_migrations_per_run,
                                      cooldown_minutes: preset.cooldown_minutes
                                    }
                                  });
                                  setConfirmApplyPreset(null);
                                } else {
                                  // First click - set confirm state
                                  setConfirmApplyPreset(key);
                                }
                              }}
                              className={`w-full text-left ${
                                confirmApplyPreset === key
                                  ? 'ring-2 ring-orange-500 dark:ring-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                  : ''
                              }`}
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <Icon size={18} className={`text-${info.color}-600 dark:text-${info.color}-400`} />
                                <span className="font-semibold text-gray-900 dark:text-white">{info.label}</span>
                                {editingPreset && (
                                  <Settings size={14} className="ml-auto text-gray-500" />
                                )}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                {info.desc}
                              </div>
                              {editingPreset && (
                                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  Click to edit
                                </div>
                              )}
                              {confirmApplyPreset === key && (
                                <div className="text-xs text-orange-700 dark:text-orange-300 mt-1 font-semibold">
                                  Click again to apply preset
                                </div>
                              )}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <div className="text-xs text-purple-700 dark:text-purple-300 mt-3 italic">
                💡 {editingPreset ? 'Edit preset values above, then click "Done Editing" to apply them.' : 'These presets configure multiple settings at once. Click "Customize Presets" to edit their values.'}
              </div>
            </div>
          </div>)}
        </div>

        {/* Penalty-Based Scoring Info - Collapsible */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({...prev, howItWorks: !prev.howItWorks}))}
            className="w-full flex items-center justify-between p-5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-wrap gap-y-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Info size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="font-bold text-blue-900 dark:text-blue-200 text-left">How Automated Migrations Work</div>
            </div>
            {collapsedSections.howItWorks ? (
              <ChevronDown size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <ChevronUp size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </button>

          {!collapsedSections.howItWorks && (
            <div className="px-5 pb-5">
              <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                <p>
                  Automated migrations use a <strong>penalty-based scoring system</strong> to intelligently balance your cluster.
                  Each node accumulates penalties based on multiple factors - lower scores indicate better migration targets.
                </p>
                <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded border border-blue-300 dark:border-blue-600">
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Penalty Factors:</div>
                  <ul className="list-disc list-inside ml-2 mt-1 space-y-1 text-sm">
                    <li><strong>Current Load:</strong> Immediate resource pressure from CPU, Memory, and IOWait (20-100 points each)</li>
                    <li><strong>Sustained Load:</strong> Long-term resource usage patterns over 7 days (15-150 points)</li>
                    <li><strong>Rising Trends:</strong> Resources trending upward over time (15 points per metric)</li>
                    <li><strong>Load Spikes:</strong> Maximum resource peaks detected in recent history (5-30 points)</li>
                    <li><strong>Predicted Load:</strong> Post-migration resource levels to prevent overloading targets</li>
                  </ul>
                  <p className="mt-3 text-sm">
                    <button
                      onClick={() => setCurrentPage('dashboard')}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
                    >
                      View Migration Recommendations →
                    </button> to see detailed scoring, confidence levels, and suggested migrations.
                  </p>
                  <p className="mt-2 text-xs text-blue-700 dark:text-blue-300 italic">
                    💡 The system finds optimal migration pairs by comparing source node penalties with target node suitability scores. Only migrations with significant score improvements ({penaltyConfig?.min_score_improvement || 15}+ points by default) are recommended.
                  </p>
                  <p className="mt-3 text-sm">
                    <button
                      onClick={() => {
                        // Navigate to Settings page and open penalty config
                        setCurrentPage('settings');
                        setOpenPenaltyConfigOnSettings(true);
                      }}
                      className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
                    >
                      ⚙️ Configure Penalty Weights →
                    </button>
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Decision Tree - Collapsible */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-6">
          <button
            onClick={() => setCollapsedSections(prev => ({...prev, decisionTree: !prev.decisionTree}))}
            className="w-full flex items-center justify-between p-5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-wrap gap-y-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Info size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="font-bold text-blue-900 dark:text-blue-200 text-left">Migration Decision Flowchart</div>
            </div>
            {collapsedSections.decisionTree ? (
              <ChevronDown size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            ) : (
              <ChevronUp size={20} className="text-blue-600 dark:text-blue-400 shrink-0" />
            )}
          </button>

          {!collapsedSections.decisionTree && (
            <div className="px-5 pb-5">
              <div className="text-sm text-blue-800 dark:text-blue-300 space-y-4">
                <p className="font-semibold text-blue-900 dark:text-blue-200">
                  This decision tree shows all possible paths through the automated migration process:
                </p>

                {/* Decision Tree Diagram */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-lg p-6 border-2 border-blue-300 dark:border-blue-600 shadow-sm">
                  <div className="space-y-4">

                    {/* Start Box */}
                    <div className="flex justify-center">
                      <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow">
                        🚀 Automation Run Triggered
                      </div>
                    </div>

                    {/* Flow connector with arrow */}
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600"></div>
                      <div className="text-blue-500 dark:text-blue-400">▼</div>
                    </div>

                    {/* Decision boxes */}
                    <div className="space-y-3">

                      {/* Step 1 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">1</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>⚙️</span> Is automation enabled?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                <span className="text-red-600 dark:text-red-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">STOP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">2</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>⏱️</span> Is cooldown period elapsed?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">3</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>🕐</span> In allowed time window?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                <span className="text-red-600 dark:text-red-400 font-bold">✗ BLACKOUT</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">BLOCKED</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">✗ OUTSIDE</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 4 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">4</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>🏥</span> Is cluster healthy? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(if enabled)</span>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                <span className="text-red-600 dark:text-red-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">ABORT</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 5 - Process Box */}
                      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border-2 border-indigo-300 dark:border-indigo-600 p-5 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">5</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <span>🎯</span> Generate Recommendations
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Calculate penalty scores for all nodes</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Find VMs on high-penalty nodes</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Match with low-penalty target nodes</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Apply filters (tags, storage, rollback detection)</div>
                              <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Calculate confidence scores</div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 6 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">6</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>📊</span> Any recommendations above min confidence?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                <span className="text-orange-600 dark:text-orange-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 7 */}
                      <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">7</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                              <span>🧪</span> Is dry run mode enabled?
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                <span className="text-blue-600 dark:text-blue-400 font-bold">✓ YES</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="bg-blue-500 dark:bg-blue-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">LOG ONLY</span>
                              </div>
                              <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                <span className="text-green-600 dark:text-green-400 font-bold">✗ NO</span>
                                <span className="text-gray-500 dark:text-gray-400">→</span>
                                <span className="text-gray-700 dark:text-gray-300 font-medium">Execute ↓</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Step 8 - Action Box */}
                      <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 p-5 shadow-md">
                        <div className="flex items-start gap-3">
                          <div className="bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-500 dark:to-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">8</div>
                          <div className="flex-1">
                            <div className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                              <span>⚡</span> Execute Migrations
                            </div>
                            <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Limit to max migrations per run (default: 3)</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Execute migrations sequentially</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> If migration fails + abort_on_failure: STOP batch</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> If migration fails + pause_on_failure: DISABLE automation</div>
                              <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Track migration status and update history</div>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                    {/* Flow connector with arrow */}
                    <div className="flex flex-col items-center">
                      <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600"></div>
                      <div className="text-emerald-500 dark:text-emerald-400">▼</div>
                    </div>

                    {/* End Box */}
                    <div className="flex justify-center">
                      <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 dark:from-emerald-500 dark:via-green-500 dark:to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3">
                        <span className="text-2xl">✓</span> <span>Run Complete</span>
                      </div>
                    </div>

                  </div>
                </div>

                <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600">
                  <div className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <span>💡</span> Configuration Profiles
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">🛡️ Conservative</div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>• Min confidence: 80+</div>
                        <div>• Max migrations: 1-2</div>
                        <div>• Cooldown: 60+ min</div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">⚖️ Balanced</div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>• Min confidence: 70+</div>
                        <div>• Max migrations: 3-5</div>
                        <div>• Cooldown: 30-60 min</div>
                      </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                      <div className="font-bold text-gray-900 dark:text-white mb-1">⚡ Aggressive</div>
                      <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                        <div>• Min confidence: 60+</div>
                        <div>• Max migrations: 5-10</div>
                        <div>• Cooldown: 15-30 min</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Safety & Rules */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, safetyRules: !prev.safetyRules }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Safety & Rules</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.safetyRules ? '-rotate-180' : ''}`}
            />
          </button>

          {!collapsedSections.safetyRules && (
          <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Confidence Score
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={automationConfig.rules?.min_confidence_score || 75}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, min_confidence_score: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Migrations Per Run
              </label>
              <input
                type="number"
                min="1"
                max="20"
                value={automationConfig.rules?.max_migrations_per_run || 3}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_migrations_per_run: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Cooldown Minutes
              </label>
              <input
                type="number"
                min="0"
                max="1440"
                value={automationConfig.rules?.cooldown_minutes || 30}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, cooldown_minutes: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Wait time between migrations of the same VM
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Concurrent Migrations
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={automationConfig.rules?.max_concurrent_migrations || 1}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_concurrent_migrations: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Maximum simultaneous migrations
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Grace Period (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="300"
                value={automationConfig.rules?.grace_period_seconds !== undefined ? automationConfig.rules.grace_period_seconds : 30}
                onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, grace_period_seconds: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Wait time between migrations for cluster to settle (0 = no wait)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Node CPU %
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Node Memory %
              </label>
              <input
                type="number"
                min="50"
                max="100"
                value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: parseInt(e.target.value) } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {/* Respect 'ignore' Tags */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Respect 'ignore' Tags</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Skip VMs tagged with 'pb-ignore' or 'ignore' during automated migrations. Use for critical VMs that require manual migration planning.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.rules?.respect_ignore_tags !== false}
                    onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_ignore_tags: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            {/* Require 'auto_migrate_ok' Tag */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Require 'auto_migrate_ok' Tag</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Only migrate VMs with 'auto-migrate-ok' or 'auto_migrate_ok' tag (opt-in mode). All other VMs will be excluded from automated migrations.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.rules?.require_auto_migrate_ok_tag || false}
                    onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, require_auto_migrate_ok_tag: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            {/* Respect Anti-Affinity */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Respect Anti-Affinity (exclude_* tags)</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Prevents VMs with the same exclude tag from clustering on one node. Example: Two VMs with 'exclude_database' will spread across different nodes for fault tolerance.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.rules?.respect_exclude_affinity !== false}
                    onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_exclude_affinity: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
            {/* Allow Container Restarts */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Allow Container Restarts for Migration</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Enables automated migrations to restart containers that cannot be live-migrated. Containers will experience brief downtime during migration.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.rules?.allow_container_restarts === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Show warning for enabling container restarts
                        setConfirmAllowContainerRestarts(true);
                      } else {
                        // Disabling is safe, no confirmation needed
                        saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: false } });
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
              {confirmAllowContainerRestarts && (
                <div className="mt-3">
                  <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold text-orange-900 dark:text-orange-200 text-sm mb-1">ALLOW CONTAINER RESTARTS?</div>
                        <div className="text-xs text-orange-800 dark:text-orange-300 space-y-1 mb-2">
                          <p>This will allow automated migrations to restart containers that cannot be live-migrated.</p>
                          <p className="font-semibold">Containers will experience brief downtime during migration.</p>
                          <p>Are you sure?</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: true } });
                              setConfirmAllowContainerRestarts(false);
                            }}
                            className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium"
                          >
                            Yes, Allow Restarts
                          </button>
                          <button
                            onClick={() => setConfirmAllowContainerRestarts(false)}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rollback Detection */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Rollback Detection</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Prevent migration loops by detecting when a VM would be migrated back to a node it was recently migrated from.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.rules?.rollback_detection_enabled !== false}
                    onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, rollback_detection_enabled: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
              {automationConfig.rules?.rollback_detection_enabled !== false && (
                <div className="px-4 pb-4">
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Rollback Detection Window (hours)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="168"
                    value={automationConfig.rules?.rollback_window_hours || 24}
                    onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, rollback_window_hours: parseInt(e.target.value) } })}
                    className="w-32 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How far back to check for previous migrations (default: 24 hours)
                  </p>
                </div>
              )}
            </div>

            {/* Check Cluster Health */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Check Cluster Health Before Migrating</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Verifies cluster is healthy before migrating: cluster has quorum, all nodes CPU &lt; 85%, all nodes memory &lt; 90%. Prevents migrations during cluster stress that could worsen the situation. Recommended for production.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.safety_checks?.check_cluster_health !== false}
                    onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, check_cluster_health: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
            {/* Abort Batch on Failure */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Abort Batch if a Migration Fails</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Stops executing remaining migrations in the current batch if any single migration fails. Prevents cascading issues when a migration error might indicate a cluster problem.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.safety_checks?.abort_on_failure !== false}
                    onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, abort_on_failure: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
            {/* Pause Automation After Failure */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Pause Automation After Migration Failure</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Automatically disables automated migrations if any migration fails. Prevents cascading failures and requires manual review before resuming automation. Highly recommended for production environments.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.safety_checks?.pause_on_failure === true}
                    onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, pause_on_failure: e.target.checked } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Distribution Balancing */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, distributionBalancing: !prev.distributionBalancing }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Distribution Balancing</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.distributionBalancing ? '-rotate-180' : ''}`}
            />
          </button>

          {!collapsedSections.distributionBalancing && (
          <>
          {/* Collapsible detailed description */}
          <div className="mb-4">
            <button
              onClick={() => setCollapsedSections(prev => ({ ...prev, distributionBalancingHelp: !prev.distributionBalancingHelp }))}
              className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
            >
              {collapsedSections.distributionBalancingHelp ? (
                <>
                  <ChevronDown size={16} className="-rotate-90" />
                  Show detailed explanation
                </>
              ) : (
                <>
                  <ChevronDown size={16} />
                  Hide detailed explanation
                </>
              )}
            </button>

            {!collapsedSections.distributionBalancingHelp && (
              <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What is Distribution Balancing?</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    Complements performance-based recommendations by focusing on <strong>evening out the number of VMs/CTs across nodes</strong>, rather than just CPU, memory, or I/O metrics.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">The Problem It Solves</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    A node with 19 small VMs (DNS, monitoring, utilities) may show low resource usage but still suffers from management overhead, slower operations (start/stop/backup), and uneven workload distribution. Distribution balancing addresses this by moving small guests to less populated nodes.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How It Works</h3>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                    <li>Counts running guests on each node (e.g., pve4: 19, pve6: 4)</li>
                    <li>If difference ≥ threshold (default: 2), finds small guests on overloaded node</li>
                    <li>Only considers guests ≤ max CPU cores (default: 2) and ≤ max memory (default: 4 GB)</li>
                    <li>Recommends migrating eligible small guests to underloaded nodes</li>
                    <li>Works alongside performance-based recommendations, respects tags and storage compatibility</li>
                  </ol>
                </div>

                <div>
                  <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">When to Enable</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    ✓ Many small utility VMs (DNS, monitoring, etc.)<br />
                    ✓ Nodes with very different guest counts (e.g., 19 vs 4)<br />
                    ✓ Performance metrics don't show the imbalance<br />
                    ✓ Want more even workload distribution for management simplicity
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Enable Distribution Balancing */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Enable Distribution Balancing</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Automatically balance small workloads across nodes to prevent guest count imbalance</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.distribution_balancing?.enabled || false}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      const newConfig = { ...config };
                      if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                      newConfig.distribution_balancing.enabled = enabled;
                      setConfig(newConfig);
                      saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>

            {config.distribution_balancing?.enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              {/* Guest Count Threshold */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Guest Count Threshold
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={config.distribution_balancing?.guest_count_threshold || 2}
                  onChange={(e) => {
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.guest_count_threshold = parseInt(e.target.value);
                    setConfig(newConfig);
                    saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Minimum difference in guest counts to trigger balancing
                </p>
              </div>

              {/* Max CPU Cores */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max CPU Cores
                </label>
                <input
                  type="number"
                  min="0"
                  max="32"
                  value={config.distribution_balancing?.max_cpu_cores || 2}
                  onChange={(e) => {
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.max_cpu_cores = parseInt(e.target.value);
                    setConfig(newConfig);
                    saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only migrate guests with ≤ this many CPU cores (0 = no limit)
                </p>
              </div>

              {/* Max Memory GB */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Memory (GB)
                </label>
                <input
                  type="number"
                  min="0"
                  max="256"
                  value={config.distribution_balancing?.max_memory_gb || 4}
                  onChange={(e) => {
                    const newConfig = { ...config };
                    if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                    newConfig.distribution_balancing.max_memory_gb = parseInt(e.target.value);
                    setConfig(newConfig);
                    saveAutomationConfig({ distribution_balancing: { ...newConfig.distribution_balancing } });
                  }}
                  className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Only migrate guests with ≤ this much memory (0 = no limit)
                </p>
              </div>
            </div>
            )}
          </div>
          </>
          )}
        </div>

        {/* Time Windows (Unified) */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Time Windows</h2>

          {/* Timezone Selector */}
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Timezone for Time Windows
                </label>
                <select
                  value={automationConfig.schedule?.timezone || 'UTC'}
                  onChange={(e) => saveAutomationConfig({
                    schedule: {
                      ...automationConfig.schedule,
                      timezone: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="UTC">UTC (Server Time)</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                  <option value="America/Chicago">Central Time (CT)</option>
                  <option value="America/Denver">Mountain Time (MT)</option>
                  <option value="America/Los_Angeles">Pacific Time (PT)</option>
                  <option value="America/Anchorage">Alaska Time (AK)</option>
                  <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                  <option value="Europe/London">London (GMT/BST)</option>
                  <option value="Europe/Paris">Paris (CET/CEST)</option>
                  <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                  <option value="Europe/Moscow">Moscow (MSK)</option>
                  <option value="Asia/Dubai">Dubai (GST)</option>
                  <option value="Asia/Kolkata">India (IST)</option>
                  <option value="Asia/Shanghai">China (CST)</option>
                  <option value="Asia/Tokyo">Tokyo (JST)</option>
                  <option value="Asia/Singapore">Singapore (SGT)</option>
                  <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                  <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                </select>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                  All time windows below use this timezone. Current server time (UTC): {new Date().toUTCString()}
                </p>
              </div>
            </div>
          </div>

          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure when migrations are allowed (Migration Windows) or blocked (Blackout Windows).
            If no windows are configured, migrations are allowed at any time.
          </p>

          {/* Weekly Visual Timeline */}
          {(() => {
            const migrationWindows = automationConfig.schedule?.migration_windows || [];
            const blackoutWindows = automationConfig.schedule?.blackout_windows || [];
            const hasWindows = migrationWindows.length > 0 || blackoutWindows.length > 0;

            if (!hasWindows) return null;

            const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

            return (
              <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Weekly Schedule Overview
                </div>

                {/* Week Grid */}
                <div className="space-y-3 mt-4">
                  {daysOfWeek.map((day) => {
                    const dayMigrations = migrationWindows.filter(w => w.days?.includes(day));
                    const dayBlackouts = blackoutWindows.filter(w => w.days?.includes(day));
                    const isToday = day === today;

                    return (
                      <div key={day} className="flex gap-2">
                        {/* Day Label */}
                        <div className={`w-20 flex-shrink-0 text-xs font-medium flex items-center ${
                          isToday
                            ? 'text-blue-600 dark:text-blue-400 font-bold'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          {day.slice(0, 3)}
                          {isToday && <span className="ml-1 text-blue-600 dark:text-blue-400">●</span>}
                        </div>

                        {/* Timeline Bar */}
                        <div className="flex-1 relative h-6 bg-gray-200 dark:bg-gray-600 rounded overflow-visible">
                          {/* Hour tick marks - every hour */}
                          {Array.from({ length: 25 }, (_, hour) => {
                            const isMajorTick = hour % 6 === 0;
                            const isMinorTick = hour % 3 === 0 && !isMajorTick;

                            return (
                              <div
                                key={`tick-${hour}`}
                                className={`absolute bottom-0 z-0 ${
                                  isMajorTick
                                    ? 'h-full border-l-2 border-gray-400 dark:border-gray-500'
                                    : isMinorTick
                                    ? 'h-2/3 border-l border-gray-350 dark:border-gray-500'
                                    : 'h-1/3 border-l border-gray-300 dark:border-gray-550'
                                }`}
                                style={{ left: `${(hour / 24) * 100}%` }}
                              >
                                {isMajorTick && hour < 24 && (
                                  <div className="absolute -top-3 -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                    {hour.toString().padStart(2, '0')}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {/* Render blackout windows */}
                          {dayBlackouts.map((window, idx) => {
                            const [startHour, startMin] = window.start_time.split(':').map(Number);
                            const [endHour, endMin] = window.end_time.split(':').map(Number);
                            const startPercent = ((startHour * 60 + startMin) / 1440) * 100;
                            const endPercent = ((endHour * 60 + endMin) / 1440) * 100;
                            const width = endPercent - startPercent;

                            // Find the global index for this blackout window
                            const blackoutIndex = blackoutWindows.findIndex(w =>
                              w.name === window.name &&
                              w.start_time === window.start_time &&
                              w.end_time === window.end_time
                            );
                            const globalIndex = migrationWindows.length + blackoutIndex;

                            return (
                              <div
                                key={`blackout-${idx}`}
                                className="absolute top-0 bottom-0 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-colors z-10 cursor-pointer"
                                style={{ left: `${startPercent}%`, width: `${width}%` }}
                                title={`${window.name}: ${window.start_time}-${window.end_time} (BLOCKED) - Click to edit`}
                                onClick={() => {
                                  setEditingWindowIndex(globalIndex);
                                  // Scroll to the window list
                                  setTimeout(() => {
                                    const element = document.querySelector(`[data-window-index="${globalIndex}"]`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }, 100);
                                }}
                              />
                            );
                          })}

                          {/* Render migration windows */}
                          {dayMigrations.map((window, idx) => {
                            const [startHour, startMin] = window.start_time.split(':').map(Number);
                            const [endHour, endMin] = window.end_time.split(':').map(Number);
                            const startPercent = ((startHour * 60 + startMin) / 1440) * 100;
                            const endPercent = ((endHour * 60 + endMin) / 1440) * 100;
                            const width = endPercent - startPercent;

                            // Find the global index for this migration window
                            const migrationIndex = migrationWindows.findIndex(w =>
                              w.name === window.name &&
                              w.start_time === window.start_time &&
                              w.end_time === window.end_time
                            );

                            return (
                              <div
                                key={`migration-${idx}`}
                                className="absolute top-0 bottom-0 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 transition-colors z-10 cursor-pointer"
                                style={{ left: `${startPercent}%`, width: `${width}%` }}
                                title={`${window.name}: ${window.start_time}-${window.end_time} (ALLOWED) - Click to edit`}
                                onClick={() => {
                                  setEditingWindowIndex(migrationIndex);
                                  // Scroll to the window list
                                  setTimeout(() => {
                                    const element = document.querySelector(`[data-window-index="${migrationIndex}"]`);
                                    if (element) {
                                      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                    }
                                  }, 100);
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex items-center gap-4 mt-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-500 dark:bg-green-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Migrations Allowed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-500 dark:bg-red-600 rounded"></div>
                    <span className="text-gray-600 dark:text-gray-400">Migrations Blocked</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500"></div>
                    <span className="text-gray-600 dark:text-gray-400">No Restriction</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Combined Windows List */}
          {(() => {
            const migrationWindows = automationConfig.schedule?.migration_windows || [];
            const blackoutWindows = automationConfig.schedule?.blackout_windows || [];

            // Combine both arrays with type information
            const allWindows = [
              ...migrationWindows.map((w, idx) => ({ ...w, type: 'migration', originalIndex: idx })),
              ...blackoutWindows.map((w, idx) => ({ ...w, type: 'blackout', originalIndex: idx }))
            ];

            if (allWindows.length === 0) {
              return (
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 mb-3">
                  No time windows configured - migrations allowed at any time
                </div>
              );
            }

            return (
              <div className="space-y-2 mb-3">
                {allWindows.map((window, idx) => {
                  const isMigration = window.type === 'migration';
                  const isEditing = editingWindowIndex === idx;

                  return (
                    <div
                      key={`${window.type}-${window.originalIndex}`}
                      data-window-index={idx}
                      className={`p-3 rounded-lg border ${
                        isMigration
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-3">
                          {/* Type Toggle */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window Type</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  // Move window from one array to another
                                  const newMigrationWindows = [...migrationWindows];
                                  const newBlackoutWindows = [...blackoutWindows];

                                  if (isMigration) {
                                    // Move to blackout
                                    const [removed] = newMigrationWindows.splice(window.originalIndex, 1);
                                    newBlackoutWindows.push(removed);
                                  } else {
                                    // Move to migration
                                    const [removed] = newBlackoutWindows.splice(window.originalIndex, 1);
                                    newMigrationWindows.push(removed);
                                  }

                                  saveAutomationConfig({
                                    schedule: {
                                      ...automationConfig.schedule,
                                      migration_windows: newMigrationWindows,
                                      blackout_windows: newBlackoutWindows
                                    }
                                  });
                                  setEditingWindowIndex(null);
                                }}
                                className={`px-3 py-2 rounded text-sm font-semibold ${
                                  isMigration
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                Migration Window
                              </button>
                              <button
                                onClick={() => {
                                  // Move window from one array to another
                                  const newMigrationWindows = [...migrationWindows];
                                  const newBlackoutWindows = [...blackoutWindows];

                                  if (isMigration) {
                                    // Move to blackout
                                    const [removed] = newMigrationWindows.splice(window.originalIndex, 1);
                                    newBlackoutWindows.push(removed);
                                  } else {
                                    // Move to migration
                                    const [removed] = newBlackoutWindows.splice(window.originalIndex, 1);
                                    newMigrationWindows.push(removed);
                                  }

                                  saveAutomationConfig({
                                    schedule: {
                                      ...automationConfig.schedule,
                                      migration_windows: newMigrationWindows,
                                      blackout_windows: newBlackoutWindows
                                    }
                                  });
                                  setEditingWindowIndex(null);
                                }}
                                className={`px-3 py-2 rounded text-sm font-semibold ${
                                  !isMigration
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                Blackout Window
                              </button>
                            </div>
                          </div>

                          {/* Window Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Window Name</label>
                            <input
                              type="text"
                              value={window.name}
                              onChange={(e) => {
                                const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                const newWindows = [...targetArray];
                                newWindows[window.originalIndex] = { ...window, name: e.target.value };

                                saveAutomationConfig({
                                  schedule: {
                                    ...automationConfig.schedule,
                                    [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                  }
                                });
                              }}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                            />
                          </div>

                          {/* Days of Week */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Days of Week</label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={window.days?.length === 7}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    newWindows[window.originalIndex] = {
                                      ...window,
                                      days: e.target.checked
                                        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                        : []
                                    };

                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className={`w-4 h-4 border-gray-300 rounded ${
                                    isMigration ? 'text-green-600 focus:ring-green-500' : 'text-red-600 focus:ring-red-500'
                                  }`}
                                />
                                <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">All Days</span>
                              </label>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <label key={day} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={window.days?.includes(day)}
                                    onChange={(e) => {
                                      const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                      const newWindows = [...targetArray];
                                      const currentDays = window.days || [];
                                      newWindows[window.originalIndex] = {
                                        ...window,
                                        days: e.target.checked
                                          ? [...currentDays, day]
                                          : currentDays.filter(d => d !== day)
                                      };

                                      saveAutomationConfig({
                                        schedule: {
                                          ...automationConfig.schedule,
                                          [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                        }
                                      });
                                    }}
                                    className={`w-4 h-4 border-gray-300 rounded ${
                                      isMigration ? 'text-green-600 focus:ring-green-500' : 'text-red-600 focus:ring-red-500'
                                    }`}
                                  />
                                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{day.slice(0, 3)}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Start/End Time */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                              <div className="flex gap-2">
                                <select
                                  value={window.start_time?.split(':')[0] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentMinute = window.start_time?.split(':')[1] || '00';
                                    newWindows[window.originalIndex] = { ...window, start_time: `${e.target.value}:${currentMinute}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i.toString().padStart(2, '0')}>
                                      {i.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                </select>
                                <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                <select
                                  value={window.start_time?.split(':')[1] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentHour = window.start_time?.split(':')[0] || '00';
                                    newWindows[window.originalIndex] = { ...window, start_time: `${currentHour}:${e.target.value}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                    <option key={minute} value={minute.toString().padStart(2, '0')}>
                                      {minute.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                  <option value="59">59 (End of Hour)</option>
                                </select>
                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                              <div className="flex gap-2">
                                <select
                                  value={window.end_time?.split(':')[0] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentMinute = window.end_time?.split(':')[1] || '00';
                                    newWindows[window.originalIndex] = { ...window, end_time: `${e.target.value}:${currentMinute}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i.toString().padStart(2, '0')}>
                                      {i.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                </select>
                                <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                <select
                                  value={window.end_time?.split(':')[1] || '00'}
                                  onChange={(e) => {
                                    const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                    const newWindows = [...targetArray];
                                    const currentHour = window.end_time?.split(':')[0] || '00';
                                    newWindows[window.originalIndex] = { ...window, end_time: `${currentHour}:${e.target.value}` };
                                    saveAutomationConfig({
                                      schedule: {
                                        ...automationConfig.schedule,
                                        [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                      }
                                    });
                                  }}
                                  className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                >
                                  {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                    <option key={minute} value={minute.toString().padStart(2, '0')}>
                                      {minute.toString().padStart(2, '0')}
                                    </option>
                                  ))}
                                  <option value="59">59 (End of Hour)</option>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Done Button */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingWindowIndex(null)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* Type Badge */}
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${
                            isMigration
                              ? 'bg-green-600 text-white'
                              : 'bg-red-600 text-white'
                          }`}>
                            {isMigration ? 'MIGRATION' : 'BLACKOUT'}
                          </span>

                          {/* Window Info */}
                          <div className="flex-1">
                            <span className="font-medium text-gray-900 dark:text-white">
                              {window.name || `${isMigration ? 'Migration' : 'Blackout'} ${window.originalIndex + 1}`}
                            </span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                              {window.days?.join(', ')} {window.start_time}-{window.end_time}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <button
                            onClick={() => setEditingWindowIndex(idx)}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              const windowId = `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}`;

                              // Two-click pattern: first click sets confirm state, second click executes
                              if (confirmRemoveWindow?.id === windowId) {
                                // Second click - execute the removal
                                const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                const newWindows = [...targetArray];
                                newWindows.splice(window.originalIndex, 1);

                                saveAutomationConfig({
                                  schedule: {
                                    ...automationConfig.schedule,
                                    [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                  }
                                });
                                setConfirmRemoveWindow(null);
                              } else {
                                // First click - set confirm state
                                setConfirmRemoveWindow({ id: windowId, type: isMigration ? 'migration' : 'blackout' });
                              }
                            }}
                            className={`px-2 py-1 text-white rounded text-sm ${
                              confirmRemoveWindow?.id === `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}`
                                ? 'bg-orange-600 hover:bg-orange-700'
                                : 'bg-red-600 hover:bg-red-700'
                            }`}
                          >
                            {confirmRemoveWindow?.id === `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}` ? 'Click to confirm' : 'Remove'}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Add Window Form */}
          {showTimeWindowForm ? (
            <div className={`rounded-lg p-4 mb-3 border ${
              newWindowData.type === 'migration'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
            }`}>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Add Time Window</h4>
              <div className="space-y-3">
                {/* Type Toggle */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewWindowData({ ...newWindowData, type: 'migration' })}
                      className={`px-3 py-2 rounded text-sm font-semibold ${
                        newWindowData.type === 'migration'
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Migration Window
                    </button>
                    <button
                      onClick={() => setNewWindowData({ ...newWindowData, type: 'blackout' })}
                      className={`px-3 py-2 rounded text-sm font-semibold ${
                        newWindowData.type === 'blackout'
                          ? 'bg-red-600 text-white'
                          : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      Blackout Window
                    </button>
                  </div>
                </div>

                {/* Window Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Window Name
                  </label>
                  <input
                    type="text"
                    value={newWindowData.name}
                    onChange={(e) => setNewWindowData({ ...newWindowData, name: e.target.value })}
                    placeholder={newWindowData.type === 'migration' ? 'e.g., Weekend Maintenance' : 'e.g., Business Hours'}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>

                {/* Days of Week */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Days of Week
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newWindowData.days.length === 7}
                        onChange={(e) => {
                          setNewWindowData({
                            ...newWindowData,
                            days: e.target.checked
                              ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                              : []
                          });
                        }}
                        className={`w-4 h-4 border-gray-300 rounded ${
                          newWindowData.type === 'migration'
                            ? 'text-green-600 focus:ring-green-500'
                            : 'text-red-600 focus:ring-red-500'
                        }`}
                      />
                      <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">All Days</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                      <label key={day} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newWindowData.days.includes(day)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewWindowData({ ...newWindowData, days: [...newWindowData.days, day] });
                            } else {
                              setNewWindowData({ ...newWindowData, days: newWindowData.days.filter(d => d !== day) });
                            }
                          }}
                          className={`w-4 h-4 border-gray-300 rounded ${
                            newWindowData.type === 'migration'
                              ? 'text-green-600 focus:ring-green-500'
                              : 'text-red-600 focus:ring-red-500'
                          }`}
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Start/End Time */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Time Range
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setNewWindowData({ ...newWindowData, start_time: '00:00', end_time: '23:59' })}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      >
                        All Day
                      </button>
                      <button
                        onClick={() => setNewWindowData({ ...newWindowData, start_time: '09:00', end_time: '17:00' })}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      >
                        Business Hours
                      </button>
                      <button
                        onClick={() => setNewWindowData({ ...newWindowData, start_time: '22:00', end_time: '06:00' })}
                        className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                      >
                        Night
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Start Time
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={newWindowData.start_time?.split(':')[0] || '00'}
                          onChange={(e) => {
                            const currentMinute = newWindowData.start_time?.split(':')[1] || '00';
                            setNewWindowData({ ...newWindowData, start_time: `${e.target.value}:${currentMinute}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                        <select
                          value={newWindowData.start_time?.split(':')[1] || '00'}
                          onChange={(e) => {
                            const currentHour = newWindowData.start_time?.split(':')[0] || '00';
                            setNewWindowData({ ...newWindowData, start_time: `${currentHour}:${e.target.value}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                            <option key={minute} value={minute.toString().padStart(2, '0')}>
                              {minute.toString().padStart(2, '0')}
                            </option>
                          ))}
                          <option value="59">59 (End of Hour)</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        End Time
                      </label>
                      <div className="flex gap-2">
                        <select
                          value={newWindowData.end_time?.split(':')[0] || '00'}
                          onChange={(e) => {
                            const currentMinute = newWindowData.end_time?.split(':')[1] || '00';
                            setNewWindowData({ ...newWindowData, end_time: `${e.target.value}:${currentMinute}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 24 }, (_, i) => (
                            <option key={i} value={i.toString().padStart(2, '0')}>
                              {i.toString().padStart(2, '0')}
                            </option>
                          ))}
                        </select>
                        <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                        <select
                          value={newWindowData.end_time?.split(':')[1] || '00'}
                          onChange={(e) => {
                            const currentHour = newWindowData.end_time?.split(':')[0] || '00';
                            setNewWindowData({ ...newWindowData, end_time: `${currentHour}:${e.target.value}` });
                          }}
                          className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        >
                          {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                            <option key={minute} value={minute.toString().padStart(2, '0')}>
                              {minute.toString().padStart(2, '0')}
                            </option>
                          ))}
                          <option value="59">59 (End of Hour)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save/Cancel Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (newWindowData.name && newWindowData.days.length > 0 && newWindowData.start_time && newWindowData.end_time) {
                        const isMigration = newWindowData.type === 'migration';
                        const targetArray = isMigration
                          ? (automationConfig.schedule?.migration_windows || [])
                          : (automationConfig.schedule?.blackout_windows || []);

                        const { type, ...windowData } = newWindowData;

                        saveAutomationConfig({
                          schedule: {
                            ...automationConfig.schedule,
                            [isMigration ? 'migration_windows' : 'blackout_windows']: [...targetArray, windowData]
                          }
                        });

                        setNewWindowData({ name: '', type: 'migration', days: [], start_time: '00:00', end_time: '00:00' });
                        setShowTimeWindowForm(false);
                      } else {
                        setError('Please fill in all fields');
                      }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                      newWindowData.type === 'migration'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    Save Window
                  </button>
                  <button
                    onClick={() => {
                      setNewWindowData({ name: '', type: 'migration', days: [], start_time: '00:00', end_time: '00:00' });
                      setShowTimeWindowForm(false);
                    }}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowTimeWindowForm(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
            >
              Add Time Window
            </button>
          )}
        </div>

        {/* Migration Logs & History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-y-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Migration Logs & History</h2>
              <span className="relative group inline-block">
                <Info size={16} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700" style={{minWidth: '280px'}}>
                  <div className="font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-2">Migration Scoring System</div>
                  <div className="text-[11px] space-y-1">
                    <div className="text-gray-300">Migrations are scored using a penalty-based system:</div>
                    <div className="mt-2 space-y-0.5">
                      <div>• <span className="text-blue-300">CPU Load</span> × 30%</div>
                      <div>• <span className="text-blue-300">Memory Load</span> × 30%</div>
                      <div>• <span className="text-blue-300">IOWait</span> × 20%</div>
                      <div>• <span className="text-blue-300">Load Average</span> × 10%</div>
                      <div>• <span className="text-blue-300">Storage Pressure</span> × 10%</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div className="text-gray-400">Lower penalty score = better target</div>
                      <div className="text-gray-400">Plus penalties for high usage & trends</div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-700">
                      <div><span className="text-green-400 font-semibold">70%+</span> = Excellent</div>
                      <div><span className="text-yellow-400 font-semibold">50-69%</span> = Good</div>
                      <div><span className="text-orange-400 font-semibold">30-49%</span> = Fair</div>
                      <div><span className="text-red-400 font-semibold">&lt;30%</span> = Poor</div>
                    </div>
                  </div>
                </div>
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
            <div className="flex gap-4">
              <button
                onClick={() => setMigrationLogsTab('history')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  migrationLogsTab === 'history'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Migration History
              </button>
              <button
                onClick={() => setMigrationLogsTab('logs')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  migrationLogsTab === 'logs'
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                Script Logs
              </button>
            </div>
          </div>

          {/* Migration History Table */}
          {migrationLogsTab === 'history' && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-y-3">
                <div className="flex items-center gap-3 min-w-0 flex-wrap">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0
                      ? `Showing ${((migrationHistoryPage - 1) * migrationHistoryPageSize) + 1}-${Math.min(migrationHistoryPage * migrationHistoryPageSize, automationStatus.recent_migrations.length)} of ${automationStatus.recent_migrations.length} migrations`
                      : 'No migrations'}
                  </div>
                  <select
                    value={migrationHistoryPageSize}
                    onChange={(e) => {
                      setMigrationHistoryPageSize(Number(e.target.value));
                      setMigrationHistoryPage(1);
                    }}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value={5}>5 per page</option>
                    <option value={10}>10 per page</option>
                    <option value={25}>25 per page</option>
                    <option value={50}>50 per page</option>
                    <option value={100}>100 per page</option>
                  </select>
                </div>
                <button
                  onClick={fetchAutomationStatus}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Time</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">VM</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Migration</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Score</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Reason</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 ? (
                      (() => {
                        const reversedMigrations = automationStatus.recent_migrations.slice().reverse();
                        const startIndex = (migrationHistoryPage - 1) * migrationHistoryPageSize;
                        const endIndex = startIndex + migrationHistoryPageSize;
                        const paginatedMigrations = reversedMigrations.slice(startIndex, endIndex);
                        return paginatedMigrations.map((migration) => {
                        // Format timestamp
                        let timeDisplay = '';
                        if (migration.timestamp) {
                          try {
                            const timestamp = migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z';
                            const migrationDate = new Date(timestamp);
                            timeDisplay = migrationDate.toLocaleString();
                          } catch (e) {
                            timeDisplay = migration.timestamp;
                          }
                        }

                        // Format duration
                        const durationDisplay = migration.duration_seconds
                          ? `${Math.floor(migration.duration_seconds / 60)}m ${migration.duration_seconds % 60}s`
                          : '-';

                        return (
                          <tr key={migration.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {timeDisplay}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {migration.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {migration.vmid}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                <span className="font-mono">{migration.source_node}</span>
                                <ArrowRight size={12} />
                                <span className="font-mono">{migration.target_node}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {(migration.suitability_rating !== undefined || migration.target_node_score !== undefined) ? (
                                (() => {
                                  // Convert raw penalty score to suitability percentage
                                  const suitabilityPercent = migration.suitability_rating !== undefined
                                    ? migration.suitability_rating
                                    : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));

                                  return (
                                <div className="flex items-center gap-1">
                                  <span className={`font-semibold ${
                                    suitabilityPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                                    suitabilityPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                    suitabilityPercent >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                    'text-red-600 dark:text-red-400'
                                  }`}>
                                    {suitabilityPercent}%
                                  </span>
                                  <span className="relative group inline-block">
                                    <Info size={12} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                                      <div className="font-semibold mb-1 text-blue-400">Scoring Breakdown</div>
                                      <div className="text-[10px] space-y-0.5">
                                        <div>Target: {migration.target_node}</div>
                                        <div>Penalty Score: {migration.target_node_score?.toFixed(1) || 'N/A'}</div>
                                        <div>Suitability: {suitabilityPercent}%</div>
                                        <div className="border-t border-gray-700 pt-1 mt-1">
                                          <div className="text-gray-400">Lower penalty = better target</div>
                                          <div>• CPU Load × 30%</div>
                                          <div>• Memory Load × 30%</div>
                                          <div>• IOWait × 20%</div>
                                          <div>• Load Avg × 10%</div>
                                          <div>• Storage Pressure × 10%</div>
                                          <div className="mt-1 text-gray-400">+ Penalties for high usage/trends</div>
                                        </div>
                                        {migration.target_node_score > 100 && (
                                          <div className="border-t border-gray-700 pt-1 mt-1 text-red-400">
                                            ⚠ Penalty score &gt;100 indicates heavy load/trends
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </span>
                                </div>
                                  );
                                })()
                              ) : (
                                <span className="text-gray-400">N/A</span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                              <div className="truncate" title={migration.reason}>
                                {migration.reason}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${
                                  migration.status === 'completed'
                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                    : migration.status === 'failed'
                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                    : migration.status === 'timeout'
                                    ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                }`}>
                                  {migration.status === 'completed' && <CheckCircle size={12} />}
                                  {migration.status === 'failed' && <XCircle size={12} />}
                                  {migration.status === 'timeout' && <Clock size={12} />}
                                  {migration.status}
                                </span>
                                {migration.dry_run && (
                                  <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    DRY RUN
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                              {durationDisplay}
                            </td>
                          </tr>
                        );
                      });
                      })()
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                          No migration history available
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Page {migrationHistoryPage} of {Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setMigrationHistoryPage(1)}
                      disabled={migrationHistoryPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      First
                    </button>
                    <button
                      onClick={() => setMigrationHistoryPage(migrationHistoryPage - 1)}
                      disabled={migrationHistoryPage === 1}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setMigrationHistoryPage(migrationHistoryPage + 1)}
                      disabled={migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Next
                    </button>
                    <button
                      onClick={() => setMigrationHistoryPage(Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize))}
                      disabled={migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                      className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                    >
                      Last
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Script Logs */}
          {migrationLogsTab === 'logs' && (
            <div>
              <div className="flex items-center justify-between mb-3 flex-wrap gap-y-3">
                <div className="text-xs text-gray-500 dark:text-gray-400 min-w-0">
                  {logRefreshTime && `Last updated: ${logRefreshTime}`}
                </div>
                <div className="flex items-center gap-2 flex-wrap shrink-0">
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/automigrate/logs?lines=500');
                        const data = await response.json();
                        if (data.success) {
                          setAutomigrateLogs(data.logs);
                          setLogRefreshTime(new Date().toLocaleTimeString());
                        }
                      } catch (error) {
                        console.error('Error fetching logs:', error);
                      }
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2"
                  >
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                  <button
                    onClick={() => {
                      if (!automigrateLogs) return;
                      const blob = new Blob([automigrateLogs], { type: 'text/plain' });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `automigrate-logs-${new Date().toISOString().split('T')[0]}.txt`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      window.URL.revokeObjectURL(url);
                    }}
                    disabled={!automigrateLogs}
                    className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-2"
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
              <div className="bg-gray-900 dark:bg-black rounded border border-gray-700 p-4 max-h-96 overflow-y-auto">
                <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                  {automigrateLogs || 'Click "Refresh" to load logs...'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Notification Settings - Link to Settings page */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <div className="flex items-center justify-between flex-wrap gap-y-3">
            <div className="flex items-center gap-3 min-w-0">
              <Bell size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Notification Settings</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {automationConfig.notifications?.enabled
                    ? `Enabled - ${Object.entries(automationConfig.notifications?.providers || {}).filter(([,v]) => v?.enabled).length} provider(s) active`
                    : 'Configure notification providers for migration events'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setCurrentPage('settings')}
              className="shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              <Settings size={16} />
              Open Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
