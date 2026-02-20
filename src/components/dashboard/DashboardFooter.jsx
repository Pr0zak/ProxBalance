import { Clock, Server, RefreshCw, GitBranch } from '../Icons.jsx';
import { formatLocalTime, getTimezoneAbbr } from '../../utils/formatters.js';

export default function DashboardFooter({
  lastUpdate, backendCollected, handleRefresh, loading,
  systemInfo, data,
  fetchBranches, setShowBranchModal, clearTestingMode
}) {
  return (
    <div className="hidden sm:block fixed bottom-0 left-0 right-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 py-2 px-4 z-40">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="flex items-center gap-1.5">
              <Clock size={12} />
              <span>UI refreshed: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatLocalTime(lastUpdate)} {getTimezoneAbbr()}</span></span>
            </div>
          )}
          {backendCollected && (
            <>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <div className="flex items-center gap-1.5">
                <Server size={12} />
                <span>Data collected: <span className="font-semibold text-gray-700 dark:text-gray-300">{formatLocalTime(backendCollected)} {getTimezoneAbbr()}</span>{data?.performance?.total_time && <span className="text-gray-500 dark:text-gray-400 ml-1">({data.performance.total_time}s)</span>}</span>
                <button
                  onClick={handleRefresh}
                  disabled={loading}
                  className="ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Refresh data collection now"
                >
                  <RefreshCw size={12} className={loading ? 'animate-spin text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'} />
                </button>
              </div>
            </>
          )}
          {systemInfo && (
            <>
              <span className="text-gray-300 dark:text-gray-700">|</span>
              <div className="flex items-center gap-2">
                <span>Branch: <button
                  onClick={() => { fetchBranches(); setShowBranchModal(true); }}
                  className="font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-dotted cursor-pointer"
                  title="Click to manage branches"
                >{systemInfo.branch}</button></span>
                {systemInfo.previous_branch && systemInfo.previous_branch !== systemInfo.branch && (
                  <button
                    onClick={clearTestingMode}
                    className="px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800/50 cursor-pointer"
                    title={`Click to dismiss — previously on ${systemInfo.previous_branch}`}
                  >
                    testing &times;
                  </button>
                )}
                <span className="text-gray-300 dark:text-gray-700">|</span>
                <span>Commit: <span className="font-mono text-gray-600 dark:text-gray-400">{systemInfo.commit}</span></span>
                {systemInfo.updates_available && (
                  <>
                    <span className="text-gray-300 dark:text-gray-700">|</span>
                    <span className="text-yellow-600 dark:text-yellow-400 font-semibold">
                      {systemInfo.commits_behind} update{systemInfo.commits_behind > 1 ? 's' : ''} available
                    </span>
                  </>
                )}
              </div>
            </>
          )}
        </div>
        <div className="text-xs font-semibold bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
          ProxBalance
        </div>
      </div>
    </div>
  );
}
