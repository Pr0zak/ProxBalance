// Shared pieces of the Simple view widgets: tone classes, the card frame,
// a status dot, empty text, a metric switch and a per-browser preference.

import { ChevronRight } from '../Icons.jsx';
import { SPANS, SPAN_LABEL, MAX_ROWS } from '../../utils/simpleView.js';
import { WALL_PANEL, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE } from '../../utils/designTokens.js';

const { useState, useContext, createContext } = React;

/**
 * What the page tells each card about its slot: its size in grid columns,
 * its width in px (for widgets that change shape), and in arrange mode the
 * handlers for the grip, the size chips and the resize edge.
 */
export const SlotContext = createContext({ span: 12, widthPx: null });
export const useSlot = () => useContext(SlotContext);

function GripIcon() {
  return (
    <svg width="12" height="16" viewBox="0 0 12 16" aria-hidden="true" className="fill-current">
      {[3, 8, 13].map(y => [3, 9].map(x => <circle key={`${x}-${y}`} cx={x} cy={y} r="1.5" />))}
    </svg>
  );
}

/** Arrange-mode bar: grip to drag, and the sizes the room allows. */
function ArrangeBar({ slot, title }) {
  const sizes = SPANS.filter(x => x >= slot.minSpan);
  return (
    <div className="flex items-center gap-2 -mt-1 pb-2 border-b border-dashed border-blue-400/60">
      <button type="button" onPointerDown={slot.onGrip} aria-label={`Drag ${title}`} title="Drag to move"
        className="touch-none cursor-grab active:cursor-grabbing inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-500/10 text-blue-700 dark:text-blue-300 text-xs font-medium">
        <GripIcon /> Move
      </button>
      {sizes.length > 1 && (
        <div role="group" aria-label={`Size of ${title}`} className="flex flex-wrap justify-end gap-1 ml-auto">
          {sizes.map(x => (
            <button key={x} type="button" aria-pressed={slot.span === x} onClick={() => slot.onSize(x)}
              className={`min-w-[2rem] px-1.5 py-0.5 rounded-md text-xs border ${slot.span === x ? 'border-blue-500 bg-blue-500/15 text-blue-700 dark:text-blue-300' : 'border-pb-border dark:border-slate-600 text-pb-text2 dark:text-gray-300'}`}>
              {SPAN_LABEL[x]}
            </button>
          ))}
          {slot.span < 12 && (
            <span className="inline-flex items-center rounded-md border border-pb-border dark:border-slate-600 text-xs text-pb-text2 dark:text-gray-300"
              title="Rows tall: smaller widgets stack beside it and stretch to its height">
              <button type="button" disabled={slot.rows <= 1} onClick={() => slot.onRows(slot.rows - 1)} aria-label={`Fewer rows for ${title}`} className="px-1.5 py-0.5 disabled:opacity-30">−</button>
              <span className="tabular-nums px-0.5" aria-label={`${slot.rows} rows tall`}>↕{slot.rows}</span>
              <button type="button" disabled={slot.rows >= MAX_ROWS} onClick={() => slot.onRows(slot.rows + 1)} aria-label={`More rows for ${title}`} className="px-1.5 py-0.5 disabled:opacity-30">+</button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// Semantic colours (not the accent): dots, bars and text.
export const DOT = { ok: 'bg-green-500', info: 'bg-blue-500', warn: 'bg-amber-500', bad: 'bg-red-500', none: 'bg-slate-400' };
export const TEXT = {
  ok: 'text-green-700 dark:text-green-400', warn: 'text-amber-700 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400', muted: 'text-pb-text2 dark:text-gray-400',
};
export const LINK = 'text-blue-600 dark:text-blue-400 hover:underline';

export const listNames = (guests, max = 2) => {
  const names = guests.map(g => g.name);
  return names.length > max ? `${names.slice(0, max).join(', ')} +${names.length - max}` : names.join(', ');
};

export function Dot({ tone, className = '' }) {
  return <span aria-hidden="true" className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${DOT[tone] || DOT.none} ${className}`} />;
}

/**
 * A widget card: small uppercase title, optional tools (a switch), optional
 * "Open" link, body. Its place in the grid comes from SlotContext.
 */
export function Card({ title, href, linkText = 'Open', tools, bare = false, children }) {
  const slot = useSlot();
  const arranging = !!slot.arrange;
  return (
    <section data-widget={slot.id}
      style={{ gridColumn: `span ${slot.span} / span ${slot.span}`, ...(slot.rows > 1 ? { gridRow: `span ${slot.rows} / span ${slot.rows}` } : null) }}
      aria-label={bare ? title : undefined}
      className={`${bare ? (arranging ? 'rounded-xl p-2' : '') : WALL_PANEL} relative flex flex-col gap-3 min-w-0 ${arranging ? 'ring-1 ring-blue-400/50' : ''} ${slot.dragging ? 'opacity-50 ring-2 !ring-blue-500' : ''}`}>
      {arranging && <ArrangeBar slot={slot} title={title} />}
      {!bare && <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-400">{title}</h2>
        <div className="flex items-center gap-3 ml-auto">
          {tools}
          {href && <a href={href} className={`text-xs ${LINK} inline-flex items-center`}>{linkText}<ChevronRight size={12} /></a>}
        </div>
      </div>}
      <div className={`contents ${arranging ? '[&>*]:pointer-events-none [&>*]:select-none' : ''}`}>{children}</div>
      {arranging && slot.minSpan < 12 && (
        <div onPointerDown={slot.onResize} role="separator" aria-orientation="vertical" aria-label={`Resize ${title}`} title="Drag to resize"
          className="absolute top-3 bottom-3 -right-2 w-4 touch-none cursor-ew-resize flex items-center justify-center group">
          <span className="w-1.5 h-12 rounded-full bg-blue-500/60 group-hover:bg-blue-500" />
        </div>
      )}
      {arranging && slot.minSpan < 12 && slot.span < 12 && (
        <div onPointerDown={slot.onResizeRows} role="separator" aria-orientation="horizontal" aria-label={`Change how many rows ${title} takes`} title="Drag to change how many rows it takes"
          className="absolute left-3 right-3 -bottom-2 h-4 touch-none cursor-ns-resize flex items-center justify-center group">
          <span className="h-1.5 w-12 rounded-full bg-blue-500/60 group-hover:bg-blue-500" />
        </div>
      )}
    </section>
  );
}

export const Empty = ({ children }) => <p className={`text-sm ${TEXT.muted}`}>{children}</p>;

/** Small segmented switch: options [{ id, label }]. */
export function Switch({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1">
      {options.map(o => (
        <button key={o.id} type="button" aria-pressed={value === o.id} onClick={() => onChange(o.id)}
          className={`${FILTER_CHIP} sm:!px-2 sm:!py-0.5 sm:!text-[11px] ${value === o.id ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}>{o.label}</button>
      ))}
    </div>
  );
}

/** A per-browser choice (a widget's metric), kept in localStorage when it can be. */
export function usePref(key, fallback, allowed) {
  const full = `pb.simple.${key}`;
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(full);
      return s != null && (!allowed || allowed.includes(s)) ? s : fallback;
    } catch { return fallback; }
  });
  const set = (next) => { setV(next); try { localStorage.setItem(full, next); } catch { /* per-browser nicety only */ } };
  return [v, set];
}
