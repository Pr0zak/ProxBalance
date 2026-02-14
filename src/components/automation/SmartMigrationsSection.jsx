import {
  ChevronDown, ChevronUp, X, CheckCircle, Info
} from '../Icons.jsx';
import NumberField from '../NumberField.jsx';
import Toggle, { ToggleRow } from '../Toggle.jsx';

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

export default function SmartMigrationsSection({ automationConfig, saveAutomationConfig, automationStatus, collapsedSections, setCollapsedSections, embedded }) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dismissedSuggestion, setDismissedSuggestion] = useState(false);

  const imConfig = automationConfig.rules?.intelligent_migrations;
  const currentLevel = inferIntelligenceLevel(imConfig);
  const suggestedLevel = automationStatus?.intelligent_tracking?.suggested_level;
  const minDataHours = imConfig?.minimum_data_collection_hours !== undefined ? imConfig.minimum_data_collection_hours : 24;
  const obsPeriods = imConfig?.observation_periods || 3;

  const outerClass = embedded
    ? ''
    : 'bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden';

  return (
    <div className={outerClass}>
      <button
        onClick={() => setCollapsedSections(prev => ({ ...prev, smartMigrations: !prev.smartMigrations }))}
        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      >
        <div>
          {embedded
            ? <h3 className="text-base font-bold text-gray-900 dark:text-white">Smart Migrations</h3>
            : <h2 className="text-xl font-bold text-gray-900 dark:text-white">Smart Migrations</h2>
          }
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Track recommendations over time and only act on persistent imbalances
          </p>
        </div>
        <ChevronDown
          size={embedded ? 20 : 24}
          className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.smartMigrations ? '' : '-rotate-180'}`}
        />
      </button>

      {!collapsedSections.smartMigrations && (
        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <ToggleRow
            label="Enable Smart Migrations"
            description="Prevents acting on transient load spikes"
            checked={imConfig?.enabled !== false}
            onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, enabled: e.target.checked } } })}
          />

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

              <p className="text-xs text-gray-600 dark:text-gray-400">
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
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        Stale Data Retention (hours)
                      </label>
                      <NumberField
                        min="1"
                        max="168"
                        value={imConfig?.stale_retention_hours || 48}
                        onCommit={(val) => saveAutomationConfig({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, stale_retention_hours: val } } })}
                        className="w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                      />
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                        How long to keep stale tracking data before cleanup
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
