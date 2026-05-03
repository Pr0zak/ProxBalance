import { HardDrive, Clock, Settings } from './Icons.jsx';

export default function MobileTabBar({ activePage, onNavigate, lastUpdate }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HardDrive },
    { id: 'automation', label: 'Automation', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {lastUpdate && (
        <div className="bg-white dark:bg-slate-800/80 border-t border-pb-border dark:border-slate-700/40 px-3 py-1 text-center">
          <span className="text-[10px] text-pb-text2 dark:text-gray-500">
            Updated {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      )}
      <div className="bg-slate-900/95 backdrop-blur-sm border-t border-pb-border dark:border-slate-700/50">
        <div className="flex justify-around">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center gap-0.5 py-2.5 px-4 transition-colors ${
                activePage === id
                  ? 'text-blue-400'
                  : 'text-pb-text2 dark:text-gray-500'
              }`}
            >
              <Icon size={18} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
