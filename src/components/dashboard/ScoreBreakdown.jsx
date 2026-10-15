import { TAP_TARGET } from '../../utils/designTokens.js';
/**
 * Line-by-line explanation of a node's headroom, from /api/node-scores
 * (`penalty_items` + `score_breakdown`), and the cluster spread figure from
 * /api/analyze (`cluster_spread`). Missing figures show "—", never 0.
 */
import { ChevronDown } from '../Icons.jsx';
import MoreInfo from '../MoreInfo.jsx';

const { useState } = React;

const DASH = '—';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

// 1 decimal, trailing ".0" dropped.
const fmt1 = (v) => (isNum(v) ? v.toFixed(1).replace(/\.0$/, '') : DASH);

/** One reading with its unit: "82%", "1.35x", "1.5%/day". */
function fmtReading(value, unit) {
  if (!isNum(value)) return null;
  if (unit === 'x') return `${value.toFixed(2)}x`;
  return `${fmt1(value)}${unit || ''}`;
}

/** "CPU 7-day avg 82% (over 70%)" — the label alone when the penalty came from a label. */
export function penaltyItemText(item) {
  const reading = fmtReading(item.value, item.unit);
  const limit = fmtReading(item.threshold, item.unit);
  if (!reading) return item.label;
  return limit ? `${item.label} ${reading} (over ${limit})` : `${item.label} ${reading}`;
}

/**
 * Itemised headroom for one node-scores entry: every non-zero penalty with the
 * reading behind it, then the arithmetic (100 − base − penalties = headroom).
 * The base-load parts open on tap.
 */
export function ScoreBreakdown({ score, compact = false }) {
  const [showBase, setShowBase] = useState(false);
  const sb = score?.score_breakdown;
  const items = Array.isArray(score?.penalty_items) ? score.penalty_items : null;
  if (!sb || !items) {
    return <p className="text-xs text-pb-text2 dark:text-gray-400">Breakdown {DASH} (not reported by this server version)</p>;
  }
  const text = compact ? 'text-[11px]' : 'text-xs';

  return (
    <div className={`${text} space-y-1.5`}>
      {items.length === 0 ? (
        <p className="text-green-700 dark:text-green-400">No penalties.</p>
      ) : (
        <ul className="space-y-1">
          {items.map(item => (
            <li key={item.key} className="flex items-start justify-between gap-3">
              <span className="min-w-0 text-pb-text dark:text-gray-200">
                {penaltyItemText(item)}
                {item.adjustments?.length > 0 && (
                  <span className="block text-[10px] text-pb-text2 dark:text-gray-400">
                    {item.base_points} pts {item.adjustments.join(', ')}
                  </span>
                )}
              </span>
              <span className="shrink-0 tabular-nums font-semibold text-red-700 dark:text-red-300">+{fmt1(item.points)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-1.5 border-t border-pb-border dark:border-slate-700/60">
        <button
          type="button"
          onClick={() => setShowBase(s => !s)}
          aria-expanded={showBase}
          className={`${TAP_TARGET} w-full flex items-center justify-between gap-3 py-0.5 text-left text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200`}
        >
          <span className="flex items-center gap-1">
            <ChevronDown size={12} className={`transition-transform duration-200 ${showBase ? 'rotate-180' : ''}`} />
            Base load (weighted)
          </span>
          <span className="tabular-nums font-semibold text-pb-text dark:text-gray-200">+{fmt1(sb.base_points)}</span>
        </button>
        {showBase && (
          <ul className="mt-1 ml-4 space-y-0.5 text-[11px] text-pb-text2 dark:text-gray-400">
            {sb.base.map(b => (
              <li key={b.key} className="flex justify-between gap-3">
                <span className="min-w-0">{b.label} {fmt1(b.value)} × {Math.round(b.weight * 100)}%</span>
                <span className="shrink-0 tabular-nums">{fmt1(b.points)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="tabular-nums text-pb-text2 dark:text-gray-400">
        {sb.capped
          ? <>Score {fmt1(sb.score)} is over 100, so headroom is <span className="font-semibold text-pb-text dark:text-gray-200">0</span>.</>
          : <>100 − base {fmt1(sb.base_points)} − penalties {fmt1(sb.penalty_points)} = headroom <span className="font-semibold text-pb-text dark:text-gray-200">{fmt1(sb.headroom)}</span></>}
      </p>
      {sb.notes?.map(n => <p key={n} className="text-[11px] text-pb-text2 dark:text-gray-400">{n}.</p>)}
    </div>
  );
}

/** "Memory spread 23 pts · CPU spread 9 pts" across online nodes. */
export function spreadText(spread) {
  const pts = (s) => (s && isNum(s.spread) ? `${Math.round(s.spread)} pts` : DASH);
  return `Memory spread ${pts(spread?.memory)} · CPU spread ${pts(spread?.cpu)}`;
}

/** Spread line plus the ends of each range and the coefficient of variation. */
export function SpreadFigure({ spread }) {
  const row = (label, s) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3">
      <span className="text-pb-text dark:text-gray-200">
        {label} spread <span className="font-semibold tabular-nums">{s && isNum(s.spread) ? `${fmt1(s.spread)} pts` : DASH}</span>
      </span>
      <span className="tabular-nums text-pb-text2 dark:text-gray-400">
        {s ? <>{s.min_node} {fmt1(s.min)}% → {s.max_node} {fmt1(s.max)}% · CV {isNum(s.cv) ? s.cv.toFixed(2) : DASH}</> : DASH}
      </span>
    </div>
  );
  return (
    <div className="text-xs space-y-0.5">
      {row('Memory', spread?.memory)}
      {row('CPU', spread?.cpu)}
      <MoreInfo
        className="text-[11px] text-pb-text2 dark:text-gray-500"
        label="How spread is measured"
        detail="Spread = highest minus lowest node. CPU uses the 15-minute average. CV = standard deviation ÷ mean; lower means more even."
      >
        Across {isNum(spread?.online_nodes) ? spread.online_nodes : DASH} online nodes
      </MoreInfo>
    </div>
  );
}
