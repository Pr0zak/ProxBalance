import { GLASS_CARD_SUBTLE } from '../../utils/designTokens.js';

const VARIANTS = [
  { id: 'current', label: 'Current', desc: 'AutomationStatusSection stays as its own section below the Cluster section (today)' },
  { id: 'A', label: 'A — KPI card', desc: 'Status as a 7th KPI card; section stays' },
  { id: 'B', label: 'B — Banner', desc: 'Status banner above Cluster section + section slimmed (chart + history only)' },
  { id: 'C', label: 'C — Recs strip', desc: 'Status strip inside Recs tab + per-rec auto-eligibility badges + section slimmed' },
  { id: 'D', label: 'D — 6th tab', desc: '"Auto" becomes the 6th tab inside Cluster section; standalone section hidden' },
  { id: 'E', label: 'E — Top pill', desc: 'Persistent pill at the top (simulating TopNav placement); section stays' },
];

export default function AutoLayoutPicker({ value, onChange }) {
  return (
    <div className={`${GLASS_CARD_SUBTLE} mb-4`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">Preview</div>
          <div className="text-sm text-gray-300">Automated Migrations integration</div>
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
