import { GLASS_CARD_SUBTLE } from '../../utils/designTokens.js';

const VARIANTS = [
  { id: 'current', label: 'Current', desc: 'Last Run Summary collapsible + per-run cards (today). Chart visible.' },
  { id: '1', label: '1 — Timeline', desc: 'Horizontal strip of dots, one per run. Color = status.' },
  { id: '2', label: '2 — Two-pane', desc: 'Left list, right detail panel for selected run.' },
  { id: '3', label: '3 — Result card + collapsed', desc: 'Big "last result" punch-line card; older runs collapse to "Show N more".' },
  { id: '4', label: '4 — Stat + sparkline', desc: 'Single counts stat with mini sparkline of migrations-per-run.' },
  { id: '5', label: '5 — In-banner', desc: 'Last-run summary appended to the auto-migration banner above (history list stays).' },
];

export default function RunHistoryPicker({ value, onChange }) {
  return (
    <div className={`${GLASS_CARD_SUBTLE} mb-4`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">Preview</div>
          <div className="text-sm text-gray-300">Run History + Last Run display</div>
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
        {(value === '1' || value === '2' || value === '3' || value === '4') && (
          <span className="ml-2 text-amber-500">(score-history chart hidden in preview — would integrate after pick)</span>
        )}
      </div>
    </div>
  );
}
