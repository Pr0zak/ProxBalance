import { ChevronDown, ArrowRight } from '../Icons.jsx';
import { statusBadge, PROGRESS_BAR_BG, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE } from '../../utils/designTokens.js';
import { fetchNodeFailure } from '../../api/client.js';
import { useLoad, Loading, Failed } from './shared.jsx';
import MoreInfo from '../MoreInfo.jsx';
import { n1Chip, defaultNode, memBar, verdictTone, fmtGb, shortVerdict } from './failureModel.js';

const { useState, useEffect } = React;

const TONE_TEXT = {
  green: 'text-emerald-700 dark:text-emerald-300',
  yellow: 'text-amber-700 dark:text-amber-300',
  red: 'text-red-700 dark:text-red-300',
  gray: 'text-pb-text dark:text-gray-200',
};

/**
 * "Unplanned failure" toggle, shown when some guest keeps disks on node-local
 * storage. Off (default): pure capacity, as if those disks were restored.
 * On: guests on node-local disks can't restart elsewhere.
 */
export function StorageModePicker({ value, onChange }) {
  const on = value === 'strict';
  return (
    <button
      type="button"
      onClick={() => onChange(on ? 'capacity' : 'strict')}
      aria-pressed={on}
      title={on
        ? 'Showing an unplanned failure: guests on node-local disks die with the node. Click for the capacity view.'
        : 'Showing capacity: could the other nodes hold its guests if their disks were restored? Click for an unplanned failure.'}
      className={`${FILTER_CHIP} ${on ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
    >Unplanned failure</button>
  );
}

function NodePicker({ rows, selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2" role="group" aria-label="Node to fail">
      {rows.map(r => {
        const chip = n1Chip(r);
        const active = r.node === selected;
        return (
          <button
            key={r.node}
            type="button"
            onClick={() => onSelect(r.node)}
            aria-pressed={active}
            title={r.verdict}
            className={`min-w-0 flex flex-col items-start sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2 px-3 py-1.5 rounded-lg border text-sm transition-colors ${active
              ? 'border-pb-accent/50 bg-pb-accent/10 dark:border-pb-accent-dark/50 dark:bg-pb-accent-dark/15'
              : 'border-pb-border dark:border-slate-700 hover:bg-pb-surface2 dark:hover:bg-slate-800/60'}`}
          >
            <span className="max-w-full font-semibold text-pb-text dark:text-gray-100 truncate">{r.node}</span>
            <span className={`${statusBadge(chip.tone)} !px-2 !py-0 shrink-0 whitespace-nowrap`}>{chip.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function SurvivorRow({ n, ceiling }) {
  const bar = memBar(n, ceiling);
  const hot = bar.after > 85;
  return (
    <div className="grid grid-cols-[3.5rem_1fr_auto] sm:grid-cols-[4rem_1fr_7.5rem_6.5rem] items-center gap-x-3 gap-y-0.5 text-xs">
      <span className="font-semibold text-pb-text dark:text-gray-200 truncate">{n.node}</span>
      <div className={`${PROGRESS_BAR_BG} !h-2 relative flex`} role="img" aria-label={`${n.node} memory ${Math.round(bar.before)}% now, ${Math.round(bar.after)}% after`}>
        <div className="h-full bg-slate-400 dark:bg-slate-500" style={{ width: `${bar.before}%` }} />
        <div className={`h-full ${hot ? 'bg-amber-500 dark:bg-amber-400' : 'bg-pb-accent dark:bg-pb-accent-dark'}`} style={{ width: `${bar.added}%` }} />
        <div className="absolute top-0 bottom-0 w-px bg-red-500/70" style={{ left: `${bar.ceiling}%` }} title={`${bar.ceiling}% ceiling`} />
      </div>
      <span className="tabular-nums text-right whitespace-nowrap">
        <span className="text-pb-text2 dark:text-gray-400">{Math.round(bar.before)}%</span>
        <ArrowRight size={10} className="inline mx-0.5 text-pb-text3 dark:text-gray-500" />
        <span className={`font-semibold ${hot ? 'text-amber-700 dark:text-amber-300' : 'text-pb-text dark:text-gray-100'}`}>{Math.round(bar.after)}%</span>
      </span>
      <span className="col-start-2 col-span-2 sm:col-start-auto sm:col-span-1 tabular-nums text-pb-text2 dark:text-gray-400 sm:text-right whitespace-nowrap">
        {n.added ? `+${n.added} · ${fmtGb(n.added_gb)}` : 'nothing added'}
        <span className="sm:hidden"> · CPU {Math.round(n.cpu_before)}→{Math.round(n.cpu_after)}%</span>
        <span className="hidden sm:block">CPU {Math.round(n.cpu_before)}→{Math.round(n.cpu_after)}%</span>
      </span>
    </div>
  );
}

function GuestList({ title, items, render, tone = 'gray', defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  useEffect(() => { setOpen(defaultOpen); }, [defaultOpen, items]);
  if (!items.length) return null;
  return (
    <div className="border-t border-pb-border dark:border-slate-700/70 pt-2">
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} className="w-full flex items-center gap-2 text-left text-xs font-semibold text-pb-text dark:text-gray-200">
        <ChevronDown size={14} className={`shrink-0 text-pb-text3 dark:text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        <span className="flex-1">{title}</span>
        <span className={`${statusBadge(tone)} !px-2 !py-0`}>{items.length}</span>
      </button>
      {open && <ul className="mt-1.5 space-y-1">{items.map(render)}</ul>}
    </div>
  );
}

const GuestName = ({ g }) => (
  <span className="min-w-0 truncate text-pb-text dark:text-gray-200">
    {g.name} <span className="text-pb-text3 dark:text-gray-500">{g.type} {g.vmid}</span>
  </span>
);

function NodeResult({ res }) {
  const tone = verdictTone(res);
  const ceiling = res.mem_ceiling || 95;
  return (
    <div className="space-y-3">
      <div>
        {/* The short form: the names and the busiest survivor are in the lists and bars below. */}
        <p className={`text-sm font-medium ${TONE_TEXT[tone]}`}>
          {shortVerdict(res) ? `If ${res.node} fails: ${shortVerdict(res)}` : res.verdict}
        </p>
        {res.storage_mode !== 'strict' && res.local_disk_note && (
          <p className="text-xs text-pb-text2 dark:text-gray-400 mt-0.5">{res.local_disk_note}.</p>
        )}
      </div>
      {res.nodes.length > 0 && (
        <div className="space-y-2 max-w-3xl">
          <div className="flex items-center gap-3 text-[11px] text-pb-text2 dark:text-gray-400">
            <span>Survivor memory</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-slate-400 dark:bg-slate-500" />now</span>
            <span className="flex items-center gap-1"><span className="inline-block w-2 h-2 rounded-sm bg-pb-accent dark:bg-pb-accent-dark" />added</span>
            <span className="flex items-center gap-1"><span className="inline-block w-px h-2.5 bg-red-500/70" />{ceiling}% limit</span>
          </div>
          {res.nodes.map(n => <SurvivorRow key={n.node} n={n} ceiling={ceiling} />)}
        </div>
      )}
      <div className="space-y-2 max-w-3xl">
        <GuestList
          title="Restart elsewhere"
          items={res.placements}
          tone="green"
          render={p => (
            <li key={p.vmid} className="flex items-center gap-2 text-xs">
              <GuestName g={p} />
              {p.ha_managed && <span className={`${statusBadge('blue')} !px-1.5 !py-0 shrink-0`} title="Proxmox HA restarts it on its own">HA</span>}
              {p.ignored && <span className={`${statusBadge('gray')} !px-1.5 !py-0 shrink-0 !hidden sm:!inline-flex`} title="Tagged ignore: ProxBalance never moves it, but it can start elsewhere">ignored</span>}
              {p.local_storage && <span className={`${statusBadge('yellow')} !px-1.5 !py-0 shrink-0`} title={`Disks on ${p.local_storage.join(', ')}: needs a restore or replica first`}>restore</span>}
              <span className="ml-auto shrink-0 tabular-nums text-pb-text2 dark:text-gray-400 whitespace-nowrap">→ {p.to} · {fmtGb(p.mem_gb)}</span>
            </li>
          )}
        />
        <GuestList
          title="Can't restart elsewhere"
          items={res.cant_restart}
          tone="yellow"
          defaultOpen={res.cant_restart.length > 0 && res.cant_restart.length <= 5}
          render={g => (
            <li key={g.vmid} className="text-xs">
              <div className="flex items-center gap-2"><GuestName g={g} /><span className="ml-auto shrink-0 tabular-nums text-pb-text2 dark:text-gray-400">{fmtGb(g.mem_gb)}</span></div>
              <div className="text-pb-text2 dark:text-gray-400 break-words">{g.reason}</div>
            </li>
          )}
        />
        <GuestList
          title="Doesn't fit"
          items={res.doesnt_fit}
          tone="red"
          defaultOpen
          render={g => (
            <li key={g.vmid} className="text-xs">
              <div className="flex items-center gap-2"><GuestName g={g} /><span className="ml-auto shrink-0 tabular-nums text-red-700 dark:text-red-300">{fmtGb(g.mem_gb)}</span></div>
              <div className="text-pb-text2 dark:text-gray-400 break-words">{g.reason}</div>
            </li>
          )}
        />
      </div>
    </div>
  );
}

/**
 * "What if a node fails?" — pick a node and see where its running guests
 * would restart, from the latest collected data. Nothing calls Proxmox.
 */
export default function FailureSim({ storage, routedNode, summaryState }) {
  const rows = summaryState.data?.nodes || [];
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!rows.length) return;
    if (routedNode && rows.some(r => r.node === routedNode)) setSelected(routedNode);
    else if (!selected || !rows.some(r => r.node === selected)) setSelected(defaultNode(rows, null));
  }, [rows.map(r => r.node).join(','), routedNode]);
  const [nodeState] = useLoad(
    () => (selected ? fetchNodeFailure(selected, storage) : Promise.resolve({ pending: true })),
    [selected, storage],
  );

  if (summaryState.loading && !summaryState.data) return <Loading />;
  if (summaryState.error && !summaryState.data) return <Failed error={summaryState.error} />;
  if (!rows.length) return <p className="text-sm text-pb-text2 dark:text-gray-400">—</p>;
  const summary = summaryState.data;
  const res = nodeState.data && nodeState.data.node === selected ? nodeState.data : null;

  return (
    <div className="space-y-3">
      <MoreInfo
        className="text-sm text-pb-text2 dark:text-gray-400 -mt-2"
        label="How the failure is simulated"
        detail={`${summary.verdict}.\nGuests restart largest first on the survivor with the most free memory, up to ${summary.mem_ceiling}% memory, respecting anti-affinity tags and Proxmox HA rules.`}
      >
        {summary.n1_ok || !(summary.can_lose || []).length
          ? (summary.n1_ok ? summary.verdict : 'No node can fail without leaving guests behind')
          : `Can lose ${summary.can_lose.join(' or ')}; the others leave guests behind`}
      </MoreInfo>
      <NodePicker rows={rows} selected={selected} onSelect={setSelected} />
      {nodeState.error && !res ? <Failed error={nodeState.error} />
        : res ? <NodeResult res={res} />
        : <Loading />}
    </div>
  );
}
