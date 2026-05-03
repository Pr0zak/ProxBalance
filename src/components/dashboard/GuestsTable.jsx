import {
  TABLE_HEADER, TABLE_ROW, INPUT_FIELD,
  FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE,
  metricTextColor,
} from '../../utils/designTokens.js';
import { ChevronDown, Tag, X, Play, Power, Loader } from '../Icons.jsx';
import { recBadgeTooltip } from './recsHelpers.js';

const { useState, useMemo } = React;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'vm', label: 'VMs' },
  { id: 'lxc', label: 'LXCs' },
  { id: 'running', label: 'Running' },
  { id: 'stopped', label: 'Stopped' },
  { id: 'ignored', label: 'Ignored' },
  { id: 'auto_migrate', label: 'Auto-Migrate' },
  { id: 'affinity', label: 'Affinity' },
  { id: 'anti_affinity', label: 'Anti-Affinity' },
];

const WORKLOAD_BADGE_COLORS = {
  steady: 'bg-green-900/30 text-green-300',
  bursty: 'bg-orange-900/30 text-orange-300',
  growing: 'bg-blue-900/30 text-blue-300',
  cyclical: 'bg-purple-900/30 text-purple-300',
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

function StatusBadge({ status }) {
  const Icon = status === 'migrating' ? Loader : status === 'running' ? Play : Power;
  const cls = status === 'migrating'
    ? 'bg-blue-900/30 text-blue-300'
    : status === 'running'
      ? 'bg-green-900/30 text-green-300'
      : 'bg-claude-surface2 dark:bg-slate-700 text-claude-muted dark:text-gray-400';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded font-medium ${cls}`}>
      <Icon size={11} className={status === 'migrating' ? 'animate-spin' : ''} />
      <span>{status}</span>
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

function TagChips({ guest, canMigrate, handleRemoveTag }) {
  const t = guest.tags || {};
  const hasIgnore = !!t.has_ignore;
  const hasAuto = t.all_tags?.includes('auto_migrate_ok');
  const exclude = t.exclude_groups || [];
  const affinity = t.affinity_groups || [];
  if (!hasIgnore && !hasAuto && exclude.length === 0 && affinity.length === 0) return null;
  const Chip = ({ label, color, onRemove }) => (
    <span className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${color}`}>
      {label}
      {canMigrate && onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:bg-black/20 rounded-full p-0.5 -mr-0.5"
          title={`Remove "${label}"`}
          aria-label={`Remove tag ${label}`}
        >
          <X size={10} />
        </button>
      )}
    </span>
  );
  return (
    <div className="flex flex-wrap gap-1">
      {hasIgnore && <Chip label="ignore" color="bg-yellow-900/40 text-yellow-300" onRemove={() => handleRemoveTag?.(guest, 'ignore')} />}
      {hasAuto && <Chip label="auto" color="bg-green-900/40 text-green-300" onRemove={() => handleRemoveTag?.(guest, 'auto_migrate_ok')} />}
      {affinity.map(tag => <Chip key={`a-${tag}`} label={tag} color="bg-purple-900/40 text-purple-300" onRemove={() => handleRemoveTag?.(guest, tag)} />)}
      {exclude.map(tag => <Chip key={`e-${tag}`} label={tag} color="bg-blue-900/40 text-blue-300" onRemove={() => handleRemoveTag?.(guest, tag)} />)}
    </div>
  );
}

