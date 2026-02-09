/**
 * ProxBalance API Client
 *
 * Extracted API fetch functions from app.jsx.
 * Each function is a standalone async function that returns data directly.
 * On failure, functions return { error: true, message: "..." } instead of throwing.
 */

import { API_BASE } from '../utils/constants.js';

// ---------------------------------------------------------------------------
// Permissions
// ---------------------------------------------------------------------------

export async function checkPermissions() {
  try {
    const response = await fetch(`${API_BASE}/permissions`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Permission check failed:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export async function fetchConfig() {
  try {
    const response = await fetch(`${API_BASE}/config`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to load config:', err);
    return { error: true, message: err.message };
  }
}

export async function saveSettings(settings) {
  try {
    const response = await fetch(`${API_BASE}/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to save settings:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Penalty Configuration
// ---------------------------------------------------------------------------

export async function fetchPenaltyConfig() {
  try {
    const response = await fetch(`${API_BASE}/penalty-config`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to load penalty config:', err);
    return { error: true, message: err.message };
  }
}

export async function savePenaltyConfig(penaltyConfig) {
  try {
    const response = await fetch(`${API_BASE}/penalty-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config: penaltyConfig })
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to save penalty config:', err);
    return { error: true, message: err.message };
  }
}

export async function resetPenaltyConfig() {
  try {
    const response = await fetch(`${API_BASE}/penalty-config/reset`, {
      method: 'POST'
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to reset penalty config:', err);
    return { error: true, message: err.message };
  }
}

export async function applyPenaltyPreset(presetName) {
  try {
    const response = await fetch(`${API_BASE}/penalty-config/presets/${presetName}`, {
      method: 'POST'
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to apply penalty preset:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Pre-Migration Validation
// ---------------------------------------------------------------------------

export async function validateMigration(vmid, sourceNode, targetNode, guestType) {
  try {
    const response = await fetch(`${API_BASE}/migrate/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vmid,
        source_node: sourceNode,
        target_node: targetNode,
        type: guestType || 'VM',
      })
    });
    return await response.json();
  } catch (err) {
    console.error('Failed to validate migration:', err);
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Token Validation
// ---------------------------------------------------------------------------

export async function validateToken(proxmoxTokenId, proxmoxTokenSecret) {
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
      return {
        success: true,
        message: 'Token is valid!',
        permissions: result.permissions || [],
        version: result.version || 'Unknown'
      };
    } else {
      return {
        success: false,
        message: result.error || 'Token validation failed',
        permissions: []
      };
    }
  } catch (err) {
    console.error('Token validation error:', err);
    return {
      error: true,
      success: false,
      message: `Validation error: ${err.message}`,
      permissions: []
    };
  }
}

// ---------------------------------------------------------------------------
// Data Refresh / Collection
// ---------------------------------------------------------------------------

export async function triggerRefresh() {
  try {
    const response = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
    if (!response.ok) {
      return { error: true, message: 'Failed to trigger data collection' };
    }
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Refresh trigger failed:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Cluster Analysis
// ---------------------------------------------------------------------------

export async function fetchAnalysis() {
  try {
    const response = await fetch(`${API_BASE}/analyze`);

    if (!response.ok) {
      if (response.status === 503) {
        const result = await response.json();
        const errorMsg = result.error || 'Service temporarily unavailable';
        const isTokenError = errorMsg.toLowerCase().includes('token') ||
          errorMsg.toLowerCase().includes('auth') ||
          errorMsg.toLowerCase().includes('401') ||
          errorMsg.toLowerCase().includes('unauthorized');
        return {
          error: true,
          message: isTokenError
            ? `${errorMsg}. Please check your API token configuration in Settings.`
            : errorMsg,
          tokenAuthError: isTokenError
        };
      }
      return {
        error: true,
        message: `Server error: ${response.status}. Please check your API token configuration in Settings.`
      };
    }

    const result = await response.json();
    if (result.success && result.data) {
      return result;
    } else {
      return { error: true, message: result.error || 'No data received' };
    }
  } catch (err) {
    console.error('Failed to fetch analysis:', err);
    return { error: true, message: `Connection failed: ${err.message}` };
  }
}

// ---------------------------------------------------------------------------
// Guest Locations
// ---------------------------------------------------------------------------

export async function fetchGuestLocations() {
  try {
    const response = await fetch(`${API_BASE}/guests/locations`);
    const result = await response.json();

    if (result.success && result.guests && result.nodes) {
      return result;
    } else {
      const isTokenError = result.error && (
        result.error.toLowerCase().includes('token') ||
        result.error.toLowerCase().includes('401') ||
        result.error.toLowerCase().includes('unauthorized')
      );
      return {
        error: true,
        message: result.error || 'Invalid guest locations response',
        tokenAuthError: isTokenError
      };
    }
  } catch (err) {
    console.error('[fetchGuestLocations] Error fetching guest locations:', err);
    return { error: true, message: err.message };
  }
}

export async function fetchGuestLocation(vmid) {
  try {
    const response = await fetch(`${API_BASE}/guests/${vmid}/location`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch guest location:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Recommendations
// ---------------------------------------------------------------------------

export async function fetchCachedRecommendations() {
  try {
    const response = await fetch(`${API_BASE}/recommendations`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching cached recommendations:', err);
    return { error: true, message: err.message };
  }
}

export async function generateRecommendations(params) {
  try {
    const response = await fetch(`${API_BASE}/recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error generating recommendations:', err);
    return { error: true, message: err.message };
  }
}

export async function fetchAiRecommendations(params) {
  try {
    const response = await fetch(`${API_BASE}/ai-recommendations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching AI recommendations:', err);
    return { error: true, success: false, message: err.message };
  }
}

/**
 * Fetch cached recommendations with optional filtering and pagination.
 * @param {Object} params - Filter parameters
 * @param {number} [params.limit] - Max recommendations to return
 * @param {number} [params.offset] - Skip first N recommendations
 * @param {number} [params.min_confidence] - Minimum confidence score
 * @param {string} [params.target_node] - Filter by target node
 * @param {string} [params.source_node] - Filter by source node
 * @param {string} [params.sort] - Sort field (score_improvement, confidence_score, risk_score, priority)
 * @param {string} [params.sort_dir] - Sort direction (asc or desc)
 */
export async function fetchFilteredRecommendations(params = {}) {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    }
    const qs = query.toString();
    const url = `${API_BASE}/recommendations${qs ? '?' + qs : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching filtered recommendations:', err);
    return { error: true, message: err.message };
  }
}

/**
 * Fetch skipped guests from cached recommendations with optional filtering.
 * @param {Object} params - Filter parameters
 * @param {string} [params.reason] - Filter by skip reason
 * @param {number} [params.limit] - Max results to return
 * @param {number} [params.offset] - Skip first N results
 */
export async function fetchSkippedGuests(params = {}) {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    }
    const qs = query.toString();
    const url = `${API_BASE}/recommendations/skipped${qs ? '?' + qs : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching skipped guests:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Execution Plan (Migration Ordering & Dependencies)
// ---------------------------------------------------------------------------

/**
 * Fetch the execution plan from cached recommendations.
 * Extracts just the execution_plan field which contains ordered migrations
 * with dependency information and parallel grouping.
 *
 * Returns:
 *   { ordered_recommendations, parallel_groups, total_steps, can_parallelize }
 * or { error: true, message: "..." } on failure.
 */
export async function fetchExecutionPlan() {
  try {
    const response = await fetch(`${API_BASE}/recommendations`);
    const result = await response.json();
    if (result.error) {
      return { error: true, message: result.message || result.error };
    }
    return result.execution_plan || {
      ordered_recommendations: [],
      parallel_groups: [],
      total_steps: 0,
      can_parallelize: false,
    };
  } catch (err) {
    console.error('Error fetching execution plan:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Forecasts (Proactive Trend Alerts)
// ---------------------------------------------------------------------------

/**
 * Fetch forecast recommendations (proactive trend-based threshold alerts).
 * @param {Object} [params] - Optional filter parameters
 * @param {string} [params.severity] - Filter by severity: critical, warning, info
 * @param {string} [params.node] - Filter by node name
 * @param {string} [params.metric] - Filter by metric: cpu, memory
 */
export async function fetchForecasts(params = {}) {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    }
    const qs = query.toString();
    const url = `${API_BASE}/recommendations/forecasts${qs ? '?' + qs : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching forecasts:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// F2: Workload Pattern Recognition
// ---------------------------------------------------------------------------

/**
 * Fetch workload patterns for cluster nodes.
 * Analyzes score history data for daily/weekly cycles and burst detection.
 * @param {Object} [params] - Optional parameters
 * @param {string} [params.node] - Analyze only this node
 * @param {number} [params.hours] - Hours of history to analyze (default: 168 = 7 days)
 */
export async function fetchWorkloadPatterns(params = {}) {
  try {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        query.append(key, value);
      }
    }
    const qs = query.toString();
    const url = `${API_BASE}/workload-patterns${qs ? '?' + qs : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching workload patterns:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Node Scores
// ---------------------------------------------------------------------------

export async function fetchNodeScores(params) {
  try {
    const response = await fetch(`${API_BASE}/node-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching node scores:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Guest Migration Options
// ---------------------------------------------------------------------------

export async function fetchGuestMigrationOptions(vmid, params) {
  try {
    const response = await fetch(`${API_BASE}/guest/${vmid}/migration-options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params || {})
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching guest migration options:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Configuration Simulator
// ---------------------------------------------------------------------------

export async function simulatePenaltyConfig(config, params) {
  try {
    const response = await fetch(`${API_BASE}/penalty-config/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config, ...params })
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error simulating penalty config:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Recommendation Feedback
// ---------------------------------------------------------------------------

export async function submitRecommendationFeedback(feedbackData) {
  try {
    const response = await fetch(`${API_BASE}/recommendations/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedbackData)
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error submitting recommendation feedback:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// AI Models
// ---------------------------------------------------------------------------

export async function fetchAiModels(provider, apiKey = null, baseUrl = null) {
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
    return result;
  } catch (err) {
    console.error('Failed to fetch AI models:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// System Info & Updates
// ---------------------------------------------------------------------------

export async function fetchSystemInfo() {
  try {
    const response = await fetch(`${API_BASE}/system/info`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch system info:', err);
    return { error: true, message: err.message };
  }
}

export async function handleUpdate() {
  try {
    const response = await fetch(`${API_BASE}/system/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Update failed:', err);
    return { error: true, message: err.message, log: [`Error: ${err.message}`] };
  }
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------

export async function fetchBranches() {
  try {
    const response = await fetch(`${API_BASE}/system/branches`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching branches:', err);
    return { error: true, message: err.message };
  }
}

export async function fetchBranchPreview(branchName) {
  try {
    const response = await fetch(`${API_BASE}/system/branch-preview/${encodeURIComponent(branchName)}`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error fetching branch preview:', err);
    return { error: true, message: err.message };
  }
}

export async function switchBranch(branchName) {
  try {
    const response = await fetch(`${API_BASE}/system/switch-branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branch: branchName })
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error switching branch:', err);
    return { error: true, message: err.message };
  }
}

export async function rollbackBranch() {
  try {
    const response = await fetch(`${API_BASE}/system/rollback-branch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error rolling back branch:', err);
    return { error: true, message: err.message };
  }
}

export async function clearTestingMode() {
  try {
    const response = await fetch(`${API_BASE}/system/clear-testing-mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Error clearing testing mode:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Automation (AutoMigrate)
// ---------------------------------------------------------------------------

export async function fetchAutomationStatus() {
  try {
    const response = await fetch(`${API_BASE}/automigrate/status`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch automation status:', err);
    return { error: true, message: err.message };
  }
}

export async function fetchRunHistory(limit = 10) {
  try {
    const response = await fetch(`${API_BASE}/automigrate/history?type=runs&limit=${limit}`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch run history:', err);
    return { error: true, message: err.message };
  }
}

export async function fetchAutomationConfig() {
  try {
    const response = await fetch(`${API_BASE}/automigrate/config`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch automation config:', err);
    return { error: true, message: err.message };
  }
}

export async function saveAutomationConfig(updates) {
  try {
    const response = await fetch(`${API_BASE}/automigrate/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates)
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to save automation config:', err);
    return { error: true, message: err.message };
  }
}

export async function testAutomation() {
  try {
    const response = await fetch(`${API_BASE}/automigrate/test`, {
      method: 'POST'
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to test automation:', err);
    return { error: true, success: false, message: err.message };
  }
}

export async function runAutomationNow() {
  try {
    const response = await fetch(`${API_BASE}/automigrate/run`, {
      method: 'POST'
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to run automation:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Rollback
// ---------------------------------------------------------------------------

export async function fetchRollbackInfo(vmid) {
  try {
    const response = await fetch(`${API_BASE}/migrate/rollback-info/${vmid}`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch rollback info:', err);
    return { error: true, message: err.message };
  }
}

export async function executeRollback(vmid) {
  try {
    const response = await fetch(`${API_BASE}/migrate/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vmid })
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to execute rollback:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Migration Outcome Tracking
// ---------------------------------------------------------------------------

export async function fetchMigrationOutcomes(vmid = null, limit = 20) {
  try {
    const params = new URLSearchParams();
    if (vmid !== null && vmid !== undefined) params.append('vmid', vmid);
    if (limit) params.append('limit', limit);
    const qs = params.toString();
    const url = `${API_BASE}/migrate/outcomes${qs ? '?' + qs : ''}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch migration outcomes:', err);
    return { error: true, message: err.message };
  }
}

export async function refreshMigrationOutcomes() {
  try {
    const response = await fetch(`${API_BASE}/migrate/outcomes/refresh`, {
      method: 'POST'
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to refresh migration outcomes:', err);
    return { error: true, message: err.message };
  }
}

// ---------------------------------------------------------------------------
// Tasks (Migration Cancellation)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Recommendation Diagnostics & Export
// ---------------------------------------------------------------------------

export async function fetchRecommendationDiagnostics() {
  try {
    const response = await fetch(`${API_BASE}/recommendations/diagnostics`);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch recommendation diagnostics:', err);
    return { error: true, message: err.message };
  }
}

export async function fetchScoreHistory(hours = 24, node = null) {
  try {
    let url = `${API_BASE}/score-history?hours=${hours}`;
    if (node) url += `&node=${encodeURIComponent(node)}`;
    const response = await fetch(url);
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to fetch score history:', err);
    return { error: true, message: err.message };
  }
}


export async function stopTask(sourceNode, taskId) {
  try {
    const response = await fetch(`${API_BASE}/tasks/${sourceNode}/${taskId}/stop`, {
      method: 'POST'
    });
    const result = await response.json();
    return result;
  } catch (err) {
    console.error('Failed to stop task:', err);
    return { error: true, message: err.message };
  }
}
