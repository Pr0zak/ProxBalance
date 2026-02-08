import {
  Activity, RefreshCw, CheckCircle, XCircle, ClipboardList, AlertTriangle,
  Info, Clock, X, ChevronDown, ChevronUp, Lock, Download, ArrowRight,
  Plus, List, Terminal, Minus, Folder, RotateCcw, Zap, Calendar,
  Eye, Filter, ThumbsUp, ThumbsDown, BarChart2, Play, Server
} from '../Icons.jsx';

import { formatLocalTime } from '../../utils/formatters.js';

const { useState } = React;

export default function MigrationRecommendationsSection({
  // Data
  data,
  recommendations, loadingRecommendations, generateRecommendations, recommendationData, penaltyConfig,
  // Section collapse
  collapsedSections, setCollapsedSections, toggleSection,
  // Migrations
  canMigrate, migrationStatus, setMigrationStatus, completedMigrations, guestsMigrating, migrationProgress,
  cancelMigration, trackMigration, setConfirmMigration,
  // Feedback
  feedbackGiven, onFeedback,
  // Navigation
  setCurrentPage, setOpenPenaltyConfigOnSettings,
  // Thresholds
  thresholdSuggestions, cpuThreshold, setCpuThreshold, memThreshold, setMemThreshold, iowaitThreshold, setIowaitThreshold,
  // Node scores (for predicted view)
  nodeScores,
  // API
  API_BASE
}) {
  // Local state for this section
  const [recFilterConfidence, setRecFilterConfidence] = useState('');
  const [recFilterTargetNode, setRecFilterTargetNode] = useState('');
  const [recFilterSourceNode, setRecFilterSourceNode] = useState('');
  const [recSortBy, setRecSortBy] = useState('');
  const [recSortDir, setRecSortDir] = useState('desc');
  const [showRecFilters, setShowRecFilters] = useState(false);

  // Migration outcomes state
  const [migrationOutcomes, setMigrationOutcomes] = useState(null);
  const [loadingOutcomes, setLoadingOutcomes] = useState(false);

  // Recommendation history timeline state
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyHours, setHistoryHours] = useState(24);

  // Workload patterns state
  const [workloadPatterns, setWorkloadPatterns] = useState(null);
  const [patternsLoading, setPatternsLoading] = useState(false);

  // Fetch score history when hours change or section is opened
  React.useEffect(() => {
    if (collapsedSections.recHistory) return;
    let cancelled = false;
    setHistoryLoading(true);
    fetch(`${API_BASE}/score-history?hours=${historyHours}`)
      .then(r => r.json())
      .then(res => { if (!cancelled) setHistoryData(res.history || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setHistoryLoading(false); });
    return () => { cancelled = true; };
  }, [historyHours, collapsedSections.recHistory]);

  return (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-24 overflow-hidden">
          <div className="mb-6">
            <div className="flex flex-wrap items-center justify-between gap-y-3 mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2.5 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg shadow-md shrink-0">
                  <Activity size={24} className="text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">Migration Recommendations</h2>
                    <button
                      onClick={() => toggleSection('recommendations')}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200"
                      title={collapsedSections.recommendations ? "Expand section" : "Collapse section"}
                    >
                      {collapsedSections.recommendations ? (
                        <ChevronDown size={20} className="text-gray-600 dark:text-gray-400" />
                      ) : (
                        <ChevronUp size={20} className="text-gray-600 dark:text-gray-400" />
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Suggested optimizations</p>
                    {recommendationData?.ai_enhanced && (
                      <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 border border-purple-300 dark:border-purple-600 rounded text-xs font-semibold text-purple-700 dark:text-purple-300">
                        AI Enhanced
                      </span>
                    )}
                    {recommendationData?.generated_at && (
                      <span className="text-xs text-gray-500 dark:text-gray-500">
                        • Generated: {(() => {
                          const genTime = new Date(recommendationData.generated_at);
                          return formatLocalTime(genTime);
                        })()} (backend auto-generates every 10-60min based on cluster size)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* J3: Export Dropdown */}
                {recommendations.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setCollapsedSections(prev => ({ ...prev, exportDropdown: !prev.exportDropdown }))}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-all duration-200"
                      title="Export recommendations"
                    >
                      <Download size={16} />
                      Export
                      <ChevronDown size={14} />
                    </button>
                    {collapsedSections.exportDropdown && (
                      <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 min-w-[180px]">
                        <a href="/api/recommendations/export?format=csv" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <ClipboardList size={14} /> Recommendations CSV
                        </a>
                        <a href="/api/recommendations/export?format=json" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <ClipboardList size={14} /> Recommendations JSON
                        </a>
                        <hr className="my-1 border-gray-200 dark:border-gray-700" />
                        <a href="/api/automigrate/history/export?format=csv" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <Activity size={14} /> Migration History CSV
                        </a>
                        <a href="/api/automigrate/history/export?format=json" download className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                          <Activity size={14} /> Migration History JSON
                        </a>
                      </div>
                    )}
                  </div>
                )}
                <button
                  onClick={generateRecommendations}
                  disabled={loadingRecommendations || !data}
                  className="flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                  title="Manually generate new recommendations now"
                >
                  {loadingRecommendations ? (
                    <>
                      <RefreshCw size={18} className="animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <RefreshCw size={18} />
                      Generate Now
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Score-Based Recommendation Info */}
            {!collapsedSections.recommendations && (
              <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
                <button
                  onClick={() => setCollapsedSections(prev => ({ ...prev, scoringInfo: !prev.scoringInfo }))}
                  className="w-full p-4 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">Penalty-Based Scoring System</span>
                  </div>
                  <ChevronDown
                    size={20}
                    className={`text-blue-600 dark:text-blue-400 transition-transform ${collapsedSections.scoringInfo ? '' : 'rotate-180'}`}
                  />
                </button>
                {!collapsedSections.scoringInfo && (
                  <div className="px-4 pb-4">
                    <div className="text-sm text-blue-900 dark:text-blue-100">
                      <p className="text-blue-800 dark:text-blue-200 mb-3">
                        ProxBalance uses a penalty-based scoring system to evaluate every guest on every node. Migrations are recommended when moving a guest would improve its suitability rating by <span className="font-bold">{penaltyConfig?.min_score_improvement || 15}+ points</span>.
                      </p>

                      {/* C3: Score Legend */}
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1.5">Suitability Rating Scale</h5>
                        <div className="flex rounded overflow-hidden h-5 mb-1">
                          <div className="bg-red-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">0-30</div>
                          <div className="bg-orange-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">30-50</div>
                          <div className="bg-yellow-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">50-70</div>
                          <div className="bg-green-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold">70-100</div>
                        </div>
                        <div className="flex text-[10px] text-blue-700 dark:text-blue-300">
                          <div className="flex-1 text-center">Poor</div>
                          <div className="flex-1 text-center">Fair</div>
                          <div className="flex-1 text-center">Good</div>
                          <div className="flex-1 text-center">Excellent</div>
                        </div>
                      </div>

                      {/* Your Configuration Summary */}
                      <div className="p-2.5 bg-blue-100 dark:bg-blue-800/30 rounded mb-3">
                        <h5 className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">Your Configuration</h5>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-blue-700 dark:text-blue-300">
                          <span>CPU weight: <span className="font-mono font-semibold">30%</span></span>
                          <span>Memory weight: <span className="font-mono font-semibold">30%</span></span>
                          <span>IOWait weight: <span className="font-mono font-semibold">20%</span></span>
                          <span>Other factors: <span className="font-mono font-semibold">20%</span></span>
                          <span>Current period: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_current * 100).toFixed(0) : '50'}%</span></span>
                          <span>24h average: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_24h * 100).toFixed(0) : '30'}%</span></span>
                          <span>7-day average: <span className="font-mono font-semibold">{penaltyConfig ? (penaltyConfig.weight_7d * 100).toFixed(0) : '20'}%</span></span>
                          <span>Min improvement: <span className="font-mono font-semibold">{penaltyConfig?.min_score_improvement || 15} pts</span></span>
                        </div>
                      </div>

                      <ul className="ml-4 space-y-1 text-blue-700 dark:text-blue-300 text-xs list-disc">
                        <li><span className="font-semibold">Penalties applied for:</span> High CPU/memory/IOWait, rising trends, historical spikes, predicted post-migration overload</li>
                        <li><span className="font-semibold">Smart decisions:</span> Balances immediate needs with long-term stability and capacity planning</li>
                      </ul>
                      <div className="mt-3 text-xs">
                        <button
                          onClick={() => {
                            setCurrentPage('settings');
                            setOpenPenaltyConfigOnSettings(true);
                          }}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
                        >
                          Configure penalty scoring weights in Settings →
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {!collapsedSections.recommendations && (
          <div className="transition-all duration-300 ease-in-out">

          {/* Threshold Suggestions Banner */}
          {thresholdSuggestions && thresholdSuggestions.confidence && (
            (() => {
              const hasDiff = (
                Math.abs((thresholdSuggestions.suggested_cpu_threshold || 60) - (cpuThreshold || 60)) >= 3 ||
                Math.abs((thresholdSuggestions.suggested_mem_threshold || 70) - (memThreshold || 70)) >= 3
              );
              if (!hasDiff) return null;
              return (
                <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Info size={16} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">
                          Threshold Suggestions
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          thresholdSuggestions.confidence === 'high'
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                            : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          {thresholdSuggestions.confidence} confidence
                        </span>
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                        {thresholdSuggestions.summary}
                      </p>
                      <div className="flex flex-wrap gap-3 text-xs">
                        <span className="text-gray-600 dark:text-gray-400">
                          CPU: <span className="font-mono">{cpuThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_cpu_threshold}%</span>
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Memory: <span className="font-mono">{memThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_mem_threshold}%</span>
                        </span>
                        {thresholdSuggestions.suggested_iowait_threshold && (
                          <span className="text-gray-600 dark:text-gray-400">
                            IOWait: <span className="font-mono">{iowaitThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_iowait_threshold}%</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setCpuThreshold(thresholdSuggestions.suggested_cpu_threshold);
                        setMemThreshold(thresholdSuggestions.suggested_mem_threshold);
                        if (thresholdSuggestions.suggested_iowait_threshold) {
                          setIowaitThreshold(thresholdSuggestions.suggested_iowait_threshold);
                        }
                      }}
                      className="shrink-0 px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                    >
                      Apply All
                    </button>
                  </div>
                </div>
              );
            })()
          )}

          {/* I1: Engine Diagnostics Panel */}
          {!loadingRecommendations && recommendationData?.generated_at && (
            <details className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <summary className="cursor-pointer p-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg">
                <Terminal size={16} />
                Engine Diagnostics
                {recommendationData.generation_time_ms && (
                  <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">
                    Generated in {recommendationData.generation_time_ms}ms
                  </span>
                )}
              </summary>
              <div className="px-3 pb-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Generation Time</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.generation_time_ms ? `${recommendationData.generation_time_ms}ms` : 'N/A'}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Recommendations</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.count || recommendations.length}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Guests Evaluated</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {(recommendationData.count || 0) + (recommendationData.skipped_guests?.length || 0)}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Skipped</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.skipped_guests?.length || 0}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">AI Enhanced</div>
                    <div className={`font-semibold ${recommendationData.ai_enhanced ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}>
                      {recommendationData.ai_enhanced ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700">
                    <div className="text-gray-500 dark:text-gray-400 mb-0.5">Conflicts / Advisories</div>
                    <div className="font-mono font-semibold text-gray-900 dark:text-white">
                      {recommendationData.conflicts?.length || 0} / {recommendationData.capacity_advisories?.length || 0}
                    </div>
                  </div>
                </div>
                {recommendationData.parameters && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs">
                    <span className="text-gray-500 dark:text-gray-400">Thresholds: </span>
                    <span className="font-mono text-gray-700 dark:text-gray-300">
                      CPU {recommendationData.parameters.cpu_threshold}% | Mem {recommendationData.parameters.mem_threshold}% | IOWait {recommendationData.parameters.iowait_threshold}%
                    </span>
                    {recommendationData.parameters.maintenance_nodes?.length > 0 && (
                      <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                        | Maintenance: {recommendationData.parameters.maintenance_nodes.join(', ')}
                      </span>
                    )}
                  </div>
                )}
                {/* Skip reason breakdown from summary */}
                {recommendationData.summary?.skip_reasons && Object.keys(recommendationData.summary.skip_reasons).length > 0 && (
                  <div className="mt-2 p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs">
                    <span className="text-gray-500 dark:text-gray-400 block mb-1">Skip Reasons:</span>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(recommendationData.summary.skip_reasons).map(([reason, count]) => (
                        <span key={reason} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono">
                          {reason}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}

          {/* F2: Workload Patterns Panel */}
          {!loadingRecommendations && recommendationData?.generated_at && (
            <details className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"
              onToggle={(e) => {
                if (e.target.open && !workloadPatterns && !patternsLoading) {
                  setPatternsLoading(true);
                  fetch(`${API_BASE}/workload-patterns?hours=168`)
                    .then(r => r.json())
                    .then(res => { if (res.success) setWorkloadPatterns(res.patterns || []); })
                    .catch(() => {})
                    .finally(() => setPatternsLoading(false));
                }
              }}
            >
              <summary className="cursor-pointer p-3 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors rounded-lg">
                <Activity size={16} />
                Workload Patterns
                <span className="text-xs font-normal text-gray-500 dark:text-gray-400 ml-2">Daily/weekly cycle analysis</span>
              </summary>
              <div className="px-3 pb-3">
                {patternsLoading ? (
                  <div className="text-xs text-gray-500 dark:text-gray-400 py-2 flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Analyzing patterns...</div>
                ) : !workloadPatterns || workloadPatterns.length === 0 ? (
                  <div className="text-xs text-gray-400 dark:text-gray-500 py-2">Insufficient history data for pattern analysis. Patterns emerge after several days of data collection.</div>
                ) : (
                  <div className="space-y-3">
                    {workloadPatterns.map((p, idx) => (
                      <div key={idx} className="bg-white dark:bg-gray-900/50 rounded p-2.5 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Server size={12} className="text-blue-500" />
                          <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{p.node}</span>
                          <span className="text-[10px] text-gray-400 dark:text-gray-500">{p.data_points} data points</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                          {p.daily_pattern ? (
                            <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                              <div className="font-medium text-blue-700 dark:text-blue-300 mb-0.5">Daily Cycle <span className="text-blue-500">({p.daily_pattern.pattern_confidence})</span></div>
                              <div className="text-gray-600 dark:text-gray-400">Peak: {p.daily_pattern.peak_avg_cpu}% | Trough: {p.daily_pattern.trough_avg_cpu}%</div>
                              <div className="text-gray-500 dark:text-gray-500">Biz hrs: {p.daily_pattern.business_hours_avg}% | Off hrs: {p.daily_pattern.off_hours_avg}%</div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No daily cycle detected</div>
                          )}
                          {p.weekly_pattern ? (
                            <div className="p-1.5 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                              <div className="font-medium text-purple-700 dark:text-purple-300 mb-0.5">Weekly Cycle <span className="text-purple-500">({p.weekly_pattern.pattern_confidence})</span></div>
                              <div className="text-gray-600 dark:text-gray-400">Weekday: {p.weekly_pattern.weekday_avg}% | Weekend: {p.weekly_pattern.weekend_avg}%</div>
                              <div className="text-gray-500 dark:text-gray-500">Peak days: {p.weekly_pattern.peak_days?.join(', ')}</div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No weekly cycle detected</div>
                          )}
                          {p.burst_detection?.detected ? (
                            <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                              <div className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">Burst Detection</div>
                              <div className="text-gray-600 dark:text-gray-400">{p.burst_detection.recurring_bursts} recurring burst hour(s)</div>
                              <div className="text-gray-500 dark:text-gray-500">Avg burst: {p.burst_detection.avg_burst_cpu}% at hours {p.burst_detection.burst_hours?.join(', ')}</div>
                            </div>
                          ) : (
                            <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No recurring bursts</div>
                          )}
                        </div>
                        {p.recommendation_timing && (
                          <div className="mt-1.5 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
                            <Clock size={10} /> {p.recommendation_timing}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </details>
          )}

          {/* Recommendation Summary Digest */}
          {!loadingRecommendations && recommendationData?.summary && (
            <div className={`mb-4 rounded-lg border p-4 ${
              recommendationData.summary.urgency === 'high'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
                : recommendationData.summary.urgency === 'medium'
                ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                : recommendationData.summary.urgency === 'none'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity size={18} className={
                    recommendationData.summary.urgency === 'high' ? 'text-yellow-600 dark:text-yellow-400' :
                    recommendationData.summary.urgency === 'medium' ? 'text-orange-600 dark:text-orange-400' :
                    recommendationData.summary.urgency === 'none' ? 'text-green-600 dark:text-green-400' :
                    'text-blue-600 dark:text-blue-400'
                  } />
                  <span className="font-semibold text-sm text-gray-900 dark:text-white">
                    Cluster Health: {recommendationData.summary.cluster_health}/100
                  </span>
                </div>
                {recommendationData.summary.urgency !== 'none' && (
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    recommendationData.summary.urgency === 'high'
                      ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
                      : recommendationData.summary.urgency === 'medium'
                      ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
                      : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
                  }`}>
                    {recommendationData.summary.urgency_label}
                  </span>
                )}
              </div>
              {/* Health bar */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    recommendationData.summary.cluster_health >= 70 ? 'bg-green-500' :
                    recommendationData.summary.cluster_health >= 50 ? 'bg-yellow-500' :
                    recommendationData.summary.cluster_health >= 30 ? 'bg-orange-500' :
                    'bg-red-500'
                  }`}
                  style={{ width: `${recommendationData.summary.cluster_health}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
                <span>{recommendationData.summary.total_recommendations} migration{recommendationData.summary.total_recommendations !== 1 ? 's' : ''} recommended</span>
                {recommendationData.summary.reasons_breakdown?.length > 0 && (
                  <span>({recommendationData.summary.reasons_breakdown.join(', ')})</span>
                )}
                {recommendationData.summary.total_improvement > 0 && (
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    +{recommendationData.summary.total_improvement.toFixed(0)} pts total improvement
                  </span>
                )}
                {recommendationData.summary.predicted_health > recommendationData.summary.cluster_health && (
                  <span className="text-green-600 dark:text-green-400">
                    Predicted health after: {recommendationData.summary.predicted_health}/100
                  </span>
                )}
              </div>
            </div>
          )}

          {/* G3: Batch Impact Assessment */}
          {!loadingRecommendations && recommendationData?.summary?.batch_impact && recommendations.length > 0 && (
            <details className="mb-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 group">
              <summary className="p-3 cursor-pointer flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors rounded-lg list-none">
                <div className="flex items-center gap-2">
                  <BarChart2 size={16} className="text-indigo-600 dark:text-indigo-400" />
                  <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">Batch Migration Impact</span>
                  {recommendationData.summary.batch_impact.improvement && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
                      {recommendationData.summary.batch_impact.improvement.variance_reduction_pct > 0
                        ? `${recommendationData.summary.batch_impact.improvement.variance_reduction_pct.toFixed(0)}% variance reduction`
                        : `+${recommendationData.summary.batch_impact.improvement.health_delta.toFixed(0)} health`
                      }
                    </span>
                  )}
                </div>
                <ChevronDown size={16} className="text-gray-500 transition-transform group-open:rotate-180" />
              </summary>
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {Object.entries(recommendationData.summary.batch_impact.before?.node_scores || {}).map(([node, before]) => {
                    const after = recommendationData.summary.batch_impact.after?.node_scores?.[node];
                    if (!after) return null;
                    const cpuDelta = after.cpu - before.cpu;
                    const memDelta = after.mem - before.mem;
                    const guestDelta = after.guest_count - before.guest_count;
                    return (
                      <div key={node} className="p-2 bg-gray-50 dark:bg-gray-700/30 rounded">
                        <div className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{node}</div>
                        <div className="grid grid-cols-3 gap-1">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">CPU</span>
                            <div className="font-mono">
                              {before.cpu.toFixed(0)}%
                              <span className={`ml-1 ${cpuDelta < -0.5 ? 'text-green-600 dark:text-green-400' : cpuDelta > 0.5 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                {cpuDelta !== 0 ? `→${after.cpu.toFixed(0)}%` : ''}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Mem</span>
                            <div className="font-mono">
                              {before.mem.toFixed(0)}%
                              <span className={`ml-1 ${memDelta < -0.5 ? 'text-green-600 dark:text-green-400' : memDelta > 0.5 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                {memDelta !== 0 ? `→${after.mem.toFixed(0)}%` : ''}
                              </span>
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Guests</span>
                            <div className="font-mono">
                              {before.guest_count}
                              {guestDelta !== 0 && (
                                <span className={`ml-1 ${guestDelta < 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
                                  →{after.guest_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {recommendationData.summary.batch_impact.improvement && (
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <span>Health: {recommendationData.summary.cluster_health} → {recommendationData.summary.predicted_health}
                      <span className="text-green-600 dark:text-green-400 font-medium ml-1">
                        (+{recommendationData.summary.batch_impact.improvement.health_delta.toFixed(1)})
                      </span>
                    </span>
                    <span>Variance: {recommendationData.summary.batch_impact.before.score_variance.toFixed(1)} → {recommendationData.summary.batch_impact.after.score_variance.toFixed(1)}</span>
                    {recommendationData.summary.batch_impact.improvement.all_nodes_improved && (
                      <span className="text-green-600 dark:text-green-400 font-medium">All nodes improved or stable</span>
                    )}
                  </div>
                )}
              </div>
            </details>
          )}

          {/* I3: Recommendation Change Log Summary */}
          {!loadingRecommendations && recommendationData?.changes_since_last && (
            (() => {
              const changes = recommendationData.changes_since_last;
              const hasChanges = changes.new_recommendations?.length > 0 ||
                changes.removed_recommendations?.length > 0 ||
                changes.changed_targets?.length > 0;
              if (!hasChanges) return null;
              return (
                <details className="mb-4 rounded-lg border border-indigo-300 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-900/20">
                  <summary className="cursor-pointer p-3 flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors rounded-lg">
                    <RefreshCw size={16} />
                    Changes Since Last Generation
                    <div className="flex gap-1.5 ml-2">
                      {changes.new_recommendations?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300">
                          +{changes.new_recommendations.length} new
                        </span>
                      )}
                      {changes.removed_recommendations?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300">
                          -{changes.removed_recommendations.length} removed
                        </span>
                      )}
                      {changes.changed_targets?.length > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300">
                          {changes.changed_targets.length} changed
                        </span>
                      )}
                      {changes.unchanged > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                          {changes.unchanged} unchanged
                        </span>
                      )}
                    </div>
                  </summary>
                  <div className="px-3 pb-3 space-y-2 text-xs">
                    {changes.new_recommendations?.map((r, i) => (
                      <div key={`new-${i}`} className="flex items-center gap-2 text-green-700 dark:text-green-300">
                        <Plus size={12} />
                        <span className="font-medium">[{r.vmid}] {r.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{r.source_node} → {r.target_node}</span>
                      </div>
                    ))}
                    {changes.removed_recommendations?.map((r, i) => (
                      <div key={`rem-${i}`} className="flex items-center gap-2 text-red-700 dark:text-red-300">
                        <Minus size={12} />
                        <span className="font-medium">[{r.vmid}] {r.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">{r.source_node} → {r.target_node} (no longer needed)</span>
                      </div>
                    ))}
                    {changes.changed_targets?.map((r, i) => (
                      <div key={`chg-${i}`} className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                        <ArrowRight size={12} />
                        <span className="font-medium">[{r.vmid}] {r.name}</span>
                        <span className="text-gray-500 dark:text-gray-400">target changed: {r.old_target} → {r.new_target}</span>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })()
          )}

          {/* F3: Capacity Planning Advisories */}
          {!loadingRecommendations && recommendationData?.capacity_advisories?.length > 0 && (
            <div className="mb-4 space-y-2">
              {recommendationData.capacity_advisories.map((adv, i) => (
                <div key={i} className={`rounded-lg border p-3 text-sm ${
                  adv.severity === 'critical'
                    ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                    : adv.severity === 'warning'
                    ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${
                      adv.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                      adv.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                      'text-blue-600 dark:text-blue-400'
                    }`} />
                    <div className="flex-1">
                      <div className="font-medium text-xs uppercase tracking-wide mb-0.5">
                        {adv.severity === 'critical' ? 'Critical' : adv.severity === 'warning' ? 'Warning' : 'Info'}: {adv.type.replace(/_/g, ' ')}
                      </div>
                      <div>{adv.message}</div>
                      {adv.suggestions?.length > 0 && (
                        <ul className="mt-1 text-xs opacity-80 list-disc list-inside">
                          {adv.suggestions.map((s, j) => <li key={j}>{s}</li>)}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* G1: Migration Conflict Warnings */}
          {!loadingRecommendations && recommendationData?.conflicts?.length > 0 && (
            <div className="mb-4 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-3 text-sm">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400" />
                <span className="font-semibold text-orange-800 dark:text-orange-200">
                  Migration Conflicts Detected ({recommendationData.conflicts.length})
                </span>
              </div>
              <div className="space-y-2 text-xs text-orange-700 dark:text-orange-300">
                {recommendationData.conflicts.map((c, i) => (
                  <div key={i} className="p-2 bg-white dark:bg-gray-800/50 rounded border border-orange-200 dark:border-orange-800">
                    <div className="font-medium mb-1">
                      Target: {c.target_node} — {c.incoming_guests.length} incoming migrations
                    </div>
                    <div className="flex flex-wrap gap-2 mb-1">
                      {c.exceeds_cpu && <span className="text-red-600 dark:text-red-400">Combined CPU: {c.combined_predicted_cpu}% (threshold: {c.cpu_threshold}%)</span>}
                      {c.exceeds_mem && <span className="text-red-600 dark:text-red-400">Combined Memory: {c.combined_predicted_mem}% (threshold: {c.mem_threshold}%)</span>}
                    </div>
                    <div className="italic">{c.resolution}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* F1: Forecast Alerts — Proactive Trend-Based Threshold Warnings */}
          {!loadingRecommendations && recommendationData?.forecasts?.length > 0 && (
            <div className="mb-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, forecastAlerts: !prev.forecastAlerts }))}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.forecastAlerts ? '' : 'rotate-180'}`} />
                <Zap size={14} className="text-amber-500" />
                Trend Forecasts ({recommendationData.forecasts.length})
                <span className="text-xs text-gray-400 dark:text-gray-500">— Projected threshold crossings</span>
              </button>
              {!collapsedSections.forecastAlerts && (
                <div className="space-y-2">
                  {recommendationData.forecasts.map((fc, idx) => (
                    <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                      fc.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                      : fc.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                    }`}>
                      <div className={`shrink-0 p-1.5 rounded-full ${
                        fc.severity === 'critical' ? 'bg-red-100 dark:bg-red-800' : fc.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-800' : 'bg-blue-100 dark:bg-blue-800'
                      }`}>
                        <AlertTriangle size={14} className={
                          fc.severity === 'critical' ? 'text-red-600 dark:text-red-400' : fc.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                        } />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-sm text-gray-900 dark:text-white">{fc.node}</span>
                          <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                            fc.severity === 'critical' ? 'bg-red-600 text-white' : fc.severity === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                          }`}>{fc.severity}</span>
                          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 uppercase">{fc.metric}</span>
                        </div>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{fc.message}</p>
                        <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-500">
                          <span>Current: <strong className="text-gray-700 dark:text-gray-300">{fc.current_value?.toFixed(1)}%</strong></span>
                          <span>Threshold: <strong className="text-gray-700 dark:text-gray-300">{fc.threshold}%</strong></span>
                          <span>Projected: <strong className="text-gray-700 dark:text-gray-300">{fc.projected_value?.toFixed(1)}%</strong></span>
                          {fc.estimated_hours_to_crossing && <span>ETA: <strong className="text-gray-700 dark:text-gray-300">~{fc.estimated_hours_to_crossing < 24 ? `${fc.estimated_hours_to_crossing.toFixed(0)}h` : `${(fc.estimated_hours_to_crossing / 24).toFixed(1)}d`}</strong></span>}
                          <span>Rate: <strong className="text-gray-700 dark:text-gray-300">{fc.trend_rate_per_day > 0 ? '+' : ''}{fc.trend_rate_per_day?.toFixed(1)}%/day</strong></span>
                          <span>Confidence: <strong className="text-gray-700 dark:text-gray-300">{fc.confidence}</strong> (R²={fc.r_squared?.toFixed(2)})</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* J2: Recommendation Filter Controls */}
          {!loadingRecommendations && recommendations.length > 0 && (
            <div className="mb-3">
              <button
                onClick={() => setShowRecFilters(prev => !prev)}
                className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-2"
              >
                <Filter size={12} />
                {showRecFilters ? 'Hide Filters' : 'Filter & Sort'}
                {(recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && (
                  <span className="ml-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded text-[10px] font-medium">Active</span>
                )}
              </button>
              {showRecFilters && (
                <div className="flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-2">
                  <select
                    value={recFilterConfidence}
                    onChange={e => setRecFilterConfidence(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Min Confidence: Any</option>
                    <option value="80">≥ 80%</option>
                    <option value="60">≥ 60%</option>
                    <option value="40">≥ 40%</option>
                    <option value="20">≥ 20%</option>
                  </select>
                  <select
                    value={recFilterSourceNode}
                    onChange={e => setRecFilterSourceNode(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Source: All Nodes</option>
                    {[...new Set(recommendations.map(r => r.source_node))].sort().map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <select
                    value={recFilterTargetNode}
                    onChange={e => setRecFilterTargetNode(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Target: All Nodes</option>
                    {[...new Set(recommendations.map(r => r.target_node))].sort().map(n => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  <select
                    value={recSortBy}
                    onChange={e => setRecSortBy(e.target.value)}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                  >
                    <option value="">Sort: Default</option>
                    <option value="score_improvement">Score Improvement</option>
                    <option value="confidence_score">Confidence</option>
                    <option value="risk_score">Risk Score</option>
                  </select>
                  <button
                    onClick={() => setRecSortDir(d => d === 'desc' ? 'asc' : 'desc')}
                    className="text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"
                    title={`Sort direction: ${recSortDir}`}
                  >
                    {recSortDir === 'desc' ? '↓ Desc' : '↑ Asc'}
                  </button>
                  {(recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && (
                    <button
                      onClick={() => { setRecFilterConfidence(''); setRecFilterTargetNode(''); setRecFilterSourceNode(''); setRecSortBy(''); }}
                      className="text-xs px-2 py-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {loadingRecommendations ? (
            <div className="text-center py-8">
              <RefreshCw size={48} className="mx-auto mb-3 text-blue-500 dark:text-blue-400 animate-spin" />
              <p className="font-medium text-gray-700 dark:text-gray-300">Generating recommendations...</p>
              {recommendationData?.ai_enhanced && (
                <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">AI enhancement in progress</p>
              )}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-2 text-green-500 dark:text-green-400" />
              <p className="font-medium">Cluster is balanced!</p>
              <p className="text-sm">No migrations needed</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                // J2: Apply client-side filters and sorting
                let filtered = [...recommendations];
                if (recFilterConfidence) {
                  const minConf = parseInt(recFilterConfidence);
                  filtered = filtered.filter(r => (r.confidence_score || 0) >= minConf);
                }
                if (recFilterSourceNode) {
                  filtered = filtered.filter(r => r.source_node === recFilterSourceNode);
                }
                if (recFilterTargetNode) {
                  filtered = filtered.filter(r => r.target_node === recFilterTargetNode);
                }
                if (recSortBy) {
                  filtered.sort((a, b) => {
                    const va = a[recSortBy] || 0;
                    const vb = b[recSortBy] || 0;
                    return recSortDir === 'asc' ? va - vb : vb - va;
                  });
                }
                return filtered;
              })().map((rec, idx) => {
                const key = `${rec.vmid}-${rec.target_node}`;
                const status = migrationStatus[key];
                const completed = completedMigrations[rec.vmid];
                const isCompleted = completed !== undefined;
                const isMaintenance = rec.reason && rec.reason.toLowerCase().includes('maintenance');
                // I3: Check if this recommendation is new or changed
                const changeLog = recommendationData?.changes_since_last;
                const isNewRec = changeLog?.new_recommendations?.some(r => String(r.vmid) === String(rec.vmid));
                const changedTarget = changeLog?.changed_targets?.find(r => String(r.vmid) === String(rec.vmid));

                return (
                  <div key={idx} className={`border rounded p-4 transition-all duration-300 ${
                    isCompleted
                      ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75'
                      : isMaintenance
                      ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className={`font-semibold ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                            [{rec.type} {rec.vmid}] {rec.name}
                          </span>
                          {rec.mount_point_info?.has_mount_points && (
                            <span className={`flex items-center gap-1 px-2 py-0.5 ${
                              rec.mount_point_info.has_unshared_bind_mount
                                ? 'bg-orange-500'
                                : 'bg-green-500'
                            } text-white text-[10px] font-bold rounded`}
                            title={`${rec.mount_point_info.mount_count} mount point(s)${rec.mount_point_info.has_shared_mount ? ' (shared - can migrate)' : ' (requires manual migration)'}`}>
                              <Folder size={10} />
                              {rec.mount_point_info.mount_count} MP
                            </span>
                          )}
                          {isMaintenance && !isCompleted && (
                            <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                              MAINTENANCE
                            </span>
                          )}
                          {/* I3: Change status badges */}
                          {isNewRec && !isCompleted && (
                            <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">NEW</span>
                          )}
                          {changedTarget && !isCompleted && (
                            <span className="px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded"
                              title={`Target changed from ${changedTarget.old_target} → ${changedTarget.new_target}`}>
                              TARGET CHANGED
                            </span>
                          )}
                          {isCompleted && <CheckCircle size={18} className="text-green-600 dark:text-green-400" />}
                          {status === 'failed' && <XCircle size={18} className="text-red-600 dark:text-red-400" />}
                        </div>
                        <div className={`text-sm mt-1 flex items-center gap-2 flex-wrap ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}`}>
                          {isCompleted ? (
                            <>
                              <span className="font-medium">MIGRATED:</span> {rec.source_node} → {completed.newNode} ✓
                            </>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-semibold">
                                <span className="text-xs">FROM:</span>
                                <span>{rec.source_node}</span>
                                {rec.score_details?.source?.metrics && (
                                  <span className="text-[10px] font-normal opacity-75 ml-0.5">
                                    ({rec.score_details.source.metrics.current_cpu?.toFixed(0) || '?'}% CPU)
                                  </span>
                                )}
                              </span>
                              <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold">
                                <span className="text-xs">TO:</span>
                                <span>{rec.target_node}</span>
                                {rec.score_details?.target?.metrics && (
                                  <span className="text-[10px] font-normal opacity-75 ml-0.5">
                                    ({rec.score_details.target.metrics.predicted_cpu?.toFixed(0) || '?'}% CPU)
                                  </span>
                                )}
                              </span>
                              {/* Score Improvement Progress Bar */}
                              {rec.score_improvement !== undefined && (() => {
                                const maxImprovement = 80;
                                const pct = Math.min(100, (rec.score_improvement / maxImprovement) * 100);
                                const barColor = rec.score_improvement >= 50 ? 'bg-green-500' :
                                  rec.score_improvement >= 30 ? 'bg-yellow-500' :
                                  rec.score_improvement >= (penaltyConfig?.min_score_improvement || 15) ? 'bg-orange-500' :
                                  'bg-red-500';
                                return (
                                  <span className="inline-flex items-center gap-1.5 min-w-[120px]" title={`Score improvement: +${rec.score_improvement.toFixed(1)} penalty points`}>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">+{rec.score_improvement.toFixed(0)}</span>
                                    <span className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden min-w-[60px]">
                                      <span className={`block h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                                    </span>
                                  </span>
                                );
                              })()}
                            </>
                          )}
                        </div>
                        <div className={`text-xs mt-1 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-600 dark:text-gray-400'}`}>
                          {/* Structured reason with contributing factors */}
                          {rec.structured_reason ? (
                            <div>
                              <span className={`font-medium ${isMaintenance ? 'text-yellow-600 dark:text-yellow-400' : ''}`}>
                                {rec.structured_reason.primary_label}
                              </span>
                              {rec.structured_reason.contributing_factors?.length > 0 && (
                                <span className="ml-1 text-gray-500 dark:text-gray-500">
                                  — {rec.structured_reason.contributing_factors.slice(0, 3).map(f => f.label).join('; ')}
                                </span>
                              )}
                              <span className="ml-2">| <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB</span>
                              {/* Confidence Dot Indicator */}
                              {rec.confidence_score !== undefined && (
                                <span className="ml-2 inline-flex items-center gap-1" title={`Confidence: ${rec.confidence_score}%`}>
                                  <span className="text-gray-500 dark:text-gray-400">|</span>
                                  <span className="inline-flex gap-0.5">
                                    {[20, 40, 60, 80, 100].map((threshold) => (
                                      <span key={threshold} className={`w-1.5 h-1.5 rounded-full ${
                                        rec.confidence_score >= threshold
                                          ? rec.confidence_score >= 70 ? 'bg-green-500' : rec.confidence_score >= 40 ? 'bg-yellow-500' : 'bg-orange-500'
                                          : 'bg-gray-300 dark:bg-gray-600'
                                      }`} />
                                    ))}
                                  </span>
                                  <span className={`font-semibold text-[10px] ${
                                    rec.confidence_score >= 70 ? 'text-green-600 dark:text-green-400' :
                                    rec.confidence_score >= 40 ? 'text-yellow-600 dark:text-yellow-400' :
                                    'text-orange-600 dark:text-orange-400'
                                  }`}>{rec.confidence_score}%</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              <span className="font-medium">Reason:</span> <span className={isMaintenance ? 'font-bold text-yellow-600 dark:text-yellow-400' : ''}>{rec.reason}</span> | <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB
                            </div>
                          )}
                          {rec.ai_confidence_adjustment && rec.ai_confidence_adjustment !== 0 && (
                            <span className="ml-2" title="AI-adjusted confidence modification">
                              | <span className="font-medium">AI Adjustment:</span>{' '}
                              <span className={`font-semibold ${
                                rec.ai_confidence_adjustment > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                              }`}>
                                {rec.ai_confidence_adjustment > 0 ? '+' : ''}{rec.ai_confidence_adjustment}
                              </span>
                            </span>
                          )}
                        </div>

                        {/* Risk Badge + Conflict Warning */}
                        {!isCompleted && (rec.risk_level || rec.has_conflict) && (
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {rec.risk_level && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                rec.risk_level === 'very_high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                rec.risk_level === 'high' ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                rec.risk_level === 'moderate' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              }`} title={rec.risk_factors?.map(f => f.detail).join('\n') || ''}>
                                <AlertTriangle size={10} />
                                Risk: {rec.risk_level === 'very_high' ? 'Very High' : rec.risk_level.charAt(0).toUpperCase() + rec.risk_level.slice(1)}
                                ({rec.risk_score}/100)
                              </span>
                            )}
                            {rec.has_conflict && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300"
                                title={`Multiple migrations targeting ${rec.conflict_target} — combined load may exceed thresholds`}>
                                <XCircle size={10} />
                                Target Conflict
                              </span>
                            )}
                          </div>
                        )}

                        {/* Score Breakdown (expandable) */}
                        {rec.score_details && !isCompleted && (
                          <div className="mt-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const breakdownKey = `breakdown-${idx}`;
                                setCollapsedSections(prev => ({
                                  ...prev,
                                  [breakdownKey]: !prev[breakdownKey]
                                }));
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Info size={12} />
                              {collapsedSections[`breakdown-${idx}`] ? 'Hide score breakdown' : 'Show score breakdown'}
                            </button>
                            {collapsedSections[`breakdown-${idx}`] && (
                              <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 rounded text-xs">
                                <div className="grid grid-cols-2 gap-4">
                                  {/* Source node breakdown */}
                                  <div>
                                    <div className="font-semibold text-red-600 dark:text-red-400 mb-1">Source: {rec.source_node}</div>
                                    <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                                      <div>Score: {rec.score_details.source?.total_score?.toFixed(1) || 'N/A'}</div>
                                      <div className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500">Penalties:</div>
                                      {Object.entries(rec.score_details.source?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                                        <div key={key} className="flex justify-between">
                                          <span>{key.replace(/_/g, ' ')}</span>
                                          <span className="text-red-500 dark:text-red-400 font-mono">+{val}</span>
                                        </div>
                                      ))}
                                      {Object.values(rec.score_details.source?.penalties || {}).every(v => v === 0) && (
                                        <div className="text-green-600 dark:text-green-400">No penalties</div>
                                      )}
                                    </div>
                                  </div>
                                  {/* Target node breakdown */}
                                  <div>
                                    <div className="font-semibold text-green-600 dark:text-green-400 mb-1">Target: {rec.target_node}</div>
                                    <div className="space-y-0.5 text-gray-600 dark:text-gray-400">
                                      <div>Score: {rec.score_details.target?.total_score?.toFixed(1) || 'N/A'}</div>
                                      <div className="text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500">Penalties:</div>
                                      {Object.entries(rec.score_details.target?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                                        <div key={key} className="flex justify-between">
                                          <span>{key.replace(/_/g, ' ')}</span>
                                          <span className="text-red-500 dark:text-red-400 font-mono">+{val}</span>
                                        </div>
                                      ))}
                                      {Object.values(rec.score_details.target?.penalties || {}).every(v => v === 0) && (
                                        <div className="text-green-600 dark:text-green-400">No penalties</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                {/* Predicted metrics */}
                                {rec.score_details.target?.metrics && (
                                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                                    <div className="text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-1">After migration on {rec.target_node}:</div>
                                    <div className="flex gap-4 text-gray-600 dark:text-gray-400">
                                      <span>CPU: {rec.score_details.target.metrics.predicted_cpu}%</span>
                                      <span>Memory: {rec.score_details.target.metrics.predicted_mem}%</span>
                                      <span>Headroom: {rec.score_details.target.metrics.cpu_headroom}% CPU, {rec.score_details.target.metrics.mem_headroom}% mem</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {rec.ai_insight && (
                          <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs">
                            <div className="flex items-start gap-2">
                              <span className="text-purple-600 dark:text-purple-400 font-semibold shrink-0">AI:</span>
                              <span className="text-gray-700 dark:text-gray-300">{rec.ai_insight}</span>
                            </div>
                          </div>
                        )}
                        {rec.bind_mount_warning && (
                          <div className={`mt-2 p-2 ${
                            rec.mount_point_info?.has_unshared_bind_mount
                              ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-300 dark:border-orange-700'
                              : 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-300 dark:border-green-700'
                          } rounded text-xs`}>
                            <div className="flex items-start gap-2">
                              <Folder size={14} className={`shrink-0 ${
                                rec.mount_point_info?.has_unshared_bind_mount
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-green-600 dark:text-green-400'
                              }`} />
                              <span className="text-gray-700 dark:text-gray-300">{rec.bind_mount_warning}</span>
                            </div>
                          </div>
                        )}
                        <div className="mt-1">
                          <div className="flex flex-wrap items-center gap-3">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const commandKey = `command-${idx}`;
                                setCollapsedSections(prev => ({
                                  ...prev,
                                  [commandKey]: !prev[commandKey]
                                }));
                              }}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <Terminal size={12} />
                              {collapsedSections[`command-${idx}`] ? 'Hide command' : 'Show command'}
                            </button>

                            {/* Recommendation Feedback Widget */}
                            {!isCompleted && (
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-gray-400 dark:text-gray-500">Helpful?</span>
                                {feedbackGiven[`${rec.vmid}-${rec.target_node}`] ? (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                    feedbackGiven[`${rec.vmid}-${rec.target_node}`] === 'helpful'
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                      : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                  }`}>
                                    {feedbackGiven[`${rec.vmid}-${rec.target_node}`] === 'helpful' ? 'Thanks!' : 'Noted'}
                                  </span>
                                ) : (
                                  <>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onFeedback(rec, 'helpful'); }}
                                      className="p-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors"
                                      title="This recommendation is helpful"
                                    >
                                      <ThumbsUp size={12} />
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); onFeedback(rec, 'not_helpful'); }}
                                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                      title="This recommendation is not helpful"
                                    >
                                      <ThumbsDown size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {collapsedSections[`command-${idx}`] && (
                            <div
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(rec.command);
                                const btn = e.currentTarget;
                                const originalText = btn.textContent;
                                btn.textContent = 'Copied!';
                                btn.classList.add('bg-green-100', 'dark:bg-green-900');
                                setTimeout(() => {
                                  btn.textContent = originalText;
                                  btn.classList.remove('bg-green-100', 'dark:bg-green-900');
                                }, 1000);
                              }}
                              className={`text-xs font-mono p-2 rounded mt-1 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
                                isCompleted
                                  ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                  : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                              }`}
                              title="Click to copy"
                            >
                              {rec.command}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="sm:ml-4 flex items-center gap-2 shrink-0">
                        {(() => {
                          // If migration is completed, show "Migrated" badge + rollback button
                          if (isCompleted) {
                            return (
                              <div className="flex items-center gap-2">
                                <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                                  <CheckCircle size={16} />
                                  Migrated
                                </div>
                                {canMigrate && (
                                  <button
                                    onClick={async () => {
                                      try {
                                        const { fetchRollbackInfo, executeRollback } = await import('../api/client.js');
                                        const infoRes = await fetchRollbackInfo(rec.vmid);
                                        if (infoRes.error || !infoRes.success) {
                                          setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'unavailable' }));
                                          return;
                                        }
                                        const info = infoRes.rollback_info;
                                        if (!info.available) {
                                          alert(`Rollback unavailable: ${info.detail}`);
                                          return;
                                        }
                                        if (!info.rollback_safe) {
                                          if (!confirm(`Rollback may be risky: ${info.detail}\n\nProceed anyway?`)) return;
                                        }
                                        if (!confirm(`Rollback ${rec.type} ${rec.vmid} (${rec.name}) back to ${info.original_node}?`)) return;
                                        setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'running' }));
                                        const result = await executeRollback(rec.vmid);
                                        if (result.success) {
                                          setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'done' }));
                                        } else {
                                          alert(`Rollback failed: ${result.error || 'Unknown error'}`);
                                          setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'failed' }));
                                        }
                                      } catch (err) {
                                        alert(`Rollback error: ${err.message}`);
                                      }
                                    }}
                                    disabled={migrationStatus[`rollback-${rec.vmid}`] === 'running'}
                                    className="px-3 py-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1 transition-colors"
                                    title="Rollback: migrate back to original node"
                                  >
                                    {migrationStatus[`rollback-${rec.vmid}`] === 'running' ? (
                                      <><RefreshCw size={12} className="animate-spin" /> Rolling back...</>
                                    ) : migrationStatus[`rollback-${rec.vmid}`] === 'done' ? (
                                      <><CheckCircle size={12} /> Rolled back</>
                                    ) : (
                                      <><RotateCcw size={12} /> Rollback</>
                                    )}
                                  </button>
                                )}
                              </div>
                            );
                          }

                          // Check if guest is migrating (from Proxmox API via guestsMigrating state)
                          const isMigrating = guestsMigrating[rec.vmid] === true;
                          const migrationKey = `${rec.vmid}-${rec.target_node}`;

                          if (isMigrating && canMigrate) {
                            const progress = migrationProgress[rec.vmid];
                            let progressText = '';
                            let tooltipText = 'Cancel migration in progress';

                            if (progress) {
                              if (progress.percentage) {
                                progressText = ` ${progress.percentage}%`;
                                if (progress.total_human_readable) {
                                  tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
                                }
                              } else {
                                progressText = ` (${progress.human_readable})`;
                              }
                            }

                            return (
                              <button
                                onClick={() => cancelMigration(rec.vmid, rec.target_node)}
                                className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse"
                                title={tooltipText}
                              >
                                <RefreshCw size={16} className="animate-spin" />
                                Cancel{progressText}
                              </button>
                            );
                          }

                          return (
                            <button
                              onClick={() => setConfirmMigration(rec)}
                              disabled={!canMigrate || status === 'running' || isMigrating}
                              className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                              title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : ''}
                            >
                              {!canMigrate ? (
                                <>
                                  <Lock size={16} />
                                  Read-Only
                                </>
                              ) : isMigrating ? (
                                <>
                                  <RefreshCw size={16} className="animate-spin" />
                                  Migrating...
                                </>
                              ) : status === 'running' ? (
                                <>
                                  <RefreshCw size={16} className="animate-spin" />
                                  Starting...
                                </>
                              ) : (
                                <>
                                  <Play size={16} />
                                  Migrate
                                </>
                              )}
                            </button>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Skipped Guests — "Why Not?" Section */}
          {!loadingRecommendations && recommendationData?.skipped_guests?.length > 0 && (
            <div className="mt-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, skippedGuests: !prev.skippedGuests }))}
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                <ChevronDown
                  size={16}
                  className={`transition-transform ${collapsedSections.skippedGuests ? '' : 'rotate-180'}`}
                />
                <span className="font-medium">Not Recommended ({recommendationData.skipped_guests.length} guests evaluated)</span>
                <span className="text-xs text-gray-400 dark:text-gray-500">— Why weren't these guests recommended?</span>
              </button>
              {!collapsedSections.skippedGuests && (
                <div className="mt-2 space-y-1">
                  {recommendationData.skipped_guests.slice(0, 20).map((skipped, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                      <span className={`shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold ${
                        skipped.reason === 'insufficient_improvement'
                          ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                          : skipped.reason === 'ha_managed'
                          ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                          : skipped.reason === 'no_suitable_target'
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                      }`}>
                        {skipped.reason === 'insufficient_improvement' ? '~' :
                         skipped.reason === 'ha_managed' ? 'H' :
                         skipped.reason === 'no_suitable_target' ? '!' :
                         skipped.reason === 'stopped' ? 'S' :
                         skipped.reason === 'passthrough_disk' ? 'P' :
                         skipped.reason === 'has_ignore_tag' ? 'I' :
                         skipped.reason === 'unshared_bind_mount' ? 'B' : '?'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          [{skipped.type} {skipped.vmid}] {skipped.name}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 ml-1">on {skipped.node}</span>
                        <span className="text-gray-500 dark:text-gray-400 ml-2">— {skipped.detail}</span>
                        {skipped.score_improvement !== undefined && (
                          <span className="ml-1 text-yellow-600 dark:text-yellow-400 font-mono">
                            (+{skipped.score_improvement} pts, need {penaltyConfig?.min_score_improvement || 15})
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {recommendationData.skipped_guests.length > 20 && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">
                      ...and {recommendationData.skipped_guests.length - 20} more
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* G2: Execution Plan — Migration Ordering & Dependencies */}
          {!loadingRecommendations && recommendationData?.execution_plan?.ordered_recommendations?.length > 1 && (
            <div className="mt-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, executionPlan: !prev.executionPlan }))}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.executionPlan ? '' : 'rotate-180'}`} />
                <List size={14} className="text-indigo-500" />
                Execution Plan ({recommendationData.execution_plan.total_steps} steps)
                {recommendationData.execution_plan.can_parallelize && (
                  <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400">Parallel groups available</span>
                )}
              </button>
              {!collapsedSections.executionPlan && (
                <div className="space-y-1.5">
                  {recommendationData.execution_plan.ordered_recommendations.map((step, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
                      <div className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]">
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-700 dark:text-gray-300">
                          [{step.vmid}] {step.name}
                        </span>
                        <span className="text-gray-400 dark:text-gray-500 mx-1">{step.source_node}</span>
                        <ArrowRight size={10} className="inline text-gray-400" />
                        <span className="text-gray-400 dark:text-gray-500 mx-1">{step.target_node}</span>
                      </div>
                      {step.parallel_group !== undefined && (
                        <span className="px-1.5 py-0.5 text-[9px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                          Group {step.parallel_group + 1}
                        </span>
                      )}
                      {step.reason_for_order && (
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 max-w-[200px] truncate" title={step.reason_for_order}>
                          {step.reason_for_order}
                        </span>
                      )}
                    </div>
                  ))}
                  {recommendationData.execution_plan.can_parallelize && recommendationData.execution_plan.parallel_groups?.length > 0 && (
                    <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-2">
                      Steps within the same group can run in parallel. Groups must execute sequentially.
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* E1: Migration Outcome Tracking */}
          {!loadingRecommendations && (
            <div className="mt-4">
              <button
                onClick={async () => {
                  setCollapsedSections(prev => ({ ...prev, migrationOutcomes: !prev.migrationOutcomes }));
                  if (!migrationOutcomes && !loadingOutcomes) {
                    setLoadingOutcomes(true);
                    try {
                      const { fetchMigrationOutcomes, refreshMigrationOutcomes } = await import('../api/client.js');
                      await refreshMigrationOutcomes();
                      const res = await fetchMigrationOutcomes(null, 10);
                      if (res.success) setMigrationOutcomes(res.outcomes || []);
                    } catch (e) { console.error('Error loading outcomes:', e); }
                    setLoadingOutcomes(false);
                  }
                }}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.migrationOutcomes ? '' : 'rotate-180'}`} />
                <BarChart2 size={14} className="text-green-500" />
                Migration Outcomes
                <span className="text-xs text-gray-400 dark:text-gray-500">— Predicted vs. actual results</span>
              </button>
              {!collapsedSections.migrationOutcomes && (
                <div className="space-y-2">
                  {loadingOutcomes ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 py-2 flex items-center gap-2">
                      <RefreshCw size={12} className="animate-spin" /> Loading outcomes...
                    </div>
                  ) : !migrationOutcomes || migrationOutcomes.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 py-2">
                      No migration outcomes tracked yet. Outcomes are recorded automatically when migrations are executed.
                    </div>
                  ) : (
                    migrationOutcomes.map((outcome, idx) => {
                      const pre = outcome.pre_migration || {};
                      const post = outcome.post_migration || {};
                      const isPending = outcome.status === 'pending_post_capture';
                      return (
                        <div key={idx} className={`text-xs p-2.5 rounded border ${isPending ? 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'}`}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-medium text-gray-700 dark:text-gray-300">
                              [{outcome.guest_type} {outcome.vmid}] {outcome.source_node} → {outcome.target_node}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded ${isPending ? 'bg-amber-500 text-white' : outcome.accuracy_pct >= 70 ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'}`}>
                              {isPending ? 'PENDING' : outcome.accuracy_pct != null ? `${outcome.accuracy_pct}% accurate` : 'COMPLETED'}
                            </span>
                          </div>
                          {!isPending && post && (
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Source CPU</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600 dark:text-gray-400">{pre.source_node?.cpu}%</span>
                                  <ArrowRight size={8} className="text-gray-400" />
                                  <span className={`font-medium ${(pre.source_node?.cpu || 0) > (post.source_node?.cpu || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{post.source_node?.cpu}%</span>
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">Source Memory</div>
                                <div className="flex items-center gap-1">
                                  <span className="text-gray-600 dark:text-gray-400">{pre.source_node?.mem}%</span>
                                  <ArrowRight size={8} className="text-gray-400" />
                                  <span className={`font-medium ${(pre.source_node?.mem || 0) > (post.source_node?.mem || 0) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{post.source_node?.mem}%</span>
                                </div>
                              </div>
                            </div>
                          )}
                          {isPending && (
                            <div className="text-[10px] text-amber-600 dark:text-amber-400">Post-migration metrics pending (captured after 5 minute cooldown)</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* C4: Recommendation History — Score Trend Timeline */}
          {!loadingRecommendations && (
            <div className="mt-4">
              <button
                onClick={() => setCollapsedSections(prev => ({ ...prev, recHistory: !prev.recHistory }))}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
              >
                <ChevronDown size={16} className={`transition-transform ${collapsedSections.recHistory ? '' : 'rotate-180'}`} />
                <Calendar size={14} className="text-purple-500" />
                Recommendation History
                <span className="text-xs text-gray-400 dark:text-gray-500">— Score trends over time</span>
              </button>
              {!collapsedSections.recHistory && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  {historyLoading ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 py-2 flex items-center gap-2"><RefreshCw size={12} className="animate-spin" /> Loading history...</div>
                  ) : !historyData || historyData.length === 0 ? (
                    <div className="text-xs text-gray-400 dark:text-gray-500 py-2">No score history data yet. History is recorded automatically every time recommendations are generated.</div>
                  ) : (() => {
                    const entries = historyData.slice(-48);
                    const healthValues = entries.map(e => e.cluster_health || 0);
                    const recCounts = entries.map(e => e.recommendation_count || 0);
                    const maxRec = Math.max(...recCounts, 1);
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Cluster Health</span>
                            <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full inline-block"></span> Rec Count</span>
                          </div>
                          <select value={historyHours} onChange={e => setHistoryHours(Number(e.target.value))} className="text-[10px] px-1.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            <option value={6}>6h</option>
                            <option value={24}>24h</option>
                            <option value={72}>3 days</option>
                            <option value={168}>7 days</option>
                          </select>
                        </div>
                        <div className="flex items-end gap-px h-16">
                          {entries.map((entry, i) => {
                            const healthPct = (healthValues[i] / 100) * 100;
                            const recPct = recCounts[i] > 0 ? Math.max(10, (recCounts[i] / maxRec) * 100) : 0;
                            const ts = new Date(entry.timestamp);
                            const timeLabel = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${timeLabel}\nHealth: ${healthValues[i].toFixed(0)}%\nRecs: ${recCounts[i]}`}>
                                <div className="w-full flex flex-col justify-end h-16">
                                  <div className="w-full bg-green-400 dark:bg-green-500 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity" style={{ height: `${healthPct}%`, minHeight: healthPct > 0 ? '1px' : '0' }}></div>
                                </div>
                                {recPct > 0 && <div className="absolute bottom-0 w-1 bg-orange-500 rounded-t-sm opacity-70" style={{ height: `${recPct * 0.6}%`, minHeight: '2px' }}></div>}
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between mt-1 text-[9px] text-gray-400 dark:text-gray-500">
                          <span>{entries.length > 0 ? new Date(entries[0].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                          <span>{entries.length > 0 ? new Date(entries[entries.length - 1].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
                          {entries.length} snapshots over last {historyHours}h — Latest health: <strong className="text-gray-700 dark:text-gray-300">{healthValues[healthValues.length - 1]?.toFixed(0)}%</strong>, Recs: <strong className="text-gray-700 dark:text-gray-300">{recCounts[recCounts.length - 1]}</strong>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          </div>
          )}
        </div>
  );
}
