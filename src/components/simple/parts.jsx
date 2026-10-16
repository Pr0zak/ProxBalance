// Shared pieces of the Simple view widgets: tone classes, the card frame,
// a status dot, empty text, a metric switch and a per-browser preference.

import { ChevronRight } from '../Icons.jsx';
import { WALL_PANEL, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE } from '../../utils/designTokens.js';

const { useState } = React;

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

/** A widget card: small uppercase title, optional tools (a switch), optional "Open" link, body. */
export function Card({ title, href, linkText = 'Open', wide, tools, children }) {
  return (
    <section className={`${WALL_PANEL} flex flex-col gap-3 min-w-0 ${wide ? 'md:col-span-2 xl:col-span-3' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-400">{title}</h2>
        <div className="flex items-center gap-3 ml-auto">
          {tools}
          {href && <a href={href} className={`text-xs ${LINK} inline-flex items-center`}>{linkText}<ChevronRight size={12} /></a>}
        </div>
      </div>
      {children}
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
