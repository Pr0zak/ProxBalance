import {
  AlertTriangle, X, Power
} from '../Icons.jsx';
import {
  GLASS_CARD, INNER_CARD, ICON, iconBadge, statusBadge, BTN_SECONDARY, TAP_TARGET } from '../../utils/designTokens.js';
import Toggle from '../Toggle.jsx';
import ApprovalQueue from './ApprovalQueue.jsx';
import { automationModes } from '../../utils/automationStory.js';
import { parseTimestamp } from '../../utils/formatters.js';
import {
  scheduleOutlook, nextCheckInfo, reasonPhrase, flipPhrase, fmtDuration, fmtClock, zonedParts, useNow,
} from '../../utils/scheduleWindows.js';

const { useState } = React;

// Clock time in the schedule timezone, matching the schedule tab.
const fmtTime = (d, tz) => fmtClock(zonedParts(d, tz).minute);

/**
 * One-line live state of the automation runner. The time-window part comes
 * from the same `scheduleOutlook` the schedule tab uses, so both always agree
 * (e.g. both say "blackout" while a blackout is active).
 */
function describeStatus(automationStatus, automationConfig, now) {
  const st = automationStatus || {};
  const enabled = st.enabled ?? automationConfig.enabled;
  if (!enabled) return { color: 'gray', label: 'Off', detail: 'Nothing will be migrated automatically' };
  if (st.timer_active === false) return { color: 'orange', label: 'Paused', detail: 'Timer paused, scheduled checks are not running' };
  const outlook = scheduleOutlook(automationConfig.schedule, now);
  const flip = flipPhrase(outlook);
  if (!outlook.allowed) {
    const label = outlook.reason === 'blackout' ? 'Blackout' : 'Idle';
    return { color: outlook.reason === 'blackout' ? 'red' : 'gray', label, detail: `Blocked: ${reasonPhrase(outlook)}${flip ? `. ${flip}` : ''}` };
  }
  const until = outlook.next ? `. ${flip}` : '';
  if (st.dry_run ?? automationConfig.dry_run) {
    return { color: 'yellow', label: 'Dry run', detail: `Checks log decisions, nothing moves${until}` };
  }
  return { color: 'green', label: 'Active', detail: `Live migrations${outlook.reason === 'window' ? ` (${reasonPhrase(outlook)})` : ''}${until}` };
}

function lastRunText(lastRun, tz) {
  if (!lastRun || typeof lastRun !== 'object' || !lastRun.timestamp) return null;
  const when = parseTimestamp(lastRun.timestamp);
  if (!when) return null;
  const executed = lastRun.migrations_executed || 0;
  let what;
  if (lastRun.status === 'skipped') {
    const w = (lastRun.safety_checks?.migration_window || '').toLowerCase();
    what = w.startsWith('outside') ? 'skipped (outside window)'
      : w.startsWith('in blackout') ? 'skipped (blackout)' : 'skipped';
  } else if (executed > 0) {
    what = `${lastRun.migrations_successful || 0}/${executed} migrated`;
  } else {
    what = (lastRun.status || 'no action').replace(/_/g, ' ');
  }
  return `Last run ${fmtTime(when, tz)} · ${what}`;
}

function nextCheckText(automationStatus, automationConfig, now) {
  const check = nextCheckInfo(automationStatus, automationConfig, now);
  if (!check) return null;
  const inText = check.minutesUntil > 0 ? ` (in ${fmtDuration(check.minutesUntil)})` : '';
  return `Next check ${check.clock}${inText}${check.allowed ? '' : ', will skip'}`;
}

