import {
  TABLE_HEADER, TABLE_ROW, INPUT_FIELD,
  FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE,
  metricTextColor, metricColor, PROGRESS_BAR_BG, statusBadge,
} from '../../utils/designTokens.js';
import { ChevronDown, Tag, X } from '../Icons.jsx';
import { recBadgeTooltip } from './recsHelpers.js';
import { guestMobility, MOBILITY, MOBILITY_ORDER } from './guestMobility.js';

const { useState, useMemo } = React;

// The collector reports containers as 'CT'; older caches used 'LXC'.
const isCT = (t) => t === 'CT' || t === 'LXC';

const IPV4 = /^\d{1,3}(\.\d{1,3}){3}$/;

// How many chips (rule + plain tags) a row aims to show before collapsing the
// plain Proxmox tags into "+N"; at most PLAIN_TAG_LIMIT of them are plain.
const TAG_LIMIT = 3;
const PLAIN_TAG_LIMIT = 2;

// Facet groups: options inside a group are OR'd, groups are AND'd together.
// Node options are built from the live data and the Balancer group comes from
// the per-guest verdicts; the rest are fixed.
const STATIC_FACETS = [
  {
    id: 'type', label: 'Type', options: [
      { value: 'vm', label: 'VMs', test: g => g.type === 'VM' },
      { value: 'ct', label: 'CTs', test: g => isCT(g.type) },
    ],
  },
  {
    id: 'state', label: 'State', options: [
      { value: 'running', label: 'Running', test: g => g.status === 'running' },
      { value: 'stopped', label: 'Stopped', test: g => g.status === 'stopped' },
    ],
  },
  {
    id: 'rules', label: 'Rules', options: [
      { value: 'ignored', label: 'Ignored', test: g => !!g.tags?.has_ignore },
      { value: 'auto', label: 'Auto-Migrate', test: g => !!g.tags?.all_tags?.some(t => t === 'auto_migrate_ok' || t === 'auto-migrate-ok') },
      { value: 'affinity', label: 'Affinity', test: g => g.tags?.affinity_groups?.length > 0 },
      { value: 'anti', label: 'Anti-Affinity', test: g => g.tags?.exclude_groups?.length > 0 },
    ],
  },
];

const EMPTY_SELECTION = { node: [], type: [], state: [], rules: [], balancer: [] };

/** Proxmox tags on this guest that contain the query (IPs are tags too). */
function tagHits(g, q) {
  if (!q) return [];
  return (g.tags?.all_tags || []).filter(t => String(t).toLowerCase().includes(q));
}

function matchesSearch(g, q) {
  if (!q) return true;
  if ((g.name || '').toLowerCase().includes(q)) return true;
  if (String(g.vmid || '').includes(q)) return true;
  return tagHits(g, q).length > 0;
}

const WORKLOAD_BADGE_COLORS = {
  steady: 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
  bursty: 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
  growing: 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
  cyclical: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
};

function formatMem(gb) {
  if (gb == null) return '—';
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

function memPercent(g) {
  if (!g.mem_max_gb || g.mem_max_gb <= 0) return null;
  return ((g.mem_used_gb || 0) / g.mem_max_gb) * 100;
}

/** Compact usage cell: thin bar (hidden on phones) + % + muted allocation. */
function UsageCell({ pct, sub, title }) {
  const subEl = sub && (
    <span className="text-pb-text2 dark:text-gray-500 hidden xl:inline whitespace-nowrap" title={title}>{sub}</span>
  );
  if (pct == null) {
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:block w-12 shrink-0" />
        <span className="w-9 text-right text-pb-text2 dark:text-gray-600">—</span>
        {subEl}
      </div>
    );
  }
  const clamped = Math.max(0, Math.min(100, pct));
  return (
    <div className="flex items-center gap-2">
      <div className={`${PROGRESS_BAR_BG} w-12 shrink-0 hidden sm:block`}>
        <div className={`h-full rounded-full ${metricColor(pct)}`} style={{ width: `${clamped > 0 ? Math.max(clamped, 3) : 0}%` }} />
      </div>
      <span className={`w-9 text-right ${metricTextColor(pct)}`}>{pct.toFixed(0)}%</span>
      {subEl}
    </div>
  );
}

