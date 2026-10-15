import {
  CheckCircle, XCircle, AlertTriangle, ArrowRight, ChevronDown,
  RotateCcw, Play, Lock, RefreshCw, Eye, Pause, Clock, MinusCircle,
} from '../../Icons.jsx';
import { fetchRollbackInfo, executeRollback } from '../../../api/client.js';
import { INNER_CARD, BTN_PRIMARY, BTN_SECONDARY, BTN_DANGER, statusBadge } from '../../../utils/designTokens.js';
import EngineDetail from './EngineDetail.jsx';
import { seenCountDetail } from './seenCount.js';
import {
  autoStatus, moveBars, reasonSentence, whyBullets, riskLabel, seenSummary,
  guestSize, haWarnings, fmtPct, storageWarnings,
} from './cardModel.js';

const STATUS_ICON = { ready: CheckCircle, waiting: Clock, paused: Pause, blocked: AlertTriangle, storage: AlertTriangle, manual: MinusCircle };

/**
 * The one status chip: auto-eligibility and the seen count together. Hover
 * shows the explanation as a tooltip; tapping shows it as a line under the
 * card's first row (phones never see title tooltips).
 */
function StatusChip({ status, open, onToggle }) {
  const Icon = status.key === 'ready' && status.color === 'blue' ? Eye : STATUS_ICON[status.key] || Clock;
  const text = status.lines.join(' ');
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={`${statusBadge(status.color)} !gap-1 !px-2 !text-[11px] tabular-nums cursor-pointer whitespace-nowrap`}
      title={text}
      aria-expanded={open}
      aria-label={`${status.label}. ${text}`}
      data-status-chip={status.key}
    >
      <Icon size={11} /> {status.label}
    </button>
  );
}

/**
 * One node's before → after on the driving metric: a bar filled to the load
 * that stays, a lighter segment for the load that leaves (source) or arrives
 * (target), and a tick at the automation limit. No after value → no segment.
 */
function MoveBar({ side, role, limit }) {
  const { node, before, after } = side;
  const has = before != null;
  const hasAfter = has && after != null;
  const lo = hasAfter ? Math.min(before, after) : before;
  const hi = hasAfter ? Math.max(before, after) : before;
  const shown = hasAfter ? after : before;
  const over = limit != null && shown != null && shown > limit;
  const fill = over ? 'bg-red-500 dark:bg-red-400' : 'bg-slate-400 dark:bg-slate-500';
  const delta = role === 'source'
    ? 'bg-emerald-300 dark:bg-emerald-500/50'
    : 'bg-amber-400 dark:bg-amber-400/70';
  const title = !has ? `${node}: no current reading`
    : hasAfter ? `${node}: ${fmtPct(before)} now, about ${fmtPct(after)} after the move`
    : `${node}: ${fmtPct(before)} now; no prediction for after the move`;
  const fullTitle = limit != null ? `${title} (tick: automation limit ${fmtPct(limit)})` : title;
  return (
    <div className="flex items-center gap-2 min-w-0" title={fullTitle} data-move-bar={role}>
      <span className="text-xs font-semibold text-pb-text dark:text-gray-200 shrink-0">{node}</span>
      <span className="relative h-2 w-16 sm:w-24 shrink-0 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden" aria-hidden="true">
        {has && <span className={`absolute inset-y-0 left-0 ${fill}`} style={{ width: `${lo}%` }} />}
        {hasAfter && hi > lo && <span className={`absolute inset-y-0 ${delta}`} style={{ left: `${lo}%`, width: `${hi - lo}%` }} />}
        {limit != null && <span className="absolute inset-y-0 w-px bg-slate-600 dark:bg-slate-300" style={{ left: `${Math.min(99.5, limit)}%` }} />}
      </span>
      <span className={`text-xs tabular-nums whitespace-nowrap ${over ? 'text-red-600 dark:text-red-400' : 'text-pb-text dark:text-gray-300'}`}>
        {fmtPct(before)}{hasAfter && <> <span className="text-pb-text2 dark:text-gray-500">→</span> {fmtPct(after)}</>}
      </span>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div className="sm:flex sm:gap-3">
      <div className="sm:w-36 shrink-0 font-medium text-pb-text2 dark:text-gray-400 mb-0.5 sm:mb-0">{label}</div>
      <div className="min-w-0 flex-1 text-pb-text dark:text-gray-300">{children}</div>
    </div>
  );
}

