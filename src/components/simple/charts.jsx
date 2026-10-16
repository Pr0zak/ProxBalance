// Small hand-rolled SVG/HTML charts for the Simple view: ring gauges, a
// donut, sparklines and per-day bars. Real data only; a missing value draws
// nothing (or "—"), never zero.

const { useState, useRef, useLayoutEffect } = React;

/**
 * Takes the height its card has left (flex-1) but at least `min` px, and
 * hands that height to `children(h)`, so a chart grows when its widget is
 * made taller (for example beside a tall widget). The content is absolutely
 * positioned, so it never pushes the card taller itself.
 */
export function FillBox({ min, children }) {
  const ref = useRef(null);
  const [h, setH] = useState(min);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setH(Math.max(min, Math.floor(el.clientHeight)));
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return (
    <div ref={ref} className="relative flex-1 min-h-0" style={{ minHeight: min }}>
      <div className="absolute inset-0">{children(h)}</div>
    </div>
  );
}

export const STROKE = {
  ok: 'stroke-green-500', info: 'stroke-blue-500', warn: 'stroke-amber-500', bad: 'stroke-red-500',
  none: 'stroke-slate-400', cpu: 'stroke-sky-500', mem: 'stroke-violet-500',
};
export const FILL = {
  ok: 'bg-green-500', info: 'bg-blue-500', warn: 'bg-amber-500', bad: 'bg-red-500',
  none: 'bg-slate-300 dark:bg-slate-600', cpu: 'bg-sky-500', mem: 'bg-violet-500',
};
const TRACK = 'stroke-slate-200 dark:stroke-slate-700';

/**
 * A ring gauge, 0..max, with the value (or `center`) in the middle.
 * `limit` adds a short tick on the ring where the limit sits.
 */
export function Ring({ value, max = 100, tone = 'ok', size = 64, stroke = 7, center, sub, limit, label }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const has = typeof value === 'number' && isFinite(value);
  const frac = has ? Math.max(0, Math.min(1, value / max)) : 0;
  const limitAngle = typeof limit === 'number' ? (limit / max) * 360 : null;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img"
      aria-label={label ? `${label}: ${has ? (center ?? `${Math.round(value)}`) : 'no data'}` : undefined}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={TRACK} />
        {has && frac > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
            strokeDasharray={`${c * frac} ${c}`} className={STROKE[tone] || STROKE.none} />
        )}
      </svg>
      {limitAngle != null && (
        <span aria-hidden="true" className="absolute left-1/2 top-1/2 w-0.5 bg-pb-text dark:bg-gray-200 rounded"
          style={{ height: stroke + 4, transform: `translate(-50%, -50%) rotate(${limitAngle}deg) translateY(-${r}px)` }} />
      )}
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`font-bold tabular-nums text-pb-text dark:text-gray-100 ${size >= 72 ? 'text-lg' : 'text-sm'}`}>
          {center ?? (has ? `${Math.round(value)}%` : '—')}
        </span>
        {sub && <span className="text-[10px] text-pb-text2 dark:text-gray-400 mt-0.5">{sub}</span>}
      </div>
    </div>
  );
}

/** A donut from parts [{ value, tone }], with `center` in the middle. */
export function Donut({ parts, size = 96, stroke = 12, center, sub, label, small = false }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = parts.reduce((a, p) => a + (p.value || 0), 0);
  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className={TRACK} />
        {total > 0 && parts.filter(p => p.value > 0).map((p, i) => {
          const len = (p.value / total) * c;
          // A hairline gap between parts so neighbours read as separate.
          const gap = parts.filter(q => q.value > 0).length > 1 ? Math.min(2, len / 2) : 0;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke}
              strokeDasharray={`${Math.max(0, len - gap)} ${c}`} strokeDashoffset={-offset} className={STROKE[p.tone] || STROKE.none} />
          );
          offset += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className={`${small ? 'text-sm' : 'text-xl'} font-bold tabular-nums text-pb-text dark:text-gray-100`}>{center}</span>
        {sub && <span className={`text-[10px] text-pb-text2 dark:text-gray-400 ${small ? 'mt-0.5' : 'mt-1'}`}>{sub}</span>}
      </div>
    </div>
  );
}

/**
 * Sparkline of one or more series (arrays of numbers or null) on 0..max.
 * The first series gets a soft area under it. `limit` draws a dashed line.
 */
