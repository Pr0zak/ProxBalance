import {
  GLASS_CARD, INPUT_FIELD, FILTER_CHIP, FILTER_CHIP_ACTIVE, FILTER_CHIP_INACTIVE, SELECT_FIELD
} from '../../utils/designTokens.js';
import { ChevronDown, ChevronRight } from '../Icons.jsx';

const { useState, useMemo } = React;

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'vm', label: 'VMs' },
  { id: 'lxc', label: 'LXCs' },
  { id: 'running', label: 'Running' },
  { id: 'stopped', label: 'Stopped' },
];

/** Format bytes to human-readable */
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}

export default function GuestFilterBar({ data, onGuestClick }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expandedNode, setExpandedNode] = useState(null);
  const [sortBy, setSortBy] = useState('node');

  const { guestsByNode, totalGuests } = useMemo(() => {
    if (!data?.nodes) return { guestsByNode: {}, totalGuests: 0 };

    const byNode = {};
    let total = 0;

    data.nodes.forEach(node => {
      const guests = (node.guests || []).filter(guest => {
        // Search filter
        if (search) {
          const q = search.toLowerCase();
          const name = (guest.name || '').toLowerCase();
          const vmid = String(guest.vmid || '');
          if (!name.includes(q) && !vmid.includes(q)) return false;
        }
        // Type filter
        if (filter === 'vm' && guest.type !== 'qemu') return false;
        if (filter === 'lxc' && guest.type !== 'lxc') return false;
        // Status filter
        if (filter === 'running' && guest.status !== 'running') return false;
        if (filter === 'stopped' && guest.status !== 'stopped') return false;
        return true;
      }).sort((a, b) => {
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'cpu') return (b.cpu_usage || 0) - (a.cpu_usage || 0);
        if (sortBy === 'mem') return (b.mem_used || 0) - (a.mem_used || 0);
        return (a.vmid || 0) - (b.vmid || 0);
      });

      if (guests.length > 0) {
        byNode[node.node] = guests;
        total += guests.length;
      }
    });

    return { guestsByNode: byNode, totalGuests: total };
  }, [data, search, filter, sortBy]);

  return (
    <div className={GLASS_CARD}>
      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-3">
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

        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-gray-500">{totalGuests} guests</span>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className={`${SELECT_FIELD} text-xs py-1`}
          >
            <option value="node">Sort by Node</option>
            <option value="name">Sort by Name</option>
            <option value="cpu">Sort by CPU</option>
            <option value="mem">Sort by Memory</option>
          </select>
        </div>
      </div>

      {/* Grouped guest list */}
      {Object.entries(guestsByNode).map(([nodeName, guests]) => (
        <div key={nodeName} className="mb-1">
          {/* Node group header */}
          <button
            onClick={() => setExpandedNode(expandedNode === nodeName ? null : nodeName)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/30 transition-colors text-left"
          >
            <ChevronDown
              size={14}
              className={`text-gray-500 transition-transform duration-200 ${expandedNode === nodeName ? 'rotate-0' : '-rotate-90'}`}
            />
            <span className="text-sm font-medium text-gray-300">{nodeName}</span>
            <span className="text-xs text-gray-500">
              {guests.filter(g => g.type === 'qemu').length} VMs, {guests.filter(g => g.type === 'lxc').length} LXCs
            </span>
          </button>

          {/* Guest rows */}
          {expandedNode === nodeName && (
            <div className="ml-5 border-l border-slate-700/40 pl-3">
              {guests.map(guest => (
                <div
                  key={guest.vmid}
                  onClick={() => onGuestClick?.(guest)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-700/30 cursor-pointer transition-colors"
                >
                  {/* Status dot */}
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${guest.status === 'running' ? 'bg-green-400' : 'bg-gray-600'}`} />

                  {/* Name + ID */}
                  <span className="text-sm text-gray-200 min-w-[140px]">
                    {guest.name || `guest-${guest.vmid}`}
                    <span className="text-[10px] text-gray-600 ml-1.5">{guest.vmid}</span>
                  </span>

                  {/* Type badge */}
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    guest.type === 'qemu'
                      ? 'bg-blue-900/30 text-blue-400 border border-blue-800/30'
                      : 'bg-orange-900/30 text-orange-400 border border-orange-800/30'
                  }`}>
                    {guest.type === 'qemu' ? 'VM' : 'LXC'}
                  </span>

                  {/* Metrics */}
                  {guest.status === 'running' && (
                    <div className="flex items-center gap-4 ml-auto text-xs text-gray-500 tabular-nums">
                      <span>CPU <span className="text-gray-300">{((guest.cpu_usage || 0) * 100).toFixed(0)}%</span></span>
                      <span>Mem <span className="text-gray-300">{formatBytes(guest.mem_used)}</span></span>
                    </div>
                  )}
                  {guest.status !== 'running' && (
                    <span className="ml-auto text-xs text-gray-600">stopped</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {totalGuests === 0 && (
        <div className="text-center py-6 text-gray-500 text-sm">
          No guests match your filters
        </div>
      )}
    </div>
  );
}
