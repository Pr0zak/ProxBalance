import { HardDrive, Clock, Settings, Activity } from './Icons.jsx';

export default function MobileTabBar({ activePage, onNavigate, lastUpdate }) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: HardDrive },
    { id: 'automation', label: 'Automation', icon: Clock },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 sm:hidden">
      {lastUpdate && (
        <div className="bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm border-t border-white/20 dark:border-gray-700/50 px-3 py-1 text-center">
          <span className="text-[10px] text-gray-500 dark:text-gray-400">
            Last update: {new Date(lastUpdate).toLocaleTimeString()}
          </span>
        </div>
      )}
      <div className="backdrop-blur-xl bg-white/80 dark:bg-gray-800/80 border-t border-white/20 dark:border-gray-700/50">
        <div className="flex justify-around">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center gap-0.5 py-2 px-4 transition-colors ${
                activePage === id
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              <Icon size={20} />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
