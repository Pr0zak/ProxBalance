// Small hand-rolled SVG multi-line chart for real time-series (percent scale).
// Used in the node and guest detail panels so they don't depend on Chart.js.
//
// `band` draws a flat grey area from 0 up to that value (a node's unmovable
// CPU, which is a current figure rather than a history). Missing samples leave
// a gap instead of dropping to zero. The y axis grows past 100 when a series
// does (guest CPU is a share of its own cores and can read above 100).
export default function MiniTrendChart({ points = [], series = [], height = 90, maxY = 100, unit = '%', band = null, bandLabel = null }) {
  const W = 320, H = height, pad = 4;
  const raw = Array.isArray(points) ? points.filter(p => p && typeof p.time !== 'undefined') : [];
  // Average long series down to ~120 points so a day of 1-minute samples reads
  // as a line, not a solid block.
  const MAX_POINTS = 120;
  let data = raw;
  if (raw.length > MAX_POINTS) {
    const step = raw.length / MAX_POINTS;
    data = [];
    for (let b = 0; b < MAX_POINTS; b++) {
      const win = raw.slice(Math.floor(b * step), Math.floor((b + 1) * step));
      const pt = { time: win[0].time };
      series.forEach(s => {
        const vals = win.map(p => p[s.key]).filter(v => typeof v === 'number' && isFinite(v));
        pt[s.key] = vals.length ? vals.reduce((a, v) => a + v, 0) / vals.length : null;
      });
      data.push(pt);
    }
  }

  if (data.length < 2) {
    return <div className="text-xs text-pb-text2 dark:text-gray-500 italic py-6 text-center">Not enough history for this period yet</div>;
  }

  const peak = Math.max(0, ...data.flatMap(p => series.map(s => (typeof p[s.key] === 'number' ? p[s.key] : 0))));
  const top = peak > maxY ? Math.ceil(peak / 25) * 25 : maxY;
  const n = data.length;
  const x = (i) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - (Math.max(0, Math.min(top, v)) / top) * (H - 2 * pad);

  // Split a series into runs of real numbers so gaps stay gaps.
  const runs = (key) => {
    const out = [];
    let cur = [];
    data.forEach((p, i) => {
      if (typeof p[key] === 'number' && isFinite(p[key])) cur.push(`${x(i).toFixed(1)},${y(p[key]).toFixed(1)}`);
      else if (cur.length) { out.push(cur); cur = []; }
    });
    if (cur.length) out.push(cur);
    return out;
  };

  const t0 = new Date(data[0].time * (data[0].time < 1e12 ? 1000 : 1));
  const multiDay = (data[n - 1].time - data[0].time) > (data[0].time < 1e12 ? 2 * 86400 : 2 * 86400000);
  const startLabel = multiDay
    ? t0.toLocaleDateString([], { month: 'short', day: 'numeric' })
    : t0.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label={series.map(s => s.label).join(', ')}>
        {typeof band === 'number' && band >= 0.5 && (
          <rect x={pad} y={y(band)} width={W - 2 * pad} height={H - pad - y(band)} className="fill-slate-400/20 dark:fill-slate-400/15" />
        )}
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1={pad} x2={W - pad} y1={y(top * g)} y2={y(top * g)} stroke="currentColor" className="text-gray-300 dark:text-slate-700" strokeWidth="0.5" />
        ))}
        {series.map(s => runs(s.key).map((r, i) => (
          <polyline key={`${s.key}-${i}`} points={r.join(' ')} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )))}
      </svg>
      <div className="flex justify-between text-[10px] text-pb-text3 dark:text-gray-500 tabular-nums">
        <span>{startLabel}</span>
        {top !== 100 && <span>max {top}{unit}</span>}
        <span>now</span>
      </div>
      <div className="flex items-center gap-3 flex-wrap mt-1 text-[11px] text-pb-text2 dark:text-gray-400">
        {series.map(s => {
          const lastPt = [...data].reverse().find(p => typeof p[s.key] === 'number');
          return (
            <span key={s.key} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-0.5 rounded" style={{ background: s.color }} />
              {s.label} {lastPt && <span className="font-semibold text-pb-text dark:text-gray-200 tabular-nums">{lastPt[s.key].toFixed(1)}{unit}</span>}
            </span>
          );
        })}
        {typeof band === 'number' && band >= 0.5 && (
          <span className="flex items-center gap-1">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-slate-400/40" />
            {bandLabel || 'unmovable'}
          </span>
        )}
      </div>
    </div>
  );
}
