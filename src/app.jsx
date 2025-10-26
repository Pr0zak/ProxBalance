const { useState, useEffect, useMemo, useCallback, useRef } = React;
        const AlertCircle = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>);
        const Server = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect></svg>);
        const HardDrive = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="22" y1="12" x2="2" y2="12"></line><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path></svg>);
        const Activity = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>);
        const RefreshCw = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>);
        const Play = ({ size }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>);
        const CheckCircle = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>);
        const XCircle = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>);
        const ClipboardList = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><line x1="9" y1="12" x2="15" y2="12"></line><line x1="9" y1="16" x2="15" y2="16"></line></svg>);
        const Tag = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>);
        const AlertTriangle = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>);
        const Info = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>);
        const Shield = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>);
        const Clock = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>);
        const Sun = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>);
        const Moon = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>);
        const Settings = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>);
        const X = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>);
        const Save = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>);
        const Upload = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>);
        const ChevronDown = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="6 9 12 15 18 9"></polyline></svg>);
        const ChevronUp = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="18 15 12 9 6 15"></polyline></svg>);
        const ChevronRight = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="9 18 15 12 9 6"></polyline></svg>);
        const GitHub = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>);
        const GitBranch = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="6" y1="3" x2="6" y2="15"></line><circle cx="18" cy="6" r="3"></circle><circle cx="6" cy="18" r="3"></circle><path d="M18 9a9 9 0 0 1-9 9"></path></svg>);
        const ArrowLeft = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>);
        const Lock = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>);
        const Download = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>);
        const MoveRight = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M18 8L22 12L18 16"></path><path d="M2 12H22"></path></svg>);
        const Loader = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg>);
        const Plus = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>);
        const List = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>);
        const Terminal = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>);
        const ArrowRight = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>);
        const History = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><polyline points="12 7 12 12 15 15"></polyline></svg>);
        const Pause = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>);
        const Package = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>);
        const Bell = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>);
        const MinusCircle = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><circle cx="12" cy="12" r="10"></circle><line x1="8" y1="12" x2="16" y2="12"></line></svg>);
        const Folder = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>);
        const Minus = ({ size, className }) => (<svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}><line x1="5" y1="12" x2="19" y2="12"></line></svg>);

