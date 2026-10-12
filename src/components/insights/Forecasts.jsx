import { CheckCircle, ChevronDown } from '../Icons.jsx';
import { INNER_CARD, TAP_TARGET } from '../../utils/designTokens.js';
import { RANGE_ADJ, RANGE_LABEL, Loading, Failed } from './shared.jsx';
import ForecastChart from './ForecastChart.jsx';
import {
  FORECAST_HORIZON_DAYS, VISIBLE_FORECASTS, projectedCrossings, engineCrossings,
  headline, clearText, nowText, sharedDayRange,
} from './forecastModel.js';

const { useState, useEffect } = React;

/**
 * True once both sources have loaded and neither projects anything — the
 * Insights page then shows the one-line ForecastsClear strip instead.
 */
export function forecastsEmpty(trendsState, engineState) {
  if (trendsState.loading || engineState.loading || engineState.error) return false;
  const trendReady = trendsState.data?.data_available && !trendsState.error;
  if (!trendReady) return false;
  return projectedCrossings(trendsState.data).length === 0 && engineCrossings(engineState.data?.forecasts).length === 0;
}

/** One-line Forecasts summary used when nothing is projected. */
export function ForecastsClear({ days }) {
  return (
    <div className="flex items-start sm:items-center gap-2 text-sm text-pb-text2 dark:text-gray-400">
      <CheckCircle size={16} className="shrink-0 mt-0.5 sm:mt-0 text-green-600 dark:text-green-400" />
      <span>
        <span className="font-semibold text-pb-text dark:text-white">Forecasts:</span>{' '}
        {clearText()} on the {RANGE_ADJ[days]} trend.
      </span>
    </div>
  );
}

const LINK_BTN = `${TAP_TARGET} inline-flex items-center gap-1 text-sm text-blue-600 dark:text-blue-400 hover:underline`;

function Crossing({ c, range, chartReady, days }) {
  const [open, setOpen] = useState(false);
  const text = headline(c);
  return (
    <div className={`${INNER_CARD} p-3 space-y-2`}>
      <div className="text-sm font-medium text-pb-text dark:text-white">
        {text}
        {c.rough && <span className="font-normal text-pb-text3 dark:text-gray-500"> · rough estimate</span>}
      </div>
      <ForecastChart metric={c.metric} forecast={c.forecast} range={range} chartReady={chartReady} label={text} />
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className={LINK_BTN}>
        Details
        <ChevronDown size={14} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="text-xs text-pb-text2 dark:text-gray-400 space-y-0.5">
          <div>{nowText(c.m)}</div>
          <div>
            Straight-line fit over {typeof c.m.data_points === 'number' ? c.m.data_points.toLocaleString() : '—'} samples from the last {RANGE_LABEL[days]};
            fit quality {c.m.confidence} (r² {c.m.r_squared ?? '—'}).
            The dashed line continues that trend; real load rarely moves in a straight line.
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Which nodes are heading for a limit, from the Node trends fit for the window
 * picked above: a headline and chart per node metric, soonest first. The
 * recommendation engine's own 48-hour alerts (the ones automation acts on)
 * are listed underneath when there are any.
 */
export default function Forecasts({ trendsState, days, engineState, chartReady, loadChartJs }) {
  const [showAll, setShowAll] = useState(false);
  const { loading, data, error } = engineState;
  const trendReady = trendsState.data?.data_available && !trendsState.error;
  const crossings = trendReady ? projectedCrossings(trendsState.data) : [];
  const engine = engineCrossings(data?.forecasts);
  const shown = showAll ? crossings : crossings.slice(0, VISIBLE_FORECASTS);
  const range = sharedDayRange(shown, days);

  useEffect(() => {
    if (crossings.length && !chartReady && typeof loadChartJs === 'function') loadChartJs();
  }, [crossings.length, chartReady]);

  if (trendsState.loading && !trendsState.data) return <Loading />;

  return (
    <div className={`space-y-3 transition-opacity ${trendsState.loading ? 'opacity-50' : ''}`}>
      {!trendReady ? <p className="text-sm text-pb-text2 dark:text-gray-400">Trend data unavailable for this window.</p>
        : crossings.length === 0 ? (
          <div className="flex items-start gap-2 text-sm text-pb-text2 dark:text-gray-400">
            <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
            <span>{clearText(FORECAST_HORIZON_DAYS)} on the {RANGE_ADJ[days]} trend.</span>
          </div>
        ) : shown.map(c => <Crossing key={`${c.node}-${c.metric}`} c={c} range={range} chartReady={chartReady} days={days} />)}

      {crossings.length > VISIBLE_FORECASTS && (
        <button type="button" onClick={() => setShowAll(s => !s)} className={LINK_BTN}>
          {showAll ? 'Show fewer' : `Show all ${crossings.length}`}
        </button>
      )}

      {error ? <Failed error={error} />
        : !loading && engine.length > 0 && (
          <div className="text-sm space-y-1">
            <div className="text-pb-text2 dark:text-gray-400">Automation's 48-hour check also expects:</div>
            <ul className="list-disc pl-5 text-pb-text dark:text-gray-200">
              {engine.map((c, i) => <li key={i}>{headline(c)}</li>)}
            </ul>
          </div>
        )}
    </div>
  );
}
