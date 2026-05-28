import { ChevronDown } from '../Icons.jsx';

// Collapsible panel used by the Node/Guest detail modals. Header with a rotating
// chevron; body renders only when open.
export default function CollapsibleSection({ title, badge, isOpen, onToggle, children }) {
  return (
    <div className="mb-3 rounded-lg border border-pb-border dark:border-slate-700 overflow-hidden">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full px-3 py-2 text-left hover:bg-pb-surface2 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-pb-text dark:text-white">{title}{badge}</span>
        <ChevronDown size={16} className={`text-pb-text2 dark:text-gray-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && <div className="px-3 pb-3 pt-0">{children}</div>}
    </div>
  );
}
