/**
 * ProxBalance API Client
 *
 * Extracted API fetch functions from app.jsx.
 * Each function is a standalone async function that returns data directly.
 * On failure, functions return { error: true, message: "..." } instead of throwing.
 */

const API_BASE = '/api';

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
// Tasks (Migration Cancellation)
// ---------------------------------------------------------------------------

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
