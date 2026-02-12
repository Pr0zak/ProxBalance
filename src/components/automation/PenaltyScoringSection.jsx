import { ChevronDown, Save, RotateCcw, CheckCircle, RefreshCw, Eye } from '../Icons.jsx';
import NumberField from '../NumberField.jsx';
import { API_BASE } from '../../utils/constants.js';
const { useState } = React;

export default function PenaltyScoringSection({
  collapsedSections, setCollapsedSections,
  penaltyConfig, setPenaltyConfig, penaltyDefaults,
  penaltyConfigSaved, savingPenaltyConfig,
  penaltyPresets, activePreset, applyPenaltyPreset,
  cpuThreshold, memThreshold, iowaitThreshold,
  savePenaltyConfig, resetPenaltyConfig
}) {
  // D2: Configuration Simulator state
  const [simulatorResult, setSimulatorResult] = useState(null);
  const [simulatingConfig, setSimulatingConfig] = useState(false);
  const [showSimulator, setShowSimulator] = useState(false);

  const runSimulation = async () => {
    if (!penaltyConfig) return;
    setSimulatingConfig(true);
    setShowSimulator(true);
    try {
      const { simulatePenaltyConfig } = await import('../../api/client.js');
      const result = await simulatePenaltyConfig(penaltyConfig, {
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

  // D1: Slider group mappings
  const SLIDER_GROUPS = [
    {
      label: 'CPU Sensitivity',
      description: 'How aggressively to penalize high CPU usage',
      keys: ['cpu_high_penalty', 'cpu_very_high_penalty', 'cpu_extreme_penalty'],
      min: 0, max: 100,
    },
    {
      label: 'Memory Sensitivity',
      description: 'How aggressively to penalize high memory usage',
      keys: ['mem_high_penalty', 'mem_very_high_penalty', 'mem_extreme_penalty'],
      min: 0, max: 100,
    },
    {
      label: 'IOWait Sensitivity',
      description: 'How aggressively to penalize disk I/O contention',
      keys: ['iowait_moderate_penalty', 'iowait_high_penalty', 'iowait_severe_penalty'],
      min: 0, max: 100,
    },
  ];

  const getGroupAverage = (keys) => {
    if (!penaltyConfig) return 0;
    const values = keys.map(k => penaltyConfig[k] || 0);
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  };

  const setGroupValues = (keys, avg) => {
    if (!penaltyConfig || !penaltyDefaults) return;
    const updated = { ...penaltyConfig };
    const defaultValues = keys.map(k => penaltyDefaults[k] || 1);
    const defaultAvg = defaultValues.reduce((a, b) => a + b, 0) / defaultValues.length;
    const ratio = defaultAvg > 0 ? avg / defaultAvg : 1;
    keys.forEach((k, i) => {
      updated[k] = Math.max(0, Math.round((penaltyDefaults[k] || 0) * ratio));
    });
    setPenaltyConfig(updated);
  };

  return (<>
                    {/* Penalty Scoring Configuration */}
                    <div id="penalty-config-section" className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden">
                      <button
                        onClick={() => setCollapsedSections(prev => ({ ...prev, penaltyScoring: !prev.penaltyScoring }))}
                        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
                      >
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Penalty Scoring Configuration</h2>
                        <ChevronDown
                          size={24}
                          className={`text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.penaltyScoring ? '-rotate-180' : ''}`}
                        />
                      </button>

                      {!collapsedSections.penaltyScoring && penaltyConfig && penaltyDefaults && (
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Configure penalty weights used by the scoring algorithm when evaluating migration targets. Lower penalties favor that condition.
                          </p>

                          {/* D1: Scoring Profile Presets */}
                          {penaltyPresets && applyPenaltyPreset && (
                            <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                              <h4 className="font-medium text-gray-900 dark:text-white mb-1">Scoring Profile</h4>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                                Choose a preset to quickly configure all penalty weights, or customize individual values below.
                              </p>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {['conservative', 'balanced', 'aggressive'].map((preset) => {
                                  const info = penaltyPresets[preset] || { label: preset.charAt(0).toUpperCase() + preset.slice(1) };
                                  const isActive = activePreset === preset;
                                  return (
                                    <button
                                      key={preset}
                                      onClick={() => applyPenaltyPreset(preset)}
                                      disabled={savingPenaltyConfig}
                                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                        isActive
                                          ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-700'
                                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600'
                                      }`}
                                    >
                                      {info.label}
                                      {isActive && <span className="ml-1.5 text-xs opacity-80">(active)</span>}
                                    </button>
                                  );
                                })}
                                {activePreset === 'custom' && (
                                  <span className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border border-purple-300 dark:border-purple-600">
                                    Custom
                                  </span>
                                )}
                              </div>
                              {penaltyPresets[activePreset]?.description && (
                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                  {penaltyPresets[activePreset].description}
                                </p>
                              )}
                              {activePreset === 'custom' && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  You have customized penalty weights. Select a preset above to reset to a standard profile.
                                </p>
                              )}
                            </div>
                          )}

                          {/* D1: Slider-Based Sensitivity Tuning */}
                          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white mb-1">Sensitivity Tuning</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                              Adjust overall sensitivity for each metric category. Moving a slider scales all related penalty weights proportionally.
                            </p>
                            <div className="space-y-4">
                              {SLIDER_GROUPS.map((group) => {
                                const avg = getGroupAverage(group.keys);
                                const defaultAvg = Math.round(group.keys.map(k => penaltyDefaults[k] || 0).reduce((a, b) => a + b, 0) / group.keys.length);
                                return (
                                  <div key={group.label}>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {group.label}
                                      </label>
                                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                        {avg} {avg !== defaultAvg && <span className="text-blue-500">(default: {defaultAvg})</span>}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{group.description}</p>
                                    <div className="flex items-center gap-3">
                                      <span className="text-xs text-gray-400 w-6">Low</span>
                                      <input
                                        type="range"
                                        min={group.min}
                                        max={group.max}
                                        value={avg}
                                        onChange={(e) => setGroupValues(group.keys, parseInt(e.target.value))}
                                        className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                      />
                                      <span className="text-xs text-gray-400 w-8">High</span>
                                    </div>
                                  </div>
                                );
                              })}
                              {/* Minimum Score Improvement slider */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Migration Threshold
                                  </label>
                                  <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                    {penaltyConfig.min_score_improvement || 15} pts
                                    {(penaltyConfig.min_score_improvement || 15) !== (penaltyDefaults.min_score_improvement || 15) && (
                                      <span className="text-blue-500 ml-1">(default: {penaltyDefaults.min_score_improvement || 15})</span>
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Minimum score improvement required to recommend a migration</p>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 w-6">5</span>
                                  <input
                                    type="range"
                                    min={5}
                                    max={50}
                                    value={penaltyConfig.min_score_improvement || 15}
                                    onChange={(e) => setPenaltyConfig({...penaltyConfig, min_score_improvement: parseInt(e.target.value)})}
                                    className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                  />
                                  <span className="text-xs text-gray-400 w-8">50</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* D2: Configuration Simulator */}
                          <div className="p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <h4 className="font-medium text-gray-900 dark:text-white">What-If Simulator</h4>
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

                                {/* Changes */}
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
                                            {change.source_node} → {change.target_node}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Node Score Comparison */}
                                {simulatorResult.node_score_comparison && (
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Node Score Impact</h5>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {Object.entries(simulatorResult.node_score_comparison).map(([node, scores]) => (
                                        <div key={node} className="flex items-center justify-between text-xs p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                                          <span className="font-medium text-gray-700 dark:text-gray-300">{node}</span>
                                          <span className="text-gray-500 dark:text-gray-400">
                                            {scores.current} → {scores.proposed}
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

                          {/* Advanced: Individual Penalty Weights */}
                          <details className="group">
                            <summary className="cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 list-none">
                              <ChevronDown size={16} className="transition-transform group-open:rotate-180" />
                              Advanced: Customize individual penalty weights
                            </summary>
                            <div className="mt-3 space-y-4">

                          {/* Time Period Weights */}
                          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white">Time Period Weights</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Control how much weight to give to recent vs. historical metrics. Values must sum to 1.0.
                              <br/>Example for 6-hour window: Current=0.6, 24h=0.4, 7d=0.0
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Current Weight (default: {penaltyDefaults.weight_current})
                                </label>
                                <NumberField
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  isFloat
                                  value={penaltyConfig.weight_current}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, weight_current: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  24h Weight (default: {penaltyDefaults.weight_24h})
                                </label>
                                <NumberField
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  isFloat
                                  value={penaltyConfig.weight_24h}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, weight_24h: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  7d Weight (default: {penaltyDefaults.weight_7d})
                                </label>
                                <NumberField
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  isFloat
                                  value={penaltyConfig.weight_7d}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, weight_7d: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                            {(() => {
                              const sum = (penaltyConfig.weight_current || 0) + (penaltyConfig.weight_24h || 0) + (penaltyConfig.weight_7d || 0);
                              const isValid = Math.abs(sum - 1.0) < 0.01;
                              return (
                                <div className={`text-sm font-medium ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  Sum: {sum.toFixed(2)} {isValid ? '✓ Valid' : '✗ Must equal 1.0'}
                                </div>
                              );
                            })()}
                          </div>

                          {/* CPU Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">CPU Penalties</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Applied when target node CPU usage is high. Higher values = avoid nodes with high CPU. Set to 0 to disable penalty.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.cpu_high_penalty})
                                </label>
                                <NumberField
                                  min="0"
                                  value={penaltyConfig.cpu_high_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, cpu_high_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Very High (default: {penaltyDefaults.cpu_very_high_penalty})
                                </label>
                                <NumberField
                                  min="0"
                                  value={penaltyConfig.cpu_very_high_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, cpu_very_high_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Extreme (default: {penaltyDefaults.cpu_extreme_penalty})
                                </label>
                                <NumberField
                                  min="0"
                                  value={penaltyConfig.cpu_extreme_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, cpu_extreme_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Memory Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">Memory Penalties</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.mem_high_penalty})
                                </label>
                                <NumberField
                                  value={penaltyConfig.mem_high_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, mem_high_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Very High (default: {penaltyDefaults.mem_very_high_penalty})
                                </label>
                                <NumberField
                                  value={penaltyConfig.mem_very_high_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, mem_very_high_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Extreme (default: {penaltyDefaults.mem_extreme_penalty})
                                </label>
                                <NumberField
                                  value={penaltyConfig.mem_extreme_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, mem_extreme_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* IOWait Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">IOWait Penalties</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Moderate (default: {penaltyDefaults.iowait_moderate_penalty})
                                </label>
                                <NumberField
                                  value={penaltyConfig.iowait_moderate_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, iowait_moderate_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.iowait_high_penalty})
                                </label>
                                <NumberField
                                  value={penaltyConfig.iowait_high_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, iowait_high_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Severe (default: {penaltyDefaults.iowait_severe_penalty})
                                </label>
                                <NumberField
                                  value={penaltyConfig.iowait_severe_penalty}
                                  onCommit={(val) => setPenaltyConfig({...penaltyConfig, iowait_severe_penalty: val})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Minimum Score Improvement */}
                          <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <h4 className="font-medium text-gray-900 dark:text-white">Minimum Score Improvement</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Minimum score improvement (in points) required for a migration to be recommended. This threshold filters out migrations that would provide only marginal benefit.
                              <br />Lower values = more sensitive to small improvements (more migrations)
                              <br />Higher values = only migrate when there's significant benefit (fewer migrations)
                            </p>
                            <div className="max-w-md">
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Minimum Score Improvement (default: {penaltyDefaults.min_score_improvement || 15})
                              </label>
                              <NumberField
                                min="1"
                                max="100"
                                value={penaltyConfig.min_score_improvement !== undefined ? penaltyConfig.min_score_improvement : 15}
                                onCommit={(val) => setPenaltyConfig({...penaltyConfig, min_score_improvement: val})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Recommended values: Conservative (20-30), Balanced (10-15), Aggressive (5-10)
                              </p>
                            </div>
                          </div>

                            </div>{/* end mt-3 space-y-4 */}
                          </details>{/* end Advanced details */}

                          {/* Success Message */}
                          {penaltyConfigSaved && (
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg text-green-800 dark:text-green-300">
                              Penalty configuration saved successfully!
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-4">
                            <button
                              onClick={savePenaltyConfig}
                              disabled={savingPenaltyConfig}
                              className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 ${
                                penaltyConfigSaved
                                  ? 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
                                  : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                              }`}
                            >
                              {savingPenaltyConfig ? 'Saving...' : penaltyConfigSaved ? (<><CheckCircle size={14} /> Saved!</>) : (<><Save size={14} /> Save Penalty Config</>)}
                            </button>
                            <button
                              onClick={resetPenaltyConfig}
                              disabled={savingPenaltyConfig}
                              className="flex-1 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                              <RotateCcw size={14} />
                              Reset to Defaults
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
  </>);
}
