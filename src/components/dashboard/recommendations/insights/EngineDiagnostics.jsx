import { Terminal } from '../../../Icons.jsx';

export default function EngineDiagnostics({ recommendationData, recommendations }) {
  if (!recommendationData?.generated_at) return null;

  return (
    <div className="space-y-3">
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
        <div className="p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs">
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
      {recommendationData.summary?.skip_reasons && Object.keys(recommendationData.summary.skip_reasons).length > 0 && (
        <div className="p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs">
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
  );
}
