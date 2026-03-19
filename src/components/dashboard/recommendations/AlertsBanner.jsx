import {
  AlertTriangle, ChevronDown, Zap
} from '../../Icons.jsx';

export default function AlertsBanner({
  recommendationData, collapsedSections, setCollapsedSections
}) {
  const hasAdvisories = recommendationData?.capacity_advisories?.length > 0;
  const hasConflicts = recommendationData?.conflicts?.length > 0;
  const hasForecasts = recommendationData?.forecasts?.length > 0;

  if (!hasAdvisories && !hasConflicts && !hasForecasts) return null;

  return (
    <>
      {/* Capacity Planning Advisories */}
      {hasAdvisories && (
        <div className="mb-4 space-y-2">
          {recommendationData.capacity_advisories.map((adv, i) => (
            <div key={i} className={`rounded-lg border p-3 text-sm ${
              adv.severity === 'critical'
                ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200'
                : adv.severity === 'warning'
                ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200'
            }`}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className={`shrink-0 mt-0.5 ${
                  adv.severity === 'critical' ? 'text-red-600 dark:text-red-400' :
                  adv.severity === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-blue-600 dark:text-blue-400'
                }`} />
                <div className="flex-1">
                  <div className="font-medium text-xs uppercase tracking-wide mb-0.5">
                    {adv.severity === 'critical' ? 'Critical' : adv.severity === 'warning' ? 'Warning' : 'Info'}: {adv.type.replace(/_/g, ' ')}
                  </div>
                  <div>{adv.message}</div>
                  {adv.suggestions?.length > 0 && (
                    <ul className="mt-1 text-xs opacity-80 list-disc list-inside">
                      {adv.suggestions.map((s, j) => <li key={j}>{s}</li>)}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Migration Conflicts */}
      {hasConflicts && (
        <div className="mb-4 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-3 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400" />
            <span className="font-semibold text-orange-800 dark:text-orange-200">
              Migration Conflicts Detected ({recommendationData.conflicts.length})
            </span>
          </div>
          <div className="space-y-2 text-xs text-orange-700 dark:text-orange-300">
            {recommendationData.conflicts.map((c, i) => (
              <div key={i} className="p-2 bg-white dark:bg-gray-800/50 rounded border border-orange-200 dark:border-orange-800">
                <div className="font-medium mb-1">
                  Target: {c.target_node} — {c.incoming_guests.length} incoming migrations
                </div>
                <div className="flex flex-wrap gap-2 mb-1">
                  {c.exceeds_cpu && <span className="text-red-600 dark:text-red-400">Combined CPU: {c.combined_predicted_cpu}% (threshold: {c.cpu_threshold}%)</span>}
                  {c.exceeds_mem && <span className="text-red-600 dark:text-red-400">Combined Memory: {c.combined_predicted_mem}% (threshold: {c.mem_threshold}%)</span>}
                </div>
                <div className="italic">{c.resolution}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trend Forecasts */}
      {hasForecasts && (
        <div className="mb-4">
          <button
            onClick={() => setCollapsedSections(prev => ({ ...prev, forecastAlerts: !prev.forecastAlerts }))}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
          >
            <ChevronDown size={16} className={`transition-transform ${collapsedSections.forecastAlerts ? '' : 'rotate-180'}`} />
            <Zap size={14} className="text-amber-500" />
            Trend Forecasts ({recommendationData.forecasts.length})
            <span className="text-xs text-gray-400 dark:text-gray-500">— Projected threshold crossings</span>
          </button>
          {!collapsedSections.forecastAlerts && (
            <div className="space-y-2">
              {recommendationData.forecasts.map((fc, idx) => (
                <div key={idx} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  fc.severity === 'critical' ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700'
                  : fc.severity === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                }`}>
                  <div className={`shrink-0 p-1.5 rounded-full ${
                    fc.severity === 'critical' ? 'bg-red-100 dark:bg-red-800' : fc.severity === 'warning' ? 'bg-amber-100 dark:bg-amber-800' : 'bg-blue-100 dark:bg-blue-800'
                  }`}>
                    <AlertTriangle size={14} className={
                      fc.severity === 'critical' ? 'text-red-600 dark:text-red-400' : fc.severity === 'warning' ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                    } />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm text-gray-900 dark:text-white">{fc.node}</span>
                      <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${
                        fc.severity === 'critical' ? 'bg-red-600 text-white' : fc.severity === 'warning' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white'
                      }`}>{fc.severity}</span>
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 uppercase">{fc.metric}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{fc.message}</p>
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-500">
                      <span>Current: <strong className="text-gray-700 dark:text-gray-300">{fc.current_value?.toFixed(1)}%</strong></span>
                      <span>Threshold: <strong className="text-gray-700 dark:text-gray-300">{fc.threshold}%</strong></span>
                      <span>Projected: <strong className="text-gray-700 dark:text-gray-300">{fc.projected_value?.toFixed(1)}%</strong></span>
                      {fc.estimated_hours_to_crossing && <span>ETA: <strong className="text-gray-700 dark:text-gray-300">~{fc.estimated_hours_to_crossing < 24 ? `${fc.estimated_hours_to_crossing.toFixed(0)}h` : `${(fc.estimated_hours_to_crossing / 24).toFixed(1)}d`}</strong></span>}
                      <span>Rate: <strong className="text-gray-700 dark:text-gray-300">{fc.trend_rate_per_day > 0 ? '+' : ''}{fc.trend_rate_per_day?.toFixed(1)}%/day</strong></span>
                      <span>Confidence: <strong className="text-gray-700 dark:text-gray-300">{fc.confidence}</strong> (R²={fc.r_squared?.toFixed(2)})</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
