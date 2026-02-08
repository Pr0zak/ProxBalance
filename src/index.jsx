import SettingsPage from './components/SettingsPage.jsx';
import AutomationPage from './components/AutomationPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import IconLegend from './components/IconLegend.jsx';
import useIsMobile from './utils/useIsMobile.js';
import {
  AlertCircle, RefreshCw, Info, Sun, Moon, Settings, X, ProxBalanceLogo,
  Activity, Clock, HelpCircle
} from './components/Icons.jsx';

const { useState, useEffect, useMemo, useCallback, useRef } = React;

        const API_BASE = `/api`;

        const ProxmoxBalanceManager = () => {
          const isMobile = useIsMobile(640);
          const [data, setData] = useState(null);
          const [recommendations, setRecommendations] = useState([]);
          const [recommendationData, setRecommendationData] = useState(null);  // Store full recommendation response
          const [loadingRecommendations, setLoadingRecommendations] = useState(false);
          const [aiRecommendations, setAiRecommendations] = useState(null);
          const [loadingAi, setLoadingAi] = useState(false);
          const [feedbackGiven, setFeedbackGiven] = useState({});  // Track feedback per recommendation
          const [guestMigrationOptions, setGuestMigrationOptions] = useState(null);
          const [loadingGuestOptions, setLoadingGuestOptions] = useState(false);
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
          const [updateResult, setUpdateResult] = useState(null); // null | 'success' | 'up-to-date' | 'error'
          const [updateError, setUpdateError] = useState(null);
          const [chartPeriod, setChartPeriod] = useState('1h');
          const [charts, setCharts] = useState({});
          const [showUpdateModal, setShowUpdateModal] = useState(false);
          const [showIconLegend, setShowIconLegend] = useState(false);
          const [aiAnalysisPeriod, setAiAnalysisPeriod] = useState('24h');
          const [proxmoxTokenId, setProxmoxTokenId] = useState('');
          const [proxmoxTokenSecret, setProxmoxTokenSecret] = useState('');
          const [validatingToken, setValidatingToken] = useState(false);
          const [tokenValidationResult, setTokenValidationResult] = useState(null);
          const [tokenAuthError, setTokenAuthError] = useState(false);
          const [scrollToApiConfig, setScrollToApiConfig] = useState(false);
          const [showBranchModal, setShowBranchModal] = useState(false);
          const [availableBranches, setAvailableBranches] = useState([]);
          const [logoBalancing, setLogoBalancing] = useState(false);
          const [loadingBranches, setLoadingBranches] = useState(false);
          const [switchingBranch, setSwitchingBranch] = useState(false);
          const [branchPreview, setBranchPreview] = useState(null);
          const [loadingPreview, setLoadingPreview] = useState(false);
          const [rollingBack, setRollingBack] = useState(false);

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
              notificationSettings: true  // Collapsed by default
            };
          });

          // Cluster map view mode: 'cpu', 'memory', 'allocated', 'disk_io', or 'network'
          const [clusterMapViewMode, setClusterMapViewMode] = useState(() => {
            const saved = localStorage.getItem('clusterMapViewMode');
            // Migrate old 'usage' value to 'cpu'
            if (saved === 'usage') return 'cpu';
            return saved || 'cpu';
          });

          // Cluster map show powered off VMs/CTs
          const [showPoweredOffGuests, setShowPoweredOffGuests] = useState(() => {
            const saved = localStorage.getItem('showPoweredOffGuests');
            return saved === null ? true : saved === 'true';
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

          // Save show powered off guests preference to localStorage whenever it changes
          useEffect(() => {
            localStorage.setItem('showPoweredOffGuests', showPoweredOffGuests.toString());
          }, [showPoweredOffGuests]);

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

          const validateToken = async () => {
            setValidatingToken(true);
            setTokenValidationResult(null);
            try {
              const response = await fetch(`${API_BASE}/validate-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  proxmox_api_token_id: proxmoxTokenId,
                  proxmox_api_token_secret: proxmoxTokenSecret
                })
              });

              const result = await response.json();

              if (result.success) {
                setTokenValidationResult({
                  success: true,
                  message: 'Token is valid!',
                  permissions: result.permissions || [],
                  version: result.version || 'Unknown'
                });
              } else {
                setTokenValidationResult({
                  success: false,
                  message: result.error || 'Token validation failed',
                  permissions: []
                });
              }
            } catch (error) {
              setTokenValidationResult({
                success: false,
                message: `Validation error: ${error.message}`,
                permissions: []
              });
            } finally {
              setValidatingToken(false);
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
                  const errorMsg = result.error || 'Service temporarily unavailable';

                  // Check if it's a token/auth issue
                  if (errorMsg.toLowerCase().includes('token') || errorMsg.toLowerCase().includes('auth') || errorMsg.toLowerCase().includes('401') || errorMsg.toLowerCase().includes('unauthorized')) {
                    setError(`${errorMsg}. Please check your API token configuration in Settings.`);
                    setTokenAuthError(true); // Show top banner
                  } else {
                    setError(errorMsg);
                    setTokenAuthError(false);
                  }
                } else {
                  setError(`Server error: ${response.status}. Please check your API token configuration in Settings.`);
                  setTokenAuthError(false);
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
                // Check if it's a token/auth issue
                if (result.error && (result.error.toLowerCase().includes('token') || result.error.toLowerCase().includes('401') || result.error.toLowerCase().includes('unauthorized'))) {
                  setTokenAuthError(true); // Show top banner
                }
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

          // Recommendation feedback handler
          const onFeedback = async (rec, rating) => {
            const key = `${rec.vmid}-${rec.target_node}`;
            try {
              const response = await fetch(`${API_BASE}/recommendations/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  vmid: rec.vmid,
                  rating: rating,
                  source_node: rec.source_node,
                  target_node: rec.target_node,
                  score_improvement: rec.score_improvement,
                })
              });
              if (response.ok) {
                setFeedbackGiven(prev => ({ ...prev, [key]: rating }));
              }
            } catch (err) {
              console.error('Failed to submit feedback:', err);
            }
          };

          // Guest migration options fetcher
          const fetchGuestMigrationOptions = async (vmid) => {
            setLoadingGuestOptions(true);
            setGuestMigrationOptions(null);
            try {
              const response = await fetch(`${API_BASE}/guest/${vmid}/migration-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  cpu_threshold: cpuThreshold,
                  mem_threshold: memThreshold,
                  maintenance_nodes: [...(maintenanceNodes || [])],
                })
              });
              const result = await response.json();
              if (result.success) {
                setGuestMigrationOptions(result);
              }
            } catch (err) {
              console.error('Failed to fetch guest migration options:', err);
            } finally {
              setLoadingGuestOptions(false);
            }
          };

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
            setUpdateResult(null);
            setUpdateError(null);
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
                  setUpdateResult('success');
                } else {
                  setUpdateResult('up-to-date');
                }
              } else {
                setUpdateLog([...(result.log || []), `Error: ${result.error}`]);
                setUpdateResult('error');
                setUpdateError(result.error || 'Unknown error');
              }
            } catch (err) {
              setUpdateLog(prev => [...prev, `Error: ${err.message}`]);
              setUpdateResult('error');
              setUpdateError(err.message);
            }

            setUpdating(false);
          };

          const fetchBranches = async () => {
            setLoadingBranches(true);
            setBranchPreview(null);
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

          const fetchBranchPreview = async (branchName) => {
            setLoadingPreview(true);
            setBranchPreview(null);
            try {
              const response = await fetch(`${API_BASE}/system/branch-preview/${encodeURIComponent(branchName)}`);
              const result = await response.json();
              if (result.success) {
                setBranchPreview(result);
              }
            } catch (err) {
              console.error('Error fetching branch preview:', err);
            }
            setLoadingPreview(false);
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
                setBranchPreview(null);
                await fetchSystemInfo();
                setTimeout(() => window.location.reload(), 1000);
              } else {
                setError(`Failed to switch branch: ${result.error}`);
              }
            } catch (err) {
              setError(`Error switching branch: ${err.message}`);
            }
            setSwitchingBranch(false);
          };

          const rollbackBranch = async () => {
            setRollingBack(true);
            try {
              const response = await fetch(`${API_BASE}/system/rollback-branch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const result = await response.json();

              if (result.success) {
                setShowBranchModal(false);
                setBranchPreview(null);
                await fetchSystemInfo();
                setTimeout(() => window.location.reload(), 1000);
              } else {
                setError(`Failed to rollback: ${result.error}`);
              }
            } catch (err) {
              setError(`Error rolling back branch: ${err.message}`);
            }
            setRollingBack(false);
          };

          const clearTestingMode = async () => {
            try {
              const response = await fetch(`${API_BASE}/system/clear-testing-mode`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
              });
              const result = await response.json();
              if (result.success) {
                await fetchSystemInfo();
              }
            } catch (err) {
              setError(`Error clearing testing mode: ${err.message}`);
            }
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

          // Scroll to Proxmox API Configuration when navigating from error banner
          useEffect(() => {
            if (scrollToApiConfig && currentPage === 'settings') {
              // First expand Advanced System Settings
              setShowAdvancedSettings(true);

              // Wait for DOM to render and expand animation to complete
              setTimeout(() => {
                const element = document.getElementById('proxmox-api-config');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  // Add highlight effect
                  element.classList.add('ring-4', 'ring-red-500', 'ring-opacity-50', 'rounded-lg');
                  setTimeout(() => {
                    element.classList.remove('ring-4', 'ring-red-500', 'ring-opacity-50', 'rounded-lg');
                  }, 3000);
                }
                setScrollToApiConfig(false);
              }, 400);
            }
          }, [scrollToApiConfig, currentPage]);

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


          // Icon Legend modal - rendered on all pages
          const iconLegendModal = showIconLegend ? (
            <IconLegend darkMode={darkMode} onClose={() => setShowIconLegend(false)} />
          ) : null;

          // Settings Page - allow access even without data
          if (currentPage === 'settings') {
            return <>{iconLegendModal}<SettingsPage
              darkMode={darkMode} setDarkMode={setDarkMode}
              setCurrentPage={setCurrentPage}
              aiEnabled={aiEnabled} setAiEnabled={setAiEnabled}
              aiProvider={aiProvider} setAiProvider={setAiProvider}
              openaiKey={openaiKey} setOpenaiKey={setOpenaiKey}
              openaiModel={openaiModel} setOpenaiModel={setOpenaiModel}
              anthropicKey={anthropicKey} setAnthropicKey={setAnthropicKey}
              anthropicModel={anthropicModel} setAnthropicModel={setAnthropicModel}
              localUrl={localUrl} setLocalUrl={setLocalUrl}
              localModel={localModel} setLocalModel={setLocalModel}
              localAvailableModels={localAvailableModels} setLocalAvailableModels={setLocalAvailableModels}
              localLoadingModels={localLoadingModels} setLocalLoadingModels={setLocalLoadingModels}
              backendCollected={backendCollected}
              loading={loading}
              handleRefresh={handleRefresh}
              data={data}
              config={config}
              fetchConfig={fetchConfig}
              savingCollectionSettings={savingCollectionSettings} setSavingCollectionSettings={setSavingCollectionSettings}
              collectionSettingsSaved={collectionSettingsSaved} setCollectionSettingsSaved={setCollectionSettingsSaved}
              setError={setError}
              automationConfig={automationConfig}
              saveAutomationConfig={saveAutomationConfig}
              showPenaltyConfig={showPenaltyConfig} setShowPenaltyConfig={setShowPenaltyConfig}
              penaltyConfig={penaltyConfig} setPenaltyConfig={setPenaltyConfig}
              penaltyDefaults={penaltyDefaults}
              savingPenaltyConfig={savingPenaltyConfig}
              penaltyConfigSaved={penaltyConfigSaved}
              penaltyPresets={penaltyPresets}
              activePreset={activePreset}
              applyPenaltyPreset={applyPenaltyPreset}
              cpuThreshold={cpuThreshold}
              memThreshold={memThreshold}
              iowaitThreshold={iowaitThreshold}
              savePenaltyConfig={savePenaltyConfig}
              resetPenaltyConfig={resetPenaltyConfig}
              showAdvancedSettings={showAdvancedSettings} setShowAdvancedSettings={setShowAdvancedSettings}
              logLevel={logLevel} setLogLevel={setLogLevel}
              verboseLogging={verboseLogging} setVerboseLogging={setVerboseLogging}
              proxmoxTokenId={proxmoxTokenId} setProxmoxTokenId={setProxmoxTokenId}
              proxmoxTokenSecret={proxmoxTokenSecret} setProxmoxTokenSecret={setProxmoxTokenSecret}
              validatingToken={validatingToken}
              validateToken={validateToken}
              tokenValidationResult={tokenValidationResult}
              confirmHostChange={confirmHostChange} setConfirmHostChange={setConfirmHostChange}
              confirmAndChangeHost={confirmAndChangeHost}
              savingSettings={savingSettings}
              saveSettings={saveSettings}
              formatLocalTime={formatLocalTime}
              getTimezoneAbbr={getTimezoneAbbr}
            />
            {isMobile && (
              <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden">
                <div className="flex items-center justify-around h-14">
                  <button onClick={() => setCurrentPage('dashboard')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
                    <Activity size={20} />
                    <span className="text-xs">Dashboard</span>
                  </button>
                  <button onClick={() => setCurrentPage('automation')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
                    <Clock size={20} />
                    <span className="text-xs">Automation</span>
                  </button>
                  <button onClick={() => {}} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400">
                    <Settings size={20} />
                    <span className="text-xs font-semibold">Settings</span>
                  </button>
                </div>
              </div>
            )}
            </>;
          }

          // Automation Settings Page
          if (currentPage === 'automation') {
            return <>{iconLegendModal}<AutomationPage
              automationConfig={automationConfig}
              automationStatus={automationStatus}
              automigrateLogs={automigrateLogs}
              collapsedSections={collapsedSections}
              config={config}
              confirmAllowContainerRestarts={confirmAllowContainerRestarts}
              confirmApplyPreset={confirmApplyPreset}
              confirmDisableDryRun={confirmDisableDryRun}
              confirmEnableAutomation={confirmEnableAutomation}
              confirmRemoveWindow={confirmRemoveWindow}
              editingPreset={editingPreset}
              editingWindowIndex={editingWindowIndex}
              fetchAutomationStatus={fetchAutomationStatus}
              logRefreshTime={logRefreshTime}
              migrationHistoryPage={migrationHistoryPage}
              migrationHistoryPageSize={migrationHistoryPageSize}
              migrationLogsTab={migrationLogsTab}
              newWindowData={newWindowData}
              penaltyConfig={penaltyConfig}
              saveAutomationConfig={saveAutomationConfig}
              setAutomigrateLogs={setAutomigrateLogs}
              setCollapsedSections={setCollapsedSections}
              setConfig={setConfig}
              setConfirmAllowContainerRestarts={setConfirmAllowContainerRestarts}
              setConfirmApplyPreset={setConfirmApplyPreset}
              setConfirmDisableDryRun={setConfirmDisableDryRun}
              setConfirmEnableAutomation={setConfirmEnableAutomation}
              setConfirmRemoveWindow={setConfirmRemoveWindow}
              setCurrentPage={setCurrentPage}
              setEditingPreset={setEditingPreset}
              setEditingWindowIndex={setEditingWindowIndex}
              setError={setError}
              setLogRefreshTime={setLogRefreshTime}
              setMigrationHistoryPage={setMigrationHistoryPage}
              setMigrationHistoryPageSize={setMigrationHistoryPageSize}
              setMigrationLogsTab={setMigrationLogsTab}
              setNewWindowData={setNewWindowData}
              setOpenPenaltyConfigOnSettings={setOpenPenaltyConfigOnSettings}
              setShowTimeWindowForm={setShowTimeWindowForm}
              setTestResult={setTestResult}
              showTimeWindowForm={showTimeWindowForm}
              testAutomation={testAutomation}
              testingAutomation={testingAutomation}
              testResult={testResult}
            />
            {isMobile && (
              <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden">
                <div className="flex items-center justify-around h-14">
                  <button onClick={() => setCurrentPage('dashboard')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
                    <Activity size={20} />
                    <span className="text-xs">Dashboard</span>
                  </button>
                  <button onClick={() => {}} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400">
                    <Clock size={20} />
                    <span className="text-xs font-semibold">Automation</span>
                  </button>
                  <button onClick={() => setCurrentPage('settings')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
                    <Settings size={20} />
                    <span className="text-xs">Settings</span>
                  </button>
                </div>
              </div>
            )}
            </>;
          }

          // If no data available, show loading or error message but don't block UI
          if (!data) {
            return (
              <div className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pb-20 sm:pb-4">
                {iconLegendModal}
                <div className="max-w-7xl mx-auto">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                    <div className="flex items-center gap-3">
                      <ProxBalanceLogo size={40} />
                      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">ProxBalance</h1>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setShowIconLegend(true)}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        title="Icon Reference"
                      >
                        <HelpCircle size={20} className="text-gray-600 dark:text-gray-300" />
                      </button>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600"
                        title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                      >
                        {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-gray-700" />}
                      </button>
                      <button
                        onClick={() => setCurrentPage('settings')}
                        className="p-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600"
                        title="Settings"
                      >
                        <Settings size={20} />
                      </button>
                    </div>
                  </div>

                  {/* Error Banner */}
                  {error && (
                    <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle size={24} className="text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-red-900 dark:text-red-200">Connection Error</h3>
                          <p className="text-sm text-red-800 dark:text-red-300 mt-1">{error}</p>
                          <button
                            onClick={handleRefresh}
                            disabled={loading}
                            className="mt-3 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                          >
                            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                            {loading ? 'Retrying...' : 'Retry'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {loading && !error && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <RefreshCw size={48} className="text-blue-600 dark:text-blue-400 animate-spin" />
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-white">Loading cluster data...</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Please wait 30-60 seconds for initial data collection</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Info State - No Data Yet */}
                  {!loading && !error && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <Info size={48} className="text-blue-600 dark:text-blue-400" />
                        <div>
                          <p className="text-lg font-semibold text-blue-900 dark:text-blue-200">No Data Available</p>
                          <p className="text-sm text-blue-800 dark:text-blue-300 mt-1">
                            Waiting for cluster data collection. Please wait 30-60 seconds and refresh.
                          </p>
                          <button
                            onClick={handleRefresh}
                            className="mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2 mx-auto"
                          >
                            <RefreshCw size={16} />
                            Refresh
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Dashboard Page - data is guaranteed to be available here
          return <>{iconLegendModal}<DashboardPage
            data={data} setData={setData}
            loading={loading} error={error} setError={setError}
            config={config}
            darkMode={darkMode} toggleDarkMode={toggleDarkMode}
            setCurrentPage={setCurrentPage}
            setScrollToApiConfig={setScrollToApiConfig}
            setOpenPenaltyConfigOnSettings={setOpenPenaltyConfigOnSettings}
            tokenAuthError={tokenAuthError} setTokenAuthError={setTokenAuthError}
            dashboardHeaderCollapsed={dashboardHeaderCollapsed} setDashboardHeaderCollapsed={setDashboardHeaderCollapsed}
            handleLogoHover={handleLogoHover} logoBalancing={logoBalancing}
            clusterHealth={clusterHealth}
            systemInfo={systemInfo}
            showUpdateModal={showUpdateModal} setShowUpdateModal={setShowUpdateModal}
            updating={updating} updateLog={updateLog} setUpdateLog={setUpdateLog}
            updateResult={updateResult} setUpdateResult={setUpdateResult} updateError={updateError}
            handleUpdate={handleUpdate}
            showBranchModal={showBranchModal} setShowBranchModal={setShowBranchModal}
            loadingBranches={loadingBranches} availableBranches={availableBranches}
            branchPreview={branchPreview} setBranchPreview={setBranchPreview}
            loadingPreview={loadingPreview} switchingBranch={switchingBranch}
            rollingBack={rollingBack}
            fetchBranches={fetchBranches} switchBranch={switchBranch}
            rollbackBranch={rollbackBranch} clearTestingMode={clearTestingMode} fetchBranchPreview={fetchBranchPreview}
            automationStatus={automationStatus} automationConfig={automationConfig}
            fetchAutomationStatus={fetchAutomationStatus}
            runAutomationNow={runAutomationNow} runningAutomation={runningAutomation}
            runNowMessage={runNowMessage} setRunNowMessage={setRunNowMessage}
            runHistory={runHistory} expandedRun={expandedRun} setExpandedRun={setExpandedRun}
            recommendations={recommendations} loadingRecommendations={loadingRecommendations}
            generateRecommendations={generateRecommendations}
            recommendationData={recommendationData} penaltyConfig={penaltyConfig}
            thresholdSuggestions={thresholdSuggestions}
            cpuThreshold={cpuThreshold} setCpuThreshold={setCpuThreshold}
            memThreshold={memThreshold} setMemThreshold={setMemThreshold}
            iowaitThreshold={iowaitThreshold} setIowaitThreshold={setIowaitThreshold}
            aiEnabled={aiEnabled} aiRecommendations={aiRecommendations}
            loadingAi={loadingAi}
            aiAnalysisPeriod={aiAnalysisPeriod} setAiAnalysisPeriod={setAiAnalysisPeriod}
            fetchAiRecommendations={fetchAiRecommendations}
            canMigrate={canMigrate}
            migrationStatus={migrationStatus} setMigrationStatus={setMigrationStatus}
            completedMigrations={completedMigrations}
            guestsMigrating={guestsMigrating} migrationProgress={migrationProgress}
            cancelMigration={cancelMigration} trackMigration={trackMigration}
            showMigrationDialog={showMigrationDialog} setShowMigrationDialog={setShowMigrationDialog}
            selectedGuest={selectedGuest} setSelectedGuest={setSelectedGuest}
            migrationTarget={migrationTarget} setMigrationTarget={setMigrationTarget}
            executeMigration={executeMigration}
            showTagModal={showTagModal} setShowTagModal={setShowTagModal}
            tagModalGuest={tagModalGuest} setTagModalGuest={setTagModalGuest}
            newTag={newTag} setNewTag={setNewTag}
            handleAddTag={handleAddTag} handleRemoveTag={handleRemoveTag}
            confirmRemoveTag={confirmRemoveTag} setConfirmRemoveTag={setConfirmRemoveTag}
            confirmAndRemoveTag={confirmAndRemoveTag}
            confirmMigration={confirmMigration} setConfirmMigration={setConfirmMigration}
            confirmAndMigrate={confirmAndMigrate}
            showBatchConfirmation={showBatchConfirmation} setShowBatchConfirmation={setShowBatchConfirmation}
            pendingBatchMigrations={pendingBatchMigrations}
            cancelMigrationModal={cancelMigrationModal} setCancelMigrationModal={setCancelMigrationModal}
            cancellingMigration={cancellingMigration} setCancellingMigration={setCancellingMigration}
            collapsedSections={collapsedSections} setCollapsedSections={setCollapsedSections}
            toggleSection={toggleSection}
            lastUpdate={lastUpdate} backendCollected={backendCollected}
            handleRefresh={handleRefresh}
            clusterMapViewMode={clusterMapViewMode} setClusterMapViewMode={setClusterMapViewMode}
            showPoweredOffGuests={showPoweredOffGuests} setShowPoweredOffGuests={setShowPoweredOffGuests}
            selectedNode={selectedNode} setSelectedNode={setSelectedNode}
            selectedGuestDetails={selectedGuestDetails} setSelectedGuestDetails={setSelectedGuestDetails}
            nodeGridColumns={nodeGridColumns} setNodeGridColumns={setNodeGridColumns}
            chartPeriod={chartPeriod} setChartPeriod={setChartPeriod}
            nodeScores={nodeScores}
            maintenanceNodes={maintenanceNodes} setMaintenanceNodes={setMaintenanceNodes}
            evacuatingNodes={evacuatingNodes} setEvacuatingNodes={setEvacuatingNodes}
            planningNodes={planningNodes} setPlanningNodes={setPlanningNodes}
            evacuationPlan={evacuationPlan} setEvacuationPlan={setEvacuationPlan}
            planNode={planNode} setPlanNode={setPlanNode}
            guestActions={guestActions} setGuestActions={setGuestActions}
            guestTargets={guestTargets} setGuestTargets={setGuestTargets}
            showConfirmModal={showConfirmModal} setShowConfirmModal={setShowConfirmModal}
            guestSearchFilter={guestSearchFilter} setGuestSearchFilter={setGuestSearchFilter}
            guestCurrentPage={guestCurrentPage} setGuestCurrentPage={setGuestCurrentPage}
            guestPageSize={guestPageSize} setGuestPageSize={setGuestPageSize}
            guestSortField={guestSortField} setGuestSortField={setGuestSortField}
            guestSortDirection={guestSortDirection} setGuestSortDirection={setGuestSortDirection}
            guestModalCollapsed={guestModalCollapsed} setGuestModalCollapsed={setGuestModalCollapsed}
            checkAffinityViolations={checkAffinityViolations}
            generateSparkline={generateSparkline}
            fetchGuestLocations={fetchGuestLocations}
            feedbackGiven={feedbackGiven}
            onFeedback={onFeedback}
            guestMigrationOptions={guestMigrationOptions}
            loadingGuestOptions={loadingGuestOptions}
            fetchGuestMigrationOptions={fetchGuestMigrationOptions}
            setGuestMigrationOptions={setGuestMigrationOptions}
            API_BASE={API_BASE}
          />
          {isMobile && (
            <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden">
              <div className="flex items-center justify-around h-14">
                <button onClick={() => {}} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400">
                  <Activity size={20} />
                  <span className="text-xs font-semibold">Dashboard</span>
                </button>
                <button onClick={() => setCurrentPage('automation')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
                  <Clock size={20} />
                  <span className="text-xs">Automation</span>
                </button>
                <button onClick={() => setCurrentPage('settings')} className="flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400">
                  <Settings size={20} />
                  <span className="text-xs">Settings</span>
                </button>
              </div>
            </div>
          )}
          </>;
      };

      const root = ReactDOM.createRoot(document.getElementById('root'));
      root.render(<ProxmoxBalanceManager />);
