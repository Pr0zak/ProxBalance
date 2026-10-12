import { ArrowUp, ArrowDown, Wrench } from '../Icons.jsx';
import { NODE_ROLE } from '../../utils/designTokens.js';

const ROLE_ICON = { giving: ArrowUp, receiving: ArrowDown, maintenance: Wrench };

/**
 * A node's role in balancing (see utils/nodeRoles.js): icon plus the number of
 * guests moving, full sentence in the tooltip. Renders nothing for a node with
 * no role. `label` adds the role word ("Giving 3") where there is room;
 * `showCount={false}` drops the number where a sentence beside it already says it.
 */
export function NodeRoleMarker({ role, label = false, showCount = true, size = 12, className = '' }) {
  if (!role || !NODE_ROLE[role.kind]) return null;
  const tone = NODE_ROLE[role.kind];
  const Icon = ROLE_ICON[role.kind];
  const count = showCount && role.count > 0 ? role.count : null;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[11px] font-semibold tabular-nums whitespace-nowrap ${tone.text} ${className}`}
      title={role.tooltip}
      aria-label={role.sentence}
    >
      <Icon size={size} className="shrink-0" />
      {label
        ? <span>{tone.label}{count != null && (role.kind === 'maintenance' ? ` · ${count} leaving` : ` ${count}`)}</span>
        : count != null && <span>{count}</span>}
    </span>
  );
}

/** One compact legend line for the roles present, or nothing when none are. */
export function NodeRoleLegend({ roles, className = '' }) {
  const present = Object.keys(NODE_ROLE).filter(k => Object.values(roles || {}).some(r => r && r.kind === k));
  if (present.length === 0) return null;
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-pb-text2 dark:text-gray-500 ${className}`}>
      {present.map(k => {
        const Icon = ROLE_ICON[k];
        return (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="inline-block w-1 h-3 rounded-sm" style={{ background: NODE_ROLE[k].edge }} />
            <Icon size={11} className={NODE_ROLE[k].text} />
            <span><span className="text-pb-text dark:text-gray-300">{NODE_ROLE[k].label}</span> — {NODE_ROLE[k].hint}</span>
          </span>
        );
      })}
      <span>Number = guests moving; open a node for names</span>
    </div>
  );
}
