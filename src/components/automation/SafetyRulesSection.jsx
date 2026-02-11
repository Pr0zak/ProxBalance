import {
  AlertTriangle, ChevronDown, ChevronUp, X, CheckCircle, Info
} from '../Icons.jsx';
import NumberField from '../NumberField.jsx';

const { useState } = React;

const INTELLIGENCE_LEVELS = [
  { key: 'basic', label: 'Basic',
    description: 'Observation tracking + Cycle detection',
    detail: 'Prevents acting on transient spikes and migration ping-pong' },
  { key: 'standard', label: 'Standard',
    description: 'Basic + Cost-benefit + Outcome learning + Guest tracking',
    detail: 'Learns from past migrations and avoids low-value moves',
    recommended: true },
  { key: 'full', label: 'Full',
    description: 'Standard + Trend analysis + Pattern recognition + Risk gating',
    detail: 'Maximum intelligence with workload pattern recognition' },
];

function inferIntelligenceLevel(imConfig) {
  if (imConfig?.intelligence_level) return imConfig.intelligence_level;
  const hasFull = imConfig?.trend_awareness_enabled ||
                  imConfig?.pattern_suppression_enabled ||
                  imConfig?.risk_gating_enabled;
  const hasStandard = imConfig?.cost_benefit_enabled ||
                      imConfig?.outcome_learning_enabled ||
                      imConfig?.guest_success_tracking_enabled;
  if (hasFull) return 'full';
  if (hasStandard) return 'standard';
  return 'basic';
}

