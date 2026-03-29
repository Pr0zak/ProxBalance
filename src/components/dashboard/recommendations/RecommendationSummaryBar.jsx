import { Activity, CheckCircle } from '../../Icons.jsx';
import { INNER_CARD } from '../../../utils/designTokens.js';

export default function RecommendationSummaryBar({ recommendationData }) {
  if (!recommendationData?.summary) return null;

  const summary = recommendationData.summary;

  return (
    <div className={`mb-4 rounded-xl p-3 sm:p-4 ${
      summary.urgency === 'high'
        ? 'bg-yellow-900/20 border border-yellow-700/50'
        : summary.urgency === 'medium'
        ? 'bg-orange-900/20 border border-orange-700/50'
        : summary.urgency === 'none'
        ? 'bg-green-900/20 border border-green-700/50'
        : INNER_CARD
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={18} className={
            summary.urgency === 'high' ? 'text-yellow-400' :
            summary.urgency === 'medium' ? 'text-orange-400' :
            summary.urgency === 'none' ? 'text-green-400' :
            'text-blue-400'
          } />
          <span className="font-semibold text-sm text-white">
            Cluster Health: {summary.cluster_health}/100
          </span>
        </div>
        {summary.urgency !== 'none' && (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            summary.urgency === 'high'
              ? 'bg-yellow-800 text-yellow-200'
              : summary.urgency === 'medium'
              ? 'bg-orange-800 text-orange-200'
              : 'bg-blue-800 text-blue-200'
          }`}>
            {summary.urgency_label}
          </span>
        )}
      </div>
      <div className="w-full bg-slate-700 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${
            summary.cluster_health >= 70 ? 'bg-green-500' :
            summary.cluster_health >= 50 ? 'bg-yellow-500' :
            summary.cluster_health >= 30 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${summary.cluster_health}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400">
        <span>{summary.total_recommendations} migration{summary.total_recommendations !== 1 ? 's' : ''} recommended</span>
        {summary.reasons_breakdown?.length > 0 && (
          <span>({summary.reasons_breakdown.join(', ')})</span>
        )}
        {summary.total_improvement > 0 && (
          <span className="text-green-400 font-medium">
            +{summary.total_improvement.toFixed(0)} pts total improvement
          </span>
        )}
        {summary.predicted_health > summary.cluster_health && (
          <span className="text-green-400">
            Predicted health after: {summary.predicted_health}/100
          </span>
        )}
        {summary.convergence_message && (
          <span className="text-green-400 font-medium flex items-center gap-1">
            <CheckCircle size={12} /> Converged
          </span>
        )}
      </div>
    </div>
  );
}
