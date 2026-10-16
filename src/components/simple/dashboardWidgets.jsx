// Overview widgets that reuse the Detailed dashboard's own components: the
// KPI row, the node comparison chart and the automation banner. The Wall
// preset uses them for the classic wall-screen layout (full screen with F11).

import KpiRow from '../dashboard/KpiRow.jsx';
import NodeCompareChart from '../dashboard/NodeCompareChart.jsx';
import AutoStatusPill from '../dashboard/AutoStatusPill.jsx';
import { RunStrip } from '../dashboard/RunHistoryDisplay.jsx';
import { hasTrendData, useChartPeriod } from '../dashboard/nodeSeries.js';
import { nodeColors, COMPARE_METRICS } from '../dashboard/compareSeries.js';
import { useNow, describeDataAge, DATA_AGE_TONE } from '../../utils/dataAge.js';
import { Card, Empty, Switch, usePref, useSlot } from './parts.jsx';
import { fitPx } from './chartWidgets.jsx';
import { FillBox } from './charts.jsx';

const { useEffect, useMemo } = React;

const go = (hash) => { window.location.hash = hash; };

/** The Dashboard's KPI tiles, without a card around them. */
export function KpisWidget({ ctx }) {
  return (
    <Card bare title="Summary">
      <div className="[&>div]:!mb-0">
        <KpiRow
          data={ctx.data}
          nodeScores={ctx.nodeScores}
          automationStatus={ctx.automationStatus}
          automationConfig={ctx.automationConfig}
          recommendations={ctx.recommendations}
          recommendationData={ctx.recommendationData}
          onNavigate={(tab) => go(`#/dashboard/${tab}`)}
          onOpenAutomation={() => go('#/automation')}
          maintenanceNodes={ctx.maintenanceNodes}
          guestsMigrating={ctx.guestsMigrating}
          migrationProgress={ctx.migrationProgress}
        />
      </div>
    </Card>
  );
}

const CHART_METRICS = COMPARE_METRICS.map(m => ({ id: m.key, label: m.label }));

/**
 * The Dashboard's one-chart view of every node (Chart.js), for one metric:
 * the threshold line, the period picked on the Dashboard and the spread
 * readout under it.
 */
export function NodeChartWidget({ ctx }) {
  const [metric, setMetric] = usePref('nodechart.metric', 'cpu', CHART_METRICS.map(m => m.id));
  const { widthPx } = useSlot();
  const [chartPeriod] = useChartPeriod('nodes');
  useEffect(() => { if (!ctx.chartJsLoaded) ctx.loadChartJs?.(); }, [ctx.chartJsLoaded]);
  const nodes = useMemo(() => {
    const all = Object.values(ctx.data?.nodes || {});
    const colors = nodeColors(all.map(n => n.name));
    return all.filter(hasTrendData).sort((a, b) => a.name.localeCompare(b.name))
      .map(n => ({ name: n.name, color: colors[n.name], trendData: n.trend_data }));
  }, [ctx.data?.nodes]);
  const label = CHART_METRICS.find(m => m.id === metric)?.label || 'CPU';
  return (
    <Card title={`${label} by node`} href="#/dashboard/charts"
      tools={<Switch label="Metric" options={CHART_METRICS} value={metric} onChange={setMetric} />}>
      {nodes.length === 0 ? <Empty>No history yet.</Empty> : (
        <FillBox min={fitPx(widthPx, 0.45, 220, 420)}>{() => (
        <div className="h-full">
          <NodeCompareChart
            wall
            fixedMetric={metric}
            nodes={nodes}
            thresholds={{ cpu: ctx.cpuThreshold, mem: ctx.memThreshold, iowait: ctx.iowaitThreshold }}
            chartPeriod={chartPeriod}
            chartReady={!!ctx.chartJsLoaded}
            migrationHistory={ctx.migrationHistory}
          />
        </div>
        )}</FillBox>
      )}
    </Card>
  );
}

/** The Dashboard's automation banner, the last 24 hours of checks and the data age. */
export function AutoBannerWidget({ ctx }) {
  const now = useNow(30000);
  const dataAge = describeDataAge(ctx.data?.collected_at, ctx.config?.collection_interval_minutes, now);
  const last = ctx.automationStatus?.state?.last_run;
  const runs = ctx.runHistory?.length ? ctx.runHistory : (last && typeof last === 'object' ? [last] : []);
  const label = 'text-xs font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-400';
  return (
    <Card title="Automation status" href="#/automation">
      <AutoStatusPill
        size="banner"
        readOnly
        automationStatus={ctx.automationStatus}
        automationConfig={ctx.automationConfig}
        runHistory={ctx.runHistory}
      />
      {ctx.automationStatus?.enabled && runs.length > 0 && (
        <div>
          <div className={`${label} mb-1.5`}>Recent checks · 24 h</div>
          <RunStrip runs={runs} ctx={{ now: new Date(now) }} />
        </div>
      )}
      {dataAge && (
        <div className={`text-xs tabular-nums ${DATA_AGE_TONE[dataAge.tone]}`}>Cluster data {dataAge.label}</div>
      )}
    </Card>
  );
}
