import {
  AlertCircle, Server, HardDrive, Activity, RefreshCw, Play, CheckCircle,
  XCircle, ClipboardList, Tag, AlertTriangle, Info, Shield, Clock, Sun, Moon,
  Settings, X, Save, Upload, Download, MoveRight, Loader, Plus, List,
  Terminal, ArrowRight, ArrowLeft, History, Pause, Package, Bell, MinusCircle,
  Folder, Minus, Edit, Trash, Copy, ChevronLeft, ChevronRight, ChevronsLeft,
  ChevronsRight, RotateCcw, Check, Cpu, MemoryStick, Globe, Search, Eye,
  EyeOff, Zap, Database, HelpCircle, Filter, Wifi, Power, Lock, Square,
  UserPlus, Users, Calendar, GitBranch, GitHub, ChevronDown, ChevronUp
} from './Icons.jsx';

const { useState } = React;

const iconGroups = [
  {
    label: 'Actions',
    icons: [
      { Icon: Save, name: 'Save' },
      { Icon: Edit, name: 'Edit' },
      { Icon: Trash, name: 'Delete / Remove' },
      { Icon: Copy, name: 'Copy' },
      { Icon: Plus, name: 'Add / Create' },
      { Icon: Minus, name: 'Remove' },
      { Icon: Check, name: 'Confirm / Done' },
      { Icon: X, name: 'Close / Cancel' },
      { Icon: Download, name: 'Download / Export' },
      { Icon: Upload, name: 'Upload / Import' },
      { Icon: Search, name: 'Search / Find' },
      { Icon: Filter, name: 'Filter' },
      { Icon: RefreshCw, name: 'Refresh / Reload' },
      { Icon: RotateCcw, name: 'Reset / Undo' },
    ],
  },
  {
    label: 'Navigation',
    icons: [
      { Icon: ArrowLeft, name: 'Back' },
      { Icon: ArrowRight, name: 'Forward / Go to' },
      { Icon: ChevronLeft, name: 'Previous' },
      { Icon: ChevronRight, name: 'Next' },
      { Icon: ChevronsLeft, name: 'First page' },
      { Icon: ChevronsRight, name: 'Last page' },
      { Icon: ChevronDown, name: 'Expand' },
      { Icon: ChevronUp, name: 'Collapse' },
      { Icon: MoveRight, name: 'Migrate / Move' },
    ],
  },
  {
    label: 'Status',
    icons: [
      { Icon: CheckCircle, name: 'Success / Enabled' },
      { Icon: XCircle, name: 'Error / Disabled' },
      { Icon: AlertCircle, name: 'Alert' },
      { Icon: AlertTriangle, name: 'Warning' },
      { Icon: Info, name: 'Information' },
      { Icon: HelpCircle, name: 'Help' },
      { Icon: Loader, name: 'Loading' },
      { Icon: Shield, name: 'Protected / Safe' },
      { Icon: Lock, name: 'Locked / Secure' },
      { Icon: Eye, name: 'Visible / Preview' },
      { Icon: EyeOff, name: 'Hidden' },
    ],
  },
  {
    label: 'Infrastructure',
    icons: [
      { Icon: Server, name: 'Node / Server' },
      { Icon: HardDrive, name: 'Storage / Disk' },
      { Icon: Cpu, name: 'CPU' },
      { Icon: MemoryStick, name: 'Memory / RAM' },
      { Icon: Database, name: 'Database' },
      { Icon: Globe, name: 'Network' },
      { Icon: Wifi, name: 'Connectivity' },
      { Icon: Zap, name: 'Performance / I/O' },
      { Icon: Power, name: 'Power / Toggle' },
      { Icon: Package, name: 'VM / Container' },
    ],
  },
  {
    label: 'Features',
    icons: [
      { Icon: Activity, name: 'Dashboard / Metrics' },
      { Icon: Clock, name: 'Automation / Schedule' },
      { Icon: Settings, name: 'Settings' },
      { Icon: Play, name: 'Run / Start' },
      { Icon: Pause, name: 'Pause' },
      { Icon: Square, name: 'Stop' },
      { Icon: History, name: 'History / Logs' },
      { Icon: Bell, name: 'Notifications' },
      { Icon: Calendar, name: 'Schedule / Window' },
      { Icon: Tag, name: 'Tag / Label' },
      { Icon: ClipboardList, name: 'Recommendations' },
      { Icon: Folder, name: 'Group / Category' },
      { Icon: List, name: 'List view' },
      { Icon: Terminal, name: 'Console / CLI' },
    ],
  },
  {
    label: 'System',
    icons: [
      { Icon: Sun, name: 'Light mode' },
      { Icon: Moon, name: 'Dark mode' },
      { Icon: GitHub, name: 'GitHub' },
      { Icon: GitBranch, name: 'Branch / Version' },
      { Icon: UserPlus, name: 'Add user' },
      { Icon: Users, name: 'Manage users' },
    ],
  },
];

export default function IconLegend({ darkMode, onClose }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredGroups = iconGroups.map(group => ({
    ...group,
    icons: group.icons.filter(icon =>
      icon.name.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter(group => group.icons.length > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <HelpCircle size={20} /> Icon Reference
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded" title="Close">
            <X size={20} className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search icons..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto p-4 pt-2 space-y-4">
          {filteredGroups.map(group => (
            <div key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">{group.label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {group.icons.map(({ Icon, name }) => (
                  <div
                    key={name}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-700/50 text-sm"
                  >
                    <Icon size={16} className="text-gray-600 dark:text-gray-300 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-200 truncate">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {filteredGroups.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">No icons match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
