// Shared frontend constants — single source of truth
export const API_BASE = '/api';

// Refresh intervals
export const RECOMMENDATIONS_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes
export const AUTOMATION_STATUS_REFRESH_INTERVAL = 10 * 1000; // 10 seconds

// Migration polling
export const MIGRATION_POLL_INTERVAL = 3000; // 3 seconds

// Default threshold values (also persisted in localStorage)
export const DEFAULT_CPU_THRESHOLD = 50;
export const DEFAULT_MEM_THRESHOLD = 60;
export const DEFAULT_IOWAIT_THRESHOLD = 30;