function TypeBadge({ type }) {
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
      type === 'VM'
        ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/30'
        : 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-800/30'
    }`}>{type}</span>
  );
}

function StatusDot({ status }) {
  const dot = status === 'running'
    ? 'bg-emerald-500 dark:bg-emerald-400'
    : status === 'migrating'
      ? 'bg-blue-500 dark:bg-blue-400 animate-pulse'
      : 'bg-slate-400 dark:bg-slate-500';
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-pb-text2 dark:text-gray-400">
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {status}
    </span>
  );
}

function WorkloadBadge({ profile, running }) {
  if (!running || !profile || profile.confidence === 'low') return null;
  const cls = WORKLOAD_BADGE_COLORS[profile.behavior];
  if (!cls) return null;
  return (
    <span
      className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${cls}`}
      title={`${profile.behavior} workload (${profile.confidence} confidence, ${profile.data_points} samples)`}
    >
      {profile.behavior.charAt(0).toUpperCase() + profile.behavior.slice(1)}
    </span>
  );
}

/** Proxmox tags that ProxBalance doesn't act on (IPs, roles, ...). */
function plainTags(guest) {
  const t = guest.tags || {};
  const pb = new Set(['ignore', 'auto_migrate_ok', 'auto-migrate-ok', ...(t.affinity_groups || []), ...(t.exclude_groups || [])]);
  return (t.all_tags || []).filter(tag => !pb.has(tag));
}

const MATCH_RING = 'ring-1 ring-pb-accent dark:ring-pb-accent-dark';

