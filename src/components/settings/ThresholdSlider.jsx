/**
 * Threshold slider that shows where every online node sits on its scale right
 * now. Each node is a tick on the track, the part of the track beyond the
 * thumb is shaded as the "would trigger" zone, and a one-line readout says
 * which nodes are over now and which crossed it in the last 24h. Lets the
 * operator pick a threshold against real load before saving.
 *
 * Labels never stack: nodes whose labels would overlap are collapsed into one
 * label with a combined tooltip (each node keeps its own thin tick). Nodes below
 * the slider minimum (or above its maximum) are drawn as an edge marker with a
 * "<10%" / ">95%" label rather than silently pinned to the end.
 */

const { useState, useEffect, useRef } = React;

const METRIC_KEYS = {
  cpu: { now: m => m.current_cpu, peak: m => m.max_cpu },
  mem: { now: m => m.current_mem, peak: m => m.max_mem },
  iowait: { now: m => m.current_iowait, peak: m => m.max_iowait },
};

const THUMB_PX = 16;      // native range thumb width; its centre travels 8px..(W-8px)
const CHAR_PX = 5.6;      // approx. width of one 10px label glyph
const LABEL_GAP_PX = 6;   // minimum space between two labels

// Horizontal position matching the native thumb centre for fraction f (0..1).
const trackLeft = f => `calc(${THUMB_PX / 2}px + (100% - ${THUMB_PX}px) * ${f})`;
const pct = v => `${Math.round(v)}%`;

/** Track width in px, kept current with a ResizeObserver. */
function useWidth() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width];
}

/** Value text for one node, with the off-scale marker when it falls outside [min, max]. */
const valueText = (n, min, max) => (n.now < min ? `<${min}%` : n.now > max ? `>${max}%` : pct(n.now));

/** Label for a group of nodes that share one tick. */
function groupLabel(items, min, max) {
  if (items.length === 1) return `${items[0].name} ${valueText(items[0], min, max)}`;
  const lo = items[0];
  const hi = items[items.length - 1];
  const range = valueText(lo, min, max) === valueText(hi, min, max)
    ? valueText(lo, min, max)
    : `${valueText(lo, min, max)}–${valueText(hi, min, max)}`;
  const names = items.length === 2 ? items.map(n => n.name).join(', ') : `${items.length} nodes`;
  return `${names} ${range}`;
}

/**
 * Merge neighbouring nodes into groups until no two labels overlap at the
 * current track width. Off-scale nodes on each side always form one group.
 */
function groupNodes(list, min, max, width) {
  const usable = Math.max(1, width - THUMB_PX);
  const x = f => THUMB_PX / 2 + usable * f;
  const make = (items) => {
    const f0 = items[0].f;
    const f1 = items[items.length - 1].f;
    const label = groupLabel(items, min, max);
    const labelW = label.length * CHAR_PX + 4;
    const center = x((f0 + f1) / 2);
    // Label box clamped inside the track so edge labels don't spill out.
    const labelLeft = Math.max(0, Math.min(Math.max(0, width - labelW), center - labelW / 2));
    return { items, f0, f1, label, labelW, labelLeft };
  };
  const groups = [];
  for (const n of list) {
    const last = groups[groups.length - 1];
    const sameEdge = last && ((n.below && last.items[0].below) || (n.above && last.items[0].above));
    if (sameEdge) groups[groups.length - 1] = make([...last.items, n]);
    else groups.push(make([n]));
  }
  if (width <= 0) return groups;
  let merged = true;
  while (merged && groups.length > 1) {
    merged = false;
    for (let i = 0; i < groups.length - 1; i++) {
      const a = groups[i];
      const b = groups[i + 1];
      if (b.labelLeft < a.labelLeft + a.labelW + LABEL_GAP_PX) {
        groups.splice(i, 2, make([...a.items, ...b.items]));
        merged = true;
        break;
      }
    }
  }
  return groups;
}

