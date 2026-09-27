import { HardDrive, Clock, Settings, Activity } from './Icons.jsx';
import { MOBILE_TABBAR_HEIGHT } from '../utils/designTokens.js';
import { useNow, describeDataAge, DATA_AGE_TONE } from '../utils/dataAge.js';

/**
 * Phone bottom navigation. One fixed element of known height
 * (MOBILE_TABBAR_HEIGHT = 4rem + safe-area): a thin data-age line on top of
 * the four tabs. It also renders an in-flow spacer of the same height, so
 * the end of every page scrolls clear of the bar without per-page padding.
 */
export default function MobileTabBar({ activePage, onNavigate, collectedAt, collectionIntervalMin }) {
  const now = useNow(30000);
  const dataAge = describeDataAge(collectedAt, collectionIntervalMin, now);
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HardDrive },
    { id: 'insights', label: 'Insights', icon: Activity },
    { id: 'automation', label: 'Automation', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      <div aria-hidden="true" className="sm:hidden" style={{ height: MOBILE_TABBAR_HEIGHT }} />
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-pb-border dark:border-slate-700/50"
        style={{ height: MOBILE_TABBAR_HEIGHT, paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div
          className={`h-4 leading-4 text-center text-[10px] truncate px-3 ${dataAge ? DATA_AGE_TONE[dataAge.tone] : 'text-pb-text3 dark:text-gray-600'}`}
          title={dataAge?.title}
        >
          {dataAge ? dataAge.label : 'no cluster data yet'}
        </div>
        <div className="flex justify-around h-12">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              aria-current={activePage === id ? 'page' : undefined}
              className={`flex flex-col items-center justify-center gap-0.5 px-4 transition-colors ${
                activePage === id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-pb-text2 dark:text-gray-500'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </>
  );
}
