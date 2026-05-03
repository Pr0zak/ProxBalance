import {
  Activity, RefreshCw, CheckCircle, ChevronDown,
  Eye
} from '../Icons.jsx';
import { GLASS_CARD, GLASS_CARD_SUBTLE, INNER_CARD, iconBadge, BTN_PRIMARY, BTN_SECONDARY, BTN_ICON, ICON } from '../../utils/designTokens.js';

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
  // Navigation
  setCurrentPage, setOpenPenaltyConfigOnAutomation,
  // Node scores (for predicted view)
  nodeScores,
  // API
  API_BASE,
  // When embedded (e.g. inside a tab), suppress the section title block.
  embedded = false,
}) {
  const expanded = embedded ? true : !collapsedSections.recommendations;
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

  const Wrapper = embedded ? React.Fragment : 'div';
  const wrapperProps = embedded ? {} : { className: GLASS_CARD.replace('mb-6', 'mb-24') + ' overflow-hidden' };

  return (
    <Wrapper {...wrapperProps}>
      {!embedded && (
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-y-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={iconBadge('orange', 'red')}>
                <Activity size={ICON.section} className="text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-2xl font-bold text-white">Migration Recommendations</h2>
                  <button
                    onClick={() => toggleSection('recommendations')}
                    className="p-1 hover:bg-slate-700 rounded transition-all duration-200"
                    title={collapsedSections.recommendations ? "Expand section" : "Collapse section"}
                  >
                    <ChevronDown size={ICON.section} className={`text-gray-400 transition-transform duration-200 ${!collapsedSections.recommendations ? 'rotate-180' : ''}`} />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-gray-400">Suggested optimizations</p>
                  {recommendationData?.ai_enhanced && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-600 rounded text-xs font-semibold text-purple-300">
                      AI Enhanced
                    </span>
                  )}
                  {recommendationData?.generated_at && (
                    <span className="text-xs text-gray-500">
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
              {!collapsedSections.recommendations && recommendationData?.generated_at && (
                <button
                  onClick={() => setShowInsights(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-sm bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 border border-slate-600 transition-all duration-200"
                  title="View detailed analytics and insights"
                >
                  <Eye size={16} />
                  Insights
                </button>
              )}
              <button
                onClick={generateRecommendations}
                disabled={loadingRecommendations || !data}
                className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
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
      )}

      {/* When embedded, render a slim toolbar with just the action buttons */}
      {embedded && (
        <div className="flex items-center justify-end gap-2 mb-3 flex-wrap">
          {recommendationData?.ai_enhanced && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-600 rounded text-xs font-semibold text-purple-300 mr-auto">
              AI Enhanced
            </span>
          )}
          {recommendationData?.generated_at && (
            <span className="text-xs text-gray-500 mr-auto">
              Generated: {formatLocalTime(new Date(recommendationData.generated_at))}
            </span>
          )}
          {recommendationData?.generated_at && (
            <button
              onClick={() => setShowInsights(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 text-gray-300 rounded-lg hover:bg-slate-600 border border-slate-600 transition-all duration-200"
              title="View detailed analytics"
            >
              <Eye size={14} />
              Insights
            </button>
          )}
          <button
            onClick={generateRecommendations}
            disabled={loadingRecommendations || !data}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
            title="Generate now"
          >
            {loadingRecommendations ? (
              <><RefreshCw size={14} className="animate-spin" />Generating...</>
            ) : (
              <><RefreshCw size={14} />Generate Now</>
            )}
          </button>
        </div>
      )}

      {expanded && (
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
              <RefreshCw size={48} className="mx-auto mb-3 text-blue-400 animate-spin" />
              <p className="font-medium text-gray-300">Generating recommendations...</p>
              {recommendationData?.ai_enhanced && (
                <p className="text-sm text-purple-400 mt-1">AI enhancement in progress</p>
              )}
            </div>
          ) : recommendations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <CheckCircle size={48} className="mx-auto mb-2 text-green-400" />
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
    </Wrapper>
  );
}
