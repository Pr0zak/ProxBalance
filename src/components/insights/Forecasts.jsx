import { CheckCircle } from '../Icons.jsx';
import { INNER_CARD } from '../../utils/designTokens.js';
import { fetchForecasts } from '../../api/client.js';
import { RANGE_ADJ, formatHorizon, trendCrossings, useLoad, Loading, Failed } from './shared.jsx';

const SUBHEAD = 'text-xs font-semibold uppercase tracking-wide text-pb-text3 dark:text-gray-500';

function AllClear({ children }) {
  return (
    <div className="flex items-start gap-2 text-sm text-pb-text2 dark:text-gray-400">
      <CheckCircle size={16} className="shrink-0 mt-0.5 text-green-600 dark:text-green-400" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Two sources of projection, each scoped to its own window so they can't
 * contradict each other:
 *  1. The Node trends fit for the window picked above (same data, same list
 *     as the amber line there), with a one-year horizon.
 *  2. The recommendation engine's cached alerts, which always fit the last
 *     7 days of score history and look 48 hours ahead.
 */
export default function Forecasts({ trendsState, days, thresholds }) {
  const [{ loading, data, error }] = useLoad(() => fetchForecasts());
  const trendReady = trendsState.data?.data_available && !trendsState.error;
  const crossings = trendReady ? trendCrossings(trendsState.data, thresholds) : [];
  const engine = data?.forecasts || [];

  return (
    <div className="space-y-4">
      <section className={`space-y-2 transition-opacity ${trendsState.loading && trendsState.data ? 'opacity-50' : ''}`}>
        <h3 className={SUBHEAD}>From the {RANGE_ADJ[days]} trend · within a year</h3>
        {trendsState.loading && !trendsState.data ? <Loading />
          : !trendReady ? <p className="text-sm text-pb-text2 dark:text-gray-400">Trend data unavailable for this window.</p>
          : crossings.length === 0 ? <AllClear>No node is on a confident course to cross a threshold within a year on the {RANGE_ADJ[days]} trend.</AllClear>
          : crossings.map(({ node, metric, label, m, threshold }) => (
            <div key={`${node}-${metric}`} className={`${INNER_CARD} p-3 text-sm`}>
              <div className="font-medium text-pb-text dark:text-white">
                {node} · {label}
                <span className="ml-2 text-orange-600 dark:text-orange-400">crosses {threshold ? `${threshold}% ` : ''}in ~{formatHorizon(m.hours_to_threshold)}</span>
              </div>
              <div className="text-pb-text2 dark:text-gray-400">
                Now {Math.round(m.current_avg)}%, {m.rate_display} · {m.confidence} confidence (r² {m.r_squared})
              </div>
            </div>
          ))}
      </section>

      <section className="space-y-2">
        <h3 className={SUBHEAD}>Recommendation engine · next 48 h</h3>
        <p className="text-xs text-pb-text3 dark:text-gray-500 -mt-1">Fitted on the last 7 days of score history whatever window is picked above; these alerts feed automated migrations.</p>
        {loading && !data ? <Loading />
          : error ? <Failed error={error} />
          : engine.length === 0 ? <AllClear>No node is projected to cross a threshold in the next 48 hours.</AllClear>
          : engine.map((f, i) => {
            const hours = f.estimated_hours_to_crossing ?? f.hours_to_threshold;
            return (
              <div key={i} className={`${INNER_CARD} p-3 text-sm`}>
                <div className="font-medium text-pb-text dark:text-white">
                  {f.node || f.source_node}{f.metric ? ` · ${f.metric}` : ''}
                  {hours != null && <span className="ml-2 text-orange-600 dark:text-orange-400">crosses {f.threshold != null ? `${f.threshold}% ` : ''}in {formatHorizon(hours)}</span>}
                  {f.severity && <span className="ml-2 text-xs uppercase text-pb-text3 dark:text-gray-500">{f.severity}</span>}
                </div>
                <div className="text-pb-text2 dark:text-gray-400">{f.message || f.reason || ''}</div>
                {f.confidence && <div className="text-xs text-pb-text3 dark:text-gray-500">{f.confidence} confidence</div>}
              </div>
            );
          })}
      </section>
    </div>
  );
}
