import { MODAL_OVERLAY, MODAL_CONTAINER, BTN_PRIMARY, BTN_SECONDARY } from '../../../../utils/designTokens.js';
import { X, Play, ArrowRight, CheckCircle, XCircle, RefreshCw, Loader, AlertTriangle, Moon } from '../../../Icons.jsx';

const { useMemo } = React;

/**
 * View onto the Run Plan execution. The run loop + state live in useMigrations,
 * so this modal is purely presentational and can be closed any time (the run
 * keeps going in the background and is reachable again via the running pill).
 *
 * Phases: no active run -> confirm (from planCtx); active run -> running | done
 * (from planRun).
 */
export default function RunPlanModal({
  planCtx,
  planRun,
  migrationProgress,
  onStart,
  onClose,
  onDismiss,
}) {
  const phase = planRun ? planRun.phase : 'confirm';
  const running = phase === 'running';

  // Confirm phase reads the pending plan; running/done read the active run.
  const steps = useMemo(() => {
    if (planRun) return planRun.groups.flatMap(([, gs]) => gs);
    return planCtx?.plan?.ordered_recommendations || [];
  }, [planRun, planCtx]);

  const groups = useMemo(() => {
    if (planRun) return planRun.groups;
    const map = new Map();
    for (const s of steps) {
      const g = s.parallel_group || 1;
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(s);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [planRun, steps]);

  const stepStatus = planRun?.stepStatus || {};
  const maxConcurrent = planRun?.maxConcurrent ?? (planCtx?.maxConcurrent || 1);
  const outsideWindow = planCtx?.outsideWindow;

  const successCount = Object.values(stepStatus).filter(s => s.status === 'success').length;
  const failedCount = Object.values(stepStatus).filter(s => s.status === 'failed' || s.status === 'cancelled').length;

  const handleOverlayClick = (e) => { if (e.target === e.currentTarget) onClose(); };

  return (
    <div className={MODAL_OVERLAY} onClick={handleOverlayClick}>
      <div className={`${MODAL_CONTAINER} max-w-2xl`} onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-pb-text dark:text-white">
              {phase === 'confirm' && 'Run migration plan'}
              {phase === 'running' && 'Running plan…'}
              {phase === 'done' && 'Plan finished'}
            </h3>
            <p className="text-xs text-pb-text2 dark:text-gray-400 mt-0.5">
              {steps.length} step{steps.length !== 1 ? 's' : ''} across {groups.length} group{groups.length !== 1 ? 's' : ''}.
              {maxConcurrent === 1
                ? ' Running 1 at a time (max_concurrent_migrations).'
                : ` Up to ${maxConcurrent} at a time within each group, groups run sequentially.`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
            aria-label="Close"
            title={running ? 'Hide — the plan keeps running in the background' : 'Close'}
          >
            <X size={18} />
          </button>
        </div>

        {phase === 'confirm' && outsideWindow && (
          <div className="mb-4 flex items-start gap-2 px-3 py-2 rounded-lg border bg-slate-100 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600/60 text-slate-700 dark:text-slate-300">
            <Moon size={14} className="shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold">Outside migration window</span> — this is a manual run and will execute anyway. Auto-migration scheduling is unaffected.
            </div>
          </div>
        )}

        {phase === 'confirm' && (
          <div className="mb-4 p-3 rounded-lg border bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800/40 text-yellow-700 dark:text-yellow-300 text-xs flex items-start gap-2">
            <AlertTriangle size={14} className="shrink-0 mt-0.5" />
            <div>
              Each step is fired one group at a time. If any migration in a group fails, the run halts and remaining groups are skipped. Already-started migrations cannot be cleanly cancelled. You can close this dialog while it runs — migrations continue in the background and you can reopen it from the “Running plan” button.
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className={`mb-4 p-3 rounded-lg border flex items-start gap-2 text-xs ${
            planRun?.halted
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300'
              : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300'
          }`}>
            {planRun?.halted ? <XCircle size={14} className="shrink-0 mt-0.5" /> : <CheckCircle size={14} className="shrink-0 mt-0.5" />}
            <div>
              <span className="font-semibold">
                {successCount} succeeded
                {failedCount > 0 ? `, ${failedCount} failed` : ''}.
              </span>
              {planRun?.haltMessage && <div className="mt-0.5">{planRun.haltMessage}</div>}
            </div>
          </div>
        )}

        <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
          {groups.map(([groupKey, groupSteps]) => (
            <div key={groupKey}>
              <div className="text-[10px] uppercase tracking-wider text-pb-text2 dark:text-gray-500 px-1 py-1">
                Group {groupKey} {groupSteps.length > 1 && <span className="text-pb-text3 dark:text-gray-600">· {groupSteps.length} in parallel</span>}
              </div>
              {groupSteps.map(step => {
                const st = stepStatus[step.vmid] || { status: 'pending' };
                const prog = migrationProgress?.[step.vmid];
                return (
                  <div
                    key={step.vmid}
                    className={`flex items-center gap-2 text-xs p-2 rounded border bg-white dark:bg-slate-800/40 border-pb-border dark:border-slate-700/50 ${
                      st.status === 'success' ? 'border-l-4 border-l-emerald-500' :
                      st.status === 'failed' || st.status === 'cancelled' ? 'border-l-4 border-l-red-500' :
                      st.status === 'running' ? 'border-l-4 border-l-blue-500' :
                      st.status === 'skipped' ? 'border-l-4 border-l-gray-400 opacity-60' : ''
                    }`}
                  >
                    <span className="shrink-0 w-5 text-center text-[10px] font-bold text-pb-text2 dark:text-gray-500">{step.step}</span>
                    <span className="shrink-0">
                      {st.status === 'pending' && <span className="text-pb-text3 dark:text-gray-600">○</span>}
                      {st.status === 'running' && <Loader size={12} className="animate-spin text-blue-600 dark:text-blue-400" />}
                      {st.status === 'success' && <CheckCircle size={12} className="text-emerald-600 dark:text-emerald-400" />}
                      {(st.status === 'failed' || st.status === 'cancelled') && <XCircle size={12} className="text-red-600 dark:text-red-400" />}
                      {st.status === 'skipped' && <span className="text-pb-text3 dark:text-gray-600">⊘</span>}
                    </span>
                    <span className="font-medium text-pb-text dark:text-gray-200 truncate">
                      [{step.vmid}] {step.name}
                    </span>
                    <span className="text-pb-text2 dark:text-gray-500 truncate">
                      {step.source_node} <ArrowRight size={10} className="inline" /> {step.target_node}
                    </span>
                    <span className="ml-auto shrink-0 text-[10px] text-pb-text2 dark:text-gray-500">
                      {st.status === 'running' && prog?.percentage != null && `${prog.percentage}%`}
                      {st.status === 'failed' && (st.error || 'failed')}
                      {st.status === 'success' && 'done'}
                      {st.status === 'skipped' && 'skipped'}
                      {st.status === 'cancelled' && 'cancelled'}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          {phase === 'confirm' && (
            <>
              <button onClick={onClose} className={BTN_SECONDARY}>Cancel</button>
              <button onClick={onStart} className={BTN_PRIMARY}>
                <Play size={14} /> Run {steps.length} migration{steps.length !== 1 ? 's' : ''}
              </button>
            </>
          )}
          {phase === 'running' && (
            <>
              <div className="mr-auto text-xs text-pb-text2 dark:text-gray-400 flex items-center gap-2">
                <RefreshCw size={12} className="animate-spin" />
                Running — you can close this; it continues in the background.
              </div>
              <button onClick={onClose} className={BTN_SECONDARY}>Close</button>
            </>
          )}
          {phase === 'done' && (
            <button onClick={onDismiss} className={BTN_PRIMARY}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}
