// Small hand-rolled SVG multi-line chart for real time-series (0-100% scale).
// Used in the Node/Guest detail modals so they don't depend on Chart.js being loaded.
export default function MiniTrendChart({ points = [], series = [], height = 90, maxY = 100, unit = '%' }) {
  const W = 320, H = height, pad = 4;
  const data = Array.isArray(points) ? points.filter(p => p && typeof p.time !== 'undefined') : [];

  if (data.length < 2) {
    return <div className="text-xs text-pb-text2 dark:text-gray-500 italic py-6 text-center">Not enough history yet</div>;
  }

  const n = data.length;
  const x = (i) => pad + (i / (n - 1)) * (W - 2 * pad);
  const y = (v) => H - pad - (Math.max(0, Math.min(maxY, v)) / maxY) * (H - 2 * pad);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75].map(g => (
          <line key={g} x1={pad} x2={W - pad} y1={y(maxY * g)} y2={y(maxY * g)} stroke="currentColor" className="text-gray-300 dark:text-slate-700" strokeWidth="0.5" />
        ))}
        {series.map(s => {
          const pts = data.map((p, i) => `${x(i).toFixed(1)},${y(p[s.key] || 0).toFixed(1)}`).join(' ');
          return <polyline key={s.key} points={pts} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinejoin="round" />;
        })}
      </svg>
      <div className="flex items-center gap-3 flex-wrap mt-1 text-[10px] text-pb-text2 dark:text-gray-400">
        {series.map(s => {
          const last = data[data.length - 1][s.key] || 0;
          return (
            <span key={s.key} className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />
              {s.label} <span className="font-semibold text-pb-text dark:text-gray-200 tabular-nums">{last.toFixed(1)}{unit}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
