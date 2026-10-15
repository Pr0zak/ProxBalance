import { ChevronDown, ArrowRight, X, Loader } from '../Icons.jsx';
import {
  INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, TAP_TARGET, MODAL_OVERLAY, MODAL_CONTAINER, statusBadge,
} from '../../utils/designTokens.js';
import MoreInfo from '../MoreInfo.jsx';
import { fetchPlacementRules, fetchEnforcePlan, runEnforcePlan } from '../../api/client.js';

const { useState, useEffect, useCallback } = React;

// Where a rule stands now, in a few words.
function ruleState(rule) {
  if (rule.members.length < 2) return { text: `${rule.members.length} guest`, tone: 'muted' };
  if (rule.ok) return { text: rule.kind === 'anti-affinity' ? 'apart' : `together on ${rule.nodes[0]}`, tone: 'ok' };
  if (rule.kind === 'anti-affinity') {
    const shared = {};
    rule.members.forEach(m => { shared[m.node] = (shared[m.node] || 0) + 1; });
    const where = Object.entries(shared).filter(([, n]) => n > 1).map(([node, n]) => `${n} on ${node}`).join(', ');
    return { text: where, tone: 'bad' };
  }
  return { text: `split: ${rule.nodes.join(', ')}`, tone: rule.hard ? 'bad' : 'warn' };
}

const TONE = {
  ok: 'text-emerald-700 dark:text-emerald-400',
  bad: 'text-red-700 dark:text-red-400',
  warn: 'text-amber-700 dark:text-amber-400',
  muted: 'text-pb-text2 dark:text-gray-500',
};

