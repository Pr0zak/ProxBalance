import { GLASS_CARD_SUBTLE } from '../../utils/designTokens.js';

const VARIANTS = [
  { id: 'current', label: 'Current', desc: '3 separate sections (Nodes + Map + Node Status)' },
  { id: 'A', label: 'A — Tabs', desc: 'One section, 3 tabs (Table / Map / Charts)' },
  { id: 'B', label: 'B — Card stack', desc: 'One rich card per node with toggleable sub-views' },
  { id: 'C', label: 'C — Table+Map toggle', desc: 'Table primary, Map as view toggle, drawer tabs' },
  { id: 'D', label: 'D — Map + drawer', desc: 'Map kept on top, Nodes drawer absorbs Node Status' },
];

export default function LayoutPreviewPicker({ value, onChange }) {
  return (
    <div className={`${GLASS_CARD_SUBTLE} mb-4`}>
      <div className="flex flex-wrap items-start gap-3">
        <div className="shrink-0">
          <div className="text-xs uppercase tracking-wider text-amber-400 font-bold">Preview</div>
          <div className="text-sm text-gray-300">Cluster section layout</div>
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