/** Muted chip for a plain Proxmox tag; ringed when it is what the search hit. */
function PlainTag({ tag, matched }) {
  return (
    <span
      className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap truncate max-w-[7rem] bg-slate-100 dark:bg-slate-700/40 text-slate-600 dark:text-slate-400 ${IPV4.test(tag) ? 'font-mono' : ''} ${matched ? MATCH_RING : ''}`}
      title={matched ? `${tag} — matches your search` : tag}
    >
      {tag}
    </span>
  );
}

function TagChips({ guest, canMigrate, handleRemoveTag, hits }) {
  const t = guest.tags || {};
  const hasIgnore = !!t.has_ignore;
  const hasAuto = t.all_tags?.some(t => t === 'auto_migrate_ok' || t === 'auto-migrate-ok');
  const exclude = t.exclude_groups || [];
  const affinity = t.affinity_groups || [];
  const plain = plainTags(guest);
  if (!hasIgnore && !hasAuto && exclude.length === 0 && affinity.length === 0 && plain.length === 0) return null;

  // Tags the search matched always make the cut, so the reason a row is
  // listed is visible without opening the "+N" overflow.
  const hitSet = new Set(hits);
  const matchedPlain = plain.filter(tag => hitSet.has(tag));
  const rest = plain.filter(tag => !hitSet.has(tag));
  const ruleCount = (hasIgnore ? 1 : 0) + (hasAuto ? 1 : 0) + affinity.length + exclude.length;
  const slots = Math.min(PLAIN_TAG_LIMIT, Math.max(1, TAG_LIMIT - ruleCount));
  const shown = [...matchedPlain, ...rest.slice(0, Math.max(0, slots - matchedPlain.length))];
  const hidden = plain.filter(tag => !shown.includes(tag));

  // ProxBalance rule tags: coloured, removable. `tag` is the real Proxmox tag.
  const Chip = ({ tag, label, color }) => (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${color} ${hitSet.has(tag) ? MATCH_RING : ''}`}>
      {label || tag}
      {canMigrate && handleRemoveTag && (
        <button
          onClick={(e) => { e.stopPropagation(); handleRemoveTag(guest, tag); }}
          className="hover:bg-black/20 rounded-full p-0.5 -mr-0.5"
          title={`Remove "${tag}"`}
          aria-label={`Remove tag ${tag}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
  return (
    <div className="flex items-center gap-1">
      {hasIgnore && <Chip tag="ignore" color="bg-yellow-50 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" />}
      {hasAuto && <Chip tag="auto_migrate_ok" label="auto" color="bg-green-50 dark:bg-green-900/40 text-green-700 dark:text-green-300" />}
      {affinity.map(tag => <Chip key={`a-${tag}`} tag={tag} color="bg-purple-50 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" />)}
      {exclude.map(tag => <Chip key={`e-${tag}`} tag={tag} color="bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" />)}
      {shown.map(tag => <PlainTag key={`p-${tag}`} tag={tag} matched={hitSet.has(tag)} />)}
      {hidden.length > 0 && (
        <span className="text-[10px] px-1 py-0.5 whitespace-nowrap text-pb-text2 dark:text-gray-500" title={hidden.join(', ')}>
          +{hidden.length}
        </span>
      )}
    </div>
  );
}

function MoveButton({ rec, canMigrate, setConfirmMigration }) {
  const clickable = canMigrate && setConfirmMigration;
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); if (clickable) setConfirmMigration(rec); }}
      disabled={!clickable}
      title={recBadgeTooltip(rec)}
      className={`${statusBadge('orange')} whitespace-nowrap ${clickable ? 'hover:brightness-110 cursor-pointer' : 'cursor-default'}`}
    >
      Move → {rec.target_node}
    </button>
  );
}

function MobilityCell({ verdict, canMigrate, setConfirmMigration }) {
  if (!verdict) return null;
  if (verdict.key === 'suggested') {
    return <MoveButton rec={verdict.rec} canMigrate={canMigrate} setConfirmMigration={setConfirmMigration} />;
  }
  const hint = verdict.hint && (
    <span className="text-[11px] text-pb-text2 dark:text-gray-500 hidden xl:inline">{verdict.hint}</span>
  );
  // The normal states stay quiet (dot + text) so the blocked ones stand out.
  if (verdict.key === 'movable' || verdict.key === 'stopped') {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-pb-text2 dark:text-gray-400" title={verdict.detail}>
        <span className={`w-1.5 h-1.5 rounded-full ${verdict.key === 'movable' ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-400 dark:bg-slate-500'}`} />
        {verdict.label}
        {hint && <span className="hidden xl:inline text-pb-text2 dark:text-gray-600">·</span>}
        {hint}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap" title={verdict.detail}>
      <span className={statusBadge(verdict.color)}>{verdict.label}</span>
      {hint}
    </span>
  );
}

export default function GuestsTable({
  // Data
  data, guestProfiles, guestRecMap, skippedGuests,
  // Actions
  onGuestClick, canMigrate, handleRemoveTag, setTagModalGuest, setShowTagModal, setConfirmMigration,
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(EMPTY_SELECTION);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const openTagModal = setTagModalGuest && setShowTagModal
    ? (guest) => { setTagModalGuest(guest); setShowTagModal(true); }
    : null;

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const allGuests = useMemo(() => Object.values(data?.guests || {}), [data]);

  // vmid → { key, label, color, detail, hint, rec } — why each guest will / won't move
  const verdicts = useMemo(() => {
    const skipped = {};
    for (const sg of skippedGuests || []) skipped[String(sg.vmid)] = sg;
    const out = {};
    for (const g of allGuests) {
      const id = String(g.vmid);
      out[id] = guestMobility(g, guestRecMap?.[id], skipped[id]);
    }
    return out;
  }, [allGuests, guestRecMap, skippedGuests]);

  const facets = useMemo(() => {
    const nodes = [...new Set(allGuests.map(g => g.node).filter(Boolean))].sort();
    return [
      { id: 'node', label: 'Node', options: nodes.map(n => ({ value: n, label: n, test: g => g.node === n })) },
      ...STATIC_FACETS,
      {
        id: 'balancer', label: 'Balancer', options: MOBILITY_ORDER.map(k => ({
          value: k, label: MOBILITY[k].label, test: g => verdicts[String(g.vmid)]?.key === k,
        })),
      },
    ];
  }, [allGuests, verdicts]);
  const chipFacets = facets.filter(f => f.id !== 'balancer');
  const balancerFacet = facets.find(f => f.id === 'balancer');

  const toggleOption = (facetId, value) => {
    setSelected(prev => {
      const cur = prev[facetId] || [];
      return { ...prev, [facetId]: cur.includes(value) ? cur.filter(v => v !== value) : [...cur, value] };
    });
  };
  const activeCount = Object.values(selected).reduce((n, arr) => n + arr.length, 0);
  const clearFilters = () => { setSelected(EMPTY_SELECTION); setSearch(''); };

  const q = search.trim().toLowerCase();

  // Does guest g pass every facet group except `skipId`?
  const passesFacets = (g, skipId) => facets.every(f => {
    if (f.id === skipId) return true;
    const sel = selected[f.id] || [];
    if (sel.length === 0) return true;
    return f.options.some(o => sel.includes(o.value) && o.test(g));
  });

  const filtered = useMemo(
    () => allGuests.filter(g => matchesSearch(g, q) && passesFacets(g)),
    [allGuests, q, selected, facets],
  );

  // Facet counts: how many guests each option would show given the search
  // and the OTHER groups' selections (so counts stay meaningful as you narrow).
  const counts = useMemo(() => {
    const out = {};
    for (const f of facets) {
      const base = allGuests.filter(g => matchesSearch(g, q) && passesFacets(g, f.id));
      out[f.id] = {};
      for (const o of f.options) out[f.id][o.value] = base.filter(o.test).length;
    }
    return out;
  }, [allGuests, q, selected, facets]);

  const sorted = useMemo(() => {
    const v = sortDir === 'asc' ? 1 : -1;
    const key = (g) => {
      switch (sortField) {
        case 'vmid': return g.vmid || 0;
        case 'name': return (g.name || '').toLowerCase();
        case 'node': return (g.node || '').toLowerCase();
        case 'status': return g.status || '';
        case 'cpu': return g.status === 'running' ? (g.cpu_current ?? -1) : -1;
        case 'mem': return g.status === 'running' ? (memPercent(g) ?? -1) : -1;
        case 'mobility': return verdicts[String(g.vmid)]?.rank ?? 99;
        default: return 0;
      }
    };
    const cmp = (a, b) => {
      const av = key(a);
      const bv = key(b);
      if (av < bv) return -1 * v;
      if (av > bv) return 1 * v;
      // Stable, readable tie-break: name ascending
      return (a.name || '').localeCompare(b.name || '');
    };
    return [...filtered].sort(cmp);
  }, [filtered, sortField, sortDir, verdicts]);

  const SortHeader = ({ field, children, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      aria-sort={sortField === field ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined}
      className={`${TABLE_HEADER} px-2 py-2 cursor-pointer hover:text-pb-text dark:hover:text-gray-200 ${className}`}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ChevronDown size={12} className={`transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
        )}
      </span>
    </th>
  );

  const FacetChip = ({ facetId, option }) => {
    const isOn = (selected[facetId] || []).includes(option.value);
    const n = counts[facetId]?.[option.value] ?? 0;
    return (
      <button
        type="button"
        onClick={() => toggleOption(facetId, option.value)}
        aria-pressed={isOn}
        className={`${FILTER_CHIP} ${isOn ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE} inline-flex items-center gap-1.5 ${!isOn && n === 0 ? 'opacity-40' : ''}`}
      >
        {option.label}
        <span className={`tabular-nums text-[10px] ${isOn ? '' : 'text-pb-text2 dark:text-gray-500'}`}>{n}</span>
      </button>
    );
  };

  return (
    <div>
      {/* Search + count */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-2">
        <input
          type="text"
          placeholder="Search name, VMID, tag or IP..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${INPUT_FIELD} sm:max-w-xs`}
          aria-label="Search guests"
        />
        <div className="flex items-center gap-3 flex-1">
          {(activeCount > 0 || q) && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-pb-text2 dark:text-gray-400 hover:text-pb-text dark:hover:text-gray-200"
            >
              <X size={12} /> Clear filters
            </button>
          )}
          <span className="text-xs text-pb-text2 dark:text-gray-500 ml-auto tabular-nums">
            {sorted.length === allGuests.length
              ? `${allGuests.length} guest${allGuests.length !== 1 ? 's' : ''}`
              : `${sorted.length} of ${allGuests.length} guests`}
          </span>
        </div>
      </div>

      {/* Facet groups — pick several: OR inside a group, AND across groups.
          Chips wrap rather than scroll so nothing is cut off on a phone. */}
      <div className="flex flex-wrap items-start gap-x-5 gap-y-2 mb-2">
        {chipFacets.map(f => (
          <div key={f.id} className="flex flex-wrap items-center gap-1.5 max-w-full">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-500 mr-0.5">{f.label}</span>
            {f.options.map(o => <FacetChip key={o.value} facetId={f.id} option={o} />)}
          </div>
        ))}
      </div>

      {/* Balancer verdict strip — counts per verdict; click to filter */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 mb-3 text-xs">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-pb-text2 dark:text-gray-500 mr-0.5">Can ProxBalance move it?</span>
        {balancerFacet.options.map(o => {
          const k = o.value;
          const isOn = selected.balancer.includes(k);
          const n = counts.balancer?.[k] ?? 0;
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggleOption('balancer', k)}
              aria-pressed={isOn}
              className={`${statusBadge(MOBILITY[k].color)} ${isOn ? 'ring-2 ring-pb-accent dark:ring-pb-accent-dark' : n === 0 ? 'opacity-40' : 'opacity-80 hover:opacity-100'}`}
              title={isOn ? `Stop filtering by "${o.label}"` : `Show only "${o.label}" guests`}
            >
              {o.label}
              <span className="tabular-nums">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="overflow-x-auto -mx-4 sm:-mx-5">
        <table className="w-full md:min-w-[860px]">
          <thead>
            <tr className="border-b border-pb-border dark:border-slate-700/50">
              <SortHeader field="vmid" className="hidden sm:table-cell">ID</SortHeader>
              <SortHeader field="name">Name</SortHeader>
              <SortHeader field="node">Node</SortHeader>
              <SortHeader field="status" className="hidden md:table-cell">State</SortHeader>
              <SortHeader field="cpu">CPU</SortHeader>
              <SortHeader field="mem">Memory</SortHeader>
              <SortHeader field="mobility" className="hidden md:table-cell">Balancer</SortHeader>
              <th className={`${TABLE_HEADER} px-2 py-2 hidden md:table-cell`}>Tags</th>
              {canMigrate && <th className={TABLE_HEADER + ' px-2 py-2 w-8 hidden md:table-cell'}></th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, idx) => {
              const id = String(g.vmid);
              const memPct = memPercent(g);
              const verdict = verdicts[id];
              const rec = verdict?.rec;
              const running = g.status === 'running';
              const hits = tagHits(g, q);
              const rowBg = rec ? 'bg-orange-50 dark:bg-orange-900/15' : (idx % 2 === 1 ? 'bg-pb-surface2/60 dark:bg-slate-700/30' : '');
              // Stopped guests recede so the running workload is what you scan
              const dim = running || g.status === 'migrating' ? '' : 'opacity-60';
              const cell = `px-2 py-1.5 ${dim}`;
              return (
                <tr
                  key={g.vmid}
                  onClick={() => onGuestClick?.(g)}
                  className={`${TABLE_ROW} ${rowBg} cursor-pointer`}
                >
                  <td className={`${cell} whitespace-nowrap hidden sm:table-cell`}>
                    <TypeBadge type={g.type} />
                    <span className="ml-2 hidden md:inline text-xs text-pb-text2 dark:text-gray-400 font-mono tabular-nums">{g.vmid}</span>
                  </td>
                  <td className={cell}>
                    <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap">
                      {/* Phones drop the ID column; the type rides with the name */}
                      <span className="sm:hidden"><TypeBadge type={g.type} /></span>
                      <span className="text-sm text-pb-text dark:text-gray-200 whitespace-nowrap md:truncate md:max-w-[11rem]" title={g.name}>{g.name || `guest-${g.vmid}`}</span>
                      <span className="hidden md:inline-flex">
                        <WorkloadBadge profile={guestProfiles?.[id]} running={running} />
                      </span>
                      {/* Phones hide the Balancer and Tags columns: keep the
                          Move button and the tag the search matched in view. */}
                      {rec && (
                        <span className="md:hidden">
                          <MoveButton rec={rec} canMigrate={canMigrate} setConfirmMigration={setConfirmMigration} />
                        </span>
                      )}
                      {hits.map(tag => (
                        <span key={`m-${tag}`} className="md:hidden">
                          <PlainTag tag={tag} matched />
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className={`${cell} text-xs text-pb-text2 dark:text-gray-400`}>{g.node}</td>
                  <td className={`${cell} hidden md:table-cell`}><StatusDot status={g.status} /></td>
                  <td className={`${cell} text-xs font-mono tabular-nums`}>
                    <UsageCell
                      pct={running && g.cpu_current != null ? g.cpu_current : null}
                      sub={g.cpu_cores ? `${g.cpu_cores} vCPU` : null}
                    />
                  </td>
                  <td className={`${cell} text-xs font-mono tabular-nums`}>
                    <UsageCell
                      pct={running ? memPct : null}
                      sub={g.mem_max_gb ? formatMem(g.mem_max_gb) : null}
                      title={g.mem_max_gb ? `${formatMem(g.mem_used_gb)} used of ${formatMem(g.mem_max_gb)} allocated` : undefined}
                    />
                  </td>
                  <td className={`${cell} hidden md:table-cell`}>
                    <MobilityCell verdict={verdict} canMigrate={canMigrate} setConfirmMigration={setConfirmMigration} />
                  </td>
                  <td className={`${cell} hidden md:table-cell`}>
                    <TagChips guest={g} canMigrate={canMigrate} handleRemoveTag={handleRemoveTag} hits={hits} />
                  </td>
                  {canMigrate && (
                    <td className="px-2 py-1.5 hidden md:table-cell">
                      {openTagModal && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openTagModal(g); }}
                          className="p-1 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded transition-colors"
                          title="Manage tags"
                          aria-label="Manage tags"
                        >
                          <Tag size={14} />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {sorted.length === 0 && (
        <div className="text-center py-6 text-pb-text2 dark:text-gray-500 text-sm">
          No guests match your filters.{' '}
          {(activeCount > 0 || q) && (
            <button type="button" onClick={clearFilters} className="underline hover:text-pb-text dark:hover:text-gray-200">
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