export default function SafetyRulesSection({ automationConfig, saveAutomationConfig, automationStatus, collapsedSections, setCollapsedSections }) {
  const [confirmAllowContainerRestarts, setConfirmAllowContainerRestarts] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);

  const imConfig = automationConfig.rules?.intelligent_migrations;
  const currentLevel = inferIntelligenceLevel(imConfig);
  const suggestedLevel = automationStatus?.intelligent_tracking?.suggested_level;
  const minDataHours = imConfig?.minimum_data_collection_hours !== undefined ? imConfig.minimum_data_collection_hours : 24;
  const obsPeriods = imConfig?.observation_periods || 3;

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

          {/* ── Section 1: Smart Migrations ── */}
          <div className="mb-6 border-l-4 border-blue-500 dark:border-blue-400 bg-blue-50/50 dark:bg-blue-900/10 rounded-r-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  Smart Migrations
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Track recommendations over time and only act on persistent imbalances. Prevents acting on transient load spikes.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
                <input
                  type="checkbox"
                  checked={imConfig?.enabled !== false}
                  onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, enabled: e.target.checked } } })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
              </label>
            </div>

            {imConfig?.enabled !== false && (
              <div className="space-y-4">
                {/* Level Suggestion Banner */}
                {suggestedLevel && suggestedLevel !== currentLevel && !dismissedSuggestion && (
                  <div className="bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-3 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                      <div className="text-sm text-blue-800 dark:text-blue-200">
                        You've collected enough data to enable <strong>{suggestedLevel.charAt(0).toUpperCase() + suggestedLevel.slice(1)}</strong> intelligence.
                        {suggestedLevel === 'standard' && ' This adds cost-benefit analysis and outcome learning.'}
                        {suggestedLevel === 'full' && ' This adds trend analysis, pattern recognition, and risk gating.'}
                        <button
                          onClick={() => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, intelligence_level: suggestedLevel } } })}
                          className="ml-2 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold"
                        >
                          Upgrade
                        </button>
                      </div>
                    </div>
                    <button onClick={() => setDismissedSuggestion(true)} className="text-blue-400 hover:text-blue-600 shrink-0">
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Intelligence Level Selector */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Intelligence Level</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {INTELLIGENCE_LEVELS.map(level => {
                      const isSelected = currentLevel === level.key;
                      return (
                        <button
                          key={level.key}
                          onClick={() => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, intelligence_level: level.key } } })}
                          className={`relative text-left p-3 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                              : 'border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-bold text-gray-900 dark:text-white text-sm">{level.label}</span>
                            <div className="flex items-center gap-1.5">
                              {level.recommended && (
                                <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-semibold rounded">
                                  RECOMMENDED
                                </span>
                              )}
                              {isSelected && <CheckCircle size={16} className="text-blue-500 dark:text-blue-400" />}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-300">{level.description}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{level.detail}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Main tuning controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Required Observation Periods
                    </label>
                    <NumberField
                      min="2"
                      max="10"
                      value={obsPeriods}
                      onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, observation_periods: val } } })}
                      className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      Consecutive times a recommendation must appear before acting
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Minimum Data Collection (hours)
                    </label>
                    <NumberField
                      min="0"
                      max="72"
                      value={minDataHours}
                      onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, minimum_data_collection_hours: val } } })}
                      className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      How long the system must observe before first migration (0 = no minimum)
                    </p>
                  </div>
                </div>

                <p className="text-xs text-blue-600 dark:text-blue-400">
                  The system will collect data for at least {minDataHours} hour{minDataHours !== 1 ? 's' : ''} and require {obsPeriods} consistent recommendation{obsPeriods !== 1 ? 's' : ''} before migrating.
                </p>

                {/* Advanced Tuning Accordion */}
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    Advanced Tuning
                  </button>
                  {showAdvanced && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Observation Window (hours)
                        </label>
                        <NumberField
                          min="1"
                          max="72"
                          value={imConfig?.observation_window_hours || 24}
                          onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, observation_window_hours: val } } })}
                          className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                        />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          Max age for observation tracking
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                          Cycle Detection Window (hours)
                        </label>
                        <NumberField
                          min="1"
                          max="168"
                          value={imConfig?.cycle_window_hours || 48}
                          onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, cycle_window_hours: val } } })}
                          className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                        />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          How far back to check for migration cycles
                        </p>
                      </div>
                      {(currentLevel === 'standard' || currentLevel === 'full') && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Min Cost-Benefit Ratio
                          </label>
                          <NumberField
                            min="0.1"
                            max="10.0"
                            step="0.1"
                            isFloat
                            value={imConfig?.min_cost_benefit_ratio !== undefined ? imConfig.min_cost_benefit_ratio : 1.0}
                            onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, min_cost_benefit_ratio: val } } })}
                            className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                          />
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            Minimum improvement-to-cost ratio required
                          </p>
                        </div>
                      )}
                      {currentLevel === 'full' && (
                        <div>
                          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            Risk Confidence Multiplier
                          </label>
                          <NumberField
                            min="0.1"
                            max="5.0"
                            step="0.1"
                            isFloat
                            value={imConfig?.risk_confidence_multiplier !== undefined ? imConfig.risk_confidence_multiplier : 1.2}
                            onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, risk_confidence_multiplier: val } } })}
                            className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                          />
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                            Higher values require more confidence for risky moves
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* ── Section 2: Migration Rules ── */}
          <div className="mb-6">
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

          {/* ── Section 3: Tag & Affinity Rules ── */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Tag & Affinity Rules</h3>
            <div className="space-y-3">
              {/* Respect 'ignore' Tags */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Respect 'ignore' Tags</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Skip VMs tagged with 'pb-ignore' or 'ignore' during automated migrations.</div>
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">Only migrate VMs with 'auto-migrate-ok' or 'auto_migrate_ok' tag (opt-in mode).</div>
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">Prevents VMs with the same exclude tag from clustering on one node.</div>
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">Enables automated migrations to restart containers that cannot be live-migrated. Containers will experience brief downtime.</div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={automationConfig.rules?.allow_container_restarts === true}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setConfirmAllowContainerRestarts(true);
                        } else {
                          saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: false } });
                        }
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                  </label>
                </div>
                {confirmAllowContainerRestarts && (
                  <div className="px-4 pb-4">
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-orange-900 dark:text-orange-200 text-sm mb-1">ALLOW CONTAINER RESTARTS?</div>
                          <div className="text-xs text-orange-800 dark:text-orange-300 space-y-1 mb-2">
                            <p>This will allow automated migrations to restart containers that cannot be live-migrated.</p>
                            <p className="font-semibold">Containers will experience brief downtime during migration.</p>
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
            </div>
          </div>

          {/* ── Section 4: Safety Checks ── */}
          <div>
            <h3 className="text-base font-bold text-gray-900 dark:text-white mb-3">Safety Checks</h3>
            <div className="space-y-3">
              {/* Check Cluster Health */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Check Cluster Health Before Migrating</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Verifies cluster has quorum and node resources are within limits before migrating.</div>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Node CPU %
                  </label>
                  <NumberField
                    min="50"
                    max="100"
                    value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                    onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: val } })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Max Node Memory %
                  </label>
                  <NumberField
                    min="50"
                    max="100"
                    value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                    onCommit={(val) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: val } })}
                    className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Abort Batch on Failure */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between p-4">
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-white">Abort Batch if a Migration Fails</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Stops remaining migrations in the batch if any single migration fails.</div>
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
                    <div className="text-sm text-gray-600 dark:text-gray-400">Automatically disables automated migrations if any migration fails. Requires manual review before resuming.</div>
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
          </div>

          </>
          )}
        </div>
  </>);
}
