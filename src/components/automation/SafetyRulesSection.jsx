import {
  AlertTriangle, ChevronDown, X
} from '../Icons.jsx';
import NumberField from '../NumberField.jsx';

const { useState } = React;

export default function SafetyRulesSection({ automationConfig, saveAutomationConfig, collapsedSections, setCollapsedSections }) {
  const [confirmAllowContainerRestarts, setConfirmAllowContainerRestarts] = useState(false);

  return (<>
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

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Node CPU %
              </label>
              <NumberField
                min="50"
                max="100"
                value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: val } })}
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Node Memory %
              </label>
              <NumberField
                min="50"
                max="100"
                value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: val } })}
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
                            className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium flex items-center justify-center gap-1"
                          >
                            <AlertTriangle size={14} />
                            Yes, Allow Restarts
                          </button>
                          <button
                            onClick={() => setConfirmAllowContainerRestarts(false)}
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1"
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
                  <NumberField
                    min="1"
                    max="168"
                    value={automationConfig.rules?.rollback_window_hours || 24}
                    onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, rollback_window_hours: val } })}
                    className="w-32 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    How far back to check for previous migrations (default: 24 hours)
                  </p>
                </div>
              )}
            </div>

            {/* Intelligent Migrations */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center justify-between p-4">
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white">Intelligent Migrations</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Track recommendations across consecutive runs and only execute migrations that persist. Prevents acting on transient load spikes.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={automationConfig.rules?.intelligent_migrations?.enabled === true}
                    onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, enabled: e.target.checked } } })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                </label>
              </div>
              {automationConfig.rules?.intelligent_migrations?.enabled === true && (
                <div className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Required Observation Periods
                      </label>
                      <NumberField
                        min="2"
                        max="10"
                        value={automationConfig.rules?.intelligent_migrations?.required_observations || 3}
                        onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, required_observations: val } } })}
                        className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Observation Window (hours)
                      </label>
                      <NumberField
                        min="1"
                        max="48"
                        value={automationConfig.rules?.intelligent_migrations?.observation_window_hours || 1}
                        onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, observation_window_hours: val } } })}
                        className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Minimum Data Collection Time (hours)
                      </label>
                      <NumberField
                        min="0"
                        max="48"
                        value={automationConfig.rules?.intelligent_migrations?.min_data_collection_hours !== undefined ? automationConfig.rules.intelligent_migrations.min_data_collection_hours : 0}
                        onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, min_data_collection_hours: val } } })}
                        className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Minimum wait time: {((automationConfig.rules?.intelligent_migrations?.required_observations || 3) - 1) * (automationConfig.rules?.intelligent_migrations?.observation_window_hours || 1)} hour(s) of consistent recommendations before execution
                  </p>

                  <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                    <div className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Intelligence Features</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Risk-Adjusted Confidence</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.rules?.intelligent_migrations?.risk_gating_enabled === true}
                            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, risk_gating_enabled: e.target.checked } } })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                      {automationConfig.rules?.intelligent_migrations?.risk_gating_enabled === true && (
                        <div className="pl-4">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Risk Multiplier
                          </label>
                          <NumberField
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            isFloat
                            value={automationConfig.rules?.intelligent_migrations?.risk_multiplier !== undefined ? automationConfig.rules.intelligent_migrations.risk_multiplier : 1.0}
                            onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, risk_multiplier: val } } })}
                            className="w-full sm:w-32 px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Trend-Aware Filtering</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.rules?.intelligent_migrations?.trend_awareness_enabled === true}
                            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, trend_awareness_enabled: e.target.checked } } })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Outcome-Based Learning</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.rules?.intelligent_migrations?.outcome_learning_enabled === true}
                            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, outcome_learning_enabled: e.target.checked } } })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Pattern Suppression</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.rules?.intelligent_migrations?.pattern_suppression_enabled === true}
                            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, pattern_suppression_enabled: e.target.checked } } })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Cost-Benefit Analysis</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.rules?.intelligent_migrations?.cost_benefit_enabled === true}
                            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, cost_benefit_enabled: e.target.checked } } })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                      {automationConfig.rules?.intelligent_migrations?.cost_benefit_enabled === true && (
                        <div className="pl-4">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Minimum Benefit Ratio
                          </label>
                          <NumberField
                            min="0.1"
                            max="10.0"
                            step="0.1"
                            isFloat
                            value={automationConfig.rules?.intelligent_migrations?.min_benefit_ratio !== undefined ? automationConfig.rules.intelligent_migrations.min_benefit_ratio : 1.5}
                            onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, min_benefit_ratio: val } } })}
                            className="w-full sm:w-32 px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Cycle Detection</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.rules?.intelligent_migrations?.cycle_detection_enabled === true}
                            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, cycle_detection_enabled: e.target.checked } } })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                      {automationConfig.rules?.intelligent_migrations?.cycle_detection_enabled === true && (
                        <div className="pl-4">
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Cycle Detection Window (hours)
                          </label>
                          <NumberField
                            min="1"
                            max="168"
                            value={automationConfig.rules?.intelligent_migrations?.cycle_detection_window_hours || 24}
                            onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, cycle_detection_window_hours: val } } })}
                            className="w-full sm:w-32 px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                          />
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">Guest Success Tracking</div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={automationConfig.rules?.intelligent_migrations?.guest_success_tracking_enabled === true}
                            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...automationConfig.rules?.intelligent_migrations, guest_success_tracking_enabled: e.target.checked } } })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
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

  </>);
}
