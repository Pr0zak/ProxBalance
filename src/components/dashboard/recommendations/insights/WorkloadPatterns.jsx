import { Activity, Server, Clock, RefreshCw } from '../../../Icons.jsx';

const { useState, useEffect } = React;

export default function WorkloadPatterns({ API_BASE, active }) {
  const [patterns, setPatterns] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!active || patterns || loading) return;
    setLoading(true);
    fetch(`${API_BASE}/workload-patterns?hours=168`)
      .then(r => r.json())
      .then(res => { if (res.success) setPatterns(res.patterns || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [active]);

  if (loading) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 py-4 flex items-center gap-2">
        <RefreshCw size={12} className="animate-spin" /> Analyzing patterns...
      </div>
    );
  }

  if (!patterns || patterns.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4">
        Insufficient history data for pattern analysis. Patterns emerge after several days of data collection.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {patterns.map((p, idx) => (
        <div key={idx} className="bg-white dark:bg-gray-900/50 rounded p-2.5 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-1.5">
            <Server size={12} className="text-blue-500" />
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{p.node}</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">{p.data_points} data points</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
            {p.daily_pattern ? (
              <div className="p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <div className="font-medium text-blue-700 dark:text-blue-300 mb-0.5">Daily Cycle <span className="text-blue-500">({p.daily_pattern.pattern_confidence})</span></div>
                <div className="text-gray-600 dark:text-gray-400">Peak: {p.daily_pattern.peak_avg_cpu}% | Trough: {p.daily_pattern.trough_avg_cpu}%</div>
                <div className="text-gray-500 dark:text-gray-500">Biz hrs: {p.daily_pattern.business_hours_avg}% | Off hrs: {p.daily_pattern.off_hours_avg}%</div>
              </div>
            ) : (
              <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No daily cycle detected</div>
            )}
            {p.weekly_pattern ? (
              <div className="p-1.5 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <div className="font-medium text-purple-700 dark:text-purple-300 mb-0.5">Weekly Cycle <span className="text-purple-500">({p.weekly_pattern.pattern_confidence})</span></div>
                <div className="text-gray-600 dark:text-gray-400">Weekday: {p.weekly_pattern.weekday_avg}% | Weekend: {p.weekly_pattern.weekend_avg}%</div>
                <div className="text-gray-500 dark:text-gray-500">Peak days: {p.weekly_pattern.peak_days?.join(', ')}</div>
              </div>
            ) : (
              <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No weekly cycle detected</div>
            )}
            {p.burst_detection?.detected ? (
              <div className="p-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="font-medium text-amber-700 dark:text-amber-300 mb-0.5">Burst Detection</div>
                <div className="text-gray-600 dark:text-gray-400">{p.burst_detection.recurring_bursts} recurring burst hour(s)</div>
                <div className="text-gray-500 dark:text-gray-500">Avg burst: {p.burst_detection.avg_burst_cpu}% at hours {p.burst_detection.burst_hours?.join(', ')}</div>
              </div>
            ) : (
              <div className="p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">No recurring bursts</div>
            )}
          </div>
          {p.recommendation_timing && (
            <div className="mt-1.5 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1">
              <Clock size={10} /> {p.recommendation_timing}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
