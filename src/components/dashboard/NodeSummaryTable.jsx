import {
  GLASS_CARD, TABLE_HEADER, TABLE_ROW, PROGRESS_BAR_BG,
  metricColor, metricTextColor, scoreColor, TEXT_HEADING
} from '../../utils/designTokens.js';
import { ChevronDown } from '../Icons.jsx';

const { useState, useMemo } = React;

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

/** Status dot */
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

/** Format uptime from seconds */
function formatUptime(seconds) {
  if (!seconds) return '—';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days}d ${hours}h`;
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

export default function NodeSummaryTable({ data, nodeScores, onNodeClick }) {
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const nodes = useMemo(() => {
    if (!data?.nodes) return [];
    const nodesArr = Array.isArray(data.nodes) ? data.nodes : Object.values(data.nodes);
    const guestsDict = data.guests || {};

    return nodesArr.map(node => {
      const cpuPct = node.cpu_percent || 0;
      const memPct = node.mem_percent || 0;
      const totalMemGB = node.total_mem_gb || 0;
      const usedMemGB = totalMemGB * (memPct / 100);

      // Storage: array of {total_gb, used_gb, usage_pct}
      const storageArr = node.storage || [];
      const diskTotalGB = storageArr.reduce((sum, s) => sum + (s.total_gb || 0), 0);
      const diskUsedGB = storageArr.reduce((sum, s) => sum + (s.used_gb || 0), 0);
      const diskPct = diskTotalGB > 0 ? (diskUsedGB / diskTotalGB) * 100 : 0;

      const score = nodeScores?.[node.name]?.suitability_score;

      // node.guests is array of VMIDs (integers)
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

  return (
    <div className={GLASS_CARD}>
      <h2 className={`${TEXT_HEADING} mb-3`}>Node Overview</h2>
      <div className="overflow-x-auto -mx-4 sm:-mx-5">
        <table className="w-full min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-700/50">
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
            {nodes.map(node => (
              <tr
                key={node.name}
                className={`${TABLE_ROW} cursor-pointer`}
                onClick={() => onNodeClick?.(node.raw)}
              >
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
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
