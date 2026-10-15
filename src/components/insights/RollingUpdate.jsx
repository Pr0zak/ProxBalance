import { ChevronDown, ArrowRight } from '../Icons.jsx';
import { statusBadge } from '../../utils/designTokens.js';
import { Loading, Failed } from './shared.jsx';
import { fmtGb } from './failureModel.js';
import { stepChip, stepSummary, stepOpenByDefault, quorumTone, maintenanceHref } from './rollingModel.js';

const { useState, useEffect } = React;

const TONE_TEXT = {
  green: 'text-emerald-700 dark:text-emerald-300',
  red: 'text-red-700 dark:text-red-300',
  gray: 'text-pb-text dark:text-gray-200',
};

const GuestName = ({ g }) => (
  <span className="min-w-0 truncate text-pb-text dark:text-gray-200">
    {g.name} <span className="text-pb-text3 dark:text-gray-500">{g.type} {g.vmid}</span>
  </span>
);

function Group({ title, items, children }) {
  if (!items.length) return null;
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-pb-text2 dark:text-gray-400 mb-1">{title} · {items.length}</div>
      <ul className="space-y-1">{items.map(children)}</ul>
    </div>
  );
}

function StepDetails({ step, selfGuest }) {
  return (
    <div className="mt-2 space-y-3 text-xs">
      {step.hosts_proxbalance && selfGuest && (
        <p className="text-amber-700 dark:text-amber-300">
          {selfGuest.name} ({selfGuest.type} {selfGuest.vmid}) moves in this step: this page goes away while it restarts.
        </p>
      )}
      <Group title="Move" items={step.moves}>
        {m => (
          <li key={m.vmid} className="flex items-center gap-2">
            <GuestName g={m} />
            {m.restarts && <span className={`${statusBadge('gray')} !px-1.5 !py-0 shrink-0 !hidden sm:!inline-flex`} title="Containers restart when they migrate">restarts</span>}
            {m.ignored && <span className={`${statusBadge('yellow')} !px-1.5 !py-0 shrink-0`} title="Tagged ignore: the maintenance flow skips it, so move it by hand">ignored</span>}
            {m.ha_managed && <span className={`${statusBadge('blue')} !px-1.5 !py-0 shrink-0 !hidden sm:!inline-flex`} title="Proxmox HA moves it when the node enters maintenance">HA</span>}
            <span className="ml-auto shrink-0 tabular-nums text-pb-text2 dark:text-gray-400 whitespace-nowrap">
              → {m.to} · {fmtGb(m.mem_gb)}{m.copy_gb ? <span className="hidden sm:inline"> · copy {fmtGb(m.copy_gb)}</span> : null}
            </span>
          </li>
        )}
      </Group>
      <Group title="Must shut down" items={step.must_stop}>
        {g => (
          <li key={g.vmid}>
            <div className="flex items-center gap-2"><GuestName g={g} /><span className="ml-auto shrink-0 tabular-nums text-pb-text2 dark:text-gray-400">{fmtGb(g.mem_gb)}</span></div>
            <div className="text-pb-text2 dark:text-gray-400 break-words">{g.reason}</div>
          </li>
        )}
      </Group>
      <Group title="Doesn't fit" items={step.doesnt_fit}>
        {g => (
          <li key={g.vmid}>
            <div className="flex items-center gap-2"><GuestName g={g} /><span className="ml-auto shrink-0 tabular-nums text-red-700 dark:text-red-300">{fmtGb(g.mem_gb)}</span></div>
            <div className="text-pb-text2 dark:text-gray-400 break-words">{g.reason}</div>
          </li>
        )}
      </Group>
      {step.targets.length > 0 && (
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-pb-text2 dark:text-gray-400 mb-1">Memory after</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 tabular-nums">
            {step.targets.map(t => (
              <span key={t.node} className="whitespace-nowrap text-pb-text2 dark:text-gray-400">
                <span className="font-semibold text-pb-text dark:text-gray-200">{t.node}</span>{' '}
                {Math.round(t.mem_before)}%<ArrowRight size={10} className="inline mx-0.5 text-pb-text3 dark:text-gray-500" />
                <span className={t.mem_after > 85 ? 'font-semibold text-amber-700 dark:text-amber-300' : 'text-pb-text dark:text-gray-200'}>{Math.round(t.mem_after)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {step.stays_stopped > 0 && (
        <p className="text-pb-text2 dark:text-gray-400">{step.stays_stopped} stopped {step.stays_stopped === 1 ? 'guest stays' : 'guests stay'} on {step.node}.</p>
      )}
      {step.status !== 'offline' && (
        <a href={maintenanceHref(step.node)} className="inline-block font-medium text-pb-accent dark:text-pb-accent-dark hover:underline">
          Start maintenance on {step.node}
        </a>
      )}
    </div>
  );
}

function Step({ index, step, selfGuest }) {
  const [open, setOpen] = useState(stepOpenByDefault(step));
  useEffect(() => { setOpen(stepOpenByDefault(step)); }, [step.node, step.status]);
  const chip = stepChip(step);
  return (
    <li className="border-t border-pb-border dark:border-slate-700/70 pt-2">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex flex-wrap sm:flex-nowrap items-center gap-x-2 gap-y-0.5 text-left text-sm">
        <ChevronDown size={14} className={`shrink-0 text-pb-text3 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        <span className="tabular-nums text-pb-text3 dark:text-gray-500 w-4 shrink-0">{index + 1}</span>
        <span className="font-semibold text-pb-text dark:text-gray-100 shrink-0">{step.node}</span>
        <span className={`${statusBadge(chip.tone)} !px-2 !py-0 shrink-0 whitespace-nowrap ml-auto sm:order-last`}>{chip.label}</span>
        <span className="basis-full sm:basis-auto min-w-0 sm:flex-1 sm:truncate pl-[2.375rem] sm:pl-0 text-xs text-pb-text2 dark:text-gray-400">{stepSummary(step)}</span>
      </button>
      {open && <div className="pl-6"><StepDetails step={step} selfGuest={selfGuest} /></div>}
    </li>
  );
}

/**
 * Rolling update plan — the order to update/reboot nodes one at a time, the
 * quorum math, and what each step moves or shuts down. Plan only: the link on
 * each step opens the node's existing maintenance flow.
 */
export default function RollingUpdate({ state }) {
  if (state.loading && !state.data) return <Loading />;
  if (state.error && !state.data) return <Failed error={state.error} />;
  const plan = state.data;
  if (!plan || !plan.steps) return <p className="text-sm text-pb-text2 dark:text-gray-400">—</p>;
  const q = plan.quorum;
  const selfLast = plan.self && plan.order[plan.order.length - 1] === plan.self.node;
  return (
    <div className="space-y-3">
      <div className="-mt-2 space-y-0.5">
        {q && <p className={`text-sm font-medium ${TONE_TEXT[quorumTone(q)]}`}>{q.verdict}</p>}
        {(q?.flags || []).map(f => <p key={f} className="text-xs text-amber-700 dark:text-amber-300">{f}</p>)}
        <p className="text-xs text-pb-text2 dark:text-gray-400">
          {plan.order.join(' → ')}{selfLast ? ` (${plan.self.node} runs ProxBalance, so it goes last)` : ''}.
          {' '}Updated nodes count as back, and empty, for later steps.
        </p>
      </div>
      <ol className="space-y-2 max-w-3xl">
        {plan.steps.map((s, i) => <Step key={s.node} index={i} step={s} selfGuest={plan.self} />)}
      </ol>
    </div>
  );
}
