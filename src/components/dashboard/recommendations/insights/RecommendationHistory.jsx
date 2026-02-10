import { RefreshCw } from '../../../Icons.jsx';

const { useState, useEffect } = React;

export default function RecommendationHistory({ API_BASE, active }) {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hours, setHours] = useState(24);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${API_BASE}/score-history?hours=${hours}`)
      .then(r => r.json())
      .then(res => { if (!cancelled) setHistoryData(res.history || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [hours, active]);

  if (loading) {
    return (
      <div className="text-xs text-gray-500 dark:text-gray-400 py-4 flex items-center gap-2">
        <RefreshCw size={12} className="animate-spin" /> Loading history...
      </div>
    );
  }

  if (!historyData || historyData.length === 0) {
    return (
      <div className="text-xs text-gray-400 dark:text-gray-500 py-4">
        No score history data yet. History is recorded automatically every time recommendations are generated.
      </div>
    );
  }

  const entries = historyData.slice(-48);
  const healthValues = entries.map(e => e.cluster_health || 0);
  const recCounts = entries.map(e => e.recommendation_count || 0);
  const maxRec = Math.max(...recCounts, 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span> Cluster Health</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 bg-orange-500 rounded-full inline-block"></span> Rec Count</span>
        </div>
        <select value={hours} onChange={e => setHours(Number(e.target.value))} className="text-[10px] px-1.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400">
          <option value={6}>6h</option>
          <option value={24}>24h</option>
          <option value={72}>3 days</option>
          <option value={168}>7 days</option>
        </select>
      </div>
      <div className="flex items-end gap-px h-16">
        {entries.map((entry, i) => {
          const healthPct = (healthValues[i] / 100) * 100;
          const recPct = recCounts[i] > 0 ? Math.max(10, (recCounts[i] / maxRec) * 100) : 0;
          const ts = new Date(entry.timestamp);
          const timeLabel = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative" title={`${timeLabel}\nHealth: ${healthValues[i].toFixed(0)}%\nRecs: ${recCounts[i]}`}>
              <div className="w-full flex flex-col justify-end h-16">
                <div className="w-full bg-green-400 dark:bg-green-500 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity" style={{ height: `${healthPct}%`, minHeight: healthPct > 0 ? '1px' : '0' }}></div>
              </div>
              {recPct > 0 && <div className="absolute bottom-0 w-1 bg-orange-500 rounded-t-sm opacity-70" style={{ height: `${recPct * 0.6}%`, minHeight: '2px' }}></div>}
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-gray-400 dark:text-gray-500">
        <span>{entries.length > 0 ? new Date(entries[0].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
        <span>{entries.length > 0 ? new Date(entries[entries.length - 1].timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>
      <div className="mt-2 text-[10px] text-gray-500 dark:text-gray-400">
        {entries.length} snapshots over last {hours}h — Latest health: <strong className="text-gray-700 dark:text-gray-300">{healthValues[healthValues.length - 1]?.toFixed(0)}%</strong>, Recs: <strong className="text-gray-700 dark:text-gray-300">{recCounts[recCounts.length - 1]}</strong>
      </div>
    </div>
  );
}
