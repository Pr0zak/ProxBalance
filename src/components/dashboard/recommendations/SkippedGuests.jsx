import { ChevronDown } from '../../Icons.jsx';

export default function SkippedGuests({
  recommendationData, penaltyConfig, collapsedSections, setCollapsedSections
}) {
  if (!recommendationData?.skipped_guests?.length) return null;

  return (
    <div className="mt-4">
      <button
        onClick={() => setCollapsedSections(prev => ({ ...prev, skippedGuests: !prev.skippedGuests }))}
        className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      >
        <ChevronDown
          size={16}
          className={`transition-transform ${collapsedSections.skippedGuests ? '' : 'rotate-180'}`}
        />
        <span className="font-medium">Not Recommended ({recommendationData.skipped_guests.length} guests evaluated)</span>
        <span className="text-xs text-gray-400 dark:text-gray-500">— Why weren't these guests recommended?</span>
      </button>
      {!collapsedSections.skippedGuests && (
        <div className="mt-2 space-y-1">
          {recommendationData.skipped_guests.slice(0, 20).map((skipped, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700">
              <span className={`shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold ${
                skipped.reason === 'insufficient_improvement'
                  ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400'
                  : skipped.reason === 'ha_managed'
                  ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400'
                  : skipped.reason === 'no_suitable_target'
                  ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}>
                {skipped.reason === 'insufficient_improvement' ? '~' :
                 skipped.reason === 'ha_managed' ? 'H' :
                 skipped.reason === 'no_suitable_target' ? '!' :
                 skipped.reason === 'stopped' ? 'S' :
                 skipped.reason === 'passthrough_disk' ? 'P' :
                 skipped.reason === 'has_ignore_tag' ? 'I' :
                 skipped.reason === 'unshared_bind_mount' ? 'B' : '?'}
              </span>
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  [{skipped.type} {skipped.vmid}] {skipped.name}
                </span>
                <span className="text-gray-400 dark:text-gray-500 ml-1">on {skipped.node}</span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">— {skipped.detail}</span>
                {skipped.score_improvement !== undefined && (
                  <span className="ml-1 text-yellow-600 dark:text-yellow-400 font-mono">
                    (+{skipped.score_improvement} pts, need {penaltyConfig?.min_score_improvement || 15})
                  </span>
                )}
              </div>
            </div>
          ))}
          {recommendationData.skipped_guests.length > 20 && (
            <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-1">
              ...and {recommendationData.skipped_guests.length - 20} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}
