import { GLASS_CARD_SUBTLE } from '../../utils/designTokens.js';

const VARIANTS = [
  { id: 'current', label: 'Current', desc: 'Migration Recommendations stays as its own section below the Cluster section' },
  { id: 'A', label: 'A — Tab', desc: '5th tab "Recommendations (N)" inside Cluster section; section hidden from below' },
  { id: 'B', label: 'B — Badges', desc: 'Cross-reference badges on Nodes and Guests rows; section stays where it is' },
  { id: 'C', label: 'C — Banner+Below', desc: 'Banner at top of Cluster section + section stays below + badges' },
  { id: 'D', label: 'D — Tab+Badges', desc: 'Tab + badges on the other tabs (recommended hybrid)' },
];

export default function RecsLayoutPicker({ value, onChange }) {
  return (
    <div className={`${GLASS_CARD_SUBTLE} mb-4`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">Preview</div>
          <div className="text-sm text-gray-300">Recommendations integration</div>
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