export function Spark({ series, max = 100, limit, height = 40, label }) {
  const W = 100, H = height;
  const n = Math.max(0, ...series.map(s => s.values.length));
  if (n < 2) return <div className="text-[11px] text-pb-text3 dark:text-gray-500" style={{ height }}>No history yet</div>;
  const top = Math.max(max, ...series.flatMap(s => s.values.filter(v => typeof v === 'number')));
  const x = (i) => (i / (n - 1)) * W;
  const y = (v) => H - (Math.max(0, Math.min(top, v)) / top) * (H - 2) - 1;
  const runs = (values) => {
    const out = [];
    let cur = [];
    values.forEach((v, i) => {
      if (typeof v === 'number' && isFinite(v)) cur.push([x(i), y(v)]);
      else if (cur.length) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  };
  const pts = (r) => r.map(([a, b]) => `${a.toFixed(2)},${b.toFixed(2)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full block" style={{ height }} role="img" aria-label={label}>
      {series[0] && runs(series[0].values).filter(r => r.length > 1).map((r, i) => (
        <polygon key={`a${i}`} points={`${r[0][0]},${H} ${pts(r)} ${r[r.length - 1][0]},${H}`} className={series[0].area || 'fill-sky-500/15'} />
      ))}
      {typeof limit === 'number' && limit < top && (
        <line x1="0" x2={W} y1={y(limit)} y2={y(limit)} strokeWidth="1" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" className="stroke-amber-500/80" />
      )}
      {series.map((s, si) => runs(s.values).map((r, i) => (
        <polyline key={`${si}-${i}`} points={pts(r)} fill="none" strokeWidth="1.5" strokeLinejoin="round"
          vectorEffect="non-scaling-stroke" className={STROKE[s.tone] || STROKE.cpu} />
      )))}
    </svg>
  );
}

/**
 * Vertical bars, one per day, each stacked from `parts` [{ value, tone }].
 * Tap (or hover) a bar for its `text`. Days with `known: false` are drawn
 * as a dashed outline (not recorded), not as zero.
 */
export function DayBars({ days, height = 64, showEvery = 1, fill = false }) {
  const [picked, setPicked] = useState(null);
  const max = Math.max(1, ...days.map(d => d.parts.reduce((a, p) => a + p.value, 0)));
  const sel = days.find(d => d.key === picked) || null;
  return (
    <div className={fill ? 'h-full flex flex-col' : ''}>
      <div className={`flex items-end gap-1 ${fill ? 'flex-1 min-h-0' : ''}`} style={fill ? undefined : { height }}>
        {days.map(d => {
          const total = d.parts.reduce((a, p) => a + p.value, 0);
          return (
            <button key={d.key} type="button" title={d.text} aria-label={`${d.label}: ${d.text}`} aria-pressed={picked === d.key}
              onClick={() => setPicked(p => (p === d.key ? null : d.key))}
              className={`flex-1 min-w-0 h-full flex flex-col justify-end rounded-sm ${picked === d.key ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}>
              {d.known === false ? (
                <span className="block w-full h-full rounded-sm border border-dashed border-pb-border dark:border-slate-600" />
              ) : total === 0 ? (
                <span className="block w-full h-0.5 rounded-sm bg-slate-200 dark:bg-slate-700" />
              ) : (
                <span className="flex flex-col-reverse w-full rounded-sm overflow-hidden" style={{ height: `${(total / max) * 100}%` }}>
                  {d.parts.filter(p => p.value > 0).map((p, i) => (
                    <span key={i} className={`block w-full ${FILL[p.tone] || FILL.none}`} style={{ height: `${(p.value / total) * 100}%` }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flex gap-1 mt-1 text-[10px] text-pb-text3 dark:text-gray-500">
        {days.map((d, i) => (
          <span key={d.key} className={`flex-1 min-w-0 whitespace-nowrap ${i === days.length - 1 ? 'flex justify-end' : 'flex justify-center'}`}>
            {(days.length - 1 - i) % showEvery === 0 ? d.label : ''}
          </span>
        ))}
      </div>
      {sel && <p className="text-xs mt-1 text-pb-text dark:text-gray-200">{sel.label}: {sel.text}</p>}
    </div>
  );
}

/** A small legend row: [{ tone, text }]. */
export function Legend({ items }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-pb-text2 dark:text-gray-400">
      {items.map((it, i) => (
        <span key={i} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`inline-block w-2.5 h-2.5 rounded-sm ${FILL[it.tone] || FILL.none}`} />{it.text}
        </span>
      ))}
    </div>
  );
}
