import { GLASS_CARD_SUBTLE } from '../../utils/designTokens.js';

const VARIANTS = [
  { id: 'current', label: 'Current', desc: 'Single number + checkmark icon (today)' },
  { id: '1', label: '1 — Sparkline', desc: 'Number + tiny inline sparkline of cluster health over time' },
  { id: '2', label: '2 — Delta', desc: 'Number + ↑↓ delta vs 24h ago' },
  { id: '3', label: '3 — Gauge', desc: 'Circular gauge at 0-100% fill' },
  { id: '4', label: '4 — Multi-metric', desc: 'Split into 4 mini stats (CPU, Mem, IOWait, Score)' },
  { id: '5', label: '5 — Stoplight', desc: 'Big colored dot + short reason text' },
  { id: '6', label: '6 — Expandable', desc: 'Number + chevron, hints at clickable drill-in' },
];

export default function ClusterHealthPicker({ value, onChange }) {
  return (
    <div className={`${GLASS_CARD_SUBTLE} mb-4`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">Preview</div>
          <div className="text-sm text-gray-300">Cluster Health card</div>
        </div>
        <div className="flex flex-wrap gap-2 ml-auto">
          {VARIANTS.map(v => (
            <button
              key={v.id}
              onClick={() => onChange(v.id)}
              title={v.desc}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                value === v.id
                  ? 'bg-amber-600/80 border-amber-500 text-white shadow'
                  : 'bg-slate-800/60 border-slate-700/50 text-gray-300 hover:bg-slate-700/40'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
      <div className="text-[11px] text-gray-500 mt-2">
        {VARIANTS.find(v => v.id === value)?.desc}
      </div>
    </div>
  );
}
