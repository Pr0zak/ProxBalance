import { Info, CheckCircle, AlertTriangle } from '../Icons.jsx';
import { GLASS_CARD, INNER_CARD } from '../../utils/designTokens.js';
import SectionHeader from '../SectionHeader.jsx';
import MoreInfo from '../MoreInfo.jsx';
import { parseTimestamp, decisionSkipLabel } from '../../utils/formatters.js';
import { fmtClock, zonedParts } from '../../utils/scheduleWindows.js';

/**
 * The order automigrate.py checks things in, with the numbers filled in from
 * the live automation config, and the path the last run took highlighted.
 */

const windowText = (w) => `${w.name || 'Unnamed'} ${w.start_time || '?'}–${w.end_time || '?'}`;
const listWindows = (ws) => (ws || []).filter(w => w && w.enabled !== false).map(windowText).join(', ');

const pct = (v) => (v == null || Number.isNaN(Number(v)) ? '?' : `${Math.round(Number(v))}%`);

/** Count decision reasons and return the most common few, plain-worded. */
function topReasons(decisions, action, n = 3) {
  const counts = {};
  decisions.filter(d => d.action === action).forEach(d => {
    const r = decisionSkipLabel(d) || String(d.reason || 'no reason given').replace(/\s*\(.*$/, '');
    counts[r] = (counts[r] || 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, n)
    .map(([r, c]) => (c > 1 ? `${r} (×${c})` : r));
}

/**
 * Where the last run stopped: { step, outcome, tone } where step is the
 * step id it stopped at (or 'done'), outcome a one-line explanation.
 */
function lastRunPath(lastRun, config) {
  if (!lastRun || typeof lastRun !== 'object' || !lastRun.status) return null;
  const sc = lastRun.safety_checks || {};
  const mw = String(sc.migration_window || '');
  const health = String(sc.cluster_health || '');
  const decisions = Array.isArray(lastRun.decisions) ? lastRun.decisions : [];
  const executed = decisions.filter(d => ['executed', 'pending', 'failed'].includes(d.action) || d.status === 'success');
  const maxConcurrent = config.rules?.max_concurrent_migrations ?? 3;

  switch (lastRun.status) {
    case 'running':
      return { step: null, outcome: 'Running right now.', tone: 'info' };
    case 'disabled':
      return { step: 'enabled', outcome: 'Automation was off.', tone: 'stop' };
    case 'error':
      return { step: null, outcome: 'The run hit an error; see Script Logs.', tone: 'stop' };
    default:
      break;
  }
  if (lastRun.status === 'skipped') {
    if (/^in blackout/i.test(mw)) {
      const name = mw.replace(/^in blackout:\s*/i, '').replace(/\s*\(.*$/, '');
      return { step: 'blackout', outcome: `In blackout window ${name}.`, tone: 'stop' };
    }
    if (/^outside/i.test(mw)) return { step: 'window', outcome: 'Outside the migration windows.', tone: 'stop' };
    if ((sc.running_migrations ?? 0) >= maxConcurrent) {
      return { step: 'slots', outcome: `${sc.running_migrations} migration${sc.running_migrations === 1 ? ' was' : 's were'} already running.`, tone: 'stop' };
    }
    return { step: null, outcome: 'Skipped.', tone: 'stop' };
  }
  if (lastRun.status === 'failed' && decisions.length === 0 && health && !/passed|disabled/i.test(health)) {
    return { step: 'health', outcome: `Cluster check failed: ${health}.`, tone: 'stop' };
  }
  const n = lastRun.migrations_executed || executed.length;
  if (n > 0) {
    const ok = lastRun.migrations_successful || 0;
    if (lastRun.mode === 'dry_run') return { step: 'done', outcome: `Dry run: logged ${n} move${n === 1 ? '' : 's'}, nothing moved.`, tone: 'ok' };
    return { step: 'done', outcome: `Migrated ${ok} of ${n}.`, tone: ok === n ? 'ok' : 'stop' };
  }
  if (decisions.length === 0) return { step: 'pick', outcome: 'No move was recommended.', tone: 'stop' };
  const observing = decisions.filter(d => d.action === 'observing');
  const filtered = decisions.filter(d => d.action === 'filtered');
  if (filtered.length > 0) {
    return { step: 'checks', outcome: `Every candidate was filtered: ${topReasons(decisions, 'filtered').join('; ')}.`, tone: 'stop' };
  }
  if (observing.length > 0) {
    return { step: 'observe', outcome: `Watching ${observing.length} (${observing.slice(0, 2).map(d => d.name || d.vmid).join(', ')}${observing.length > 2 ? ', …' : ''}).`, tone: 'wait' };
  }
  const skipped = topReasons(decisions, 'skipped');
  return { step: 'run', outcome: skipped.length ? `Nothing moved: ${skipped.join('; ')}.` : 'Nothing moved.', tone: 'stop' };
}

function buildSteps({ automationConfig: c, penaltyConfig: pc, thresholds: t }) {
  const rules = c.rules || {};
  const safety = c.safety_checks || {};
  const im = rules.intelligent_migrations || {};
  const sched = c.schedule || {};
  const memFloor = pc?.source_mem_migration_floor ?? 65;
  const msi = pc?.min_score_improvement ?? 15;
  const mw = listWindows(sched.migration_windows);
  const bw = listWindows(sched.blackout_windows);
  const level = im.intelligence_level || 'standard';
  const levelFilters = {
    basic: '',
    standard: ', cost vs. benefit, past outcomes for this guest',
    full: ', cost vs. benefit, past outcomes, risk, falling-load trend, usual busy hours',
  }[level] || '';

  return [
    { id: 'enabled', title: 'Automation on?', detail: c.enabled ? 'On' : 'Off', no: 'Stop' },
    {
      id: 'window', title: 'Inside a migration window?',
      detail: mw ? `${mw} (${sched.timezone || 'UTC'})` : 'No windows set, so always allowed',
      no: 'Skip this run',
    },
    {
      id: 'blackout', title: 'Outside every blackout?',
      detail: bw || 'No blackouts set',
      no: 'Skip this run',
    },
    {
      id: 'health', title: 'Cluster has quorum?',
      detail: safety.check_cluster_health === false ? 'Check turned off' : 'Checked before every run',
      no: 'Abort',
    },
    {
      id: 'slots', title: 'A migration slot is free?',
      detail: `At most ${rules.max_concurrent_migrations ?? 3} running at once, cluster-wide`,
      no: 'Skip this run',
    },
    {
      id: 'pick', title: 'Is any node overloaded, with a guest worth moving?',
      detail: `Source: CPU ${pct(t?.cpu)}+, memory ${memFloor}%+ or IOWait over ${pct(t?.iowait)}. A move must gain ${msi} points.`,
      lines: [
        `A node is a source when its CPU stays at ${pct(t?.cpu)} or more (15-minute average, weighted with the last day and week), its memory is at ${memFloor}% or more, or its IOWait is over ${pct(t?.iowait)}. Nodes in maintenance always count.`,
        'CPU from guests that never move (ignore tag, passthrough disks) is taken out first; a node over only because of them is not a source.',
        'IOWait from passthrough / NAS storage is exempt: moving guests can\'t lower it.',
        `Each guest's gain is scaled by how much of the node's excess it removes; it must reach ${msi} points.`,
        `The target must stay under ${safety.max_node_cpu_percent || 85}% CPU and ${safety.max_node_memory_percent || 90}% memory.`,
      ],
      no: 'No action',
    },
    {
      id: 'observe', title: `Recommended ${im.observation_periods || 3} runs in a row?`,
      detail: im.enabled === false
        ? 'Smart migrations off, so this check is skipped'
        : `Smart migrations (${level}) wait out short spikes${(im.minimum_data_collection_hours ?? 24) > 0 ? `, after ${im.minimum_data_collection_hours ?? 24} h of data` : ''}`,
      no: 'Keep watching',
    },
    {
      id: 'checks', title: 'Passes the per-guest checks?',
      detail: `Cooldown ${rules.cooldown_minutes ?? 30} min, confidence ${rules.min_confidence_score ?? 75}%+, tags and affinity`,
      lines: [`Not moved in the last ${rules.cooldown_minutes ?? 30} min (longer for frequent movers), not a ping-pong, confidence ${rules.min_confidence_score ?? 75}% or more, no clash with other moves, tags and affinity rules${levelFilters}.`],
      no: 'Filtered',
    },
    {
      id: 'run', title: c.dry_run !== false ? 'Dry run: log the move' : 'Migrate',
      detail: `Up to ${rules.max_migrations_per_run ?? 3} per run, ${rules.grace_period_seconds ?? 30} s apart`,
      lines: [
        'Best move first, then re-check.',
        ...((rules.max_target_inflow_per_cycle ?? 0) > 0 ? [`At most ${rules.max_target_inflow_per_cycle} into any one node per run.`] : []),
        ...(safety.abort_on_failure !== false ? ['A failure stops the rest.'] : []),
        ...(safety.pause_on_failure ? ['A failure turns automation off.'] : []),
      ],
      no: null,
    },
  ];
}

const TONE = {
  stop: { ring: 'ring-2 ring-amber-400 dark:ring-amber-500/70', text: 'text-amber-700 dark:text-amber-300', Icon: AlertTriangle },
  wait: { ring: 'ring-2 ring-sky-400 dark:ring-sky-500/70', text: 'text-sky-700 dark:text-sky-300', Icon: Info },
  ok: { ring: 'ring-2 ring-emerald-400 dark:ring-emerald-500/70', text: 'text-emerald-700 dark:text-emerald-300', Icon: CheckCircle },
  info: { ring: '', text: 'text-pb-text2 dark:text-gray-400', Icon: Info },
};

export default function DecisionTreeFlowchart({ automationConfig, automationStatus, penaltyConfig, thresholds, setActiveTab }) {
  if (!automationConfig) return null;
  const steps = buildSteps({ automationConfig, penaltyConfig, thresholds });
  const lastRun = automationStatus?.state?.last_run;
  const path = lastRunPath(lastRun, automationConfig);
  const stopIdx = path?.step === 'done' ? steps.length - 1 : steps.findIndex(s => s.id === path?.step);
  const tone = TONE[path?.tone] || TONE.info;

  const when = lastRun?.timestamp ? parseTimestamp(lastRun.timestamp) : null;
  const whenText = when ? fmtClock(zonedParts(when, automationConfig.schedule?.timezone).minute) : null;

  return (
    <div className={GLASS_CARD + ' overflow-hidden'}>
      <SectionHeader title="How a run decides" icon={Info} accent={['amber', 'orange']} />

      {path ? (
        <div className={`${INNER_CARD} mb-3 flex items-start gap-2 text-sm`}>
          <tone.Icon size={16} className={`shrink-0 mt-0.5 ${tone.text}`} />
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-pb-text dark:text-white">Last run{whenText ? ` ${whenText}` : ''}: </span>
            <span className="text-pb-text dark:text-gray-200">
              {stopIdx >= 0 && path.step !== 'done' ? `step ${stopIdx + 1} · ` : ''}{path.outcome}
            </span>
          </div>
          {setActiveTab && (
            <button onClick={() => setActiveTab('history')} className="shrink-0 text-xs text-pb-accent dark:text-pb-accent-dark hover:underline">History</button>
          )}
        </div>
      ) : (
        <p className="text-sm text-pb-text2 dark:text-gray-400 mb-3">No run recorded yet. Steps run top to bottom; the first "no" ends the run.</p>
      )}

      <ol className="space-y-2">
        {steps.map((s, i) => {
          const reached = stopIdx < 0 || i <= stopIdx;
          const isStop = i === stopIdx;
          const passed = stopIdx >= 0 && i < stopIdx;
          return (
            <li
              key={s.id}
              className={`${INNER_CARD} !py-2.5 flex items-start gap-3 ${isStop ? tone.ring : ''} ${reached ? '' : 'opacity-60'}`}
            >
              <span className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${passed
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300'
                : isStop
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300'
                  : 'bg-slate-200 text-slate-700 dark:bg-slate-600/60 dark:text-slate-200'}`}
              >
                {passed ? <CheckCircle size={14} /> : i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                  <span className="text-sm font-semibold text-pb-text dark:text-white">{s.title}</span>
                  {s.no && <span className="text-xs text-pb-text2 dark:text-gray-400">No → {s.no}</span>}
                </div>
                {s.detail && (s.lines?.length
                  ? <MoreInfo className="text-xs text-pb-text2 dark:text-gray-400 mt-0.5" label={`More about step ${i + 1}`} detail={s.lines.join('\n')}>{s.detail}</MoreInfo>
                  : <p className="text-xs text-pb-text2 dark:text-gray-400 mt-0.5">{s.detail}</p>)}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
