import { Activity } from '../../Icons.jsx';

export default function RecommendationSummaryBar({ recommendationData }) {
  if (!recommendationData?.summary) return null;

  const summary = recommendationData.summary;

  return (
    <div className={`mb-4 rounded-lg border p-4 ${
      summary.urgency === 'high'
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700'
        : summary.urgency === 'medium'
        ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
        : summary.urgency === 'none'
        ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Activity size={18} className={
            summary.urgency === 'high' ? 'text-yellow-600 dark:text-yellow-400' :
            summary.urgency === 'medium' ? 'text-orange-600 dark:text-orange-400' :
            summary.urgency === 'none' ? 'text-green-600 dark:text-green-400' :
            'text-blue-600 dark:text-blue-400'
          } />
          <span className="font-semibold text-sm text-gray-900 dark:text-white">
            Cluster Health: {summary.cluster_health}/100
          </span>
        </div>
        {summary.urgency !== 'none' && (
          <span className={`text-xs px-2 py-0.5 rounded font-medium ${
            summary.urgency === 'high'
              ? 'bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200'
              : summary.urgency === 'medium'
              ? 'bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200'
              : 'bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200'
          }`}>
            {summary.urgency_label}
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all ${
            summary.cluster_health >= 70 ? 'bg-green-500' :
            summary.cluster_health >= 50 ? 'bg-yellow-500' :
            summary.cluster_health >= 30 ? 'bg-orange-500' :
            'bg-red-500'
          }`}
          style={{ width: `${summary.cluster_health}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <span>{summary.total_recommendations} migration{summary.total_recommendations !== 1 ? 's' : ''} recommended</span>
        {summary.reasons_breakdown?.length > 0 && (
          <span>({summary.reasons_breakdown.join(', ')})</span>
        )}
        {summary.total_improvement > 0 && (
          <span className="text-green-600 dark:text-green-400 font-medium">
            +{summary.total_improvement.toFixed(0)} pts total improvement
          </span>
        )}
        {summary.predicted_health > summary.cluster_health && (
          <span className="text-green-600 dark:text-green-400">
            Predicted health after: {summary.predicted_health}/100
          </span>
        )}
      </div>
    </div>
  );
}
