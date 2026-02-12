import {
  Activity, RefreshCw, CheckCircle, ChevronDown, ChevronUp,
  Eye, MoveRight, ArrowRight
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

  const isMobile = useIsMobile();

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
        const getValue = (rec) => {
          if (recSortBy === 'cost_benefit_ratio') return rec.cost_benefit?.ratio || 0;
          return rec[recSortBy] || 0;
        };
        const va = getValue(a);
        const vb = getValue(b);
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
            {/* Insights Drawer Button */}
            {!collapsedSections.recommendations && recommendationData?.generated_at && (
              <button
                onClick={() => setShowInsights(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-all duration-200"
                title="View detailed analytics and insights"
              >
                <Eye size={16} />
                Insights
              </button>
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

          {/* Proposed Migration Flows — visual summary of source→target pairs */}
          {!loadingRecommendations && recommendations.length > 0 && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-2">
                <MoveRight size={14} className="text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Proposed Migration Flows</span>
                <span className="text-[10px] text-blue-500 dark:text-blue-400">({recommendations.length} migration{recommendations.length !== 1 ? 's' : ''})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const flows = {};
                  recommendations.forEach(rec => {
                    const flowKey = `${rec.source_node}→${rec.target_node}`;
                    if (!flows[flowKey]) flows[flowKey] = { source: rec.source_node, target: rec.target_node, guests: [], totalImprovement: 0 };
                    flows[flowKey].guests.push({ vmid: rec.vmid, name: rec.name, type: rec.type });
                    flows[flowKey].totalImprovement += rec.score_improvement || 0;
                  });
                  return Object.values(flows).map((flow, idx) => {
                    const confColor = flow.totalImprovement > 40 ? 'bg-green-500' : flow.totalImprovement > 20 ? 'bg-yellow-500' : 'bg-gray-400';
                    return (
                      <div key={idx} className="flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 text-[11px] group relative" title={flow.guests.map(g => `${g.type} ${g.vmid} (${g.name})`).join(', ')}>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{flow.source}</span>
                        <div className="flex items-center gap-0.5">
                          <div className={`w-8 h-0.5 ${confColor} rounded`}></div>
                          <ArrowRight size={10} className="text-gray-500 dark:text-gray-400 -ml-0.5" />
                        </div>
                        <span className="font-semibold text-gray-700 dark:text-gray-300">{flow.target}</span>
                        <span className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-[9px] font-medium">{flow.guests.length}×</span>
                        <div className="hidden group-hover:block absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-2 min-w-[180px]">
                          {flow.guests.map((g, i) => (
                            <div key={i} className="text-[10px] text-gray-600 dark:text-gray-400 py-0.5">[{g.type} {g.vmid}] {g.name}</div>
                          ))}
                          <div className="text-[10px] text-green-600 dark:text-green-400 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">Total improvement: +{flow.totalImprovement.toFixed(0)} pts</div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
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
