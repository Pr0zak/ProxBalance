import {
  GLASS_CARD, TABLE_HEADER, TABLE_ROW, PROGRESS_BAR_BG,
  metricColor, metricTextColor, scoreColor, TEXT_HEADING, ICON,
  INPUT_FIELD, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE
} from '../../utils/designTokens.js';
import { ChevronDown, Tag, X } from '../Icons.jsx';

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

function guestHasAnyTag(guest) {
  return !!(guest.tags?.has_ignore
    || guest.tags?.all_tags?.includes('auto_migrate_ok')
    || guest.tags?.exclude_groups?.length > 0
    || guest.tags?.affinity_groups?.length > 0);
}

const TOTAL_COLS = 10;

/** Inline progress bar with label */
function MetricBar({ pct, detail }) {
  const clampedPct = Math.min(100, Math.max(0, pct || 0));
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between mb-0.5">
        <span className={`text-xs font-mono tabular-nums ${metricTextColor(clampedPct)}`}>
          {Math.round(clampedPct)}%
        </span>
        {detail && <span className="text-[10px] text-gray-500 ml-1 hidden xl:inline">{detail}</span>}
      </div>
      <div className={PROGRESS_BAR_BG}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${metricColor(clampedPct)}`}
          style={{ width: `${clampedPct}%` }}
        />
      </div>
    </div>
  );
}

function StatusDot({ online }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${online ? 'bg-green-400' : 'bg-red-400'}`} />
      <span className={`text-xs ${online ? 'text-green-400' : 'text-red-400'}`}>
        {online ? 'Online' : 'Offline'}
      </span>
    </span>
  );
}

