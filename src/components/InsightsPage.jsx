import { Activity, TrendingUp, TrendingDown, Minus, Clock, RefreshCw, CheckCircle } from './Icons.jsx';
import { GLASS_CARD, INNER_CARD } from '../utils/designTokens.js';
import SectionHeader from './SectionHeader.jsx';
import MigrationOutcomes from './dashboard/recommendations/insights/MigrationOutcomes.jsx';
import { fetchNodeTrends, fetchForecasts, fetchWorkloadPatterns } from '../api/client.js';

const { useState, useEffect } = React;

const METRICS = [['cpu', 'CPU'], ['memory', 'Memory'], ['iowait', 'IOWait']];

const DIRECTION_ICON = {
  rising: <TrendingUp size={14} className="text-orange-500" />,
  sustained_increase: <TrendingUp size={14} className="text-red-500" />,
  falling: <TrendingDown size={14} className="text-green-500" />,
  stable: <Minus size={14} className="text-pb-text3 dark:text-gray-500" />,
};

/** "3 d", "5 wk", "> 1 yr" or "—" for a projected hours-to-threshold. */
function formatHorizon(hours) {
  if (hours == null) return '—';
  if (hours > 24 * 365) return '> 1 yr';
  if (hours < 48) return `${Math.round(hours)} h`;
  if (hours < 24 * 60) return `${Math.round(hours / 24)} d`;
  return `${Math.round(hours / 24 / 7)} wk`;
}

function useLoad(loader, deps = []) {
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const load = async () => {
    setState(s => ({ ...s, loading: true }));
    const res = await loader();
    setState({ loading: false, data: res?.error ? null : res, error: res?.error ? res.message : null });
  };
  useEffect(() => { load(); }, deps);
  return [state, load];
}

function Loading() {
  return <div className="text-sm text-pb-text2 dark:text-gray-400 flex items-center gap-2 py-4"><RefreshCw size={14} className="animate-spin" /> Loading…</div>;
}

function Failed({ error }) {
  return <div className="text-sm text-red-600 dark:text-red-400 py-2">Couldn't load: {error}</div>;
}