// Logo component
const ProxBalanceLogo = ({ size = 32 }) => (
  <img src="/assets/logo_icon_v2.svg?v=2" alt="ProxBalance Logo" width={size} height={size} />
);

        // Skeleton Loader Components
        const SkeletonCard = () => (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="skeleton h-6 w-32 mb-4"></div>
            <div className="skeleton h-24 w-full mb-3"></div>
            <div className="skeleton h-4 w-3/4"></div>
          </div>
        );

        const SkeletonNodeCard = () => (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="skeleton h-6 w-24"></div>
              <div className="skeleton h-8 w-16 rounded-full"></div>
            </div>
            <div className="space-y-3">
              <div className="skeleton h-4 w-full"></div>
              <div className="skeleton h-4 w-5/6"></div>
              <div className="skeleton h-4 w-4/6"></div>
            </div>
          </div>
        );

        const SkeletonClusterMap = () => (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="skeleton h-6 w-40 mb-6"></div>
            <div className="skeleton h-96 w-full"></div>
          </div>
        );

        const API_BASE = `/api`;

        const ProxmoxBalanceManager = () => {
          const [data, setData] = useState(null);
          const [recommendations, setRecommendations] = useState([]);
          const [recommendationData, setRecommendationData] = useState(null);  // Store full recommendation response
          const [loadingRecommendations, setLoadingRecommendations] = useState(false);
          const [aiRecommendations, setAiRecommendations] = useState(null);
          const [loadingAi, setLoadingAi] = useState(false);
          const [loading, setLoading] = useState(false);
          const [error, setError] = useState(null);
          const [cpuThreshold, setCpuThreshold] = useState(() => {
            const saved = localStorage.getItem('proxbalance_cpu_threshold');
            return saved ? Number(saved) : 50;
          });
          const [memThreshold, setMemThreshold] = useState(() => {
            const saved = localStorage.getItem('proxbalance_mem_threshold');
            return saved ? Number(saved) : 60;
          });
          const [iowaitThreshold, setIowaitThreshold] = useState(() => {
            const saved = localStorage.getItem('proxbalance_iowait_threshold');
            return saved ? Number(saved) : 30;
          });
          const [thresholdMode, setThresholdMode] = useState(() => {
            const saved = localStorage.getItem('proxbalance_threshold_mode');
            return saved || 'manual'; // 'manual' or 'auto'
          });
          const [thresholdSuggestions, setThresholdSuggestions] = useState(null);
          const [clusterHealth, setClusterHealth] = useState(null);
          const [nodeScores, setNodeScores] = useState(null); // Migration suitability scores for all nodes
          const [migrationStatus, setMigrationStatus] = useState({});
          const [activeMigrations, setActiveMigrations] = useState({}); // Track task IDs for cancellation
          const [guestsMigrating, setGuestsMigrating] = useState({}); // Track which guests are migrating (from Proxmox API)
          const [migrationProgress, setMigrationProgress] = useState({}); // Track migration progress (bytes copied)
          const [completedMigrations, setCompletedMigrations] = useState({}); // Track successfully completed migrations with new location
          const [showBatchConfirmation, setShowBatchConfirmation] = useState(false); // Show batch migration confirmation modal
          const [pendingBatchMigrations, setPendingBatchMigrations] = useState([]); // Pending migrations to confirm: { inProgress: bool, current: index, total: count, results: [] }
          const [lastUpdate, setLastUpdate] = useState(null);
          const [nextUpdate, setNextUpdate] = useState(null);
          const [backendCollected, setBackendCollected] = useState(null);
          const [darkMode, setDarkMode] = useState(true);
          const [config, setConfig] = useState(null);
          const [autoRefreshInterval, setAutoRefreshInterval] = useState(60 * 60 * 1000);
          const RECOMMENDATIONS_REFRESH_INTERVAL = 2 * 60 * 1000; // Fixed 2-minute interval for UI refresh
          const [showSettings, setShowSettings] = useState(false);
          const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
          const [currentPage, setCurrentPage] = useState('dashboard'); // 'dashboard', 'settings', or 'automation'
          const [tempBackendInterval, setTempBackendInterval] = useState(60);
          const [tempUiInterval, setTempUiInterval] = useState(60);
          const [savingSettings, setSavingSettings] = useState(false);
          const [savingCollectionSettings, setSavingCollectionSettings] = useState(false);
          const [collectionSettingsSaved, setCollectionSettingsSaved] = useState(false);
          const [canMigrate, setCanMigrate] = useState(true); // Permission check
          const [permissionReason, setPermissionReason] = useState('');
          const [aiProvider, setAiProvider] = useState('none');
          const [aiEnabled, setAiEnabled] = useState(false);
          const [openaiKey, setOpenaiKey] = useState('');
          const [openaiModel, setOpenaiModel] = useState('gpt-4o');
          const [openaiModelCustom, setOpenaiModelCustom] = useState('');
          const [openaiAvailableModels, setOpenaiAvailableModels] = useState([]);
          const [openaiLoadingModels, setOpenaiLoadingModels] = useState(false);
          const [anthropicKey, setAnthropicKey] = useState('');
          const [anthropicModel, setAnthropicModel] = useState('claude-3-5-sonnet-20241022');
          const [anthropicModelCustom, setAnthropicModelCustom] = useState('');
          const [countdownTick, setCountdownTick] = useState(0); // Force re-render for countdown timer
          const [runningAutomation, setRunningAutomation] = useState(false); // Track manual automation run
          const [runNowMessage, setRunNowMessage] = useState(null); // Message after Run Now click
          const [refreshElapsed, setRefreshElapsed] = useState(0); // Track refresh elapsed time
          const [anthropicAvailableModels, setAnthropicAvailableModels] = useState([]);
          const [anthropicLoadingModels, setAnthropicLoadingModels] = useState(false);
          const [localUrl, setLocalUrl] = useState('http://localhost:11434');
          const [localModel, setLocalModel] = useState('llama2');
          const [localModelCustom, setLocalModelCustom] = useState('');
          const [localAvailableModels, setLocalAvailableModels] = useState([]);
          const [localLoadingModels, setLocalLoadingModels] = useState(false);
          const [systemInfo, setSystemInfo] = useState(null);
          const [updating, setUpdating] = useState(false);
          const [updateLog, setUpdateLog] = useState([]);
          const [chartPeriod, setChartPeriod] = useState('1h');
          const [charts, setCharts] = useState({});
          const [showUpdateModal, setShowUpdateModal] = useState(false);
          const [aiAnalysisPeriod, setAiAnalysisPeriod] = useState('24h');
          const [proxmoxTokenId, setProxmoxTokenId] = useState('');
          const [proxmoxTokenSecret, setProxmoxTokenSecret] = useState('');
          const [showBranchModal, setShowBranchModal] = useState(false);
          const [availableBranches, setAvailableBranches] = useState([]);
          const [logoBalancing, setLogoBalancing] = useState(false);
          const [loadingBranches, setLoadingBranches] = useState(false);
          const [switchingBranch, setSwitchingBranch] = useState(false);

          // Debug & Logging
          const [logLevel, setLogLevel] = useState('INFO');
          const [verboseLogging, setVerboseLogging] = useState(false);

          // Automigrate logs
          const [automigrateLogs, setAutomigrateLogs] = useState(null);
          const [logRefreshTime, setLogRefreshTime] = useState(null);
          const [migrationLogsTab, setMigrationLogsTab] = useState('history');

          // Pagination for migration history
          const [migrationHistoryPage, setMigrationHistoryPage] = useState(1);
          const [migrationHistoryPageSize, setMigrationHistoryPageSize] = useState(5);

          // Chart.js lazy loading
          const [chartJsLoaded, setChartJsLoaded] = useState(false);
          const [chartJsLoading, setChartJsLoading] = useState(false);

          // Maintenance mode
          const [maintenanceNodes, setMaintenanceNodes] = useState(() => {
            const saved = localStorage.getItem('maintenanceNodes');
            return saved ? new Set(JSON.parse(saved)) : new Set();
          });
          const [evacuatingNodes, setEvacuatingNodes] = useState(new Set());
          const [evacuationStatus, setEvacuationStatus] = useState({}); // Track status per node
          const [evacuationPlan, setEvacuationPlan] = useState(null); // Migration plan modal
          const [planNode, setPlanNode] = useState(null); // Node being planned for evacuation
          const [planningNodes, setPlanningNodes] = useState(new Set()); // Track nodes currently planning evacuation
          const [guestActions, setGuestActions] = useState({}); // Track action per guest (migrate/ignore/poweroff)
          const [showConfirmModal, setShowConfirmModal] = useState(false); // Show final confirmation before execution
          const [guestTargets, setGuestTargets] = useState({}); // Track custom target per guest (overrides default)
          const [selectedNode, setSelectedNode] = useState(null); // Selected node from Cluster Map for details/maintenance modal
          const [selectedGuestDetails, setSelectedGuestDetails] = useState(null); // Selected guest from Cluster Map for details modal

          // Guest modal collapse state (always starts collapsed, not persisted)
          const [guestModalCollapsed, setGuestModalCollapsed] = useState({
            mountPoints: true,
            passthroughDisks: true
          });

          // Tag management
          const [showTagModal, setShowTagModal] = useState(false);
          const [tagModalGuest, setTagModalGuest] = useState(null);

          // Guest list sorting and pagination
          const [guestSortField, setGuestSortField] = useState('tags'); // vmid, name, node, type, status, tags
          const [guestSortDirection, setGuestSortDirection] = useState('desc'); // asc, desc
          const [guestPageSize, setGuestPageSize] = useState(10);
          const [guestCurrentPage, setGuestCurrentPage] = useState(1);
          const [guestSearchFilter, setGuestSearchFilter] = useState('');
          const [newTag, setNewTag] = useState('');
          const [tagOperation, setTagOperation] = useState(''); // 'add' or 'remove'
          const [confirmRemoveTag, setConfirmRemoveTag] = useState(null); // { guest, tag }
          const [confirmHostChange, setConfirmHostChange] = useState(null); // newHost string
          const [confirmMigration, setConfirmMigration] = useState(null); // recommendation object
          const [confirmRemoveWindow, setConfirmRemoveWindow] = useState(null); // { index, type: 'migration' | 'blackout' }
          const [confirmEnableAutomation, setConfirmEnableAutomation] = useState(false); // boolean
          const [confirmDisableDryRun, setConfirmDisableDryRun] = useState(false); // boolean
          const [confirmApplyPreset, setConfirmApplyPreset] = useState(null); // preset key string
          const [confirmAllowContainerRestarts, setConfirmAllowContainerRestarts] = useState(false); // boolean

          // Dashboard header collapse
          const [dashboardHeaderCollapsed, setDashboardHeaderCollapsed] = useState(() => {
            const saved = localStorage.getItem('dashboardHeaderCollapsed');
            return saved ? JSON.parse(saved) : false;
          });

          // Node grid layout state with localStorage persistence
          const [nodeGridColumns, setNodeGridColumns] = useState(() => {
            const saved = localStorage.getItem('nodeGridColumns');
            return saved ? parseInt(saved) : 3;
          });

          // Collapsed sections state with localStorage persistence
          const [collapsedSections, setCollapsedSections] = useState(() => {
            const saved = localStorage.getItem('collapsedSections');
            return saved ? JSON.parse(saved) : {
              clusterMap: false,
              maintenance: true,
              nodeStatus: true,
              recommendations: false,
              aiRecommendations: false,
              taggedGuests: true,
              analysisDetails: true,
              mainSettings: false,
              safetyRules: false,
              additionalRules: false,
              automatedMigrations: true,  // Collapsed by default
              howItWorks: true,  // Collapsed by default - penalty scoring explanation
              decisionTree: true,  // Collapsed by default - migration decision tree flowchart
              distributionBalancing: true,  // Collapsed by default - distribution balancing section
              distributionBalancingHelp: true,  // Collapsed by default - distribution balancing help text
              lastRunSummary: true,  // Collapsed by default - last automation run details
              mountPoints: true,  // Collapsed by default in guest details modal
              passthroughDisks: true,  // Collapsed by default in guest details modal
              notificationSettings: true  // Collapsed by default (coming soon)
            };
          });

          // Cluster map view mode: 'cpu', 'memory', 'allocated', 'disk_io', or 'network'
          const [clusterMapViewMode, setClusterMapViewMode] = useState(() => {
            const saved = localStorage.getItem('clusterMapViewMode');
            // Migrate old 'usage' value to 'cpu'
            if (saved === 'usage') return 'cpu';
            return saved || 'cpu';
          });

          // Migration dialog state
          const [selectedGuest, setSelectedGuest] = useState(null);
          const [showMigrationDialog, setShowMigrationDialog] = useState(false);
          const [migrationTarget, setMigrationTarget] = useState('');

          // Automated migrations state
          const [automationStatus, setAutomationStatus] = useState({
            enabled: false,
            timer_active: false,
            check_interval_minutes: 0,
            dry_run: false,
            state: {}
          });
          const [loadingAutomationStatus, setLoadingAutomationStatus] = useState(false);
          const [runHistory, setRunHistory] = useState([]);
          const [loadingRunHistory, setLoadingRunHistory] = useState(false);
          const [expandedRun, setExpandedRun] = useState(null); // Track which run is expanded
          const [automationConfig, setAutomationConfig] = useState({
            enabled: false,
            dry_run: false,
            check_interval_minutes: 5,
            maintenance_nodes: [],
            rules: {
              min_confidence_score: 75,
              max_migrations_per_run: 3
            },
            safety_checks: {
              max_node_cpu_percent: 85,
              max_node_memory_percent: 85,
              min_free_disk_gb: 20
            },
            time_windows: [],
            presets: {
              conservative: { min_confidence_score: 80, max_migrations_per_run: 1, cooldown_minutes: 120, check_interval_minutes: 30 },
              balanced: { min_confidence_score: 70, max_migrations_per_run: 3, cooldown_minutes: 60, check_interval_minutes: 15 },
              aggressive: { min_confidence_score: 60, max_migrations_per_run: 5, cooldown_minutes: 30, check_interval_minutes: 5 }
            }
          });
          const [savingAutomationConfig, setSavingAutomationConfig] = useState(false);
          const [editingPreset, setEditingPreset] = useState(null); // Track which preset is being edited (conservative/balanced/aggressive)
          const [testResult, setTestResult] = useState(null);
          const [testingAutomation, setTestingAutomation] = useState(false);
          const [cancelMigrationModal, setCancelMigrationModal] = useState(null); // { migration: object } or null
          const [cancellingMigration, setCancellingMigration] = useState(false);

          // Penalty Configuration state
          const [penaltyConfig, setPenaltyConfig] = useState(null);
          const [penaltyDefaults, setPenaltyDefaults] = useState(null);
          const [showPenaltyConfig, setShowPenaltyConfig] = useState(false);
          const [savingPenaltyConfig, setSavingPenaltyConfig] = useState(false);
          const [penaltyConfigSaved, setPenaltyConfigSaved] = useState(false);
          const [openPenaltyConfigOnSettings, setOpenPenaltyConfigOnSettings] = useState(false);

          // Unified Time Windows form state
          const [showTimeWindowForm, setShowTimeWindowForm] = useState(false);
          const [editingWindowIndex, setEditingWindowIndex] = useState(null); // Track which window is being edited (index in combined array)
          const [newWindowData, setNewWindowData] = useState({
            name: '',
            type: 'migration', // 'migration' or 'blackout'
            days: [],
            start_time: '00:00',
            end_time: '00:00'
          });

          // Save collapsed state to localStorage whenever it changes
          useEffect(() => {
            localStorage.setItem('collapsedSections', JSON.stringify(collapsedSections));
          }, [collapsedSections]);

          // Save node grid columns to localStorage whenever it changes
          useEffect(() => {
            localStorage.setItem('nodeGridColumns', nodeGridColumns.toString());
          }, [nodeGridColumns]);

          // Save cluster map view mode to localStorage whenever it changes
          useEffect(() => {
            localStorage.setItem('clusterMapViewMode', clusterMapViewMode);
          }, [clusterMapViewMode]);

          // Save dashboard header collapse state to localStorage
          useEffect(() => {
            localStorage.setItem('dashboardHeaderCollapsed', JSON.stringify(dashboardHeaderCollapsed));
          }, [dashboardHeaderCollapsed]);

          // Save maintenance nodes to localStorage and automation config
          useEffect(() => {
            localStorage.setItem('maintenanceNodes', JSON.stringify(Array.from(maintenanceNodes)));

            // Also sync to automation config so automated migrations respect maintenance mode
            if (automationConfig !== null) {
              const maintenanceArray = Array.from(maintenanceNodes);
              const currentMaintenance = automationConfig.maintenance_nodes || [];

              // Only update if changed to avoid infinite loop
              if (JSON.stringify(maintenanceArray.sort()) !== JSON.stringify(currentMaintenance.sort())) {
                saveAutomationConfig({ maintenance_nodes: maintenanceArray });
              }
            }
          }, [maintenanceNodes]);

          // Clear confirmation modals when settings are closed
          useEffect(() => {
            if (!showSettings) {
              setConfirmHostChange(null);
              // Note: confirmRemoveTag and confirmMigration are not triggered from settings,
              // but we clear them here for consistency
            }
          }, [showSettings]);

          // Save CPU threshold to localStorage
          useEffect(() => {
            localStorage.setItem('proxbalance_cpu_threshold', cpuThreshold.toString());
          }, [cpuThreshold]);

          // Save memory threshold to localStorage
          useEffect(() => {
            localStorage.setItem('proxbalance_mem_threshold', memThreshold.toString());
          }, [memThreshold]);

          // Save IOWait threshold to localStorage
          useEffect(() => {
            localStorage.setItem('proxbalance_iowait_threshold', iowaitThreshold.toString());
          }, [iowaitThreshold]);

          // Save threshold mode to localStorage
          useEffect(() => {
            localStorage.setItem('proxbalance_threshold_mode', thresholdMode);
          }, [thresholdMode]);

          // Auto-apply suggested thresholds when in auto mode
          useEffect(() => {
            if (thresholdMode === 'auto' && thresholdSuggestions) {
              setCpuThreshold(thresholdSuggestions.suggested_cpu_threshold);
              setMemThreshold(thresholdSuggestions.suggested_mem_threshold);
              setIowaitThreshold(thresholdSuggestions.suggested_iowait_threshold);
            }
          }, [thresholdMode, thresholdSuggestions]);

          const toggleSection = (section) => {
            setCollapsedSections(prev => ({
              ...prev,
              [section]: !prev[section]
            }));
          };

          useEffect(() => {
            document.documentElement.classList.add('dark');
            fetchConfig();
            fetchSystemInfo();
            fetchAutomationStatus();
            fetchAutomationConfig();
            fetchRunHistory();
            checkPermissions();
            fetchPenaltyConfig();
          }, []);

          // Hide splash screen when data loads
          useEffect(() => {
            if (data) {
              const splashScreen = document.getElementById('loading-screen');
              if (splashScreen) {
                splashScreen.classList.add('hidden');
                // Remove from DOM after animation completes
                setTimeout(() => {
                  splashScreen.style.display = 'none';
                }, 500);
              }
            }
          }, [data]);

          // Update countdown timer every second
          useEffect(() => {
            const interval = setInterval(() => {
              setCountdownTick(prev => prev + 1);
            }, 1000);
            return () => clearInterval(interval);
          }, []);

          // Handle auto-expansion of Penalty Config when navigating from Migration Recommendations
          useEffect(() => {
            if (currentPage === 'settings' && openPenaltyConfigOnSettings) {
              // Use requestAnimationFrame to ensure DOM is ready
              requestAnimationFrame(() => {
                // Penalty config is now a standalone section, no need to expand Advanced Settings
                setShowPenaltyConfig(true);
                // Scroll to the penalty config section after expansion
                setTimeout(() => {
                  const penaltySection = document.getElementById('penalty-config-section');
                  if (penaltySection) {
                    penaltySection.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    // Flash the section briefly
                    penaltySection.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.5)';
                    setTimeout(() => {
                      penaltySection.style.boxShadow = '';
                    }, 2000);
                  }
                }, 200);
                // Reset flag after all state updates
                setTimeout(() => {
                  setOpenPenaltyConfigOnSettings(false);
                }, 300);
              });
            }
          }, [currentPage, openPenaltyConfigOnSettings]);

          // Auto-refresh automation status every 10 seconds
          useEffect(() => {
            const interval = setInterval(() => {
              fetchAutomationStatus();
              fetchRunHistory();
            }, 10000); // 10 seconds
            return () => clearInterval(interval);
          }, []);

          // Reset guest modal collapse state when a new guest is selected
          useEffect(() => {
            if (selectedGuestDetails) {
              setGuestModalCollapsed({
                mountPoints: true,
                passthroughDisks: true
              });
            }
          }, [selectedGuestDetails?.vmid]); // Only reset when vmid changes

          const checkPermissions = async () => {
            try {
              const response = await fetch(`${API_BASE}/permissions`);
              const result = await response.json();
              if (result.success) {
                setCanMigrate(result.can_migrate);
                setPermissionReason(result.reason || '');
              }
            } catch (err) {
              console.error('Permission check failed:', err);
              // Default to allowing migrations if check fails
              setCanMigrate(true);
            }
          };

          const fetchConfig = async () => {
            try {
              const response = await fetch(`${API_BASE}/config`);
              const result = await response.json();
              if (result.success) {
                setConfig(result.config);
                const intervalMs = (result.config.ui_refresh_interval_minutes || 60) * 60 * 1000;
                setAutoRefreshInterval(intervalMs);
                setTempBackendInterval(result.config.collection_interval_minutes || 60);
                setTempUiInterval(result.config.ui_refresh_interval_minutes || 60);

                // Load Proxmox API settings
                setProxmoxTokenId(result.config.proxmox_api_token_id || '');
                setProxmoxTokenSecret(result.config.proxmox_api_token_secret || '');

                // Load AI settings
                setAiProvider(result.config.ai_provider || 'none');
                setAiEnabled(result.config.ai_recommendations_enabled || false);
                if (result.config.ai_config) {
                  if (result.config.ai_config.openai) {
                    setOpenaiKey(result.config.ai_config.openai.api_key || '');
                    setOpenaiModel(result.config.ai_config.openai.model || 'gpt-4o');
                  }
                  if (result.config.ai_config.anthropic) {
                    setAnthropicKey(result.config.ai_config.anthropic.api_key || '');
                    setAnthropicModel(result.config.ai_config.anthropic.model || 'claude-3-5-sonnet-20241022');
                  }
                  if (result.config.ai_config.local) {
                    setLocalUrl(result.config.ai_config.local.base_url || 'http://localhost:11434');
                    setLocalModel(result.config.ai_config.local.model || 'llama2');
                  }
                }
              }
            } catch (err) {
              console.error('Failed to load config:', err);
            }
          };

          const fetchPenaltyConfig = async () => {
            try {
              const response = await fetch(`${API_BASE}/penalty-config`);
              const result = await response.json();
              if (result.success) {
                setPenaltyConfig(result.config);
                setPenaltyDefaults(result.defaults);
              }
            } catch (err) {
              console.error('Failed to load penalty config:', err);
            }
          };

          const saveSettings = async () => {
            setSavingSettings(true);
            try {
              const response = await fetch(`${API_BASE}/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  collection_interval_minutes: tempBackendInterval,
                  ui_refresh_interval_minutes: tempUiInterval,
                  proxmox_auth_method: 'api_token',
                  proxmox_api_token_id: proxmoxTokenId,
                  proxmox_api_token_secret: proxmoxTokenSecret,
                  ai_provider: aiProvider,
                  ai_recommendations_enabled: aiEnabled,
                  ai_config: {
                    openai: {
                      api_key: openaiKey,
                      model: openaiModelCustom || openaiModel
                    },
                    anthropic: {
                      api_key: anthropicKey,
                      model: anthropicModel
                    },
                    local: {
                      base_url: localUrl,
                      model: localModelCustom || localModel
                    }
                  }
                })
              });
              
              const result = await response.json();
              if (result.success) {
                setConfig(result.config);
                const intervalMs = tempUiInterval * 60 * 1000;
                setAutoRefreshInterval(intervalMs);
                setShowSettings(false);

                const now = new Date();
                setLastUpdate(now);
                setNextUpdate(new Date(now.getTime() + intervalMs));
              } else {
                setError('Failed to save settings: ' + result.error);
              }
            } catch (err) {
              setError('Failed to save settings: ' + err.message);
            }
            setSavingSettings(false);
          };

          const toggleDarkMode = () => {
            setDarkMode(!darkMode);
            document.documentElement.classList.toggle('dark');
          };

          const formatLocalTime = (date) => {
            return new Date(date).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true
            });
          };

          const getTimezoneAbbr = () => {
            const date = new Date();
            const timeZoneName = date.toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop();
            return timeZoneName;
          };

          const handleRefresh = async () => {
            setLoading(true);
            setError(null);
            setRefreshElapsed(0);

            // Start elapsed time counter
            const startTime = Date.now();
            const elapsedInterval = setInterval(() => {
              setRefreshElapsed(Math.floor((Date.now() - startTime) / 1000));
            }, 1000);

            try {
              // Get current collection timestamp before triggering refresh
              const preRefreshData = data;
              const oldTimestamp = preRefreshData?.collected_at;

              // Trigger background collection
              const refreshResponse = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
              if (!refreshResponse.ok) throw new Error('Failed to trigger data collection');

              // Poll for new data with faster initial checks
              // Start with 500ms intervals, then increase to 1s after 10 attempts
              let attempts = 0;
              const maxAttempts = 40; // 40 attempts = ~25 seconds max

              while (attempts < maxAttempts) {
                // Variable delay: 500ms for first 10 checks, then 1s
                const delay = attempts < 10 ? 500 : 1000;
                await new Promise(resolve => setTimeout(resolve, delay));

                // Fetch updated data
                const response = await fetch(`${API_BASE}/analyze`);
                if (response.ok) {
                  const result = await response.json();
                  const newTimestamp = result?.data?.collected_at;

                  // Check if we have new data
                  if (newTimestamp && newTimestamp !== oldTimestamp) {
                    // New data available!
                    clearInterval(elapsedInterval);
                    await fetchAnalysis();
                    return;
                  }
                }

                attempts++;
              }

              // Fallback: if polling didn't detect new data, fetch anyway
              clearInterval(elapsedInterval);
              await fetchAnalysis();
            } catch (err) {
              clearInterval(elapsedInterval);
              setError(`Refresh failed: ${err.message}`);
              setLoading(false);
            }
          };

          const handleLogoHover = () => {
            if (!logoBalancing) {
              setLogoBalancing(true);
              setTimeout(() => setLogoBalancing(false), 2000);
            }
          };

          const fetchAnalysis = async () => {
            setLoading(true);
            setError(null);
            try {
              const response = await fetch(`${API_BASE}/analyze`);

              if (!response.ok) {
                if (response.status === 503) {
                  const result = await response.json();
                  setError(result.error || 'Service temporarily unavailable');
                } else {
                  setError(`Server error: ${response.status}`);
                }
                setLoading(false);
                return;
              }

              const result = await response.json();
              if (result.success && result.data) {
                setData(result.data);
                const now = new Date();
                setLastUpdate(now);
                setNextUpdate(new Date(now.getTime() + autoRefreshInterval));
                if (result.data.collected_at) {
                  setBackendCollected(new Date(result.data.collected_at));
                }
                if (result.data.cluster_health) {
                  setClusterHealth(result.data.cluster_health);
                }

                // After loading main data, do a fast refresh of guest locations
                // This ensures Cluster Map shows current positions even if cached data is stale
                fetchGuestLocations();
              } else {
                setError(result.error || 'No data received');
              }
            } catch (err) {
              setError(`Connection failed: ${err.message}`);
            }
            setLoading(false);
          };

          const fetchGuestLocations = async () => {
            // Fast API call to get current guest locations (for immediate Cluster Map update on refresh)
            try {
              // console.log('[fetchGuestLocations] Fetching fast guest locations...');
              const response = await fetch(`${API_BASE}/guests/locations`);
              const result = await response.json();

              // console.log('[fetchGuestLocations] API response:', result);

              if (result.success && result.guests && result.nodes) {
                // console.log('[fetchGuestLocations] Updating guest locations in state...');
                // console.log('[fetchGuestLocations] Found', Object.keys(result.guests).length, 'guests');

                // Update data state with new locations
                setData(prevData => {
                  if (!prevData) {
                    // console.log('[fetchGuestLocations] No prevData, skipping update');
                    return prevData;
                  }

                  // console.log('[fetchGuestLocations] Merging location data with existing state');
                  const newData = { ...prevData };

                  // Update guest locations
                  newData.guests = { ...prevData.guests };
                  let updatedCount = 0;
                  Object.keys(result.guests).forEach(vmid => {
                    const locationGuest = result.guests[vmid];
                    if (newData.guests[vmid]) {
                      const oldNode = newData.guests[vmid].node;
                      const newNode = locationGuest.node;
                      if (oldNode !== newNode) {
                        // console.log(`[fetchGuestLocations] Guest ${vmid} moved: ${oldNode} → ${newNode}`);
                      }
                      newData.guests[vmid] = {
                        ...newData.guests[vmid],
                        node: newNode,
                        status: locationGuest.status
                      };
                      updatedCount++;
                    }
                  });

                  // Update node guest lists
                  newData.nodes = { ...prevData.nodes };
                  Object.keys(result.nodes).forEach(nodeName => {
                    if (newData.nodes[nodeName]) {
                      newData.nodes[nodeName] = {
                        ...newData.nodes[nodeName],
                        guests: result.nodes[nodeName].guests
                      };
                    }
                  });

                  // console.log(`[fetchGuestLocations] Updated ${updatedCount} guests, returning new state`);
                  return newData;
                });
              } else {
                console.error('[fetchGuestLocations] Invalid response:', result);
              }
            } catch (err) {
              console.error('[fetchGuestLocations] Error fetching guest locations:', err);
            }
          };

          // Fetch cached recommendations (GET - fast, no regeneration)
          const fetchCachedRecommendations = async () => {
            if (!data) return;
            try {
              const response = await fetch(`${API_BASE}/recommendations`);
              const result = await response.json();
              if (result.success) {
                setRecommendations(result.recommendations);
                setRecommendationData(result);
                if (result.threshold_suggestions) {
                  setThresholdSuggestions(result.threshold_suggestions);
                }
              } else if (result.cache_missing) {
                // No cache exists, generate initial recommendations
                // console.log('No cached recommendations, generating initial set');
                generateRecommendations();
              }
            } catch (err) {
              console.error('Error fetching cached recommendations:', err);
            }
          };

          // Generate new recommendations (POST - slower, full computation)
          const generateRecommendations = async () => {
            if (!data) return;
            setLoadingRecommendations(true);
            try {
              const response = await fetch(`${API_BASE}/recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cpu_threshold: cpuThreshold,
                  mem_threshold: memThreshold,
                  iowait_threshold: iowaitThreshold,
                  maintenance_nodes: Array.from(maintenanceNodes)
                })
              });
              const result = await response.json();
              if (result.success) {
                setRecommendations(result.recommendations);
                setRecommendationData(result);
                if (result.threshold_suggestions) {
                  setThresholdSuggestions(result.threshold_suggestions);
                }
              }
            } catch (err) {
              console.error('Error generating recommendations:', err);
            } finally {
              setLoadingRecommendations(false);
            }
          };

          // Legacy alias for backwards compatibility
          const fetchRecommendations = fetchCachedRecommendations;

          const fetchAiRecommendations = async () => {
            if (!data) return;
            setLoadingAi(true);
            try {
              const response = await fetch(`${API_BASE}/ai-recommendations`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cpu_threshold: cpuThreshold,
                  mem_threshold: memThreshold,
                  analysis_period: aiAnalysisPeriod,
                  maintenance_nodes: Array.from(maintenanceNodes)
                })
              });
              const result = await response.json();
              if (result.success) {
                setAiRecommendations(result);
              } else {
                setAiRecommendations({ success: false, error: result.error });
              }
            } catch (err) {
              setAiRecommendations({ success: false, error: err.message });
            }
            setLoadingAi(false);
          };

          const fetchNodeScores = async () => {
            if (!data) return;
            try {
              const response = await fetch(`${API_BASE}/node-scores`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cpu_threshold: cpuThreshold,
                  mem_threshold: memThreshold,
                  iowait_threshold: iowaitThreshold,
                  maintenance_nodes: Array.from(maintenanceNodes)
                })
              });
              const result = await response.json();
              if (result.success) {
                setNodeScores(result.scores);
              }
            } catch (err) {
              console.error('Error fetching node scores:', err);
            }
          };

          const fetchAiModels = async (provider, apiKey = null, baseUrl = null) => {
            const setLoading = provider === 'openai' ? setOpenaiLoadingModels
              : provider === 'anthropic' ? setAnthropicLoadingModels
              : setLocalLoadingModels;
            const setModels = provider === 'openai' ? setOpenaiAvailableModels
              : provider === 'anthropic' ? setAnthropicAvailableModels
              : setLocalAvailableModels;

            setLoading(true);
            try {
              const payload = { provider };
              if (apiKey) payload.api_key = apiKey;
              if (baseUrl) payload.base_url = baseUrl;

              const response = await fetch(`${API_BASE}/ai-models`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
              });
              const result = await response.json();
              if (result.success) {
                setModels(result.models);
              } else {
                setError(`Failed to fetch models: ${result.error}`);
              }
            } catch (err) {
              setError(`Failed to fetch models: ${err.message}`);
            }
            setLoading(false);
          };

          const fetchSystemInfo = async () => {
            try {
              const response = await fetch(`${API_BASE}/system/info`);
              const result = await response.json();
              if (result.success) {
                setSystemInfo(result);
              }
            } catch (err) {
              console.error('Failed to fetch system info:', err);
            }
          };

          const fetchAutomationStatus = async () => {
            setLoadingAutomationStatus(true);
            try {
              const response = await fetch(`${API_BASE}/automigrate/status`);
              const result = await response.json();
              if (result.success) {
                setAutomationStatus(result);
              }
            } catch (err) {
              console.error('Failed to fetch automation status:', err);
            } finally {
              setLoadingAutomationStatus(false);
            }
          };

          const fetchRunHistory = async (limit = 10) => {
            setLoadingRunHistory(true);
            try {
              const response = await fetch(`${API_BASE}/automigrate/history?type=runs&limit=${limit}`);
              const result = await response.json();
              if (result.success) {
                setRunHistory(result.runs || []);
              }
            } catch (err) {
              console.error('Failed to fetch run history:', err);
            } finally {
              setLoadingRunHistory(false);
            }
          };

          const fetchAutomationConfig = async () => {
            try {
              const response = await fetch(`${API_BASE}/automigrate/config`);
              const result = await response.json();
              if (result.success) {
                setAutomationConfig(result.config);
              }
            } catch (err) {
              console.error('Failed to fetch automation config:', err);
            }
          };

          const saveAutomationConfig = async (updates) => {
            setSavingAutomationConfig(true);
            try {
              const response = await fetch(`${API_BASE}/automigrate/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
              });
              const result = await response.json();
              if (result.success) {
                setAutomationConfig(result.config);
                fetchAutomationStatus(); // Refresh status
                // Silent save - no alert popup
              } else {
                setError(`Failed to save settings: ${result.error}`);
              }
            } catch (err) {
              console.error('Failed to save automation config:', err);
              setError(`Error saving settings: ${err.message}`);
            } finally {
              setSavingAutomationConfig(false);
            }
          };

          const testAutomation = async () => {
            setTestingAutomation(true);
            setTestResult(null);
            try {
              const response = await fetch(`${API_BASE}/automigrate/test`, {
                method: 'POST'
              });
              const result = await response.json();
              setTestResult(result);
            } catch (err) {
              setTestResult({ success: false, error: err.message });
            } finally {
              setTestingAutomation(false);
            }
          };

          const runAutomationNow = async () => {
            setRunningAutomation(true);
            setRunNowMessage(null);
            try {
              const response = await fetch(`${API_BASE}/automigrate/run`, {
                method: 'POST'
              });
              const result = await response.json();

              if (result.success) {
                // Check if backend returned migration info directly (new approach - more reliable)
                if (result.migration_info) {
                  const migration = result.migration_info;
                  setRunNowMessage({
                    type: 'success',
                    text: `Migration started: ${migration.name} (${migration.vmid}) from ${migration.source_node} to ${migration.target_node}`
                  });

                  // Update automation status in background
                  setTimeout(() => fetchAutomationStatus(), 2000);
                } else {
                  // Fallback: Wait and check status for migrations (old approach for compatibility)
                  setRunNowMessage({ type: 'info', text: 'Automation check running... checking for recommendations and filtering rules.' });

                  // Capture start time before waiting
                  const runStartTime = new Date();

                  // Wait for automation to complete (typically 5-10 seconds)
                  await new Promise(resolve => setTimeout(resolve, 10000));

                  // Fetch latest migration data directly (not using state)
                  const statusResponse = await fetch(`${API_BASE}/automigrate/status`);
                  const statusData = await statusResponse.json();

                  // Also update the state for the UI
                  await fetchAutomationStatus();

                  // Check if any new migrations were started (using fresh data, not state)
                  const newMigrations = statusData.recent_migrations?.[0];
                  const recentTimestamp = newMigrations ? new Date(newMigrations.timestamp) : null;

                  // Check if migration started AFTER we clicked Run Now (within last 30 seconds for safety)
                  const wasJustStarted = recentTimestamp && (recentTimestamp >= runStartTime) && (new Date() - recentTimestamp) < 30000;

                  if (wasJustStarted) {
                    setRunNowMessage({
                      type: 'success',
                      text: `Migration started: ${newMigrations.name} (${newMigrations.vmid}) from ${newMigrations.source_node} to ${newMigrations.target_node}`
                    });
                  } else {
                    // Check if there are in-progress migrations (might have been started before we clicked)
                    const hasInProgressMigrations = statusData.in_progress_migrations && statusData.in_progress_migrations.length > 0;

                    if (hasInProgressMigrations) {
                      const migration = statusData.in_progress_migrations[0];
                      setRunNowMessage({
                        type: 'info',
                        text: `Migration already in progress: ${migration.name} (${migration.vmid})`
                      });
                    } else {
                      // Check for filter reasons
                      const filterReasons = statusData.filter_reasons || [];
                      let messageText = 'Automation completed. No migrations were started';

                      if (filterReasons.length > 0) {
                        messageText += ':\n' + filterReasons.map(r => `  • ${r}`).join('\n');
                      } else {
                        messageText += ' (cluster is balanced or no recommendations available).';
                      }

                      setRunNowMessage({
                        type: 'info',
                        text: messageText
                      });
                    }
                  }
                }

                // Clear message after 30 seconds
                setTimeout(() => setRunNowMessage(null), 30000);
              } else {
                setRunNowMessage({ type: 'error', text: `Failed to start automation: ${result.error}` });
                setTimeout(() => setRunNowMessage(null), 30000);
              }
            } catch (err) {
              setRunNowMessage({ type: 'error', text: `Error: ${err.message}` });
              setTimeout(() => setRunNowMessage(null), 30000);
              console.error('Failed to run automation:', err);
            } finally {
              setRunningAutomation(false);
            }
          };

          const savePenaltyConfig = async () => {
            setSavingPenaltyConfig(true);
            setPenaltyConfigSaved(false);
            try {
              const response = await fetch(`${API_BASE}/penalty-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({config: penaltyConfig})
              });
              const result = await response.json();
              if (result.success) {
                setPenaltyConfig(result.config);
                setPenaltyConfigSaved(true);
                // Clear success message after 3 seconds
                setTimeout(() => setPenaltyConfigSaved(false), 3000);
              } else {
                setError(`Failed to save penalty config: ${result.error}`);
              }
            } catch (err) {
              console.error('Failed to save penalty config:', err);
              setError(`Error saving penalty config: ${err.message}`);
            } finally {
              setSavingPenaltyConfig(false);
            }
          };

          const resetPenaltyConfig = async () => {
            setSavingPenaltyConfig(true);
            try {
              const response = await fetch(`${API_BASE}/penalty-config/reset`, {
                method: 'POST'
              });
              const result = await response.json();
              if (result.success) {
                setPenaltyConfig(result.config);
              } else {
                setError(`Failed to reset penalty config: ${result.error}`);
              }
            } catch (err) {
              console.error('Failed to reset penalty config:', err);
              setError(`Error resetting penalty config: ${err.message}`);
            } finally {
              setSavingPenaltyConfig(false);
            }
          };

          const handleUpdate = async () => {
            setUpdating(true);
            setUpdateLog([]);
            setShowUpdateModal(true);

            try {
              const response = await fetch(`${API_BASE}/system/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const result = await response.json();

              if (result.success) {
                setUpdateLog(result.log || []);
                if (result.updated) {
                  // Refresh system info after update
                  setTimeout(() => {
                    fetchSystemInfo();
                    // Reload page to get new code
                    setTimeout(() => window.location.reload(), 2000);
                  }, 1000);
                }
              } else {
                setUpdateLog([...(result.log || []), `Error: ${result.error}`]);
              }
            } catch (err) {
              setUpdateLog(prev => [...prev, `Error: ${err.message}`]);
            }

            setUpdating(false);
          };

          const fetchBranches = async () => {
            setLoadingBranches(true);
            try {
              const response = await fetch(`${API_BASE}/system/branches`);
              const result = await response.json();
              if (result.success) {
                setAvailableBranches(result.branches || []);
              } else {
                console.error('Failed to fetch branches:', result.error);
              }
            } catch (err) {
              console.error('Error fetching branches:', err);
            }
            setLoadingBranches(false);
          };

          const switchBranch = async (branchName) => {
            setSwitchingBranch(true);
            try {
              const response = await fetch(`${API_BASE}/system/switch-branch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ branch: branchName })
              });
              const result = await response.json();

              if (result.success) {
                setShowBranchModal(false);
                await fetchSystemInfo();
                // Page will reload automatically to apply branch changes
                setTimeout(() => window.location.reload(), 1000);
              } else {
                setError(`Failed to switch branch: ${result.error}`);
              }
            } catch (err) {
              setError(`Error switching branch: ${err.message}`);
            }
            setSwitchingBranch(false);
          };

          const cancelMigration = async (vmid, targetNode) => {
            const key = `${vmid}-${targetNode}`;
            const migration = activeMigrations[key];

            if (!migration) {
              setError('Migration info not found');
              return;
            }

            // Set up modal with migration data formatted for the modal
            setCancelMigrationModal({
              name: migration.name || `${migration.type} ${vmid}`,
              vmid: vmid,
              type: migration.type,
              source_node: migration.sourceNode,
              target_node: targetNode,
              task_id: migration.taskId,
              // Use legacy cancel handler for manual migrations
              onConfirm: async () => {
                try {
                  const response = await fetch(`${API_BASE}/tasks/${migration.sourceNode}/${migration.taskId}/stop`, {
                    method: 'POST'
                  });

                  const result = await response.json();

                  if (result.success) {
                    // Remove from active migrations
                    setActiveMigrations(prev => {
                      const newMigrations = { ...prev };
                      delete newMigrations[key];
                      return newMigrations;
                    });

                    // Update status
                    setMigrationStatus(prev => ({ ...prev, [key]: 'cancelled' }));

                    // Refresh guest location
                    const locationResponse = await fetch(`${API_BASE}/guests/${vmid}/location`);
                    const locationResult = await locationResponse.json();

                    if (locationResult.success && data) {
                      setData({
                        ...data,
                        guests: {
                          ...data.guests,
                          [vmid]: {
                            ...data.guests[vmid],
                            node: locationResult.node,
                            status: locationResult.status
                          }
                        }
                      });
                    }

                    // Clear cancelled status after 5 seconds
                    setTimeout(() => {
                      setMigrationStatus(prev => {
                        const newStatus = { ...prev };
                        delete newStatus[key];
                        return newStatus;
                      });
                    }, 5000);

                    // Close modal
                    setCancelMigrationModal(null);
                  } else {
                    setError(`Failed to cancel migration: ${result.error}`);
                  }
                } catch (error) {
                  setError(`Error cancelling migration: ${error.message}`);
                }
              }
            });
          };

          const trackMigration = async (vmid, sourceNode, targetNode, taskId, guestType) => {
            const key = `${vmid}-${targetNode}`;

            // console.log(`[trackMigration] Starting tracking for VMID ${vmid} from ${sourceNode} to ${targetNode}, taskId: ${taskId}`);

            // Store migration info for cancellation
            setActiveMigrations(prev => ({
              ...prev,
              [key]: { vmid, sourceNode, targetNode, taskId, type: guestType }
            }));

            // Immediately mark guest as migrating
            setGuestsMigrating(prev => ({ ...prev, [vmid]: true }));

            // Poll migration status every 3 seconds using Proxmox cluster tasks API
            const pollInterval = setInterval(async () => {
              try {
                // Check if migration is still active via cluster tasks
                const migrationStatusResponse = await fetch(`${API_BASE}/guests/${vmid}/migration-status`);
                const migrationStatus = await migrationStatusResponse.json();

                // Also get task progress information
                const taskStatusResponse = await fetch(`${API_BASE}/tasks/${sourceNode}/${taskId}`);
                const taskStatus = await taskStatusResponse.json();

                // console.log(`[trackMigration] Task status for VMID ${vmid}:`, taskStatus);

                // Update progress if available
                if (taskStatus.success && taskStatus.progress) {
                  // console.log(`[trackMigration] Progress data for VMID ${vmid}:`, taskStatus.progress);
                  setMigrationProgress(prev => ({
                    ...prev,
                    [vmid]: taskStatus.progress
                  }));
                } else {
                  // console.log(`[trackMigration] No progress data for VMID ${vmid}`);
                }

                if (migrationStatus.success) {
                  // Update guestsMigrating state
                  setGuestsMigrating(prev => ({ ...prev, [vmid]: migrationStatus.is_migrating }));

                  // If migration is no longer active, check if it completed or was canceled/failed
                  if (!migrationStatus.is_migrating) {
                    clearInterval(pollInterval);

                    // Clear progress for this guest
                    setMigrationProgress(prev => {
                      const updated = { ...prev };
                      delete updated[vmid];
                      return updated;
                    });

                    // Check task exit status to determine if migration succeeded or failed
                    const wasCanceled = taskStatus.status === 'stopped' &&
                                      (taskStatus.exitstatus === 'unexpected status' ||
                                       taskStatus.exitstatus === 'migration aborted');

                    if (wasCanceled) {
                      // console.log(`[trackMigration] Migration canceled for VMID ${vmid}`);
                      setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));

                      // Remove from active migrations
                      setActiveMigrations(prev => {
                        const newMigrations = { ...prev };
                        delete newMigrations[key];
                        return newMigrations;
                      });

                      // Clear guestsMigrating
                      setGuestsMigrating(prev => {
                        const updated = { ...prev };
                        delete updated[vmid];
                        return updated;
                      });

                      return; // Don't proceed with completion logic
                    }

                    // Migration completed successfully - fetch new location
                    const locationResponse = await fetch(`${API_BASE}/guests/${vmid}/location`);
                    const locationResult = await locationResponse.json();

                    if (locationResult.success && data) {
                      // console.log(`[trackMigration] Migration completed successfully for VMID ${vmid}. New location: ${locationResult.node}`);

                      // Update guest location in state - need to update BOTH guests object and nodes array
                      setData(prevData => {
                        if (!prevData) return prevData;

                        const guest = prevData.guests[vmid];
                        const oldNode = guest.node;
                        const newNode = locationResult.node;

                        // Clone the data structure
                        const newData = { ...prevData };

                        // Update guest location
                        newData.guests = {
                          ...prevData.guests,
                          [vmid]: {
                            ...guest,
                            node: newNode,
                            status: locationResult.status
                          }
                        };

                        // Update node guest lists (remove from old node, add to new node)
                        newData.nodes = { ...prevData.nodes };

                        if (newData.nodes[oldNode]) {
                          newData.nodes[oldNode] = {
                            ...newData.nodes[oldNode],
                            guests: (newData.nodes[oldNode].guests || []).filter(gid => gid !== vmid)
                          };
                        }

                        if (newData.nodes[newNode]) {
                          newData.nodes[newNode] = {
                            ...newData.nodes[newNode],
                            guests: [...(newData.nodes[newNode].guests || []), vmid]
                          };
                        }

                        // console.log(`[trackMigration] Updated cluster map: removed ${vmid} from ${oldNode}, added to ${newNode}`);
                        return newData;
                      });

                      // Mark as completed with new location (don't remove from list, grey it out instead)
                      // console.log(`[trackMigration] Marking VMID ${vmid} as completed in completedMigrations state`);
                      setCompletedMigrations(prev => {
                        const updated = {
                          ...prev,
                          [vmid]: {
                            targetNode: targetNode,
                            newNode: locationResult.node,
                            timestamp: Date.now()
                          }
                        };
                        // console.log('[trackMigration] New completedMigrations state:', updated);
                        return updated;
                      });

                      // Set migration status to success
                      setMigrationStatus(prev => ({ ...prev, [key]: 'success' }));

                      // Remove from active migrations
                      setActiveMigrations(prev => {
                        const newMigrations = { ...prev };
                        delete newMigrations[key];
                        return newMigrations;
                      });

                      setMigrationStatus(prev => ({ ...prev, [key]: 'success' }));

                      // Clear success status after 5 seconds
                      setTimeout(() => {
                        setMigrationStatus(prev => {
                          const newStatus = { ...prev };
                          delete newStatus[key];
                          return newStatus;
                        });
                      }, 5000);

                      // Trigger a fast refresh of cluster data to ensure Cluster Map is up-to-date
                      // console.log(`[trackMigration] Triggering fast cluster refresh after migration`);
                      fetchGuestLocations();
                    }
                  }
                }
              } catch (err) {
                console.error('Error polling migration task:', err);
              }
            }, 3000);

            // Stop polling after 5 minutes (failsafe)
            setTimeout(() => clearInterval(pollInterval), 300000);
          };

          const executeMigration = async (rec) => {
            const key = `${rec.vmid}-${rec.target_node}`;
            // console.log(`[executeMigration] Starting migration for VMID ${rec.vmid} from ${rec.source_node} to ${rec.target_node}`);
            setMigrationStatus(prev => ({ ...prev, [key]: 'running' }));

            try {
              const response = await fetch(`${API_BASE}/migrate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  source_node: rec.source_node,
                  vmid: rec.vmid,
                  target_node: rec.target_node,
                  type: rec.type
                })
              });

              const result = await response.json();
              // console.log(`[executeMigration] API response for VMID ${rec.vmid}:`, result);

              if (result.success) {
                // console.log(`[executeMigration] Migration started successfully, calling trackMigration with taskId: ${result.task_id}`);
                // Start tracking migration (stores in activeMigrations state)
                // Note: We don't clear migrationStatus here - the button logic will prioritize activeMigrations
                trackMigration(rec.vmid, result.source_node, result.target_node, result.task_id, rec.type);
              } else {
                console.error(`[executeMigration] Migration failed for VMID ${rec.vmid}:`, result.error);
                setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
              }
            } catch (err) {
              console.error(`[executeMigration] Exception for VMID ${rec.vmid}:`, err);
              setMigrationStatus(prev => ({ ...prev, [key]: 'failed' }));
            }
          };


          const checkAffinityViolations = () => {
            if (!data) return [];
            const violations = [];

            Object.values(data.nodes).forEach(node => {
              const guestsOnNode = node.guests.map(gid => data.guests[gid]);

              guestsOnNode.forEach(guest => {
                if (guest.tags.exclude_groups.length > 0) {
                  guest.tags.exclude_groups.forEach(excludeTag => {
                    const conflicts = guestsOnNode.filter(other =>
                      other.vmid !== guest.vmid &&
                      other.tags.all_tags.includes(excludeTag)
                    );

                    if (conflicts.length > 0) {
                      violations.push({
                        guest: guest,
                        node: node.name,
                        excludeTag: excludeTag,
                        conflicts: conflicts
                      });
                    }
                  });
                }
              });
            });

            return violations;
          };

          // Memoized sparkline generator - generates smooth wave patterns for metrics
          const generateSparkline = useMemo(() => {
            return (value, maxValue, samples = 40, frequency = 0.3) => {
              const points = [];
              for (let i = 0; i < samples; i++) {
                const variation = (Math.sin(i * frequency) * value * 0.3) + (Math.random() * value * 0.2);
                const adjustedValue = Math.max(0, value + variation);
                const x = (i / (samples - 1)) * 100;
                const y = 100 - ((adjustedValue / maxValue) * 100);
                points.push(`${x},${y}`);
              }
              return points.join(' ');
            };
          }, []); // Empty deps - only create once

          // Lazy load Chart.js library - only when Node Status section is expanded
          const loadChartJs = async () => {
            if (chartJsLoaded || chartJsLoading) return;

            setChartJsLoading(true);
            try {
              // Load Chart.js
              await new Promise((resolve, reject) => {
                const script1 = document.createElement('script');
                script1.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
                script1.onload = resolve;
                script1.onerror = reject;
                document.head.appendChild(script1);
              });

              // Load annotation plugin
              await new Promise((resolve, reject) => {
                const script2 = document.createElement('script');
                script2.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js';
                script2.onload = resolve;
                script2.onerror = reject;
                document.head.appendChild(script2);
              });

              setChartJsLoaded(true);
            } catch (error) {
              console.error('Failed to load Chart.js:', error);
            } finally {
              setChartJsLoading(false);
            }
          };

          const handleAddTag = async () => {
            if (!newTag.trim()) {
              setError('Please enter a tag name');
              return;
            }

            if (newTag.includes(';') || newTag.includes(' ')) {
              setError('Tag cannot contain spaces or semicolons');
              return;
            }

            try {
              const vmid = tagModalGuest.vmid;

              const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tag: newTag.trim() })
              });

              const result = await response.json();

              if (result.success) {
                setShowTagModal(false);
                setNewTag('');
                setTagModalGuest(null);

                // Fast refresh - just update this guest's tags
                const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                  method: 'POST'
                });
                const refreshResult = await refreshResponse.json();

                if (refreshResult.success && data) {
                  // Update just this guest in the data state
                  setData({
                    ...data,
                    guests: {
                      ...data.guests,
                      [vmid]: {
                        ...data.guests[vmid],
                        tags: refreshResult.tags
                      }
                    }
                  });
                }
              } else {
                setError(`Error: ${result.error}`);
              }
            } catch (error) {
              setError(`Error adding tag: ${error.message}`);
            }
          };

          const handleRemoveTag = async (guest, tag) => {
            setConfirmRemoveTag({ guest, tag });
          };

          const confirmAndRemoveTag = async () => {
            if (!confirmRemoveTag) return;

            const { guest, tag } = confirmRemoveTag;
            setConfirmRemoveTag(null);

            try {
              const vmid = guest.vmid;

              const response = await fetch(`${API_BASE}/guests/${vmid}/tags/${tag}`, {
                method: 'DELETE'
              });

              const result = await response.json();

              if (result.success) {
                // Fast refresh - just update this guest's tags
                const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                  method: 'POST'
                });
                const refreshResult = await refreshResponse.json();

                if (refreshResult.success && data) {
                  // Update just this guest in the data state
                  setData({
                    ...data,
                    guests: {
                      ...data.guests,
                      [vmid]: {
                        ...data.guests[vmid],
                        tags: refreshResult.tags
                      }
                    }
                  });
                }
              } else {
                setError(`Error: ${result.error}`);
              }
            } catch (error) {
              setError(`Error removing tag: ${error.message}`);
            }
          };

          const confirmAndChangeHost = async () => {
            if (!confirmHostChange) return;

            const newHost = confirmHostChange;
            setConfirmHostChange(null);

            try {
              const response = await fetch(`${API_BASE}/system/change-host`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ host: newHost })
              });

              const result = await response.json();

              if (result.success) {
                fetchConfig();
                document.getElementById('proxmoxHostInput').value = newHost;
              } else {
                setError('Failed to update host: ' + (result.error || 'Unknown error'));
              }
            } catch (error) {
              setError('Error: ' + error.message);
            }
          };

          const confirmAndMigrate = async () => {
            if (!confirmMigration) return;

            const rec = confirmMigration;
            setConfirmMigration(null);

            // Call the existing executeMigration function
            await executeMigration(rec);
          };

          useEffect(() => { fetchAnalysis(); }, []);
          useEffect(() => {
            const interval = setInterval(() => {
              fetchAnalysis();
            }, autoRefreshInterval);
            return () => clearInterval(interval);
          }, [autoRefreshInterval]);

          // Lazy load Chart.js when Node Status section is expanded
          useEffect(() => {
            if (!collapsedSections.nodeStatus && !chartJsLoaded) {
              loadChartJs();
            }
          }, [collapsedSections.nodeStatus]);

          // Auto-fetch recommendations and threshold calculations when data or thresholds change
          useEffect(() => {
            if (data && !loadingRecommendations) {
              fetchRecommendations();
              fetchNodeScores();
            }
          }, [data, cpuThreshold, memThreshold, iowaitThreshold, maintenanceNodes]);

          // Auto-refresh recommendations on fixed 2-minute interval
          useEffect(() => {
            if (!data) return;

            const interval = setInterval(() => {
              fetchRecommendations();
            }, RECOMMENDATIONS_REFRESH_INTERVAL);

            return () => clearInterval(interval);
          }, [data]);

          // Render charts when data changes or chart period changes
          useEffect(() => {
            if (!data || !data.nodes) return;
            // Skip chart initialization when node status section is collapsed or Chart.js not loaded yet
            if (collapsedSections.nodeStatus) return;
            if (!chartJsLoaded || typeof Chart === 'undefined') {
              return;
            }

            // Destroy old charts
            Object.values(charts).forEach(chart => {
              try {
                chart.destroy();
              } catch (e) {
                console.error('Error destroying chart:', e);
              }
            });
            const newCharts = {};

            Object.values(data.nodes).forEach(node => {
              if (!node.trend_data || typeof node.trend_data !== 'object') {
                return;
              }

              const canvas = document.getElementById(`chart-${node.name}`);
              if (!canvas) {
                // Canvas not in DOM yet - will be created when node status is expanded
                return;
              }

              // Select appropriate timeframe data based on chart period
              // Automatically use the best RRD resolution for the selected time range
              let sourceTimeframe = 'day'; // default
              const periodSeconds = {
                '1h': 3600,
                '6h': 6 * 3600,
                '12h': 12 * 3600,
                '24h': 24 * 3600,
                '7d': 7 * 24 * 3600,
                '30d': 30 * 24 * 3600,
                '1y': 365 * 24 * 3600
              }[chartPeriod] || 24 * 3600;

              // Select optimal timeframe based on period
              // Use higher resolution sources when available for better granularity
              if (chartPeriod === '1h') {
                sourceTimeframe = 'hour';  // 1-min resolution, ~60 points
              } else if (chartPeriod === '6h' || chartPeriod === '12h' || chartPeriod === '24h') {
                sourceTimeframe = 'day';   // 1-min resolution, ~1440 points
              } else if (chartPeriod === '7d') {
                sourceTimeframe = 'week';  // 5-min resolution, best available for 7 days
              } else if (chartPeriod === '30d') {
                sourceTimeframe = 'month'; // 30-min resolution, ~2000 points
              } else if (chartPeriod === '1y') {
                sourceTimeframe = 'year';  // 6-hour resolution, ~2000 points
              }

              // Get trend data from the appropriate timeframe
              const trendData = node.trend_data?.[sourceTimeframe] || node.trend_data?.day || [];

              if (!trendData || trendData.length === 0) {
                // console.log(`No trend data available for ${node.name} (timeframe: ${sourceTimeframe})`);
                return;
              }

              // Filter data based on chart period
              const now = Math.floor(Date.now() / 1000);
              const filteredData = trendData.filter(point =>
                (now - point.time) <= periodSeconds
              );

              if (filteredData.length === 0) {
                return;
              }

              // Reduce data points for performance (adaptive sampling)
              const sampleRate = {
                '1h': 2,    // ~30 points
                '6h': 5,    // ~72 points
                '12h': 10,  // ~72 points
                '24h': 20,  // ~72 points
                '7d': 20,   // ~84 points
                '30d': 25,  // ~80 points
                '1y': 25    // ~80 points
              }[chartPeriod] || 1;

              // Always keep first and last points for accurate range display
              const sampledData = filteredData.filter((point, index, arr) =>
                index === 0 || index === arr.length - 1 || index % sampleRate === 0
              );

              const ctx = canvas.getContext('2d');
              const isDark = darkMode;

              try {
                newCharts[node.name] = new Chart(ctx, {
                type: 'line',
                data: {
                  labels: sampledData.map(point => {
                    const date = new Date(point.time * 1000);
                    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  }),
                  datasets: [
                    {
                      label: 'CPU %',
                      data: sampledData.map(point => point.cpu),
                      borderColor: 'rgb(59, 130, 246)',
                      backgroundColor: 'rgba(59, 130, 246, 0.1)',
                      tension: 0.4,
                      fill: true
                    },
                    {
                      label: 'Memory %',
                      data: sampledData.map(point => point.mem),
                      borderColor: 'rgb(16, 185, 129)',
                      backgroundColor: 'rgba(16, 185, 129, 0.1)',
                      tension: 0.4,
                      fill: true
                    },
                    {
                      label: 'IOWait %',
                      data: sampledData.map(point => point.iowait || 0),
                      borderColor: 'rgb(245, 158, 11)',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      tension: 0.4,
                      fill: true
                    }
                  ]
                },
                options: {
                  responsive: true,
                  maintainAspectRatio: false,
                  interaction: {
                    mode: 'index',
                    intersect: false,
                  },
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
                      labels: {
                        color: isDark ? '#9ca3af' : '#4b5563',
                        font: { size: 11 }
                      }
                    },
                    tooltip: {
                      backgroundColor: isDark ? '#1f2937' : '#ffffff',
                      titleColor: isDark ? '#f3f4f6' : '#111827',
                      bodyColor: isDark ? '#d1d5db' : '#374151',
                      borderColor: isDark ? '#374151' : '#e5e7eb',
                      borderWidth: 1
                    },
                    annotation: {
                      annotations: nodeScores && nodeScores[node.name] ? {
                        scoreLine: {
                          type: 'line',
                          yMin: nodeScores[node.name].suitability_rating,
                          yMax: nodeScores[node.name].suitability_rating,
                          borderColor: (() => {
                            const rating = nodeScores[node.name].suitability_rating;
                            if (rating >= 70) return 'rgba(34, 197, 94, 0.7)'; // Green
                            if (rating >= 50) return 'rgba(234, 179, 8, 0.7)'; // Yellow
                            if (rating >= 30) return 'rgba(249, 115, 22, 0.7)'; // Orange
                            return 'rgba(239, 68, 68, 0.7)'; // Red
                          })(),
                          borderWidth: 3,
                          borderDash: [5, 5],
                          label: {
                            display: true,
                            content: `Suitability: ${nodeScores[node.name].suitability_rating}%`,
                            position: 'start',
                            backgroundColor: (() => {
                              const rating = nodeScores[node.name].suitability_rating;
                              if (rating >= 70) return isDark ? 'rgba(34, 197, 94, 0.9)' : 'rgba(34, 197, 94, 0.9)'; // Green
                              if (rating >= 50) return isDark ? 'rgba(234, 179, 8, 0.9)' : 'rgba(234, 179, 8, 0.9)'; // Yellow
                              if (rating >= 30) return isDark ? 'rgba(249, 115, 22, 0.9)' : 'rgba(249, 115, 22, 0.9)'; // Orange
                              return isDark ? 'rgba(239, 68, 68, 0.9)' : 'rgba(239, 68, 68, 0.9)'; // Red
                            })(),
                            color: '#ffffff',
                            font: { size: 11, weight: 'bold' },
                            padding: 4
                          }
                        }
                      } : {}
                    }
                  },
                  scales: {
                    x: {
                      display: true,
                      grid: {
                        color: isDark ? '#374151' : '#e5e7eb'
                      },
                      ticks: {
                        color: isDark ? '#9ca3af' : '#6b7280',
                        maxTicksLimit: 8,
                        font: { size: 10 }
                      }
                    },
                    y: {
                      display: true,
                      min: 0,
                      max: 100,
                      grid: {
                        color: isDark ? '#374151' : '#e5e7eb'
                      },
                      ticks: {
                        color: isDark ? '#9ca3af' : '#6b7280',
                        font: { size: 10 },
                        callback: function(value) {
                          return value + '%';
                        }
                      }
                    }
                  }
                }
              });
              } catch (error) {
                console.error(`Error creating chart for node ${node.name}:`, error);
              }
            });

            setCharts(newCharts);

            // Cleanup on unmount
            return () => {
              Object.values(newCharts).forEach(chart => chart.destroy());
            };
          }, [data, chartPeriod, darkMode, collapsedSections.nodeStatus, cpuThreshold, memThreshold, currentPage, chartJsLoaded]);

          if (error) {
            return (
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-8">
                <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
                  <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                    <AlertCircle size={24} />
                    <div>
                      <h3 className="text-lg font-semibold">Error</h3>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                  <button onClick={handleRefresh} className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600">Retry</button>
                </div>
              </div>
            );
          }

          if (!data) {
            return (
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
                <div className="max-w-7xl mx-auto">
                  {/* Header Skeleton */}
                  <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                      <div className="skeleton h-10 w-10 rounded-full"></div>
                      <div className="skeleton h-8 w-48"></div>
                    </div>
                    <div className="skeleton h-10 w-32"></div>
                  </div>

                  {/* Dashboard Grid Skeleton */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                    <SkeletonClusterMap />
                    <div className="space-y-6">
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
                  </div>

                  {/* Node Cards Skeleton */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <SkeletonNodeCard />
                    <SkeletonNodeCard />
                    <SkeletonNodeCard />
                  </div>
                </div>
              </div>
            );
          }

          const ignoredGuests = Object.values(data.guests).filter(g => g.tags.has_ignore);
          const excludeGuests = Object.values(data.guests).filter(g => g.tags.exclude_groups.length > 0);
          const violations = checkAffinityViolations();

          // Settings Page
          if (currentPage === 'settings') {
            return (
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="max-w-5xl mx-auto p-4">
                  {/* Settings Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setCurrentPage('dashboard')}
                          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          title="Back to Dashboard"
                        >
                          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                        </button>
                        <div className="flex items-center gap-3">
                          <Settings size={28} className="text-blue-600 dark:text-blue-400" />
                          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
                        </div>
                      </div>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      >
                        {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-700" />}
                      </button>
                    </div>
                  </div>

                  {/* Settings Content */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-8">

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        AI-Powered Recommendations
                      </label>
                      <div className="flex items-center mb-4">
                        <input
                          type="checkbox"
                          checked={aiEnabled}
                          onChange={(e) => setAiEnabled(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                          Enable AI-Enhanced Migration Recommendations
                        </label>
                      </div>
                    </div>

                    {aiEnabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            AI Provider
                          </label>
                          <select
                            value={aiProvider}
                            onChange={(e) => setAiProvider(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="none">None</option>
                            <option value="openai">OpenAI (GPT-4)</option>
                            <option value="anthropic">Anthropic (Claude)</option>
                            <option value="local">Local LLM (Ollama)</option>
                          </select>
                        </div>

                        {aiProvider === 'openai' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">OpenAI Configuration</h4>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={openaiKey}
                                onChange={(e) => setOpenaiKey(e.target.value)}
                                placeholder="sk-..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Model
                              </label>
                              <input
                                type="text"
                                value={openaiModel}
                                onChange={(e) => setOpenaiModel(e.target.value)}
                                placeholder="gpt-4o"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                See available models at <a href="https://platform.openai.com/docs/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">OpenAI Models</a>
                              </p>
                            </div>
                          </div>
                        )}

                        {aiProvider === 'anthropic' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Anthropic Configuration</h4>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                API Key
                              </label>
                              <input
                                type="password"
                                value={anthropicKey}
                                onChange={(e) => setAnthropicKey(e.target.value)}
                                placeholder="sk-ant-..."
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Model
                              </label>
                              <input
                                type="text"
                                value={anthropicModel}
                                onChange={(e) => setAnthropicModel(e.target.value)}
                                placeholder="claude-3-5-sonnet-20241022"
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                See available models at <a href="https://docs.anthropic.com/en/docs/about-claude/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Anthropic Models</a>
                              </p>
                            </div>
                          </div>
                        )}

                        {aiProvider === 'local' && (
                          <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Local LLM (Ollama) Configuration</h4>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Ollama Base URL
                              </label>
                              <input
                                type="text"
                                value={localUrl}
                                onChange={(e) => setLocalUrl(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                placeholder="http://localhost:11434"
                              />
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">The URL where Ollama is running</p>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                  Model
                                </label>
                                <button
                                  onClick={async () => {
                                    setLocalLoadingModels(true);
                                    try {
                                      const response = await fetch('/api/ai-models', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                          provider: 'local',
                                          base_url: localUrl
                                        })
                                      });
                                      const data = await response.json();
                                      if (data.success) {
                                        setLocalAvailableModels(data.models || []);
                                      } else {
                                        setError('Failed to fetch models: ' + (data.error || 'Unknown error'));
                                      }
                                    } catch (error) {
                                      setError('Error fetching models: ' + error.message);
                                    } finally {
                                      setLocalLoadingModels(false);
                                    }
                                  }}
                                  disabled={localLoadingModels}
                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400"
                                >
                                  <RefreshCw size={12} className={localLoadingModels ? 'animate-spin' : ''} />
                                  {localLoadingModels ? 'Loading...' : 'Refresh Models'}
                                </button>
                              </div>
                              {localAvailableModels.length > 0 ? (
                                <select
                                  value={localModel}
                                  onChange={(e) => setLocalModel(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  {localAvailableModels.map(model => (
                                    <option key={model} value={model}>{model}</option>
                                  ))}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={localModel}
                                  onChange={(e) => setLocalModel(e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                  placeholder="llama3.1:8b"
                                />
                              )}
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Ollama model to use for recommendations</p>
                            </div>
                            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                              <p className="text-sm text-blue-900 dark:text-blue-200">
                                <strong>Note:</strong> Ensure Ollama is installed and running. Visit <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer" className="underline">ollama.ai</a> for installation instructions.
                              </p>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    <hr className="border-gray-300 dark:border-gray-600" />

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Data Collection & Performance</h3>

                      {/* Last Collection Status */}
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Status</h4>
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                          {backendCollected && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Server size={16} className="text-green-600 dark:text-green-400" />
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Last collected: <span className="font-semibold text-green-600 dark:text-green-400">{formatLocalTime(backendCollected)} {getTimezoneAbbr()}</span>
                                </span>
                              </div>
                              <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Refresh data collection now"
                              >
                                <RefreshCw size={14} className={`${loading ? 'animate-spin' : ''} text-gray-600 dark:text-gray-400`} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                    {/* Collection Performance Stats */}
                    {data?.performance && (
                      <div className="mb-6">
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Performance Metrics</h4>
                        <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Time</div>
                              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{data.performance.total_time}s</div>
                            </div>
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Node Processing</div>
                              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.performance.node_processing_time}s</div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{data.performance.parallel_enabled ? 'Parallel' : 'Sequential'}</div>
                            </div>
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Guest Processing</div>
                              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.performance.guest_processing_time}s</div>
                            </div>
                            <div className="bg-white/50 dark:bg-gray-800/50 rounded p-3">
                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Workers Used</div>
                              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{data.performance.max_workers}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{data.performance.node_count} nodes, {data.performance.guest_count} guests</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                      {/* Collection Optimization Settings */}
                      <div>
                        <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-3">Optimization Settings</h4>
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
                            <p className="text-sm text-blue-900 dark:text-blue-200">
                              <strong>Collection Performance:</strong> Optimize data collection speed based on cluster size. Parallel collection can reduce collection time by 3-5x.
                            </p>
                          </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Cluster Size Preset
                          </label>
                          <select
                            id="clusterSizePreset"
                            defaultValue={config?.collection_optimization?.cluster_size || 'medium'}
                            onChange={(e) => {
                              const presets = {
                                small: { interval: 5, workers: 3, node_tf: 'day', guest_tf: 'hour' },
                                medium: { interval: 15, workers: 5, node_tf: 'day', guest_tf: 'hour' },
                                large: { interval: 30, workers: 8, node_tf: 'hour', guest_tf: 'hour' },
                                custom: {}
                              };
                              const preset = presets[e.target.value];
                              if (preset && e.target.value !== 'custom') {
                                // Update the form fields
                                const intervalInput = document.getElementById('collectionInterval');
                                const workersInput = document.getElementById('maxWorkers');
                                const nodeTimeframeSelect = document.getElementById('nodeTimeframe');
                                const guestTimeframeSelect = document.getElementById('guestTimeframe');

                                if (intervalInput) intervalInput.value = preset.interval;
                                if (workersInput) workersInput.value = preset.workers;
                                if (nodeTimeframeSelect) nodeTimeframeSelect.value = preset.node_tf;
                                if (guestTimeframeSelect) guestTimeframeSelect.value = preset.guest_tf;
                              }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="small">Small (&lt; 30 VMs/CTs) - 5 min intervals</option>
                            <option value="medium">Medium (30-100 VMs/CTs) - 15 min intervals</option>
                            <option value="large">Large (100+ VMs/CTs) - 30 min intervals</option>
                            <option value="custom">Custom</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Collection Interval (minutes)
                          </label>
                          <input
                            type="number"
                            id="collectionInterval"
                            defaultValue={config?.collection_interval_minutes || 15}
                            min="1"
                            max="240"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            How often to collect full cluster metrics
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              id="parallelEnabled"
                              defaultChecked={config?.collection_optimization?.parallel_collection_enabled !== false}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Enable Parallel Collection</span>
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                            Process multiple nodes simultaneously (3-5x faster)
                          </p>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Max Parallel Workers
                          </label>
                          <input
                            type="number"
                            id="maxWorkers"
                            defaultValue={config?.collection_optimization?.max_parallel_workers || 5}
                            min="1"
                            max="10"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Number of nodes to process concurrently
                          </p>
                        </div>

                        <div>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              id="skipStoppedRRD"
                              defaultChecked={config?.collection_optimization?.skip_stopped_guest_rrd !== false}
                              className="rounded border-gray-300 dark:border-gray-600"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Skip RRD for Stopped Guests</span>
                          </label>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                            Don't collect performance metrics for stopped VMs/CTs (faster collection)
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Node RRD Timeframe
                            </label>
                            <select
                              id="nodeTimeframe"
                              defaultValue={config?.collection_optimization?.node_rrd_timeframe || 'day'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="hour">Hour (~60 points)</option>
                              <option value="day">Day (~1440 points)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Guest RRD Timeframe
                            </label>
                            <select
                              id="guestTimeframe"
                              defaultValue={config?.collection_optimization?.guest_rrd_timeframe || 'hour'}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="hour">Hour (~60 points)</option>
                              <option value="day">Day (~1440 points)</option>
                            </select>
                          </div>
                        </div>

                        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 -mx-4 -mb-4 px-4 py-4 mt-4 border-t border-gray-200 dark:border-gray-600">
                          <button
                            onClick={() => {
                              setSavingCollectionSettings(true);
                              setCollectionSettingsSaved(false);

                              const collectionConfig = {
                                collection_interval_minutes: parseInt(document.getElementById('collectionInterval').value),
                                collection_optimization: {
                                  cluster_size: document.getElementById('clusterSizePreset').value,
                                  parallel_collection_enabled: document.getElementById('parallelEnabled').checked,
                                  max_parallel_workers: parseInt(document.getElementById('maxWorkers').value),
                                  skip_stopped_guest_rrd: document.getElementById('skipStoppedRRD').checked,
                                  node_rrd_timeframe: document.getElementById('nodeTimeframe').value,
                                  guest_rrd_timeframe: document.getElementById('guestTimeframe').value
                                }
                              };

                              fetch(`${API_BASE}/settings/collection`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(collectionConfig)
                              })
                              .then(response => response.json())
                              .then(result => {
                                setSavingCollectionSettings(false);
                                if (result.success) {
                                  setCollectionSettingsSaved(true);
                                  setTimeout(() => setCollectionSettingsSaved(false), 3000);
                                  fetchConfig();
                                } else {
                                  setError('Failed to update settings: ' + (result.error || 'Unknown error'));
                                }
                              })
                              .catch(error => {
                                setSavingCollectionSettings(false);
                                setError('Error: ' + error.message);
                              });
                            }}
                            disabled={savingCollectionSettings}
                            className={`w-full px-4 py-2 text-white rounded font-medium flex items-center justify-center gap-2 shadow-lg transition-colors ${
                              collectionSettingsSaved
                                ? 'bg-emerald-500 dark:bg-emerald-600'
                                : savingCollectionSettings
                                  ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                                  : 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
                            }`}
                          >
                            {savingCollectionSettings ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                                Saving...
                              </>
                            ) : collectionSettingsSaved ? (
                              <>
                                <CheckCircle size={16} />
                                Settings Saved!
                              </>
                            ) : (
                              <>
                                <Save size={16} />
                                Apply Collection Settings
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Notifications - Coming Soon */}
                    <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30 opacity-60 cursor-not-allowed">
                      {/* Coming Soon Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow">
                          COMING SOON
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <Bell className="text-gray-600 dark:text-gray-400" size={24} />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Notifications</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about migrations, maintenance events, and cluster alerts</p>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        {/* Email Notifications */}
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700 dark:text-gray-300">Email Notifications</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Receive email alerts for important events</div>
                          </div>
                          <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                            <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                          </div>
                        </div>

                        {/* Webhook Notifications */}
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700 dark:text-gray-300">Webhook Notifications</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Send notifications to external services (Discord, Slack, etc.)</div>
                          </div>
                          <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                            <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                          </div>
                        </div>

                        {/* Notification Events */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Notification Events</div>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Migration started</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Migration completed</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Migration failed</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Node entered maintenance mode</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>High resource usage alert</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Node offline/online</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Authentication - Coming Soon */}
                    <div className="relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30 opacity-60 cursor-not-allowed">
                      {/* Coming Soon Badge */}
                      <div className="absolute top-4 right-4">
                        <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow">
                          COMING SOON
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-4">
                        <Lock className="text-gray-600 dark:text-gray-400" size={24} />
                        <div>
                          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">Authentication & Access Control</h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">Secure your ProxBalance instance with user authentication and role-based access</p>
                        </div>
                      </div>

                      <div className="space-y-4 mt-6">
                        {/* Enable Authentication */}
                        <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="flex-1">
                            <div className="font-medium text-gray-700 dark:text-gray-300">Enable Authentication</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Require login to access ProxBalance</div>
                          </div>
                          <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                            <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                          </div>
                        </div>

                        {/* Authentication Methods */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">Authentication Methods</div>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Local User Database</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>LDAP/Active Directory</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>OAuth2/OIDC (SSO)</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 rounded"></div>
                              <span>Proxmox VE Authentication</span>
                            </div>
                          </div>
                        </div>

                        {/* User Management */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">User Management</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mb-3">Create and manage user accounts with role-based permissions</div>
                          <div className="flex gap-2">
                            <button disabled className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded text-xs font-medium">
                              Add User
                            </button>
                            <button disabled className="px-3 py-1.5 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded text-xs font-medium">
                              Manage Roles
                            </button>
                          </div>
                        </div>

                        {/* Access Control Roles */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">Role-Based Access Control</div>
                          <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                            <div className="flex items-center justify-between">
                              <span>• Administrator - Full access to all features</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>• Operator - Can execute migrations and maintenance</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span>• Viewer - Read-only access to dashboard</span>
                            </div>
                          </div>
                        </div>

                        {/* Session Settings */}
                        <div className="p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600">
                          <div className="font-medium text-gray-700 dark:text-gray-300 mb-3">Session Settings</div>
                          <div className="space-y-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Session Timeout</span>
                              <span className="text-gray-500 dark:text-gray-400">30 minutes</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Require 2FA</span>
                              <div className="w-12 h-6 bg-gray-300 dark:bg-gray-600 rounded-full relative">
                                <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 left-0.5"></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Penalty Scoring Configuration - Standalone Section */}
                    <div id="penalty-config-section" className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                      <button
                        onClick={() => setShowPenaltyConfig(!showPenaltyConfig)}
                        className="w-full flex items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <Settings size={24} className="text-blue-600 dark:text-blue-400" />
                          <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Penalty Scoring Configuration</h2>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Configure penalty weights used by the scoring algorithm</p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`text-gray-600 dark:text-gray-400 transition-transform ${showPenaltyConfig ? 'rotate-180' : ''}`}
                          size={20}
                        />
                      </button>

                      {showPenaltyConfig && penaltyConfig && penaltyDefaults && (
                        <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded mt-4">
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                            Configure penalty weights used by the scoring algorithm when evaluating migration targets. Lower penalties favor that condition.
                          </p>

                          {/* Time Period Weights */}
                          <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Time Period Weights</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Control how much weight to give to recent vs. historical metrics. Values must sum to 1.0.
                              <br/>Example for 6-hour window: Current=0.6, 24h=0.4, 7d=0.0
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Current Weight (default: {penaltyDefaults.weight_current})
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  value={penaltyConfig.weight_current}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, weight_current: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  24h Weight (default: {penaltyDefaults.weight_24h})
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  value={penaltyConfig.weight_24h}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, weight_24h: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  7d Weight (default: {penaltyDefaults.weight_7d})
                                </label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0"
                                  max="1"
                                  value={penaltyConfig.weight_7d}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, weight_7d: parseFloat(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                            {(() => {
                              const sum = (penaltyConfig.weight_current || 0) + (penaltyConfig.weight_24h || 0) + (penaltyConfig.weight_7d || 0);
                              const isValid = Math.abs(sum - 1.0) < 0.01;
                              return (
                                <div className={`text-sm font-medium ${isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                  Sum: {sum.toFixed(2)} {isValid ? '✓ Valid' : '✗ Must equal 1.0'}
                                </div>
                              );
                            })()}
                          </div>

                          {/* CPU Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">CPU Penalties</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Applied when target node CPU usage is high. Higher values = avoid nodes with high CPU. Set to 0 to disable penalty.
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.cpu_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={penaltyConfig.cpu_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, cpu_high_penalty: parseInt(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Very High (default: {penaltyDefaults.cpu_very_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={penaltyConfig.cpu_very_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, cpu_very_high_penalty: parseInt(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Extreme (default: {penaltyDefaults.cpu_extreme_penalty})
                                </label>
                                <input
                                  type="number"
                                  min="0"
                                  value={penaltyConfig.cpu_extreme_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, cpu_extreme_penalty: parseInt(e.target.value) || 0})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Memory Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">Memory Penalties</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.mem_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.mem_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, mem_high_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Very High (default: {penaltyDefaults.mem_very_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.mem_very_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, mem_very_high_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Extreme (default: {penaltyDefaults.mem_extreme_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.mem_extreme_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, mem_extreme_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                            </div>
                          </div>

                          {/* IOWait Penalties */}
                          <div className="space-y-3">
                            <h4 className="font-medium text-gray-900 dark:text-white">IOWait Penalties</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Moderate (default: {penaltyDefaults.iowait_moderate_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.iowait_moderate_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, iowait_moderate_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  High (default: {penaltyDefaults.iowait_high_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.iowait_high_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, iowait_high_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                  Severe (default: {penaltyDefaults.iowait_severe_penalty})
                                </label>
                                <input
                                  type="number"
                                  value={penaltyConfig.iowait_severe_penalty}
                                  onChange={(e) => setPenaltyConfig({...penaltyConfig, iowait_severe_penalty: parseInt(e.target.value)})}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
              </div>
                            </div>
                          </div>

                          {/* Minimum Score Improvement */}
                          <div className="space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                            <h4 className="font-medium text-gray-900 dark:text-white">Minimum Score Improvement</h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              Minimum score improvement (in points) required for a migration to be recommended. This threshold filters out migrations that would provide only marginal benefit.
                              <br />Lower values = more sensitive to small improvements (more migrations)
                              <br />Higher values = only migrate when there's significant benefit (fewer migrations)
                            </p>
                            <div className="max-w-md">
                              <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                                Minimum Score Improvement (default: {penaltyDefaults.min_score_improvement || 15})
                              </label>
                              <input
                                type="number"
                                min="1"
                                max="100"
                                value={penaltyConfig.min_score_improvement !== undefined ? penaltyConfig.min_score_improvement : 15}
                                onChange={(e) => setPenaltyConfig({...penaltyConfig, min_score_improvement: parseInt(e.target.value) || 15})}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                Recommended values: Conservative (20-30), Balanced (10-15), Aggressive (5-10)
                              </p>
                            </div>
                          </div>

                          {/* Success Message */}
                          {penaltyConfigSaved && (
                            <div className="p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded text-green-800 dark:text-green-300">
                              Penalty configuration saved successfully!
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-4">
                            <button
                              onClick={savePenaltyConfig}
                              disabled={savingPenaltyConfig}
                              className={`flex-1 px-4 py-2 text-white rounded font-medium disabled:opacity-50 transition-colors ${
                                penaltyConfigSaved
                                  ? 'bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600'
                                  : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                              }`}
                            >
                              {savingPenaltyConfig ? 'Saving...' : penaltyConfigSaved ? 'Saved!' : 'Save Penalty Config'}
                            </button>
                            <button
                              onClick={resetPenaltyConfig}
                              disabled={savingPenaltyConfig}
                              className="flex-1 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium disabled:opacity-50"
                            >
                              Reset to Defaults
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Advanced System Settings - Collapsible */}
                    <div className="border-2 border-red-500 dark:border-red-600 rounded-lg p-4 bg-red-50 dark:bg-red-900/20">
                      <button
                        onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                        className="w-full flex items-center justify-between text-left group"
                      >
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="text-red-600 dark:text-red-500" size={24} />
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Advanced System Settings</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Data management, debugging, API configuration, and system controls</p>
                          </div>
                        </div>
                        <ChevronDown
                          className={`text-gray-600 dark:text-gray-400 transition-transform ${showAdvancedSettings ? 'rotate-180' : ''}`}
                          size={20}
                        />
                      </button>

                      {showAdvancedSettings && (
                        <div className="mt-4 space-y-6">
                          <hr className="border-gray-300 dark:border-gray-600" />

                          {/* Data Management */}
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Data Management</h3>
                      <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <button
                          onClick={() => {
                            const dataStr = JSON.stringify(data, null, 2);
                            const blob = new Blob([dataStr], { type: 'application/json' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `proxbalance-data-${new Date().toISOString()}.json`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Export Cluster Data (JSON)
                        </button>
                        <button
                          onClick={() => {
                            if (!data || !data.guests) return;

                            // Create CSV header
                            let csv = 'VMID,Name,Type,Node,Status,CPU Usage (%),Memory Used (GB),Memory Max (GB),CPU Cores\n';

                            // Add data rows
                            Object.values(data.guests).forEach(guest => {
                              csv += `${guest.vmid},"${guest.name}",${guest.type},${guest.node},${guest.status},${guest.cpu_current.toFixed(2)},${guest.mem_used_gb.toFixed(2)},${guest.mem_max_gb.toFixed(2)},${guest.cpu_cores || 0}\n`;
                            });

                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `proxbalance-guests-${new Date().toISOString()}.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          }}
                          className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 font-medium flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          Export Guest List (CSV)
                        </button>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Debug & Logging */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Debug & Logging</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Log Level
                          </label>
                          <select
                            value={logLevel}
                            onChange={(e) => setLogLevel(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="ERROR">ERROR - Only critical errors</option>
                            <option value="WARN">WARN - Warnings and errors</option>
                            <option value="INFO">INFO - General information</option>
                            <option value="DEBUG">DEBUG - Detailed debugging</option>
                          </select>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={verboseLogging}
                            onChange={(e) => setVerboseLogging(e.target.checked)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Enable Verbose Logging (includes API calls and data processing)
                          </label>
                        </div>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              window.open('/api/logs/download?service=proxmox-balance', '_blank');
                            }}
                            className="w-full px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Download API Logs
                          </button>
                          <button
                            onClick={() => {
                              window.open('/api/logs/download?service=proxmox-collector', '_blank');
                            }}
                            className="w-full px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Download Collector Logs
                          </button>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Proxmox API Configuration</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            API Token ID
                          </label>
                          <input
                            type="text"
                            value={proxmoxTokenId}
                            onChange={(e) => setProxmoxTokenId(e.target.value)}
                            placeholder="proxbalance@pam!proxbalance"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Format: user@realm!tokenname (e.g., proxbalance@pam!proxbalance)
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            API Token Secret
                          </label>
                          <input
                            type="password"
                            value={proxmoxTokenSecret}
                            onChange={(e) => setProxmoxTokenSecret(e.target.value)}
                            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            The UUID token secret from Proxmox
                          </p>
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3">
                          <p className="text-sm text-blue-900 dark:text-blue-200">
                            <strong>Tip:</strong> Use the installation script to automatically create an API token with proper permissions.
                          </p>
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Proxmox Host Configuration</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4">
                          <p className="text-sm text-blue-900 dark:text-blue-200">
                            <strong>Current Proxmox Host:</strong> {config?.proxmox_host || 'Not configured'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            New Proxmox Host IP/Hostname
                          </label>
                          <input
                            type="text"
                            id="proxmoxHostInput"
                            defaultValue={config?.proxmox_host || ''}
                            placeholder="10.0.0.3 or pve-node1"
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            IP address or hostname of the Proxmox node to connect to
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            const newHost = document.getElementById('proxmoxHostInput').value.trim();
                            if (!newHost) {
                              setError('Please enter a valid Proxmox host');
                              return;
                            }

                            // Two-click pattern: first click sets confirm state, second click executes
                            if (confirmHostChange === newHost) {
                              // Second click - execute the change
                              confirmAndChangeHost();
                            } else {
                              // First click - set confirm state
                              setConfirmHostChange(newHost);
                            }
                          }}
                          className={`w-full px-4 py-2 text-white rounded font-medium ${
                            confirmHostChange
                              ? 'bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600'
                              : 'bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600'
                          }`}
                        >
                          {confirmHostChange ? 'Click again to confirm' : 'Update Proxmox Host'}
                        </button>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    {/* Configuration Export/Import */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration Backup & Restore</h3>
                      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Export your configuration for backup or import it on a fresh installation. Automatic backups are created before each import.
                        </p>

                        {/* Export Configuration */}
                        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Export Configuration</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Download all settings as a JSON file for backup or migration to another instance.
                          </p>
                          <button
                            onClick={() => {
                              window.location.href = `${API_BASE}/config/export`;
                            }}
                            className="w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Download size={16} />
                            Export Configuration
                          </button>
                        </div>

                        {/* Import Configuration */}
                        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Import Configuration</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Upload a configuration file to restore settings. Your current configuration will be automatically backed up before import.
                          </p>

                          <input
                            type="file"
                            ref={(el) => {
                              if (!window.configFileInput) window.configFileInput = el;
                            }}
                            accept=".json"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;

                              if (!confirm('Import configuration?\n\nThis will replace all current settings. Your current configuration will be backed up automatically.\n\nAre you sure?')) {
                                e.target.value = '';
                                return;
                              }

                              const formData = new FormData();
                              formData.append('file', file);

                              fetch(`${API_BASE}/config/import`, {
                                method: 'POST',
                                body: formData
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  alert('Configuration imported successfully!\n\n' +
                                        (result.validation_warnings?.length > 0
                                          ? 'Warnings:\n' + result.validation_warnings.join('\n')
                                          : 'Services will restart automatically.'));
                                  // Reload page to reflect new configuration
                                  setTimeout(() => window.location.reload(), 2000);
                                } else {
                                  let errorMsg = 'Failed to import configuration:\n' + result.error;
                                  if (result.validation_errors?.length > 0) {
                                    errorMsg += '\n\nValidation Errors:\n' + result.validation_errors.join('\n');
                                  }
                                  if (result.validation_warnings?.length > 0) {
                                    errorMsg += '\n\nWarnings:\n' + result.validation_warnings.join('\n');
                                  }
                                  alert(errorMsg);
                                }
                              })
                              .catch(error => {
                                alert('Error importing configuration: ' + error.message);
                              })
                              .finally(() => {
                                e.target.value = '';
                              });
                            }}
                          />

                          <button
                            onClick={() => window.configFileInput?.click()}
                            className="w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Upload size={16} />
                            Import Configuration
                          </button>
                        </div>

                        {/* Manual Backup */}
                        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded">
                          <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Create Backup</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Create a manual backup of your current configuration. Last 5 backups are kept automatically.
                          </p>
                          <button
                            onClick={() => {
                              fetch(`${API_BASE}/config/backup`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' }
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  alert('Backup created successfully!\n\nFile: ' + result.backup_file);
                                } else {
                                  alert('Failed to create backup: ' + result.error);
                                }
                              })
                              .catch(error => {
                                alert('Error creating backup: ' + error.message);
                              });
                            }}
                            className="w-full px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 font-medium flex items-center justify-center gap-2"
                          >
                            <Save size={16} />
                            Create Backup Now
                          </button>
                        </div>

                        <div className="text-xs text-gray-500 dark:text-gray-400 italic p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                          <strong>Note:</strong> Backups are stored in /opt/proxmox-balance-manager/backups/ and rotated automatically (last 5 kept).
                        </div>
                      </div>
                    </div>

                    <hr className="border-gray-300 dark:border-gray-600" />

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Management</h3>
                      <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded">
                        <button
                          onClick={() => {
                            if (confirm('Restart ProxBalance API service?\n\nThis will briefly interrupt data collection.')) {
                              fetch(`${API_BASE}/system/restart-service`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'proxmox-balance' })
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  // Service restarted successfully - no popup needed
                                } else {
                                  setError('Failed to restart service: ' + (result.error || 'Unknown error'));
                                }
                              })
                              .catch(error => setError('Error: ' + error.message));
                            }
                          }}
                          className="w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={16} />
                          Restart API Service
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Restart Data Collector service?\n\nThis will restart the background data collection process.')) {
                              fetch(`${API_BASE}/system/restart-service`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ service: 'proxmox-collector' })
                              })
                              .then(response => response.json())
                              .then(result => {
                                if (result.success) {
                                  // Service restarted successfully - no popup needed
                                } else {
                                  setError('Failed to restart service: ' + (result.error || 'Unknown error'));
                                }
                              })
                              .catch(error => setError('Error: ' + error.message));
                            }
                          }}
                          className="w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
                        >
                          <RefreshCw size={16} />
                          Restart Collector Service
                        </button>
                      </div>
                    </div>
                        </div>
                      )}
                    </div>

                    {/* Save Button - Sticky at bottom */}
                    <div className="sticky bottom-0 mt-6 -mx-4 px-4 py-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg">
                      <button
                        onClick={saveSettings}
                        disabled={savingSettings}
                        className="w-full px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
                      >
                        <Save size={18} />
                        {savingSettings ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Automation Settings Page
          if (currentPage === 'automation') {
            if (!automationConfig) {
              return (
                <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
                  <div className="text-gray-600 dark:text-gray-400">Loading automation settings...</div>
                </div>
              );
            }

            return (
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
                <div className="max-w-5xl mx-auto p-4">
                  {/* Header */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <button
                          onClick={() => setCurrentPage('dashboard')}
                          className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                          title="Back to Dashboard"
                        >
                          <ArrowLeft size={20} className="text-gray-700 dark:text-gray-300" />
                        </button>
                        <div className="flex items-center gap-3">
                          <Clock size={28} className="text-blue-600 dark:text-blue-400" />
                          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Automated Migrations</h1>
                          <span className="relative group inline-block">
                            <Info size={18} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700" style={{minWidth: '280px'}}>
                              <div className="font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-2">Migration Scoring System</div>
                              <div className="text-[11px] space-y-1">
                                <div className="text-gray-300">Migrations are scored using a penalty-based system:</div>
                                <div className="mt-2 space-y-0.5">
                                  <div>• <span className="text-blue-300">CPU Load</span> × 30%</div>
                                  <div>• <span className="text-blue-300">Memory Load</span> × 30%</div>
                                  <div>• <span className="text-blue-300">IOWait</span> × 20%</div>
                                  <div>• <span className="text-blue-300">Load Average</span> × 10%</div>
                                  <div>• <span className="text-blue-300">Storage Pressure</span> × 10%</div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                  <div className="text-gray-400">Lower penalty score = better target</div>
                                  <div className="text-gray-400">Plus penalties for high usage & trends</div>
                                </div>
                                <div className="mt-2 pt-2 border-t border-gray-700">
                                  <div><span className="text-green-400 font-semibold">70%+</span> = Excellent</div>
                                  <div><span className="text-yellow-400 font-semibold">50-69%</span> = Good</div>
                                  <div><span className="text-orange-400 font-semibold">30-49%</span> = Fair</div>
                                  <div><span className="text-red-400 font-semibold">&lt;30%</span> = Poor</div>
                                </div>
                              </div>
                            </div>
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={testAutomation}
                        disabled={testingAutomation}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition-colors flex items-center gap-2"
                      >
                        <Play size={18} />
                        {testingAutomation ? 'Running Test...' : 'Test Now'}
                      </button>
                    </div>
                  </div>

                  {/* Experimental Warning */}
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4 mb-6">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={24} className="text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-yellow-900 dark:text-yellow-200 mb-2 text-lg">⚠️ Experimental Feature</div>
                        <div className="text-sm text-yellow-800 dark:text-yellow-300 space-y-1">
                          <p>Automated Migrations is an <strong>experimental feature</strong>. Please use with caution:</p>
                          <ul className="list-disc list-inside ml-2 space-y-1">
                            <li>Keep <strong>Dry Run Mode enabled</strong> until you're confident in the configuration</li>
                            <li>Monitor the system closely when enabling real migrations</li>
                            <li>Start with conservative settings (low migration limits, high confidence scores)</li>
                            <li>Test thoroughly in a non-production environment if possible</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Test Results */}
                  {testResult && (
                    <div className={`rounded-lg shadow p-6 mb-6 ${testResult.success ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700' : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700'}`}>
                      <div className="flex items-start gap-3">
                        <div className="shrink-0">
                          {testResult.success ? (
                            <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                          ) : (
                            <XCircle size={24} className="text-red-600 dark:text-red-400" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className={`font-semibold mb-2 ${testResult.success ? 'text-green-900 dark:text-green-200' : 'text-red-900 dark:text-red-200'}`}>
                            {testResult.success ? 'Test Completed Successfully' : 'Test Failed'}
                          </div>
                          <pre className={`text-sm whitespace-pre-wrap font-mono p-3 rounded ${testResult.success ? 'bg-green-100 dark:bg-green-800/30 text-green-900 dark:text-green-100' : 'bg-red-100 dark:bg-red-800/30 text-red-900 dark:text-red-100'}`}>
                            {testResult.output || testResult.error || 'No output available'}
                          </pre>
                        </div>
                        <button
                          onClick={() => setTestResult(null)}
                          className={`shrink-0 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${testResult.success ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                          title="Dismiss"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Main Settings */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <button
                      onClick={() => setCollapsedSections(prev => ({ ...prev, mainSettings: !prev.mainSettings }))}
                      className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity"
                    >
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Main Settings</h2>
                      <ChevronDown
                        size={24}
                        className={`text-gray-600 dark:text-gray-400 transition-transform ${collapsedSections.mainSettings ? '-rotate-180' : ''}`}
                      />
                    </button>

                    {!collapsedSections.mainSettings && (<div className="space-y-4">
                      {/* Enable/Disable */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Enable Automated Migrations</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Turn automation on or off</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.enabled || false}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Show confirmation for enabling
                                  setConfirmEnableAutomation(true);
                                } else {
                                  // Disabling doesn't need confirmation
                                  saveAutomationConfig({ enabled: false });
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                        {confirmEnableAutomation && (
                          <div className="px-4 pb-4">
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle size={20} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="font-semibold text-orange-900 dark:text-orange-200 mb-2">Enable Automated Migrations?</div>
                                  <p className="text-sm text-orange-800 dark:text-orange-300 mb-3">
                                    The system will automatically migrate VMs based on your configured rules.
                                  </p>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        saveAutomationConfig({ enabled: true });
                                        setConfirmEnableAutomation(false);
                                      }}
                                      className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium"
                                    >
                                      Enable Automation
                                    </button>
                                    <button
                                      onClick={() => setConfirmEnableAutomation(false)}
                                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Dry Run */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Dry Run Mode</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Test without actual migrations (recommended)</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.dry_run !== false}
                              onChange={(e) => {
                                if (!e.target.checked) {
                                  // Show CRITICAL warning for disabling dry run
                                  setConfirmDisableDryRun(true);
                                } else {
                                  // Enabling dry run is safe, no confirmation needed
                                  saveAutomationConfig({ dry_run: true });
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-yellow-600"></div>
                          </label>
                        </div>
                        {confirmDisableDryRun && (
                          <div className="px-4 pb-4">
                            <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <AlertTriangle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="font-bold text-red-900 dark:text-red-200 mb-2 text-lg">DISABLE DRY RUN MODE?</div>
                                  <div className="text-sm text-red-800 dark:text-red-300 space-y-2 mb-4">
                                    <p className="font-semibold">This will enable REAL automated migrations!</p>
                                    <p>VMs will actually be migrated automatically based on your configured rules.</p>
                                    <p className="font-semibold">Are you absolutely sure?</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        saveAutomationConfig({ dry_run: false });
                                        setConfirmDisableDryRun(false);
                                      }}
                                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold"
                                    >
                                      Yes, Disable Dry Run
                                    </button>
                                    <button
                                      onClick={() => setConfirmDisableDryRun(false)}
                                      className="px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
                                    >
                                      Cancel (Keep Dry Run On)
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Check Interval */}
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <label className="block font-semibold text-gray-900 dark:text-white mb-2">
                          Check Interval (minutes)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="60"
                          value={automationConfig.check_interval_minutes || 5}
                          onChange={(e) => saveAutomationConfig({ check_interval_minutes: parseInt(e.target.value) })}
                          className="w-32 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                        />
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          How often to check for migrations
                        </div>
                      </div>

                      {/* Schedule Presets */}
                      <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700 rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <label className="block font-semibold text-gray-900 dark:text-white">
                            Quick Configuration Presets
                          </label>
                          <button
                            onClick={() => setEditingPreset(editingPreset ? null : 'info')}
                            className="text-xs text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 flex items-center gap-1"
                          >
                            <Settings size={14} />
                            {editingPreset ? 'Done Editing' : 'Customize Presets'}
                          </button>
                        </div>

                        {(() => {
                          const presets = automationConfig.presets || {
                            conservative: { min_confidence_score: 80, max_migrations_per_run: 1, cooldown_minutes: 120, check_interval_minutes: 30 },
                            balanced: { min_confidence_score: 70, max_migrations_per_run: 3, cooldown_minutes: 60, check_interval_minutes: 15 },
                            aggressive: { min_confidence_score: 60, max_migrations_per_run: 5, cooldown_minutes: 30, check_interval_minutes: 5 }
                          };

                          const presetInfo = {
                            conservative: { icon: Shield, color: 'blue', label: 'Conservative', desc: 'High confidence, low frequency, safest option' },
                            balanced: { icon: Activity, color: 'green', label: 'Balanced', desc: 'Medium confidence and frequency, recommended' },
                            aggressive: { icon: AlertTriangle, color: 'orange', label: 'Aggressive', desc: 'Lower confidence, high frequency, use with care' }
                          };

                          return (
                            <div className="grid grid-cols-3 gap-3">
                              {Object.entries(presets).map(([key, preset]) => {
                                const info = presetInfo[key];
                                const Icon = info.icon;
                                const editing = editingPreset === key;

                                return (
                                  <div key={key} className={`p-3 bg-white dark:bg-gray-700 border-2 border-${info.color}-300 dark:border-${info.color}-600 rounded-lg ${!editing && 'hover:bg-' + info.color + '-50 dark:hover:bg-' + info.color + '-900/30'} transition-colors`}>
                                    {editing ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                            <Icon size={16} className={`text-${info.color}-600 dark:text-${info.color}-400`} />
                                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{info.label}</span>
                                          </div>
                                          <button
                                            onClick={() => setEditingPreset(null)}
                                            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Min Confidence</label>
                                          <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={preset.min_confidence_score}
                                            onChange={(e) => saveAutomationConfig({
                                              presets: {
                                                ...presets,
                                                [key]: { ...preset, min_confidence_score: parseInt(e.target.value) }
                                              }
                                            })}
                                            className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Max Migrations</label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="20"
                                            value={preset.max_migrations_per_run}
                                            onChange={(e) => saveAutomationConfig({
                                              presets: {
                                                ...presets,
                                                [key]: { ...preset, max_migrations_per_run: parseInt(e.target.value) }
                                              }
                                            })}
                                            className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Cooldown (min)</label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="1440"
                                            value={preset.cooldown_minutes}
                                            onChange={(e) => saveAutomationConfig({
                                              presets: {
                                                ...presets,
                                                [key]: { ...preset, cooldown_minutes: parseInt(e.target.value) }
                                              }
                                            })}
                                            className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-600 dark:text-gray-400">Check Interval (min)</label>
                                          <input
                                            type="number"
                                            min="1"
                                            max="1440"
                                            value={preset.check_interval_minutes}
                                            onChange={(e) => saveAutomationConfig({
                                              presets: {
                                                ...presets,
                                                [key]: { ...preset, check_interval_minutes: parseInt(e.target.value) }
                                              }
                                            })}
                                            className="w-full px-2 py-1 text-xs bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded text-gray-900 dark:text-white"
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <button
                                        onClick={() => {
                                          if (editingPreset) {
                                            setEditingPreset(key);
                                          } else if (confirmApplyPreset === key) {
                                            // Second click - execute the preset application
                                            saveAutomationConfig({
                                              check_interval_minutes: preset.check_interval_minutes,
                                              rules: {
                                                ...automationConfig.rules,
                                                min_confidence_score: preset.min_confidence_score,
                                                max_migrations_per_run: preset.max_migrations_per_run,
                                                cooldown_minutes: preset.cooldown_minutes
                                              }
                                            });
                                            setConfirmApplyPreset(null);
                                          } else {
                                            // First click - set confirm state
                                            setConfirmApplyPreset(key);
                                          }
                                        }}
                                        className={`w-full text-left ${
                                          confirmApplyPreset === key
                                            ? 'ring-2 ring-orange-500 dark:ring-orange-400 bg-orange-50 dark:bg-orange-900/20'
                                            : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-2 mb-1">
                                          <Icon size={18} className={`text-${info.color}-600 dark:text-${info.color}-400`} />
                                          <span className="font-semibold text-gray-900 dark:text-white">{info.label}</span>
                                          {editingPreset && (
                                            <Settings size={14} className="ml-auto text-gray-500" />
                                          )}
                                        </div>
                                        <div className="text-xs text-gray-600 dark:text-gray-400">
                                          {info.desc}
                                        </div>
                                        {editingPreset && (
                                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Click to edit
                                          </div>
                                        )}
                                        {confirmApplyPreset === key && (
                                          <div className="text-xs text-orange-700 dark:text-orange-300 mt-1 font-semibold">
                                            Click again to apply preset
                                          </div>
                                        )}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}

                        <div className="text-xs text-purple-700 dark:text-purple-300 mt-3 italic">
                          💡 {editingPreset ? 'Edit preset values above, then click "Done Editing" to apply them.' : 'These presets configure multiple settings at once. Click "Customize Presets" to edit their values.'}
                        </div>
                      </div>
                    </div>)}
                  </div>

                  {/* Penalty-Based Scoring Info - Collapsible */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-6">
                    <button
                      onClick={() => setCollapsedSections(prev => ({...prev, howItWorks: !prev.howItWorks}))}
                      className="w-full flex items-center justify-between p-5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Info size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="font-bold text-blue-900 dark:text-blue-200 text-left">How Automated Migrations Work</div>
                      </div>
                      {collapsedSections.howItWorks ? (
                        <ChevronDown size={20} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ChevronUp size={20} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </button>

                    {!collapsedSections.howItWorks && (
                      <div className="px-5 pb-5">
                        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-2">
                          <p>
                            Automated migrations use a <strong>penalty-based scoring system</strong> to intelligently balance your cluster.
                            Each node accumulates penalties based on multiple factors - lower scores indicate better migration targets.
                          </p>
                          <div className="mt-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded border border-blue-300 dark:border-blue-600">
                            <div className="font-semibold text-blue-900 dark:text-blue-100 mb-1">Penalty Factors:</div>
                            <ul className="list-disc list-inside ml-2 mt-1 space-y-1 text-sm">
                              <li><strong>Current Load:</strong> Immediate resource pressure from CPU, Memory, and IOWait (20-100 points each)</li>
                              <li><strong>Sustained Load:</strong> Long-term resource usage patterns over 7 days (15-150 points)</li>
                              <li><strong>Rising Trends:</strong> Resources trending upward over time (15 points per metric)</li>
                              <li><strong>Load Spikes:</strong> Maximum resource peaks detected in recent history (5-30 points)</li>
                              <li><strong>Predicted Load:</strong> Post-migration resource levels to prevent overloading targets</li>
                            </ul>
                            <p className="mt-3 text-sm">
                              <button
                                onClick={() => setCurrentPage('dashboard')}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
                              >
                                View Migration Recommendations →
                              </button> to see detailed scoring, confidence levels, and suggested migrations.
                            </p>
                            <p className="mt-2 text-xs text-blue-700 dark:text-blue-300 italic">
                              💡 The system finds optimal migration pairs by comparing source node penalties with target node suitability scores. Only migrations with significant score improvements ({penaltyConfig?.min_score_improvement || 15}+ points by default) are recommended.
                            </p>
                            <p className="mt-3 text-sm">
                              <button
                                onClick={() => {
                                  // Navigate to Settings page and open penalty config
                                  setCurrentPage('settings');
                                  setOpenPenaltyConfigOnSettings(true);
                                }}
                                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
                              >
                                ⚙️ Configure Penalty Weights →
                              </button>
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Decision Tree - Collapsible */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-6">
                    <button
                      onClick={() => setCollapsedSections(prev => ({...prev, decisionTree: !prev.decisionTree}))}
                      className="w-full flex items-center justify-between p-5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Info size={24} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        <div className="font-bold text-blue-900 dark:text-blue-200 text-left">Migration Decision Flowchart</div>
                      </div>
                      {collapsedSections.decisionTree ? (
                        <ChevronDown size={20} className="text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ChevronUp size={20} className="text-blue-600 dark:text-blue-400" />
                      )}
                    </button>

                    {!collapsedSections.decisionTree && (
                      <div className="px-5 pb-5">
                        <div className="text-sm text-blue-800 dark:text-blue-300 space-y-4">
                          <p className="font-semibold text-blue-900 dark:text-blue-200">
                            This decision tree shows all possible paths through the automated migration process:
                          </p>

                          {/* Decision Tree Diagram */}
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-lg p-6 border-2 border-blue-300 dark:border-blue-600 shadow-sm">
                            <div className="space-y-4">

                              {/* Start Box */}
                              <div className="flex justify-center">
                                <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow">
                                  🚀 Automation Run Triggered
                                </div>
                              </div>

                              {/* Flow connector with arrow */}
                              <div className="flex flex-col items-center">
                                <div className="w-0.5 h-6 bg-gradient-to-b from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600"></div>
                                <div className="text-blue-500 dark:text-blue-400">▼</div>
                              </div>

                              {/* Decision boxes */}
                              <div className="space-y-3">

                                {/* Step 1 */}
                                <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">1</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span>⚙️</span> Is automation enabled?
                                      </div>
                                      <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                          <span className="text-red-600 dark:text-red-400 font-bold">✗ NO</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">STOP</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                          <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 2 */}
                                <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">2</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span>⏱️</span> Is cooldown period elapsed?
                                      </div>
                                      <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                          <span className="text-orange-600 dark:text-orange-400 font-bold">✗ NO</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                          <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 3 */}
                                <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">3</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span>🕐</span> In allowed time window?
                                      </div>
                                      <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                          <span className="text-red-600 dark:text-red-400 font-bold">✗ BLACKOUT</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">BLOCKED</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                          <span className="text-orange-600 dark:text-orange-400 font-bold">✗ OUTSIDE</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                          <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 4 */}
                                <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">4</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span>🏥</span> Is cluster healthy? <span className="text-xs font-normal text-gray-500 dark:text-gray-400">(if enabled)</span>
                                      </div>
                                      <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg">
                                          <span className="text-red-600 dark:text-red-400 font-bold">✗ NO</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">ABORT</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                          <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 5 - Process Box */}
                                <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border-2 border-indigo-300 dark:border-indigo-600 p-5 shadow-md">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">5</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <span>🎯</span> Generate Recommendations
                                      </div>
                                      <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                        <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Calculate penalty scores for all nodes</div>
                                        <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Find VMs on high-penalty nodes</div>
                                        <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Match with low-penalty target nodes</div>
                                        <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Apply filters (tags, storage, rollback detection)</div>
                                        <div className="flex items-start gap-2"><span className="text-indigo-600 dark:text-indigo-400">▸</span> Calculate confidence scores</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 6 */}
                                <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">6</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span>📊</span> Any recommendations above min confidence?
                                      </div>
                                      <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg">
                                          <span className="text-orange-600 dark:text-orange-400 font-bold">✗ NO</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">SKIP</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                          <span className="text-green-600 dark:text-green-400 font-bold">✓ YES</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="text-gray-700 dark:text-gray-300 font-medium">Continue ↓</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 7 */}
                                <div className="bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">7</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                                        <span>🧪</span> Is dry run mode enabled?
                                      </div>
                                      <div className="space-y-2 text-xs">
                                        <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg">
                                          <span className="text-blue-600 dark:text-blue-400 font-bold">✓ YES</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="bg-blue-500 dark:bg-blue-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm">LOG ONLY</span>
                                        </div>
                                        <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg">
                                          <span className="text-green-600 dark:text-green-400 font-bold">✗ NO</span>
                                          <span className="text-gray-500 dark:text-gray-400">→</span>
                                          <span className="text-gray-700 dark:text-gray-300 font-medium">Execute ↓</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Step 8 - Action Box */}
                                <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 p-5 shadow-md">
                                  <div className="flex items-start gap-3">
                                    <div className="bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-500 dark:to-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md">8</div>
                                    <div className="flex-1">
                                      <div className="font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                        <span>⚡</span> Execute Migrations
                                      </div>
                                      <div className="text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg">
                                        <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Limit to max migrations per run (default: 3)</div>
                                        <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Execute migrations sequentially</div>
                                        <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> If migration fails + abort_on_failure: STOP batch</div>
                                        <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> If migration fails + pause_on_failure: DISABLE automation</div>
                                        <div className="flex items-start gap-2"><span className="text-emerald-600 dark:text-emerald-400">▸</span> Track migration status and update history</div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                              </div>

                              {/* Flow connector with arrow */}
                              <div className="flex flex-col items-center">
                                <div className="w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600"></div>
                                <div className="text-emerald-500 dark:text-emerald-400">▼</div>
                              </div>

                              {/* End Box */}
                              <div className="flex justify-center">
                                <div className="bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 dark:from-emerald-500 dark:via-green-500 dark:to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3">
                                  <span className="text-2xl">✓</span> <span>Run Complete</span>
                                </div>
                              </div>

                            </div>
                          </div>

                          <div className="mt-4 p-4 bg-blue-100 dark:bg-blue-900/30 rounded-lg border border-blue-300 dark:border-blue-600">
                            <div className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                              <span>💡</span> Configuration Profiles
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                                <div className="font-bold text-gray-900 dark:text-white mb-1">🛡️ Conservative</div>
                                <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                  <div>• Min confidence: 80+</div>
                                  <div>• Max migrations: 1-2</div>
                                  <div>• Cooldown: 60+ min</div>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                                <div className="font-bold text-gray-900 dark:text-white mb-1">⚖️ Balanced</div>
                                <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                  <div>• Min confidence: 70+</div>
                                  <div>• Max migrations: 3-5</div>
                                  <div>• Cooldown: 30-60 min</div>
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 p-3 rounded border border-blue-200 dark:border-blue-700">
                                <div className="font-bold text-gray-900 dark:text-white mb-1">⚡ Aggressive</div>
                                <div className="text-gray-600 dark:text-gray-400 space-y-0.5">
                                  <div>• Min confidence: 60+</div>
                                  <div>• Max migrations: 5-10</div>
                                  <div>• Cooldown: 15-30 min</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Safety & Rules */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <button
                      onClick={() => setCollapsedSections(prev => ({ ...prev, safetyRules: !prev.safetyRules }))}
                      className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity"
                    >
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Safety & Rules</h2>
                      <ChevronDown
                        size={24}
                        className={`text-gray-600 dark:text-gray-400 transition-transform ${collapsedSections.safetyRules ? '-rotate-180' : ''}`}
                      />
                    </button>

                    {!collapsedSections.safetyRules && (
                    <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Min Confidence Score
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={automationConfig.rules?.min_confidence_score || 75}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, min_confidence_score: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Migrations Per Run
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={automationConfig.rules?.max_migrations_per_run || 3}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_migrations_per_run: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Cooldown Minutes
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="1440"
                          value={automationConfig.rules?.cooldown_minutes || 30}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, cooldown_minutes: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Wait time between migrations of the same VM
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Concurrent Migrations
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={automationConfig.rules?.max_concurrent_migrations || 1}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, max_concurrent_migrations: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Maximum simultaneous migrations
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Grace Period (seconds)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="300"
                          value={automationConfig.rules?.grace_period_seconds !== undefined ? automationConfig.rules.grace_period_seconds : 30}
                          onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, grace_period_seconds: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Wait time between migrations for cluster to settle (0 = no wait)
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Node CPU %
                        </label>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={automationConfig.safety_checks?.max_node_cpu_percent || 85}
                          onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Max Node Memory %
                        </label>
                        <input
                          type="number"
                          min="50"
                          max="100"
                          value={automationConfig.safety_checks?.max_node_memory_percent || 90}
                          onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: parseInt(e.target.value) } })}
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mt-4 space-y-4">
                      {/* Respect 'ignore' Tags */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Respect 'ignore' Tags</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Skip VMs tagged with 'pb-ignore' or 'ignore' during automated migrations. Use for critical VMs that require manual migration planning.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.rules?.respect_ignore_tags !== false}
                              onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_ignore_tags: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Require 'auto_migrate_ok' Tag */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Require 'auto_migrate_ok' Tag</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Only migrate VMs with 'auto-migrate-ok' or 'auto_migrate_ok' tag (opt-in mode). All other VMs will be excluded from automated migrations.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.rules?.require_auto_migrate_ok_tag || false}
                              onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, require_auto_migrate_ok_tag: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Respect Anti-Affinity */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Respect Anti-Affinity (exclude_* tags)</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Prevents VMs with the same exclude tag from clustering on one node. Example: Two VMs with 'exclude_database' will spread across different nodes for fault tolerance.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.rules?.respect_exclude_affinity !== false}
                              onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, respect_exclude_affinity: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>
                      {/* Allow Container Restarts */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Allow Container Restarts for Migration</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Enables automated migrations to restart containers that cannot be live-migrated. Containers will experience brief downtime during migration.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.rules?.allow_container_restarts === true}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Show warning for enabling container restarts
                                  setConfirmAllowContainerRestarts(true);
                                } else {
                                  // Disabling is safe, no confirmation needed
                                  saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: false } });
                                }
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                        {confirmAllowContainerRestarts && (
                          <div className="mt-3">
                            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={18} className="text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <div className="font-semibold text-orange-900 dark:text-orange-200 text-sm mb-1">ALLOW CONTAINER RESTARTS?</div>
                                  <div className="text-xs text-orange-800 dark:text-orange-300 space-y-1 mb-2">
                                    <p>This will allow automated migrations to restart containers that cannot be live-migrated.</p>
                                    <p className="font-semibold">Containers will experience brief downtime during migration.</p>
                                    <p>Are you sure?</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => {
                                        saveAutomationConfig({ rules: { ...automationConfig.rules, allow_container_restarts: true } });
                                        setConfirmAllowContainerRestarts(false);
                                      }}
                                      className="px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium"
                                    >
                                      Yes, Allow Restarts
                                    </button>
                                    <button
                                      onClick={() => setConfirmAllowContainerRestarts(false)}
                                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Rollback Detection */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Rollback Detection</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Prevent migration loops by detecting when a VM would be migrated back to a node it was recently migrated from.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.rules?.rollback_detection_enabled !== false}
                              onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, rollback_detection_enabled: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                        {automationConfig.rules?.rollback_detection_enabled !== false && (
                          <div className="px-4 pb-4">
                            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                              Rollback Detection Window (hours)
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="168"
                              value={automationConfig.rules?.rollback_window_hours || 24}
                              onChange={(e) => saveAutomationConfig({ rules: { ...automationConfig.rules, rollback_window_hours: parseInt(e.target.value) } })}
                              className="w-32 px-2 py-1 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              How far back to check for previous migrations (default: 24 hours)
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Check Cluster Health */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Check Cluster Health Before Migrating</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Verifies cluster is healthy before migrating: cluster has quorum, all nodes CPU &lt; 85%, all nodes memory &lt; 90%. Prevents migrations during cluster stress that could worsen the situation. Recommended for production.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.safety_checks?.check_cluster_health !== false}
                              onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, check_cluster_health: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>
                      {/* Abort Batch on Failure */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Abort Batch if a Migration Fails</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Stops executing remaining migrations in the current batch if any single migration fails. Prevents cascading issues when a migration error might indicate a cluster problem.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.safety_checks?.abort_on_failure !== false}
                              onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, abort_on_failure: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>
                      {/* Pause Automation After Failure */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Pause Automation After Migration Failure</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Automatically disables automated migrations if any migration fails. Prevents cascading failures and requires manual review before resuming automation. Highly recommended for production environments.</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={automationConfig.safety_checks?.pause_on_failure === true}
                              onChange={(e) => saveAutomationConfig({ safety_checks: { ...automationConfig.safety_checks, pause_on_failure: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                    </>
                    )}
                  </div>

                  {/* Distribution Balancing */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <button
                      onClick={() => setCollapsedSections(prev => ({ ...prev, distributionBalancing: !prev.distributionBalancing }))}
                      className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity"
                    >
                      <h2 className="text-xl font-bold text-gray-900 dark:text-white">Distribution Balancing</h2>
                      <ChevronDown
                        size={24}
                        className={`text-gray-600 dark:text-gray-400 transition-transform ${collapsedSections.distributionBalancing ? '-rotate-180' : ''}`}
                      />
                    </button>

                    {!collapsedSections.distributionBalancing && (
                    <>
                    {/* Collapsible detailed description */}
                    <div className="mb-4">
                      <button
                        onClick={() => setCollapsedSections(prev => ({ ...prev, distributionBalancingHelp: !prev.distributionBalancingHelp }))}
                        className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        {collapsedSections.distributionBalancingHelp ? (
                          <>
                            <ChevronDown size={16} className="-rotate-90" />
                            Show detailed explanation
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            Hide detailed explanation
                          </>
                        )}
                      </button>

                      {!collapsedSections.distributionBalancingHelp && (
                        <div className="mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3">
                          <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">What is Distribution Balancing?</h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              Complements performance-based recommendations by focusing on <strong>evening out the number of VMs/CTs across nodes</strong>, rather than just CPU, memory, or I/O metrics.
                            </p>
                          </div>

                          <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">The Problem It Solves</h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              A node with 19 small VMs (DNS, monitoring, utilities) may show low resource usage but still suffers from management overhead, slower operations (start/stop/backup), and uneven workload distribution. Distribution balancing addresses this by moving small guests to less populated nodes.
                            </p>
                          </div>

                          <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How It Works</h3>
                            <ol className="text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1">
                              <li>Counts running guests on each node (e.g., pve4: 19, pve6: 4)</li>
                              <li>If difference ≥ threshold (default: 2), finds small guests on overloaded node</li>
                              <li>Only considers guests ≤ max CPU cores (default: 2) and ≤ max memory (default: 4 GB)</li>
                              <li>Recommends migrating eligible small guests to underloaded nodes</li>
                              <li>Works alongside performance-based recommendations, respects tags and storage compatibility</li>
                            </ol>
                          </div>

                          <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">When to Enable</h3>
                            <p className="text-sm text-blue-800 dark:text-blue-200">
                              ✓ Many small utility VMs (DNS, monitoring, etc.)<br />
                              ✓ Nodes with very different guest counts (e.g., 19 vs 4)<br />
                              ✓ Performance metrics don't show the imbalance<br />
                              ✓ Want more even workload distribution for management simplicity
                            </p>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-4">
                      {/* Enable Distribution Balancing */}
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <div className="flex items-center justify-between p-4">
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Enable Distribution Balancing</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">Automatically balance small workloads across nodes to prevent guest count imbalance</div>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config.distribution_balancing?.enabled || false}
                              onChange={(e) => {
                                const newConfig = { ...config };
                                if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                                newConfig.distribution_balancing.enabled = e.target.checked;
                                setConfig(newConfig);
                                saveConfig(newConfig);
                              }}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                          </label>
                        </div>
                      </div>

                      {config.distribution_balancing?.enabled && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        {/* Guest Count Threshold */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Guest Count Threshold
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={config.distribution_balancing?.guest_count_threshold || 2}
                            onChange={(e) => {
                              const newConfig = { ...config };
                              if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                              newConfig.distribution_balancing.guest_count_threshold = parseInt(e.target.value);
                              setConfig(newConfig);
                              saveConfig(newConfig);
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Minimum difference in guest counts to trigger balancing
                          </p>
                        </div>

                        {/* Max CPU Cores */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Max CPU Cores
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="32"
                            value={config.distribution_balancing?.max_cpu_cores || 2}
                            onChange={(e) => {
                              const newConfig = { ...config };
                              if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                              newConfig.distribution_balancing.max_cpu_cores = parseInt(e.target.value);
                              setConfig(newConfig);
                              saveConfig(newConfig);
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Only migrate guests with ≤ this many CPU cores (0 = no limit)
                          </p>
                        </div>

                        {/* Max Memory GB */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Max Memory (GB)
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="256"
                            value={config.distribution_balancing?.max_memory_gb || 4}
                            onChange={(e) => {
                              const newConfig = { ...config };
                              if (!newConfig.distribution_balancing) newConfig.distribution_balancing = {};
                              newConfig.distribution_balancing.max_memory_gb = parseInt(e.target.value);
                              setConfig(newConfig);
                              saveConfig(newConfig);
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Only migrate guests with ≤ this much memory (0 = no limit)
                          </p>
                        </div>
                      </div>
                      )}
                    </div>
                    </>
                    )}
                  </div>

                  {/* Notifications - DISABLED FOR NOW - Awaiting additional development
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Notifications</h2>

                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-4">
                      <div>
                        <div className="font-semibold text-gray-900 dark:text-white">Enable Notifications</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Send webhook notifications for migration events</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={automationConfig.notifications?.enabled || false}
                          onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, enabled: e.target.checked } })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                      </label>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Webhook URL
                        </label>
                        <input
                          type="url"
                          value={automationConfig.notifications?.webhook_url || ''}
                          onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, webhook_url: e.target.value } })}
                          placeholder="https://hooks.slack.com/services/..."
                          className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Slack, Discord, or other webhook URL
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={automationConfig.notifications?.on_start !== false}
                            onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_start: e.target.checked } })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            On Start
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={automationConfig.notifications?.on_complete !== false}
                            onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_complete: e.target.checked } })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            On Complete
                          </label>
                        </div>
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            checked={automationConfig.notifications?.on_failure !== false}
                            onChange={(e) => saveAutomationConfig({ notifications: { ...automationConfig.notifications, on_failure: e.target.checked } })}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            On Failure
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                  */}

                  {/* Time Windows (Unified) */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Time Windows</h2>

                    {/* Timezone Selector */}
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                            Timezone for Time Windows
                          </label>
                          <select
                            value={automationConfig.schedule?.timezone || 'UTC'}
                            onChange={(e) => saveAutomationConfig({
                              schedule: {
                                ...automationConfig.schedule,
                                timezone: e.target.value
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="UTC">UTC (Server Time)</option>
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="America/Anchorage">Alaska Time (AK)</option>
                            <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                            <option value="Europe/London">London (GMT/BST)</option>
                            <option value="Europe/Paris">Paris (CET/CEST)</option>
                            <option value="Europe/Berlin">Berlin (CET/CEST)</option>
                            <option value="Europe/Moscow">Moscow (MSK)</option>
                            <option value="Asia/Dubai">Dubai (GST)</option>
                            <option value="Asia/Kolkata">India (IST)</option>
                            <option value="Asia/Shanghai">China (CST)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                            <option value="Asia/Singapore">Singapore (SGT)</option>
                            <option value="Australia/Sydney">Sydney (AEDT/AEST)</option>
                            <option value="Pacific/Auckland">Auckland (NZDT/NZST)</option>
                          </select>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                            All time windows below use this timezone. Current server time (UTC): {new Date().toUTCString()}
                          </p>
                        </div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Configure when migrations are allowed (Migration Windows) or blocked (Blackout Windows).
                      If no windows are configured, migrations are allowed at any time.
                    </p>

                    {/* Weekly Visual Timeline */}
                    {(() => {
                      const migrationWindows = automationConfig.schedule?.migration_windows || [];
                      const blackoutWindows = automationConfig.schedule?.blackout_windows || [];
                      const hasWindows = migrationWindows.length > 0 || blackoutWindows.length > 0;

                      if (!hasWindows) return null;

                      const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                      const today = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][new Date().getDay()];

                      return (
                        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                            Weekly Schedule Overview
                          </div>

                          {/* Week Grid */}
                          <div className="space-y-3 mt-4">
                            {daysOfWeek.map((day) => {
                              const dayMigrations = migrationWindows.filter(w => w.days?.includes(day));
                              const dayBlackouts = blackoutWindows.filter(w => w.days?.includes(day));
                              const isToday = day === today;

                              return (
                                <div key={day} className="flex gap-2">
                                  {/* Day Label */}
                                  <div className={`w-20 flex-shrink-0 text-xs font-medium flex items-center ${
                                    isToday
                                      ? 'text-blue-600 dark:text-blue-400 font-bold'
                                      : 'text-gray-600 dark:text-gray-400'
                                  }`}>
                                    {day.slice(0, 3)}
                                    {isToday && <span className="ml-1 text-blue-600 dark:text-blue-400">●</span>}
                                  </div>

                                  {/* Timeline Bar */}
                                  <div className="flex-1 relative h-6 bg-gray-200 dark:bg-gray-600 rounded overflow-visible">
                                    {/* Hour tick marks - every hour */}
                                    {Array.from({ length: 25 }, (_, hour) => {
                                      const isMajorTick = hour % 6 === 0;
                                      const isMinorTick = hour % 3 === 0 && !isMajorTick;

                                      return (
                                        <div
                                          key={`tick-${hour}`}
                                          className={`absolute bottom-0 z-0 ${
                                            isMajorTick
                                              ? 'h-full border-l-2 border-gray-400 dark:border-gray-500'
                                              : isMinorTick
                                              ? 'h-2/3 border-l border-gray-350 dark:border-gray-500'
                                              : 'h-1/3 border-l border-gray-300 dark:border-gray-550'
                                          }`}
                                          style={{ left: `${(hour / 24) * 100}%` }}
                                        >
                                          {isMajorTick && hour < 24 && (
                                            <div className="absolute -top-3 -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400">
                                              {hour.toString().padStart(2, '0')}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}

                                    {/* Render blackout windows */}
                                    {dayBlackouts.map((window, idx) => {
                                      const [startHour, startMin] = window.start_time.split(':').map(Number);
                                      const [endHour, endMin] = window.end_time.split(':').map(Number);
                                      const startPercent = ((startHour * 60 + startMin) / 1440) * 100;
                                      const endPercent = ((endHour * 60 + endMin) / 1440) * 100;
                                      const width = endPercent - startPercent;

                                      // Find the global index for this blackout window
                                      const blackoutIndex = blackoutWindows.findIndex(w =>
                                        w.name === window.name &&
                                        w.start_time === window.start_time &&
                                        w.end_time === window.end_time
                                      );
                                      const globalIndex = migrationWindows.length + blackoutIndex;

                                      return (
                                        <div
                                          key={`blackout-${idx}`}
                                          className="absolute top-0 bottom-0 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-colors z-10 cursor-pointer"
                                          style={{ left: `${startPercent}%`, width: `${width}%` }}
                                          title={`${window.name}: ${window.start_time}-${window.end_time} (BLOCKED) - Click to edit`}
                                          onClick={() => {
                                            setEditingWindowIndex(globalIndex);
                                            // Scroll to the window list
                                            setTimeout(() => {
                                              const element = document.querySelector(`[data-window-index="${globalIndex}"]`);
                                              if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              }
                                            }, 100);
                                          }}
                                        />
                                      );
                                    })}

                                    {/* Render migration windows */}
                                    {dayMigrations.map((window, idx) => {
                                      const [startHour, startMin] = window.start_time.split(':').map(Number);
                                      const [endHour, endMin] = window.end_time.split(':').map(Number);
                                      const startPercent = ((startHour * 60 + startMin) / 1440) * 100;
                                      const endPercent = ((endHour * 60 + endMin) / 1440) * 100;
                                      const width = endPercent - startPercent;

                                      // Find the global index for this migration window
                                      const migrationIndex = migrationWindows.findIndex(w =>
                                        w.name === window.name &&
                                        w.start_time === window.start_time &&
                                        w.end_time === window.end_time
                                      );

                                      return (
                                        <div
                                          key={`migration-${idx}`}
                                          className="absolute top-0 bottom-0 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 transition-colors z-10 cursor-pointer"
                                          style={{ left: `${startPercent}%`, width: `${width}%` }}
                                          title={`${window.name}: ${window.start_time}-${window.end_time} (ALLOWED) - Click to edit`}
                                          onClick={() => {
                                            setEditingWindowIndex(migrationIndex);
                                            // Scroll to the window list
                                            setTimeout(() => {
                                              const element = document.querySelector(`[data-window-index="${migrationIndex}"]`);
                                              if (element) {
                                                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                              }
                                            }, 100);
                                          }}
                                        />
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Legend */}
                          <div className="flex items-center gap-4 mt-6 text-xs">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-green-500 dark:bg-green-600 rounded"></div>
                              <span className="text-gray-600 dark:text-gray-400">Migrations Allowed</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-red-500 dark:bg-red-600 rounded"></div>
                              <span className="text-gray-600 dark:text-gray-400">Migrations Blocked</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500"></div>
                              <span className="text-gray-600 dark:text-gray-400">No Restriction</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Combined Windows List */}
                    {(() => {
                      const migrationWindows = automationConfig.schedule?.migration_windows || [];
                      const blackoutWindows = automationConfig.schedule?.blackout_windows || [];

                      // Combine both arrays with type information
                      const allWindows = [
                        ...migrationWindows.map((w, idx) => ({ ...w, type: 'migration', originalIndex: idx })),
                        ...blackoutWindows.map((w, idx) => ({ ...w, type: 'blackout', originalIndex: idx }))
                      ];

                      if (allWindows.length === 0) {
                        return (
                          <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 mb-3">
                            No time windows configured - migrations allowed at any time
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2 mb-3">
                          {allWindows.map((window, idx) => {
                            const isMigration = window.type === 'migration';
                            const isEditing = editingWindowIndex === idx;

                            return (
                              <div
                                key={`${window.type}-${window.originalIndex}`}
                                data-window-index={idx}
                                className={`p-3 rounded-lg border ${
                                  isMigration
                                    ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700'
                                    : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700'
                                }`}
                              >
                                {isEditing ? (
                                  <div className="space-y-3">
                                    {/* Type Toggle */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window Type</label>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            // Move window from one array to another
                                            const newMigrationWindows = [...migrationWindows];
                                            const newBlackoutWindows = [...blackoutWindows];

                                            if (isMigration) {
                                              // Move to blackout
                                              const [removed] = newMigrationWindows.splice(window.originalIndex, 1);
                                              newBlackoutWindows.push(removed);
                                            } else {
                                              // Move to migration
                                              const [removed] = newBlackoutWindows.splice(window.originalIndex, 1);
                                              newMigrationWindows.push(removed);
                                            }

                                            saveAutomationConfig({
                                              schedule: {
                                                ...automationConfig.schedule,
                                                migration_windows: newMigrationWindows,
                                                blackout_windows: newBlackoutWindows
                                              }
                                            });
                                            setEditingWindowIndex(null);
                                          }}
                                          className={`px-3 py-2 rounded text-sm font-semibold ${
                                            isMigration
                                              ? 'bg-green-600 text-white'
                                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                          }`}
                                        >
                                          Migration Window
                                        </button>
                                        <button
                                          onClick={() => {
                                            // Move window from one array to another
                                            const newMigrationWindows = [...migrationWindows];
                                            const newBlackoutWindows = [...blackoutWindows];

                                            if (isMigration) {
                                              // Move to blackout
                                              const [removed] = newMigrationWindows.splice(window.originalIndex, 1);
                                              newBlackoutWindows.push(removed);
                                            } else {
                                              // Move to migration
                                              const [removed] = newBlackoutWindows.splice(window.originalIndex, 1);
                                              newMigrationWindows.push(removed);
                                            }

                                            saveAutomationConfig({
                                              schedule: {
                                                ...automationConfig.schedule,
                                                migration_windows: newMigrationWindows,
                                                blackout_windows: newBlackoutWindows
                                              }
                                            });
                                            setEditingWindowIndex(null);
                                          }}
                                          className={`px-3 py-2 rounded text-sm font-semibold ${
                                            !isMigration
                                              ? 'bg-red-600 text-white'
                                              : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                          }`}
                                        >
                                          Blackout Window
                                        </button>
                                      </div>
                                    </div>

                                    {/* Window Name */}
                                    <div>
                                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Window Name</label>
                                      <input
                                        type="text"
                                        value={window.name}
                                        onChange={(e) => {
                                          const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                          const newWindows = [...targetArray];
                                          newWindows[window.originalIndex] = { ...window, name: e.target.value };

                                          saveAutomationConfig({
                                            schedule: {
                                              ...automationConfig.schedule,
                                              [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                            }
                                          });
                                        }}
                                        className="w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                      />
                                    </div>

                                    {/* Days of Week */}
                                    <div>
                                      <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Days of Week</label>
                                        <label className="flex items-center cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={window.days?.length === 7}
                                            onChange={(e) => {
                                              const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                              const newWindows = [...targetArray];
                                              newWindows[window.originalIndex] = {
                                                ...window,
                                                days: e.target.checked
                                                  ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                                  : []
                                              };

                                              saveAutomationConfig({
                                                schedule: {
                                                  ...automationConfig.schedule,
                                                  [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                                }
                                              });
                                            }}
                                            className={`w-4 h-4 border-gray-300 rounded ${
                                              isMigration ? 'text-green-600 focus:ring-green-500' : 'text-red-600 focus:ring-red-500'
                                            }`}
                                          />
                                          <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">All Days</span>
                                        </label>
                                      </div>
                                      <div className="grid grid-cols-4 gap-2">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                          <label key={day} className="flex items-center">
                                            <input
                                              type="checkbox"
                                              checked={window.days?.includes(day)}
                                              onChange={(e) => {
                                                const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                                const newWindows = [...targetArray];
                                                const currentDays = window.days || [];
                                                newWindows[window.originalIndex] = {
                                                  ...window,
                                                  days: e.target.checked
                                                    ? [...currentDays, day]
                                                    : currentDays.filter(d => d !== day)
                                                };

                                                saveAutomationConfig({
                                                  schedule: {
                                                    ...automationConfig.schedule,
                                                    [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                                  }
                                                });
                                              }}
                                              className={`w-4 h-4 border-gray-300 rounded ${
                                                isMigration ? 'text-green-600 focus:ring-green-500' : 'text-red-600 focus:ring-red-500'
                                              }`}
                                            />
                                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{day.slice(0, 3)}</span>
                                          </label>
                                        ))}
                                      </div>
                                    </div>

                                    {/* Start/End Time */}
                                    <div className="grid grid-cols-2 gap-3">
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Time</label>
                                        <div className="flex gap-2">
                                          <select
                                            value={window.start_time?.split(':')[0] || '00'}
                                            onChange={(e) => {
                                              const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                              const newWindows = [...targetArray];
                                              const currentMinute = window.start_time?.split(':')[1] || '00';
                                              newWindows[window.originalIndex] = { ...window, start_time: `${e.target.value}:${currentMinute}` };
                                              saveAutomationConfig({
                                                schedule: {
                                                  ...automationConfig.schedule,
                                                  [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                                }
                                              });
                                            }}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                          >
                                            {Array.from({ length: 24 }, (_, i) => (
                                              <option key={i} value={i.toString().padStart(2, '0')}>
                                                {i.toString().padStart(2, '0')}
                                              </option>
                                            ))}
                                          </select>
                                          <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                          <select
                                            value={window.start_time?.split(':')[1] || '00'}
                                            onChange={(e) => {
                                              const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                              const newWindows = [...targetArray];
                                              const currentHour = window.start_time?.split(':')[0] || '00';
                                              newWindows[window.originalIndex] = { ...window, start_time: `${currentHour}:${e.target.value}` };
                                              saveAutomationConfig({
                                                schedule: {
                                                  ...automationConfig.schedule,
                                                  [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                                }
                                              });
                                            }}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                          >
                                            {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                              <option key={minute} value={minute.toString().padStart(2, '0')}>
                                                {minute.toString().padStart(2, '0')}
                                              </option>
                                            ))}
                                            <option value="59">59 (End of Hour)</option>
                                          </select>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Time</label>
                                        <div className="flex gap-2">
                                          <select
                                            value={window.end_time?.split(':')[0] || '00'}
                                            onChange={(e) => {
                                              const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                              const newWindows = [...targetArray];
                                              const currentMinute = window.end_time?.split(':')[1] || '00';
                                              newWindows[window.originalIndex] = { ...window, end_time: `${e.target.value}:${currentMinute}` };
                                              saveAutomationConfig({
                                                schedule: {
                                                  ...automationConfig.schedule,
                                                  [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                                }
                                              });
                                            }}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                          >
                                            {Array.from({ length: 24 }, (_, i) => (
                                              <option key={i} value={i.toString().padStart(2, '0')}>
                                                {i.toString().padStart(2, '0')}
                                              </option>
                                            ))}
                                          </select>
                                          <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                          <select
                                            value={window.end_time?.split(':')[1] || '00'}
                                            onChange={(e) => {
                                              const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                              const newWindows = [...targetArray];
                                              const currentHour = window.end_time?.split(':')[0] || '00';
                                              newWindows[window.originalIndex] = { ...window, end_time: `${currentHour}:${e.target.value}` };
                                              saveAutomationConfig({
                                                schedule: {
                                                  ...automationConfig.schedule,
                                                  [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                                }
                                              });
                                            }}
                                            className="flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
                                          >
                                            {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                              <option key={minute} value={minute.toString().padStart(2, '0')}>
                                                {minute.toString().padStart(2, '0')}
                                              </option>
                                            ))}
                                            <option value="59">59 (End of Hour)</option>
                                          </select>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Done Button */}
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => setEditingWindowIndex(null)}
                                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold"
                                      >
                                        Done
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    {/* Type Badge */}
                                    <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                      isMigration
                                        ? 'bg-green-600 text-white'
                                        : 'bg-red-600 text-white'
                                    }`}>
                                      {isMigration ? 'MIGRATION' : 'BLACKOUT'}
                                    </span>

                                    {/* Window Info */}
                                    <div className="flex-1">
                                      <span className="font-medium text-gray-900 dark:text-white">
                                        {window.name || `${isMigration ? 'Migration' : 'Blackout'} ${window.originalIndex + 1}`}
                                      </span>
                                      <span className="text-sm text-gray-600 dark:text-gray-400 ml-2">
                                        {window.days?.join(', ')} {window.start_time}-{window.end_time}
                                      </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <button
                                      onClick={() => setEditingWindowIndex(idx)}
                                      className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        const windowId = `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}`;

                                        // Two-click pattern: first click sets confirm state, second click executes
                                        if (confirmRemoveWindow?.id === windowId) {
                                          // Second click - execute the removal
                                          const targetArray = isMigration ? migrationWindows : blackoutWindows;
                                          const newWindows = [...targetArray];
                                          newWindows.splice(window.originalIndex, 1);

                                          saveAutomationConfig({
                                            schedule: {
                                              ...automationConfig.schedule,
                                              [isMigration ? 'migration_windows' : 'blackout_windows']: newWindows
                                            }
                                          });
                                          setConfirmRemoveWindow(null);
                                        } else {
                                          // First click - set confirm state
                                          setConfirmRemoveWindow({ id: windowId, type: isMigration ? 'migration' : 'blackout' });
                                        }
                                      }}
                                      className={`px-2 py-1 text-white rounded text-sm ${
                                        confirmRemoveWindow?.id === `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}`
                                          ? 'bg-orange-600 hover:bg-orange-700'
                                          : 'bg-red-600 hover:bg-red-700'
                                      }`}
                                    >
                                      {confirmRemoveWindow?.id === `${isMigration ? 'migration' : 'blackout'}-${window.originalIndex}` ? 'Click to confirm' : 'Remove'}
                                    </button>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Add Window Form */}
                    {showTimeWindowForm ? (
                      <div className={`rounded-lg p-4 mb-3 border ${
                        newWindowData.type === 'migration'
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
                      }`}>
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Add Time Window</h4>
                        <div className="space-y-3">
                          {/* Type Toggle */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Window Type</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setNewWindowData({ ...newWindowData, type: 'migration' })}
                                className={`px-3 py-2 rounded text-sm font-semibold ${
                                  newWindowData.type === 'migration'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                Migration Window
                              </button>
                              <button
                                onClick={() => setNewWindowData({ ...newWindowData, type: 'blackout' })}
                                className={`px-3 py-2 rounded text-sm font-semibold ${
                                  newWindowData.type === 'blackout'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                Blackout Window
                              </button>
                            </div>
                          </div>

                          {/* Window Name */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Window Name
                            </label>
                            <input
                              type="text"
                              value={newWindowData.name}
                              onChange={(e) => setNewWindowData({ ...newWindowData, name: e.target.value })}
                              placeholder={newWindowData.type === 'migration' ? 'e.g., Weekend Maintenance' : 'e.g., Business Hours'}
                              className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                            />
                          </div>

                          {/* Days of Week */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Days of Week
                              </label>
                              <label className="flex items-center cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={newWindowData.days.length === 7}
                                  onChange={(e) => {
                                    setNewWindowData({
                                      ...newWindowData,
                                      days: e.target.checked
                                        ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
                                        : []
                                    });
                                  }}
                                  className={`w-4 h-4 border-gray-300 rounded ${
                                    newWindowData.type === 'migration'
                                      ? 'text-green-600 focus:ring-green-500'
                                      : 'text-red-600 focus:ring-red-500'
                                  }`}
                                />
                                <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400">All Days</span>
                              </label>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                <label key={day} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={newWindowData.days.includes(day)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setNewWindowData({ ...newWindowData, days: [...newWindowData.days, day] });
                                      } else {
                                        setNewWindowData({ ...newWindowData, days: newWindowData.days.filter(d => d !== day) });
                                      }
                                    }}
                                    className={`w-4 h-4 border-gray-300 rounded ${
                                      newWindowData.type === 'migration'
                                        ? 'text-green-600 focus:ring-green-500'
                                        : 'text-red-600 focus:ring-red-500'
                                    }`}
                                  />
                                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{day.slice(0, 3)}</span>
                                </label>
                              ))}
                            </div>
                          </div>

                          {/* Start/End Time */}
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Time Range
                              </label>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => setNewWindowData({ ...newWindowData, start_time: '00:00', end_time: '23:59' })}
                                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                >
                                  All Day
                                </button>
                                <button
                                  onClick={() => setNewWindowData({ ...newWindowData, start_time: '09:00', end_time: '17:00' })}
                                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                >
                                  Business Hours
                                </button>
                                <button
                                  onClick={() => setNewWindowData({ ...newWindowData, start_time: '22:00', end_time: '06:00' })}
                                  className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                >
                                  Night
                                </button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  Start Time
                                </label>
                                <div className="flex gap-2">
                                  <select
                                    value={newWindowData.start_time?.split(':')[0] || '00'}
                                    onChange={(e) => {
                                      const currentMinute = newWindowData.start_time?.split(':')[1] || '00';
                                      setNewWindowData({ ...newWindowData, start_time: `${e.target.value}:${currentMinute}` });
                                    }}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={i.toString().padStart(2, '0')}>
                                        {i.toString().padStart(2, '0')}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                  <select
                                    value={newWindowData.start_time?.split(':')[1] || '00'}
                                    onChange={(e) => {
                                      const currentHour = newWindowData.start_time?.split(':')[0] || '00';
                                      setNewWindowData({ ...newWindowData, start_time: `${currentHour}:${e.target.value}` });
                                    }}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                  >
                                    {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                      <option key={minute} value={minute.toString().padStart(2, '0')}>
                                        {minute.toString().padStart(2, '0')}
                                      </option>
                                    ))}
                                    <option value="59">59 (End of Hour)</option>
                                  </select>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                  End Time
                                </label>
                                <div className="flex gap-2">
                                  <select
                                    value={newWindowData.end_time?.split(':')[0] || '00'}
                                    onChange={(e) => {
                                      const currentMinute = newWindowData.end_time?.split(':')[1] || '00';
                                      setNewWindowData({ ...newWindowData, end_time: `${e.target.value}:${currentMinute}` });
                                    }}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                  >
                                    {Array.from({ length: 24 }, (_, i) => (
                                      <option key={i} value={i.toString().padStart(2, '0')}>
                                        {i.toString().padStart(2, '0')}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="flex items-center text-gray-500 dark:text-gray-400">:</span>
                                  <select
                                    value={newWindowData.end_time?.split(':')[1] || '00'}
                                    onChange={(e) => {
                                      const currentHour = newWindowData.end_time?.split(':')[0] || '00';
                                      setNewWindowData({ ...newWindowData, end_time: `${currentHour}:${e.target.value}` });
                                    }}
                                    className="flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
                                  >
                                    {Array.from({ length: 12 }, (_, i) => i * 5).map(minute => (
                                      <option key={minute} value={minute.toString().padStart(2, '0')}>
                                        {minute.toString().padStart(2, '0')}
                                      </option>
                                    ))}
                                    <option value="59">59 (End of Hour)</option>
                                  </select>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Save/Cancel Buttons */}
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                if (newWindowData.name && newWindowData.days.length > 0 && newWindowData.start_time && newWindowData.end_time) {
                                  const isMigration = newWindowData.type === 'migration';
                                  const targetArray = isMigration
                                    ? (automationConfig.schedule?.migration_windows || [])
                                    : (automationConfig.schedule?.blackout_windows || []);

                                  const { type, ...windowData } = newWindowData;

                                  saveAutomationConfig({
                                    schedule: {
                                      ...automationConfig.schedule,
                                      [isMigration ? 'migration_windows' : 'blackout_windows']: [...targetArray, windowData]
                                    }
                                  });

                                  setNewWindowData({ name: '', type: 'migration', days: [], start_time: '00:00', end_time: '00:00' });
                                  setShowTimeWindowForm(false);
                                } else {
                                  setError('Please fill in all fields');
                                }
                              }}
                              className={`px-4 py-2 rounded-lg text-sm font-semibold text-white ${
                                newWindowData.type === 'migration'
                                  ? 'bg-green-600 hover:bg-green-700'
                                  : 'bg-red-600 hover:bg-red-700'
                              }`}
                            >
                              Save Window
                            </button>
                            <button
                              onClick={() => {
                                setNewWindowData({ name: '', type: 'migration', days: [], start_time: '00:00', end_time: '00:00' });
                                setShowTimeWindowForm(false);
                              }}
                              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowTimeWindowForm(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold"
                      >
                        Add Time Window
                      </button>
                    )}
                  </div>
                  {/* Migration Logs & History */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Migration Logs & History</h2>
                        <span className="relative group inline-block">
                          <Info size={16} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700" style={{minWidth: '280px'}}>
                            <div className="font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-2">Migration Scoring System</div>
                            <div className="text-[11px] space-y-1">
                              <div className="text-gray-300">Migrations are scored using a penalty-based system:</div>
                              <div className="mt-2 space-y-0.5">
                                <div>• <span className="text-blue-300">CPU Load</span> × 30%</div>
                                <div>• <span className="text-blue-300">Memory Load</span> × 30%</div>
                                <div>• <span className="text-blue-300">IOWait</span> × 20%</div>
                                <div>• <span className="text-blue-300">Load Average</span> × 10%</div>
                                <div>• <span className="text-blue-300">Storage Pressure</span> × 10%</div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div className="text-gray-400">Lower penalty score = better target</div>
                                <div className="text-gray-400">Plus penalties for high usage & trends</div>
                              </div>
                              <div className="mt-2 pt-2 border-t border-gray-700">
                                <div><span className="text-green-400 font-semibold">70%+</span> = Excellent</div>
                                <div><span className="text-yellow-400 font-semibold">50-69%</span> = Good</div>
                                <div><span className="text-orange-400 font-semibold">30-49%</span> = Fair</div>
                                <div><span className="text-red-400 font-semibold">&lt;30%</span> = Poor</div>
                              </div>
                            </div>
                          </div>
                        </span>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-b border-gray-200 dark:border-gray-700 mb-4">
                      <div className="flex gap-4">
                        <button
                          onClick={() => setMigrationLogsTab('history')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            migrationLogsTab === 'history'
                              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          Migration History
                        </button>
                        <button
                          onClick={() => setMigrationLogsTab('logs')}
                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            migrationLogsTab === 'logs'
                              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                          }`}
                        >
                          Script Logs
                        </button>
                      </div>
                    </div>

                    {/* Migration History Table */}
                    {migrationLogsTab === 'history' && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0
                                ? `Showing ${((migrationHistoryPage - 1) * migrationHistoryPageSize) + 1}-${Math.min(migrationHistoryPage * migrationHistoryPageSize, automationStatus.recent_migrations.length)} of ${automationStatus.recent_migrations.length} migrations`
                                : 'No migrations'}
                            </div>
                            <select
                              value={migrationHistoryPageSize}
                              onChange={(e) => {
                                setMigrationHistoryPageSize(Number(e.target.value));
                                setMigrationHistoryPage(1);
                              }}
                              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                              <option value={5}>5 per page</option>
                              <option value={10}>10 per page</option>
                              <option value={25}>25 per page</option>
                              <option value={50}>50 per page</option>
                              <option value={100}>100 per page</option>
                            </select>
                          </div>
                          <button
                            onClick={fetchAutomationStatus}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2"
                          >
                            <RefreshCw size={14} />
                            Refresh
                          </button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Time</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">VM</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Migration</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Score</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Reason</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">Duration</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 ? (
                                (() => {
                                  const reversedMigrations = automationStatus.recent_migrations.slice().reverse();
                                  const startIndex = (migrationHistoryPage - 1) * migrationHistoryPageSize;
                                  const endIndex = startIndex + migrationHistoryPageSize;
                                  const paginatedMigrations = reversedMigrations.slice(startIndex, endIndex);
                                  return paginatedMigrations.map((migration) => {
                                  // Format timestamp
                                  let timeDisplay = '';
                                  if (migration.timestamp) {
                                    try {
                                      const timestamp = migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z';
                                      const migrationDate = new Date(timestamp);
                                      timeDisplay = migrationDate.toLocaleString();
                                    } catch (e) {
                                      timeDisplay = migration.timestamp;
                                    }
                                  }

                                  // Format duration
                                  const durationDisplay = migration.duration_seconds
                                    ? `${Math.floor(migration.duration_seconds / 60)}m ${migration.duration_seconds % 60}s`
                                    : '-';

                                  return (
                                    <tr key={migration.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                        {timeDisplay}
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                                          {migration.name}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">
                                          ID: {migration.vmid}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-xs">
                                        <div className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                                          <span className="font-mono">{migration.source_node}</span>
                                          <ArrowRight size={12} />
                                          <span className="font-mono">{migration.target_node}</span>
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-xs">
                                        {(migration.suitability_rating !== undefined || migration.target_node_score !== undefined) ? (
                                          (() => {
                                            // Convert raw penalty score to suitability percentage
                                            const suitabilityPercent = migration.suitability_rating !== undefined
                                              ? migration.suitability_rating
                                              : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));

                                            return (
                                          <div className="flex items-center gap-1">
                                            <span className={`font-semibold ${
                                              suitabilityPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                                              suitabilityPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                              suitabilityPercent >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                              'text-red-600 dark:text-red-400'
                                            }`}>
                                              {suitabilityPercent}%
                                            </span>
                                            <span className="relative group inline-block">
                                              <Info size={12} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                              <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                                                <div className="font-semibold mb-1 text-blue-400">Scoring Breakdown</div>
                                                <div className="text-[10px] space-y-0.5">
                                                  <div>Target: {migration.target_node}</div>
                                                  <div>Penalty Score: {migration.target_node_score?.toFixed(1) || 'N/A'}</div>
                                                  <div>Suitability: {suitabilityPercent}%</div>
                                                  <div className="border-t border-gray-700 pt-1 mt-1">
                                                    <div className="text-gray-400">Lower penalty = better target</div>
                                                    <div>• CPU Load × 30%</div>
                                                    <div>• Memory Load × 30%</div>
                                                    <div>• IOWait × 20%</div>
                                                    <div>• Load Avg × 10%</div>
                                                    <div>• Storage Pressure × 10%</div>
                                                    <div className="mt-1 text-gray-400">+ Penalties for high usage/trends</div>
                                                  </div>
                                                  {migration.target_node_score > 100 && (
                                                    <div className="border-t border-gray-700 pt-1 mt-1 text-red-400">
                                                      ⚠ Penalty score &gt;100 indicates heavy load/trends
                                                    </div>
                                                  )}
                                                </div>
                                              </div>
                                            </span>
                                          </div>
                                            );
                                          })()
                                        ) : (
                                          <span className="text-gray-400">N/A</span>
                                        )}
                                      </td>
                                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs">
                                        <div className="truncate" title={migration.reason}>
                                          {migration.reason}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                          <span className={`px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${
                                            migration.status === 'completed'
                                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                              : migration.status === 'failed'
                                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                              : migration.status === 'timeout'
                                              ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                          }`}>
                                            {migration.status === 'completed' && <CheckCircle size={12} />}
                                            {migration.status === 'failed' && <XCircle size={12} />}
                                            {migration.status === 'timeout' && <Clock size={12} />}
                                            {migration.status}
                                          </span>
                                          {migration.dry_run && (
                                            <span className="px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                              DRY RUN
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                        {durationDisplay}
                                      </td>
                                    </tr>
                                  );
                                });
                                })()
                              ) : (
                                <tr>
                                  <td colSpan="7" className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No migration history available
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination Controls */}
                        {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
                          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              Page {migrationHistoryPage} of {Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setMigrationHistoryPage(1)}
                                disabled={migrationHistoryPage === 1}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                              >
                                First
                              </button>
                              <button
                                onClick={() => setMigrationHistoryPage(migrationHistoryPage - 1)}
                                disabled={migrationHistoryPage === 1}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                              >
                                Previous
                              </button>
                              <button
                                onClick={() => setMigrationHistoryPage(migrationHistoryPage + 1)}
                                disabled={migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                              >
                                Next
                              </button>
                              <button
                                onClick={() => setMigrationHistoryPage(Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize))}
                                disabled={migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)}
                                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
                              >
                                Last
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Script Logs */}
                    {migrationLogsTab === 'logs' && (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {logRefreshTime && `Last updated: ${logRefreshTime}`}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch('/api/automigrate/logs?lines=500');
                                  const data = await response.json();
                                  if (data.success) {
                                    setAutomigrateLogs(data.logs);
                                    setLogRefreshTime(new Date().toLocaleTimeString());
                                  }
                                } catch (error) {
                                  console.error('Error fetching logs:', error);
                                }
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2"
                            >
                              <RefreshCw size={14} />
                              Refresh
                            </button>
                            <button
                              onClick={() => {
                                if (!automigrateLogs) return;
                                const blob = new Blob([automigrateLogs], { type: 'text/plain' });
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `automigrate-logs-${new Date().toISOString().split('T')[0]}.txt`;
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                window.URL.revokeObjectURL(url);
                              }}
                              disabled={!automigrateLogs}
                              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-2"
                            >
                              <Download size={14} />
                              Download
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-900 dark:bg-black rounded border border-gray-700 p-4 max-h-96 overflow-y-auto">
                          <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                            {automigrateLogs || 'Click "Refresh" to load logs...'}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notification Settings */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-gray-100/50 to-gray-200/50 dark:from-gray-700/30 dark:to-gray-800/30 backdrop-blur-sm"></div>
                    <div className="relative">
                      <button
                        onClick={() => setCollapsedSections(prev => ({ ...prev, notificationSettings: !prev.notificationSettings }))}
                        className="w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity"
                      >
                        <div className="flex items-center gap-3">
                          <Bell size={24} className="text-gray-400 dark:text-gray-500" />
                          <h2 className="text-xl font-bold text-gray-500 dark:text-gray-400">Notification Settings</h2>
                          <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs font-semibold rounded">
                            Coming Soon
                          </span>
                        </div>
                        <ChevronDown
                          size={24}
                          className={`text-gray-400 dark:text-gray-500 transition-transform ${collapsedSections.notificationSettings ? '-rotate-180' : ''}`}
                        />
                      </button>

                      {!collapsedSections.notificationSettings && (
                        <div className="space-y-4 opacity-50">
                          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                              <Info size={20} className="text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                              <div className="text-sm text-blue-800 dark:text-blue-300">
                                <p className="font-semibold mb-2">Notification features are planned for a future release.</p>
                                <p>Planned notification channels include:</p>
                                <ul className="list-disc list-inside ml-2 mt-2 space-y-1">
                                  <li>Email notifications for migration events</li>
                                  <li>Webhook integrations (Slack, Discord, Teams)</li>
                                  <li>Custom notification rules and filters</li>
                                  <li>Digest reports (daily/weekly summaries)</li>
                                </ul>
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <div className="font-semibold text-gray-400 dark:text-gray-500 mb-2">Email Notifications</div>
                              <div className="text-sm text-gray-400 dark:text-gray-500">
                                Configure SMTP settings and email recipients
                              </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <div className="font-semibold text-gray-400 dark:text-gray-500 mb-2">Webhooks</div>
                              <div className="text-sm text-gray-400 dark:text-gray-500">
                                Send migration events to external services
                              </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <div className="font-semibold text-gray-400 dark:text-gray-500 mb-2">Notification Rules</div>
                              <div className="text-sm text-gray-400 dark:text-gray-500">
                                Filter which events trigger notifications
                              </div>
                            </div>
                            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                              <div className="font-semibold text-gray-400 dark:text-gray-500 mb-2">Digest Reports</div>
                              <div className="text-sm text-gray-400 dark:text-gray-500">
                                Scheduled summary reports via email
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          }


          // Dashboard Page
          return (<>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
              <div className="max-w-7xl mx-auto">
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden">
                  {/* Minimal Header - Always Visible */}
                  <div className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div onMouseEnter={handleLogoHover} className={logoBalancing ? 'logo-balancing' : 'transition-transform'}>
                        <ProxBalanceLogo size={dashboardHeaderCollapsed ? 64 : 128} />
                      </div>
                      <div>
                        <h1 className={`font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 bg-clip-text text-transparent transition-all ${dashboardHeaderCollapsed ? 'text-xl' : 'text-3xl'}`}>ProxBalance</h1>
                        {!dashboardHeaderCollapsed && <p className="text-sm text-gray-500 dark:text-gray-400">Cluster Optimization</p>}
                        {dashboardHeaderCollapsed && data && data.nodes && (() => {
                          const nodes = Object.values(data.nodes);
                          const totalCPU = (nodes.reduce((sum, node) => sum + (node.cpu_percent || 0), 0) / nodes.length).toFixed(1);
                          const totalMemory = (nodes.reduce((sum, node) => sum + (node.mem_percent || 0), 0) / nodes.length).toFixed(1);
                          const onlineNodes = nodes.filter(node => node.status === 'online').length;
                          return (
                            <div className="flex items-center gap-4 mt-1 text-xs">
                              <span className="text-gray-600 dark:text-gray-400">
                                Nodes: <span className="font-semibold text-green-600 dark:text-green-400">{onlineNodes}/{nodes.length}</span>
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                CPU: <span className="font-semibold text-blue-600 dark:text-blue-400">{totalCPU}%</span>
                              </span>
                              <span className="text-gray-600 dark:text-gray-400">
                                RAM: <span className="font-semibold text-purple-600 dark:text-purple-400">{totalMemory}%</span>
                              </span>
                              {clusterHealth && (
                                <span className={`flex items-center gap-1 ${clusterHealth.quorate ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`} title={clusterHealth.quorate ? 'Cluster is quorate' : 'Cluster NOT quorate!'}>
                                  {clusterHealth.quorate ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
                                  <span className="font-semibold">Quorum</span>
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {systemInfo && systemInfo.updates_available && (
                        <button
                          onClick={() => setShowUpdateModal(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600"
                          title={`${systemInfo.commits_behind} update(s) available`}
                        >
                          <RefreshCw size={18} />
                          Update Available
                        </button>
                      )}
                      <a
                        href="https://github.com/Pr0zak/ProxBalance"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        title="View on GitHub"
                      >
                        <GitHub size={20} className="text-gray-700 dark:text-gray-300" />
                      </a>
                      <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      >
                        {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-700" />}
                      </button>
                      <button
                        onClick={() => setCurrentPage('settings')}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        title="Settings"
                      >
                        <Settings size={20} className="text-gray-700 dark:text-gray-300" />
                      </button>
                      <button
                        onClick={() => setDashboardHeaderCollapsed(!dashboardHeaderCollapsed)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                        title={dashboardHeaderCollapsed ? "Expand Header" : "Collapse Header"}
                      >
                        {dashboardHeaderCollapsed ? <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" /> : <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />}
                      </button>
                    </div>
                  </div>

                  {/* Expandable Content */}
                  {!dashboardHeaderCollapsed && (
                    <div className="px-6 pb-6">

                  {/* Cluster Resource Utilization */}
                  {data && data.nodes && (() => {
                    // Calculate cluster-wide totals
                    const nodes = Object.values(data.nodes);
                    const totalCPU = nodes.reduce((sum, node) => sum + (node.cpu_percent || 0), 0) / nodes.length;
                    const totalMemory = nodes.reduce((sum, node) => sum + (node.mem_percent || 0), 0) / nodes.length;
                    const totalIOWait = nodes.reduce((sum, node) => sum + (node.metrics?.current_iowait || 0), 0) / nodes.length;
                    const totalNodes = nodes.length;
                    const onlineNodes = nodes.filter(node => node.status === 'online').length;

                    return (
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
                              <Server size={24} className="text-white" />
                            </div>
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Cluster Resource Utilization</h3>
                              <p className="text-xs text-gray-600 dark:text-gray-400">{onlineNodes} of {totalNodes} nodes online</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* CPU Utilization */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">CPU</span>
                              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalCPU.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  totalCPU > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                  totalCPU > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                                style={{width: `${Math.min(100, totalCPU)}%`}}
                              ></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Average across all nodes
                            </div>
                          </div>

                          {/* Memory Utilization */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Memory</span>
                              <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">{totalMemory.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  totalMemory > 80 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                  totalMemory > 60 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  'bg-gradient-to-r from-purple-500 to-pink-500'
                                }`}
                                style={{width: `${Math.min(100, totalMemory)}%`}}
                              ></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Average across all nodes
                            </div>
                          </div>

                          {/* IOWait */}
                          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">IOWait</span>
                              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">{totalIOWait.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                              <div
                                className={`h-3 rounded-full transition-all duration-500 ${
                                  totalIOWait > 20 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                  totalIOWait > 10 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                  'bg-gradient-to-r from-green-500 to-emerald-500'
                                }`}
                                style={{width: `${Math.min(100, totalIOWait)}%`}}
                              ></div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                              Average across all nodes
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Server size={20} className="text-blue-600 dark:text-blue-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-500">Nodes</span>
                      </div>
                      <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{data.summary.total_nodes}</p>
                    </div>
                    <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <HardDrive size={20} className="text-green-600 dark:text-green-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-500">Guests</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">{data.summary.total_guests}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">{data.summary.vms} VMs, {data.summary.containers} CTs</p>
                    </div>
                    <div className="bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity size={20} className="text-yellow-600 dark:text-yellow-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-500">Recommendations</span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{recommendations.length}</p>
                    </div>
                    <div className="bg-purple-50 dark:bg-purple-900/30 p-4 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle size={20} className="text-purple-600 dark:text-purple-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-500">Tagged</span>
                      </div>
                      <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{data.summary.ignored_guests + data.summary.excluded_guests}</p>
                    </div>
                  </div>
                    </div>
                  )}
                </div>

                {/* Automated Migrations Status */}
                {automationStatus && (
                  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-lg shadow-md ${
                          automationStatus.enabled
                            ? 'bg-gradient-to-br from-green-600 to-emerald-600'
                            : 'bg-gradient-to-br from-gray-500 to-gray-600'
                        }`}>
                          <Clock size={24} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Automated Migrations</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Scheduled automatic balancing</p>
                        </div>
                        <button
                          onClick={() => toggleSection('automatedMigrations')}
                          className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                          title={collapsedSections.automatedMigrations ? "Expand section" : "Collapse section"}
                        >
                          {collapsedSections.automatedMigrations ? (
                            <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        {collapsedSections.automatedMigrations && (() => {
                          const now = new Date();
                          const last24h = now - (24 * 60 * 60 * 1000);
                          const last7d = now - (7 * 24 * 60 * 60 * 1000);

                          // Calculate 24h stats
                          const stats24h = automationStatus.recent_migrations ? automationStatus.recent_migrations.filter(m => {
                            const timestamp = m.timestamp.endsWith('Z') ? m.timestamp : m.timestamp + 'Z';
                            return new Date(timestamp) > last24h;
                          }) : [];
                          const success24h = stats24h.filter(m => m.status === 'completed').length;
                          const successRate24h = stats24h.length > 0 ? Math.round((success24h / stats24h.length) * 100) : 0;

                          // Calculate 7d stats
                          const stats7d = automationStatus.recent_migrations ? automationStatus.recent_migrations.filter(m => {
                            const timestamp = m.timestamp.endsWith('Z') ? m.timestamp : m.timestamp + 'Z';
                            return new Date(timestamp) > last7d;
                          }) : [];

                          return (
                            <div className="flex items-center gap-4">
                              {/* Dry run indicator */}
                              {automationStatus.dry_run && automationStatus.enabled && (
                                <div className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                  <span className="text-sm font-bold text-yellow-700 dark:text-yellow-300">DRY RUN MODE</span>
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Combined Status & Pause/Resume Button */}
                        <button
                          onClick={async () => {
                            if (!automationStatus.enabled) return;
                            try {
                              const response = await fetch('/api/automigrate/toggle-timer', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ active: !automationStatus.timer_active })
                              });
                              if (response.ok) {
                                fetchAutomationStatus();
                              } else {
                                console.error('Failed to toggle timer');
                              }
                            } catch (error) {
                              console.error('Error toggling timer:', error);
                            }
                          }}
                          disabled={!automationStatus.enabled}
                          className={`px-3 py-1.5 rounded-lg border text-sm font-semibold transition-colors flex items-center gap-2 ${
                            !automationStatus.enabled
                              ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
                              : automationStatus.timer_active
                              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 cursor-pointer'
                              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 cursor-pointer'
                          }`}
                          title={
                            !automationStatus.enabled
                              ? 'Enable automation in settings first'
                              : automationStatus.timer_active
                              ? 'Click to pause scheduled checks'
                              : 'Click to resume scheduled checks'
                          }
                        >
                          <div className={`w-2 h-2 rounded-full ${
                            !automationStatus.enabled
                              ? 'bg-gray-400'
                              : automationStatus.timer_active
                              ? 'bg-green-500 animate-pulse'
                              : 'bg-yellow-500'
                          }`}></div>
                          {!automationStatus.enabled
                            ? 'Disabled'
                            : automationStatus.timer_active
                            ? 'Active'
                            : 'Paused'
                          }
                          {automationStatus.enabled && (
                            automationStatus.timer_active ? <Pause size={14} /> : <Play size={14} />
                          )}
                        </button>

                        {/* Configure Button */}
                        <button
                          onClick={() => setCurrentPage('automation')}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
                        >
                          <Settings size={16} />
                          Configure
                        </button>

                        {/* Run Now Button */}
                        <button
                          type="button"
                          onClick={runAutomationNow}
                          disabled={!automationStatus.enabled || runningAutomation}
                          className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                            automationStatus.enabled && !runningAutomation
                              ? 'bg-green-600 hover:bg-green-700 text-white'
                              : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                          }`}
                          title={!automationStatus.enabled ? "Enable automation first" : runningAutomation ? "Running..." : "Run automation check now"}
                        >
                          {runningAutomation ? (
                            <>
                              <Loader size={14} className="animate-spin" />
                              Running...
                            </>
                          ) : (
                            <>
                              <Play size={14} />
                              Run Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {!collapsedSections.automatedMigrations && (
                    <>
                    {runNowMessage && (
                      <div className={`mb-4 p-3 rounded-lg text-sm ${
                        runNowMessage.type === 'success'
                          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300'
                          : runNowMessage.type === 'info'
                          ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300'
                          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300'
                      }`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 flex-1">
                            {runNowMessage.type === 'success' ? (
                              <CheckCircle size={16} className="mt-0.5 flex-shrink-0" />
                            ) : runNowMessage.type === 'info' ? (
                              <Info size={16} className="mt-0.5 flex-shrink-0" />
                            ) : (
                              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
                            )}
                            <span style={{whiteSpace: 'pre-line'}}>{runNowMessage.text}</span>
                          </div>
                          <button
                            onClick={() => setRunNowMessage(null)}
                            className="flex-shrink-0 hover:opacity-70 transition-opacity"
                            aria-label="Close message"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                    {automationStatus.dry_run && automationStatus.enabled && (
                      <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <AlertTriangle size={16} className="text-yellow-600 dark:text-yellow-400" />
                          <span className="font-semibold text-yellow-700 dark:text-yellow-300">DRY RUN MODE</span>
                          <span className="text-yellow-600 dark:text-yellow-400">- No actual migrations will be performed</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Automation Status</div>
                        <div className={`flex items-center gap-2 ${
                          automationStatus.timer_active
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-gray-600 dark:text-gray-400'
                        }`}>
                          <div className={`w-2 h-2 rounded-full ${
                            automationStatus.timer_active
                              ? 'bg-green-500 animate-pulse'
                              : 'bg-gray-400'
                          }`}></div>
                          <div className="text-sm font-semibold">
                            {automationStatus.timer_active ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                      <div className="bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Next Check</div>
                        <div className="flex items-center gap-2">
                          {(() => {
                            // Check if automated migrations are currently running
                            const hasRunningMigrations = automationStatus.in_progress_migrations &&
                              automationStatus.in_progress_migrations.some(m => m.initiated_by === 'automated');

                            // Priority 1: Show "Running" badge if migrations are active
                            if (hasRunningMigrations) {
                              return (
                                <span className="px-2 py-0.5 rounded-lg border text-xs font-semibold bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                                  Running
                                </span>
                              );
                            }

                            // Priority 2: Show countdown if next check time is available
                            if (automationStatus.next_check && automationStatus.enabled) {
                              const nextCheckTime = new Date(automationStatus.next_check);
                              const now = new Date();
                              const diffMs = nextCheckTime - now;
                              const diffMins = Math.floor(diffMs / 60000);

                              if (diffMins > 0) {
                                return (
                                  <div className="text-xs text-gray-600 dark:text-gray-300 font-medium">
                                    in {diffMins} {diffMins === 1 ? 'min' : 'mins'}
                                  </div>
                                );
                              } else {
                                // Show "Now" for 0 or negative (automation should be running/about to run)
                                return (
                                  <div className="text-xs text-green-600 dark:text-green-400 font-semibold">
                                    Now
                                  </div>
                                );
                              }
                            }

                            // Priority 3: Fallback to interval display
                            return (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                Every {automationStatus.check_interval_minutes} {automationStatus.check_interval_minutes === 1 ? 'min' : 'mins'}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Migration History Chart */}
                    {(() => {
                      const migrations = automationStatus.recent_migrations || [];
                      if (migrations.length === 0) return null;

                      // Group migrations by date (last 7 days)
                      const last7Days = Array.from({ length: 7 }, (_, i) => {
                        const date = new Date();
                        date.setDate(date.getDate() - (6 - i));
                        date.setHours(0, 0, 0, 0);
                        return date;
                      });

                      const dailyStats = last7Days.map(date => {
                        const dayStart = new Date(date);
                        const dayEnd = new Date(date);
                        dayEnd.setHours(23, 59, 59, 999);

                        const dayMigrations = migrations.filter(m => {
                          let timestamp = m.timestamp;
                          if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
                            timestamp += 'Z';
                          }
                          const migDate = new Date(timestamp);
                          return migDate >= dayStart && migDate <= dayEnd;
                        });

                        const successful = dayMigrations.filter(m => m.status === 'completed').length;
                        const failed = dayMigrations.filter(m => m.status === 'failed').length;
                        const skipped = dayMigrations.filter(m => m.status === 'skipped').length;

                        return {
                          date,
                          total: dayMigrations.length,
                          successful,
                          failed,
                          skipped,
                          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        };
                      });

                      const maxMigrations = Math.max(...dailyStats.map(d => d.total), 1);

                      return (
                        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Migration History (Last 7 Days)</h3>
                          <div className="flex items-end justify-between gap-1 h-32">
                            {dailyStats.map((day, idx) => {
                              const heightPercent = (day.total / maxMigrations) * 100;

                              return (
                                <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                  {/* Bar */}
                                  <div className="w-full flex flex-col-reverse gap-0.5" style={{ height: '100px' }}>
                                    {day.total > 0 ? (
                                      <>
                                        {day.successful > 0 && (
                                          <div
                                            className="w-full bg-green-500 dark:bg-green-600 rounded-t"
                                            style={{ height: `${(day.successful / day.total) * heightPercent}%` }}
                                            title={`${day.successful} successful`}
                                          />
                                        )}
                                        {day.failed > 0 && (
                                          <div
                                            className="w-full bg-red-500 dark:bg-red-600"
                                            style={{ height: `${(day.failed / day.total) * heightPercent}%` }}
                                            title={`${day.failed} failed`}
                                          />
                                        )}
                                        {day.skipped > 0 && (
                                          <div
                                            className="w-full bg-yellow-500 dark:bg-yellow-600 rounded-b"
                                            style={{ height: `${(day.skipped / day.total) * heightPercent}%` }}
                                            title={`${day.skipped} skipped`}
                                          />
                                        )}
                                      </>
                                    ) : (
                                      <div className="w-full h-1 bg-gray-200 dark:bg-gray-700 rounded" />
                                    )}
                                  </div>
                                  {/* Count */}
                                  <div className="text-xs font-semibold text-gray-900 dark:text-white">
                                    {day.total > 0 ? day.total : ''}
                                  </div>
                                  {/* Date Label */}
                                  <div className="text-[10px] text-gray-500 dark:text-gray-400 text-center">
                                    {day.label}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                          {/* Legend */}
                          <div className="flex items-center justify-center gap-4 mt-3 text-xs">
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-green-500 dark:bg-green-600 rounded"></div>
                              <span className="text-gray-600 dark:text-gray-400">Success</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-red-500 dark:bg-red-600 rounded"></div>
                              <span className="text-gray-600 dark:text-gray-400">Failed</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-3 h-3 bg-yellow-500 dark:bg-yellow-600 rounded"></div>
                              <span className="text-gray-600 dark:text-gray-400">Skipped</span>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {automationStatus.state && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Current Window:</span>
                          <span className="font-medium text-gray-900 dark:text-white">{automationStatus.state.current_window || 'Loading...'}</span>
                        </div>
                        {automationStatus.state.last_run && (
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600 dark:text-gray-400">Last Run:</span>
                            <span className="font-medium text-gray-900 dark:text-white">
                              {(() => {
                                // Handle both old string format and new object format
                                let timestamp = automationStatus.state.last_run;
                                if (typeof timestamp === 'object' && timestamp !== null) {
                                  timestamp = timestamp.timestamp;
                                }
                                if (timestamp && typeof timestamp === 'string') {
                                  if (!timestamp.endsWith('Z') && !timestamp.includes('+')) {
                                    timestamp += 'Z'; // Assume UTC if no timezone specified
                                  }
                                  return new Date(timestamp).toLocaleString();
                                }
                                return 'Never';
                              })()}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* In-Progress Migrations */}
                    {automationStatus.in_progress_migrations && automationStatus.in_progress_migrations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <RefreshCw size={14} className="animate-spin text-blue-600 dark:text-blue-400" />
                          Migrations In Progress
                        </h4>
                        <div className="space-y-2">
                          {automationStatus.in_progress_migrations.map((migration, idx) => {
                            // Calculate elapsed time with robust error handling
                            let elapsedTime = 'N/A';
                            if (migration.starttime && typeof migration.starttime === 'number' && migration.starttime > 0) {
                              try {
                                const elapsedSeconds = Math.floor(Date.now() / 1000 - migration.starttime);
                                if (elapsedSeconds >= 0) {
                                  const minutes = Math.floor(elapsedSeconds / 60);
                                  const seconds = elapsedSeconds % 60;
                                  elapsedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                                }
                              } catch (err) {
                                console.error('Error calculating elapsed time:', err);
                              }
                            }

                            // Determine if automated or manual
                            const isAutomated = migration.initiated_by === 'automated';

                            return (
                              <div key={idx} className={`text-sm rounded p-2 border-2 animate-pulse ${
                                isAutomated
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600'
                                  : 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-600'
                              }`}>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                                    <span className="text-gray-500 dark:text-gray-400 text-xs">
                                      {migration.source_node} → {migration.target_node || '?'}
                                    </span>
                                    {migration.type === 'VM' ? (
                                      <span className="px-1.5 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 text-[10px] font-semibold rounded border border-green-300 dark:border-green-600" title="Live migration (no downtime)">
                                        LIVE
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 text-[10px] font-semibold rounded border border-orange-300 dark:border-orange-600" title="Migration with restart (brief downtime)">
                                        RESTART
                                      </span>
                                    )}
                                    {!isAutomated && (
                                      <span className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 text-[10px] font-semibold rounded border border-purple-300 dark:border-purple-600">
                                        MANUAL
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                                      isAutomated
                                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                        : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                    }`}>
                                      <RefreshCw size={12} className="animate-spin" />
                                      Running
                                    </span>
                                    <button
                                      onClick={() => setCancelMigrationModal(migration)}
                                      className="px-2 py-0.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded text-xs font-semibold transition-colors flex items-center gap-1"
                                      title="Cancel migration"
                                    >
                                      <X size={12} />
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                                <div className={`mt-1 text-xs flex items-center gap-3 ${
                                  isAutomated
                                    ? 'text-gray-600 dark:text-gray-400'
                                    : 'text-purple-600 dark:text-purple-400'
                                }`}>
                                  {migration.starttime && migration.starttime > 0 ? (
                                    <span>Started: {new Date(migration.starttime * 1000).toLocaleTimeString()}</span>
                                  ) : (
                                    <span>Started: Unknown</span>
                                  )}
                                  <span className={`font-semibold ${
                                    isAutomated
                                      ? 'text-blue-600 dark:text-blue-400'
                                      : 'text-purple-600 dark:text-purple-400'
                                  }`}>Elapsed: {elapsedTime}</span>
                                </div>
                                {migration.progress && (
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between text-xs mb-1">
                                      <span className={isAutomated ? 'text-blue-600 dark:text-blue-400 font-semibold' : 'text-purple-600 dark:text-purple-400 font-semibold'}>
                                        Progress: {migration.progress.percentage}%
                                        {migration.progress.speed_mib_s && (
                                          <span className="ml-2 font-normal text-[10px]">
                                            ({migration.progress.speed_mib_s.toFixed(1)} MiB/s)
                                          </span>
                                        )}
                                      </span>
                                      <span className="text-gray-500 dark:text-gray-400 text-[10px]">
                                        {migration.progress.human_readable}
                                      </span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-300 ${
                                          isAutomated
                                            ? 'bg-blue-600 dark:bg-blue-500'
                                            : 'bg-purple-600 dark:bg-purple-500'
                                        }`}
                                        style={{ width: `${migration.progress.percentage}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Last Run Summary - Collapsible */}
                    {automationStatus.state?.last_run && typeof automationStatus.state.last_run === 'object' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setCollapsedSections(prev => ({...prev, lastRunSummary: !prev.lastRunSummary}))}
                          className="w-full flex items-center justify-between mb-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ClipboardList size={16} className="text-blue-600 dark:text-blue-400" />
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Last Run Summary</h4>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(automationStatus.state.last_run.timestamp).toLocaleString()}
                            </span>
                          </div>
                          {collapsedSections.lastRunSummary ? (
                            <ChevronDown size={18} className="text-gray-500" />
                          ) : (
                            <ChevronUp size={18} className="text-gray-500" />
                          )}
                        </button>

                        {!collapsedSections.lastRunSummary && (
                          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                            {/* Run Overview */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                              <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Status</div>
                                <div className={`text-sm font-bold ${
                                  automationStatus.state.last_run.status === 'success' ? 'text-green-600 dark:text-green-400' :
                                  automationStatus.state.last_run.status === 'partial' ? 'text-yellow-600 dark:text-yellow-400' :
                                  automationStatus.state.last_run.status === 'failed' ? 'text-red-600 dark:text-red-400' :
                                  'text-gray-600 dark:text-gray-400'
                                }`}>
                                  {automationStatus.state.last_run.status === 'success' ? '✓ Success' :
                                   automationStatus.state.last_run.status === 'partial' ? '◐ Partial' :
                                   automationStatus.state.last_run.status === 'failed' ? '✗ Failed' :
                                   automationStatus.state.last_run.status === 'no_action' ? '○ No Action' :
                                   automationStatus.state.last_run.status}
                                </div>
                              </div>
                              <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Migrations</div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                  {automationStatus.state.last_run.migrations_successful || 0} / {automationStatus.state.last_run.migrations_executed || 0}
                                </div>
                              </div>
                              <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Duration</div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                  {automationStatus.state.last_run.duration_seconds ? `${Math.floor(automationStatus.state.last_run.duration_seconds / 60)}m ${automationStatus.state.last_run.duration_seconds % 60}s` : 'N/A'}
                                </div>
                              </div>
                              <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Mode</div>
                                <div className="text-sm font-bold text-gray-900 dark:text-white">
                                  {automationStatus.state.last_run.mode === 'dry_run' ? '🧪 Dry Run' : '🚀 Live'}
                                </div>
                              </div>
                            </div>

                            {/* Decision Details */}
                            {automationStatus.state.last_run.decisions && automationStatus.state.last_run.decisions.length > 0 && (
                              <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3 mb-3 max-h-64 overflow-y-auto">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Decisions Made:</div>
                                <div className="space-y-2">
                                  {[...automationStatus.state.last_run.decisions].sort((a, b) => {
                                    // Sort by priority: executed/pending first, then skipped by rank, then filtered last
                                    const getOrder = (d) => {
                                      if (d.action === 'executed' || d.action === 'pending' || d.action === 'failed') return 0;
                                      if (d.action === 'skipped') return 1;
                                      return 2; // filtered
                                    };
                                    const orderA = getOrder(a);
                                    const orderB = getOrder(b);
                                    if (orderA !== orderB) return orderA - orderB;
                                    // Within same group, sort by priority rank
                                    return (a.priority_rank || 999) - (b.priority_rank || 999);
                                  }).map((decision, idx) => {
                                    const isExecuted = decision.action === 'executed' || decision.action === 'failed';
                                    const isPending = decision.action === 'pending';
                                    const borderColor = isExecuted ? 'border-green-500' :
                                                       isPending ? 'border-blue-500' :
                                                       decision.action === 'skipped' ? 'border-yellow-500' :
                                                       'border-gray-400';
                                    const bgColor = isExecuted ? 'bg-green-50 dark:bg-green-900/20' :
                                                   isPending ? 'bg-blue-50 dark:bg-blue-900/20' :
                                                   'bg-gray-50 dark:bg-gray-700';

                                    return (
                                      <div key={idx} className={`text-xs ${bgColor} rounded p-2 border-l-4 ${borderColor} ${isPending ? 'animate-pulse' : ''}`}>
                                        <div className="flex items-start justify-between">
                                          <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              {/* Priority Rank Badge */}
                                              {decision.priority_rank && (
                                                <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                                  decision.priority_rank === 1
                                                    ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                                                    : 'bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                                                }`}>
                                                  #{decision.priority_rank}
                                                </span>
                                              )}

                                              <span className="font-semibold text-gray-900 dark:text-white">
                                                {decision.action === 'filtered' ? '⊗' :
                                                 decision.action === 'skipped' ? '⏭' :
                                                 decision.action === 'pending' ? '🔄' :
                                                 decision.action === 'executed' ? '✅' : '✗'} {decision.name || `VM/CT ${decision.vmid}`}
                                              </span>

                                              {decision.type && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                  {decision.type}
                                                </span>
                                              )}

                                              {decision.distribution_balancing && (
                                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" title="Distribution Balancing">
                                                  ⚖️ Balance
                                                </span>
                                              )}
                                            </div>

                                            <span className="text-gray-600 dark:text-gray-400">
                                              {decision.source_node} → {decision.target_node}
                                              {decision.target_node_score && ` (score: ${decision.target_node_score})`}
                                            </span>
                                          </div>

                                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                            decision.action === 'executed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                            decision.action === 'pending' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                            decision.action === 'skipped' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                            decision.action === 'filtered' ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300' :
                                            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                          }`}>
                                            {decision.action}
                                          </span>
                                        </div>

                                        {/* Show selected_reason for executed, regular reason for others */}
                                        <div className="mt-1 text-gray-600 dark:text-gray-400">
                                          {decision.selected_reason || decision.reason}
                                        </div>

                                        {decision.confidence_score && (
                                          <div className="mt-1 text-blue-600 dark:text-blue-400 font-semibold text-[10px]">
                                            Confidence: {decision.confidence_score}%
                                          </div>
                                        )}

                                        {decision.error && (
                                          <div className="mt-1 text-red-600 dark:text-red-400 text-[10px]">
                                            Error: {decision.error}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* Safety Checks */}
                            {automationStatus.state.last_run.safety_checks && (
                              <div className="bg-white/60 dark:bg-gray-800/60 rounded p-3">
                                <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Safety Checks:</div>
                                <div className="grid grid-cols-1 gap-2 text-xs">
                                  <div className="flex items-start gap-2">
                                    <CheckCircle size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900 dark:text-white">Migration Window</div>
                                      <div className="text-gray-600 dark:text-gray-400">{automationStatus.state.last_run.safety_checks.migration_window}</div>
                                    </div>
                                  </div>
                                  <div className="flex items-start gap-2">
                                    <CheckCircle size={14} className="text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                                    <div className="flex-1">
                                      <div className="font-semibold text-gray-900 dark:text-white">Cluster Health</div>
                                      <div className="text-gray-600 dark:text-gray-400">{automationStatus.state.last_run.safety_checks.cluster_health}</div>
                                    </div>
                                  </div>
                                  <div className="text-gray-600 dark:text-gray-400">
                                    <span className="font-semibold text-gray-900 dark:text-white">Running migrations:</span> {automationStatus.state.last_run.safety_checks.running_migrations || 0}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 recent-auto-migrations">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Recent Auto-Migrations</h4>
                          <button
                            onClick={() => {
                              // Export migration history to CSV
                              const migrations = automationStatus.recent_migrations || [];
                              if (migrations.length === 0) return;

                              // CSV headers
                              const headers = ['Timestamp', 'VM ID', 'VM Name', 'Source Node', 'Target Node', 'Suitability %', 'Reason', 'Confidence Score', 'Status', 'Duration (s)', 'Dry Run', 'Window'];

                              // CSV rows
                              const rows = migrations.map(m => [
                                m.timestamp || '',
                                m.vmid || '',
                                m.name || '',
                                m.source_node || '',
                                m.target_node || '',
                                m.suitability_rating || m.target_node_score || '',
                                (m.reason || '').replace(/,/g, ';'), // Replace commas in reason
                                m.confidence_score || '',
                                m.status || '',
                                m.duration_seconds || '',
                                m.dry_run ? 'Yes' : 'No',
                                (m.window_name || '').replace(/,/g, ';')
                              ]);

                              // Combine headers and rows
                              const csv = [
                                headers.join(','),
                                ...rows.map(row => row.join(','))
                              ].join('\n');

                              // Create download link
                              const blob = new Blob([csv], { type: 'text/csv' });
                              const url = window.URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `proxbalance-migrations-${new Date().toISOString().split('T')[0]}.csv`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                              window.URL.revokeObjectURL(url);
                            }}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Export migration history to CSV"
                          >
                            <Download size={12} />
                            Export CSV
                          </button>
                        </div>
                        <div className="space-y-2">
                          {(() => {
                            // Deduplicate migrations by VMID+source+target, keeping only the most recent
                            const seen = new Map();
                            const uniqueMigrations = [];

                            // Sort by timestamp descending (most recent first)
                            const sortedMigrations = [...automationStatus.recent_migrations].sort((a, b) => {
                              return new Date(b.timestamp) - new Date(a.timestamp);
                            });

                            // Keep only first occurrence of each VMID+source+target combo
                            for (const migration of sortedMigrations) {
                              const key = `${migration.vmid}-${migration.source_node}-${migration.target_node}`;
                              if (!seen.has(key)) {
                                seen.set(key, true);
                                uniqueMigrations.push(migration);
                              }
                            }

                            return uniqueMigrations.slice(0, 3);
                          })().map((migration) => {

                            // Format timestamp
                            let timeDisplay = '';
                            if (migration.timestamp) {
                              try {
                                // Parse timestamp - add 'Z' if not present to indicate UTC
                                const timestamp = migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z';
                                const migrationDate = new Date(timestamp);
                                const now = new Date();
                                const diffMs = now - migrationDate;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);
                                const diffDays = Math.floor(diffMs / 86400000);

                                if (diffMins < 1) {
                                  timeDisplay = 'Just now';
                                } else if (diffMins < 60) {
                                  timeDisplay = `${diffMins}m ago`;
                                } else if (diffHours < 24) {
                                  timeDisplay = `${diffHours}h ago`;
                                } else if (diffDays < 7) {
                                  timeDisplay = `${diffDays}d ago`;
                                } else {
                                  timeDisplay = migrationDate.toLocaleDateString();
                                }
                              } catch (e) {
                                timeDisplay = '';
                              }
                            }

                            return (
                            <div key={migration.id} className="text-sm bg-white dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 flex-1">
                                  <span className="text-gray-900 dark:text-white font-medium">{migration.name} ({migration.vmid})</span>
                                  <span className="text-gray-500 dark:text-gray-400 text-xs">
                                    {migration.source_node} → {migration.target_node}
                                    {(migration.suitability_rating !== undefined || migration.target_node_score !== undefined) && (() => {
                                      // Convert raw penalty score to suitability percentage
                                      const suitabilityPercent = migration.suitability_rating !== undefined
                                        ? migration.suitability_rating
                                        : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));

                                      return (
                                      <span className="ml-1 text-[10px] inline-flex items-center gap-1">
                                        <span className="text-gray-600 dark:text-gray-400">Score:</span>{' '}
                                        <span className={`font-semibold ${
                                          suitabilityPercent >= 70 ? 'text-green-600 dark:text-green-400' :
                                          suitabilityPercent >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                          suitabilityPercent >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                          'text-red-600 dark:text-red-400'
                                        }`}>
                                          {suitabilityPercent}%
                                        </span>
                                        <span className="relative group inline-block">
                                          <Info size={10} className="text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" />
                                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700">
                                            <div className="font-semibold mb-1 text-blue-400">Scoring Breakdown</div>
                                            <div className="text-[10px] space-y-0.5">
                                              <div>Target: {migration.target_node}</div>
                                              <div>Penalty Score: {migration.target_node_score?.toFixed(1) || 'N/A'}</div>
                                              <div>Suitability: {suitabilityPercent}%</div>
                                              <div className="border-t border-gray-700 pt-1 mt-1">
                                                <div className="text-gray-400">Lower penalty = better target</div>
                                                <div>• CPU Load × 30%</div>
                                                <div>• Memory Load × 30%</div>
                                                <div>• IOWait × 20%</div>
                                                <div>• Load Avg × 10%</div>
                                                <div>• Storage Pressure × 10%</div>
                                                <div className="mt-1 text-gray-400">+ Penalties for high usage/trends</div>
                                              </div>
                                              {migration.target_node_score > 100 && (
                                                <div className="border-t border-gray-700 pt-1 mt-1 text-red-400">
                                                  ⚠ Penalty score &gt;100 indicates heavy load/trends
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </span>
                                      </span>
                                      );
                                    })()}
                                  </span>
                                  {migration.dry_run && (
                                    <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                                      DRY RUN
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {timeDisplay && (
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                      {timeDisplay}
                                    </span>
                                  )}
                                  <span className={`px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${
                                    migration.status === 'completed'
                                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                      : migration.status === 'failed'
                                      ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                      : migration.status === 'skipped'
                                      ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                      : migration.status === 'timeout'
                                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                                      : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                                  }`}>
                                    {migration.status === 'completed' && <CheckCircle size={12} />}
                                    {migration.status === 'failed' && <XCircle size={12} />}
                                    {migration.status === 'skipped' && <AlertTriangle size={12} />}
                                    {migration.status === 'timeout' && <Clock size={12} />}
                                    {migration.status}
                                  </span>
                                </div>
                              </div>
                              {migration.reason && (
                                <div className="mt-1 flex items-center gap-3">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {migration.reason}
                                  </span>
                                  <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                                    {migration.confidence_score !== undefined && (
                                      <span title="Penalty point reduction achieved by this migration">
                                        Improvement: +{(migration.confidence_score / 2).toFixed(1)}
                                      </span>
                                    )}
                                    {migration.duration_seconds !== undefined && migration.duration_seconds > 0 && (
                                      <>
                                        <span className="text-gray-400 dark:text-gray-600">•</span>
                                        <span title="Migration Duration">
                                          Duration: {migration.duration_seconds}s
                                        </span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                              {/* Error Message for Failed Migrations */}
                              {migration.status === 'failed' && (
                                <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded flex items-start gap-2">
                                  <XCircle size={14} className="text-red-600 dark:text-red-400 mt-0.5 shrink-0" />
                                  <div className="text-xs text-red-800 dark:text-red-300 flex-1">
                                    <span className="font-semibold">Error:</span> {migration.error || 'Migration failed (check logs for details)'}
                                  </div>
                                </div>
                              )}
                              {/* Rollback Detection */}
                              {(() => {
                                // Only show rollback warning if rollback detection is enabled in settings
                                if (!automationConfig?.rules?.rollback_detection_enabled) {
                                  return null;
                                }

                                // Use configured rollback window (default 24 hours if not set)
                                const rollbackWindowHours = automationConfig?.rules?.rollback_window_hours || 24;
                                const rollbackWindow = rollbackWindowHours * 60 * 60 * 1000; // Convert to ms
                                const currentTime = new Date(migration.timestamp.endsWith('Z') ? migration.timestamp : migration.timestamp + 'Z');

                                // Find potential rollback - look for migration where this VM went back
                                const rollback = automationStatus.recent_migrations.find(m => {
                                  if (m.vmid !== migration.vmid) return false;
                                  if (m.id === migration.id) return false;

                                  // Check if it's a rollback (went from target back to source)
                                  const isRollback = m.source_node === migration.target_node && m.target_node === migration.source_node;

                                  // Check time window
                                  const mTime = new Date(m.timestamp.endsWith('Z') ? m.timestamp : m.timestamp + 'Z');
                                  const timeDiff = Math.abs(mTime - currentTime);
                                  const withinWindow = timeDiff < rollbackWindow;

                                  return isRollback && withinWindow;
                                });

                                if (rollback) {
                                  return (
                                    <div className="mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded flex items-start gap-2">
                                      <AlertTriangle size={14} className="text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
                                      <div className="text-xs text-orange-800 dark:text-orange-300">
                                        <span className="font-semibold">Rollback Detected:</span> This VM was migrated back to its original node within {rollbackWindowHours} hour{rollbackWindowHours !== 1 ? 's' : ''}. This may indicate a problem with the target node or migration configuration.
                                      </div>
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Past Automation Runs */}
                    {runHistory.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
                          <Clock size={14} />
                          Past Automation Runs
                        </h4>
                        <div className="space-y-2">
                          {runHistory.slice(0, 5).map((run, idx) => {
                            const isExpanded = expandedRun === run.timestamp;

                            // Format timestamp
                            let timeDisplay = '';
                            try {
                              const timestamp = run.timestamp.endsWith('Z') ? run.timestamp : run.timestamp + 'Z';
                              const runDate = new Date(timestamp);
                              const now = new Date();
                              const diffMs = now - runDate;
                              const diffMins = Math.floor(diffMs / 60000);
                              const diffHours = Math.floor(diffMs / 3600000);
                              const diffDays = Math.floor(diffMs / 86400000);

                              if (diffMins < 1) {
                                timeDisplay = 'Just now';
                              } else if (diffMins < 60) {
                                timeDisplay = `${diffMins}m ago`;
                              } else if (diffHours < 24) {
                                timeDisplay = `${diffHours}h ago`;
                              } else if (diffDays < 7) {
                                timeDisplay = `${diffDays}d ago`;
                              } else {
                                timeDisplay = runDate.toLocaleDateString();
                              }
                            } catch (e) {
                              timeDisplay = '';
                            }

                            return (
                              <div key={idx} className="bg-gray-50 dark:bg-gray-800/50 rounded p-3 border border-gray-200 dark:border-gray-700">
                                <div
                                  className="flex items-center justify-between cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 rounded p-1 transition-colors"
                                  onClick={() => setExpandedRun(isExpanded ? null : run.timestamp)}
                                >
                                  <div className="flex items-center gap-2">
                                    {isExpanded ? <ChevronDown size={14} className="text-gray-600 dark:text-gray-400" /> : <ChevronRight size={14} className="text-gray-600 dark:text-gray-400" />}
                                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                                      {timeDisplay}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                                      run.status === 'success'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                        : run.status === 'partial'
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                        : run.status === 'no_action'
                                        ? 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                                    }`}>
                                      {run.status}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                                    <span>{run.migrations_executed || 0} migration{run.migrations_executed !== 1 ? 's' : ''}</span>
                                    <span>{run.duration_seconds || 0}s</span>
                                  </div>
                                </div>

                                {isExpanded && run.decisions && run.decisions.length > 0 && (
                                  <div className="mt-2 pl-5 space-y-1">
                                    <div className="text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                                      Decisions ({run.decisions.length})
                                    </div>
                                    {run.decisions.map((decision, didx) => (
                                      <div key={didx} className={`text-xs p-1.5 rounded ${
                                        decision.action === 'executed'
                                          ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700'
                                          : decision.action === 'pending'
                                          ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-700'
                                          : decision.action === 'skipped'
                                          ? 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700'
                                          : 'bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-600'
                                      }`}>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-1">
                                            {decision.action === 'executed' && <CheckCircle size={10} className="text-green-600 dark:text-green-400" />}
                                            {decision.action === 'pending' && <RefreshCw size={10} className="text-blue-600 dark:text-blue-400" />}
                                            {decision.action === 'skipped' && <Minus size={10} className="text-yellow-600 dark:text-yellow-400" />}
                                            {decision.action === 'filtered' && <XCircle size={10} className="text-gray-600 dark:text-gray-400" />}
                                            <span className="font-medium text-gray-900 dark:text-gray-100">{decision.name}</span>
                                            <span className="text-gray-500 dark:text-gray-400">({decision.vmid})</span>
                                            {decision.distribution_balancing && (
                                              <span className="ml-1" title="Distribution Balancing">⚖️</span>
                                            )}
                                          </div>
                                          {decision.priority_rank && (
                                            <span className="text-[10px] font-semibold text-gray-500 dark:text-gray-400">
                                              #{decision.priority_rank}
                                            </span>
                                          )}
                                        </div>
                                        {decision.reason && (
                                          <div className="text-[10px] text-gray-600 dark:text-gray-300 mt-0.5">
                                            {decision.reason}
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Activity Log */}
                    {automationStatus.state?.activity_log && automationStatus.state.activity_log.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Activity Log (Last Check)</h4>
                        <div className="space-y-2">
                          {automationStatus.state.activity_log.slice(0, 10).map((activity, idx) => {
                            // Format timestamp
                            let timeDisplay = '';
                            if (activity.timestamp) {
                              try {
                                const timestamp = activity.timestamp.endsWith('Z') ? activity.timestamp : activity.timestamp + 'Z';
                                const activityDate = new Date(timestamp);
                                const now = new Date();
                                const diffMs = now - activityDate;
                                const diffMins = Math.floor(diffMs / 60000);
                                const diffHours = Math.floor(diffMs / 3600000);

                                if (diffMins < 1) {
                                  timeDisplay = 'Just now';
                                } else if (diffMins < 60) {
                                  timeDisplay = `${diffMins}m ago`;
                                } else if (diffHours < 24) {
                                  timeDisplay = `${diffHours}h ago`;
                                } else {
                                  timeDisplay = activityDate.toLocaleDateString();
                                }
                              } catch (e) {
                                timeDisplay = '';
                              }
                            }

                            const isSkipped = activity.action === 'skipped';

                            return (
                              <div key={idx} className="text-xs bg-white dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600 flex items-center gap-2" title={activity.reason}>
                                {isSkipped && <MinusCircle size={14} className="text-yellow-600 dark:text-yellow-400 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900 dark:text-white">{activity.name}</span>
                                    <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 text-xs rounded">
                                      SKIPPED
                                    </span>
                                  </div>
                                  <div className="text-gray-600 dark:text-gray-400 mt-0.5 truncate">
                                    {activity.reason}
                                  </div>
                                </div>
                                {timeDisplay && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
                                    {timeDisplay}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    </>
                    )}
                  </div>
                )}


                {data && (
                  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg shadow-md">
                          <Tag size={24} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Guest Tag Management</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Manage ignore tags and affinity rules for all guests</p>
                        </div>
                        <button
                          onClick={() => toggleSection('taggedGuests')}
                          className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                          title={collapsedSections.taggedGuests ? "Expand section" : "Collapse section"}
                        >
                          {collapsedSections.taggedGuests ? (
                            <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    </div>

                    {collapsedSections.taggedGuests ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded">
                          <HardDrive size={18} className="text-gray-600 dark:text-gray-400" />
                          <div>
                            <div className="font-semibold text-gray-900 dark:text-white">Total Guests</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">{Object.keys(data.guests).length} guests</div>
                          </div>
                        </div>
                        {ignoredGuests.length > 0 && (
                          <div className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded">
                            <Shield size={18} className="text-yellow-600 dark:text-yellow-400" />
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">Ignored</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{ignoredGuests.length} guest{ignoredGuests.length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        )}
                        {excludeGuests.length > 0 && (
                          <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded">
                            <Shield size={18} className="text-blue-600 dark:text-blue-400" />
                            <div>
                              <div className="font-semibold text-gray-900 dark:text-white">Affinity Rules</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{excludeGuests.length} guest{excludeGuests.length !== 1 ? 's' : ''}</div>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        {/* Search and controls */}
                        <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
                          <div className="flex-1 min-w-[200px]">
                            <input
                              type="text"
                              placeholder="Search guests by ID, name, node..."
                              value={guestSearchFilter}
                              onChange={(e) => {
                                setGuestSearchFilter(e.target.value);
                                setGuestCurrentPage(1);
                              }}
                              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 dark:text-gray-400">Per page:</span>
                            <select
                              value={guestPageSize}
                              onChange={(e) => {
                                setGuestPageSize(Number(e.target.value));
                                setGuestCurrentPage(1);
                              }}
                              className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                            >
                              <option value="10">10</option>
                              <option value="25">25</option>
                              <option value="50">50</option>
                              <option value="100">100</option>
                            </select>
                          </div>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200 dark:border-gray-700">
                                <th
                                  onClick={() => {
                                    if (guestSortField === 'type') {
                                      setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setGuestSortField('type');
                                      setGuestSortDirection('asc');
                                    }
                                  }}
                                  className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                                >
                                  <div className="flex items-center gap-1">
                                    Type
                                    {guestSortField === 'type' && (
                                      <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </div>
                                </th>
                                <th
                                  onClick={() => {
                                    if (guestSortField === 'vmid') {
                                      setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setGuestSortField('vmid');
                                      setGuestSortDirection('asc');
                                    }
                                  }}
                                  className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                                >
                                  <div className="flex items-center gap-1">
                                    ID
                                    {guestSortField === 'vmid' && (
                                      <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </div>
                                </th>
                                <th
                                  onClick={() => {
                                    if (guestSortField === 'name') {
                                      setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setGuestSortField('name');
                                      setGuestSortDirection('asc');
                                    }
                                  }}
                                  className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                                >
                                  <div className="flex items-center gap-1">
                                    Name
                                    {guestSortField === 'name' && (
                                      <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </div>
                                </th>
                                <th
                                  onClick={() => {
                                    if (guestSortField === 'node') {
                                      setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setGuestSortField('node');
                                      setGuestSortDirection('asc');
                                    }
                                  }}
                                  className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                                >
                                  <div className="flex items-center gap-1">
                                    Node
                                    {guestSortField === 'node' && (
                                      <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </div>
                                </th>
                                <th
                                  onClick={() => {
                                    if (guestSortField === 'status') {
                                      setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setGuestSortField('status');
                                      setGuestSortDirection('asc');
                                    }
                                  }}
                                  className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                                >
                                  <div className="flex items-center gap-1">
                                    Status
                                    {guestSortField === 'status' && (
                                      <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </div>
                                </th>
                                <th
                                  onClick={() => {
                                    if (guestSortField === 'tags') {
                                      setGuestSortDirection(guestSortDirection === 'asc' ? 'desc' : 'asc');
                                    } else {
                                      setGuestSortField('tags');
                                      setGuestSortDirection('asc');
                                    }
                                  }}
                                  className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
                                >
                                  <div className="flex items-center gap-1">
                                    Tags
                                    {guestSortField === 'tags' && (
                                      <span>{guestSortDirection === 'asc' ? '↑' : '↓'}</span>
                                    )}
                                  </div>
                                </th>
                                {canMigrate && <th className="text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300">Actions</th>}
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                // Filter guests
                                let filteredGuests = Object.values(data.guests);
                                if (guestSearchFilter) {
                                  const searchLower = guestSearchFilter.toLowerCase();
                                  filteredGuests = filteredGuests.filter(guest =>
                                    guest.vmid.toString().includes(searchLower) ||
                                    (guest.name || '').toLowerCase().includes(searchLower) ||
                                    guest.node.toLowerCase().includes(searchLower) ||
                                    guest.type.toLowerCase().includes(searchLower) ||
                                    guest.status.toLowerCase().includes(searchLower)
                                  );
                                }

                                // Sort guests
                                filteredGuests.sort((a, b) => {
                                  let aVal, bVal;
                                  switch (guestSortField) {
                                    case 'vmid':
                                      aVal = a.vmid;
                                      bVal = b.vmid;
                                      break;
                                    case 'name':
                                      aVal = (a.name || '').toLowerCase();
                                      bVal = (b.name || '').toLowerCase();
                                      break;
                                    case 'node':
                                      aVal = a.node.toLowerCase();
                                      bVal = b.node.toLowerCase();
                                      break;
                                    case 'type':
                                      aVal = a.type.toLowerCase();
                                      bVal = b.type.toLowerCase();
                                      break;
                                    case 'status':
                                      aVal = a.status.toLowerCase();
                                      bVal = b.status.toLowerCase();
                                      break;
                                    case 'tags':
                                      // Sort by tag count (has_ignore + exclude_groups count)
                                      // Then by first tag alphabetically
                                      const aTagCount = (a.tags.has_ignore ? 1 : 0) + a.tags.exclude_groups.length;
                                      const bTagCount = (b.tags.has_ignore ? 1 : 0) + b.tags.exclude_groups.length;
                                      if (aTagCount !== bTagCount) {
                                        aVal = aTagCount;
                                        bVal = bTagCount;
                                      } else {
                                        // Same tag count, sort by tag name
                                        const aFirstTag = a.tags.has_ignore ? 'ignore' : (a.tags.exclude_groups[0] || '');
                                        const bFirstTag = b.tags.has_ignore ? 'ignore' : (b.tags.exclude_groups[0] || '');
                                        aVal = aFirstTag.toLowerCase();
                                        bVal = bFirstTag.toLowerCase();
                                      }
                                      break;
                                    default:
                                      aVal = a.vmid;
                                      bVal = b.vmid;
                                  }

                                  if (guestSortDirection === 'asc') {
                                    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                                  } else {
                                    return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
                                  }
                                });

                                // Pagination
                                const totalGuests = filteredGuests.length;
                                const totalPages = Math.ceil(totalGuests / guestPageSize);
                                const startIndex = (guestCurrentPage - 1) * guestPageSize;
                                const endIndex = startIndex + guestPageSize;
                                const paginatedGuests = filteredGuests.slice(startIndex, endIndex);

                                return (
                                  <>
                                    {paginatedGuests.map(guest => (
                              <tr key={guest.vmid} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                <td className="p-3">
                                  <span className={`px-2 py-1 text-xs rounded font-medium ${
                                    guest.type === 'VM' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                    'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                                  }`}>
                                    {guest.type}
                                  </span>
                                </td>
                                <td className="p-3 text-sm font-mono text-gray-900 dark:text-white">{guest.vmid}</td>
                                <td className="p-3 text-sm text-gray-900 dark:text-white">{guest.name}</td>
                                <td className="p-3 text-sm text-gray-600 dark:text-gray-400">{guest.node}</td>
                                <td className="p-3">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${
                                    guest.status === 'migrating' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                    guest.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                    'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                  }`}>
                                    {guest.status === 'migrating' && (
                                      <Loader size={12} className="animate-spin" />
                                    )}
                                    {guest.status}
                                  </span>
                                </td>
                                <td className="p-3">
                                  <div className="flex flex-wrap gap-1">
                                    {guest.tags.has_ignore && (
                                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium">
                                        ignore
                                        {canMigrate && (
                                          <button
                                            onClick={() => handleRemoveTag(guest, 'ignore')}
                                            className="hover:bg-yellow-300 dark:hover:bg-yellow-700 rounded-full p-0.5"
                                            title="Remove ignore tag"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </span>
                                    )}
                                    {guest.tags.all_tags?.includes('auto_migrate_ok') && (
                                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded font-medium">
                                        auto_migrate_ok
                                        {canMigrate && (
                                          <button
                                            onClick={() => handleRemoveTag(guest, 'auto_migrate_ok')}
                                            className="hover:bg-green-300 dark:hover:bg-green-700 rounded-full p-0.5"
                                            title="Remove auto_migrate_ok tag"
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </span>
                                    )}
                                    {guest.tags.exclude_groups.map(tag => (
                                      <span key={tag} className="inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium">
                                        {tag}
                                        {canMigrate && (
                                          <button
                                            onClick={() => handleRemoveTag(guest, tag)}
                                            className="hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5"
                                            title={`Remove tag "${tag}"`}
                                          >
                                            <X size={12} />
                                          </button>
                                        )}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                {canMigrate && (
                                  <td className="p-3">
                                    <button
                                      onClick={() => {
                                        setTagModalGuest(guest);
                                        setShowTagModal(true);
                                      }}
                                      className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors"
                                      title="Add tag"
                                    >
                                      <Plus size={12} />
                                      Add
                                    </button>
                                  </td>
                                )}
                              </tr>
                                    ))}
                                  </>
                                );
                              })()}
                            </tbody>
                          </table>
                        </div>

                        {/* Pagination controls */}
                        {(() => {
                          const filteredGuestsCount = guestSearchFilter
                            ? Object.values(data.guests).filter(guest => {
                                const searchLower = guestSearchFilter.toLowerCase();
                                return guest.vmid.toString().includes(searchLower) ||
                                  (guest.name || '').toLowerCase().includes(searchLower) ||
                                  guest.node.toLowerCase().includes(searchLower) ||
                                  guest.type.toLowerCase().includes(searchLower) ||
                                  guest.status.toLowerCase().includes(searchLower);
                              }).length
                            : Object.keys(data.guests).length;

                          const totalPages = Math.ceil(filteredGuestsCount / guestPageSize);

                          if (totalPages <= 1) return null;

                          const startIndex = (guestCurrentPage - 1) * guestPageSize + 1;
                          const endIndex = Math.min(guestCurrentPage * guestPageSize, filteredGuestsCount);

                          return (
                            <div className="mt-4 flex items-center justify-between">
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {startIndex}-{endIndex} of {filteredGuestsCount} guests
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => setGuestCurrentPage(1)}
                                  disabled={guestCurrentPage === 1}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  First
                                </button>
                                <button
                                  onClick={() => setGuestCurrentPage(guestCurrentPage - 1)}
                                  disabled={guestCurrentPage === 1}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  Previous
                                </button>
                                <span className="text-sm text-gray-700 dark:text-gray-300">
                                  Page {guestCurrentPage} of {totalPages}
                                </span>
                                <button
                                  onClick={() => setGuestCurrentPage(guestCurrentPage + 1)}
                                  disabled={guestCurrentPage === totalPages}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  Next
                                </button>
                                <button
                                  onClick={() => setGuestCurrentPage(totalPages)}
                                  disabled={guestCurrentPage === totalPages}
                                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700"
                                >
                                  Last
                                </button>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {data && (
                  <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
                          <Server size={24} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Cluster Map</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Visual cluster overview</p>
                        </div>
                        <button
                          onClick={() => toggleSection('clusterMap')}
                          className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                          title={collapsedSections.clusterMap ? "Expand section" : "Collapse section"}
                        >
                          {collapsedSections.clusterMap ? (
                            <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                      {!collapsedSections.clusterMap && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 dark:text-gray-400">View by:</span>
                          <div className="flex rounded-lg bg-gray-100 dark:bg-gray-700 p-1">
                            <button
                              onClick={() => setClusterMapViewMode('cpu')}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                clusterMapViewMode === 'cpu'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                              }`}
                            >
                              CPU
                            </button>
                            <button
                              onClick={() => setClusterMapViewMode('memory')}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                clusterMapViewMode === 'memory'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                              }`}
                            >
                              Memory
                            </button>
                            <button
                              onClick={() => setClusterMapViewMode('allocated')}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                clusterMapViewMode === 'allocated'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                              }`}
                            >
                              Allocated
                            </button>
                            <button
                              onClick={() => setClusterMapViewMode('disk_io')}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                clusterMapViewMode === 'disk_io'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                              }`}
                            >
                              Disk I/O
                            </button>
                            <button
                              onClick={() => setClusterMapViewMode('network')}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                clusterMapViewMode === 'network'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                              }`}
                            >
                              Network
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {!collapsedSections.clusterMap && (
                      <div className="relative" style={{minHeight: '400px'}}>
                        <div className="flex flex-wrap gap-8 justify-center items-start py-8">
                          {Object.values(data.nodes).map(node => {
                            const nodeGuests = Object.values(data.guests || {}).filter(g => g.node === node.name);
                            const maxResources = Math.max(...Object.values(data.guests || {}).map(g => {
                              if (clusterMapViewMode === 'cpu') {
                                // Use CPU usage %
                                return g.cpu_current || 0;
                              } else if (clusterMapViewMode === 'memory') {
                                // Use Memory usage %
                                return g.mem_max_gb > 0 ? ((g.mem_used_gb || 0) / g.mem_max_gb) * 100 : 0;
                              } else if (clusterMapViewMode === 'allocated') {
                                // Use allocated resources (cores + GB)
                                const cpuCores = g.cpu_cores || 0;
                                const memGB = g.mem_max_gb || 0;
                                return cpuCores + memGB;
                              } else if (clusterMapViewMode === 'disk_io') {
                                // Use disk I/O (read + write in MB/s)
                                const diskRead = (g.disk_read_bps || 0) / (1024 * 1024);
                                const diskWrite = (g.disk_write_bps || 0) / (1024 * 1024);
                                return diskRead + diskWrite;
                              } else if (clusterMapViewMode === 'network') {
                                // Use network I/O (in + out in MB/s)
                                const netIn = (g.net_in_bps || 0) / (1024 * 1024);
                                const netOut = (g.net_out_bps || 0) / (1024 * 1024);
                                return netIn + netOut;
                              } else {
                                // Default: Use CPU usage
                                return g.cpu_current || 0;
                              }
                            }), 1);

                            return (
                              <div key={node.name} className="flex flex-col items-center gap-4">
                                {/* Host Node */}
                                <div className="relative group">
                                  <div
                                    onClick={() => setSelectedNode(node)}
                                    className={`w-32 h-40 rounded-lg border-4 flex flex-col items-center justify-between p-2 overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${
                                    maintenanceNodes.has(node.name)
                                      ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-600 hover:border-yellow-600 dark:hover:border-yellow-500'
                                      : node.status === 'online'
                                      ? 'bg-gray-50 dark:bg-gray-900 border-blue-500 dark:border-blue-600 hover:border-blue-600 dark:hover:border-blue-500'
                                      : 'bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600'
                                  }`}>
                                    {/* Node header */}
                                    <div className="flex flex-col items-center z-10">
                                      <Server size={28} className={maintenanceNodes.has(node.name) ? 'text-yellow-600 dark:text-yellow-400' : node.status === 'online' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'} />
                                      <div className="text-sm font-bold text-gray-900 dark:text-white mt-1">{node.name}</div>
                                      {maintenanceNodes.has(node.name) && (
                                        <div className="text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500 text-white rounded mt-0.5">
                                          MAINTENANCE
                                        </div>
                                      )}
                                      <div className="text-xs text-gray-600 dark:text-gray-400">{nodeGuests.length} guests</div>
                                    </div>

                                    {/* Capacity indicators */}
                                    <div className="w-full space-y-2 z-10">
                                      {/* CPU Bar */}
                                      <div className="relative">
                                        <div className="text-xs mb-1">
                                          <span className="text-gray-600 dark:text-gray-400 font-medium">CPU</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              (node.cpu_percent || 0) > 80 ? 'bg-red-500' :
                                              (node.cpu_percent || 0) > 60 ? 'bg-yellow-500' :
                                              'bg-green-500'
                                            }`}
                                            style={{width: `${Math.min(100, node.cpu_percent || 0)}%`}}
                                          ></div>
                                        </div>
                                      </div>

                                      {/* Memory Bar */}
                                      <div className="relative">
                                        <div className="text-xs mb-1">
                                          <span className="text-gray-600 dark:text-gray-400 font-medium">MEM</span>
                                        </div>
                                        <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                              (node.mem_percent || 0) > 80 ? 'bg-red-500' :
                                              (node.mem_percent || 0) > 70 ? 'bg-yellow-500' :
                                              'bg-blue-500'
                                            }`}
                                            style={{width: `${Math.min(100, node.mem_percent || 0)}%`}}
                                          ></div>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Host tooltip */}
                                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white text-xs rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10">
                                    <div className="font-bold text-sm mb-2 text-blue-400 border-b border-gray-700 pb-2">{node.name}</div>
                                    {maintenanceNodes.has(node.name) && (
                                      <div className="text-yellow-400 font-bold bg-yellow-900/30 px-2 py-1 rounded mb-2">🔧 MAINTENANCE MODE</div>
                                    )}
                                    <div className="space-y-1.5">
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-300">CPU:</span>
                                        <span className="font-semibold text-green-400">{(node.cpu_percent || 0).toFixed(1)}%</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-300">Memory:</span>
                                        <span className="font-semibold text-blue-400">{(node.mem_percent || 0).toFixed(1)}%</span>
                                      </div>
                                      <div className="flex justify-between gap-4">
                                        <span className="text-gray-300">IOWait:</span>
                                        <span className="font-semibold text-purple-400">{(node.metrics?.current_iowait || 0).toFixed(1)}%</span>
                                      </div>
                                      <div className="flex justify-between gap-4 border-t border-gray-700 pt-1.5 mt-1.5">
                                        <span className="text-gray-300">Cores:</span>
                                        <span className="font-semibold text-orange-400">{node.cpu_cores || 0}</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Connection line */}
                                {nodeGuests.length > 0 && (
                                  <div className="w-0.5 h-8 bg-gradient-to-b from-blue-400 to-transparent dark:from-blue-600"></div>
                                )}

                                {/* Guests */}
                                <div className="flex flex-wrap gap-3 justify-center max-w-xs">
                                  {nodeGuests.map(guest => {
                                    const cpuUsage = guest.cpu_current || 0;
                                    const memPercent = guest.mem_max_gb > 0 ? ((guest.mem_used_gb || 0) / guest.mem_max_gb) * 100 : 0;

                                    let resourceValue;
                                    if (clusterMapViewMode === 'cpu') {
                                      // Use CPU usage %
                                      resourceValue = cpuUsage;
                                    } else if (clusterMapViewMode === 'memory') {
                                      // Use Memory usage %
                                      resourceValue = memPercent;
                                    } else if (clusterMapViewMode === 'allocated') {
                                      // Use allocated resources (cores + GB)
                                      const cpuCores = guest.cpu_cores || 0;
                                      const memGB = guest.mem_max_gb || 0;
                                      resourceValue = cpuCores + memGB;
                                    } else if (clusterMapViewMode === 'disk_io') {
                                      // Use disk I/O (read + write in MB/s)
                                      const diskRead = (guest.disk_read_bps || 0) / (1024 * 1024);
                                      const diskWrite = (guest.disk_write_bps || 0) / (1024 * 1024);
                                      resourceValue = diskRead + diskWrite;
                                    } else if (clusterMapViewMode === 'network') {
                                      // Use network I/O (in + out in MB/s)
                                      const netIn = (guest.net_in_bps || 0) / (1024 * 1024);
                                      const netOut = (guest.net_out_bps || 0) / (1024 * 1024);
                                      resourceValue = netIn + netOut;
                                    } else {
                                      // Default: Use CPU usage
                                      resourceValue = cpuUsage;
                                    }

                                    const sizeRatio = maxResources > 0 ? (resourceValue / maxResources) : 0.3;
                                    const size = Math.max(30, Math.min(80, 30 + (sizeRatio * 50)));

                                    const getGuestColor = () => {
                                      const guestType = (guest.type || '').toUpperCase();
                                      if (guestType === 'CT' || guestType === 'LXC') return 'bg-green-500 dark:bg-green-600';
                                      if (guestType === 'VM' || guestType === 'QEMU') return 'bg-purple-500 dark:bg-purple-600';
                                      return 'bg-gray-500 dark:bg-gray-600';
                                    };

                                    // Check migration status for this guest
                                    const isMigrating = guestsMigrating[guest.vmid] === true;
                                    const progress = migrationProgress[guest.vmid];
                                    const isCompleted = completedMigrations[guest.vmid] !== undefined;
                                    const isStopped = guest.status !== 'running';

                                    return (
                                      <div key={guest.vmid} className="relative group">
                                        <div
                                          className={`rounded-full ${getGuestColor()} flex items-center justify-center text-white font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer hover:ring-2 hover:ring-blue-400 ${isMigrating ? 'animate-pulse ring-2 ring-yellow-400' : ''} ${isCompleted ? 'ring-2 ring-green-400' : ''} ${isStopped ? 'opacity-40' : ''}`}
                                          style={{width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, size/4)}px`}}
                                          onClick={() => {
                                            if (!isMigrating) {
                                              setSelectedGuestDetails({...guest, currentNode: node.name});
                                            }
                                          }}
                                        >
                                          {guest.vmid}
                                        </div>

                                        {/* Migration status badge */}
                                        {isMigrating && (
                                          <div className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                            <RefreshCw size={12} className="animate-spin" />
                                          </div>
                                        )}

                                        {isCompleted && !isMigrating && (
                                          <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg">
                                            <CheckCircle size={12} />
                                          </div>
                                        )}

                                        {/* Mount Point Indicator - Border Dot (Top Right) */}
                                        {guest.mount_points?.has_mount_points && !isMigrating && !isCompleted && (
                                          <div
                                            className={`absolute -top-0.5 -right-0.5 ${
                                              guest.mount_points.has_unshared_bind_mount
                                                ? 'bg-orange-500'
                                                : 'bg-cyan-400'
                                            } rounded-full w-3 h-3 shadow-lg ring-2 ring-white dark:ring-gray-800`}
                                            title={`${guest.mount_points.mount_count} mount point(s)${guest.mount_points.has_shared_mount ? ' (shared - safe to migrate)' : ' (requires manual migration)'}`}
                                          />
                                        )}

                                        {/* Pinned Disk Indicator - Border Dot (Top Left) */}
                                        {guest.local_disks?.is_pinned && !isMigrating && !isCompleted && (
                                          <div
                                            className="absolute -top-0.5 -left-0.5 bg-red-500 rounded-full w-3 h-3 shadow-lg ring-2 ring-white dark:ring-gray-800"
                                            title={`Cannot migrate: ${guest.local_disks.pinned_reason} (${guest.local_disks.total_pinned_disks} disk(s))`}
                                          />
                                        )}

                                        {/* Guest tooltip */}
                                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white text-xs rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10">
                                          <div className="font-bold text-sm mb-2 text-blue-400 border-b border-gray-700 pb-2">
                                            {guest.name || `Guest ${guest.vmid}`}
                                            <span className="ml-2 text-gray-400 font-normal text-xs">
                                              ({((guest.type || '').toUpperCase() === 'VM' || (guest.type || '').toUpperCase() === 'QEMU') ? 'VM' : 'CT'})
                                            </span>
                                          </div>

                                          {isMigrating && (
                                            <div className="text-yellow-400 font-bold bg-yellow-900/30 px-2 py-1 rounded mb-2">
                                              🔄 Migrating... {progress?.percentage ? `${progress.percentage}%` : ''}
                                            </div>
                                          )}
                                          {isCompleted && !isMigrating && (
                                            <div className="text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded mb-2">
                                              ✓ Migration Complete
                                            </div>
                                          )}

                                          <div className="space-y-1.5">
                                            {clusterMapViewMode === 'allocated' ? (
                                              <>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-gray-300">CPU Cores:</span>
                                                  <span className="font-semibold text-orange-400">{guest.cpu_cores || 0}</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-gray-300">Memory Allocated:</span>
                                                  <span className="font-semibold text-blue-400">{(guest.mem_max_gb || 0).toFixed(1)} GB</span>
                                                </div>
                                              </>
                                            ) : (
                                              <>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-gray-300">CPU Usage:</span>
                                                  <span className="font-semibold text-green-400">{cpuUsage.toFixed(1)}%</span>
                                                </div>
                                                <div className="flex justify-between gap-4">
                                                  <span className="text-gray-300">Memory Usage:</span>
                                                  <span className="font-semibold text-blue-400">{memPercent.toFixed(1)}%</span>
                                                </div>
                                                <div className="text-gray-400 text-xs ml-auto">
                                                  ({(guest.mem_used_gb || 0).toFixed(1)} / {(guest.mem_max_gb || 0).toFixed(1)} GB)
                                                </div>
                                              </>
                                            )}

                                            <div className="flex justify-between gap-4">
                                              <span className="text-gray-300">Status:</span>
                                              <span className={`font-semibold ${guest.status === 'running' ? 'text-green-400' : 'text-gray-400'}`}>
                                                {guest.status}
                                              </span>
                                            </div>

                                            <div className="border-t border-gray-700 pt-1.5 mt-1.5 space-y-1">
                                              <div className="flex justify-between gap-4">
                                                <span className="text-gray-300">Disk Read:</span>
                                                <span className="font-semibold text-cyan-400">{((guest.disk_read_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                              </div>
                                              <div className="flex justify-between gap-4">
                                                <span className="text-gray-300">Disk Write:</span>
                                                <span className="font-semibold text-cyan-400">{((guest.disk_write_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                              </div>
                                              <div className="flex justify-between gap-4">
                                                <span className="text-gray-300">Net In:</span>
                                                <span className="font-semibold text-purple-400">{((guest.net_in_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                              </div>
                                              <div className="flex justify-between gap-4">
                                                <span className="text-gray-300">Net Out:</span>
                                                <span className="font-semibold text-purple-400">{((guest.net_out_bps || 0) / (1024 * 1024)).toFixed(2)} MB/s</span>
                                              </div>
                                            </div>

                                            {/* Mount Point Info */}
                                            {guest.mount_points?.has_mount_points && (
                                              <div className={`border-t border-gray-700 pt-1.5 mt-1.5 flex items-center gap-2 ${
                                                guest.mount_points.has_unshared_bind_mount ? 'text-orange-400' : 'text-green-400'
                                              } bg-gray-800/50 px-2 py-1 rounded`}>
                                                <Folder size={14} />
                                                <div className="flex flex-col">
                                                  <span className="text-xs font-semibold">
                                                    {guest.mount_points.mount_count} mount point{guest.mount_points.mount_count > 1 ? 's' : ''}
                                                    {guest.mount_points.has_shared_mount && ' (shared)'}
                                                    {guest.mount_points.has_unshared_bind_mount && ' (manual migration required)'}
                                                  </span>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Legend */}
                        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-purple-500 dark:bg-purple-600"></div>
                            <span>VM</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-green-500 dark:bg-green-600"></div>
                            <span>Container</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>
                              {clusterMapViewMode === 'cpu'
                                ? 'Circle size = CPU usage (%)'
                                : clusterMapViewMode === 'memory'
                                ? 'Circle size = Memory usage (%)'
                                : clusterMapViewMode === 'allocated'
                                ? 'Circle size = CPU cores + Memory allocated (GB)'
                                : clusterMapViewMode === 'disk_io'
                                ? 'Circle size = Disk I/O (Read + Write MB/s)'
                                : clusterMapViewMode === 'network'
                                ? 'Circle size = Network I/O (In + Out MB/s)'
                                : 'Circle size = CPU usage (%)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Node Details Modal (from Cluster Map click) */}
                {selectedNode && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedNode(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                      {/* Modal Header */}
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-3">
                          <Server size={28} className={maintenanceNodes.has(selectedNode.name) ? 'text-yellow-600 dark:text-yellow-400' : 'text-blue-600 dark:text-blue-400'} />
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedNode.name}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Node Details & Maintenance</p>
                          </div>
                          {maintenanceNodes.has(selectedNode.name) && (
                            <span className="px-2.5 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full">
                              MAINTENANCE
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedNode(null)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="p-6">
                        {/* Node Stats Grid */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Guests</div>
                            <div className="text-2xl font-bold text-gray-900 dark:text-white">
                              {selectedNode.guests ? Object.keys(selectedNode.guests).length : 0}
                            </div>
                          </div>
                          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4">
                            {/* Sparkline background */}
                            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-blue-600 dark:text-blue-400"
                                points={generateSparkline(selectedNode.cpu_percent || 0, 100, 40, 0.3)}
                              />
                            </svg>
                            <div className="relative z-10">
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">CPU Usage</div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(selectedNode.cpu_percent || 0).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{selectedNode.cpu_cores || 0} cores</div>
                            </div>
                          </div>
                          <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4">
                            {/* Sparkline background */}
                            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-purple-600 dark:text-purple-400"
                                points={generateSparkline(selectedNode.mem_percent || 0, 100, 40, 0.25)}
                              />
                            </svg>
                            <div className="relative z-10">
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">Memory Usage</div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(selectedNode.mem_percent || 0).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">{((selectedNode.mem_used || 0) / 1073741824).toFixed(1)} GB / {((selectedNode.mem_total || 0) / 1073741824).toFixed(1)} GB</div>
                            </div>
                          </div>
                          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4">
                            {/* Sparkline background */}
                            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="text-orange-600 dark:text-orange-400"
                                points={generateSparkline(selectedNode.metrics?.current_iowait || 0, 100, 40, 0.35)}
                              />
                            </svg>
                            <div className="relative z-10">
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">IOWait</div>
                              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                                {(selectedNode.metrics?.current_iowait || 0).toFixed(1)}%
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">I/O latency</div>
                            </div>
                          </div>
                        </div>

                        {/* Additional Node Info */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Status</div>
                            <div className={`text-lg font-semibold ${
                              selectedNode.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                            }`}>
                              {selectedNode.status || 'unknown'}
                            </div>
                          </div>
                          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Uptime</div>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white">
                              {selectedNode.uptime ? Math.floor(selectedNode.uptime / 86400) + 'd' : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Migration Suitability Metrics */}
                        {selectedNode.metrics && (
                          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <div className="flex items-center gap-2 mb-3">
                              <Activity size={16} className="text-blue-600 dark:text-blue-400" />
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Migration Target Suitability</h4>
                            </div>

                            {/* Overall Score Display */}
                            {nodeScores && nodeScores[selectedNode.name] && (
                              <div className="mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-300 dark:border-blue-600">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Suitability Rating</div>
                                    <div className={`text-2xl font-bold ${
                                      nodeScores[selectedNode.name].suitability_rating >= 70 ? 'text-green-600 dark:text-green-400' :
                                      nodeScores[selectedNode.name].suitability_rating >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                      nodeScores[selectedNode.name].suitability_rating >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                      'text-red-600 dark:text-red-400'
                                    }`}>
                                      {nodeScores[selectedNode.name].suitability_rating}%
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                                      nodeScores[selectedNode.name].suitable
                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                    }`}>
                                      {nodeScores[selectedNode.name].suitable ? (
                                        <><CheckCircle size={12} /> Suitable</>
                                      ) : (
                                        <><XCircle size={12} /> Not Suitable</>
                                      )}
                                    </div>
                                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                      {nodeScores[selectedNode.name].reason}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                              Weighted scoring used for recommendations: {penaltyConfig ? `${(penaltyConfig.weight_current * 100).toFixed(0)}% current, ${(penaltyConfig.weight_24h * 100).toFixed(0)}% 24h avg, ${(penaltyConfig.weight_7d * 100).toFixed(0)}% 7-day avg` : '50% current, 30% 24h avg, 20% 7-day avg'}
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                              <div className="bg-white dark:bg-gray-800 rounded p-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">CPU Score</div>
                                <div className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {(() => {
                                    const current = selectedNode.cpu_percent || 0;
                                    const short = selectedNode.metrics.avg_cpu || current;
                                    const long = selectedNode.metrics.avg_cpu_week || short;
                                    const wCurrent = penaltyConfig?.weight_current ?? 0.5;
                                    const w24h = penaltyConfig?.weight_24h ?? 0.3;
                                    const w7d = penaltyConfig?.weight_7d ?? 0.2;
                                    return ((current * wCurrent) + (short * w24h) + (long * w7d)).toFixed(1);
                                  })()}%
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Now: {(selectedNode.cpu_percent || 0).toFixed(1)}% | 24h: {(selectedNode.metrics.avg_cpu || 0).toFixed(1)}% | 7d: {(selectedNode.metrics.avg_cpu_week || 0).toFixed(1)}%
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded p-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Memory Score</div>
                                <div className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                                  {(() => {
                                    const current = selectedNode.mem_percent || 0;
                                    const short = selectedNode.metrics.avg_mem || current;
                                    const long = selectedNode.metrics.avg_mem_week || short;
                                    const wCurrent = penaltyConfig?.weight_current ?? 0.5;
                                    const w24h = penaltyConfig?.weight_24h ?? 0.3;
                                    const w7d = penaltyConfig?.weight_7d ?? 0.2;
                                    return ((current * wCurrent) + (short * w24h) + (long * w7d)).toFixed(1);
                                  })()}%
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Now: {(selectedNode.mem_percent || 0).toFixed(1)}% | 24h: {(selectedNode.metrics.avg_mem || 0).toFixed(1)}% | 7d: {(selectedNode.metrics.avg_mem_week || 0).toFixed(1)}%
                                </div>
                              </div>
                              <div className="bg-white dark:bg-gray-800 rounded p-2">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">IOWait Score</div>
                                <div className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                  {(() => {
                                    const current = selectedNode.metrics.current_iowait || 0;
                                    const short = selectedNode.metrics.avg_iowait || current;
                                    const long = selectedNode.metrics.avg_iowait_week || short;
                                    const wCurrent = penaltyConfig?.weight_current ?? 0.5;
                                    const w24h = penaltyConfig?.weight_24h ?? 0.3;
                                    const w7d = penaltyConfig?.weight_7d ?? 0.2;
                                    return ((current * wCurrent) + (short * w24h) + (long * w7d)).toFixed(1);
                                  })()}%
                                </div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Now: {(selectedNode.metrics.current_iowait || 0).toFixed(1)}% | 24h: {(selectedNode.metrics.avg_iowait || 0).toFixed(1)}% | 7d: {(selectedNode.metrics.avg_iowait_week || 0).toFixed(1)}%
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 italic">
                              Suitability Rating: 0-100% score showing how well the target node fits this VM (higher is better). Based on current load, sustained averages, and historical trends. <span className="text-green-600 dark:text-green-400 font-semibold">70%+</span> = Excellent, <span className="text-yellow-600 dark:text-yellow-400 font-semibold">50-69%</span> = Good, <span className="text-orange-600 dark:text-orange-400 font-semibold">30-49%</span> = Fair, <span className="text-red-600 dark:text-red-400 font-semibold">&lt;30%</span> = Poor.
                            </div>
                          </div>
                        )}

                        {/* Maintenance Mode Info */}
                        {maintenanceNodes.has(selectedNode.name) && (
                          <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                            <div className="flex items-start gap-3">
                              <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                                <p className="font-semibold mb-1">Maintenance Mode Active</p>
                                <p>This node is excluded from load balancing and migration recommendations. Use "Plan Evacuation" to migrate all VMs/CTs before performing maintenance tasks.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="space-y-3">
                          <button
                            onClick={() => {
                              if (maintenanceNodes.has(selectedNode.name)) {
                                // Remove from maintenance
                                setMaintenanceNodes(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(selectedNode.name);
                                  return newSet;
                                });
                              } else {
                                // Add to maintenance
                                setMaintenanceNodes(prev => new Set([...prev, selectedNode.name]));
                              }
                            }}
                            className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] ${
                              maintenanceNodes.has(selectedNode.name)
                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                                : 'bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white'
                            }`}
                          >
                            <span className="flex items-center justify-center gap-2">
                              {maintenanceNodes.has(selectedNode.name) ? (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  Exit Maintenance Mode
                                </>
                              ) : (
                                <>
                                  <AlertTriangle size={16} />
                                  Enter Maintenance Mode
                                </>
                              )}
                            </span>
                          </button>

                          <button
                            onClick={async () => {
                              if (!canMigrate) {
                                setError('Read-only API token (PVEAuditor) - Cannot perform migrations');
                                return;
                              }

                              const guestCount = selectedNode.guests ? Object.keys(selectedNode.guests).length : 0;
                              if (guestCount === 0) {
                                setError(`Node ${selectedNode.name} has no VMs/CTs to evacuate`);
                                return;
                              }

                              // Set planning state
                              // console.log('Setting planning state for:', selectedNode.name);
                              setPlanningNodes(prev => {
                                const newSet = new Set([...prev, selectedNode.name]);
                                // console.log('Planning nodes now:', Array.from(newSet));
                                return newSet;
                              });

                              // Fetch evacuation plan first
                              try {
                                const planResponse = await fetch(`${API_BASE}/nodes/evacuate`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({
                                    node: selectedNode.name,
                                    maintenance_nodes: Array.from(maintenanceNodes),
                                    confirm: false,  // Request plan only
                                    target_node: null,  // Auto-select target
                                    guest_targets: {}  // No per-guest overrides initially
                                  })
                                });

                                const planResult = await planResponse.json();
                                // console.log('Plan result:', planResult);

                                if (planResult.success && planResult.plan) {
                                  // Show the plan modal
                                  // console.log('Setting evacuation plan for node:', selectedNode.name);
                                  setEvacuationPlan(planResult);
                                  setPlanNode(selectedNode.name);
                                  setSelectedNode(null); // Close the node details modal
                                } else {
                                  console.error('Plan generation failed:', planResult);
                                  setError(`Failed to generate evacuation plan: ${planResult.error}`);
                                }
                              } catch (error) {
                                console.error('Plan fetch error:', error);
                                setError(`Error generating plan: ${error.message}`);
                              } finally {
                                // Clear planning state
                                // console.log('Clearing planning state for:', selectedNode.name);
                                setPlanningNodes(prev => {
                                  const newSet = new Set(prev);
                                  newSet.delete(selectedNode.name);
                                  // console.log('Planning nodes after clear:', Array.from(newSet));
                                  return newSet;
                                });
                              }
                            }}
                            disabled={!canMigrate || evacuatingNodes.has(selectedNode.name) || planningNodes.has(selectedNode.name) || !selectedNode.guests || Object.keys(selectedNode.guests).length === 0}
                            className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm transform ${
                              !canMigrate || !selectedNode.guests || Object.keys(selectedNode.guests).length === 0
                                ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60'
                                : planningNodes.has(selectedNode.name)
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white cursor-wait'
                                : evacuatingNodes.has(selectedNode.name)
                                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white cursor-wait'
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                            title={!canMigrate ? 'Read-only API token - Cannot migrate' : (!selectedNode.guests || Object.keys(selectedNode.guests).length === 0) ? 'No guests to evacuate' : ''}
                          >
                            {!canMigrate ? (
                              <span className="flex items-center justify-center gap-2">
                                <Lock size={16} />
                                Read-only Mode
                              </span>
                            ) : planningNodes.has(selectedNode.name) ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader className="animate-spin" size={16} />
                                Planning Migration...
                              </span>
                            ) : evacuatingNodes.has(selectedNode.name) ? (
                              <span className="flex items-center justify-center gap-2">
                                <Loader className="animate-spin" size={16} />
                                Evacuating...
                              </span>
                            ) : (!selectedNode.guests || Object.keys(selectedNode.guests).length === 0) ? (
                              <span className="flex items-center justify-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                                No Guests
                              </span>
                            ) : (
                              <span className="flex items-center justify-center gap-2">
                                <MoveRight size={16} />
                                Plan Evacuation
                              </span>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Guest Details Modal (from Cluster Map click) */}
                {selectedGuestDetails && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedGuestDetails(null)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      {/* Modal Header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${selectedGuestDetails.type === 'qemu' ? 'bg-purple-500' : 'bg-green-500'}`}>
                            {selectedGuestDetails.type === 'qemu' ? <HardDrive size={20} className="text-white" /> : <Package size={20} className="text-white" />}
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                              {selectedGuestDetails.name || `Guest ${selectedGuestDetails.vmid}`}
                            </h3>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {selectedGuestDetails.type === 'qemu' ? 'Virtual Machine' : 'Container'} #{selectedGuestDetails.vmid}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setSelectedGuestDetails(null)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X size={20} />
                        </button>
                      </div>

                      {/* Modal Body */}
                      <div className="p-4">
                        {/* Status Bar */}
                        <div className="flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2">
                            <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${
                              selectedGuestDetails.status === 'running' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                            }`}>
                              {selectedGuestDetails.status === 'running' ? <Activity size={12} /> : <AlertCircle size={12} />}
                              {selectedGuestDetails.status}
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400">on</span>
                            <span className="text-xs font-medium text-gray-900 dark:text-white">{selectedGuestDetails.currentNode}</span>
                          </div>
                        </div>

                        {/* Resource Usage - Compact 2-Column Grid with Sparklines */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {/* CPU */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded p-2 border border-blue-200 dark:border-blue-800">
                            {/* Sparkline background */}
                            <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="text-blue-600 dark:text-blue-400"
                                points={generateSparkline(selectedGuestDetails.cpu_current || 0, 100, 30, 0.3)}
                              />
                            </svg>
                            <div className="relative z-10">
                              <div className="text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium mb-0.5">CPU</div>
                              <div className="text-xl font-bold text-gray-900 dark:text-white">{(selectedGuestDetails.cpu_current || 0).toFixed(1)}%</div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">{selectedGuestDetails.cpu_cores || 0} cores</div>
                            </div>
                          </div>

                          {/* Memory */}
                          <div className="relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded p-2 border border-purple-200 dark:border-purple-800">
                            {/* Sparkline background */}
                            <svg className="absolute inset-0 w-full h-full opacity-30" preserveAspectRatio="none" viewBox="0 0 100 100">
                              <polyline
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                className="text-purple-600 dark:text-purple-400"
                                points={generateSparkline(selectedGuestDetails.mem_max_gb > 0 ? ((selectedGuestDetails.mem_used_gb / selectedGuestDetails.mem_max_gb) * 100) : 0, 100, 30, 0.25)}
                              />
                            </svg>
                            <div className="relative z-10">
                              <div className="text-[10px] uppercase tracking-wide text-purple-600 dark:text-purple-400 font-medium mb-0.5">Memory</div>
                              <div className="text-xl font-bold text-gray-900 dark:text-white">
                                {selectedGuestDetails.mem_max_gb > 0 ? ((selectedGuestDetails.mem_used_gb / selectedGuestDetails.mem_max_gb) * 100).toFixed(1) : 0}%
                              </div>
                              <div className="text-[10px] text-gray-500 dark:text-gray-400">
                                {(selectedGuestDetails.mem_used_gb || 0).toFixed(1)} / {(selectedGuestDetails.mem_max_gb || 0).toFixed(1)} GB
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* I/O Metrics - Compact 2-Column */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          {/* Disk I/O (Read/Write Stacked) */}
                          <div className="bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-200 dark:border-green-800">
                            <div className="text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400 font-medium mb-1">Disk I/O</div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-600 dark:text-gray-400">Read</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {((selectedGuestDetails.disk_read_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-600 dark:text-gray-400">Write</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {((selectedGuestDetails.disk_write_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Network I/O (In/Out Stacked) */}
                          <div className="bg-cyan-50 dark:bg-cyan-900/20 rounded p-2 border border-cyan-200 dark:border-cyan-800">
                            <div className="text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400 font-medium mb-1">Network I/O</div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-600 dark:text-gray-400">In</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {((selectedGuestDetails.net_in_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                                </span>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-gray-600 dark:text-gray-400">Out</span>
                                <span className="text-sm font-bold text-gray-900 dark:text-white">
                                  {((selectedGuestDetails.net_out_bps || 0) / (1024 * 1024)).toFixed(1)} MB/s
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        {selectedGuestDetails.tags && selectedGuestDetails.tags.all_tags && selectedGuestDetails.tags.all_tags.length > 0 && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                            <div className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium mb-1.5">Tags</div>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedGuestDetails.tags.all_tags.map((tag, idx) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Mount Points (Containers only) */}
                        {selectedGuestDetails.type === 'CT' && selectedGuestDetails.mount_points && selectedGuestDetails.mount_points.has_mount_points && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <button
                              onClick={() => setGuestModalCollapsed(prev => ({
                                ...prev,
                                mountPoints: !prev.mountPoints
                              }))}
                              className="flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <Folder size={16} className={`${
                                  selectedGuestDetails.mount_points.has_unshared_bind_mount
                                    ? 'text-orange-600 dark:text-orange-400'
                                    : 'text-green-600 dark:text-green-400'
                                }`} />
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Mount Points ({selectedGuestDetails.mount_points.mount_count})
                                </h4>
                              </div>
                              {guestModalCollapsed.mountPoints ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
                            </button>

                            {!guestModalCollapsed.mountPoints && (
                            <>
                            {/* Mount Points List */}
                            <div className="space-y-2">
                              {selectedGuestDetails.mount_points.mount_points && selectedGuestDetails.mount_points.mount_points.map((mp, idx) => (
                                <div key={idx} className={`p-3 rounded-lg border ${
                                  mp.is_bind_mount && !mp.is_shared
                                    ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                                    : mp.is_bind_mount && mp.is_shared
                                    ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700'
                                    : 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700'
                                }`}>
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-1">
                                        <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                          {mp.mount_path}
                                        </span>
                                        {mp.is_bind_mount && mp.is_shared && (
                                          <span className="px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded">
                                            SHARED
                                          </span>
                                        )}
                                        {mp.is_bind_mount && !mp.is_shared && (
                                          <span className="px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded">
                                            UNSHARED
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400">
                                        <span className="font-medium">Source:</span> <span className="font-mono">{mp.source}</span>
                                      </div>
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        <span className="font-medium">Type:</span> {mp.is_bind_mount ? 'Bind Mount' : 'Storage Mount'}
                                      </div>
                                    </div>
                                  </div>
                                  {mp.is_bind_mount && !mp.is_shared && (
                                    <div className="mt-2 pt-2 border-t border-orange-200 dark:border-orange-800">
                                      <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">
                                        ⚠️ Migration requires --restart --force and manual path verification on target node
                                      </p>
                                    </div>
                                  )}
                                  {mp.is_bind_mount && mp.is_shared && (
                                    <div className="mt-2 pt-2 border-t border-green-200 dark:border-green-800">
                                      <p className="text-xs text-green-700 dark:text-green-300 font-medium">
                                        ✓ Can be migrated (ensure path exists on target node)
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>

                            {/* Migration Warning/Info */}
                            {selectedGuestDetails.mount_points.has_unshared_bind_mount ? (
                              <div className="mt-3 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <AlertTriangle size={16} className="text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs text-orange-800 dark:text-orange-200">
                                    <p className="font-semibold mb-1">Manual Migration Required</p>
                                    <p>This container has unshared bind mounts that require manual intervention. Use <span className="font-mono bg-orange-200 dark:bg-orange-800 px-1">pct migrate {selectedGuestDetails.vmid} &lt;target&gt; --restart --force</span> and verify paths exist on target node.</p>
                                  </div>
                                </div>
                              </div>
                            ) : selectedGuestDetails.mount_points.has_shared_mount ? (
                              <div className="mt-3 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg">
                                <div className="flex items-start gap-2">
                                  <CheckCircle size={16} className="text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                                  <div className="text-xs text-green-800 dark:text-green-200">
                                    <p className="font-semibold mb-1">Safe to Migrate</p>
                                    <p>All bind mounts are marked as shared. Ensure these paths exist on the target node before migration.</p>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                            </>
                            )}
                          </div>
                        )}

                        {/* Local/Pinned Disks (VMs and CTs) */}
                        {selectedGuestDetails.local_disks && selectedGuestDetails.local_disks.is_pinned && (
                          <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
                            <button
                              onClick={() => setGuestModalCollapsed(prev => ({
                                ...prev,
                                passthroughDisks: !prev.passthroughDisks
                              }))}
                              className="flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="text-red-600 dark:text-red-400" />
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                                  Cannot Migrate - {selectedGuestDetails.local_disks.pinned_reason}
                                </h4>
                              </div>
                              {guestModalCollapsed.passthroughDisks ? <ChevronDown size={16} className="text-gray-500" /> : <ChevronUp size={16} className="text-gray-500" />}
                            </button>

                            {!guestModalCollapsed.passthroughDisks && (
                            <>
                            {/* Passthrough Disks */}
                            {selectedGuestDetails.local_disks.passthrough_disks && selectedGuestDetails.local_disks.passthrough_disks.length > 0 && (
                              <div className="mb-3">
                                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                  Passthrough Disks ({selectedGuestDetails.local_disks.passthrough_count})
                                </h5>
                                <div className="space-y-2">
                                  {selectedGuestDetails.local_disks.passthrough_disks.map((disk, idx) => (
                                    <div key={idx} className="p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-mono text-sm font-semibold text-gray-900 dark:text-white">
                                              {disk.key}
                                            </span>
                                            <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                                              HARDWARE PASSTHROUGH
                                            </span>
                                          </div>
                                          <div className="text-xs text-gray-600 dark:text-gray-400">
                                            <span className="font-medium">Device:</span> <span className="font-mono text-[11px]">{disk.device}</span>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                                        <p className="text-xs text-red-700 dark:text-red-300 font-medium">
                                          ⚠️ This disk is physically attached to the current node's hardware. Cannot be migrated.
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Summary Warning */}
                            <div className="mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg">
                              <div className="flex items-start gap-2">
                                <AlertTriangle size={16} className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-red-800 dark:text-red-200">
                                  <p className="font-semibold mb-1">Migration Blocked</p>
                                  <p>This {selectedGuestDetails.type} has {selectedGuestDetails.local_disks.total_pinned_disks} disk(s) that prevent automatic migration. Manual intervention required.</p>
                                </div>
                              </div>
                            </div>
                            </>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setSelectedGuestDetails(null)}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium"
                        >
                          Close
                        </button>
                        {canMigrate && selectedGuestDetails.status === 'running' && (
                          <button
                            onClick={() => {
                              setSelectedGuest(selectedGuestDetails);
                              setMigrationTarget('');
                              setShowMigrationDialog(true);
                              setSelectedGuestDetails(null);
                            }}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2"
                          >
                            <MoveRight size={16} />
                            Migrate
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Global Evacuation Plan Modal */}
                {evacuationPlan && planNode && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => {
                    setEvacuationPlan(null);
                    setPlanNode(null);
                    setGuestTargets({});
                  }}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          Evacuation Plan for {evacuationPlan.source_node}
                        </h3>
                        <button
                          onClick={() => {
                            setEvacuationPlan(null);
                            setPlanNode(null);
                            setGuestTargets({});
                          }}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X size={24} />
                        </button>
                      </div>

                      <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                        {evacuationPlan.will_skip > 0 && (
                          <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                              <span className="font-semibold">{evacuationPlan.will_skip}</span> guest(s) cannot be migrated. Reasons may include: missing storage on target nodes, errors, or "ignore" tag. These are shown in yellow below.
                            </p>
                          </div>
                        )}

                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">VM/CT</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Name</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Storage</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Target</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Will Restart?</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {evacuationPlan.plan.map((item) => (
                                <tr key={item.vmid} className={item.skipped ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}>
                                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.vmid}</td>
                                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.name}</td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded ${
                                      item.type === 'qemu' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300' :
                                      item.type === 'lxc' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300' :
                                      'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                    }`}>
                                      {item.type === 'qemu' ? 'VM' : item.type === 'lxc' ? 'CT' : 'Unknown'}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {item.storage_volumes && item.storage_volumes.length > 0 ? (
                                      <span className={`text-xs ${!item.storage_compatible ? 'text-red-600 dark:text-red-400 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                        {item.storage_volumes.join(', ')}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">none</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 text-xs rounded ${
                                      item.status === 'running' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                      item.status === 'stopped' ? 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300' :
                                      'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                                    }`}>
                                      {item.status}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    {item.skipped ? (
                                      <span className="text-yellow-600 dark:text-yellow-400 text-xs italic">{item.skip_reason}</span>
                                    ) : (
                                      <select
                                        value={guestTargets[item.vmid] || item.target}
                                        onChange={(e) => setGuestTargets({...guestTargets, [item.vmid]: e.target.value})}
                                        className="text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
                                      >
                                        {evacuationPlan.available_targets.map(target => (
                                          <option key={target} value={target}>{target}</option>
                                        ))}
                                      </select>
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {!item.skipped && (
                                      item.will_restart ? (
                                        <span className="text-orange-600 dark:text-orange-400 font-medium">Yes</span>
                                      ) : (
                                        <span className="text-green-600 dark:text-green-400">No</span>
                                      )
                                    )}
                                  </td>
                                  <td className="px-4 py-3">
                                    {item.skipped ? (
                                      <span className="text-xs text-gray-400 dark:text-gray-500 italic">N/A</span>
                                    ) : (
                                      <select
                                        value={guestActions[item.vmid] || 'migrate'}
                                        onChange={(e) => setGuestActions({...guestActions, [item.vmid]: e.target.value})}
                                        className="text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                      >
                                        <option value="migrate">Migrate</option>
                                        <option value="ignore">Ignore</option>
                                        <option value="poweroff">Power Off</option>
                                      </select>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded">
                          <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Important Notes:</h4>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                            <li>Running VMs will use live migration (no downtime)</li>
                            <li>Running containers will restart during migration (brief downtime)</li>
                            <li>Stopped VMs/CTs will be moved without starting</li>
                            <li>Migrations are performed one at a time to avoid overloading hosts</li>
                            <li>Available target nodes: {evacuationPlan.available_targets.join(', ')}</li>
                          </ul>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => {
                            setEvacuationPlan(null);
                            setPlanNode(null);
                            setGuestActions({});
                            setGuestTargets({});
                          }}
                          className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setShowConfirmModal(true)}
                          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
                        >
                          Review & Confirm
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Global Confirmation Modal */}
                {showConfirmModal && evacuationPlan && planNode && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setShowConfirmModal(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Evacuation</h3>
                        <button onClick={() => setShowConfirmModal(false)}>
                          <XCircle size={24} />
                        </button>
                      </div>

                      <div className="p-6">
                        {(() => {
                          const toMigrate = [];
                          const toIgnore = [];
                          const toPowerOff = [];

                          evacuationPlan.plan.forEach(item => {
                            if (item.skipped) return;
                            const action = guestActions[item.vmid] || 'migrate';
                            if (action === 'migrate') toMigrate.push(item);
                            else if (action === 'ignore') toIgnore.push(item);
                            else if (action === 'poweroff') toPowerOff.push(item);
                          });

                          return (
                            <div className="space-y-4">
                              {toMigrate.length > 0 && (
                                <div>
                                  <h4 className="text-lg font-semibold text-blue-600 mb-2">Migrate ({toMigrate.length})</h4>
                                  <div className="space-y-2">
                                    {toMigrate.map(item => (
                                      <div key={item.vmid} className="flex justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded">
                                        <span>{item.vmid} - {item.name}</span>
                                        <span>→ {item.target}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {toIgnore.length > 0 && (
                                <div>
                                  <h4 className="text-lg font-semibold text-gray-600 mb-2">Ignore ({toIgnore.length})</h4>
                                  <div className="text-sm text-gray-600">
                                    {toIgnore.map(item => item.vmid).join(', ')}
                                  </div>
                                </div>
                              )}
                              {toPowerOff.length > 0 && (
                                <div>
                                  <h4 className="text-lg font-semibold text-red-600 mb-2">Power Off ({toPowerOff.length})</h4>
                                  <div className="text-sm text-gray-600">
                                    {toPowerOff.map(item => item.vmid).join(', ')}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => setShowConfirmModal(false)}
                          className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={async () => {
                            setShowConfirmModal(false);
                            setEvacuatingNodes(prev => new Set([...prev, planNode]));

                            try {
                              const response = await fetch(`${API_BASE}/nodes/evacuate`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  node: planNode,
                                  maintenance_nodes: Array.from(maintenanceNodes),
                                  confirm: true,
                                  guest_actions: guestActions,
                                  guest_targets: guestTargets  // Include per-guest target overrides
                                })
                              });

                              const result = await response.json();
                              if (result.success) {
                                setEvacuationPlan(null);
                                setPlanNode(null);
                                setGuestActions({});
                                setGuestTargets({});  // Reset per-guest target overrides
                                // Success - evacuation tracking provides visual feedback
                                fetchGuestLocations(); // Refresh data
                              } else {
                                throw new Error(result.error || 'Failed to start evacuation');
                              }
                            } catch (error) {
                              console.error('Evacuation error:', error);
                              setError(`Error: ${error.message}`);
                            } finally {
                              setEvacuatingNodes(prev => {
                                const newSet = new Set(prev);
                                newSet.delete(planNode);
                                return newSet;
                              });
                            }
                          }}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
                        >
                          Confirm Evacuation
                        </button>
                      </div>
                    </div>
                  </div>
                )}


                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg shadow-md">
                        <HardDrive size={24} className="text-white" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Node Status</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Detailed node metrics</p>
                      </div>
                      <button
                        onClick={() => toggleSection('nodeStatus')}
                        className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                        title={collapsedSections.nodeStatus ? "Expand section" : "Collapse section"}
                      >
                        {collapsedSections.nodeStatus ? (
                          <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                        ) : (
                          <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                        )}
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Grid:</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map(cols => (
                            <button
                              key={cols}
                              onClick={() => setNodeGridColumns(cols)}
                              className={`px-3 py-1 text-sm rounded transition-colors ${
                                nodeGridColumns === cols
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                              }`}
                              title={`${cols} column${cols > 1 ? 's' : ''}`}
                            >
                              {cols}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-gray-600 dark:text-gray-400">Chart Period:</label>
                        <select
                          value={chartPeriod}
                          onChange={(e) => setChartPeriod(e.target.value)}
                          className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="1h">1 Hour</option>
                          <option value="6h">6 Hours</option>
                          <option value="12h">12 Hours</option>
                          <option value="24h">24 Hours</option>
                          <option value="7d">7 Days</option>
                          <option value="30d">30 Days</option>
                          <option value="1y">1 Year</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {collapsedSections.nodeStatus ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                      {Object.values(data.nodes).map(node => (
                        <div key={node.name} className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                            <span className={`w-2 h-2 rounded-full ${node.status === 'online' ? 'bg-green-500' : 'bg-red-500'}`} title={node.status}></span>
                          </div>
                          <div className="space-y-1.5 text-xs">
                            {/* CPU with sparkline */}
                            <div className="relative">
                              <div className="flex justify-between items-center relative z-10">
                                <span className="text-gray-600 dark:text-gray-400">CPU:</span>
                                <span className="font-semibold text-blue-600 dark:text-blue-400">
                                  {(node.cpu_percent || 0).toFixed(1)}%
                                </span>
                              </div>
                              <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                                <polyline
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-blue-500"
                                  points={generateSparkline(node.cpu_percent || 0, 100, 30, 0.3)}
                                />
                              </svg>
                            </div>

                            {/* Memory with sparkline */}
                            <div className="relative">
                              <div className="flex justify-between items-center relative z-10">
                                <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  {(node.mem_percent || 0).toFixed(1)}%
                                </span>
                              </div>
                              <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                                <polyline
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-purple-500"
                                  points={generateSparkline(node.mem_percent || 0, 100, 30, 0.25)}
                                />
                              </svg>
                            </div>

                            {/* IOWait with sparkline */}
                            <div className="relative">
                              <div className="flex justify-between items-center relative z-10">
                                <span className="text-gray-600 dark:text-gray-400">IOWait:</span>
                                <span className="font-semibold text-orange-600 dark:text-orange-400">
                                  {(node.metrics?.current_iowait || 0).toFixed(1)}%
                                </span>
                              </div>
                              <svg className="absolute inset-0 w-full h-full opacity-25" preserveAspectRatio="none" viewBox="0 0 100 100" style={{top: '-2px', height: 'calc(100% + 4px)'}}>
                                <polyline
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                  className="text-orange-500"
                                  points={generateSparkline(node.metrics?.current_iowait || 0, 100, 30, 0.35)}
                                />
                              </svg>
                            </div>

                            <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600">
                              <span className="text-gray-600 dark:text-gray-400">Suitability:</span>
                              <span className={`font-semibold ${
                                nodeScores && nodeScores[node.name] ? (
                                  nodeScores[node.name].suitability_rating >= 70 ? 'text-green-600 dark:text-green-400' :
                                  nodeScores[node.name].suitability_rating >= 50 ? 'text-yellow-600 dark:text-yellow-400' :
                                  nodeScores[node.name].suitability_rating >= 30 ? 'text-orange-600 dark:text-orange-400' :
                                  'text-red-600 dark:text-red-400'
                                ) : 'text-gray-900 dark:text-white'
                              }`}>
                                {nodeScores && nodeScores[node.name] ? `${nodeScores[node.name].suitability_rating}%` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600 dark:text-gray-400">Guests:</span>
                              <span className="font-semibold text-gray-900 dark:text-white">{node.guests?.length || 0}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                  <div className={`grid gap-4 transition-all duration-300 ease-in-out ${
                    nodeGridColumns === 1 ? 'grid-cols-1' :
                    nodeGridColumns === 2 ? 'grid-cols-1 lg:grid-cols-2' :
                    nodeGridColumns === 3 ? 'grid-cols-1 md:grid-cols-2 xl:grid-cols-3' :
                    'grid-cols-1 md:grid-cols-2 xl:grid-cols-4'
                  }`}>
                    {Object.values(data.nodes).map(node => (
                      <div key={node.name} className="border border-gray-200 dark:border-gray-700 rounded p-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{node.name}</h3>
                          <span className={`text-sm font-medium ${node.status === 'online' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{node.status}</span>
                        </div>

                        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 text-sm mb-4">
                          <div><span className="text-gray-600 dark:text-gray-400">CPU:</span> <span className="font-semibold text-blue-600 dark:text-blue-400">{(node.cpu_percent || 0).toFixed(1)}%</span></div>
                          <div><span className="text-gray-600 dark:text-gray-400">Memory:</span> <span className="font-semibold text-purple-600 dark:text-purple-400">{(node.mem_percent || 0).toFixed(1)}%</span></div>
                          <div><span className="text-gray-600 dark:text-gray-400">IOWait:</span> <span className="font-semibold text-orange-600 dark:text-orange-400">{(node.metrics?.current_iowait || 0).toFixed(1)}%</span></div>
                          <div><span className="text-gray-600 dark:text-gray-400">Cores:</span> <span className="font-semibold text-gray-900 dark:text-white">{node.cpu_cores || 0}</span></div>
                          <div><span className="text-gray-600 dark:text-gray-400">Guests:</span> <span className="font-semibold text-gray-900 dark:text-white">{node.guests?.length || 0}</span></div>
                        </div>

                        {node.trend_data && typeof node.trend_data === 'object' && Object.keys(node.trend_data).length > 0 && (
                          <div className="mt-4" style={{height: '200px'}}>
                            <canvas id={`chart-${node.name}`}></canvas>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  )}
                </div>

                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-24">
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg shadow-md">
                          <Activity size={24} className="text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Migration Recommendations</h2>
                            <button
                              onClick={() => toggleSection('recommendations')}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200"
                              title={collapsedSections.recommendations ? "Expand section" : "Collapse section"}
                            >
                              {collapsedSections.recommendations ? (
                                <ChevronDown size={20} className="text-gray-600 dark:text-gray-400" />
                              ) : (
                                <ChevronUp size={20} className="text-gray-600 dark:text-gray-400" />
                              )}
                            </button>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-sm text-gray-600 dark:text-gray-400">Suggested optimizations</p>
                            {recommendationData?.ai_enhanced && (
                              <span className="px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 border border-purple-300 dark:border-purple-600 rounded text-xs font-semibold text-purple-700 dark:text-purple-300">
                                AI Enhanced
                              </span>
                            )}
                            {recommendationData?.generated_at && (
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                • Generated: {(() => {
                                  const genTime = new Date(recommendationData.generated_at);
                                  return formatLocalTime(genTime);
                                })()} (backend auto-generates every 10-60min based on cluster size)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={generateRecommendations}
                          disabled={loadingRecommendations || !data}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200"
                          title="Manually generate new recommendations now"
                        >
                          {loadingRecommendations ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" />
                              Generating...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={18} />
                              Generate Now
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Score-Based Recommendation Info */}
                    {!collapsedSections.recommendations && (
                      <div className="mb-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-300 dark:border-blue-700">
                        <button
                          onClick={() => setCollapsedSections(prev => ({ ...prev, scoringInfo: !prev.scoringInfo }))}
                          className="w-full p-4 flex items-center justify-between hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <Info size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0" />
                            <span className="font-semibold text-sm text-blue-900 dark:text-blue-100">Penalty-Based Scoring System</span>
                          </div>
                          <ChevronDown
                            size={20}
                            className={`text-blue-600 dark:text-blue-400 transition-transform ${collapsedSections.scoringInfo ? '' : 'rotate-180'}`}
                          />
                        </button>
                        {!collapsedSections.scoringInfo && (
                          <div className="px-4 pb-4">
                            <div className="text-sm text-blue-900 dark:text-blue-100">
                              <p className="text-blue-800 dark:text-blue-200 mb-2">
                                ProxBalance uses a penalty-based scoring system to evaluate every guest on every node. Migrations are recommended when moving a guest would improve its suitability rating by <span className="font-bold">{penaltyConfig?.min_score_improvement || 15}+ points</span>.
                              </p>
                              <ul className="ml-4 space-y-1 text-blue-700 dark:text-blue-300 text-xs list-disc">
                                <li><span className="font-semibold">Suitability Rating:</span> 0-100% (lower penalties = higher rating). Penalties accumulate for unfavorable conditions.</li>
                                <li><span className="font-semibold">Time weighting:</span> Current load ({penaltyConfig ? (penaltyConfig.weight_current * 100).toFixed(0) : '50'}%), 24h average ({penaltyConfig ? (penaltyConfig.weight_24h * 100).toFixed(0) : '30'}%), 7-day average ({penaltyConfig ? (penaltyConfig.weight_7d * 100).toFixed(0) : '20'}%)</li>
                                <li><span className="font-semibold">Penalties applied for:</span> High CPU/memory/IOWait, rising trends, historical spikes, predicted post-migration overload</li>
                                <li><span className="font-semibold">Smart decisions:</span> Balances immediate needs with long-term stability and capacity planning</li>
                              </ul>
                              <div className="mt-3 text-xs">
                                <button
                                  onClick={() => {
                                    setCurrentPage('settings');
                                    setOpenPenaltyConfigOnSettings(true);
                                  }}
                                  className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
                                >
                                  Configure penalty scoring weights in Settings →
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {!collapsedSections.recommendations && (
                  <div className="transition-all duration-300 ease-in-out">
                  {loadingRecommendations ? (
                    <div className="text-center py-8">
                      <RefreshCw size={48} className="mx-auto mb-3 text-blue-500 dark:text-blue-400 animate-spin" />
                      <p className="font-medium text-gray-700 dark:text-gray-300">Generating recommendations...</p>
                      {recommendationData?.ai_enhanced && (
                        <p className="text-sm text-purple-600 dark:text-purple-400 mt-1">AI enhancement in progress</p>
                      )}
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <CheckCircle size={48} className="mx-auto mb-2 text-green-500 dark:text-green-400" />
                      <p className="font-medium">Cluster is balanced!</p>
                      <p className="text-sm">No migrations needed</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recommendations.map((rec, idx) => {
                        const key = `${rec.vmid}-${rec.target_node}`;
                        const status = migrationStatus[key];
                        const completed = completedMigrations[rec.vmid];
                        const isCompleted = completed !== undefined;
                        const isMaintenance = rec.reason && rec.reason.toLowerCase().includes('maintenance');

                        return (
                          <div key={idx} className={`border rounded p-4 transition-all duration-300 ${
                            isCompleted
                              ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75'
                              : isMaintenance
                              ? 'border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10'
                              : 'border-gray-200 dark:border-gray-700'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`font-semibold ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                                    [{rec.type} {rec.vmid}] {rec.name}
                                  </span>
                                  {rec.mount_point_info?.has_mount_points && (
                                    <span className={`flex items-center gap-1 px-2 py-0.5 ${
                                      rec.mount_point_info.has_unshared_bind_mount
                                        ? 'bg-orange-500'
                                        : 'bg-green-500'
                                    } text-white text-[10px] font-bold rounded`}
                                    title={`${rec.mount_point_info.mount_count} mount point(s)${rec.mount_point_info.has_shared_mount ? ' (shared - can migrate)' : ' (requires manual migration)'}`}>
                                      <Folder size={10} />
                                      {rec.mount_point_info.mount_count} MP
                                    </span>
                                  )}
                                  {isMaintenance && !isCompleted && (
                                    <span className="px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded">
                                      MAINTENANCE
                                    </span>
                                  )}
                                  {isCompleted && <CheckCircle size={18} className="text-green-600 dark:text-green-400" />}
                                  {status === 'failed' && <XCircle size={18} className="text-red-600 dark:text-red-400" />}
                                </div>
                                <div className={`text-sm mt-1 flex items-center gap-2 flex-wrap ${isCompleted ? 'text-green-600 dark:text-green-400' : ''}`}>
                                  {isCompleted ? (
                                    <>
                                      <span className="font-medium">MIGRATED:</span> {rec.source_node} → {completed.newNode} ✓
                                    </>
                                  ) : (
                                    <>
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-semibold">
                                        <span className="text-xs">FROM:</span>
                                        <span>{rec.source_node}</span>
                                      </span>
                                      <ArrowRight size={16} className="text-gray-400 dark:text-gray-500" />
                                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold">
                                        <span className="text-xs">TO:</span>
                                        <span>{rec.target_node}</span>
                                      </span>
                                      {rec.score_improvement !== undefined && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold ${
                                          rec.score_improvement >= 50 ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' :
                                          rec.score_improvement >= 30 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                          rec.score_improvement >= (penaltyConfig?.min_score_improvement || 15) ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' :
                                          'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                                        }`} title="How much better the target node is (penalty point reduction)">
                                          <span className="text-xs">Improvement:</span>
                                          <span className="text-sm">+{rec.score_improvement.toFixed(1)}</span>
                                        </span>
                                      )}
                                    </>
                                  )}
                                </div>
                                <div className={`text-xs mt-1 ${isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'}`}>
                                  <span className="font-medium">Reason:</span> <span className={isMaintenance ? 'font-bold text-yellow-600 dark:text-yellow-400' : ''}>{rec.reason}</span> | <span className="font-medium">Memory:</span> {(rec.mem_gb || 0).toFixed(1)} GB
                                  {rec.ai_confidence_adjustment && rec.ai_confidence_adjustment !== 0 && (
                                    <span className="ml-2" title="AI-adjusted confidence modification">
                                      | <span className="font-medium">AI Adjustment:</span>{' '}
                                      <span className={`font-semibold ${
                                        rec.ai_confidence_adjustment > 0 ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'
                                      }`}>
                                        {rec.ai_confidence_adjustment > 0 ? '+' : ''}{rec.ai_confidence_adjustment}
                                      </span>
                                    </span>
                                  )}
                                </div>
                                {rec.ai_insight && (
                                  <div className="mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs">
                                    <div className="flex items-start gap-2">
                                      <span className="text-purple-600 dark:text-purple-400 font-semibold shrink-0">AI:</span>
                                      <span className="text-gray-700 dark:text-gray-300">{rec.ai_insight}</span>
                                    </div>
                                  </div>
                                )}
                                {rec.bind_mount_warning && (
                                  <div className={`mt-2 p-2 ${
                                    rec.mount_point_info?.has_unshared_bind_mount
                                      ? 'bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-300 dark:border-orange-700'
                                      : 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-300 dark:border-green-700'
                                  } rounded text-xs`}>
                                    <div className="flex items-start gap-2">
                                      <Folder size={14} className={`shrink-0 ${
                                        rec.mount_point_info?.has_unshared_bind_mount
                                          ? 'text-orange-600 dark:text-orange-400'
                                          : 'text-green-600 dark:text-green-400'
                                      }`} />
                                      <span className="text-gray-700 dark:text-gray-300">{rec.bind_mount_warning}</span>
                                    </div>
                                  </div>
                                )}
                                <div className="mt-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const commandKey = `command-${idx}`;
                                      setCollapsedSections(prev => ({
                                        ...prev,
                                        [commandKey]: !prev[commandKey]
                                      }));
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    <Terminal size={12} />
                                    {collapsedSections[`command-${idx}`] ? 'Hide command' : 'Show command'}
                                  </button>
                                  {collapsedSections[`command-${idx}`] && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(rec.command);
                                        // Show tooltip or feedback
                                        const btn = e.currentTarget;
                                        const originalText = btn.textContent;
                                        btn.textContent = 'Copied!';
                                        btn.classList.add('bg-green-100', 'dark:bg-green-900');
                                        setTimeout(() => {
                                          btn.textContent = originalText;
                                          btn.classList.remove('bg-green-100', 'dark:bg-green-900');
                                        }, 1000);
                                      }}
                                      className={`text-xs font-mono p-2 rounded mt-1 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${
                                        isCompleted
                                          ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300'
                                          : 'bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300'
                                      }`}
                                      title="Click to copy"
                                    >
                                      {rec.command}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="ml-4 flex items-center gap-2 shrink-0">
                                {(() => {
                                  // If migration is completed, show "Migrated" badge
                                  if (isCompleted) {
                                    return (
                                      <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                                        <CheckCircle size={16} />
                                        Migrated
                                      </div>
                                    );
                                  }

                                  // Check if guest is migrating (from Proxmox API via guestsMigrating state)
                                  const isMigrating = guestsMigrating[rec.vmid] === true;
                                  const migrationKey = `${rec.vmid}-${rec.target_node}`;

                                  if (isMigrating && canMigrate) {
                                    const progress = migrationProgress[rec.vmid];
                                    let progressText = '';
                                    let tooltipText = 'Cancel migration in progress';

                                    if (progress) {
                                      if (progress.percentage) {
                                        progressText = ` ${progress.percentage}%`;
                                        if (progress.total_human_readable) {
                                          tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
                                        }
                                      } else {
                                        progressText = ` (${progress.human_readable})`;
                                      }
                                    }

                                    return (
                                      <button
                                        onClick={() => cancelMigration(rec.vmid, rec.target_node)}
                                        className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse"
                                        title={tooltipText}
                                      >
                                        <RefreshCw size={16} className="animate-spin" />
                                        Cancel{progressText}
                                      </button>
                                    );
                                  }

                                  return (
                                    <button
                                      onClick={() => setConfirmMigration(rec)}
                                      disabled={!canMigrate || status === 'running' || isMigrating}
                                      className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                                      title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : ''}
                                    >
                                      {!canMigrate ? (
                                        <>
                                          <Lock size={16} />
                                          Read-Only
                                        </>
                                      ) : isMigrating ? (
                                        <>
                                          <RefreshCw size={16} className="animate-spin" />
                                          Migrating...
                                        </>
                                      ) : status === 'running' ? (
                                        <>
                                          <RefreshCw size={16} className="animate-spin" />
                                          Starting...
                                        </>
                                      ) : (
                                        <>
                                          <Play size={16} />
                                          Migrate
                                        </>
                                      )}
                                    </button>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  </div>
                  )}
                </div>

                {config?.ai_recommendations_enabled && aiEnabled && (
                  <div className="hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-md">
                          <Activity size={24} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">AI-Enhanced Recommendations</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">AI-powered migration insights</p>
                        </div>
                        <button
                          onClick={() => toggleSection('aiRecommendations')}
                          className="ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200"
                          title={collapsedSections.aiRecommendations ? "Expand section" : "Collapse section"}
                        >
                          {collapsedSections.aiRecommendations ? (
                            <ChevronDown size={22} className="text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronUp size={22} className="text-gray-600 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Analysis Period:</label>
                          <select
                            value={aiAnalysisPeriod}
                            onChange={(e) => setAiAnalysisPeriod(e.target.value)}
                            className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                          >
                            <option value="1h">Last Hour</option>
                            <option value="6h">Last 6 Hours</option>
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                          </select>
                        </div>
                        <button
                          onClick={fetchAiRecommendations}
                          disabled={loadingAi}
                          className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400"
                        >
                          {loadingAi ? (
                            <>
                              <RefreshCw size={18} className="animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <RefreshCw size={18} />
                              Get AI Analysis
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {!collapsedSections.aiRecommendations && (
                    <div className="transition-all duration-300 ease-in-out">
                    {!aiRecommendations && !loadingAi && (
                      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                        <Activity size={48} className="mx-auto mb-2" />
                        <p className="font-medium">AI Analysis Available</p>
                        <p className="text-sm">Click "Get AI Analysis" to receive AI-powered migration recommendations</p>
                      </div>
                    )}

                    {aiRecommendations && !aiRecommendations.success && (
                      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4">
                        <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                          <AlertCircle size={20} />
                          <span className="font-medium">AI Analysis Error</span>
                        </div>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-2">{aiRecommendations.error}</p>
                      </div>
                    )}

                    {aiRecommendations && aiRecommendations.success && (
                      <div className="space-y-4">
                        {aiRecommendations.analysis && (
                          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                              <span className="font-medium text-blue-900 dark:text-blue-200">Cluster Analysis</span>
                            </div>
                            <p className="text-sm text-blue-800 dark:text-blue-200">{aiRecommendations.analysis}</p>
                          </div>
                        )}

                        {aiRecommendations.predicted_issues && aiRecommendations.predicted_issues.length > 0 && (
                          <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400" />
                              <span className="font-medium text-yellow-900 dark:text-yellow-200">Predicted Issues</span>
                            </div>
                            <div className="space-y-2">
                              {aiRecommendations.predicted_issues.map((issue, idx) => (
                                <div key={idx} className="text-sm text-yellow-800 dark:text-yellow-200">
                                  <span className="font-medium">{issue.node}</span> - {issue.prediction}
                                  <span className="ml-2 text-xs">({((issue.confidence || 0) * 100).toFixed(0)}% confidence)</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {aiRecommendations.recommendations && aiRecommendations.recommendations.length === 0 && (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <CheckCircle size={48} className="mx-auto mb-2 text-green-500 dark:text-green-400" />
                            <p className="font-medium">No AI Recommendations</p>
                            <p className="text-sm">AI analysis found cluster is well-balanced</p>
                          </div>
                        )}

                        {aiRecommendations.recommendations && aiRecommendations.recommendations.filter(rec => rec.priority !== 'skipped').length > 0 && (
                          <div className="space-y-4">
                            {aiRecommendations.recommendations.filter(rec => rec.priority !== 'skipped').map((rec, idx) => {
                              const key = `ai-${rec.vmid}-${rec.target_node}`;
                              const status = migrationStatus[key];
                              const completed = completedMigrations[rec.vmid];
                              const isCompleted = completed !== undefined;

                              const priorityColors = {
                                high: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200',
                                medium: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200',
                                low: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200'
                              };

                              const riskColor = rec.risk_score > 0.5 ? 'text-red-600 dark:text-red-400' :
                                               rec.risk_score > 0.2 ? 'text-yellow-600 dark:text-yellow-400' :
                                               'text-green-600 dark:text-green-400';

                              return (
                                <div key={idx} className={`border rounded-lg p-4 transition-all duration-300 ${
                                  isCompleted
                                    ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75'
                                    : priorityColors[rec.priority] || priorityColors.medium
                                }`}>
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="font-bold text-lg">[{rec.type} {rec.vmid}] {rec.name}</span>
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                          rec.priority === 'high' ? 'bg-red-600 text-white' :
                                          rec.priority === 'medium' ? 'bg-yellow-600 text-white' :
                                          'bg-green-600 text-white'
                                        }`}>
                                          {rec.priority} Priority
                                        </span>
                                      </div>

                                      <div className="text-sm mb-2">
                                        <span className="font-semibold text-red-700 dark:text-red-300">FROM:</span> {rec.source_node}
                                        <span className="mx-2">→</span>
                                        <span className="font-semibold text-green-700 dark:text-green-300">TO:</span> {rec.target_node}
                                      </div>

                                      <div className="bg-white dark:bg-gray-800 rounded p-3 mb-2">
                                        <div className="flex items-start gap-2 mb-1">
                                          <Shield size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                                          <div className="flex-1">
                                            <span className="font-semibold text-sm">AI Reasoning:</span>
                                            <p className="text-sm mt-1">{rec.reasoning}</p>
                                          </div>
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-2 text-xs mb-2">
                                        <AlertTriangle size={14} className={riskColor} />
                                        <span className="font-medium">Risk Score:</span>
                                        <span className={`font-bold ${riskColor}`}>{((rec.risk_score || 0) * 100).toFixed(0)}%</span>
                                      </div>

                                      {rec.estimated_impact && (
                                        <div className="bg-green-50 dark:bg-green-900/30 rounded p-2 text-xs">
                                          <span className="font-semibold">Expected Impact:</span> {rec.estimated_impact}
                                        </div>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-2 shrink-0">
                                      {(() => {
                                        // If migration is completed, show "Migrated" badge
                                        if (isCompleted) {
                                          return (
                                            <div className="px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2">
                                              <CheckCircle size={16} />
                                              Migrated
                                            </div>
                                          );
                                        }

                                        // Check if guest is migrating (from Proxmox API via guestsMigrating state)
                                        const isMigrating = guestsMigrating[rec.vmid] === true;
                                        const migrationKey = `${rec.vmid}-${rec.target_node}`;

                                        if (isMigrating && canMigrate) {
                                          const progress = migrationProgress[rec.vmid];
                                          let progressText = '';
                                          let tooltipText = 'Cancel migration in progress';

                                          if (progress) {
                                            if (progress.percentage) {
                                              progressText = ` ${progress.percentage}%`;
                                              if (progress.total_human_readable) {
                                                tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`;
                                              }
                                            } else {
                                              progressText = ` (${progress.human_readable})`;
                                            }
                                          }

                                          return (
                                            <button
                                              onClick={() => cancelMigration(rec.vmid, rec.target_node)}
                                              className="px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse"
                                              title={tooltipText}
                                            >
                                              <RefreshCw size={16} className="animate-spin" />
                                              Cancel{progressText}
                                            </button>
                                          );
                                        }

                                        return (
                                          <button
                                            onClick={() => {
                                              // console.log(`[AI Migration] Starting migration for VMID ${rec.vmid} from ${rec.source_node} to ${rec.target_node}`);
                                              // Use the AI-specific key format
                                              const aiKey = `ai-${rec.vmid}-${rec.target_node}`;
                                              setMigrationStatus(prev => ({ ...prev, [aiKey]: 'running' }));

                                              fetch(`${API_BASE}/migrate`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                  source_node: rec.source_node,
                                                  vmid: rec.vmid,
                                                  target_node: rec.target_node,
                                                  type: rec.type
                                                })
                                              })
                                              .then(response => response.json())
                                              .then(result => {
                                                // console.log(`[AI Migration] API response for VMID ${rec.vmid}:`, result);
                                                if (result.success) {
                                                  // console.log(`[AI Migration] Migration started successfully, calling trackMigration with taskId: ${result.task_id}`);
                                                  // Start tracking (button logic will prioritize activeMigrations over migrationStatus)
                                                  trackMigration(rec.vmid, result.source_node, result.target_node, result.task_id, rec.type);
                                                  // Migration tracking provides visual feedback - no alert needed
                                                } else {
                                                  console.error(`[AI Migration] Migration failed for VMID ${rec.vmid}:`, result.error);
                                                  setMigrationStatus(prev => ({ ...prev, [aiKey]: 'failed' }));
                                                }
                                              })
                                              .catch((err) => {
                                                console.error(`[AI Migration] Exception for VMID ${rec.vmid}:`, err);
                                                setMigrationStatus(prev => ({ ...prev, [aiKey]: 'failed' }));
                                              });
                                            }}
                                            disabled={!canMigrate || status === 'running' || isMigrating}
                                            className="px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                                            title={!canMigrate ? 'Read-only API token (PVEAuditor) - Cannot perform migrations' : isMigrating ? 'Migration in progress' : ''}
                                          >
                                            {!canMigrate ? (
                                              <>
                                                <Lock size={16} />
                                                Read-Only
                                              </>
                                            ) : isMigrating ? (
                                              <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Migrating...
                                              </>
                                            ) : status === 'running' ? (
                                              <>
                                                <RefreshCw size={16} className="animate-spin" />
                                                Starting...
                                              </>
                                            ) : (
                                              <>
                                                <Play size={16} />
                                                Migrate
                                              </>
                                            )}
                                          </button>
                                        );
                                      })()}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {showUpdateModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full p-6">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg shadow-md ${updating ? 'animate-pulse' : ''}`}>
                        <RefreshCw size={24} className={updating ? "text-white animate-spin" : "text-white"} />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Update ProxBalance</h2>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">System update management</p>
                      </div>
                    </div>
                    {!updating && (
                      <button
                        onClick={() => setShowUpdateModal(false)}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                      >
                        <X size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    )}
                  </div>

                  {systemInfo && !updating && updateLog.length === 0 && (
                    <div className="space-y-4">
                      <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <RefreshCw size={24} className="text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">Update Available</h3>
                            <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                              <p><span className="font-medium">Current Branch:</span> {systemInfo.branch}</p>
                              <p><span className="font-medium">Current Commit:</span> {systemInfo.commit}</p>
                              <p><span className="font-medium">Commits Behind:</span> {systemInfo.commits_behind}</p>
                              <p><span className="font-medium">Last Updated:</span> {systemInfo.last_commit_date}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {systemInfo.changelog && systemInfo.changelog.length > 0 && (
                        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded p-4">
                          <h3 className="font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2">
                            <span>📋 What's New</span>
                            <span className="text-xs px-2 py-0.5 bg-green-200 dark:bg-green-800 rounded-full">
                              {systemInfo.changelog.length} update{systemInfo.changelog.length > 1 ? 's' : ''}
                            </span>
                          </h3>
                          <div className="space-y-2 max-h-48 overflow-y-auto">
                            {systemInfo.changelog.map((item, idx) => (
                              <div key={idx} className="flex items-start gap-2 text-sm">
                                <span className="text-green-600 dark:text-green-400 flex-shrink-0">●</span>
                                <div className="flex-1">
                                  <span className="text-green-900 dark:text-green-100">{item.message}</span>
                                  <span className="ml-2 text-xs font-mono text-green-600 dark:text-green-400">
                                    ({item.commit})
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-yellow-800 dark:text-yellow-300">
                            <p className="font-semibold mb-1">This will:</p>
                            <ul className="list-disc ml-4 space-y-1">
                              <li>Pull the latest code from branch: <span className="font-mono">{systemInfo.branch}</span></li>
                              <li>Update Python dependencies</li>
                              <li>Restart ProxBalance services</li>
                              <li>The page will automatically reload after update</li>
                            </ul>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowUpdateModal(false)}
                          className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleUpdate}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                        >
                          <RefreshCw size={18} />
                          Update Now
                        </button>
                      </div>
                    </div>
                  )}

                  {(updating || updateLog.length > 0) && (
                    <div className="space-y-4">
                      <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-96 overflow-y-auto">
                        <div className="font-mono text-sm space-y-1">
                          {updateLog.map((line, idx) => (
                            <div key={idx} className="text-gray-800 dark:text-gray-200">
                              {line.includes('✓') ? (
                                <span className="text-green-600 dark:text-green-400">{line}</span>
                              ) : line.includes('Error') || line.includes('⚠') || line.includes('Failed') ? (
                                <span className="text-red-600 dark:text-red-400">{line}</span>
                              ) : line.includes('━') ? (
                                <span className="text-blue-600 dark:text-blue-400">{line}</span>
                              ) : (
                                <span>{line}</span>
                              )}
                            </div>
                          ))}
                          {updating && (
                            <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                              <RefreshCw size={16} className="animate-spin" />
                              <span>Updating...</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {!updating && (
                        <div className="flex justify-end">
                          <button
                            onClick={() => {
                              setShowUpdateModal(false);
                              setUpdateLog([]);
                            }}
                            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
                          >
                            Close
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {showBranchModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg shadow-md">
                          <GitBranch size={24} className="text-white" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Switch Branch</h2>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Change code branch</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowBranchModal(false)}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
                      >
                        <X size={20} className="text-gray-600 dark:text-gray-400" />
                      </button>
                    </div>

                    {loadingBranches ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw size={24} className="animate-spin text-blue-600 dark:text-blue-400" />
                        <span className="ml-2 text-gray-600 dark:text-gray-400">Loading branches...</span>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={20} className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-800 dark:text-blue-300">
                              <p className="font-semibold mb-1">Switching branches will:</p>
                              <ul className="list-disc ml-4 space-y-1">
                                <li>Pull the latest code from the selected branch</li>
                                <li>Update dependencies if needed</li>
                                <li>Restart ProxBalance services</li>
                                <li>Reload the page automatically</li>
                              </ul>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Available Branches</h3>
                          {availableBranches.length === 0 ? (
                            <p className="text-gray-600 dark:text-gray-400 text-sm">No branches found</p>
                          ) : (
                            availableBranches.map((branch) => (
                              <div
                                key={branch.name}
                                className={`border rounded-lg p-4 ${
                                  branch.current
                                    ? 'border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20'
                                    : 'border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <GitBranch size={16} className={branch.current ? 'text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'} />
                                      <span className={`font-mono font-semibold ${
                                        branch.current
                                          ? 'text-purple-700 dark:text-purple-300'
                                          : 'text-gray-900 dark:text-white'
                                      }`}>
                                        {branch.name}
                                      </span>
                                      {branch.current && (
                                        <span className="px-2 py-0.5 bg-purple-600 dark:bg-purple-500 text-white text-xs rounded-full">
                                          Current
                                        </span>
                                      )}
                                    </div>
                                    {branch.last_commit && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                                        Latest: {branch.last_commit.substring(0, 50)}{branch.last_commit.length > 50 ? '...' : ''}
                                      </p>
                                    )}
                                  </div>
                                  {!branch.current && (
                                    <button
                                      onClick={() => switchBranch(branch.name)}
                                      disabled={switchingBranch}
                                      className="ml-4 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {switchingBranch ? 'Switching...' : 'Switch'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="flex justify-end pt-4">
                          <button
                            onClick={() => setShowBranchModal(false)}
                            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Migration Dialog Modal */}
            {showMigrationDialog && selectedGuest && canMigrate && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowMigrationDialog(false)}>
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md">
                      <Activity size={24} className="text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Migrate Guest</h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">Move VM or container</p>
                    </div>
                  </div>

                  <div className="mb-4 space-y-2">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Guest:</strong> {selectedGuest.name || `Guest ${selectedGuest.vmid}`} ({selectedGuest.vmid})
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Type:</strong> {((selectedGuest.type || '').toUpperCase() === 'VM' || (selectedGuest.type || '').toUpperCase() === 'QEMU') ? 'VM' : 'Container'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Current Node:</strong> {selectedGuest.currentNode}
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Target Node
                    </label>
                    <select
                      value={migrationTarget}
                      onChange={(e) => setMigrationTarget(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="">Select target node...</option>
                      {data && data.nodes && Object.values(data.nodes)
                        .filter(node => node.name !== selectedGuest.currentNode && node.status === 'online')
                        .map(node => (
                          <option key={node.name} value={node.name}>
                            {node.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowMigrationDialog(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        if (migrationTarget) {
                          executeMigration({
                            vmid: selectedGuest.vmid,
                            source_node: selectedGuest.currentNode,
                            target_node: migrationTarget,
                            type: selectedGuest.type,
                            name: selectedGuest.name
                          });
                          setShowMigrationDialog(false);
                        }
                      }}
                      disabled={!migrationTarget}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Migrate
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tag Management Modal */}
            {showTagModal && tagModalGuest && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  {/* Modal Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Add Tag</h3>
                    <button
                      onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
                      className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                    >
                      <XCircle size={24} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6">
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        Guest: <span className="font-semibold text-gray-900 dark:text-white">[{tagModalGuest.type} {tagModalGuest.vmid}] {tagModalGuest.name}</span>
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Node: <span className="font-semibold text-gray-900 dark:text-white">{tagModalGuest.node}</span>
                      </p>
                    </div>

                    {/* Quick Add Buttons */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Quick Add
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {!tagModalGuest.tags.has_ignore && (
                          <button
                            onClick={async () => {
                              try {
                                const vmid = tagModalGuest.vmid;

                                const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ tag: 'ignore' })
                                });

                                const result = await response.json();

                                if (result.success) {
                                  setShowTagModal(false);
                                  setNewTag('');
                                  setTagModalGuest(null);

                                  // Fast refresh - just update this guest's tags
                                  const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                                    method: 'POST'
                                  });
                                  const refreshResult = await refreshResponse.json();

                                  if (refreshResult.success && data) {
                                    // Update just this guest in the data state
                                    setData({
                                      ...data,
                                      guests: {
                                        ...data.guests,
                                        [vmid]: {
                                          ...data.guests[vmid],
                                          tags: refreshResult.tags
                                        }
                                      }
                                    });
                                  }
                                } else {
                                  setError(`Error: ${result.error}`);
                                }
                              } catch (error) {
                                setError(`Error adding tag: ${error.message}`);
                              }
                            }}
                            className="px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
                          >
                            + ignore
                          </button>
                        )}
                        {!tagModalGuest.tags.all_tags?.includes('auto_migrate_ok') && (
                          <button
                            onClick={async () => {
                              try {
                                const vmid = tagModalGuest.vmid;

                                const response = await fetch(`${API_BASE}/guests/${vmid}/tags`, {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ tag: 'auto_migrate_ok' })
                                });

                                const result = await response.json();

                                if (result.success) {
                                  setShowTagModal(false);
                                  setNewTag('');
                                  setTagModalGuest(null);

                                  // Fast refresh - just update this guest's tags
                                  const refreshResponse = await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                                    method: 'POST'
                                  });
                                  const refreshResult = await refreshResponse.json();

                                  if (refreshResult.success && data) {
                                    // Update just this guest in the data state
                                    setData({
                                      ...data,
                                      guests: {
                                        ...data.guests,
                                        [vmid]: {
                                          ...data.guests[vmid],
                                          tags: refreshResult.tags
                                        }
                                      }
                                    });
                                  }
                                } else {
                                  setError(`Error: ${result.error}`);
                                }
                              } catch (error) {
                                setError(`Error adding tag: ${error.message}`);
                              }
                            }}
                            className="px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
                          >
                            + auto_migrate_ok
                          </button>
                        )}
                        <button
                          onClick={() => setNewTag('exclude_')}
                          className="px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
                        >
                          + exclude_...
                        </button>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Or Enter Custom Tag
                      </label>
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleAddTag();
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., exclude_database, exclude_web"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span className="font-mono">ignore</span> = never migrate | <span className="font-mono">exclude_[name]</span> = anti-affinity group
                      </p>
                    </div>

                    {/* Current Tags */}
                    {tagModalGuest.tags.all_tags.length > 0 && (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Tags
                        </label>
                        <div className="flex flex-wrap gap-1">
                          {tagModalGuest.tags.all_tags.map(tag => (
                            <span key={tag} className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => { setShowTagModal(false); setNewTag(''); setTagModalGuest(null); }}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddTag}
                      disabled={!newTag.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      Add Tag
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Remove Tag Confirmation Modal */}
            {confirmRemoveTag && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmRemoveTag(null)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Tag Removal</h3>
                    <button onClick={() => setConfirmRemoveTag(null)}>
                      <XCircle size={24} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-700 dark:text-gray-300">
                      Remove tag <span className="font-mono font-semibold text-red-600 dark:text-red-400">"{confirmRemoveTag.tag}"</span> from {confirmRemoveTag.guest.type} <span className="font-semibold">{confirmRemoveTag.guest.vmid}</span> ({confirmRemoveTag.guest.name})?
                    </p>
                  </div>

                  <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setConfirmRemoveTag(null)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmAndRemoveTag}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove Tag
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Migration Confirmation Modal */}
            {confirmMigration && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setConfirmMigration(null)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Confirm Migration</h3>
                    <button onClick={() => setConfirmMigration(null)}>
                      <XCircle size={24} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                  </div>

                  <div className="p-6">
                    <p className="text-gray-700 dark:text-gray-300 mb-4">
                      Start migration for <span className="font-semibold text-blue-600 dark:text-blue-400">{confirmMigration.type} {confirmMigration.vmid}</span> ({confirmMigration.name})?
                    </p>

                    <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">From:</span>
                        <span className="font-semibold text-red-600 dark:text-red-400">{confirmMigration.source_node}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">To:</span>
                        <span className="font-semibold text-green-600 dark:text-green-400">{confirmMigration.target_node}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                        <span className="font-mono text-gray-900 dark:text-gray-100">{(confirmMigration.mem_gb || 0).toFixed(1)} GB</span>
                      </div>
                      {confirmMigration.score_improvement !== undefined && (
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Improvement:</span>
                          <span className="font-semibold text-green-600 dark:text-green-400">+{confirmMigration.score_improvement.toFixed(1)}</span>
                        </div>
                      )}
                    </div>

                    {confirmMigration.reason && (
                      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                        <span className="font-medium">Reason:</span> {confirmMigration.reason}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setConfirmMigration(null)}
                      className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={confirmAndMigrate}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Play size={16} />
                      Start Migration
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Batch Migration Confirmation Modal */}
            {showBatchConfirmation && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                  {/* Modal Header */}
                  <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <AlertTriangle size={24} className="text-yellow-500" />
                        Confirm Batch Migration
                      </h2>
                      <button
                        onClick={() => setShowBatchConfirmation(false)}
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        <X size={24} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      Review the migration plan below. Migrations will be executed <strong>sequentially</strong> (one at a time).
                    </p>
                  </div>

                  {/* Modal Body - Scrollable Task List */}
                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg">
                      <div className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
                        <Info size={20} />
                        <div>
                          <p className="font-semibold">Total Migrations: {pendingBatchMigrations.length}</p>
                          <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                            Each migration will be tracked with real-time progress. You can monitor the status panel for updates.
                          </p>
                        </div>
                      </div>
                    </div>

                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <List size={18} />
                      Migration Tasks
                    </h3>

                    <div className="space-y-3">
                      {pendingBatchMigrations.map((rec, idx) => {
                        const sourceNode = data?.nodes?.[rec.source_node];
                        const targetNode = data?.nodes?.[rec.target_node];

                        return (
                          <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">
                                    #{idx + 1}
                                  </span>
                                  <span className="font-bold text-gray-900 dark:text-white">
                                    [{rec.type} {rec.vmid}] {rec.name}
                                  </span>
                                  {rec.priority && (
                                    <span className={`text-xs px-2 py-0.5 rounded font-semibold ${
                                      rec.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' :
                                      rec.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' :
                                      'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                                    }`}>
                                      {rec.priority}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-2 text-sm">
                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source Node</div>
                                    <div className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-2">
                                      <ArrowRight size={14} />
                                      {rec.source_node}
                                    </div>
                                    {sourceNode && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        CPU: {sourceNode.cpu_percent?.toFixed(1)}% | RAM: {sourceNode.mem_percent?.toFixed(1)}%
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Node</div>
                                    <div className="font-semibold text-green-600 dark:text-green-400 flex items-center gap-2">
                                      <ArrowRight size={14} />
                                      {rec.target_node}
                                    </div>
                                    {targetNode && (
                                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                        CPU: {targetNode.cpu_percent?.toFixed(1)}% | RAM: {targetNode.mem_percent?.toFixed(1)}%
                                      </div>
                                    )}
                                  </div>
                                </div>

                                {rec.reasoning && (
                                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                                    <span className="font-semibold">Reason:</span> {rec.reasoning}
                                  </div>
                                )}

                                <div className="mt-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const commandKey = `ai-command-${idx}`;
                                      setCollapsedSections(prev => ({
                                        ...prev,
                                        [commandKey]: !prev[commandKey]
                                      }));
                                    }}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                                  >
                                    <Terminal size={12} />
                                    {collapsedSections[`ai-command-${idx}`] ? 'Show' : 'Hide'} command
                                  </button>
                                  {!collapsedSections[`ai-command-${idx}`] && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        navigator.clipboard.writeText(rec.command);
                                        const btn = e.currentTarget;
                                        const originalText = btn.textContent;
                                        btn.textContent = 'Copied!';
                                        btn.classList.add('bg-green-100', 'dark:bg-green-900');
                                        setTimeout(() => {
                                          btn.textContent = originalText;
                                          btn.classList.remove('bg-green-100', 'dark:bg-green-900');
                                        }, 1000);
                                      }}
                                      className="text-xs font-mono bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-gray-700 dark:text-gray-300 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                                      title="Click to copy"
                                    >
                                      {rec.command}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900/50">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <AlertTriangle size={16} className="inline mr-1 text-yellow-500" />
                        Migrations will execute one at a time to ensure system stability
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowBatchConfirmation(false)}
                          className="px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
                        >
                          <X size={16} />
                          Cancel
                        </button>
                        <button
                          onClick={confirmBatchMigration}
                          className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-semibold"
                        >
                          <CheckCircle size={16} />
                          Start {pendingBatchMigrations.length} Migration{pendingBatchMigrations.length !== 1 ? 's' : ''}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Footer with timestamp and system info */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 py-2 px-4 z-40">
              <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
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
                          title="Click to switch branch"
                        >{systemInfo.branch}</button></span>
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

            {/* Cancel Migration Confirmation Modal */}
            {cancelMigrationModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setCancelMigrationModal(null)}>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md shadow-xl border border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                      <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">Cancel Migration?</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        This will stop the migration in progress
                      </p>
                    </div>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {cancelMigrationModal.name}
                      </span>
                      <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold">
                        {cancelMigrationModal.type === 'qemu' ? 'VM' : 'CT'} {cancelMigrationModal.vmid}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2">
                      <span className="font-mono">{cancelMigrationModal.source_node}</span>
                      <ArrowRight size={14} />
                      <span className="font-mono">{cancelMigrationModal.target_node}</span>
                    </div>
                    {cancelMigrationModal.progress_info && (
                      <div className="text-xs text-gray-500 dark:text-gray-500">
                        Progress: {cancelMigrationModal.progress_info.human_readable}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => setCancelMigrationModal(null)}
                      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
                    >
                      Keep Running
                    </button>
                    <button
                      onClick={async () => {
                        setCancellingMigration(true);
                        try {
                          // Use custom onConfirm handler if provided (for manual migrations), otherwise use default API
                          if (cancelMigrationModal.onConfirm) {
                            await cancelMigrationModal.onConfirm();
                          } else {
                            const response = await fetch(`/api/migrations/${cancelMigrationModal.task_id}/cancel`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' }
                            });
                            if (response.ok) {
                              setCancelMigrationModal(null);
                              fetchAutomationStatus();
                            } else {
                              setError('Failed to cancel migration');
                            }
                          }
                        } catch (error) {
                          console.error('Error cancelling migration:', error);
                          setError('Error cancelling migration');
                        } finally {
                          setCancellingMigration(false);
                        }
                      }}
                      disabled={cancellingMigration}
                      className={`px-4 py-2 ${cancellingMigration ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-semibold transition-colors flex items-center gap-2`}
                    >
                      {cancellingMigration ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Cancelling...
                        </>
                      ) : (
                        <>
                          <X size={16} />
                          Cancel Migration
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

        </>);
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<ProxmoxBalanceManager />);
