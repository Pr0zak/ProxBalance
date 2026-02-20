import {
  AlertTriangle, ChevronDown, X, Power
} from '../Icons.jsx';
import NumberField from '../NumberField.jsx';
import Toggle, { ToggleRow } from '../Toggle.jsx';

const { useState } = React;

export default function MainSettingsSection({ automationConfig, saveAutomationConfig, collapsedSections, setCollapsedSections }) {
  const [confirmEnableAutomation, setConfirmEnableAutomation] = useState(false);
  const [confirmDisableDryRun, setConfirmDisableDryRun] = useState(false);

  return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, mainSettings: !prev.mainSettings }))}
            className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
          >
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Core Settings</h2>
            <ChevronDown
              size={24}
              className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.mainSettings ? '' : '-rotate-180'}`}
            />
          </button>

          {!collapsedSections.mainSettings && (<div className="space-y-4">
            {/* Enable/Disable */}
            <ToggleRow
              label="Enable Automated Migrations"
              description="Turn automation on or off"
              checked={automationConfig.enabled || false}
              onChange={(e) => {
                if (e.target.checked) {
                  setConfirmEnableAutomation(true);
                } else {
                  saveAutomationConfig({ enabled: false });
                }
              }}
            >
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
                            className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium flex items-center justify-center gap-1.5"
                          >
                            <Power size={14} />
                            Enable Automation
                          </button>
                          <button
                            onClick={() => setConfirmEnableAutomation(false)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1.5"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ToggleRow>

            {/* Dry Run */}
            <ToggleRow
              label="Dry Run Mode"
              description="Test without actual migrations (recommended)"
              checked={automationConfig.dry_run !== false}
              onChange={(e) => {
                if (!e.target.checked) {
                  setConfirmDisableDryRun(true);
                } else {
                  saveAutomationConfig({ dry_run: true });
                }
              }}
              color="yellow"
            >
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
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-1.5"
                          >
                            <AlertTriangle size={14} />
                            Yes, Disable Dry Run
                          </button>
                          <button
                            onClick={() => setConfirmDisableDryRun(false)}
                            className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-1.5"
                          >
                            <X size={14} />
                            Cancel (Keep Dry Run On)
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </ToggleRow>

            {/* Check Interval */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                Check Interval (minutes)
              </label>
              <NumberField
                min="1"
                max="60"
                value={automationConfig.check_interval_minutes || 5}
                onCommit={(val) => saveAutomationConfig({ check_interval_minutes: val })}
                className="w-32 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
              />
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                How often to check for migrations
              </div>
            </div>

            {/* Migration Rules */}
            <div className="pt-2">
              <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Migration Rules</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Min Confidence Score
                  </label>
                  <NumberField
                    min="0"
                    max="100"
                    value={automationConfig.rules?.min_confidence_score || 75}
                    onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, min_confidence_score: val } })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Migrations Per Run
                  </label>
                  <NumberField
                    min="1"
                    max="20"
                    value={automationConfig.rules?.max_migrations_per_run || 3}
                    onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_migrations_per_run: val } })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Cooldown Minutes
                  </label>
                  <NumberField
                    min="0"
                    max="1440"
                    value={automationConfig.rules?.cooldown_minutes || 30}
                    onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, cooldown_minutes: val } })}
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
                  <NumberField
                    min="1"
                    max="10"
                    value={automationConfig.rules?.max_concurrent_migrations || 1}
                    onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_concurrent_migrations: val } })}
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
                  <NumberField
                    min="0"
                    max="300"
                    value={automationConfig.rules?.grace_period_seconds !== undefined ? automationConfig.rules.grace_period_seconds : 30}
                    onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, grace_period_seconds: val } })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Wait time between migrations for cluster to settle (0 = no wait)
                  </p>
                </div>
              </div>
            </div>

          </div>)}
        </div>
  );
}
