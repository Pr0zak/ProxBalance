import { Plus, Minus, ArrowRight } from '../../../Icons.jsx';

export default function ChangeLog({ recommendationData }) {
  const changes = recommendationData?.changes_since_last;
  if (!changes) return null;

  const hasChanges = changes.new_recommendations?.length > 0 ||
    changes.removed_recommendations?.length > 0 ||
    changes.changed_targets?.length > 0;

  if (!hasChanges) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4">
        No changes since last generation.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 mb-2">
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
      <div className="space-y-2 text-xs">
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
    </div>
  );
}
