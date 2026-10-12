import { TrendingUp, TrendingDown, Minus } from '../../Icons.jsx';

/**
 * The engine's own working for one suggestion: per-node scores and penalties,
 * trends, predicted load after the move, guest behaviour and decision factors.
 * Shown inside a suggestion card's details under "Scores and trends".
 */
export default function EngineDetail({ rec }) {
  if (!rec.score_details && !rec.trend_evidence?.available) return null;
  return (
    <div className="space-y-3">
      {/* Source vs Target — Scores, Penalties & Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1">
            Source: {rec.source_node}
            {rec.trend_evidence?.available && (() => {
              const dir = rec.trend_evidence.source_node_trend?.cpu_direction;
              if (dir === 'sustained_increase' || dir === 'rising')
                return <TrendingUp size={12} className="text-red-500" />;
              if (dir === 'sustained_decrease' || dir === 'falling')
                return <TrendingDown size={12} className="text-green-500" />;
              return <Minus size={12} className="text-pb-text2 dark:text-gray-400" />;
            })()}
          </div>
          <div className="space-y-0.5 text-pb-text2 dark:text-gray-400">
            {rec.score_details && (
              <>
                <div>Score: {rec.score_details.source?.total_score?.toFixed(1) || 'N/A'}</div>
                <div className="text-[10px] mt-1 font-medium text-pb-text2 dark:text-gray-500">Penalties:</div>
                {Object.entries(rec.score_details.source?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key.replace(/_/g, ' ')}</span>
                    <span className="text-red-600 dark:text-red-400 font-mono">+{val}</span>
                  </div>
                ))}
                {Object.values(rec.score_details.source?.penalties || {}).every(v => v === 0) && (
                  <div className="text-green-600 dark:text-green-400">No penalties</div>
                )}
              </>
            )}
            {rec.trend_evidence?.available && (
              <div className={rec.score_details ? 'mt-2 pt-2 border-t border-slate-200 dark:border-pb-border-dark' : ''}>
                <div className="text-[10px] font-medium text-pb-text2 dark:text-gray-500 mb-0.5">Trends:</div>
                <div>CPU: {rec.trend_evidence.source_node_trend?.cpu_trend || 'N/A'}</div>
                <div>Memory: {rec.trend_evidence.source_node_trend?.mem_trend || 'N/A'}</div>
                <div>Stability: {rec.trend_evidence.source_node_trend?.stability_score || '?'}/100</div>
                {rec.trend_evidence.source_node_trend?.above_baseline && (
                  <div className="text-orange-600 dark:text-orange-400 font-medium">
                    Above baseline ({rec.trend_evidence.source_node_trend.baseline_deviation_sigma?.toFixed(1) || '?'}σ)
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1">
            Target: {rec.target_node}
            {rec.trend_evidence?.available && (() => {
              const dir = rec.trend_evidence.target_node_trend?.cpu_direction;
              if (dir === 'sustained_increase' || dir === 'rising')
                return <TrendingUp size={12} className="text-orange-500" />;
              if (dir === 'sustained_decrease' || dir === 'falling')
                return <TrendingDown size={12} className="text-green-500" />;
              return <Minus size={12} className="text-pb-text2 dark:text-gray-400" />;
            })()}
          </div>
          <div className="space-y-0.5 text-pb-text2 dark:text-gray-400">
            {rec.score_details && (
              <>
                <div>Score: {rec.score_details.target?.total_score?.toFixed(1) || 'N/A'}</div>
                <div className="text-[10px] mt-1 font-medium text-pb-text2 dark:text-gray-500">Penalties:</div>
                {Object.entries(rec.score_details.target?.penalties || {}).filter(([, v]) => v > 0).map(([key, val]) => (
                  <div key={key} className="flex justify-between">
                    <span>{key.replace(/_/g, ' ')}</span>
                    <span className="text-red-600 dark:text-red-400 font-mono">+{val}</span>
                  </div>
                ))}
                {Object.values(rec.score_details.target?.penalties || {}).every(v => v === 0) && (
                  <div className="text-green-600 dark:text-green-400">No penalties</div>
                )}
              </>
            )}
            {rec.trend_evidence?.available && (
              <div className={rec.score_details ? 'mt-2 pt-2 border-t border-slate-200 dark:border-pb-border-dark' : ''}>
                <div className="text-[10px] font-medium text-pb-text2 dark:text-gray-500 mb-0.5">Trends:</div>
                <div>CPU: {rec.trend_evidence.target_node_trend?.cpu_trend || 'N/A'}</div>
                <div>Memory: {rec.trend_evidence.target_node_trend?.mem_trend || 'N/A'}</div>
                <div>Stability: {rec.trend_evidence.target_node_trend?.stability_score || '?'}/100</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* After Migration Predictions */}
      {rec.score_details?.target?.metrics && (
        <div className="pt-2 border-t border-slate-200 dark:border-pb-border-dark">
          <div className="text-[10px] font-medium text-pb-text2 dark:text-gray-500 mb-1">After migration on {rec.target_node}:</div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-pb-text2 dark:text-gray-400">
            <span>CPU: {rec.score_details.target.metrics.predicted_cpu}%</span>
            <span>Memory: {rec.score_details.target.metrics.predicted_mem}%</span>
            <span>Headroom: {rec.score_details.target.metrics.cpu_headroom}% CPU, {rec.score_details.target.metrics.mem_headroom}% mem</span>
          </div>
        </div>
      )}

      {/* Stability Factors */}
      {rec.score_details && (rec.score_details.target?.trend_analysis || rec.score_details.source?.trend_analysis) && (
        <div className="pt-2 border-t border-slate-200 dark:border-pb-border-dark flex flex-wrap gap-2">
          {rec.score_details.source?.trend_analysis?.cpu_stability_factor != null && rec.score_details.source.trend_analysis.cpu_stability_factor !== 1.0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-pb-text2 dark:text-gray-400"
              title={`Source CPU penalties scaled by ${rec.score_details.source.trend_analysis.cpu_stability_factor}x based on stability score ${rec.score_details.source.trend_analysis.stability_score}`}>
              Source CPU factor: {rec.score_details.source.trend_analysis.cpu_stability_factor}x
            </span>
          )}
          {rec.score_details.target?.trend_analysis?.cpu_stability_factor != null && rec.score_details.target.trend_analysis.cpu_stability_factor !== 1.0 && (
            <span className="text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 rounded text-pb-text2 dark:text-gray-400"
              title={`Target CPU penalties scaled by ${rec.score_details.target.trend_analysis.cpu_stability_factor}x based on stability score ${rec.score_details.target.trend_analysis.stability_score}`}>
              Target CPU factor: {rec.score_details.target.trend_analysis.cpu_stability_factor}x
            </span>
          )}
        </div>
      )}

      {/* Guest Behavior */}
      {rec.trend_evidence?.guest_trend && (
        <div className="pt-2 border-t border-slate-200 dark:border-pb-border-dark">
          <div className="font-medium text-pb-text dark:text-gray-300 mb-1">Guest Behavior</div>
          <div className="flex flex-wrap gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              rec.trend_evidence.guest_trend.behavior === 'growing' ? 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
              rec.trend_evidence.guest_trend.behavior === 'bursty' ? 'bg-yellow-50 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
              rec.trend_evidence.guest_trend.behavior === 'steady' ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
              'bg-white dark:bg-gray-800 text-pb-text2 dark:text-gray-400'
            }`}>{rec.trend_evidence.guest_trend.behavior || 'unknown'}</span>
            <span className="text-pb-text2 dark:text-gray-400">CPU: {rec.trend_evidence.guest_trend.cpu_growth_rate || 'N/A'}</span>
            {rec.trend_evidence.guest_trend.previous_migrations > 0 && (
              <span className="text-pb-text2 dark:text-gray-400">
                | Migrated {rec.trend_evidence.guest_trend.previous_migrations}x before
              </span>
            )}
            {rec.trend_evidence.guest_trend.peak_hours?.length > 0 && (
              <span className="text-pb-text2 dark:text-gray-400">
                | Peak hours: {rec.trend_evidence.guest_trend.peak_hours.map(h => `${h}:00`).join(', ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Decision Factors */}
      {rec.trend_evidence?.decision_factors?.length > 0 && (
        <div className="pt-2 border-t border-slate-200 dark:border-pb-border-dark">
          <div className="font-medium text-pb-text dark:text-gray-300 mb-1">Decision Factors</div>
          <div className="space-y-1">
            {rec.trend_evidence.decision_factors.map((f, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className={`shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${
                  f.type === 'problem' ? 'bg-red-500' :
                  f.type === 'positive' ? 'bg-green-500' :
                  f.type === 'concern' ? 'bg-yellow-500' :
                  'bg-gray-400'
                }`} />
                <span className="text-pb-text2 dark:text-gray-400">
                  {f.factor}
                  {f.weight === 'high' && <span className="ml-1 text-[9px] font-bold text-pb-text2 dark:text-gray-500">(HIGH)</span>}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Data Quality */}
      {rec.trend_evidence?.data_quality && (
        <div className="text-[10px] text-pb-text2 dark:text-gray-500 pt-1">
          Based on {rec.trend_evidence.data_quality.node_history_days || 0} days of node history,{' '}
          {rec.trend_evidence.data_quality.guest_history_days || 0} days of guest history.{' '}
          {rec.trend_evidence.data_quality.confidence_note}
        </div>
      )}
    </div>
  );
}
