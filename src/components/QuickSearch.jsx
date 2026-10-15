import { MODAL_OVERLAY, MODAL_CONTAINER, INPUT_FIELD, TAP_TARGET, ICON } from '../utils/designTokens.js';
import { buildSearchItems, rankSearch, isOpenShortcut } from '../utils/quickSearch.js';
import { Search, X } from './Icons.jsx';

const { useState, useEffect, useMemo, useRef } = React;

const LIST_ID = 'quick-search-list';
const optionId = (i) => `quick-search-opt-${i}`;

const STATUS_DOT = {
  running: 'bg-green-500', online: 'bg-green-500',
  stopped: 'bg-slate-400 dark:bg-slate-500', offline: 'bg-red-500',
};

const typeLabel = (item) => (item.kind === 'guest' ? (item.guestType || 'Guest') : item.kind === 'node' ? 'Node' : 'Page');

/**
 * Quick search / command palette. Always mounted so it owns the open
 * shortcuts (Ctrl+K / Cmd+K, "/" outside text fields); the TopNav search
 * button opens it too. Searches guests (name, vmid, tags), nodes and page
 * jumps from the already-loaded cluster snapshot; Enter hands the chosen
 * item to onSelect. Phone: full-screen sheet.
 */
export default function QuickSearch({ open, setOpen, data, onSelect }) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const closeRef = useRef(null);
  const returnFocusRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (!isOpenShortcut(e)) return;
      e.preventDefault();
      setOpen(o => !o);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  // Fresh query each time it opens; give focus back to where it was on close.
  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement;
      setQuery('');
      setActive(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (returnFocusRef.current) {
      const el = returnFocusRef.current;
      returnFocusRef.current = null;
      if (el.isConnected && typeof el.focus === 'function') el.focus();
    }
  }, [open]);

  const items = useMemo(() => (open ? buildSearchItems(data) : []), [open, data]);
  const results = useMemo(() => rankSearch(items, query, 30), [items, query]);

  useEffect(() => { setActive(0); }, [query]);
  useEffect(() => {
    document.getElementById(optionId(active))?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const close = () => setOpen(false);
  const choose = (item) => { if (item) { setOpen(false); onSelect(item); } };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault(); e.stopPropagation(); close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length) setActive(a => (a + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) setActive(a => (a - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    } else if (e.key === 'Tab') {
      // Trap focus between the field and the close button.
      e.preventDefault();
      (document.activeElement === inputRef.current ? closeRef : inputRef).current?.focus();
    }
  };

  const activeItem = results[active];

  return (
    <div
      className={`${MODAL_OVERLAY} !items-start !p-0 sm:!p-4 sm:!pt-[12vh]`}
      onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Quick search"
        onKeyDown={onKeyDown}
        className={`${MODAL_CONTAINER} !p-0 !max-w-none sm:!max-w-xl !rounded-none sm:!rounded-xl !border-0 sm:!border !h-[100dvh] sm:!h-auto !max-h-[100dvh] sm:!max-h-[70vh] !overflow-hidden flex flex-col`}
      >
        <div className="flex items-center gap-2 p-3 border-b border-slate-200 dark:border-pb-border-dark shrink-0">
          <Search size={ICON.action} className="shrink-0 text-slate-400 dark:text-pb-text3-dark" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded="true"
            aria-controls={LIST_ID}
            aria-autocomplete="list"
            aria-activedescendant={activeItem ? optionId(active) : undefined}
            aria-label="Search guests, nodes and pages"
            placeholder="Guest, VMID, tag, node or page"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className={`${INPUT_FIELD} !text-base sm:!text-sm min-w-0`}
          />
          <button
            ref={closeRef}
            onClick={close}
            aria-label="Close"
            className={`shrink-0 p-2 rounded-lg text-slate-500 dark:text-pb-text2-dark hover:text-slate-900 dark:hover:text-pb-text-dark hover:bg-slate-100 dark:hover:bg-pb-hover-dark focus:outline-none focus:ring-2 focus:ring-pb-accent/30 ${TAP_TARGET}`}
          >
            <X size={ICON.action} />
          </button>
        </div>

        <ul id={LIST_ID} role="listbox" aria-label="Results" className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden py-1">
          {results.length === 0 && (
            <li role="presentation" className="px-4 py-6 text-sm text-center text-slate-500 dark:text-pb-text2-dark">No matches</li>
          )}
          {results.map((item, i) => (
            <li
              key={item.key}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => { if (i !== active) setActive(i); }}
              onClick={() => choose(item)}
              className={`flex items-center gap-2 sm:gap-3 px-3 py-2 min-h-[44px] sm:min-h-[36px] cursor-pointer text-sm ${i === active
                ? 'bg-blue-50 dark:bg-blue-500/15'
                : 'hover:bg-slate-50 dark:hover:bg-pb-hover-dark'}`}
            >
              <span className="shrink-0 w-10 text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-pb-text3-dark">
                {typeLabel(item)}
              </span>
              <span className="flex-1 min-w-0 truncate font-medium text-slate-900 dark:text-pb-text-dark">{item.name}</span>
              {item.kind === 'guest' && (
                <>
                  <span className="shrink-0 font-mono text-xs text-slate-500 dark:text-pb-text2-dark">{item.vmid}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-pb-text2-dark">{item.node}</span>
                </>
              )}
              {item.kind === 'node' && (
                <span className="shrink-0 text-xs text-slate-500 dark:text-pb-text2-dark">{item.guestCount} {item.guestCount === 1 ? 'guest' : 'guests'}</span>
              )}
              {item.status && (
                <span className="shrink-0 flex items-center gap-1 text-xs text-slate-500 dark:text-pb-text2-dark">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[item.status] || 'bg-amber-500'}`} aria-hidden="true" />
                  {item.status}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
