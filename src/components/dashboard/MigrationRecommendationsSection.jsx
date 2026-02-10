import {
  Activity, RefreshCw, CheckCircle, ChevronDown, ChevronUp,
  Download, ClipboardList, Info, Eye
} from '../Icons.jsx';

import { formatLocalTime } from '../../utils/formatters.js';
import useIsMobile from '../../utils/useIsMobile.js';

import RecommendationSummaryBar from './recommendations/RecommendationSummaryBar.jsx';
import AlertsBanner from './recommendations/AlertsBanner.jsx';
import RecommendationFilters from './recommendations/RecommendationFilters.jsx';
import RecommendationCard from './recommendations/RecommendationCard.jsx';
import SkippedGuests from './recommendations/SkippedGuests.jsx';
import InsightsDrawer from './recommendations/InsightsDrawer.jsx';

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
  setCurrentPage, setOpenPenaltyConfigOnAutomation,
  // Thresholds
  thresholdSuggestions, cpuThreshold, setCpuThreshold, memThreshold, setMemThreshold, iowaitThreshold, setIowaitThreshold,
  // Node scores (for predicted view)
  nodeScores,
  // API
  API_BASE
}) {
  // Local state for filters
  const [recFilterConfidence, setRecFilterConfidence] = useState('');
  const [recFilterTargetNode, setRecFilterTargetNode] = useState('');
  const [recFilterSourceNode, setRecFilterSourceNode] = useState('');
  const [recSortBy, setRecSortBy] = useState('');
  const [recSortDir, setRecSortDir] = useState('desc');
  const [showRecFilters, setShowRecFilters] = useState(false);

  // Insights drawer state
  const [showInsights, setShowInsights] = useState(false);

  // Threshold suggestions popover state
  const [showThresholdPopover, setShowThresholdPopover] = useState(false);

  const isMobile = useIsMobile();

  // Check if threshold suggestions have meaningful differences
  const hasThresholdDiff = thresholdSuggestions && thresholdSuggestions.confidence && (
    Math.abs((thresholdSuggestions.suggested_cpu_threshold || 60) - (cpuThreshold || 60)) >= 3 ||
    Math.abs((thresholdSuggestions.suggested_mem_threshold || 70) - (memThreshold || 70)) >= 3
  );

  // Apply client-side filters and sorting
  const getFilteredRecs = () => {
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
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-24 overflow-hidden">
      {/* Section Header */}
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
            {/* Threshold Suggestions Chip */}
            {hasThresholdDiff && (
              <div className="relative">
                <button
                  onClick={() => setShowThresholdPopover(prev => !prev)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                  title="Threshold suggestions available"
                >
                  <Info size={14} />
                  Suggestions
                  <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                    thresholdSuggestions.confidence === 'high'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                  }`}>
                    {thresholdSuggestions.confidence}
                  </span>
                </button>
                {showThresholdPopover && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowThresholdPopover(false)} />
                    <div className="absolute right-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 min-w-[280px]">
                      <div className="text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1">Threshold Suggestions</div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{thresholdSuggestions.summary}</p>
                      <div className="space-y-1.5 text-xs mb-3">
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>CPU</span>
                          <span><span className="font-mono">{cpuThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_cpu_threshold}%</span></span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-400">
                          <span>Memory</span>
                          <span><span className="font-mono">{memThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_mem_threshold}%</span></span>
                        </div>
                        {thresholdSuggestions.suggested_iowait_threshold && (
                          <div className="flex justify-between text-gray-600 dark:text-gray-400">
                            <span>IOWait</span>
                            <span><span className="font-mono">{iowaitThreshold}%</span> → <span className="font-mono font-semibold text-blue-700 dark:text-blue-300">{thresholdSuggestions.suggested_iowait_threshold}%</span></span>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => {
                          setCpuThreshold(thresholdSuggestions.suggested_cpu_threshold);
                          setMemThreshold(thresholdSuggestions.suggested_mem_threshold);
                          if (thresholdSuggestions.suggested_iowait_threshold) {
                            setIowaitThreshold(thresholdSuggestions.suggested_iowait_threshold);
                          }
                          setShowThresholdPopover(false);
                        }}
                        className="w-full px-3 py-1.5 bg-blue-600 dark:bg-blue-500 text-white text-xs font-medium rounded hover:bg-blue-700 dark:hover:bg-blue-600 transition-colors"
                      >
                        Apply All
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Insights Drawer Button */}
            {!collapsedSections.recommendations && recommendationData?.generated_at && (
              <button
                onClick={() => setShowInsights(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-600 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                title="View detailed analytics and insights"
              >
                <Eye size={16} />
                Insights
              </button>
            )}

            {/* Export Dropdown */}
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
      </div>

      {!collapsedSections.recommendations && (
        <div className="transition-all duration-300 ease-in-out">

          {/* Summary Digest */}
          {!loadingRecommendations && (
            <RecommendationSummaryBar recommendationData={recommendationData} />
          )}

          {/* Alerts: Advisories + Conflicts + Forecasts */}
          {!loadingRecommendations && (
            <AlertsBanner
              recommendationData={recommendationData}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
            />
          )}

          {/* Filter & Sort Controls */}
          {!loadingRecommendations && (
            <RecommendationFilters
              recommendations={recommendations}
              showRecFilters={showRecFilters}
              setShowRecFilters={setShowRecFilters}
              recFilterConfidence={recFilterConfidence}
              setRecFilterConfidence={setRecFilterConfidence}
              recFilterSourceNode={recFilterSourceNode}
              setRecFilterSourceNode={setRecFilterSourceNode}
              recFilterTargetNode={recFilterTargetNode}
              setRecFilterTargetNode={setRecFilterTargetNode}
              recSortBy={recSortBy}
              setRecSortBy={setRecSortBy}
              recSortDir={recSortDir}
              setRecSortDir={setRecSortDir}
            />
          )}

          {/* Main Content: Loading / Empty / Recommendation Cards */}
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
              {getFilteredRecs().map((rec, idx) => (
                <RecommendationCard
                  key={idx}
                  rec={rec}
                  idx={idx}
                  penaltyConfig={penaltyConfig}
                  recommendationData={recommendationData}
                  migrationStatus={migrationStatus}
                  setMigrationStatus={setMigrationStatus}
                  completedMigrations={completedMigrations}
                  guestsMigrating={guestsMigrating}
                  migrationProgress={migrationProgress}
                  cancelMigration={cancelMigration}
                  setConfirmMigration={setConfirmMigration}
                  canMigrate={canMigrate}
                  feedbackGiven={feedbackGiven}
                  onFeedback={onFeedback}
                  collapsedSections={collapsedSections}
                  setCollapsedSections={setCollapsedSections}
                />
              ))}
            </div>
          )}

          {/* Skipped Guests */}
          {!loadingRecommendations && (
            <SkippedGuests
              recommendationData={recommendationData}
              penaltyConfig={penaltyConfig}
              collapsedSections={collapsedSections}
              setCollapsedSections={setCollapsedSections}
            />
          )}
        </div>
      )}

      {/* Insights Drawer */}
      <InsightsDrawer
        open={showInsights}
        onClose={() => setShowInsights(false)}
        recommendationData={recommendationData}
        recommendations={recommendations}
        penaltyConfig={penaltyConfig}
        setCurrentPage={setCurrentPage}
        setOpenPenaltyConfigOnAutomation={setOpenPenaltyConfigOnAutomation}
        API_BASE={API_BASE}
        isMobile={isMobile}
      />
    </div>
  );
}