export default function GuestsTable({
  data, onGuestClick,
  canMigrate, guestProfiles, handleRemoveTag, setTagModalGuest, setShowTagModal,
  guestRecMap, setConfirmMigration,
}) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const openTagModal = setTagModalGuest && setShowTagModal
    ? (guest) => { setTagModalGuest(guest); setShowTagModal(true); }
    : null;

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    if (!data?.guests) return [];
    return Object.values(data.guests).filter(g => {
      if (search) {
        const q = search.toLowerCase();
        if (!(g.name || '').toLowerCase().includes(q) && !String(g.vmid || '').includes(q)) return false;
      }
      if (filter === 'vm' && g.type !== 'VM') return false;
      if (filter === 'lxc' && g.type !== 'LXC') return false;
      if (filter === 'running' && g.status !== 'running') return false;
      if (filter === 'stopped' && g.status !== 'stopped') return false;
      if (filter === 'ignored' && !g.tags?.has_ignore) return false;
      if (filter === 'auto_migrate' && !g.tags?.all_tags?.includes('auto_migrate_ok')) return false;
      if (filter === 'affinity' && !(g.tags?.affinity_groups?.length > 0)) return false;
      if (filter === 'anti_affinity' && !(g.tags?.exclude_groups?.length > 0)) return false;
      return true;
    });
  }, [data, search, filter]);

  const sorted = useMemo(() => {
    const v = sortDir === 'asc' ? 1 : -1;
    const cmp = (a, b) => {
      let av, bv;
      switch (sortField) {
        case 'vmid': av = a.vmid || 0; bv = b.vmid || 0; break;
        case 'type': av = (a.type || '').toLowerCase(); bv = (b.type || '').toLowerCase(); break;
        case 'name': av = (a.name || '').toLowerCase(); bv = (b.name || '').toLowerCase(); break;
        case 'node': av = (a.node || '').toLowerCase(); bv = (b.node || '').toLowerCase(); break;
        case 'status': av = a.status || ''; bv = b.status || ''; break;
        case 'cpu': av = a.cpu_current || 0; bv = b.cpu_current || 0; break;
        case 'mem': av = memPercent(a) ?? -1; bv = memPercent(b) ?? -1; break;
        default: av = 0; bv = 0;
      }
      if (av < bv) return -1 * v;
      if (av > bv) return 1 * v;
      return 0;
    };
    return [...filtered].sort(cmp);
  }, [filtered, sortField, sortDir]);

  const SortHeader = ({ field, children, className = '' }) => (
    <th
      onClick={() => handleSort(field)}
      className={`${TABLE_HEADER} cursor-pointer hover:text-claude-text dark:hover:text-gray-200 ${className}`}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ChevronDown size={12} className={`transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
        )}
      </span>
    </th>
  );

  return (
    <div>
      {/* Search + filter chips + count */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3">
        <input
          type="text"
          placeholder="Search by name or VMID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={`${INPUT_FIELD} sm:max-w-xs`}
        />
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`${FILTER_CHIP} ${filter === f.id ? FILTER_CHIP_ACTIVE : FILTER_CHIP_INACTIVE}`}
            >
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-claude-muted dark:text-gray-500 sm:ml-auto tabular-nums">
          {sorted.length} guest{sorted.length !== 1 ? 's' : ''}
        </span>
      </div>

      <div className="overflow-x-auto -mx-4 sm:-mx-5">
        <table className="w-full min-w-[800px]">
          <thead>
            <tr className="border-b border-claude-border dark:border-slate-700/50">
              <SortHeader field="type">Type</SortHeader>
              <SortHeader field="vmid">VMID</SortHeader>
              <SortHeader field="name">Name</SortHeader>
              <SortHeader field="node">Node</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <SortHeader field="cpu">CPU</SortHeader>
              <SortHeader field="mem">Memory</SortHeader>
              <th className={TABLE_HEADER}>Tags</th>
              {canMigrate && <th className={TABLE_HEADER + ' w-8'}></th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map((g, idx) => {
              const memPct = memPercent(g);
              const hasRec = !!guestRecMap?.[String(g.vmid)];
              const rowBg = hasRec ? 'bg-orange-900/15' : (idx % 2 === 1 ? 'bg-claude-surface2/60 dark:bg-slate-700/30' : '');
              return (
                <tr
                  key={g.vmid}
                  onClick={() => onGuestClick?.(g)}
                  className={`${TABLE_ROW} ${rowBg} cursor-pointer`}
                >
                  <td className="p-3">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                      g.type === 'VM'
                        ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                        : 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                    }`}>{g.type}</span>
                  </td>
                  <td className="p-3 text-xs text-claude-muted dark:text-gray-400 font-mono tabular-nums">{g.vmid}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm text-claude-text dark:text-gray-200">{g.name || `guest-${g.vmid}`}</span>
                      <WorkloadBadge profile={guestProfiles?.[String(g.vmid)]} running={g.status === 'running'} />
                      {(() => {
                        const rec = guestRecMap?.[String(g.vmid)];
                        if (!rec) return null;
                        const clickable = canMigrate && setConfirmMigration;
                        return (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); if (clickable) setConfirmMigration(rec); }}
                            disabled={!clickable}
                            title={recBadgeTooltip(rec)}
                            className={`text-[10px] px-1.5 py-0.5 rounded bg-orange-900/40 text-orange-300 border border-orange-800/40 ${clickable ? 'hover:bg-orange-800/60 cursor-pointer' : 'cursor-default'}`}
                          >
                            ↗ {rec.target_node}
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                  <td className="p-3 text-xs text-claude-muted dark:text-gray-400">{g.node}</td>
                  <td className="p-3"><StatusBadge status={g.status} /></td>
                  <td className="p-3 text-xs font-mono tabular-nums">
                    {g.status === 'running' && g.cpu_current != null
                      ? <span className={metricTextColor(g.cpu_current)}>{g.cpu_current.toFixed(0)}%</span>
                      : <span className="text-claude-muted dark:text-gray-600">—</span>}
                  </td>
                  <td className="p-3 text-xs font-mono tabular-nums">
                    {g.status === 'running' && memPct != null ? (
                      <span className={metricTextColor(memPct)}>
                        {memPct.toFixed(0)}%
                        <span className="text-claude-muted dark:text-gray-600 ml-1 hidden xl:inline">{formatMem(g.mem_used_gb)}</span>
                      </span>
                    ) : <span className="text-claude-muted dark:text-gray-600">—</span>}
                  </td>
                  <td className="p-3">
                    <TagChips guest={g} canMigrate={canMigrate} handleRemoveTag={handleRemoveTag} />
                  </td>
                  {canMigrate && (
                    <td className="p-3">
                      {openTagModal && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openTagModal(g); }}
                          className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded transition-colors"
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
        <div className="text-center py-6 text-claude-muted dark:text-gray-500 text-sm">
          No guests match your filters
        </div>
      )}
    </div>
  );
}
