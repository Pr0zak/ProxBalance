import { GLASS_CARD, MODAL_OVERLAY, MODAL_CONTAINER, iconBadge, ICON, statusBadge } from '../../utils/designTokens.js';
import { ClipboardList, X } from '../Icons.jsx';
import { stripLayout, CATEGORY_LABELS, runSummary, lastCheckParts, clockTime, agoText } from '../../utils/automationStory.js';
import RunDetailBlock from './RunDetailBlock.jsx';

const { useState } = React;

export function DetailModal({ run, onClose, ctx }) {
  if (!run) return null;
  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} max-w-3xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-pb-text dark:text-white">Check details</h3>
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"><X size={18} /></button>
        </div>
        <RunDetailBlock run={run} ctx={ctx} />
      </div>
    </div>
  );
}

// Square fill per run category. Skipped runs are hatched (see HATCH).
const CAT_CLASS = {
  nothing: 'bg-slate-200 dark:bg-slate-700',
  waiting: 'bg-violet-400 dark:bg-violet-500',
  would_move: 'bg-amber-100 dark:bg-amber-400/15 ring-2 ring-inset ring-amber-500 dark:ring-amber-400',
  moved: 'bg-blue-600 dark:bg-blue-400',
  held: 'bg-orange-300 dark:bg-orange-400/80',
  failed: 'bg-red-500 dark:bg-red-400',
  skipped: 'text-slate-400 dark:text-slate-500 ring-1 ring-inset ring-slate-300 dark:ring-slate-600',
  running: 'bg-sky-300 dark:bg-sky-600',
};
const HATCH = { backgroundImage: 'repeating-linear-gradient(135deg, currentColor 0 1.5px, transparent 1.5px 4px)' };

function Square({ item, selected, onSelect, className = '' }) {
  const label = `${clockTime(item.t)}: ${runSummary(item.run)}`;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      aria-pressed={selected}
      title={label}
      style={item.cat === 'skipped' ? HATCH : undefined}
      className={`rounded-sm ${CAT_CLASS[item.cat] || CAT_CLASS.nothing} ${selected
        ? 'outline outline-2 outline-offset-1 outline-slate-900 dark:outline-white'
        : 'hover:opacity-80'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500 ${className}`}
    />
  );
}

function Legend({ categories }) {
  const labels = Object.fromEntries(CATEGORY_LABELS);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pb-text2 dark:text-gray-400">
      {categories.map(c => (
        <span key={c} className="inline-flex items-center gap-1">
          <span className={`inline-block w-2.5 h-2.5 rounded-sm ${CAT_CLASS[c]}`} style={c === 'skipped' ? HATCH : undefined} />
          {labels[c]}
        </span>
      ))}
    </div>
  );
}

/**
 * "Recent checks": one square per automation run over the last 24 h, newest
 * at the right, coloured by outcome. Clicking a square opens that run below
 * the strip. On phones the strip wraps into one row per day.
 */
export function RunStrip({ runs, ctx: parentCtx = {} }) {
  const [selectedKey, setSelectedKey] = useState(null);
  // "opens HH:MM" describes the schedule now, not when an old run was skipped.
  const ctx = { ...parentCtx, opensAt: null };
  const layout = stripLayout(runs || [], { now: ctx.now || new Date() });
  const { items, ticks, days, categories } = layout;
  if (items.length === 0) {
    return <div className="text-xs text-pb-text2 dark:text-gray-500 py-2">No checks in the last 24 hours.</div>;
  }
  const n = items.length;
  const keyOf = (it) => String(it.run.timestamp);
  const selected = items.find(it => keyOf(it) === selectedKey) || null;
  const toggle = (it) => setSelectedKey(k => (k === keyOf(it) ? null : keyOf(it)));
  const gap = n > 120 ? 'gap-px' : 'gap-0.5';
  const parts = selected ? lastCheckParts(selected.run, ctx) : null;
  return (
    <div>
      {/* Desktop: one row, shared time axis */}
      <div className="hidden sm:block" style={{ maxWidth: `${n * 18}px` }}>
        <div className={`flex ${gap} h-6`}>
          {items.map(it => (
            <Square key={keyOf(it)} item={it} selected={selected === it} onSelect={() => toggle(it)} className="flex-1 min-w-0 h-full" />
          ))}
        </div>
        <div className="relative h-4 mt-1 text-[10px] tabular-nums text-pb-text2 dark:text-gray-500">
          {ticks.map(t => (
            <span key={t.index} className="absolute -translate-x-1/2 whitespace-nowrap" style={{ left: `${((t.index + 0.5) / n) * 100}%` }}>{t.label}</span>
          ))}
          <span className="absolute right-0">now</span>
        </div>
      </div>
      {/* Phones: one row per day */}
      <div className="sm:hidden space-y-1">
        {days.map(d => (
          <div key={d.key} className="flex items-start gap-2">
            <span className="w-16 shrink-0 text-[10px] leading-4 text-pb-text2 dark:text-gray-500">{d.label}</span>
            <div className="flex flex-wrap gap-0.5 min-w-0">
              {d.items.map(it => (
                <Square key={keyOf(it)} item={it} selected={selected === it} onSelect={() => toggle(it)} className="w-3 h-4" />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1.5">
        <Legend categories={categories} />
      </div>
      {selected && (
        <div className="mt-2 p-3 rounded-lg border border-pb-border dark:border-slate-700/60 bg-white/60 dark:bg-slate-900/40">
          <div className="flex flex-wrap items-center gap-2 text-xs mb-2">
            <span className="font-medium text-pb-text dark:text-gray-200 tabular-nums">{clockTime(selected.t)}</span>
            <span className="text-pb-text2 dark:text-gray-500">{agoText(selected.t)}</span>
            {parts.chip && <span className={statusBadge(parts.tone)}>{parts.chip}</span>}
          </div>
          <RunDetailBlock run={selected.run} compact ctx={ctx} />
        </div>
      )}
    </div>
  );
}

export default function RunHistoryDisplay({ runHistory, embedded = false, ctx }) {
  if (embedded) return <RunStrip runs={runHistory} ctx={ctx} />;
  return (
    <div className={`${GLASS_CARD} overflow-hidden`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={iconBadge('green', 'emerald')}>
          <ClipboardList size={ICON.action} className="text-pb-text dark:text-white" />
        </div>
        <h3 className="text-base font-bold text-pb-text dark:text-white">Recent checks</h3>
      </div>
      <RunStrip runs={runHistory} ctx={ctx} />
    </div>
  );
}