export default function ThresholdSlider({ label, value, onChange, min, max, step = 5, nodes, metric, description }) {
  const [trackRef, width] = useWidth();
  const keys = METRIC_KEYS[metric];
  const frac = v => Math.max(0, Math.min(1, (v - min) / (max - min)));
  const list = Object.values(nodes || {})
    .filter(n => n && n.status === 'online' && n.metrics)
    .map(n => {
      const now = Number(keys.now(n.metrics)) || 0;
      const peak = Number(keys.peak(n.metrics)) || 0;
      return { name: n.name, now, peak, f: frac(now), below: now < min, above: now > max, over: now > value, peakOver: peak > value };
    })
    .sort((a, b) => a.now - b.now);

  const groups = groupNodes(list, min, max, width);
  const overNow = list.filter(n => n.over);
  const peakOnly = list.filter(n => !n.over && n.peakOver);
  const highest = list[list.length - 1];

  const tooltip = g => g.items.map(n =>
    `${n.name}: ${pct(n.now)} now${n.below ? ` (below the ${min}% scale)` : n.above ? ` (above the ${max}% scale)` : ''}, ${pct(n.peak)} 24h peak`
  ).join('\n');

  return (
    <div>
      <label className="block text-sm font-medium text-pb-text dark:text-gray-300 mb-2">
        {label}: <span className="font-bold text-blue-600 dark:text-blue-400">{value}%</span>
      </label>

      {/* Node labels: one row, overlapping ones collapsed into a group */}
      <div ref={trackRef} className="relative h-4" aria-hidden={list.length === 0}>
        {width > 0 && groups.map(g => {
          const anyOver = g.items.some(n => n.over);
          return (
            <span
              key={g.items.map(n => n.name).join('|')}
              className={`absolute top-0 text-[10px] leading-none font-medium whitespace-nowrap tabular-nums cursor-default ${anyOver ? 'text-amber-600 dark:text-amber-400' : 'text-pb-text2 dark:text-gray-400'}`}
              style={{ left: g.labelLeft, width: g.labelW, textAlign: 'center' }}
              title={tooltip(g)}
            >
              {g.label}
            </span>
          );
        })}
      </div>

      {/* Track (drawn by us, under a transparent native range input) */}
      <div className="relative h-5">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 rounded-lg bg-slate-300 dark:bg-slate-600 overflow-hidden">
          <div className="absolute inset-y-0 right-0 bg-amber-400/50 dark:bg-amber-500/30" style={{ left: trackLeft(frac(value)) }} />
        </div>
        {groups.map(g => (
          <div key={g.items.map(n => n.name).join('|')} title={tooltip(g)}>
            {g.items.map(n => (n.below || n.above ? (
              // Off-scale marker: a small arrow pointing off the end of the track.
              <div
                key={n.name}
                className={`absolute top-1/2 -translate-y-1/2 w-0 h-0 border-y-[5px] border-y-transparent ${n.below
                  ? 'left-0 border-r-[6px] border-r-slate-500 dark:border-r-slate-200'
                  : `right-0 border-l-[6px] ${n.over ? 'border-l-amber-500' : 'border-l-slate-500 dark:border-l-slate-200'}`}`}
              />
            ) : (
              <div
                key={n.name}
                className={`absolute top-0.5 bottom-0.5 w-1 -ml-0.5 rounded-sm ${n.over ? 'bg-amber-500' : 'bg-slate-500 dark:bg-slate-200'}`}
                style={{ left: trackLeft(n.f) }}
              />
            )))}
          </div>
        ))}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full bg-transparent appearance-none cursor-pointer accent-blue-600"
          aria-label={label}
        />
      </div>

      <div className="flex justify-between text-xs text-pb-text2 dark:text-gray-500 mt-1">
        <span>{min}%</span>
        <span>Aggressive</span>
        <span>Relaxed</span>
        <span>{max}%</span>
      </div>

      {list.length > 0 ? (
        <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">
          {overNow.length > 0 ? (
            <span className="font-semibold text-amber-600 dark:text-amber-400">
              Over {value}% now: {overNow.map(n => `${n.name} (${pct(n.now)})`).join(', ')}. Recommendations will target {overNow.length === 1 ? 'it' : 'them'}.
            </span>
          ) : (
            <span>No node is over {value}% right now (highest: {highest.name} at {pct(highest.now)}).</span>
          )}
          {peakOnly.length > 0 && (
            <span className="ml-1">
              Crossed it in the last 24h: {peakOnly.map(n => `${n.name} (peak ${pct(n.peak)})`).join(', ')}.
            </span>
          )}
        </p>
      ) : (
        <p className="text-xs text-pb-text2 dark:text-gray-400 mt-1">{description}</p>
      )}
    </div>
  );
}
