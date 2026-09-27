import { Activity, TrendingUp, Clock, CheckCircle } from './Icons.jsx';
import { GLASS_CARD } from '../utils/designTokens.js';
import SectionHeader from './SectionHeader.jsx';
import MigrationOutcomes from './dashboard/recommendations/insights/MigrationOutcomes.jsx';
import NodeTrends, { RangePicker } from './insights/NodeTrends.jsx';
import Forecasts from './insights/Forecasts.jsx';
import RhythmHeatmap, { MetricPicker } from './insights/RhythmHeatmap.jsx';
import { RANGES, useLoad } from './insights/shared.jsx';
import { fetchNodeTrends, fetchWorkloadPatterns } from '../api/client.js';

const { useState } = React;

const RANGE_KEY = 'insightsTrendDays';

// Remembered per browser; a convenience only, so every access is guarded.
function readRange() {
  try {
    const v = Number(localStorage.getItem(RANGE_KEY));
    return RANGES.some(([d]) => d === v) ? v : 7;
  } catch { return 7; }
}

function WorkloadRhythm({ clusterNodes, schedule, metric, threshold }) {
  const [{ data }] = useLoad(() => fetchWorkloadPatterns());
  // The heatmap is computed from the collector's RRD series; the backend's
  // pattern analysis only contributes the weekly-cycle / burst notes.
  return (
    <RhythmHeatmap
      clusterNodes={clusterNodes}
      schedule={schedule}
      metric={metric}
      threshold={threshold}
      patterns={data?.patterns || []}
      patternsTz={data?.timezone}
    />
  );
}

/**
 * Insights — surfaces the analysis the backend already computes but the UI
 * never showed: trend projections, forecasts, workload rhythm, and measured
 * migration outcomes.
 */
export default function InsightsPage({ cpuThreshold, memThreshold, iowaitThreshold, clusterNodes, automationConfig }) {
  const [trendDays, setTrendDays] = useState(readRange);
  const [rhythmMetric, setRhythmMetric] = useState('cpu');
  const changeRange = (d) => {
    setTrendDays(d);
    try { localStorage.setItem(RANGE_KEY, String(d)); } catch { /* per-viewer nicety only */ }
  };
  // One trends fetch shared by Node trends and Forecasts so both describe the same window.
  const [trendsState] = useLoad(
    () => fetchNodeTrends(trendDays, cpuThreshold, memThreshold),
    [trendDays, cpuThreshold, memThreshold]
  );
  const thresholds = { cpu: cpuThreshold, memory: memThreshold, iowait: iowaitThreshold };

  return (
    <div className="pb-4 sm:pb-0">
      <div className="max-w-screen-2xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={`${GLASS_CARD} xl:col-span-2`}>
            <SectionHeader title="Node trends" icon={Activity} accent={['blue', 'cyan']} right={<RangePicker value={trendDays} onChange={changeRange} />} />
            <NodeTrends state={trendsState} days={trendDays} thresholds={thresholds} clusterNodes={clusterNodes} />
          </div>
          <div className={GLASS_CARD}>
            <SectionHeader title="Forecasts" icon={TrendingUp} accent={['orange', 'red']} />
            <Forecasts trendsState={trendsState} days={trendDays} thresholds={thresholds} />
          </div>
          <div className={GLASS_CARD}>
            <SectionHeader title="Workload rhythm" icon={Clock} accent={['indigo', 'violet']} right={<MetricPicker value={rhythmMetric} onChange={setRhythmMetric} />} />
            <WorkloadRhythm
              clusterNodes={clusterNodes}
              schedule={automationConfig?.schedule}
              metric={rhythmMetric}
              threshold={rhythmMetric === 'cpu' ? cpuThreshold : iowaitThreshold}
            />
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
