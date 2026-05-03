import { ProxBalanceLogo, RefreshCw, GitBranch, GitHub } from './Icons.jsx';
import {
  TOP_NAV, NAV_TAB, NAV_TAB_ACTIVE, NAV_TAB_INACTIVE,
  CONNECTION_BADGE_ONLINE, CONNECTION_BADGE_OFFLINE
} from '../utils/designTokens.js';

const { useMemo } = React;

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'automation', label: 'Automation' },
  { id: 'settings', label: 'Settings' },
  // TODO: Add Nodes, Storage, Backups, Logs tabs
];

export default function TopNav({
  currentPage, setCurrentPage,
  connected, lastUpdate,
  onRefresh, refreshing,
  systemInfo, onShowUpdate, onShowBranches
}) {
  const timeAgo = useMemo(() => {
    if (!lastUpdate) return null;
    const seconds = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [lastUpdate, Math.floor(Date.now() / 30000)]);

  return (
    <nav className={TOP_NAV}>
      <div className="max-w-screen-2xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <ProxBalanceLogo size={28} />
            <span className="text-lg hidden sm:inline">
              <span className="font-light text-gray-300">Prox</span>
              <span className="font-extrabold text-blue-400">Balance</span>
            </span>
          </div>

          {/* Center tabs */}
          <div className="flex items-center gap-0 overflow-x-auto">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentPage(tab.id)}
                className={`${NAV_TAB} ${currentPage === tab.id ? NAV_TAB_ACTIVE : NAV_TAB_INACTIVE}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Update available */}
            {systemInfo?.updates_available && (
              <button
                onClick={onShowUpdate}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 hover:bg-yellow-900/50 transition-colors"
                title={`${systemInfo.commits_behind} update(s) available`}
              >
                <RefreshCw size={12} />
                Update
              </button>
            )}

            {/* Connection badge */}
            <span className={`hidden sm:inline-flex ${connected ? CONNECTION_BADGE_ONLINE : CONNECTION_BADGE_OFFLINE}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
              {connected ? 'Connected' : 'Disconnected'}
            </span>

            {/* Branch info */}
            {systemInfo?.branch && (
              <button
                onClick={onShowBranches}
                className="hidden lg:flex items-center gap-1 text-xs text-gray-500 hover:text-blue-400 transition-colors"
                title="Manage branches"
              >
                <GitBranch size={12} />
                <span className="font-mono">{systemInfo.branch.length > 16 ? systemInfo.branch.substring(0, 16) + '...' : systemInfo.branch}</span>
              </button>
            )}

            {/* Last update */}
            {timeAgo && (
              <span className="hidden xl:inline text-xs text-gray-500">
                {timeAgo}
              </span>
            )}

            {/* Refresh */}
            <button onClick={onRefresh} className={BTN_ICON} title="Refresh">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* GitHub */}
            <a
              href="https://github.com/Pr0zak/ProxBalance"
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN_ICON} hidden sm:flex`}
              title="GitHub"
            >
              <GitHub size={16} />
            </a>

          </div>
        </div>
      </div>
    </nav>
  );
}
