import { ProxBalanceLogo, Sun, Moon, RefreshCw } from './Icons.jsx';
import {
  TOP_NAV, NAV_TAB, NAV_TAB_ACTIVE, NAV_TAB_INACTIVE,
  CONNECTION_BADGE_ONLINE, CONNECTION_BADGE_OFFLINE, BTN_ICON
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
  darkMode, toggleDarkMode,
  connected, lastUpdate,
  onRefresh, refreshing
}) {
  const timeAgo = useMemo(() => {
    if (!lastUpdate) return null;
    const seconds = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }, [lastUpdate, Math.floor(Date.now() / 30000)]); // re-calc every 30s

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
            {/* Connection badge */}
            <span className={`hidden sm:inline-flex ${connected ? CONNECTION_BADGE_ONLINE : CONNECTION_BADGE_OFFLINE}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
              {connected ? 'Connected' : 'Disconnected'}
            </span>

            {/* Last update */}
            {timeAgo && (
              <span className="hidden lg:inline text-xs text-gray-500">
                Updated {timeAgo}
              </span>
            )}

            {/* Refresh */}
            <button onClick={onRefresh} className={BTN_ICON} title="Refresh">
              <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>

            {/* Dark mode toggle */}
            <button onClick={toggleDarkMode} className={BTN_ICON} title={darkMode ? 'Light Mode' : 'Dark Mode'}>
              {darkMode ? <Sun size={16} className="text-yellow-500" /> : <Moon size={16} />}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
