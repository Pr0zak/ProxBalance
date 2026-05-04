import { ChevronDown } from '../Icons.jsx';
import { iconBadge, ICON } from '../../utils/designTokens.js';

/**
 * Uniform section header for the Automation page. Every top-level
 * GLASS_CARD section uses this so the page reads as a vertical rhythm
 * of [icon] [title] ... [chevron] rows.
 *
 * Usage:
 *   <SectionHeader
 *     title="When to Migrate"
 *     icon={Clock}
 *     accent={['indigo']}            // single color  -> iconBadge('indigo')
 *     accent={['indigo', 'violet']}  // gradient pair -> iconBadge('indigo', 'violet')
 *     collapsed={collapsedSections.scheduleSection}
 *     onToggle={() => setCollapsedSections(prev => ({ ...prev, scheduleSection: !prev.scheduleSection }))}
 *     embedded={false}               // when true, renders an h3-sized header for nesting
 *     right={extra}                  // optional trailing controls (e.g. count chip)
 *   />
 */
export default function SectionHeader({
  title,
  icon: Icon,
  accent = ['blue'],
  collapsed,
  onToggle,
  embedded = false,
  right = null,
}) {
  const TitleTag = embedded ? 'h3' : 'h2';
  const titleClass = embedded
    ? 'text-base font-bold text-pb-text dark:text-white'
    : 'text-xl font-bold text-pb-text dark:text-white';
  const iconSize = embedded ? 18 : ICON.section;
  const collapsible = typeof onToggle === 'function';

  const inner = (
    <>
      <div className="flex items-center gap-3 min-w-0">
        {Icon && (
          <div className={iconBadge(accent[0], accent[1])}>
            <Icon size={iconSize} className="text-pb-text dark:text-white" />
          </div>
        )}
        <TitleTag className={titleClass}>{title}</TitleTag>
      </div>
      <div className="flex items-center gap-2">
        {right}
        {collapsible && (
          <ChevronDown
            size={iconSize}
            className={`text-pb-text2 dark:text-gray-400 transition-transform duration-200 ${!collapsed ? 'rotate-180' : ''}`}
          />
        )}
      </div>
    </>
  );

  if (collapsible) {
    return (
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      >
        {inner}
      </button>
    );
  }
  return (
    <div className="w-full flex items-center justify-between mb-4 flex-wrap gap-y-3">
      {inner}
    </div>
  );
}
