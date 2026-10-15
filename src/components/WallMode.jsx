import KpiRow from './dashboard/KpiRow.jsx';
import ClusterMap from './dashboard/ClusterMap.jsx';
import NodeCompareChart from './dashboard/NodeCompareChart.jsx';
import AutoStatusPill from './dashboard/AutoStatusPill.jsx';
import { RunStrip } from './dashboard/RunHistoryDisplay.jsx';
import { hasTrendData, useChartPeriod } from './dashboard/nodeSeries.js';
import { nodeColors } from './dashboard/compareSeries.js';
import { nodeRoles } from '../utils/nodeRoles.js';
import { useNow, describeDataAge, DATA_AGE_TONE } from '../utils/dataAge.js';
import { wallScale, fitScale } from '../utils/wallMode.js';
import { PAGE_BG, WALL_PANEL, BTN_SECONDARY } from '../utils/designTokens.js';
import { Maximize, X } from './Icons.jsx';

const { useState, useEffect, useLayoutEffect, useMemo, useRef } = React;

const HINT_MS = 3000;

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [vp, setVp] = useState(read);
  useEffect(() => {
    const on = () => setVp(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

// Browser fullscreen (best effort) and an exit when the browser leaves it:
// Esc in fullscreen is taken by the browser and never reaches the page.
function useFullscreen(onExit) {
  const entered = useRef(false);
  const [isFs, setIsFs] = useState(() => !!document.fullscreenElement);
  const supported = !!(document.fullscreenEnabled && document.documentElement.requestFullscreen);
  const request = () => {
    if (!supported || document.fullscreenElement) return;
    try {
      const p = document.documentElement.requestFullscreen();
      if (p && p.then) p.then(() => { entered.current = true; }).catch(() => {});
    } catch { /* not allowed without a gesture: the wall still shows */ }
  };
  useEffect(() => {
    request();
    const onChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFs(fs);
      if (fs) entered.current = true;
      else if (entered.current) onExit();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
    };
  }, []);
  return { supported, isFs, request };
}

// Keep the screen on while the wall is open (best effort; re-taken when the
// tab becomes visible again, since the browser drops the lock when hidden).
function useWakeLock() {
  useEffect(() => {
    if (!navigator.wakeLock?.request) return undefined;
    let alive = true;
    let lock = null;
    const acquire = async () => {
      if (document.visibilityState !== 'visible' || (lock && !lock.released)) return;
      try {
        const l = await navigator.wakeLock.request('screen');
        if (alive) lock = l; else l.release().catch(() => {});
      } catch { /* denied (battery saver, permissions): the wall still works */ }
    };
    acquire();
    document.addEventListener('visibilitychange', acquire);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', acquire);
      if (lock && !lock.released) lock.release().catch(() => {});
    };
  }, []);
}

// Scales its content down (never up) to fit the box. `layoutWidth` lays the
// content out wider than the box first, e.g. so every node fits in one row.
function FitBox({ layoutWidth = 0, children }) {
  const boxRef = useRef(null);
  const innerRef = useRef(null);
  const [fit, setFit] = useState({ w: null, s: 1 });
  useLayoutEffect(() => {
    const box = boxRef.current;
    const inner = innerRef.current;
    if (!box || !inner) return undefined;
    const measure = () => {
      const bw = box.clientWidth;
      const bh = box.clientHeight;
      const w = Math.max(bw, layoutWidth);
      const s = fitScale(w, inner.offsetHeight, bw, bh, 0.35);
      setFit(f => (f.w === w && Math.abs(f.s - s) < 0.005 ? f : { w, s }));
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [layoutWidth]);
  return (
    <div ref={boxRef} className="relative w-full h-full overflow-hidden">
      <div
        ref={innerRef}
        className="absolute top-0 left-1/2"
        style={{
          width: fit.w ? `${fit.w}px` : '100%',
          transform: `translateX(-50%) scale(${fit.s})`,
          transformOrigin: 'top center',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Full-screen wall-monitor view (#/wall): KPIs, the cluster map, every node's
 * CPU on one chart and the automation status, sized to fill a big screen
 * without scrolling. Read-only: clicks only bring up the exit control.
 * On screens 1024 px and wider the layout is drawn on a 1280 × 720 canvas
 * and scaled to the screen; narrower screens get a plain stacked page.
 */
export default function WallMode({
  data, error, loading, config,
  nodeScores, recommendations, recommendationData,
  automationStatus, automationConfig, runHistory, migrationHistory,
  maintenanceNodes, guestsMigrating, migrationProgress, completedMigrations,
  chartJsLoaded, loadChartJs,
  onExit,
}) {
  const vp = useViewport();
  const view = wallScale(vp.w, vp.h);
  const fs = useFullscreen(onExit);
  useWakeLock();

  // Exit control: shown on pointer movement / tap / key, hidden after a pause.
  const [hint, setHint] = useState(true);
  const hintTimer = useRef(null);
  const poke = () => {
    setHint(true);
    clearTimeout(hintTimer.current);
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS);
  };
  useEffect(() => {
    poke();
    const onKey = (e) => { if (e.key === 'Escape') onExit(); else poke(); };
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); clearTimeout(hintTimer.current); };
  }, []);

  useEffect(() => { if (!chartJsLoaded) loadChartJs?.(); }, [chartJsLoaded]);

  const [chartPeriod] = useChartPeriod('nodes');
  const compareNodes = useMemo(() => {
    const all = Object.values(data?.nodes || {});
    const colors = nodeColors(all.map(n => n.name));
    return all.filter(hasTrendData).sort((a, b) => a.name.localeCompare(b.name))
      .map(n => ({ name: n.name, color: colors[n.name], trendData: n.trend_data }));
  }, [data?.nodes]);
  const nodeRoleMap = useMemo(
    () => nodeRoles({ nodes: data?.nodes, recommendations, maintenanceNodes }),
    [data, recommendations, maintenanceNodes],
  );
  const thresholds = {
    cpu: recommendationData?.parameters?.cpu_threshold,
    mem: recommendationData?.parameters?.mem_threshold,
    iowait: recommendationData?.parameters?.iowait_threshold,
  };

  const now = useNow(30000);
  const dataAge = describeDataAge(data?.collected_at, config?.collection_interval_minutes, now);
  const nodeCount = Object.keys(data?.nodes || {}).length;
  // One row of node columns (196 px + 16 px gap each), then scale to fit.
  const mapLayoutWidth = view.fixed ? nodeCount * 212 : 0;
  const noop = () => {};
  const runs = runHistory && runHistory.length ? runHistory
    : (automationStatus?.state?.last_run && typeof automationStatus.state.last_run === 'object' ? [automationStatus.state.last_run] : []);

  const label = 'text-xs font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-400';

  const map = data ? (
    <ClusterMap
      embedded wall
      data={data}
      showPoweredOffGuests={false}
      setShowPoweredOffGuests={noop}
      clusterMapViewMode="cpu"
      setClusterMapViewMode={noop}
      maintenanceNodes={maintenanceNodes}
      nodeRoleMap={nodeRoleMap}
      setSelectedNode={noop}
      setSelectedGuestDetails={noop}
      guestsMigrating={guestsMigrating}
      migrationProgress={migrationProgress}
      completedMigrations={completedMigrations}
      nodeScores={nodeScores}
      recommendations={recommendations}
    />
  ) : null;

  const body = !data ? (
    <div className="h-full min-h-screen flex items-center justify-center text-lg text-pb-text2 dark:text-gray-400">
      {error ? `Cannot reach ProxBalance: ${error}` : loading ? 'Loading cluster data…' : 'No cluster data yet'}
    </div>
  ) : (
    <div className={`flex flex-col gap-3 p-3 ${view.fixed ? 'h-full' : ''}`}>
      <div className="[&>div]:!mb-0 shrink-0">
        <KpiRow
          data={data}
          nodeScores={nodeScores}
          automationStatus={automationStatus}
          automationConfig={automationConfig}
          recommendations={recommendations}
          recommendationData={recommendationData}
          onNavigate={noop}
          onOpenAutomation={noop}
          maintenanceNodes={maintenanceNodes}
          guestsMigrating={guestsMigrating}
          migrationProgress={migrationProgress}
        />
      </div>

      <div className={view.fixed ? 'flex-1 min-h-0 grid grid-cols-[3fr_2fr] gap-3' : 'flex flex-col gap-3'}>
        <section className={`${WALL_PANEL} flex flex-col`} aria-label="Cluster map">
          <div className={label}>Cluster map</div>
          <div className={view.fixed ? 'flex-1 min-h-0' : ''}>
            {view.fixed ? <FitBox layoutWidth={mapLayoutWidth}>{map}</FitBox> : map}
          </div>
        </section>

        <div className="flex flex-col gap-3 min-h-0 min-w-0">
          <section className={`${WALL_PANEL} flex flex-col ${view.fixed ? 'flex-1' : 'h-[360px]'}`} aria-label="CPU by node">
            <div className={`${label} mb-2`}>CPU by node</div>
            <div className="flex-1 min-h-0">
              <NodeCompareChart
                wall
                fixedMetric="cpu"
                pixelRatio={(window.devicePixelRatio || 1) * view.scale}
                nodes={compareNodes}
                thresholds={thresholds}
                clusterSpread={data.cluster_spread}
                chartPeriod={chartPeriod}
                chartReady={!!chartJsLoaded}
                migrationHistory={migrationHistory}
              />
            </div>
          </section>
          <section className={`${WALL_PANEL} shrink-0 flex flex-col gap-3`} aria-label="Automation">
            <AutoStatusPill
              size="banner"
              readOnly
              automationStatus={automationStatus}
              automationConfig={automationConfig}
              runHistory={runHistory}
            />
            {automationStatus?.enabled && runs.length > 0 && (
              <div>
                <div className={`${label} mb-1.5`}>Recent checks · 24 h</div>
                <RunStrip runs={runs} ctx={{ now: new Date(now) }} />
              </div>
            )}
            {dataAge && (
              <div className={`text-xs tabular-nums ${DATA_AGE_TONE[dataAge.tone]}`}>Cluster data {dataAge.label}</div>
            )}
          </section>
        </div>
      </div>
    </div>
  );

  return (
    <div
      className={`${PAGE_BG} ${view.fixed ? 'fixed inset-0 overflow-hidden' : ''} ${hint ? '' : 'cursor-none'}`}
      onPointerMove={poke}
      onPointerDown={poke}
    >
      {view.fixed ? (
        <div
          className="pointer-events-none select-none"
          style={{ width: `${view.width}px`, height: `${view.height}px`, transform: `scale(${view.scale})`, transformOrigin: 'top left' }}
        >
          {body}
        </div>
      ) : (
        <div className="pointer-events-none select-none">{body}</div>
      )}

      <div
        className={`fixed top-3 right-3 z-50 flex items-center gap-2 transition-opacity duration-300 ${hint ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        {fs.supported && !fs.isFs && (
          <button type="button" onClick={fs.request} className={BTN_SECONDARY} title="Browser full screen">
            <Maximize size={14} /> Full screen
          </button>
        )}
        <button type="button" onClick={onExit} className={BTN_SECONDARY} title="Leave wall mode (Esc)" aria-keyshortcuts="Escape">
          <X size={14} /> Exit
        </button>
      </div>
    </div>
  );
}