function RuleRow({ rule }) {
  const [open, setOpen] = useState(false);
  const state = ruleState(rule);
  return (
    <li className="border-b last:border-b-0 border-pb-border dark:border-slate-700/60">
      <button type="button" onClick={() => setOpen(!open)} aria-expanded={open}
        className={`${TAP_TARGET} w-full flex items-center gap-2 py-2 text-left`}>
        <span className="font-mono text-sm text-pb-text dark:text-gray-100 truncate min-w-0">
          {rule.source === 'pool' ? `pool ${rule.name}` : rule.name}
        </span>
        <span className={`${statusBadge(rule.hard ? 'purple' : 'gray')} shrink-0`}>{rule.hard ? 'Hard' : 'Soft'}</span>
        <span className={`ml-auto text-xs text-right shrink-0 ${TONE[state.tone]}`}>{state.text}</span>
        <ChevronDown size={14} className={`shrink-0 text-pb-text2 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul className="pb-2 pl-1 space-y-0.5">
          {rule.members.map(m => (
            <li key={m.vmid} className="flex justify-between gap-3 text-xs text-pb-text2 dark:text-gray-400">
              <span className="truncate min-w-0">{m.name} <span className="tabular-nums">{m.vmid}</span></span>
              <span className="font-mono shrink-0">{m.node}</span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

function EnforceModal({ onClose, onDone }) {
  const [plan, setPlan] = useState(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchEnforcePlan().then(setPlan);
  }, []);

  const moves = (plan && !plan.error && plan.moves) || [];
  const unresolved = (plan && !plan.error && plan.unresolved) || [];

  const handleRun = async () => {
    setRunning(true);
    const r = await runEnforcePlan(moves.map(m => m.vmid));
    setRunning(false);
    setResult(r);
    if (!r.error) onDone();
  };

  return (
    <div className={MODAL_OVERLAY} onClick={onClose}>
      <div className={`${MODAL_CONTAINER} sm:max-w-lg`} onClick={e => e.stopPropagation()} role="dialog" aria-label="Enforce hard rules">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-base font-bold text-pb-text dark:text-white">Enforce hard rules</h3>
          <button onClick={onClose} aria-label="Close" className="text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200 p-1">
            <X size={18} />
          </button>
        </div>

        {!plan && <div className="flex justify-center py-6"><Loader size={18} className="animate-spin text-pb-text2 dark:text-gray-400" /></div>}
        {plan?.error && <p className="text-sm text-red-700 dark:text-red-400">{plan.message || plan.error}</p>}

        {plan && !plan.error && (
          <>
            {moves.length === 0 && <p className="text-sm text-pb-text2 dark:text-gray-400">Nothing to move.</p>}
            {moves.length > 0 && (
              <ul className="space-y-1.5">
                {moves.map(m => (
                  <li key={m.vmid} className={`${INNER_CARD} !p-2.5`}>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <span className="text-sm font-medium text-pb-text dark:text-gray-100 truncate min-w-0">
                        {m.name} <span className="text-[11px] text-pb-text2 dark:text-gray-500 tabular-nums">{m.vmid}</span>
                      </span>
                      <span className="flex items-center gap-1 text-xs font-mono text-pb-text2 dark:text-gray-400 shrink-0">
                        {m.source_node}<ArrowRight size={12} />{m.target_node}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono text-pb-text2 dark:text-gray-500 truncate">{m.rule}</div>
                  </li>
                ))}
              </ul>
            )}
            {unresolved.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">Can't fix</div>
                <ul className="space-y-0.5">
                  {unresolved.map(u => (
                    <li key={`${u.rule}-${u.vmid}`} className="text-xs text-pb-text2 dark:text-gray-400">
                      {u.name} {u.vmid} ({u.rule}): {u.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.dry_run && moves.length > 0 && !result && (
              <p className="mt-3 text-xs text-pb-text2 dark:text-gray-400">Dry run is on: nothing will move.</p>
            )}
            {result && (
              <p className={`mt-3 text-sm ${result.error ? 'text-red-700 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {result.error ? result.message : (result.message || 'Started')}
              </p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" onClick={onClose} className={`${TAP_TARGET} ${BTN_SECONDARY}`}>{result ? 'Close' : 'Cancel'}</button>
              {moves.length > 0 && !result && (
                <button type="button" onClick={handleRun} disabled={running} className={`${TAP_TARGET} ${BTN_PRIMARY} flex items-center gap-1.5`}>
                  {running && <Loader size={14} className="animate-spin" />}
                  {plan.dry_run ? `Dry run ${moves.length}` : `Move ${moves.length}`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Affinity / anti-affinity rules from tags and pools, hard vs soft, with an
 * "Enforce now" action for hard rules that are broken.
 */
export default function PlacementRules() {
  const [data, setData] = useState(null);
  const [showEnforce, setShowEnforce] = useState(false);

  const load = useCallback(() => { fetchPlacementRules().then(setData); }, []);
  useEffect(load, [load]);

  if (!data) return null;
  if (data.error || data.success === false) {
    return <p className="text-xs text-pb-text2 dark:text-gray-500">Rules unavailable: {data.message || data.error}</p>;
  }
  const rules = data.rules || [];

  return (
    <div className={`${INNER_CARD} !p-3`}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <h4 className="text-sm font-semibold text-pb-text dark:text-white">Placement rules</h4>
        {data.violations > 0 && (
          <button type="button" onClick={() => setShowEnforce(true)} className={`${TAP_TARGET} ${BTN_PRIMARY} !px-2.5 !py-1 !text-xs`}>
            Enforce now ({data.violations})
          </button>
        )}
      </div>
      {rules.length === 0 ? (
        <p className="text-xs text-pb-text2 dark:text-gray-500">None. Tag guests exclude_&lt;name&gt; or affinity_&lt;name&gt;.</p>
      ) : (
        <ul>{rules.map(r => <RuleRow key={r.id} rule={r} />)}</ul>
      )}
      <MoreInfo
        className="mt-2 text-[11px] text-pb-text2 dark:text-gray-500"
        label="About hard and soft rules"
        detail={`Hard: the target is skipped, or the group moves together. Soft: a split adds ${data.soft_penalty} to the target score. Tag affinity_req_<name> to make an affinity group hard.`}
      >
        Hard rules block a move; soft ones add {data.soft_penalty} to its score.
        {data.pools_available === false && ' Pools unreadable (token needs Pool.Audit).'}
      </MoreInfo>
      {showEnforce && <EnforceModal onClose={() => setShowEnforce(false)} onDone={load} />}
    </div>
  );
}
