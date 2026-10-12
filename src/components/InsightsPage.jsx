import { Activity, TrendingUp, Clock, CheckCircle, Cpu, Power } from './Icons.jsx';
import { GLASS_CARD } from '../utils/designTokens.js';
import SectionHeader from './SectionHeader.jsx';
import OutcomesByDay from './insights/OutcomesByDay.jsx';
import NodeTrends, { RangePicker } from './insights/NodeTrends.jsx';
import Forecasts, { ForecastsClear, forecastsEmpty } from './insights/Forecasts.jsx';
import RhythmHeatmap, { MetricPicker } from './insights/RhythmHeatmap.jsx';
import Rightsizing, { RightsizingSummary } from './insights/Rightsizing.jsx';
import FailureSim, { StorageModePicker } from './insights/FailureSim.jsx';
import { readStorageMode, writeStorageMode, ROUTE_PREFIX } from './insights/failureModel.js';
import { RANGES, useLoad } from './insights/shared.jsx';
import { fetchNodeTrends, fetchWorkloadPatterns, fetchForecasts, fetchRightsizing, fetchNodeFailure } from '../api/client.js';

const { useState, useEffect, useRef } = React;

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
export default function InsightsPage({ cpuThreshold, memThreshold, iowaitThreshold, clusterNodes, automationConfig, routeTab }) {
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
  const [engineState] = useLoad(() => fetchForecasts());
  const [rightsizingState] = useLoad(() => fetchRightsizing());
  // Nothing projected: Forecasts shrinks to one line and the rhythm card takes the full width.
  const noForecasts = forecastsEmpty(trendsState, engineState, thresholds);

  // "What if a node fails?": #/insights/failure-<node> opens it on that node.
  const [failStorage, setFailStorage] = useState(readStorageMode);
  const changeFailStorage = (m) => { setFailStorage(m); writeStorageMode(m); };
  // N-1 chips always use the capacity view; the toggle only changes the selected node's detail.
  const [failSummary] = useLoad(() => fetchNodeFailure(null, 'capacity'));
  const routedNode = routeTab && routeTab.startsWith(ROUTE_PREFIX) ? routeTab.slice(ROUTE_PREFIX.length) : null;
  const failRef = useRef(null);
  useEffect(() => {
    if (routedNode && failRef.current) failRef.current.scrollIntoView({ block: 'start' });
  }, [routedNode]);
  const showStoragePicker = failStorage === 'strict' || (failSummary.data?.local_storage_guests || 0) > 0;

  return (
    <div className="pb-4 sm:pb-0">
      <div className="max-w-screen-2xl mx-auto p-4 space-y-4">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className={`${GLASS_CARD} xl:col-span-2`}>
            <SectionHeader title="Node trends" icon={Activity} accent={['blue', 'cyan']} right={<RangePicker value={trendDays} onChange={changeRange} />} />
            <NodeTrends state={trendsState} days={trendDays} thresholds={thresholds} clusterNodes={clusterNodes} />
          </div>
          {noForecasts ? (
            <div className={`${GLASS_CARD} xl:col-span-2 !py-3`}>
              <ForecastsClear days={trendDays} />
            </div>
          ) : (
            <div className={GLASS_CARD}>
              <SectionHeader title="Forecasts" icon={TrendingUp} accent={['orange', 'red']} />
              <Forecasts trendsState={trendsState} days={trendDays} thresholds={thresholds} engineState={engineState} />
            </div>
          )}
          <div className={`${GLASS_CARD} ${noForecasts ? 'xl:col-span-2' : ''}`}>
            <SectionHeader title="Workload rhythm" icon={Clock} accent={['indigo', 'violet']} right={<MetricPicker value={rhythmMetric} onChange={setRhythmMetric} />} />
            <WorkloadRhythm
              clusterNodes={clusterNodes}
              schedule={automationConfig?.schedule}
              metric={rhythmMetric}
              threshold={rhythmMetric === 'cpu' ? cpuThreshold : iowaitThreshold}
            />
          </div>
          <div ref={failRef} className={`${GLASS_CARD} xl:col-span-2 scroll-mt-20`}>
            <SectionHeader title="What if a node fails?" icon={Power} accent={['red', 'rose']} right={showStoragePicker ? <StorageModePicker value={failStorage} onChange={changeFailStorage} /> : null} />
            <FailureSim storage={failStorage} routedNode={routedNode} summaryState={failSummary} />
          </div>
          <div className={`${GLASS_CARD} xl:col-span-2`}>
            <SectionHeader title="Right-sizing" icon={Cpu} accent={['teal', 'cyan']} />
            <RightsizingSummary data={rightsizingState.data} />
            <Rightsizing state={rightsizingState} />
          </div>
          <div className={`${GLASS_CARD} xl:col-span-2`}>
            <SectionHeader title="Migration outcomes" icon={CheckCircle} accent={['emerald', 'green']} />
            <p className="text-sm text-pb-text2 dark:text-gray-400 -mt-2 mb-3">Did recent migrations actually relieve the source node?</p>
            <OutcomesByDay />
          </div>
        </div>
      </div>
    </div>
  );
}
