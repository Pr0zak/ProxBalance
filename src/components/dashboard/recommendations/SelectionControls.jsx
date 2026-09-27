import { Play, Copy, Check, X, AlertTriangle, ArrowRight } from '../../Icons.jsx';
import {
  BTN_PRIMARY, BTN_SECONDARY, BTN_ICON,
  FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE,
} from '../../../utils/designTokens.js';
import { vkey } from './planMath.js';

const { useEffect, useLayoutEffect, useRef, useState } = React;

/**
 * Quick-select row above the cards: a master checkbox plus one-click presets
 * (every suggestion, by source node, only non-conflicting ones) so an
 * operator can pick the subset they actually want to run.
 */
export function SelectionToolbar({ recommendations, selected, isConflicting, onSelectWhere, onClear }) {
  if (!recommendations.length) return null;
  const all = recommendations.length;
  const count = recommendations.filter(r => selected.has(vkey(r.vmid))).length;
  const sources = [...new Set(recommendations.map(r => r.source_node))].sort();
  const nonConflicting = recommendations.filter(r => !isConflicting(r)).length;
  const isExactly = (pred) => {
    const want = recommendations.filter(pred);
    return want.length > 0 && want.length === count && want.every(r => selected.has(vkey(r.vmid)));
  };
  const chip = (label, n, pred, title) => {
    const active = isExactly(pred);
    return (
      <button
        key={label}
        onClick={() => (active ? onClear() : onSelectWhere(pred))}
        aria-pressed={active}
        className={`${FILTER_CHIP} ${active ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
        title={title}
      >
        {label} <span className="tabular-nums opacity-70">{n}</span>
      </button>
    );
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-1">
      <label className="inline-flex items-center gap-2 text-xs text-pb-text2 dark:text-gray-400 cursor-pointer mr-1 select-none">
        <input
          type="checkbox"
          checked={count === all}
          ref={el => { if (el) el.indeterminate = count > 0 && count < all; }}
          onChange={() => (count === all ? onClear() : onSelectWhere(() => true))}
          className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
          aria-label="Select every suggestion"
        />
        {count ? `${count} of ${all} selected` : 'Select to run or copy a subset'}
      </label>
      {sources.length > 1 && sources.map(src => chip(
        `From ${src}`, recommendations.filter(r => r.source_node === src).length,
        r => r.source_node === src, `Select every suggestion that moves a guest off ${src}`,
      ))}
      {nonConflicting > 0 && nonConflicting < all && chip(
        'Only non-conflicting', nonConflicting, r => !isConflicting(r),
        'Select only suggestions whose target node stays under its limits',
      )}
    </div>
  );
}

// Height of the phone tab bar (fixed at the bottom below the sm breakpoint).
function useBottomOffset() {
  const [offset, setOffset] = useState(16);
  useEffect(() => {
    const measure = () => {
      const bar = document.querySelector('[data-mobile-tabbar]');
      // (offsetParent is always null for fixed elements; a hidden bar measures 0.)
      const h = bar ? bar.getBoundingClientRect().height : 0;
      setOffset(Math.round(h) + (h ? 8 : 16));
    };
    measure();
    window.addEventListener('resize', measure);
    const bar = document.querySelector('[data-mobile-tabbar]');
    const ro = bar && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(bar);
    return () => { window.removeEventListener('resize', measure); if (ro) ro.disconnect(); };
  }, []);
  return offset;
}

/**
 * Floating action bar shown while suggestions are selected: what the batch
 * moves and the two ways to act on it (run in plan order, or copy the CLI
 * commands). Reports the space it covers (`onCoverChange`) so the list can
 * pad itself and the last card never hides behind it.
 */
export function SelectionActionBar({ selectedRecs, overTargets, canRun, onRun, onCopy, copyState, onClear, onCoverChange }) {
  const ref = useRef(null);
  const bottom = useBottomOffset();
  const visible = selectedRecs.length > 0;

  useLayoutEffect(() => {
    if (!onCoverChange) return undefined;
    if (!visible || !ref.current) { onCoverChange(0); return undefined; }
    const report = () => onCoverChange(Math.round(ref.current.getBoundingClientRect().height) + 12);
    report();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(report) : null;
    if (ro) ro.observe(ref.current);
    return () => { if (ro) ro.disconnect(); };
  }, [visible, onCoverChange]);
  useEffect(() => () => onCoverChange && onCoverChange(0), []);

  if (!visible) return null;
  const memGb = selectedRecs.reduce((a, r) => a + (r.mem_gb || 0), 0);
  const minutes = selectedRecs.reduce((a, r) => {
    const cb = r.cost_benefit || {};
    return a + (cb.est_duration_minutes ?? cb.estimated_duration_minutes ?? 0);
  }, 0);
  const intoOver = selectedRecs.filter(r => overTargets.has(r.target_node));
  const flows = {};
  for (const r of selectedRecs) {
    const k = `${r.source_node}|${r.target_node}`;
    flows[k] = (flows[k] || 0) + 1;
  }

  return (
    // Fixed, not sticky: the dashboard wrapper clips overflow, which breaks sticky.
    <div className="fixed inset-x-0 z-40 px-4 pointer-events-none" style={{ bottom }} data-selection-bar>
      <div
        ref={ref}
        className="pointer-events-auto mx-auto max-w-4xl flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 rounded-xl border border-blue-300 dark:border-blue-500/40 bg-white/95 dark:bg-slate-900/95 backdrop-blur shadow-pb-modal"
      >
        <div className="min-w-0 text-sm text-pb-text dark:text-gray-200">
          <div className="font-semibold">
            {selectedRecs.length} migration{selectedRecs.length !== 1 ? 's' : ''} selected
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-pb-text2 dark:text-gray-400 mt-0.5">
            {Object.entries(flows).map(([k, n]) => {
              const [src, tgt] = k.split('|');
              return (
                <span key={k} className="inline-flex items-center gap-1">
                  {src} <ArrowRight size={10} /> {tgt} <span className="tabular-nums">×{n}</span>
                </span>
              );
            })}
            <span className="tabular-nums">{memGb.toFixed(1)} GB RAM</span>
            {minutes > 0 && <span className="tabular-nums">~{Math.max(1, Math.round(minutes))} min</span>}
            {intoOver.length > 0 ? (
              <span
                className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"
                title={`Moving onto a node this selection puts over its limit: ${intoOver.map(r => r.name).join(', ')}`}
              >
                <AlertTriangle size={11} /> {intoOver.length} into an over-limit node
              </span>
            ) : (
              <span className="text-green-600 dark:text-green-400">no conflicts</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={onCopy} className={`${BTN_SECONDARY} whitespace-nowrap`} title="Copy the qm/pct migrate commands in plan order">
            {copyState === 'copied' ? <Check size={14} /> : <Copy size={14} />}
            {copyState === 'copied' ? 'Copied'
              : copyState === 'failed' ? 'Copy blocked'
              : <span>Copy<span className="hidden sm:inline"> commands</span></span>}
          </button>
          {canRun && (
            <button onClick={onRun} className={`${BTN_PRIMARY} whitespace-nowrap`} title="Review and run only the selected migrations, in plan order">
              <Play size={14} /> <span>Run<span className="hidden sm:inline"> selected</span> ({selectedRecs.length})</span>
            </button>
          )}
          <button onClick={onClear} className={BTN_ICON} aria-label="Clear selection" title="Clear selection">
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
