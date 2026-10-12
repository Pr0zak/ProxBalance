import { SUB_TAB, SUB_TAB_ACTIVE, SUB_TAB_INACTIVE } from '../utils/designTokens.js';

const { useEffect, useRef, useState, useCallback } = React;

const FADE = '24px';

/**
 * Underlined sub-tab row. Always one line: when the tabs don't fit (phones)
 * the row scrolls sideways, the edge that hides more tabs fades out, and the
 * active tab is scrolled into view. Desktop rows that fit look unchanged.
 *
 * tabs: [{ id, label, badge? }]
 */
export default function TabBar({ tabs, active, onChange, className = '' }) {
  const rowRef = useRef(null);
  const activeRef = useRef(null);
  const [edges, setEdges] = useState({ left: false, right: false });

  const measure = useCallback(() => {
    const el = rowRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges(prev => (prev.left === left && prev.right === right ? prev : { left, right }));
  }, []);

  // Keep the active tab visible by scrolling the row only (never the page).
  useEffect(() => {
    const row = rowRef.current;
    const tab = activeRef.current;
    if (row && tab) {
      const pad = 24;
      if (tab.offsetLeft - pad < row.scrollLeft) row.scrollLeft = Math.max(0, tab.offsetLeft - pad);
      else if (tab.offsetLeft + tab.offsetWidth + pad > row.scrollLeft + row.clientWidth) {
        row.scrollLeft = tab.offsetLeft + tab.offsetWidth + pad - row.clientWidth;
      }
    }
    measure();
  }, [active, tabs.length, measure]);

  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure]);

  const mask = edges.left || edges.right
    ? `linear-gradient(to right, ${edges.left ? 'transparent' : '#000'} 0, #000 ${FADE}, #000 calc(100% - ${FADE}), ${edges.right ? 'transparent' : '#000'} 100%)`
    : undefined;

  return (
    <div className={`border-b border-pb-border dark:border-slate-700/50 ${className}`}>
      <div
        ref={rowRef}
        role="tablist"
        onScroll={measure}
        className="flex items-center overflow-x-auto no-scrollbar"
        style={mask ? { WebkitMaskImage: mask, maskImage: mask } : undefined}
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            ref={tab.id === active ? activeRef : null}
            role="tab"
            aria-selected={tab.id === active}
            onClick={() => onChange(tab.id)}
            className={`${SUB_TAB} ${tab.id === active ? SUB_TAB_ACTIVE : SUB_TAB_INACTIVE} shrink-0`}
          >
            {tab.label}
            {tab.badge != null && tab.badge !== '' && (
              <span className="ml-1.5 text-xs font-semibold text-pb-accent dark:text-pb-accent-dark">{tab.badge}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
