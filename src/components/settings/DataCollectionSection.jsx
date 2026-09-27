import { RefreshCw, Server } from '../Icons.jsx';
import { formatLocalTime, getTimezoneAbbr } from '../../utils/formatters.js';
import { API_BASE } from '../../utils/constants.js';
import { INPUT_FIELD, SELECT_FIELD, INNER_CARD } from '../../utils/designTokens.js';
import { ToggleRow } from '../Toggle.jsx';
import { useUnsaved, countChanges } from '../UnsavedChanges.jsx';
const { useState, useEffect, useMemo } = React;

const PRESETS = {
  small: { collection_interval_minutes: 5, max_parallel_workers: 3, node_rrd_timeframe: 'day', guest_rrd_timeframe: 'hour' },
  medium: { collection_interval_minutes: 15, max_parallel_workers: 5, node_rrd_timeframe: 'day', guest_rrd_timeframe: 'hour' },
  large: { collection_interval_minutes: 30, max_parallel_workers: 8, node_rrd_timeframe: 'hour', guest_rrd_timeframe: 'hour' },
};

/** Flatten the collection-related config into one editable form object. */
function fromConfig(config) {
  const co = config?.collection_optimization || {};
  return {
    cluster_size: co.cluster_size || 'medium',
    collection_interval_minutes: config?.collection_interval_minutes || 15,
    parallel_collection_enabled: co.parallel_collection_enabled !== false,
    max_parallel_workers: co.max_parallel_workers || 5,
    skip_stopped_guest_rrd: co.skip_stopped_guest_rrd !== false,
    node_rrd_timeframe: co.node_rrd_timeframe || 'day',
    guest_rrd_timeframe: co.guest_rrd_timeframe || 'hour',
  };
}

export default function DataCollectionSection({
  backendCollected, loading, data, config, handleRefresh, fetchConfig, setError
}) {
  const saved = useMemo(() => fromConfig(config), [config]);
  const [form, setForm] = useState(saved);
  useEffect(() => { setForm(saved); }, [saved]);

  const set = (key, value) => setForm(prev => ({ ...prev, [key]: value }));
  const applyPreset = (size) => setForm(prev => ({ ...prev, cluster_size: size, ...(PRESETS[size] || {}) }));

  const save = async () => {
    try {
      const res = await fetch(`${API_BASE}/settings/collection`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_interval_minutes: form.collection_interval_minutes,
          collection_optimization: {
            cluster_size: form.cluster_size,
            parallel_collection_enabled: form.parallel_collection_enabled,
            max_parallel_workers: form.max_parallel_workers,
            skip_stopped_guest_rrd: form.skip_stopped_guest_rrd,
            node_rrd_timeframe: form.node_rrd_timeframe,
            guest_rrd_timeframe: form.guest_rrd_timeframe,
          },
        }),
      });
      const result = await res.json();
      if (!result.success) setError?.('Failed to update collection settings: ' + (result.error || 'Unknown error'));
      else fetchConfig?.();
    } catch (err) {
      setError?.('Error saving collection settings: ' + err.message);
    }
  };

  useUnsaved('collection', config ? countChanges(form, saved) : 0, save, () => setForm(saved));

  const perf = data?.performance;

  return (
    <div className="space-y-6">
      {/* Status + last-run performance */}
      <div className={`${INNER_CARD} p-4`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-pb-text dark:text-gray-300">
            <Server size={16} className="text-green-600 dark:text-green-400" />
            Last collected:{' '}
            <span className="font-semibold text-green-600 dark:text-green-400">
              {backendCollected ? `${formatLocalTime(backendCollected)} ${getTimezoneAbbr()}` : '—'}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded hover:bg-pb-hover dark:hover:bg-slate-600 text-pb-text2 dark:text-gray-400 disabled:opacity-50"
            title="Collect now"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Collect now
          </button>
        </div>
        {perf && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[
              ['Total time', `${perf.total_time}s`],
              ['Node processing', `${perf.node_processing_time}s`, perf.parallel_enabled ? 'parallel' : 'sequential'],
              ['Guest processing', `${perf.guest_processing_time}s`],
              ['Workers', perf.max_workers, `${perf.node_count} nodes · ${perf.guest_count} guests`],
            ].map(([label, value, sub]) => (
              <div key={label}>
                <div className="text-xs text-pb-text2 dark:text-gray-400">{label}</div>
                <div className="font-semibold tabular-nums text-pb-text dark:text-white">{value}</div>
                {sub && <div className="text-xs text-pb-text3 dark:text-pb-text3-dark">{sub}</div>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">Cluster size preset</label>
          <select value={form.cluster_size} onChange={(e) => (e.target.value === 'custom' ? set('cluster_size', 'custom') : applyPreset(e.target.value))} className={`${SELECT_FIELD} w-full`}>
            <option value="small">Small (&lt; 30 VMs/CTs) — 5 min interval</option>
            <option value="medium">Medium (30–100 VMs/CTs) — 15 min interval</option>
            <option value="large">Large (100+ VMs/CTs) — 30 min interval</option>
            <option value="custom">Custom</option>
          </select>
          <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">Choosing a preset fills in the fields below; editing a field switches to Custom.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">Collection interval (minutes)</label>
            <input type="number" min="1" max="240" value={form.collection_interval_minutes}
              onChange={(e) => { set('collection_interval_minutes', parseInt(e.target.value, 10) || 1); set('cluster_size', 'custom'); }}
              className={INPUT_FIELD} />
            <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">How often the collector gathers full cluster metrics</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">Max parallel workers</label>
            <input type="number" min="1" max="10" value={form.max_parallel_workers}
              onChange={(e) => { set('max_parallel_workers', parseInt(e.target.value, 10) || 1); set('cluster_size', 'custom'); }}
              className={INPUT_FIELD} disabled={!form.parallel_collection_enabled} />
            <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">Nodes processed concurrently</p>
          </div>
        </div>

        <ToggleRow label="Parallel collection" description="Process multiple nodes at once (3–5× faster)"
          checked={form.parallel_collection_enabled} onChange={(e) => set('parallel_collection_enabled', e.target.checked)} />
        <ToggleRow label="Skip RRD for stopped guests" description="Don't fetch performance history for stopped VMs/CTs (faster)"
          checked={form.skip_stopped_guest_rrd} onChange={(e) => set('skip_stopped_guest_rrd', e.target.checked)} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[['node_rrd_timeframe', 'Node RRD timeframe'], ['guest_rrd_timeframe', 'Guest RRD timeframe']].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-1">{label}</label>
              <select value={form[key]} onChange={(e) => { set(key, e.target.value); set('cluster_size', 'custom'); }} className={`${SELECT_FIELD} w-full`}>
                <option value="hour">Hour (~60 points)</option>
                <option value="day">Day (~1440 points)</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
