import { X } from '../Icons.jsx';

const { useEffect } = React;

/**
 * Frame for the node and guest detail views.
 *
 * Desktop: a panel docked to the right edge with no backdrop, so the map or
 * table beside it stays visible and clickable (clicking another node or guest
 * swaps what the panel shows). Phone: a full-height sheet over a dimmed page.
 * Escape closes it on both.
 *
 * `header` is the identity block (left of the close button), `footer` an
 * optional sticky action bar.
 */
export default function DetailPanel({ onClose, header, footer, children, label }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-[59] bg-black/50 sm:hidden" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-label={label}
        className="fixed z-[60] inset-x-0 bottom-0 top-10 rounded-t-2xl sm:top-0 sm:left-auto sm:right-0 sm:w-[480px] sm:rounded-none flex flex-col bg-pb-surface dark:bg-slate-900 border-t sm:border-t-0 sm:border-l border-pb-border dark:border-slate-700 shadow-2xl"
      >
        <div className="flex justify-center pt-2 sm:hidden" aria-hidden="true">
          <span className="w-10 h-1 rounded-full bg-pb-border dark:bg-slate-600" />
        </div>
        <div className="flex items-center gap-2 px-4 sm:px-5 py-3 border-b border-pb-border dark:border-slate-700 shrink-0">
          <div className="flex-1 min-w-0">{header}</div>
          <button
            onClick={onClose}
            className="shrink-0 p-2 -mr-1 rounded-lg text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 hover:bg-pb-surface2 dark:hover:bg-slate-800"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-4">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-pb-border dark:border-slate-700 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {footer}
          </div>
        )}
      </aside>
    </>
  );
}

/** 1h / 6h / 24h / 7d chips shared by both panels' charts. */
export const PANEL_PERIODS = [
  { id: '1h', label: '1h', hours: 1 },
  { id: '6h', label: '6h', hours: 6 },
  { id: '24h', label: '24h', hours: 24 },
  { id: '7d', label: '7d', hours: 168 },
];

export function PeriodChips({ value, onChange }) {
  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-pb-surface2 dark:bg-slate-800 p-0.5">
      {PANEL_PERIODS.map(p => (
        <button
          key={p.id}
          onClick={() => onChange(p.id)}
          className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-colors ${
            value === p.id ? 'bg-blue-600 text-white' : 'text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** Label/value row for the facts lists at the bottom of each panel. */
export function FactRow({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-pb-border dark:border-slate-700/70 last:border-b-0 text-[13px]">
      <span className="shrink-0 text-pb-text2 dark:text-gray-400">{label}</span>
      <div className="min-w-0 text-right text-pb-text dark:text-gray-200">{children}</div>
    </div>
  );
}
