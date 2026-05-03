import { X, BarChart2, Terminal, Calendar } from '../../Icons.jsx';
import { iconBadge, ICON } from '../../../utils/designTokens.js';

import EngineDiagnostics from './insights/EngineDiagnostics.jsx';
import MigrationOutcomes from './insights/MigrationOutcomes.jsx';
import RecommendationHistory from './insights/RecommendationHistory.jsx';

const { useEffect, useRef } = React;

/**
 * Slim insights drawer. Surfaces three calibration/diagnostic views that
 * help a user decide whether to trust the recommendations engine:
 *  - MigrationOutcomes  : predicted vs actual results from past migrations
 *  - EngineDiagnostics  : timing + filter stats explaining why recs were/weren't generated
 *  - RecommendationHistory : score trends over time
 *
 * The high-value "decision context" pieces (BatchImpact + ExecutionPlan) live
 * inline above the rec list — they belong with the recs, not behind a button.
 */
export default function InsightsDrawer({
  open, onClose,
  recommendationData, recommendations,
  API_BASE, isMobile,
}) {
  const drawerRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  if (!open) return null;

  const drawerWidth = isMobile ? 'w-full' : 'w-[480px]';

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />
      <div
        ref={drawerRef}
        className={`absolute top-0 right-0 h-full ${drawerWidth} bg-gray-800/90 backdrop-blur-xl shadow-2xl shadow-black/20 border-l border-gray-700/50 flex flex-col drawer-enter`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 shrink-0">
          <div className="flex items-center gap-2">
            <div className={iconBadge('gray')}>
              <BarChart2 size={ICON.action} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Insights</h3>
              <p className="text-xs text-gray-400">Engine diagnostics, history, and outcomes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-200 hover:bg-gray-700/60 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <section>
            <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <BarChart2 size={14} className="text-green-400" />
              Migration Outcomes
              <span className="text-xs font-normal text-gray-400">— predicted vs actual</span>
            </h4>
            <MigrationOutcomes API_BASE={API_BASE} active />
          </section>

          <section>
            <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Terminal size={14} className="text-gray-400" />
              Engine Diagnostics
              {recommendationData?.generation_time_ms && (
                <span className="text-xs font-normal text-gray-400">
                  generated in {recommendationData.generation_time_ms}ms
                </span>
              )}
            </h4>
            <EngineDiagnostics recommendationData={recommendationData} recommendations={recommendations} />
          </section>

          <section>
            <h4 className="text-sm font-semibold text-gray-100 mb-3 flex items-center gap-2">
              <Calendar size={14} className="text-purple-400" />
              Recommendation History
              <span className="text-xs font-normal text-gray-400">— score trends</span>
            </h4>
            <RecommendationHistory API_BASE={API_BASE} active />
          </section>
        </div>
      </div>
    </div>
  );
}