function formatUptime(seconds) {
  if (!seconds) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function formatMem(gb) {
  if (gb == null) return '—';
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${(gb * 1024).toFixed(0)} MB`;
}

function TagChips({ guest, canMigrate, handleRemoveTag }) {
  const t = guest.tags || {};
  const hasIgnore = !!t.has_ignore;
  const hasAutoMigrate = t.all_tags?.includes('auto_migrate_ok');
  const exclude = t.exclude_groups || [];
  const affinity = t.affinity_groups || [];
  if (!hasIgnore && !hasAutoMigrate && exclude.length === 0 && affinity.length === 0) return null;

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
      {hasIgnore && (
        <Chip label="ignore" color="bg-yellow-900/40 text-yellow-300"
          onRemove={() => handleRemoveTag?.(guest, 'ignore')} />
      )}
      {hasAutoMigrate && (
        <Chip label="auto" color="bg-green-900/40 text-green-300"
          onRemove={() => handleRemoveTag?.(guest, 'auto_migrate_ok')} />
      )}
      {affinity.map(tag => (
        <Chip key={`aff-${tag}`} label={tag} color="bg-purple-900/40 text-purple-300"
          onRemove={() => handleRemoveTag?.(guest, tag)} />
      ))}
      {exclude.map(tag => (
        <Chip key={`exc-${tag}`} label={tag} color="bg-blue-900/40 text-blue-300"
          onRemove={() => handleRemoveTag?.(guest, tag)} />
      ))}
    </div>
  );
}

function WorkloadBadge({ profile, running }) {
  if (!running) return null;
  if (!profile || profile.confidence === 'low') return null;
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

function GuestList({ guests, onGuestClick, canMigrate, guestProfiles, handleRemoveTag, openTagModal }) {
  if (!guests || guests.length === 0) {
    return <div className="text-xs text-gray-600 italic px-3 py-2">No guests on this node</div>;
  }
  return (
    <div className="border-l border-slate-700/40 ml-2">
      {guests.map(guest => (
        <div
          key={guest.vmid}
          onClick={(e) => { e.stopPropagation(); onGuestClick?.(guest); }}
          className="flex items-center gap-3 px-3 py-2 rounded hover:bg-slate-700/30 cursor-pointer transition-colors flex-wrap"
        >
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${guest.status === 'running' ? 'bg-green-400' : 'bg-gray-600'}`} />
          <span className="text-sm text-gray-200 min-w-[160px] flex items-center gap-1.5">
            {guest.name || `guest-${guest.vmid}`}
            <span className="text-[10px] text-gray-600">{guest.vmid}</span>
            <WorkloadBadge profile={guestProfiles?.[String(guest.vmid)]} running={guest.status === 'running'} />
          </span>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
            guest.type === 'VM'
              ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
              : 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
          }`}>
            {guest.type}
          </span>
          <TagChips guest={guest} canMigrate={canMigrate} handleRemoveTag={handleRemoveTag} />
          {canMigrate && openTagModal && (
            <button
              onClick={(e) => { e.stopPropagation(); openTagModal(guest); }}
              className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-900/30 rounded transition-colors"
              title="Manage tags"
              aria-label="Manage tags"
            >
              <Tag size={12} />
            </button>
          )}
          {guest.status === 'running' ? (
            <div className="flex items-center gap-4 ml-auto text-xs text-gray-500 tabular-nums">
              {guest.cpu_current != null && (
                <span>CPU <span className="text-gray-300">{guest.cpu_current.toFixed(0)}%</span></span>
              )}
              {guest.mem_used_gb != null && (
                <span>Mem <span className="text-gray-300">{formatMem(guest.mem_used_gb)}</span></span>
              )}
            </div>
          ) : (
            <span className="ml-auto text-xs text-gray-600">stopped</span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function NodeSummaryTable({
  data, nodeScores, onNodeClick, onGuestClick,
  collapsedSections, setCollapsedSections,
  embedded = false,
  // Tag management
  canMigrate, guestProfiles, handleRemoveTag, setTagModalGuest, setShowTagModal,
}) {
  const openTagModal = setTagModalGuest && setShowTagModal
    ? (guest) => { setTagModalGuest(guest); setShowTagModal(true); }
    : null;
  // When embedded, the parent owns the section header (and thus the
  // collapse state and the collapsed-chip summary). Always render the body.
  const collapsed = embedded ? false : collapsedSections?.nodeOverview;
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedNodes, setExpandedNodes] = useState(() => new Set());

  // Per-node guests with search + filter applied
  const { guestsByNode, totalFiltered } = useMemo(() => {
    if (!data?.guests) return { guestsByNode: {}, totalFiltered: 0 };
    const byNode = {};
    let total = 0;
    Object.values(data.guests).forEach(guest => {
      if (search) {
        const q = search.toLowerCase();
        const name = (guest.name || '').toLowerCase();
        const vmid = String(guest.vmid || '');
        if (!name.includes(q) && !vmid.includes(q)) return;
      }
      if (filter === 'vm' && guest.type !== 'VM') return;
      if (filter === 'lxc' && guest.type !== 'LXC') return;
      if (filter === 'running' && guest.status !== 'running') return;
      if (filter === 'stopped' && guest.status !== 'stopped') return;
      if (filter === 'ignored' && !guest.tags?.has_ignore) return;
      if (filter === 'auto_migrate' && !guest.tags?.all_tags?.includes('auto_migrate_ok')) return;
      if (filter === 'affinity' && !(guest.tags?.affinity_groups?.length > 0)) return;
      if (filter === 'anti_affinity' && !(guest.tags?.exclude_groups?.length > 0)) return;
      const nodeName = guest.node || 'unknown';
      if (!byNode[nodeName]) byNode[nodeName] = [];
      byNode[nodeName].push(guest);
      total++;
    });
    Object.values(byNode).forEach(arr => arr.sort((a, b) => (a.vmid || 0) - (b.vmid || 0)));
    return { guestsByNode: byNode, totalFiltered: total };
  }, [data, search, filter]);

  const filterActive = search.trim() !== '' || filter !== 'all';

  // When filter is active, expand every node that has matches.
  // Otherwise honor what the user clicked open.
  const effectiveExpanded = useMemo(() => {
    if (filterActive) return new Set(Object.keys(guestsByNode));
    return expandedNodes;
  }, [filterActive, guestsByNode, expandedNodes]);

  const toggleNode = (name) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const nodes = useMemo(() => {
    if (!data?.nodes) return [];
    const nodesArr = Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes);
    const guestsDict = data.guests || {};

    return nodesArr.map(node => {
      const cpuPct = node.cpu_percent || 0;
      const memPct = node.mem_percent || 0;
      const totalMemGB = node.total_mem_gb || 0;
      const usedMemGB = totalMemGB * (memPct / 100);

      const storageArr = node.storage || [];
      const diskTotalGB = storageArr.reduce((sum, s) => sum + (s.total_gb || 0), 0);
      const diskUsedGB = storageArr.reduce((sum, s) => sum + (s.used_gb || 0), 0);
      const diskPct = diskTotalGB > 0 ? (diskUsedGB / diskTotalGB) * 100 : 0;

      const score = nodeScores?.[node.name]?.suitability_score;

      const guestVmids = node.guests || [];
      let vms = 0, cts = 0;
      guestVmids.forEach(vmid => {
        const g = guestsDict[String(vmid)];
        if (g) {
          if (g.type === 'VM') vms++;
          else cts++;
        }
      });

      return {
        name: node.name,
        status: node.status,
        online: node.status === 'online',
        uptime: node.uptime,
        cpuPct, memPct, diskPct, score, vms, cts,
        cpuDetail: `${node.cpu_cores || 0} cores`,
        memDetail: `${usedMemGB.toFixed(1)}/${totalMemGB.toFixed(0)} GB`,
        raw: node
      };
    }).sort((a, b) => {
      const v = sortDir === 'asc' ? 1 : -1;
      if (sortField === 'name') return a.name.localeCompare(b.name) * v;
      if (sortField === 'score') return ((a.score || 0) - (b.score || 0)) * v;
      if (sortField === 'cpu') return (a.cpuPct - b.cpuPct) * v;
      if (sortField === 'mem') return (a.memPct - b.memPct) * v;
      return 0;
    });
  }, [data, nodeScores, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortHeader = ({ field, children }) => (
    <th
      className={`${TABLE_HEADER} cursor-pointer hover:text-gray-200`}
      onClick={() => handleSort(field)}
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <ChevronDown size={12} className={`transition-transform ${sortDir === 'asc' ? '' : 'rotate-180'}`} />
        )}
      </span>
    </th>
  );

  const Wrapper = embedded ? React.Fragment : 'div';
  const wrapperProps = embedded ? {} : { className: GLASS_CARD };

  return (
    <Wrapper {...wrapperProps}>
      {!embedded && (
        <button
          onClick={() => setCollapsedSections?.(prev => ({ ...prev, nodeOverview: !prev.nodeOverview }))}
          className="w-full flex items-center justify-between text-left mb-3 hover:opacity-80 transition-opacity"
        >
          <h2 className={TEXT_HEADING}>Nodes</h2>
          <ChevronDown
            size={ICON.section}
            className={`text-gray-400 transition-transform duration-200 ${!collapsed ? 'rotate-180' : ''}`}
          />
        </button>
      )}

      {collapsed && (
        <div className="flex flex-wrap gap-2">
          {nodes.map(node => {
            const isProblem = !node.online
              || node.cpuPct >= 80
              || node.memPct >= 80
              || (node.score != null && node.score < 60);
            const ringClass = isProblem ? 'ring-1 ring-red-500/40' : '';
            return (
              <button
                key={node.name}
                onClick={() => setCollapsedSections?.(prev => ({ ...prev, nodeOverview: false }))}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/50 text-xs hover:bg-slate-700/40 transition-colors focus:outline-none ${ringClass}`}
                title={`${node.name} — click to expand`}
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${node.online ? 'bg-green-400' : 'bg-red-400'}`} />
                <span className="font-medium text-gray-200">{node.name}</span>
                {node.online ? (
                  <>
                    <span className="text-gray-500">CPU</span>
                    <span className={`tabular-nums ${metricTextColor(node.cpuPct)}`}>{Math.round(node.cpuPct)}%</span>
                    <span className="text-gray-500">Mem</span>
                    <span className={`tabular-nums ${metricTextColor(node.memPct)}`}>{Math.round(node.memPct)}%</span>
                    {node.score != null && (
                      <span className={`font-bold tabular-nums ${scoreColor(node.score)}`} title="Suitability score">
                        {Math.round(node.score)}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-red-400">offline</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {!collapsed && (
        <>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Search guests by name or VMID..."
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
            {filterActive && (
              <span className="text-xs text-gray-500 sm:ml-auto tabular-nums">
                {totalFiltered} guest{totalFiltered !== 1 ? 's' : ''} match
              </span>
            )}
          </div>

          <div className="overflow-x-auto -mx-4 sm:-mx-5">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className={`${TABLE_HEADER} w-8`}></th>
                  <SortHeader field="name">Node</SortHeader>
                  <th className={TABLE_HEADER}>Status</th>
                  <th className={TABLE_HEADER}>Uptime</th>
                  <SortHeader field="cpu">CPU</SortHeader>
                  <SortHeader field="mem">Memory</SortHeader>
                  <th className={TABLE_HEADER}>Disk</th>
                  <SortHeader field="score">Score</SortHeader>
                  <th className={TABLE_HEADER}>VMs</th>
                  <th className={TABLE_HEADER}>CTs</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map(node => {
                  const isExpanded = effectiveExpanded.has(node.name);
                  const nodeGuests = guestsByNode[node.name] || [];
                  return (
                    <React.Fragment key={node.name}>
                      <tr
                        className={`${TABLE_ROW} cursor-pointer`}
                        onClick={() => onNodeClick?.(node.raw)}
                      >
                        <td className="p-3 w-8">
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleNode(node.name); }}
                            className="flex items-center justify-center w-5 h-5 rounded hover:bg-slate-700/50 transition-colors"
                            aria-label={isExpanded ? 'Collapse guests' : 'Expand guests'}
                          >
                            <ChevronDown
                              size={14}
                              className={`text-gray-500 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`}
                            />
                          </button>
                        </td>
                        <td className="p-3">
                          <span className="text-sm font-medium text-white">{node.name}</span>
                        </td>
                        <td className="p-3"><StatusDot online={node.online} /></td>
                        <td className="p-3 text-xs text-gray-400 font-mono tabular-nums">{formatUptime(node.uptime)}</td>
                        <td className="p-3"><MetricBar pct={node.cpuPct} detail={node.cpuDetail} /></td>
                        <td className="p-3"><MetricBar pct={node.memPct} detail={node.memDetail} /></td>
                        <td className="p-3"><MetricBar pct={node.diskPct} /></td>
                        <td className="p-3">
                          {node.score != null ? (
                            <span className={`text-sm font-bold font-mono tabular-nums ${scoreColor(node.score)}`}>
                              {Math.round(node.score)}
                            </span>
                          ) : (
                            <span className="text-xs text-gray-600">—</span>
                          )}
                        </td>
                        <td className="p-3 text-xs text-gray-400 tabular-nums text-center">{node.vms}</td>
                        <td className="p-3 text-xs text-gray-400 tabular-nums text-center">{node.cts}</td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-900/40">
                          <td colSpan={TOTAL_COLS} className="px-3 pb-3 pt-1">
                            <GuestList
                              guests={nodeGuests}
                              onGuestClick={onGuestClick}
                              canMigrate={canMigrate}
                              guestProfiles={guestProfiles}
                              handleRemoveTag={handleRemoveTag}
                              openTagModal={openTagModal}
                            />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filterActive && totalFiltered === 0 && (
            <div className="text-center py-6 text-gray-500 text-sm">
              No guests match your filters
            </div>
          )}
        </>
      )}
    </Wrapper>
  );
}
