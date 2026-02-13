import { ChevronDown, Save, RotateCcw, CheckCircle, RefreshCw, Eye, Shield, AlertTriangle, Info } from '../Icons.jsx';
import NumberField from '../NumberField.jsx';
import { API_BASE } from '../../utils/constants.js';
const { useState, useEffect, useCallback } = React;

const SENSITIVITY_LABELS = { 1: 'Conservative', 2: 'Balanced', 3: 'Aggressive' };
const SENSITIVITY_DESCRIPTIONS = {
  1: 'High bar for migrations. Only recommends moves with clear, sustained problems. Best for production clusters where stability is paramount.',
  2: 'Moderate sensitivity. Recommends migrations when trends show growing problems. Suitable for most clusters.',
  3: 'Low bar for migrations. Recommends moves proactively for even modest improvements. Best for clusters that benefit from frequent rebalancing.',
};
const LOOKBACK_OPTIONS = [
  { value: 1, label: '1 day' },
  { value: 3, label: '3 days' },
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
];

export default function PenaltyScoringSection({
  collapsedSections, setCollapsedSections,
  // Legacy penalty config props (used in expert mode)
  penaltyConfig, setPenaltyConfig, penaltyDefaults,
  penaltyConfigSaved, savingPenaltyConfig,
  penaltyPresets, activePreset, applyPenaltyPreset,
  cpuThreshold, memThreshold, iowaitThreshold,
  savePenaltyConfig, resetPenaltyConfig,
  // Simplified migration settings props
  migrationSettings, setMigrationSettings,
  migrationSettingsDefaults, migrationSettingsDescriptions,
  effectivePenaltyConfig, hasExpertOverrides,
  savingMigrationSettings, migrationSettingsSaved,
  saveMigrationSettingsAction, resetMigrationSettingsAction,
  fetchMigrationSettingsAction,
}) {
  const [showExpertMode, setShowExpertMode] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);
  const [simulatorResult, setSimulatorResult] = useState(null);
  const [simulatingConfig, setSimulatingConfig] = useState(false);

  // Load migration settings on mount if not already loaded
  useEffect(() => {
    if (!migrationSettings && fetchMigrationSettingsAction) {
      fetchMigrationSettingsAction();
    }
  }, []);

  const settings = migrationSettings || {
    sensitivity: 2,
    trend_weight: 60,
    lookback_days: 7,
    min_confidence: 75,
    protect_workloads: true,
    min_score_improvement: null,
  };

  const SENSITIVITY_MSI = { 1: 25, 2: 15, 3: 8 };
  const effectiveMsi = settings.min_score_improvement != null
    ? settings.min_score_improvement
    : (SENSITIVITY_MSI[settings.sensitivity] || 15);

  const updateSetting = (key, value) => {
    if (setMigrationSettings) {
      setMigrationSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const runSimulation = async () => {
    const configToSim = showExpertMode ? penaltyConfig : effectivePenaltyConfig;
    if (!configToSim) return;
    setSimulatingConfig(true);
    setShowSimulator(true);
    try {
      const { simulatePenaltyConfig } = await import('../../api/client.js');
      const result = await simulatePenaltyConfig(configToSim, {
        cpu_threshold: cpuThreshold || 60,
        mem_threshold: memThreshold || 70,
        iowait_threshold: iowaitThreshold || 30,
      });
      if (result && result.success) {
        setSimulatorResult(result);
      } else {
        setSimulatorResult({ error: result?.error || 'Simulation failed' });
      }
    } catch (err) {
      setSimulatorResult({ error: err.message });
    } finally {
      setSimulatingConfig(false);
    }
  };

  const isSaving = savingMigrationSettings || savingPenaltyConfig;
  const isSaved = migrationSettingsSaved || penaltyConfigSaved;

  return (<>
    <div id="penalty-config-section" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
      <button
        onClick={() => setCollapsedSections(prev => ({ ...prev, penaltyScoring: !prev.penaltyScoring }))}
        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      >
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Migration Settings</h2>
        <ChevronDown
          size={24}
          className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.penaltyScoring ? '-rotate-180' : ''}`}
        />
      </button>

      {!collapsedSections.penaltyScoring && (
        <div className="space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure how ProxBalance analyzes performance trends and decides when to recommend migrations.
          </p>

          {/* ─── Main Settings (always visible) ─── */}

          {/* Migration Sensitivity */}
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Migration Sensitivity</h4>
              <span className="relative group inline-block">
                <Info size={14} className="text-gray-400 hover:text-blue-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  Controls how aggressively ProxBalance recommends migrations
                </div>
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {SENSITIVITY_DESCRIPTIONS[settings.sensitivity]}
            </p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3].map((level) => {
                const isActive = settings.sensitivity === level;
                const colors = {
                  1: isActive ? 'bg-green-600 text-white ring-2 ring-green-300 dark:ring-green-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-300 dark:border-gray-600',
                  2: isActive ? 'bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-300 dark:border-gray-600',
                  3: isActive ? 'bg-orange-600 text-white ring-2 ring-orange-300 dark:ring-orange-700' : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-300 dark:border-gray-600',
                };
                return (
                  <button
                    key={level}
                    onClick={() => updateSetting('sensitivity', level)}
                    disabled={isSaving}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${colors[level]}`}
                  >
                    {SENSITIVITY_LABELS[level]}
                    {isActive && <span className="ml-1.5 text-xs opacity-80">(active)</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Trend Weight */}
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Trend Weight</h4>
              <span className="relative group inline-block">
                <Info size={14} className="text-gray-400 hover:text-blue-500 cursor-help" />
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{minWidth: '240px'}}>
                  Controls how much historical trends matter vs. current snapshot. Higher values give more weight to sustained patterns over time.
                </div>
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              {settings.trend_weight <= 20 ? 'Mostly snapshot-based: decisions rely primarily on current metrics.' :
               settings.trend_weight <= 45 ? 'Snapshot-leaning: current metrics are weighted more, but trends factor in.' :
               settings.trend_weight <= 65 ? 'Balanced: decisions use a mix of current metrics and historical trends.' :
               settings.trend_weight <= 85 ? 'Trend-leaning: historical patterns are weighted more heavily than current snapshot.' :
               'Mostly trend-based: decisions rely primarily on sustained historical patterns.'}
            </p>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 whitespace-nowrap w-16">Snapshot</span>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={settings.trend_weight}
                onChange={(e) => updateSetting('trend_weight', parseInt(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <span className="text-xs text-gray-400 whitespace-nowrap w-12 text-right">Trends</span>
              <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-10 text-right">{settings.trend_weight}%</span>
            </div>
          </div>

          {/* Analysis Lookback */}
          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-medium text-gray-900 dark:text-white">Analysis Lookback</h4>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
              How many days of performance history to analyze when detecting trends. Longer periods provide more stable analysis but are slower to react to changes.
            </p>
            <div className="flex flex-wrap gap-2">
              {LOOKBACK_OPTIONS.map(({ value, label }) => {
                const isActive = settings.lookback_days === value;
                return (
                  <button
                    key={value}
                    onClick={() => updateSetting('lookback_days', value)}
                    disabled={isSaving}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-700'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ─── Advanced Settings (expandable) ─── */}
          <details className="group">
            <summary className="cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 list-none">
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
              Advanced Settings
            </summary>
            <div className="mt-3 space-y-4">

              {/* Minimum Confidence */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Minimum Confidence</h4>
                  <span className="relative group inline-block">
                    <Info size={14} className="text-gray-400 hover:text-blue-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{minWidth: '220px'}}>
                      Minimum confidence score required before recommending a migration. Higher values mean more data is needed before acting.
                    </div>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-8">50%</span>
                  <input
                    type="range"
                    min={50}
                    max={95}
                    step={5}
                    value={settings.min_confidence}
                    onChange={(e) => updateSetting('min_confidence', parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs text-gray-400 w-8">95%</span>
                  <span className="text-xs font-mono text-gray-600 dark:text-gray-300 w-10 text-right">{settings.min_confidence}%</span>
                </div>
              </div>

              {/* Min Score Improvement */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">Min Score Improvement</h4>
                  <span className="relative group inline-block">
                    <Info size={14} className="text-gray-400 hover:text-blue-500 cursor-help" />
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50" style={{minWidth: '240px'}}>
                      Minimum penalty score improvement (in points) required for a migration to be recommended. Lower values recommend more migrations.
                    </div>
                  </span>
                  {settings.min_score_improvement != null && (
                    <button
                      onClick={() => updateSetting('min_score_improvement', null)}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
                    >
                      Reset to preset ({SENSITIVITY_MSI[settings.sensitivity] || 15})
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <NumberField
                    min="1"
                    max="100"
                    value={effectiveMsi}
                    onCommit={(val) => updateSetting('min_score_improvement', val)}
                    className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    points
                    {settings.min_score_improvement == null && (
                      <span className="ml-1">(from {SENSITIVITY_LABELS[settings.sensitivity]} preset)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Protect Running Workloads */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Shield size={16} className="text-blue-500" />
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">Protect Running Workloads</h4>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Avoid migrating guests during their detected peak usage hours to minimize disruption.
                    </p>
                  </div>
                  <button
                    onClick={() => updateSetting('protect_workloads', !settings.protect_workloads)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${
                      settings.protect_workloads ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.protect_workloads ? 'translate-x-6' : 'translate-x-1'
                    }`} />
                  </button>
                </div>
              </div>

              {/* What-If Simulator */}
              <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">What-If Simulator</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Preview how your current settings would affect recommendations before saving.</p>
                  </div>
                  <button
                    onClick={runSimulation}
                    disabled={simulatingConfig}
                    className="px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                  >
                    {simulatingConfig ? (
                      <><RefreshCw size={14} className="animate-spin" /> Simulating...</>
                    ) : (
                      <><Eye size={14} /> Simulate</>
                    )}
                  </button>
                </div>

                {showSimulator && simulatorResult && !simulatorResult.error && (
                  <div className="mt-3 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Current Settings</div>
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">{simulatorResult.current_count}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">recommendations</div>
                      </div>
                      <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Proposed Settings</div>
                        <div className={`text-2xl font-bold ${
                          simulatorResult.proposed_count > simulatorResult.current_count
                            ? 'text-orange-600 dark:text-orange-400'
                            : simulatorResult.proposed_count < simulatorResult.current_count
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-900 dark:text-white'
                        }`}>{simulatorResult.proposed_count}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">recommendations</div>
                      </div>
                    </div>

                    {simulatorResult.changes && simulatorResult.changes.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Changes</h5>
                        <div className="space-y-1 max-h-40 overflow-y-auto">
                          {simulatorResult.changes.map((change, i) => (
                            <div key={i} className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <span className={`px-1.5 py-0.5 rounded-lg font-medium ${
                                change.action === 'added'
                                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                  : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                              }`}>
                                {change.action === 'added' ? '+New' : '-Removed'}
                              </span>
                              <span className="text-gray-700 dark:text-gray-300">
                                {change.type} {change.vmid} ({change.name})
                              </span>
                              <span className="text-gray-500 dark:text-gray-400 ml-auto">
                                {change.source_node} &rarr; {change.target_node}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {simulatorResult.node_score_comparison && (
                      <div>
                        <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Node Score Impact</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {Object.entries(simulatorResult.node_score_comparison).map(([node, scores]) => (
                            <div key={node} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                              <span className="font-medium text-gray-700 dark:text-gray-300">{node}</span>
                              <span className="text-gray-500 dark:text-gray-400">
                                {scores.current} &rarr; {scores.proposed}
                                <span className={`ml-1 font-medium ${
                                  scores.delta < 0 ? 'text-green-600 dark:text-green-400' :
                                  scores.delta > 0 ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-500'
                                }`}>
                                  ({scores.delta > 0 ? '+' : ''}{scores.delta})
                                </span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {simulatorResult.changes?.length === 0 && simulatorResult.current_count === simulatorResult.proposed_count && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        No changes — proposed settings produce the same recommendations.
                      </p>
                    )}
                  </div>
                )}

                {showSimulator && simulatorResult?.error && (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
                    Simulation error: {simulatorResult.error}
                  </div>
                )}
              </div>
            </div>
          </details>

          {/* ─── Expert Mode (collapsed by default) ─── */}
          <details className="group" open={showExpertMode} onToggle={(e) => setShowExpertMode(e.target.open)}>
            <summary className="cursor-pointer text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 flex items-center gap-1 list-none">
              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
              Expert Mode: Raw Penalty Weights
            </summary>
            <div className="mt-3 space-y-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    These values are automatically managed by the simplified settings above. Manual changes here will override automatic mapping and your settings will be saved as expert overrides.
                  </p>
                </div>
              </div>

              {/* Time Period Weights */}
              {penaltyConfig && penaltyDefaults && (
                <>
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Time Period Weights</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Control how much weight to give to recent vs. historical metrics. Values must sum to 1.0.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                          Current Weight (default: {penaltyDefaults.weight_current})
                        </label>
                        <NumberField
                          step="0.1" min="0" max="1" isFloat
                          value={penaltyConfig.weight_current}
                          onCommit={(val) => setPenaltyConfig({...penaltyConfig, weight_current: val})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                          24h Weight (default: {penaltyDefaults.weight_24h})
                        </label>
                        <NumberField
                          step="0.1" min="0" max="1" isFloat
                          value={penaltyConfig.weight_24h}
                          onCommit={(val) => setPenaltyConfig({...penaltyConfig, weight_24h: val})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                          7d Weight (default: {penaltyDefaults.weight_7d})
                        </label>
                        <NumberField
                          step="0.1" min="0" max="1" isFloat
                          value={penaltyConfig.weight_7d}
                          onCommit={(val) => setPenaltyConfig({...penaltyConfig, weight_7d: val})}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                        />
                      </div>
                    </div>
                    {(() => {
                      const sum = (penaltyConfig.weight_current || 0) + (penaltyConfig.weight_24h || 0) + (penaltyConfig.weight_7d || 0);
                      const isValid = Math.abs(sum - 1.0) < 0.01;
                      return (
                        <div className={`text-xs font-medium ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          Sum: {sum.toFixed(2)} {isValid ? '\u2713 Valid' : '\u2717 Must equal 1.0'}
                        </div>
                      );
                    })()}
                  </div>

                  {/* CPU Penalties */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">CPU Penalties</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[['cpu_high_penalty', 'High'], ['cpu_very_high_penalty', 'Very High'], ['cpu_extreme_penalty', 'Extreme']].map(([key, label]) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            {label} (default: {penaltyDefaults[key]})
                          </label>
                          <NumberField
                            min="0"
                            value={penaltyConfig[key]}
                            onCommit={(val) => setPenaltyConfig({...penaltyConfig, [key]: val})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Memory Penalties */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Memory Penalties</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[['mem_high_penalty', 'High'], ['mem_very_high_penalty', 'Very High'], ['mem_extreme_penalty', 'Extreme']].map(([key, label]) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            {label} (default: {penaltyDefaults[key]})
                          </label>
                          <NumberField
                            min="0"
                            value={penaltyConfig[key]}
                            onCommit={(val) => setPenaltyConfig({...penaltyConfig, [key]: val})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* IOWait Penalties */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">IOWait Penalties</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {[['iowait_moderate_penalty', 'Moderate'], ['iowait_high_penalty', 'High'], ['iowait_severe_penalty', 'Severe']].map(([key, label]) => (
                        <div key={key}>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            {label} (default: {penaltyDefaults[key]})
                          </label>
                          <NumberField
                            min="0"
                            value={penaltyConfig[key]}
                            onCommit={(val) => setPenaltyConfig({...penaltyConfig, [key]: val})}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Minimum Score Improvement */}
                  <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">Minimum Score Improvement</h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Minimum score improvement (in points) required for a migration to be recommended.
                    </p>
                    <div className="max-w-md">
                      <NumberField
                        min="1" max="100"
                        value={penaltyConfig.min_score_improvement !== undefined ? penaltyConfig.min_score_improvement : 15}
                        onCommit={(val) => setPenaltyConfig({...penaltyConfig, min_score_improvement: val})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Expert Save / Reset Buttons */}
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={savePenaltyConfig}
                      disabled={savingPenaltyConfig}
                      className="flex-1 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 text-sm"
                    >
                      {savingPenaltyConfig ? 'Saving...' : <><Save size={14} /> Save Expert Overrides</>}
                    </button>
                    <button
                      onClick={resetPenaltyConfig}
                      disabled={savingPenaltyConfig}
                      className="px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
                    >
                      <RotateCcw size={14} /> Reset Expert
                    </button>
                  </div>
                </>
              )}
            </div>
          </details>

          {/* Success Message */}
          {isSaved && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg text-green-800 dark:text-green-300 text-sm">
              Settings saved successfully!
            </div>
          )}

          {/* Main Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={saveMigrationSettingsAction}
              disabled={isSaving}
              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 ${
                migrationSettingsSaved
                  ? 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
                  : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
              }`}
            >
              {isSaving ? 'Saving...' : migrationSettingsSaved ? (<><CheckCircle size={14} /> Saved!</>) : (<><Save size={14} /> Save Settings</>)}
            </button>
            <button
              onClick={resetMigrationSettingsAction}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <RotateCcw size={14} /> Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  </>);
}