export default function QuickSetupSection({
  automationConfig, saveAutomationConfig, automationStatus, fetchAutomationStatus,
}) {
  const [confirmEnableAutomation, setConfirmEnableAutomation] = useState(false);
  const [confirmDisableDryRun, setConfirmDisableDryRun] = useState(false);

  const now = useNow(30000);
  const status = describeStatus(automationStatus, automationConfig, now);
  const meta = [lastRunText(automationStatus?.state?.last_run, automationConfig.schedule?.timezone), nextCheckText(automationStatus, automationConfig, now)]
    .filter(Boolean).join(' · ');
  const enabled = automationConfig.enabled || false;
  const dryRun = automationConfig.dry_run !== false;
  const mode = automationConfig.mode === 'semi' ? 'semi' : 'automatic';
  const safety = automationConfig.safety_checks || {};
  const modes = automationModes({ cpu: safety.max_node_cpu_percent ?? 85, mem: safety.max_node_memory_percent ?? 90 });

  return (
    <div className={GLASS_CARD}>
      {/* Status: on phones a single line (badge + detail); desktop adds the
          title and last-run / next-check line. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3">
        <div className={`${iconBadge('blue', 'cyan')} hidden sm:block`}><Power size={ICON.section} /></div>
        <h2 className="hidden sm:block text-xl font-bold text-pb-text dark:text-white">Quick Setup</h2>
        <span className={statusBadge(status.color)}>
          <span className="w-1.5 h-1.5 rounded-full bg-current" />
          {status.label}
        </span>
        <span className="flex-1 sm:flex-none min-w-0 text-xs sm:text-sm text-pb-text2 dark:text-gray-400">{status.detail}</span>
        {meta && (
          <span className="hidden sm:inline w-full lg:w-auto lg:ml-auto text-xs text-pb-text2 dark:text-gray-500 tabular-nums">{meta}</span>
        )}
      </div>

      {/* The two master switches, side by side (stacked on the narrowest phones) */}
      <div className="grid grid-cols-1 min-[375px]:grid-cols-2 gap-2 sm:gap-3">
        <div className={`${INNER_CARD} !py-2 sm:!py-3 min-h-[44px] flex items-center justify-between gap-2`}>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-pb-text dark:text-white leading-tight">
              <span className="sm:hidden">Automation</span>
              <span className="hidden sm:inline">Automated migrations</span>
            </div>
            <div className="hidden sm:block text-xs text-pb-text2 dark:text-gray-400">
              {enabled ? `On · checks every ${automationConfig.check_interval_minutes || 5} min` : 'Off · nothing moves on its own'}
            </div>
          </div>
          <Toggle
            className="ml-0"
            checked={enabled}
            onChange={(e) => {
              if (e.target.checked) {
                setConfirmEnableAutomation(true);
              } else {
                saveAutomationConfig({ enabled: false });
              }
            }}
          />
        </div>

        <div className={`${INNER_CARD} !py-2 sm:!py-3 min-h-[44px] flex items-center justify-between gap-2`}>
          <div className="min-w-0">
            <div className="font-semibold text-sm text-pb-text dark:text-white leading-tight">Dry run</div>
            <div className={`hidden sm:block text-xs ${dryRun ? 'text-pb-text2 dark:text-gray-400' : 'text-amber-600 dark:text-amber-400 font-medium'}`}>
              {dryRun ? 'On · decisions are logged, nothing moves' : 'Off · migrations are real'}
            </div>
          </div>
          <Toggle
            className="ml-0"
            checked={dryRun}
            color="yellow"
            onChange={(e) => {
              if (!e.target.checked) {
                setConfirmDisableDryRun(true);
              } else {
                saveAutomationConfig({ dry_run: true });
              }
            }}
          />
        </div>
      </div>

      {/* Mode: what runs without asking. Acts immediately, like the switches. */}
      <div role="radiogroup" aria-label="Automation mode" className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mt-2 sm:mt-3">
        {modes.map(m => {
          const selected = mode === m.id;
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => { if (!selected) saveAutomationConfig({ mode: m.id }); }}
              className={`${INNER_CARD} !py-2 sm:!py-3 min-h-[44px] text-left flex items-start gap-2 transition-colors ${selected
                ? '!border-pb-accent dark:!border-pb-accent-dark ring-1 ring-pb-accent/40 dark:ring-pb-accent-dark/40'
                : 'hover:border-slate-300 dark:hover:border-slate-600'}`}
            >
              <span className={`mt-1 w-3 h-3 rounded-full border-2 shrink-0 ${selected
                ? 'border-pb-accent dark:border-pb-accent-dark bg-pb-accent dark:bg-pb-accent-dark'
                : 'border-slate-400 dark:border-slate-500'}`} />
              <span className="min-w-0">
                <span className="block font-semibold text-sm text-pb-text dark:text-white leading-tight">{m.label}</span>
                <span className="block text-xs text-pb-text2 dark:text-gray-400">{m.line}</span>
              </span>
            </button>
          );
        })}
      </div>

      {mode === 'semi' && (
        <ApprovalQueue
          queue={automationStatus?.approval_queue}
          dryRun={dryRun}
          onChanged={fetchAutomationStatus}
        />
      )}

      {/* Confirmations for the two switches that act immediately */}
      {confirmEnableAutomation && (
        <div className="mt-3">
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-300 dark:border-orange-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-orange-800 dark:text-orange-200 mb-2">Enable Automated Migrations?</div>
                <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                  The system will automatically migrate VMs based on your configured rules.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      saveAutomationConfig({ enabled: true });
                      setConfirmEnableAutomation(false);
                    }}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium flex items-center justify-center gap-1.5"
                  >
                    <Power size={14} />
                    Enable Automation
                  </button>
                  <button
                    onClick={() => setConfirmEnableAutomation(false)}
                    className={`${TAP_TARGET} ${BTN_SECONDARY} !px-3 !py-1.5`}
                  >
                    <X size={14} />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {confirmDisableDryRun && (
        <div className="mt-3">
          <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-600 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-bold text-red-800 dark:text-red-200 mb-2 text-lg">DISABLE DRY RUN MODE?</div>
                <div className="text-sm text-red-700 dark:text-red-300 space-y-2 mb-4">
                  <p className="font-semibold">This will enable REAL automated migrations!</p>
                  <p>VMs will actually be migrated automatically based on your configured rules.</p>
                  <p className="font-semibold">Are you absolutely sure?</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      saveAutomationConfig({ dry_run: false });
                      setConfirmDisableDryRun(false);
                    }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-1.5"
                  >
                    <AlertTriangle size={14} />
                    Yes, Disable Dry Run
                  </button>
                  <button
                    onClick={() => setConfirmDisableDryRun(false)}
                    className={`${TAP_TARGET} ${BTN_SECONDARY} !px-3 !py-1.5`}
                  >
                    <X size={14} />
                    Cancel (Keep Dry Run On)
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
