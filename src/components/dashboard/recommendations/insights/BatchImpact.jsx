import { BarChart2, ChevronDown } from '../../../Icons.jsx';

export default function BatchImpact({ recommendationData }) {
  const batchImpact = recommendationData?.summary?.batch_impact;
  if (!batchImpact) return null;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300">
        {Object.entries(batchImpact.before?.node_scores || {}).map(([node, before]) => {
          const after = batchImpact.after?.node_scores?.[node];
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
      {batchImpact.improvement && (
        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Health: {recommendationData.summary.cluster_health} → {recommendationData.summary.predicted_health}
            <span className="text-green-600 dark:text-green-400 font-medium ml-1">
              (+{batchImpact.improvement.health_delta.toFixed(1)})
            </span>
          </span>
          <span>Variance: {batchImpact.before.score_variance.toFixed(1)} → {batchImpact.after.score_variance.toFixed(1)}</span>
          {batchImpact.improvement.all_nodes_improved && (
            <span className="text-green-600 dark:text-green-400 font-medium">All nodes improved or stable</span>
          )}
        </div>
      )}
    </div>
  );
}