// Clipboard write that also works on plain-HTTP origins.
function copyCommand(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { navigator.clipboard.writeText(text); return; }
  } catch (e) { /* fall through */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
  } catch (e) { /* nothing else to try */ }
}

export default function RecommendationCard({
  rec, recommendationData,
  migrationStatus, setMigrationStatus, completedMigrations, guestsMigrating, migrationProgress,
  cancelMigration, setConfirmMigration, canMigrate,
  automationStatus, automationConfig,
  // The guest's collector record (cores, HA placement, ignore tag), if known
  guest,
  // { target, cap } when the per-node inflow cap leaves this move out of automation's next run
  inflow,
  // Run order: 1-based step in the (active) execution plan
  step,
  // Multi-select ("run / copy just these")
  selectable = false, selected = false, onToggleSelect,
  // Live conflict state (after deferrals); defaults to the engine's flag
  conflictActive,
}) {
  const hasConflict = conflictActive ?? !!rec.has_conflict;
  const [expanded, setExpanded] = React.useState(false);
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [showEngine, setShowEngine] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const key = `${rec.vmid}-${rec.target_node}`;
  const status = migrationStatus[key];
  const completed = completedMigrations[rec.vmid];
  const isCompleted = completed !== undefined;
  const isMaintenance = rec.structured_reason?.primary_reason === 'maintenance_evacuation'
    || (rec.reason && rec.reason.toLowerCase().includes('maintenance'));
  const changeLog = recommendationData?.changes_since_last;
  const isNewRec = changeLog?.new_recommendations?.some(r => String(r.vmid) === String(rec.vmid));
  const changedTarget = changeLog?.changed_targets?.find(r => String(r.vmid) === String(rec.vmid));
  const params = recommendationData?.parameters;

  const auto = autoStatus(rec, { automation: automationStatus, config: automationConfig, guest, inflow });
  const bars = moveBars(rec, recommendationData?.summary, params);
  const reason = reasonSentence(rec, params);
  const why = whyBullets(rec);
  const risk = riskLabel(rec);
  const seen = seenSummary(rec);
  const size = guestSize(rec, guest);
  const ha = haWarnings(rec, guest);
  const warnings = [
    hasConflict && `Several suggestions target ${rec.conflict_target || rec.target_node}; together they may push it over the limits.`,
    inflow && `Inflow cap: automation sends at most ${inflow.cap} migration${inflow.cap === 1 ? '' : 's'} into ${inflow.target} per run.`,
    ...ha.map(w => `HA rule: ${w}`),
    ...(rec.affinity_split || []).map(g => `Splits soft group ${g}.`),
    ...storageWarnings(rec),
    changedTarget && `Target changed from ${changedTarget.old_target} to ${changedTarget.new_target} since the last generation.`,
    rec.bind_mount_warning && rec.bind_mount_warning.replace(/^[⚠ℹ]️?\s*/, ''),
  ].filter(Boolean);

  const shell = isCompleted
    ? 'rounded-lg p-3 sm:p-4 border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-80'
    : isMaintenance
    ? 'rounded-lg p-3 sm:p-4 border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-900/10'
    : INNER_CARD;

  const isMigrating = guestsMigrating[rec.vmid] === true;

  const renderAction = () => {
    if (isCompleted) {
      if (!canMigrate) return null;
      const rb = migrationStatus[`rollback-${rec.vmid}`];
      return (
        <button
          onClick={async () => {
            try {
              const infoRes = await fetchRollbackInfo(rec.vmid);
              if (infoRes.error || !infoRes.success) {
                setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'unavailable' }));
                return;
              }
              const info = infoRes.rollback_info;
              if (!info.available) { alert(`Rollback unavailable: ${info.detail}`); return; }
              if (!info.rollback_safe) {
                if (!confirm(`Rollback may be risky: ${info.detail}\n\nProceed anyway?`)) return;
              }
              if (!confirm(`Rollback ${rec.type} ${rec.vmid} (${rec.name}) back to ${info.original_node}?`)) return;
              setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'running' }));
              const result = await executeRollback(rec.vmid);
              if (result.success) {
                setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'done' }));
              } else {
                alert(`Rollback failed: ${result.error || 'Unknown error'}`);
                setMigrationStatus(prev => ({ ...prev, [`rollback-${rec.vmid}`]: 'failed' }));
              }
            } catch (err) { alert(`Rollback error: ${err.message}`); }
          }}
          disabled={rb === 'running'}
          className={`${BTN_SECONDARY} !px-3 !py-1.5 !text-xs`}
          title="Rollback: migrate back to original node"
        >
          {rb === 'running' ? <><RefreshCw size={12} className="animate-spin" /> Rolling back…</>
            : rb === 'done' ? <><CheckCircle size={12} /> Rolled back</>
            : <><RotateCcw size={12} /> Rollback</>}
        </button>
      );
    }
    if (isMigrating && canMigrate) {
      const progress = migrationProgress[rec.vmid];
      let progressText = '';
      let tooltipText = 'Cancel migration in progress';
      if (progress) {
        if (progress.percentage) {
          progressText = ` ${progress.percentage}%`;
          if (progress.total_human_readable) tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
        } else {
          progressText = ` (${progress.human_readable})`;
        }
      }
      return (
        <button onClick={() => cancelMigration(rec.vmid, rec.target_node)} className={`${BTN_DANGER} !px-3 !py-1.5 animate-pulse`} title={tooltipText}>
          <RefreshCw size={14} className="animate-spin" /> Cancel{progressText}
        </button>
      );
    }
    return (
      <button
        onClick={() => setConfirmMigration(rec)}
        disabled={!canMigrate || status === 'running' || isMigrating}
        className={`${BTN_PRIMARY} !px-3 !py-1.5`}
        title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : 'Review and start this migration'}
        data-rec-migrate
      >
        {!canMigrate ? <><Lock size={14} /> Read-only</>
          : isMigrating ? <><RefreshCw size={14} className="animate-spin" /> Migrating…</>
          : status === 'running' ? <><RefreshCw size={14} className="animate-spin" /> Starting…</>
          : <><Play size={14} /> Migrate</>}
      </button>
    );
  };

  return (
    <div
      className={`${shell} ${selected && !isCompleted ? 'ring-2 ring-blue-500/70 dark:ring-blue-400/60' : ''}`}
      data-rec-card={rec.vmid}
    >
      {/* Line 1: who, status, action */}
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-2 gap-y-1">
          {selectable && !isCompleted && (
            <input
              type="checkbox"
              data-rec-select
              checked={selected}
              onChange={() => onToggleSelect?.(rec.vmid)}
              className="w-4 h-4 rounded accent-blue-500 cursor-pointer"
              aria-label={`Select ${rec.name} to run or copy with others`}
            />
          )}
          {step != null && !isCompleted && (
            <span
              className="shrink-0 min-w-[1.5rem] h-6 px-1 inline-flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold tabular-nums"
              title={`Step ${step} of the run order`}
            >
              {step}
            </span>
          )}
          <span className={`font-semibold min-w-0 break-words ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-pb-text dark:text-white'}`}>
            <span className="text-pb-text2 dark:text-gray-400 font-medium">{rec.type} {rec.vmid}</span> {rec.name}
          </span>
          {isCompleted
            ? <span className={statusBadge('green')}><CheckCircle size={12} /> Migrated</span>
            : <StatusChip status={auto} open={statusOpen} onToggle={() => setStatusOpen(o => !o)} />}
          {status === 'failed' && <XCircle size={16} className="text-red-600 dark:text-red-400" title="Last attempt failed" />}
        </div>
        <div className="shrink-0">{renderAction()}</div>
      </div>
      {statusOpen && !isCompleted && (
        <div className="mt-1 text-[11px] leading-snug text-pb-text2 dark:text-gray-400 space-y-0.5" data-status-detail>
          {auto.lines.map((t, i) => <p key={i}>{t}</p>)}
        </div>
      )}

      {/* Line 2: before → after on the metric that drives the move */}
      {isCompleted ? (
        <div className="mt-2 text-sm text-green-700 dark:text-green-300 flex items-center gap-1.5">
          {rec.source_node} <ArrowRight size={14} /> {completed.newNode}
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <MoveBar side={bars.source} role="source" limit={bars.limit} />
          <MoveBar side={bars.target} role="target" limit={bars.limit} />
          <span className="text-[11px] text-pb-text2 dark:text-gray-500">
            {bars.source.after != null || bars.target.after != null ? `${bars.label} after move` : `${bars.label} now`}
          </span>
        </div>
      )}

      {/* Line 3: the reason, and the details toggle */}
      <div className="mt-1.5 flex items-start gap-2">
        <p className={`flex-1 min-w-0 text-xs ${isMaintenance ? 'text-amber-700 dark:text-amber-300 font-medium' : 'text-pb-text2 dark:text-gray-400'}`}>
          {reason}
          {hasConflict && !isCompleted && (
            <span className="ml-2 inline-flex items-center gap-0.5 text-amber-700 dark:text-amber-400 font-medium" title={`Several suggestions target ${rec.conflict_target || rec.target_node}`}>
              <AlertTriangle size={11} /> conflict
            </span>
          )}
        </p>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(v => !v); }}
          className="shrink-0 inline-flex items-center gap-0.5 text-xs font-medium text-pb-accent dark:text-indigo-300 hover:underline"
          aria-expanded={expanded}
          data-rec-details-toggle
        >
          Details
          <ChevronDown size={14} className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-pb-border-dark space-y-2.5 text-xs" data-rec-details>
          <DetailRow label="Assessment">
            <span className="tabular-nums">Confidence {rec.confidence_score != null ? `${Math.round(rec.confidence_score)}%` : '—'}</span>
            {rec.ai_confidence_adjustment ? (
              <span className="text-pb-text2 dark:text-gray-400"> (AI {rec.ai_confidence_adjustment > 0 ? '+' : ''}{rec.ai_confidence_adjustment})</span>
            ) : null}
            <span className="text-pb-text2 dark:text-gray-500"> · </span>
            <span
              className={risk === 'high' || risk === 'very high' ? 'text-red-600 dark:text-red-400 font-medium' : risk === 'medium' ? 'text-amber-700 dark:text-amber-400' : ''}
              title={rec.risk_factors?.map(f => f.detail).filter(Boolean).join('\n') || undefined}
            >
              Risk {risk || '—'}
            </span>
          </DetailRow>

          {why.length > 0 && (
            <DetailRow label="Why">
              <ul className="list-disc pl-4 space-y-0.5">
                {why.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </DetailRow>
          )}

          {(seen || isNewRec) && (
            <DetailRow label="Seen in automation">
              {seen && <div>{seen}</div>}
              {seen && seenCountDetail(rec).map((t, i) => (
                <p key={i} className="text-pb-text2 dark:text-gray-400">{t}</p>
              ))}
              {isNewRec && <p className="text-pb-text2 dark:text-gray-400">New in this generation.</p>}
            </DetailRow>
          )}

          {size && <DetailRow label="Guest size">{size}</DetailRow>}

          {warnings.length > 0 && (
            <DetailRow label="Warnings">
              <ul className="space-y-0.5">
                {warnings.map((t, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-amber-800 dark:text-amber-300">
                    <AlertTriangle size={12} className="shrink-0 mt-0.5" /> <span>{t}</span>
                  </li>
                ))}
              </ul>
            </DetailRow>
          )}

          {rec.ai_insight && <DetailRow label="AI note">{rec.ai_insight}</DetailRow>}

          {rec.command && (
            <DetailRow label="Command">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); copyCommand(rec.command); setCopied(true); setTimeout(() => setCopied(false), 1200); }}
                className={`w-full text-left font-mono p-2 rounded break-all transition-colors ${copied
                  ? 'bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                  : 'bg-white dark:bg-gray-900 border border-slate-200 dark:border-pb-border-dark text-pb-text dark:text-gray-300 hover:border-pb-accent/60'}`}
                title="Click to copy"
              >
                {copied ? 'Copied!' : rec.command}
              </button>
            </DetailRow>
          )}

          {(rec.score_details || rec.trend_evidence?.available) && (
            <div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setShowEngine(v => !v); }}
                className="inline-flex items-center gap-0.5 font-medium text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
                aria-expanded={showEngine}
              >
                Scores and trends
                <ChevronDown size={12} className={`transition-transform duration-200 ${showEngine ? 'rotate-180' : ''}`} />
              </button>
              {showEngine && (
                <div className="mt-2 p-3 rounded-lg bg-white dark:bg-pb-surface-dark border border-slate-200 dark:border-pb-border-dark">
                  <EngineDetail rec={rec} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
