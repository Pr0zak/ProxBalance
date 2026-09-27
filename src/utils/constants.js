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

// Per-node score shown across the UI (backend field: suitability_rating).
// One name and one direction everywhere: higher = more room to take guests.
export const HEADROOM_LABEL = 'Headroom';
export const HEADROOM_HINT = 'Headroom 0–100: how much room a node has to take on more guests. Higher is better — under 30 the node is under pressure and a candidate to move guests off.';