function NodeTrends({ cpuThreshold, memThreshold }) {
  const [{ loading, data, error }] = useLoad(() => fetchNodeTrends(7, cpuThreshold, memThreshold), [cpuThreshold, memThreshold]);
  if (loading) return <Loading />;
  if (error) return <Failed error={error} />;
  if (!data?.data_available) return <p className="text-sm text-pb-text2 dark:text-gray-400">Not enough history yet — trends need a few days of collected metrics.</p>;

  const nodes = Object.values(data.nodes || {}).sort((a, b) => a.node.localeCompare(b.node));
  return (
    <div className="space-y-3">
      <p className="text-sm text-pb-text dark:text-gray-300">
        Over the last 7 days the cluster is <strong>{data.cluster_direction}</strong>.
        {data.top_movers?.[0] && data.top_movers[0].direction !== 'stable' && (
          <> Biggest mover: <strong>{data.top_movers[0].node}</strong> {data.top_movers[0].metric} {data.top_movers[0].rate_display}.</>
        )}
      </p>
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-pb-text2 dark:text-gray-400">
              <th className="px-2 py-1.5 font-medium">Node</th>
              {METRICS.map(([k, l]) => <th key={k} className="px-2 py-1.5 font-medium">{l}</th>)}
              <th className="px-2 py-1.5 font-medium hidden md:table-cell">Stability</th>
            </tr>
          </thead>
          <tbody>
            {nodes.map(n => (
              <tr key={n.node} className="border-t border-pb-border dark:border-slate-700/50 align-top">
                <td className="px-2 py-2 font-medium text-pb-text dark:text-white">{n.node}</td>
                {METRICS.map(([k]) => {
                  const m = n[k] || {};
                  return (
                    <td key={k} className="px-2 py-2">
                      <div className="flex items-center gap-1.5 tabular-nums text-pb-text dark:text-gray-200">
                        {DIRECTION_ICON[m.direction] || DIRECTION_ICON.stable}
                        {m.current_avg != null ? `${Math.round(m.current_avg)}%` : '—'}
                        <span className="text-xs text-pb-text2 dark:text-gray-400">{m.rate_display}</span>
                      </div>
                      {/* A low-confidence fit (r² ≈ 0) projects noise; don't present it as a deadline. */}
                      {m.confidence !== 'low' && m.hours_to_threshold != null && m.hours_to_threshold < 24 * 365 && (
                        <div className="text-xs text-orange-600 dark:text-orange-400">threshold in {formatHorizon(m.hours_to_threshold)}</div>
                      )}
                      {m.confidence === 'low' && <div className="text-[10px] text-pb-text3 dark:text-gray-500">no clear trend</div>}
                    </td>
                  );
                })}
                <td className="px-2 py-2 hidden md:table-cell text-xs text-pb-text2 dark:text-gray-400">
                  {n.overall_stability_label} ({n.overall_stability}/100)
                  <div className="text-pb-text3 dark:text-gray-500">{n.data_quality?.coverage_days} days of data</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Forecasts() {
  const [{ loading, data, error }] = useLoad(() => fetchForecasts());
  if (loading) return <Loading />;
  if (error) return <Failed error={error} />;
  const list = data?.forecasts || [];
  if (!list.length) {
    return (
      <div className="flex items-center gap-2 text-sm text-pb-text2 dark:text-gray-400">
        <CheckCircle size={16} className="text-green-600 dark:text-green-400" />
        No node is projected to cross a threshold in the forecast window.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {list.map((f, i) => (
        <div key={i} className={`${INNER_CARD} p-3 text-sm`}>
          <div className="font-medium text-pb-text dark:text-white">
            {f.node || f.source_node}{f.metric ? ` · ${f.metric}` : ''}
            {f.hours_to_threshold != null && <span className="ml-2 text-orange-600 dark:text-orange-400">in {formatHorizon(f.hours_to_threshold)}</span>}
          </div>
          <div className="text-pb-text2 dark:text-gray-400">{f.reason || f.message || f.recommendation || ''}</div>
        </div>
      ))}
    </div>
  );
}

function WorkloadPatterns() {
  const [{ loading, data, error }] = useLoad(() => fetchWorkloadPatterns());
  if (loading) return <Loading />;
  if (error) return <Failed error={error} />;
  const patterns = (data?.patterns || []).slice().sort((a, b) => a.node.localeCompare(b.node));
  if (!patterns.length) return <p className="text-sm text-pb-text2 dark:text-gray-400">No pattern data yet.</p>;
  return (
    <div className="space-y-2">
      <p className="text-xs text-pb-text2 dark:text-gray-400">Based on {data.hours_analyzed} h of score history.</p>
      {patterns.map(p => (
        <div key={p.node} className="flex items-start gap-3 text-sm py-1.5 border-t border-pb-border dark:border-slate-700/50 first:border-0">
          <span className="w-14 shrink-0 font-medium text-pb-text dark:text-white">{p.node}</span>
          <div className="min-w-0">
            <div className="text-pb-text dark:text-gray-300">
              <Clock size={12} className="inline mr-1 -mt-0.5 text-pb-text3 dark:text-gray-500" />
              {p.recommendation_timing || 'No clear quiet window'}
            </div>
            <div className="text-xs text-pb-text2 dark:text-gray-400">
              {p.daily_pattern ? 'Daily cycle detected' : 'No daily cycle'}
              {' · '}{p.weekly_pattern ? 'weekly cycle detected' : 'no weekly cycle'}
              {' · '}{p.burst_detection?.detected ? `recurring bursts at ${p.burst_detection.burst_hours.join(', ')}:00` : 'no recurring bursts'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Insights — surfaces the analysis the backend already computes but the UI
 * never showed: trend projections, forecasts, workload rhythm, and measured
 * migration outcomes.
 */
export default function InsightsPage({ cpuThreshold, memThreshold }) {
  return (
    <div className="pb-20 sm:pb-0">
      <div className="max-w-screen-2xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={`${GLASS_CARD} xl:col-span-2`}>
            <SectionHeader title="Node trends" icon={Activity} accent={['blue', 'cyan']} />
            <NodeTrends cpuThreshold={cpuThreshold} memThreshold={memThreshold} />
          </div>
          <div className={GLASS_CARD}>
            <SectionHeader title="Forecasts" icon={TrendingUp} accent={['orange', 'red']} />
            <Forecasts />
          </div>
          <div className={GLASS_CARD}>
            <SectionHeader title="Workload rhythm" icon={Clock} accent={['indigo', 'violet']} />
            <WorkloadPatterns />
          </div>
          <div className={`${GLASS_CARD} xl:col-span-2`}>
            <SectionHeader title="Migration outcomes" icon={CheckCircle} accent={['emerald', 'green']} />
            <p className="text-sm text-pb-text2 dark:text-gray-400 -mt-2 mb-3">Did recent migrations actually relieve the source node?</p>
            <MigrationOutcomes active limit={20} />
          </div>
        </div>
      </div>
    </div>
  );
}
