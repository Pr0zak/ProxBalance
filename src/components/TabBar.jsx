import { SUB_TAB, SUB_TAB_ACTIVE, SUB_TAB_INACTIVE } from '../utils/designTokens.js';

const { useEffect, useRef } = React;

/**
 * Underlined sub-tab row. On narrow screens the tabs wrap onto a second line
 * instead of scrolling sideways out of sight, so every tab stays visible.
 *
 * tabs: [{ id, label, badge? }]
 */
export default function TabBar({ tabs, active, onChange, className = '' }) {
  const activeRef = useRef(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  }, [active]);
  return (
    <div
      role="tablist"
      className={`flex flex-wrap items-center gap-x-0 gap-y-1 border-b border-pb-border dark:border-slate-700/50 ${className}`}
    >
      {tabs.map(tab => (
        <button
          key={tab.id}
          ref={tab.id === active ? activeRef : null}
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => onChange(tab.id)}
          className={`${SUB_TAB} ${tab.id === active ? SUB_TAB_ACTIVE : SUB_TAB_INACTIVE}`}
        >
          {tab.label}
          {tab.badge != null && tab.badge !== '' && (
            <span className="ml-1.5 text-xs font-semibold text-pb-accent dark:text-pb-accent-dark">{tab.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}
