(() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(x, {
    get: (a, b) => (typeof require < "u" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require < "u") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __esm = (fn, res) => function() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: !0 });
  }, __copyProps = (to, from, except, desc) => {
    if (from && typeof from == "object" || typeof from == "function")
      for (let key of __getOwnPropNames(from))
        !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    return to;
  };
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
    mod
  ));

  // src/utils/constants.js
  var API_BASE, init_constants = __esm({
    "src/utils/constants.js"() {
      API_BASE = "/api";
    }
  });

  // src/api/client.js
  var client_exports = {};
  __export(client_exports, {
    applyPenaltyPreset: () => applyPenaltyPreset,
    checkPermissions: () => checkPermissions,
    clearTestingMode: () => clearTestingMode,
    executeRollback: () => executeRollback,
    fetchAiModels: () => fetchAiModels,
    fetchAiRecommendations: () => fetchAiRecommendations,
    fetchAnalysis: () => fetchAnalysis,
    fetchAutomationConfig: () => fetchAutomationConfig,
    fetchAutomationStatus: () => fetchAutomationStatus,
    fetchBranchPreview: () => fetchBranchPreview,
    fetchBranches: () => fetchBranches,
    fetchCachedRecommendations: () => fetchCachedRecommendations,
    fetchConfig: () => fetchConfig,
    fetchExecutionPlan: () => fetchExecutionPlan,
    fetchFilteredRecommendations: () => fetchFilteredRecommendations,
    fetchForecasts: () => fetchForecasts,
    fetchGuestLocation: () => fetchGuestLocation,
    fetchGuestLocations: () => fetchGuestLocations,
    fetchGuestMigrationOptions: () => fetchGuestMigrationOptions,
    fetchGuestTrendDetail: () => fetchGuestTrendDetail,
    fetchMigrationOutcomes: () => fetchMigrationOutcomes,
    fetchMigrationSettings: () => fetchMigrationSettings,
    fetchNodeScores: () => fetchNodeScores,
    fetchNodeTrendDetail: () => fetchNodeTrendDetail,
    fetchNodeTrends: () => fetchNodeTrends,
    fetchPenaltyConfig: () => fetchPenaltyConfig,
    fetchRecommendationDiagnostics: () => fetchRecommendationDiagnostics,
    fetchRollbackInfo: () => fetchRollbackInfo,
    fetchRunHistory: () => fetchRunHistory,
    fetchScoreHistory: () => fetchScoreHistory,
    fetchSkippedGuests: () => fetchSkippedGuests,
    fetchSystemInfo: () => fetchSystemInfo,
    fetchWorkloadPatterns: () => fetchWorkloadPatterns,
    generateRecommendations: () => generateRecommendations,
    handleUpdate: () => handleUpdate,
    refreshMigrationOutcomes: () => refreshMigrationOutcomes,
    resetMigrationSettings: () => resetMigrationSettings,
    resetPenaltyConfig: () => resetPenaltyConfig,
    rollbackBranch: () => rollbackBranch,
    runAutomationNow: () => runAutomationNow,
    saveAutomationConfig: () => saveAutomationConfig,
    saveMigrationSettings: () => saveMigrationSettings,
    savePenaltyConfig: () => savePenaltyConfig,
    saveSettings: () => saveSettings,
    simulatePenaltyConfig: () => simulatePenaltyConfig,
    stopTask: () => stopTask,
    submitRecommendationFeedback: () => submitRecommendationFeedback,
    switchBranch: () => switchBranch,
    testAutomation: () => testAutomation,
    triggerRefresh: () => triggerRefresh,
    validateMigration: () => validateMigration,
    validateToken: () => validateToken
  });
  async function checkPermissions() {
    try {
      return await (await fetch(`${API_BASE}/permissions`)).json();
    } catch (err) {
      return console.error("Permission check failed:", err), { error: !0, message: err.message };
    }
  }
  async function fetchConfig() {
    try {
      return await (await fetch(`${API_BASE}/config`)).json();
    } catch (err) {
      return console.error("Failed to load config:", err), { error: !0, message: err.message };
    }
  }
  async function saveSettings(settings) {
    try {
      return await (await fetch(`${API_BASE}/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      })).json();
    } catch (err) {
      return console.error("Failed to save settings:", err), { error: !0, message: err.message };
    }
  }
  async function fetchPenaltyConfig() {
    try {
      return await (await fetch(`${API_BASE}/penalty-config`)).json();
    } catch (err) {
      return console.error("Failed to load penalty config:", err), { error: !0, message: err.message };
    }
  }
  async function savePenaltyConfig(penaltyConfig) {
    try {
      return await (await fetch(`${API_BASE}/penalty-config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: penaltyConfig })
      })).json();
    } catch (err) {
      return console.error("Failed to save penalty config:", err), { error: !0, message: err.message };
    }
  }
  async function resetPenaltyConfig() {
    try {
      return await (await fetch(`${API_BASE}/penalty-config/reset`, {
        method: "POST"
      })).json();
    } catch (err) {
      return console.error("Failed to reset penalty config:", err), { error: !0, message: err.message };
    }
  }
  async function applyPenaltyPreset(presetName) {
    try {
      return await (await fetch(`${API_BASE}/penalty-config/presets/${presetName}`, {
        method: "POST"
      })).json();
    } catch (err) {
      return console.error("Failed to apply penalty preset:", err), { error: !0, message: err.message };
    }
  }
  async function fetchMigrationSettings() {
    try {
      return await (await fetch(`${API_BASE}/migration-settings`)).json();
    } catch (err) {
      return console.error("Failed to load migration settings:", err), { error: !0, message: err.message };
    }
  }
  async function saveMigrationSettings(settings) {
    try {
      return await (await fetch(`${API_BASE}/migration-settings`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings })
      })).json();
    } catch (err) {
      return console.error("Failed to save migration settings:", err), { error: !0, message: err.message };
    }
  }
  async function resetMigrationSettings() {
    try {
      return await (await fetch(`${API_BASE}/migration-settings/reset`, {
        method: "POST"
      })).json();
    } catch (err) {
      return console.error("Failed to reset migration settings:", err), { error: !0, message: err.message };
    }
  }
  async function fetchNodeTrends(lookbackDays = 7, cpuThreshold, memThreshold) {
    try {
      let params = new URLSearchParams({ lookback_days: lookbackDays });
      return cpuThreshold && params.append("cpu_threshold", cpuThreshold), memThreshold && params.append("mem_threshold", memThreshold), await (await fetch(`${API_BASE}/trends/nodes?${params}`)).json();
    } catch (err) {
      return console.error("Failed to load node trends:", err), { error: !0, message: err.message };
    }
  }
  async function fetchNodeTrendDetail(nodeName, lookbackDays = 7) {
    try {
      let params = new URLSearchParams({ lookback_days: lookbackDays });
      return await (await fetch(`${API_BASE}/trends/node/${nodeName}?${params}`)).json();
    } catch (err) {
      return console.error("Failed to load node trend detail:", err), { error: !0, message: err.message };
    }
  }
  async function fetchGuestTrendDetail(vmid, lookbackDays = 7) {
    try {
      let params = new URLSearchParams({ lookback_days: lookbackDays });
      return await (await fetch(`${API_BASE}/trends/guest/${vmid}?${params}`)).json();
    } catch (err) {
      return console.error("Failed to load guest trend detail:", err), { error: !0, message: err.message };
    }
  }
  async function validateMigration(vmid, sourceNode, targetNode, guestType) {
    try {
      return await (await fetch(`${API_BASE}/migrate/validate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vmid,
          source_node: sourceNode,
          target_node: targetNode,
          type: guestType || "VM"
        })
      })).json();
    } catch (err) {
      return console.error("Failed to validate migration:", err), { success: !1, error: err.message };
    }
  }
  async function validateToken(proxmoxTokenId, proxmoxTokenSecret) {
    try {
      let result = await (await fetch(`${API_BASE}/validate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxmox_api_token_id: proxmoxTokenId,
          proxmox_api_token_secret: proxmoxTokenSecret
        })
      })).json();
      return result.success ? {
        success: !0,
        message: "Token is valid!",
        permissions: result.permissions || [],
        version: result.version || "Unknown"
      } : {
        success: !1,
        message: result.error || "Token validation failed",
        permissions: []
      };
    } catch (err) {
      return console.error("Token validation error:", err), {
        error: !0,
        success: !1,
        message: `Validation error: ${err.message}`,
        permissions: []
      };
    }
  }
  async function triggerRefresh() {
    try {
      let response = await fetch(`${API_BASE}/refresh`, { method: "POST" });
      return response.ok ? await response.json() : { error: !0, message: "Failed to trigger data collection" };
    } catch (err) {
      return console.error("Refresh trigger failed:", err), { error: !0, message: err.message };
    }
  }
  async function fetchAnalysis() {
    try {
      let response = await fetch(`${API_BASE}/analyze`);
      if (!response.ok) {
        if (response.status === 503) {
          let errorMsg = (await response.json()).error || "Service temporarily unavailable", isTokenError = errorMsg.toLowerCase().includes("token") || errorMsg.toLowerCase().includes("auth") || errorMsg.toLowerCase().includes("401") || errorMsg.toLowerCase().includes("unauthorized");
          return {
            error: !0,
            message: isTokenError ? `${errorMsg}. Please check your API token configuration in Settings.` : errorMsg,
            tokenAuthError: isTokenError
          };
        }
        return {
          error: !0,
          message: `Server error: ${response.status}. Please check your API token configuration in Settings.`
        };
      }
      let result = await response.json();
      return result.success && result.data ? result : { error: !0, message: result.error || "No data received" };
    } catch (err) {
      return console.error("Failed to fetch analysis:", err), { error: !0, message: `Connection failed: ${err.message}` };
    }
  }
  async function fetchGuestLocations() {
    try {
      let result = await (await fetch(`${API_BASE}/guests/locations`)).json();
      if (result.success && result.guests && result.nodes)
        return result;
      {
        let isTokenError = result.error && (result.error.toLowerCase().includes("token") || result.error.toLowerCase().includes("401") || result.error.toLowerCase().includes("unauthorized"));
        return {
          error: !0,
          message: result.error || "Invalid guest locations response",
          tokenAuthError: isTokenError
        };
      }
    } catch (err) {
      return console.error("[fetchGuestLocations] Error fetching guest locations:", err), { error: !0, message: err.message };
    }
  }
  async function fetchGuestLocation(vmid) {
    try {
      return await (await fetch(`${API_BASE}/guests/${vmid}/location`)).json();
    } catch (err) {
      return console.error("Failed to fetch guest location:", err), { error: !0, message: err.message };
    }
  }
  async function fetchCachedRecommendations() {
    try {
      return await (await fetch(`${API_BASE}/recommendations`)).json();
    } catch (err) {
      return console.error("Error fetching cached recommendations:", err), { error: !0, message: err.message };
    }
  }
  async function generateRecommendations(params) {
    try {
      return await (await fetch(`${API_BASE}/recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      })).json();
    } catch (err) {
      return console.error("Error generating recommendations:", err), { error: !0, message: err.message };
    }
  }
  async function fetchAiRecommendations(params) {
    try {
      return await (await fetch(`${API_BASE}/ai-recommendations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      })).json();
    } catch (err) {
      return console.error("Error fetching AI recommendations:", err), { error: !0, success: !1, message: err.message };
    }
  }
  async function fetchFilteredRecommendations(params = {}) {
    try {
      let query = new URLSearchParams();
      for (let [key, value] of Object.entries(params))
        value != null && value !== "" && query.append(key, value);
      let qs = query.toString(), url = `${API_BASE}/recommendations${qs ? "?" + qs : ""}`;
      return await (await fetch(url)).json();
    } catch (err) {
      return console.error("Error fetching filtered recommendations:", err), { error: !0, message: err.message };
    }
  }
  async function fetchSkippedGuests(params = {}) {
    try {
      let query = new URLSearchParams();
      for (let [key, value] of Object.entries(params))
        value != null && value !== "" && query.append(key, value);
      let qs = query.toString(), url = `${API_BASE}/recommendations/skipped${qs ? "?" + qs : ""}`;
      return await (await fetch(url)).json();
    } catch (err) {
      return console.error("Error fetching skipped guests:", err), { error: !0, message: err.message };
    }
  }
  async function fetchExecutionPlan() {
    try {
      let result = await (await fetch(`${API_BASE}/recommendations`)).json();
      return result.error ? { error: !0, message: result.message || result.error } : result.execution_plan || {
        ordered_recommendations: [],
        parallel_groups: [],
        total_steps: 0,
        can_parallelize: !1
      };
    } catch (err) {
      return console.error("Error fetching execution plan:", err), { error: !0, message: err.message };
    }
  }
  async function fetchForecasts(params = {}) {
    try {
      let query = new URLSearchParams();
      for (let [key, value] of Object.entries(params))
        value != null && value !== "" && query.append(key, value);
      let qs = query.toString(), url = `${API_BASE}/recommendations/forecasts${qs ? "?" + qs : ""}`;
      return await (await fetch(url)).json();
    } catch (err) {
      return console.error("Error fetching forecasts:", err), { error: !0, message: err.message };
    }
  }
  async function fetchWorkloadPatterns(params = {}) {
    try {
      let query = new URLSearchParams();
      for (let [key, value] of Object.entries(params))
        value != null && value !== "" && query.append(key, value);
      let qs = query.toString(), url = `${API_BASE}/workload-patterns${qs ? "?" + qs : ""}`;
      return await (await fetch(url)).json();
    } catch (err) {
      return console.error("Error fetching workload patterns:", err), { error: !0, message: err.message };
    }
  }
  async function fetchNodeScores(params) {
    try {
      return await (await fetch(`${API_BASE}/node-scores`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      })).json();
    } catch (err) {
      return console.error("Error fetching node scores:", err), { error: !0, message: err.message };
    }
  }
  async function fetchGuestMigrationOptions(vmid, params) {
    try {
      return await (await fetch(`${API_BASE}/guest/${vmid}/migration-options`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params || {})
      })).json();
    } catch (err) {
      return console.error("Error fetching guest migration options:", err), { error: !0, message: err.message };
    }
  }
  async function simulatePenaltyConfig(config, params) {
    try {
      return await (await fetch(`${API_BASE}/penalty-config/simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, ...params })
      })).json();
    } catch (err) {
      return console.error("Error simulating penalty config:", err), { error: !0, message: err.message };
    }
  }
  async function submitRecommendationFeedback(feedbackData) {
    try {
      return await (await fetch(`${API_BASE}/recommendations/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackData)
      })).json();
    } catch (err) {
      return console.error("Error submitting recommendation feedback:", err), { error: !0, message: err.message };
    }
  }
  async function fetchAiModels(provider, apiKey = null, baseUrl = null) {
    try {
      let payload = { provider };
      return apiKey && (payload.api_key = apiKey), baseUrl && (payload.base_url = baseUrl), await (await fetch(`${API_BASE}/ai-models`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).json();
    } catch (err) {
      return console.error("Failed to fetch AI models:", err), { error: !0, message: err.message };
    }
  }
  async function fetchSystemInfo() {
    try {
      return await (await fetch(`${API_BASE}/system/info`)).json();
    } catch (err) {
      return console.error("Failed to fetch system info:", err), { error: !0, message: err.message };
    }
  }
  async function handleUpdate() {
    try {
      return await (await fetch(`${API_BASE}/system/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })).json();
    } catch (err) {
      return console.error("Update failed:", err), { error: !0, message: err.message, log: [`Error: ${err.message}`] };
    }
  }
  async function fetchBranches() {
    try {
      return await (await fetch(`${API_BASE}/system/branches`)).json();
    } catch (err) {
      return console.error("Error fetching branches:", err), { error: !0, message: err.message };
    }
  }
  async function fetchBranchPreview(branchName) {
    try {
      return await (await fetch(`${API_BASE}/system/branch-preview/${encodeURIComponent(branchName)}`)).json();
    } catch (err) {
      return console.error("Error fetching branch preview:", err), { error: !0, message: err.message };
    }
  }
  async function switchBranch(branchName) {
    try {
      return await (await fetch(`${API_BASE}/system/switch-branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ branch: branchName })
      })).json();
    } catch (err) {
      return console.error("Error switching branch:", err), { error: !0, message: err.message };
    }
  }
  async function rollbackBranch() {
    try {
      return await (await fetch(`${API_BASE}/system/rollback-branch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })).json();
    } catch (err) {
      return console.error("Error rolling back branch:", err), { error: !0, message: err.message };
    }
  }
  async function clearTestingMode() {
    try {
      return await (await fetch(`${API_BASE}/system/clear-testing-mode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }
      })).json();
    } catch (err) {
      return console.error("Error clearing testing mode:", err), { error: !0, message: err.message };
    }
  }
  async function fetchAutomationStatus() {
    try {
      return await (await fetch(`${API_BASE}/automigrate/status`)).json();
    } catch (err) {
      return console.error("Failed to fetch automation status:", err), { error: !0, message: err.message };
    }
  }
  async function fetchRunHistory(limit = 10) {
    try {
      return await (await fetch(`${API_BASE}/automigrate/history?type=runs&limit=${limit}`)).json();
    } catch (err) {
      return console.error("Failed to fetch run history:", err), { error: !0, message: err.message };
    }
  }
  async function fetchAutomationConfig() {
    try {
      return await (await fetch(`${API_BASE}/automigrate/config`)).json();
    } catch (err) {
      return console.error("Failed to fetch automation config:", err), { error: !0, message: err.message };
    }
  }
  async function saveAutomationConfig(updates) {
    try {
      return await (await fetch(`${API_BASE}/automigrate/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates)
      })).json();
    } catch (err) {
      return console.error("Failed to save automation config:", err), { error: !0, message: err.message };
    }
  }
  async function testAutomation() {
    try {
      return await (await fetch(`${API_BASE}/automigrate/test`, {
        method: "POST"
      })).json();
    } catch (err) {
      return console.error("Failed to test automation:", err), { error: !0, success: !1, message: err.message };
    }
  }
  async function runAutomationNow() {
    try {
      return await (await fetch(`${API_BASE}/automigrate/run`, {
        method: "POST"
      })).json();
    } catch (err) {
      return console.error("Failed to run automation:", err), { error: !0, message: err.message };
    }
  }
  async function fetchRollbackInfo(vmid) {
    try {
      return await (await fetch(`${API_BASE}/migrate/rollback-info/${vmid}`)).json();
    } catch (err) {
      return console.error("Failed to fetch rollback info:", err), { error: !0, message: err.message };
    }
  }
  async function executeRollback(vmid) {
    try {
      return await (await fetch(`${API_BASE}/migrate/rollback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vmid })
      })).json();
    } catch (err) {
      return console.error("Failed to execute rollback:", err), { error: !0, message: err.message };
    }
  }
  async function fetchMigrationOutcomes(vmid = null, limit = 20) {
    try {
      let params = new URLSearchParams();
      vmid != null && params.append("vmid", vmid), limit && params.append("limit", limit);
      let qs = params.toString(), url = `${API_BASE}/migrate/outcomes${qs ? "?" + qs : ""}`;
      return await (await fetch(url)).json();
    } catch (err) {
      return console.error("Failed to fetch migration outcomes:", err), { error: !0, message: err.message };
    }
  }
  async function refreshMigrationOutcomes() {
    try {
      return await (await fetch(`${API_BASE}/migrate/outcomes/refresh`, {
        method: "POST"
      })).json();
    } catch (err) {
      return console.error("Failed to refresh migration outcomes:", err), { error: !0, message: err.message };
    }
  }
  async function fetchRecommendationDiagnostics() {
    try {
      return await (await fetch(`${API_BASE}/recommendations/diagnostics`)).json();
    } catch (err) {
      return console.error("Failed to fetch recommendation diagnostics:", err), { error: !0, message: err.message };
    }
  }
  async function fetchScoreHistory(hours = 24, node = null) {
    try {
      let url = `${API_BASE}/score-history?hours=${hours}`;
      return node && (url += `&node=${encodeURIComponent(node)}`), await (await fetch(url)).json();
    } catch (err) {
      return console.error("Failed to fetch score history:", err), { error: !0, message: err.message };
    }
  }
  async function stopTask(sourceNode, taskId) {
    try {
      return await (await fetch(`${API_BASE}/tasks/${sourceNode}/${taskId}/stop`, {
        method: "POST"
      })).json();
    } catch (err) {
      return console.error("Failed to stop task:", err), { error: !0, message: err.message };
    }
  }
  var init_client = __esm({
    "src/api/client.js"() {
      init_constants();
    }
  });

  // src/components/Icons.jsx
  var AlertCircle = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "8", x2: "12", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "16", x2: "12.01", y2: "16" })), Server = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "2", y: "2", width: "20", height: "8", rx: "2" }), /* @__PURE__ */ React.createElement("rect", { x: "2", y: "14", width: "20", height: "8", rx: "2" })), HardDrive = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "22", y1: "12", x2: "2", y2: "12" }), /* @__PURE__ */ React.createElement("path", { d: "M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" })), Activity = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "22 12 18 12 15 21 9 3 6 12 2 12" })), RefreshCw = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "23 4 23 10 17 10" }), /* @__PURE__ */ React.createElement("path", { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" })), Play = ({ size }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2" }, /* @__PURE__ */ React.createElement("polygon", { points: "5 3 19 12 5 21 5 3" })), CheckCircle = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M22 11.08V12a10 10 0 1 1-5.93-9.14" }), /* @__PURE__ */ React.createElement("polyline", { points: "22 4 12 14.01 9 11.01" })), XCircle = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "15", y1: "9", x2: "9", y2: "15" }), /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "9", x2: "15", y2: "15" })), ClipboardList = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "8", y: "2", width: "8", height: "4", rx: "1", ry: "1" }), /* @__PURE__ */ React.createElement("path", { d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" }), /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "12", x2: "15", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "16", x2: "15", y2: "16" })), Tag = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" }), /* @__PURE__ */ React.createElement("line", { x1: "7", y1: "7", x2: "7.01", y2: "7" })), AlertTriangle = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "9", x2: "12", y2: "13" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })), Info = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "16", x2: "12", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "8", x2: "12.01", y2: "8" })), Shield = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })), Clock = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 6 12 12 16 14" })), Sun = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "5" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "1", x2: "12", y2: "3" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "21", x2: "12", y2: "23" }), /* @__PURE__ */ React.createElement("line", { x1: "4.22", y1: "4.22", x2: "5.64", y2: "5.64" }), /* @__PURE__ */ React.createElement("line", { x1: "18.36", y1: "18.36", x2: "19.78", y2: "19.78" }), /* @__PURE__ */ React.createElement("line", { x1: "1", y1: "12", x2: "3", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "21", y1: "12", x2: "23", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "4.22", y1: "19.78", x2: "5.64", y2: "18.36" }), /* @__PURE__ */ React.createElement("line", { x1: "18.36", y1: "5.64", x2: "19.78", y2: "4.22" })), Moon = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" })), Settings = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" })), X = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "6", x2: "6", y2: "18" }), /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "6", x2: "18", y2: "18" })), Save = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 21 17 13 7 13 7 21" }), /* @__PURE__ */ React.createElement("polyline", { points: "7 3 7 8 15 8" })), Upload = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 8 12 3 7 8" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "3", x2: "12", y2: "15" })), ChevronDown = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "6 9 12 15 18 9" })), ChevronUp = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "18 15 12 9 6 15" })), ChevronRight = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "9 18 15 12 9 6" })), GitHub = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "currentColor", className }, /* @__PURE__ */ React.createElement("path", { d: "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" })), GitBranch = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "3", x2: "6", y2: "15" }), /* @__PURE__ */ React.createElement("circle", { cx: "18", cy: "6", r: "3" }), /* @__PURE__ */ React.createElement("circle", { cx: "6", cy: "18", r: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M18 9a9 9 0 0 1-9 9" })), ArrowLeft = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "19", y1: "12", x2: "5", y2: "12" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 19 5 12 12 5" })), Lock = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "11", width: "18", height: "11", rx: "2", ry: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })), Download = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" }), /* @__PURE__ */ React.createElement("polyline", { points: "7 10 12 15 17 10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "15", x2: "12", y2: "3" })), MoveRight = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M18 8L22 12L18 16" }), /* @__PURE__ */ React.createElement("path", { d: "M2 12H22" })), Loader = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "2", x2: "12", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "18", x2: "12", y2: "22" }), /* @__PURE__ */ React.createElement("line", { x1: "4.93", y1: "4.93", x2: "7.76", y2: "7.76" }), /* @__PURE__ */ React.createElement("line", { x1: "16.24", y1: "16.24", x2: "19.07", y2: "19.07" }), /* @__PURE__ */ React.createElement("line", { x1: "2", y1: "12", x2: "6", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "12", x2: "22", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "4.93", y1: "19.07", x2: "7.76", y2: "16.24" }), /* @__PURE__ */ React.createElement("line", { x1: "16.24", y1: "7.76", x2: "19.07", y2: "4.93" })), Plus = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "5", x2: "12", y2: "19" }), /* @__PURE__ */ React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })), List = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "6", x2: "21", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "12", x2: "21", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "18", x2: "21", y2: "18" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "6", x2: "3.01", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "12", x2: "3.01", y2: "12" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "18", x2: "3.01", y2: "18" })), Terminal = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "4 17 10 11 4 5" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "19", x2: "20", y2: "19" })), ArrowRight = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 5 19 12 12 19" })), History = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" }), /* @__PURE__ */ React.createElement("path", { d: "M3 3v5h5" }), /* @__PURE__ */ React.createElement("polyline", { points: "12 7 12 12 15 15" })), Pause = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "6", y: "4", width: "4", height: "16" }), /* @__PURE__ */ React.createElement("rect", { x: "14", y: "4", width: "4", height: "16" })), Package = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "16.5", y1: "9.4", x2: "7.5", y2: "4.21" }), /* @__PURE__ */ React.createElement("path", { d: "M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" }), /* @__PURE__ */ React.createElement("polyline", { points: "3.27 6.96 12 12.01 20.73 6.96" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "22.08", x2: "12", y2: "12" })), Bell = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" }), /* @__PURE__ */ React.createElement("path", { d: "M13.73 21a2 2 0 0 1-3.46 0" })), MinusCircle = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "12", x2: "16", y2: "12" })), Folder = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" })), Minus = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "5", y1: "12", x2: "19", y2: "12" })), Edit = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), /* @__PURE__ */ React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })), Trash = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "3 6 5 6 21 6" }), /* @__PURE__ */ React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })), Copy = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), /* @__PURE__ */ React.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" })), ChevronLeft = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "15 18 9 12 15 6" })), ChevronsLeft = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "11 17 6 12 11 7" }), /* @__PURE__ */ React.createElement("polyline", { points: "18 17 13 12 18 7" })), ChevronsRight = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "13 17 18 12 13 7" }), /* @__PURE__ */ React.createElement("polyline", { points: "6 17 11 12 6 7" })), RotateCcw = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "1 4 1 10 7 10" }), /* @__PURE__ */ React.createElement("path", { d: "M3.51 15a9 9 0 1 0 2.13-9.36L1 10" })), Check = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "20 6 9 17 4 12" })), Cpu = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "4", y: "4", width: "16", height: "16", rx: "2", ry: "2" }), /* @__PURE__ */ React.createElement("rect", { x: "9", y: "9", width: "6", height: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "1", x2: "9", y2: "4" }), /* @__PURE__ */ React.createElement("line", { x1: "15", y1: "1", x2: "15", y2: "4" }), /* @__PURE__ */ React.createElement("line", { x1: "9", y1: "20", x2: "9", y2: "23" }), /* @__PURE__ */ React.createElement("line", { x1: "15", y1: "20", x2: "15", y2: "23" }), /* @__PURE__ */ React.createElement("line", { x1: "20", y1: "9", x2: "23", y2: "9" }), /* @__PURE__ */ React.createElement("line", { x1: "20", y1: "14", x2: "23", y2: "14" }), /* @__PURE__ */ React.createElement("line", { x1: "1", y1: "9", x2: "4", y2: "9" }), /* @__PURE__ */ React.createElement("line", { x1: "1", y1: "14", x2: "4", y2: "14" })), MemoryStick = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M6 19v-2" }), /* @__PURE__ */ React.createElement("path", { d: "M10 19v-2" }), /* @__PURE__ */ React.createElement("path", { d: "M14 19v-2" }), /* @__PURE__ */ React.createElement("path", { d: "M18 19v-2" }), /* @__PURE__ */ React.createElement("path", { d: "M8 11V9" }), /* @__PURE__ */ React.createElement("path", { d: "M16 11V7" }), /* @__PURE__ */ React.createElement("path", { d: "M12 11V5" }), /* @__PURE__ */ React.createElement("path", { d: "M2 15h20" }), /* @__PURE__ */ React.createElement("path", { d: "M2 17a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-4H2z" })), Globe = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "2", y1: "12", x2: "22", y2: "12" }), /* @__PURE__ */ React.createElement("path", { d: "M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" })), Search = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "11", cy: "11", r: "8" }), /* @__PURE__ */ React.createElement("line", { x1: "21", y1: "21", x2: "16.65", y2: "16.65" })), Eye = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" }), /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "3" })), EyeOff = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" }), /* @__PURE__ */ React.createElement("line", { x1: "1", y1: "1", x2: "23", y2: "23" })), Zap = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polygon", { points: "13 2 3 14 12 14 11 22 21 10 12 10 13 2" })), Database = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("ellipse", { cx: "12", cy: "5", rx: "9", ry: "3" }), /* @__PURE__ */ React.createElement("path", { d: "M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" }), /* @__PURE__ */ React.createElement("path", { d: "M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" })), HelpCircle = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("circle", { cx: "12", cy: "12", r: "10" }), /* @__PURE__ */ React.createElement("path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "17", x2: "12.01", y2: "17" })), Filter = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polygon", { points: "22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" })), Wifi = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M5 12.55a11 11 0 0 1 14.08 0" }), /* @__PURE__ */ React.createElement("path", { d: "M1.42 9a16 16 0 0 1 21.16 0" }), /* @__PURE__ */ React.createElement("path", { d: "M8.53 16.11a6 6 0 0 1 6.95 0" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "20", x2: "12.01", y2: "20" })), Power = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M18.36 6.64a9 9 0 1 1-12.73 0" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "2", x2: "12", y2: "12" })), Square = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "3", width: "18", height: "18", rx: "2", ry: "2" })), UserPlus = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ React.createElement("circle", { cx: "8.5", cy: "7", r: "4" }), /* @__PURE__ */ React.createElement("line", { x1: "20", y1: "8", x2: "20", y2: "14" }), /* @__PURE__ */ React.createElement("line", { x1: "23", y1: "11", x2: "17", y2: "11" })), Users = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("path", { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" }), /* @__PURE__ */ React.createElement("circle", { cx: "9", cy: "7", r: "4" }), /* @__PURE__ */ React.createElement("path", { d: "M23 21v-2a4 4 0 0 0-3-3.87" }), /* @__PURE__ */ React.createElement("path", { d: "M16 3.13a4 4 0 0 1 0 7.75" })), Calendar = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("rect", { x: "3", y: "4", width: "18", height: "18", rx: "2", ry: "2" }), /* @__PURE__ */ React.createElement("line", { x1: "16", y1: "2", x2: "16", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "8", y1: "2", x2: "8", y2: "6" }), /* @__PURE__ */ React.createElement("line", { x1: "3", y1: "10", x2: "21", y2: "10" }));
  var BarChart2 = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("line", { x1: "18", y1: "20", x2: "18", y2: "10" }), /* @__PURE__ */ React.createElement("line", { x1: "12", y1: "20", x2: "12", y2: "4" }), /* @__PURE__ */ React.createElement("line", { x1: "6", y1: "20", x2: "6", y2: "14" })), TrendingUp = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "23 6 13.5 15.5 8.5 10.5 1 18" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 6 23 6 23 12" })), TrendingDown = ({ size, className }) => /* @__PURE__ */ React.createElement("svg", { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", className }, /* @__PURE__ */ React.createElement("polyline", { points: "23 18 13.5 8.5 8.5 13.5 1 6" }), /* @__PURE__ */ React.createElement("polyline", { points: "17 18 23 18 23 12" })), ProxBalanceLogo = ({ size = 32 }) => /* @__PURE__ */ React.createElement("img", { src: "/assets/logo_icon_v2.svg?v=2", alt: "ProxBalance Logo", width: size, height: size });

  // src/components/settings/AIProviderSection.jsx
  init_constants();
  function AIProviderSection({
    aiEnabled,
    setAiEnabled,
    aiProvider,
    setAiProvider,
    openaiKey,
    setOpenaiKey,
    openaiModel,
    setOpenaiModel,
    anthropicKey,
    setAnthropicKey,
    anthropicModel,
    setAnthropicModel,
    localUrl,
    setLocalUrl,
    localModel,
    setLocalModel,
    localLoadingModels,
    setLocalLoadingModels,
    localAvailableModels,
    setLocalAvailableModels,
    collapsedSections,
    setCollapsedSections,
    setError
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "AI-Powered Recommendations"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center mb-4" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: aiEnabled,
        onChange: (e) => setAiEnabled(e.target.checked),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), /* @__PURE__ */ React.createElement("label", { className: "ml-2 text-sm text-gray-700 dark:text-gray-300" }, "Enable AI-Enhanced Migration Recommendations"))), aiEnabled && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "AI Provider"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: aiProvider,
        onChange: (e) => setAiProvider(e.target.value),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "none" }, "None"),
      /* @__PURE__ */ React.createElement("option", { value: "openai" }, "OpenAI (GPT-4)"),
      /* @__PURE__ */ React.createElement("option", { value: "anthropic" }, "Anthropic (Claude)"),
      /* @__PURE__ */ React.createElement("option", { value: "local" }, "Local LLM (Ollama)")
    )), aiProvider === "openai" && /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white" }, "OpenAI Configuration"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm text-gray-700 dark:text-gray-300 mb-1" }, "API Key"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        value: openaiKey,
        onChange: (e) => setOpenaiKey(e.target.value),
        placeholder: "sk-...",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm text-gray-700 dark:text-gray-300 mb-1" }, "Model"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: openaiModel,
        onChange: (e) => setOpenaiModel(e.target.value),
        placeholder: "gpt-4o",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "See available models at ", /* @__PURE__ */ React.createElement("a", { href: "https://platform.openai.com/docs/models", target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 dark:text-blue-400 hover:underline" }, "OpenAI Models")))), aiProvider === "anthropic" && /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white" }, "Anthropic Configuration"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm text-gray-700 dark:text-gray-300 mb-1" }, "API Key"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        value: anthropicKey,
        onChange: (e) => setAnthropicKey(e.target.value),
        placeholder: "sk-ant-...",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm text-gray-700 dark:text-gray-300 mb-1" }, "Model"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: anthropicModel,
        onChange: (e) => setAnthropicModel(e.target.value),
        placeholder: "claude-3-5-sonnet-20241022",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "See available models at ", /* @__PURE__ */ React.createElement("a", { href: "https://docs.anthropic.com/en/docs/about-claude/models", target: "_blank", rel: "noopener noreferrer", className: "text-blue-600 dark:text-blue-400 hover:underline" }, "Anthropic Models")))), aiProvider === "local" && /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white" }, "Local LLM (Ollama) Configuration"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Ollama Base URL"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: localUrl,
        onChange: (e) => setLocalUrl(e.target.value),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
        placeholder: "http://localhost:11434"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "The URL where Ollama is running")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300" }, "Model"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          setLocalLoadingModels(!0);
          try {
            let data = await (await fetch("/api/ai-models", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                provider: "local",
                base_url: localUrl
              })
            })).json();
            data.success ? setLocalAvailableModels(data.models || []) : setError("Failed to fetch models: " + (data.error || "Unknown error"));
          } catch (error) {
            setError("Error fetching models: " + error.message);
          } finally {
            setLocalLoadingModels(!1);
          }
        },
        disabled: localLoadingModels,
        className: "flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: localLoadingModels ? "animate-spin" : "" }),
      localLoadingModels ? "Loading..." : "Refresh Models"
    )), localAvailableModels.length > 0 ? /* @__PURE__ */ React.createElement(
      "select",
      {
        value: localModel,
        onChange: (e) => setLocalModel(e.target.value),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      },
      localAvailableModels.map((model) => /* @__PURE__ */ React.createElement("option", { key: model, value: model }, model))
    ) : /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: localModel,
        onChange: (e) => setLocalModel(e.target.value),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white",
        placeholder: "llama3.1:8b"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Ollama model to use for recommendations")), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-900 dark:text-blue-200" }, /* @__PURE__ */ React.createElement("strong", null, "Note:"), " Ensure Ollama is installed and running. Visit ", /* @__PURE__ */ React.createElement("a", { href: "https://ollama.ai", target: "_blank", rel: "noopener noreferrer", className: "underline" }, "ollama.ai"), " for installation instructions.")))));
  }

  // src/utils/formatters.js
  function formatLocalTime(dateInput) {
    return new Date(dateInput).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: !0
    });
  }
  function getTimezoneAbbr() {
    return (/* @__PURE__ */ new Date()).toLocaleTimeString("en-US", { timeZoneName: "short" }).split(" ").pop();
  }
  function formatRelativeTime(timestamp) {
    if (!timestamp) return "";
    try {
      let ts = typeof timestamp == "string" ? timestamp.endsWith("Z") || timestamp.includes("+") ? timestamp : timestamp + "Z" : timestamp, date = new Date(ts), diffMs = Date.now() - date, diffMins = Math.floor(diffMs / 6e4);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      let diffHours = Math.floor(diffMs / 36e5);
      if (diffHours < 24) return `${diffHours}h ago`;
      let diffDays = Math.floor(diffMs / 864e5);
      return diffDays < 7 ? `${diffDays}d ago` : date.toLocaleDateString();
    } catch {
      return "";
    }
  }

  // src/components/settings/DataCollectionSection.jsx
  init_constants();
  var { useState } = React;
  function DataCollectionSection({
    backendCollected,
    loading,
    data,
    config,
    handleRefresh,
    fetchConfig: fetchConfig2,
    setError
  }) {
    let [savingCollectionSettings, setSavingCollectionSettings] = useState(!1), [collectionSettingsSaved, setCollectionSettingsSaved] = useState(!1);
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-6" }, "Data Collection & Performance"), /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("h4", { className: "text-md font-semibold text-gray-800 dark:text-gray-200 mb-3" }, "Status"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, backendCollected && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Server, { size: 16, className: "text-green-600 dark:text-green-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-700 dark:text-gray-300" }, "Last collected: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-green-600 dark:text-green-400" }, formatLocalTime(backendCollected), " ", getTimezoneAbbr()))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleRefresh,
        disabled: loading,
        className: "p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed",
        title: "Refresh data collection now"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: `${loading ? "animate-spin" : ""} text-gray-600 dark:text-gray-400` })
    )))), data?.performance && /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("h4", { className: "text-md font-semibold text-gray-800 dark:text-gray-200 mb-3" }, "Performance Metrics"), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white/50 dark:bg-gray-800/50 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Total Time"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-green-600 dark:text-green-400" }, data.performance.total_time, "s")), /* @__PURE__ */ React.createElement("div", { className: "bg-white/50 dark:bg-gray-800/50 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Node Processing"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-blue-600 dark:text-blue-400" }, data.performance.node_processing_time, "s"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-500 mt-1" }, data.performance.parallel_enabled ? "Parallel" : "Sequential")), /* @__PURE__ */ React.createElement("div", { className: "bg-white/50 dark:bg-gray-800/50 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Guest Processing"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-purple-600 dark:text-purple-400" }, data.performance.guest_processing_time, "s")), /* @__PURE__ */ React.createElement("div", { className: "bg-white/50 dark:bg-gray-800/50 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Workers Used"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-orange-600 dark:text-orange-400" }, data.performance.max_workers), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-500 mt-1" }, data.performance.node_count, " nodes, ", data.performance.guest_count, " guests"))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-md font-semibold text-gray-800 dark:text-gray-200 mb-3" }, "Optimization Settings"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-900 dark:text-blue-200" }, /* @__PURE__ */ React.createElement("strong", null, "Collection Performance:"), " Optimize data collection speed based on cluster size. Parallel collection can reduce collection time by 3-5x.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Cluster Size Preset"), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: "clusterSizePreset",
        defaultValue: config?.collection_optimization?.cluster_size || "medium",
        onChange: (e) => {
          let preset = {
            small: { interval: 5, workers: 3, node_tf: "day", guest_tf: "hour" },
            medium: { interval: 15, workers: 5, node_tf: "day", guest_tf: "hour" },
            large: { interval: 30, workers: 8, node_tf: "hour", guest_tf: "hour" },
            custom: {}
          }[e.target.value];
          if (preset && e.target.value !== "custom") {
            let intervalInput = document.getElementById("collectionInterval"), workersInput = document.getElementById("maxWorkers"), nodeTimeframeSelect = document.getElementById("nodeTimeframe"), guestTimeframeSelect = document.getElementById("guestTimeframe");
            intervalInput && (intervalInput.value = preset.interval), workersInput && (workersInput.value = preset.workers), nodeTimeframeSelect && (nodeTimeframeSelect.value = preset.node_tf), guestTimeframeSelect && (guestTimeframeSelect.value = preset.guest_tf);
          }
        },
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "small" }, "Small (< 30 VMs/CTs) - 5 min intervals"),
      /* @__PURE__ */ React.createElement("option", { value: "medium" }, "Medium (30-100 VMs/CTs) - 15 min intervals"),
      /* @__PURE__ */ React.createElement("option", { value: "large" }, "Large (100+ VMs/CTs) - 30 min intervals"),
      /* @__PURE__ */ React.createElement("option", { value: "custom" }, "Custom")
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Collection Interval (minutes)"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        id: "collectionInterval",
        defaultValue: config?.collection_interval_minutes || 15,
        min: "1",
        max: "240",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "How often to collect full cluster metrics")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        id: "parallelEnabled",
        defaultChecked: config?.collection_optimization?.parallel_collection_enabled !== !1,
        className: "rounded border-gray-300 dark:border-gray-600"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-700 dark:text-gray-300" }, "Enable Parallel Collection")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6" }, "Process multiple nodes simultaneously (3-5x faster)")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Max Parallel Workers"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        id: "maxWorkers",
        defaultValue: config?.collection_optimization?.max_parallel_workers || 5,
        min: "1",
        max: "10",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Number of nodes to process concurrently")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        id: "skipStoppedRRD",
        defaultChecked: config?.collection_optimization?.skip_stopped_guest_rrd !== !1,
        className: "rounded border-gray-300 dark:border-gray-600"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-700 dark:text-gray-300" }, "Skip RRD for Stopped Guests")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6" }, "Don't collect performance metrics for stopped VMs/CTs (faster collection)")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Node RRD Timeframe"), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: "nodeTimeframe",
        defaultValue: config?.collection_optimization?.node_rrd_timeframe || "day",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      },
      /* @__PURE__ */ React.createElement("option", { value: "hour" }, "Hour (~60 points)"),
      /* @__PURE__ */ React.createElement("option", { value: "day" }, "Day (~1440 points)")
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Guest RRD Timeframe"), /* @__PURE__ */ React.createElement(
      "select",
      {
        id: "guestTimeframe",
        defaultValue: config?.collection_optimization?.guest_rrd_timeframe || "hour",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      },
      /* @__PURE__ */ React.createElement("option", { value: "hour" }, "Hour (~60 points)"),
      /* @__PURE__ */ React.createElement("option", { value: "day" }, "Day (~1440 points)")
    ))), /* @__PURE__ */ React.createElement("div", { className: "sticky bottom-0 bg-gray-50 dark:bg-gray-700/50 -mx-4 -mb-4 px-4 py-4 mt-4 border-t border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setSavingCollectionSettings(!0), setCollectionSettingsSaved(!1);
          let collectionConfig = {
            collection_interval_minutes: parseInt(document.getElementById("collectionInterval").value),
            collection_optimization: {
              cluster_size: document.getElementById("clusterSizePreset").value,
              parallel_collection_enabled: document.getElementById("parallelEnabled").checked,
              max_parallel_workers: parseInt(document.getElementById("maxWorkers").value),
              skip_stopped_guest_rrd: document.getElementById("skipStoppedRRD").checked,
              node_rrd_timeframe: document.getElementById("nodeTimeframe").value,
              guest_rrd_timeframe: document.getElementById("guestTimeframe").value
            }
          };
          fetch(`${API_BASE}/settings/collection`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(collectionConfig)
          }).then((response) => response.json()).then((result) => {
            setSavingCollectionSettings(!1), result.success ? (setCollectionSettingsSaved(!0), setTimeout(() => setCollectionSettingsSaved(!1), 3e3), fetchConfig2()) : setError("Failed to update settings: " + (result.error || "Unknown error"));
          }).catch((error) => {
            setSavingCollectionSettings(!1), setError("Error: " + error.message);
          });
        },
        disabled: savingCollectionSettings,
        className: `w-full px-4 py-2 text-white rounded font-medium flex items-center justify-center gap-2 shadow-lg transition-colors ${collectionSettingsSaved ? "bg-emerald-500 dark:bg-emerald-600" : savingCollectionSettings ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed" : "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600"}`
      },
      savingCollectionSettings ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" }), "Saving...") : collectionSettingsSaved ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle, { size: 16 }), "Settings Saved!") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Save, { size: 16 }), "Apply Collection Settings")
    )))));
  }

  // src/components/NumberField.jsx
  var { useState: useState2, useEffect, useRef } = React;
  function NumberField({ value, onCommit, isFloat, className, ...props }) {
    let [localVal, setLocalVal] = useState2(String(value ?? "")), committedRef = useRef(value);
    return useEffect(() => {
      value !== committedRef.current && (committedRef.current = value, setLocalVal(String(value ?? "")));
    }, [value]), /* @__PURE__ */ React.createElement(
      "input",
      {
        ...props,
        type: "number",
        value: localVal,
        onChange: (e) => setLocalVal(e.target.value),
        onBlur: () => {
          let parsed = isFloat ? parseFloat(localVal) : parseInt(localVal, 10);
          isNaN(parsed) ? setLocalVal(String(value ?? "")) : (committedRef.current = parsed, onCommit(parsed));
        },
        className
      }
    );
  }

  // src/components/settings/NotificationsSection.jsx
  init_constants();
  function NotificationsSection({ automationConfig, saveAutomationConfig: saveAutomationConfig2, collapsedSections, setCollapsedSections }) {
    return /* @__PURE__ */ React.createElement("div", { className: "border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 flex-wrap gap-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement(Bell, { className: "text-gray-600 dark:text-gray-400 shrink-0", size: 24 }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, "Notifications"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400" }, "Get notified about migrations, maintenance events, and cluster alerts"))), /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.enabled || !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, enabled: e.target.checked } }),
        className: "sr-only peer"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" }))), automationConfig.notifications?.enabled && /* @__PURE__ */ React.createElement("div", { className: "space-y-4 mt-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Migration Events"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-4 gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_start !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_start: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Run started"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_complete !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_complete: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Run completed"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_action !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_action: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Each migration"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_failure !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_failure: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Safety check failure")), automationConfig.notifications?.on_action !== !1 && /* @__PURE__ */ React.createElement("div", { className: "mt-2 ml-6 flex flex-wrap gap-x-4 gap-y-1" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_action_success !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_action_success: e.target.checked } }),
        className: "w-3.5 h-3.5 text-green-600 border-gray-300 rounded focus:ring-green-500"
      }
    ), "Successful migrations"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_action_failure !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_action_failure: e.target.checked } }),
        className: "w-3.5 h-3.5 text-red-600 border-gray-300 rounded focus:ring-red-500"
      }
    ), "Failed migrations"))), /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Cluster Events"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer", title: "Alert when a node goes offline or comes back online" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_node_status !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_node_status: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Node status changes"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer", title: "Alert when CPU or memory exceeds safety thresholds" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_resource_threshold === !0,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_resource_threshold: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Resource threshold breach"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer", title: "Alert when node evacuation starts or completes" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_evacuation !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_evacuation: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Evacuation events"))), /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-700 dark:text-gray-300 mb-2" }, "System Events"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer", title: "Alert when new migration recommendations are generated" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_recommendations === !0,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_recommendations: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "New recommendations"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer", title: "Alert when data collection succeeds or fails" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_collector_status === !0,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_collector_status: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Collector status"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer", title: "Alert when a new ProxBalance version is available" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.on_update_available !== !1,
        onChange: (e) => saveAutomationConfig2({ notifications: { ...automationConfig.notifications, on_update_available: e.target.checked } }),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Update available"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-between p-3 cursor-pointer",
        onClick: () => {
          let el = document.getElementById("settings-notif-pushover");
          el && el.classList.toggle("hidden");
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "Pushover"), automationConfig.notifications?.providers?.pushover?.enabled && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full", title: "Active" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }))),
      /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: automationConfig.notifications?.providers?.pushover?.enabled || !1,
          onChange: (e) => {
            let providers = { ...automationConfig.notifications?.providers || {} };
            providers.pushover = { ...providers.pushover || {}, enabled: e.target.checked }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
          },
          className: "sr-only peer"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" }))
    ), /* @__PURE__ */ React.createElement("div", { id: "settings-notif-pushover", className: "hidden p-3 pt-0 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "API Token"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        placeholder: "Application API token",
        value: automationConfig.notifications?.providers?.pushover?.api_token || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.pushover = { ...providers.pushover || {}, api_token: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "User Key"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        placeholder: "Your user/group key",
        value: automationConfig.notifications?.providers?.pushover?.user_key || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.pushover = { ...providers.pushover || {}, user_key: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Priority"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: automationConfig.notifications?.providers?.pushover?.priority ?? 0,
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.pushover = { ...providers.pushover || {}, priority: parseInt(e.target.value) }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: -1 }, "Low"),
      /* @__PURE__ */ React.createElement("option", { value: 0 }, "Normal"),
      /* @__PURE__ */ React.createElement("option", { value: 1 }, "High"),
      /* @__PURE__ */ React.createElement("option", { value: 2 }, "Emergency")
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Sound"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: automationConfig.notifications?.providers?.pushover?.sound || "pushover",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.pushover = { ...providers.pushover || {}, sound: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "pushover" }, "Pushover (default)"),
      /* @__PURE__ */ React.createElement("option", { value: "bike" }, "Bike"),
      /* @__PURE__ */ React.createElement("option", { value: "bugle" }, "Bugle"),
      /* @__PURE__ */ React.createElement("option", { value: "cashregister" }, "Cash Register"),
      /* @__PURE__ */ React.createElement("option", { value: "classical" }, "Classical"),
      /* @__PURE__ */ React.createElement("option", { value: "cosmic" }, "Cosmic"),
      /* @__PURE__ */ React.createElement("option", { value: "falling" }, "Falling"),
      /* @__PURE__ */ React.createElement("option", { value: "gamelan" }, "Gamelan"),
      /* @__PURE__ */ React.createElement("option", { value: "incoming" }, "Incoming"),
      /* @__PURE__ */ React.createElement("option", { value: "intermission" }, "Intermission"),
      /* @__PURE__ */ React.createElement("option", { value: "magic" }, "Magic"),
      /* @__PURE__ */ React.createElement("option", { value: "mechanical" }, "Mechanical"),
      /* @__PURE__ */ React.createElement("option", { value: "pianobar" }, "Piano Bar"),
      /* @__PURE__ */ React.createElement("option", { value: "siren" }, "Siren"),
      /* @__PURE__ */ React.createElement("option", { value: "spacealarm" }, "Space Alarm"),
      /* @__PURE__ */ React.createElement("option", { value: "tugboat" }, "Tugboat"),
      /* @__PURE__ */ React.createElement("option", { value: "alien" }, "Alien Alarm (long)"),
      /* @__PURE__ */ React.createElement("option", { value: "climb" }, "Climb (long)"),
      /* @__PURE__ */ React.createElement("option", { value: "persistent" }, "Persistent (long)"),
      /* @__PURE__ */ React.createElement("option", { value: "echo" }, "Echo (long)"),
      /* @__PURE__ */ React.createElement("option", { value: "updown" }, "Up Down (long)"),
      /* @__PURE__ */ React.createElement("option", { value: "vibrate" }, "Vibrate Only"),
      /* @__PURE__ */ React.createElement("option", { value: "none" }, "None (silent)")
    ))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Get your API token and user key from ", /* @__PURE__ */ React.createElement("a", { href: "https://pushover.net", target: "_blank", rel: "noopener noreferrer", className: "text-blue-500 hover:underline" }, "pushover.net")))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-between p-3 cursor-pointer",
        onClick: () => {
          let el = document.getElementById("settings-notif-email");
          el && el.classList.toggle("hidden");
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "Email (SMTP)"), automationConfig.notifications?.providers?.email?.enabled && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full", title: "Active" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }))),
      /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: automationConfig.notifications?.providers?.email?.enabled || !1,
          onChange: (e) => {
            let providers = { ...automationConfig.notifications?.providers || {} };
            providers.email = { ...providers.email || {}, enabled: e.target.checked }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
          },
          className: "sr-only peer"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" }))
    ), /* @__PURE__ */ React.createElement("div", { id: "settings-notif-email", className: "hidden p-3 pt-0 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "SMTP Host"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "smtp.gmail.com",
        value: automationConfig.notifications?.providers?.email?.smtp_host || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.email = { ...providers.email || {}, smtp_host: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "SMTP Port"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "65535",
        value: automationConfig.notifications?.providers?.email?.smtp_port || 587,
        onCommit: (val) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.email = { ...providers.email || {}, smtp_port: val }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Username"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "user@example.com",
        value: automationConfig.notifications?.providers?.email?.smtp_username || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.email = { ...providers.email || {}, smtp_username: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Password"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        placeholder: "App password",
        value: automationConfig.notifications?.providers?.email?.smtp_password || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.email = { ...providers.email || {}, smtp_password: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "From Address"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "email",
        placeholder: "proxbalance@example.com",
        value: automationConfig.notifications?.providers?.email?.from_address || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.email = { ...providers.email || {}, from_address: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "To Addresses"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "admin@example.com, ops@example.com",
        value: Array.isArray(automationConfig.notifications?.providers?.email?.to_addresses) ? automationConfig.notifications.providers.email.to_addresses.join(", ") : automationConfig.notifications?.providers?.email?.to_addresses || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.email = { ...providers.email || {}, to_addresses: e.target.value.split(",").map((a) => a.trim()).filter((a) => a) }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ))), /* @__PURE__ */ React.createElement("label", { className: "flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300 cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: automationConfig.notifications?.providers?.email?.smtp_tls !== !1,
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.email = { ...providers.email || {}, smtp_tls: e.target.checked }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), "Use STARTTLS"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-between p-3 cursor-pointer",
        onClick: () => {
          let el = document.getElementById("settings-notif-telegram");
          el && el.classList.toggle("hidden");
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "Telegram"), automationConfig.notifications?.providers?.telegram?.enabled && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full", title: "Active" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }))),
      /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: automationConfig.notifications?.providers?.telegram?.enabled || !1,
          onChange: (e) => {
            let providers = { ...automationConfig.notifications?.providers || {} };
            providers.telegram = { ...providers.telegram || {}, enabled: e.target.checked }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
          },
          className: "sr-only peer"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" }))
    ), /* @__PURE__ */ React.createElement("div", { id: "settings-notif-telegram", className: "hidden p-3 pt-0 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Bot Token"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        placeholder: "123456:ABC-DEF...",
        value: automationConfig.notifications?.providers?.telegram?.bot_token || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.telegram = { ...providers.telegram || {}, bot_token: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Chat ID"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "-1001234567890",
        value: automationConfig.notifications?.providers?.telegram?.chat_id || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.telegram = { ...providers.telegram || {}, chat_id: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Create a bot via ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, "@BotFather"), " on Telegram and add it to your group/channel"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-between p-3 cursor-pointer",
        onClick: () => {
          let el = document.getElementById("settings-notif-discord");
          el && el.classList.toggle("hidden");
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "Discord"), automationConfig.notifications?.providers?.discord?.enabled && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full", title: "Active" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }))),
      /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: automationConfig.notifications?.providers?.discord?.enabled || !1,
          onChange: (e) => {
            let providers = { ...automationConfig.notifications?.providers || {} };
            providers.discord = { ...providers.discord || {}, enabled: e.target.checked }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
          },
          className: "sr-only peer"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" }))
    ), /* @__PURE__ */ React.createElement("div", { id: "settings-notif-discord", className: "hidden p-3 pt-0 space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Webhook URL"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "url",
        placeholder: "https://discord.com/api/webhooks/...",
        value: automationConfig.notifications?.providers?.discord?.webhook_url || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.discord = { ...providers.discord || {}, webhook_url: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Server Settings > Integrations > Webhooks > New Webhook"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-between p-3 cursor-pointer",
        onClick: () => {
          let el = document.getElementById("settings-notif-slack");
          el && el.classList.toggle("hidden");
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "Slack"), automationConfig.notifications?.providers?.slack?.enabled && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full", title: "Active" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }))),
      /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: automationConfig.notifications?.providers?.slack?.enabled || !1,
          onChange: (e) => {
            let providers = { ...automationConfig.notifications?.providers || {} };
            providers.slack = { ...providers.slack || {}, enabled: e.target.checked }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
          },
          className: "sr-only peer"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" }))
    ), /* @__PURE__ */ React.createElement("div", { id: "settings-notif-slack", className: "hidden p-3 pt-0 space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Webhook URL"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "url",
        placeholder: "https://hooks.slack.com/services/T.../B.../...",
        value: automationConfig.notifications?.providers?.slack?.webhook_url || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.slack = { ...providers.slack || {}, webhook_url: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Create an Incoming Webhook in your Slack workspace settings"))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800/50 rounded border border-gray-200 dark:border-gray-600 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "flex items-center justify-between p-3 cursor-pointer",
        onClick: () => {
          let el = document.getElementById("settings-notif-webhook");
          el && el.classList.toggle("hidden");
        }
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "Generic Webhook"), automationConfig.notifications?.providers?.webhook?.enabled && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300 px-1.5 py-0.5 rounded-full", title: "Active" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }))),
      /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "checkbox",
          checked: automationConfig.notifications?.providers?.webhook?.enabled || !1,
          onChange: (e) => {
            let providers = { ...automationConfig.notifications?.providers || {} };
            providers.webhook = { ...providers.webhook || {}, enabled: e.target.checked }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
          },
          className: "sr-only peer"
        }
      ), /* @__PURE__ */ React.createElement("div", { className: "w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600" }))
    ), /* @__PURE__ */ React.createElement("div", { id: "settings-notif-webhook", className: "hidden p-3 pt-0 space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Webhook URL"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "url",
        placeholder: "https://your-server.com/webhook",
        value: automationConfig.notifications?.providers?.webhook?.url || "",
        onChange: (e) => {
          let providers = { ...automationConfig.notifications?.providers || {} };
          providers.webhook = { ...providers.webhook || {}, url: e.target.value }, saveAutomationConfig2({ notifications: { ...automationConfig.notifications, providers } });
        },
        className: "w-full px-2 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Sends a JSON POST with title, message, priority, and timestamp"))), /* @__PURE__ */ React.createElement("div", { className: "pt-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          try {
            let result = await (await fetch(`${API_BASE}/notifications/test`, {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            })).json();
            if (result.success)
              alert("Test notifications sent successfully to all enabled providers.");
            else {
              let details = result.results ? Object.entries(result.results).map(([k, v]) => `${k}: ${v.success ? "OK" : v.error}`).join(`
`) : result.error;
              alert(`Notification test results:
${details}`);
            }
          } catch (err) {
            alert(`Failed to send test: ${err.message}`);
          }
        },
        className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(Bell, { size: 14 }),
      "Send Test Notification"
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-2" }, "Sends a test message to all enabled providers to verify your configuration"))));
  }

  // src/components/settings/AdvancedSystemSettings.jsx
  init_constants();
  var { useState: useState3 } = React;
  function AdvancedSystemSettings({
    showAdvancedSettings,
    setShowAdvancedSettings,
    data,
    config,
    logLevel,
    setLogLevel,
    verboseLogging,
    setVerboseLogging,
    proxmoxTokenId,
    setProxmoxTokenId,
    proxmoxTokenSecret,
    setProxmoxTokenSecret,
    validatingToken,
    tokenValidationResult,
    confirmHostChange,
    setConfirmHostChange,
    validateToken: validateToken2,
    confirmAndChangeHost,
    error,
    setError
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "border-2 border-red-500 dark:border-red-600 rounded-lg p-4 bg-red-50 dark:bg-red-900/20" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAdvancedSettings(!showAdvancedSettings),
        className: "w-full flex items-center justify-between text-left group flex-wrap gap-y-3"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "text-red-600 dark:text-red-500 shrink-0", size: 24 }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, "Advanced System Settings"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Data management, debugging, API configuration, and system controls"))),
      /* @__PURE__ */ React.createElement(
        ChevronDown,
        {
          className: `text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${showAdvancedSettings ? "rotate-180" : ""}`,
          size: 20
        }
      )
    ), showAdvancedSettings && /* @__PURE__ */ React.createElement("div", { className: "mt-4 space-y-6" }, /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4" }, "Data Management"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          let dataStr = JSON.stringify(data, null, 2), blob = new Blob([dataStr], { type: "application/json" }), url = URL.createObjectURL(blob), a = document.createElement("a");
          a.href = url, a.download = `proxbalance-data-${(/* @__PURE__ */ new Date()).toISOString()}.json`, a.click(), URL.revokeObjectURL(url);
        },
        className: "w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 16 }),
      "Export Cluster Data (JSON)"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (!data || !data.guests) return;
          let csv = `VMID,Name,Type,Node,Status,CPU Usage (%),Memory Used (GB),Memory Max (GB),CPU Cores
`;
          Object.values(data.guests).forEach((guest) => {
            csv += `${guest.vmid},"${guest.name}",${guest.type},${guest.node},${guest.status},${guest.cpu_current.toFixed(2)},${guest.mem_used_gb.toFixed(2)},${guest.mem_max_gb.toFixed(2)},${guest.cpu_cores || 0}
`;
          });
          let blob = new Blob([csv], { type: "text/csv" }), url = URL.createObjectURL(blob), a = document.createElement("a");
          a.href = url, a.download = `proxbalance-guests-${(/* @__PURE__ */ new Date()).toISOString()}.csv`, a.click(), URL.revokeObjectURL(url);
        },
        className: "w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 16 }),
      "Export Guest List (CSV)"
    ))), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4" }, "Debug & Logging"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Log Level"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: logLevel,
        onChange: (e) => setLogLevel(e.target.value),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "ERROR" }, "ERROR - Only critical errors"),
      /* @__PURE__ */ React.createElement("option", { value: "WARN" }, "WARN - Warnings and errors"),
      /* @__PURE__ */ React.createElement("option", { value: "INFO" }, "INFO - General information"),
      /* @__PURE__ */ React.createElement("option", { value: "DEBUG" }, "DEBUG - Detailed debugging")
    )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: verboseLogging,
        onChange: (e) => setVerboseLogging(e.target.checked),
        className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
      }
    ), /* @__PURE__ */ React.createElement("label", { className: "ml-2 text-sm text-gray-700 dark:text-gray-300" }, "Enable Verbose Logging (includes API calls and data processing)")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          window.open("/api/logs/download?service=proxmox-balance", "_blank");
        },
        className: "w-full px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 16 }),
      "Download API Logs"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          window.open("/api/logs/download?service=proxmox-collector", "_blank");
        },
        className: "w-full px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded hover:bg-gray-700 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 16 }),
      "Download Collector Logs"
    )))), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement("div", { id: "proxmox-api-config" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4" }, "Proxmox API Configuration"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "API Token ID"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: proxmoxTokenId,
        onChange: (e) => setProxmoxTokenId(e.target.value),
        placeholder: "proxbalance@pam!proxbalance",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Format: user@realm!tokenname (e.g., proxbalance@pam!proxbalance)")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "API Token Secret"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "password",
        value: proxmoxTokenSecret,
        onChange: (e) => setProxmoxTokenSecret(e.target.value),
        placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-mono text-sm"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "The UUID token secret from Proxmox")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: validateToken2,
        disabled: validatingToken || !proxmoxTokenId || !proxmoxTokenSecret,
        className: "w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      },
      validatingToken ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }), "Validating Token...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle, { size: 16 }), "Validate Token & Check Permissions")
    ), tokenValidationResult && /* @__PURE__ */ React.createElement("div", { className: `p-4 rounded border ${tokenValidationResult.success ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, tokenValidationResult.success ? /* @__PURE__ */ React.createElement(CheckCircle, { size: 20, className: "text-green-600 dark:text-green-400 shrink-0 mt-0.5" }) : /* @__PURE__ */ React.createElement(AlertCircle, { size: 20, className: "text-red-600 dark:text-red-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("p", { className: `font-semibold text-sm mb-1 ${tokenValidationResult.success ? "text-green-900 dark:text-green-200" : "text-red-900 dark:text-red-200"}` }, tokenValidationResult.message), tokenValidationResult.success && /* @__PURE__ */ React.createElement(React.Fragment, null, tokenValidationResult.version && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-green-800 dark:text-green-300 mb-2" }, "Proxmox VE Version: ", tokenValidationResult.version), tokenValidationResult.permissions && tokenValidationResult.permissions.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold text-green-900 dark:text-green-200 mb-1" }, "Token Permissions:"), /* @__PURE__ */ React.createElement("ul", { className: "text-xs text-green-800 dark:text-green-300 space-y-1 ml-4" }, tokenValidationResult.permissions.map((perm, idx) => /* @__PURE__ */ React.createElement("li", { key: idx, className: "flex items-start gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400" }, "\u2022"), /* @__PURE__ */ React.createElement("span", null, perm))))))))), /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-900 dark:text-blue-200" }, /* @__PURE__ */ React.createElement("strong", null, "Tip:"), ' Use the installation script to automatically create an API token with proper permissions. Click "Validate Token" after entering credentials to verify connectivity and check permissions.')))), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4" }, "Proxmox Host Configuration"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-3 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-900 dark:text-blue-200" }, /* @__PURE__ */ React.createElement("strong", null, "Current Proxmox Host:"), " ", config?.proxmox_host || "Not configured")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "New Proxmox Host IP/Hostname"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        id: "proxmoxHostInput",
        defaultValue: config?.proxmox_host || "",
        placeholder: "10.0.0.3 or pve-node1",
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "IP address or hostname of the Proxmox node to connect to")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          let newHost = document.getElementById("proxmoxHostInput").value.trim();
          if (!newHost) {
            setError("Please enter a valid Proxmox host");
            return;
          }
          confirmHostChange === newHost ? confirmAndChangeHost() : setConfirmHostChange(newHost);
        },
        className: `w-full px-4 py-2 text-white rounded font-medium flex items-center justify-center gap-1.5 ${confirmHostChange ? "bg-orange-600 dark:bg-orange-500 hover:bg-orange-700 dark:hover:bg-orange-600" : "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"}`
      },
      confirmHostChange ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 14 }), " Click again to confirm") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Server, { size: 14 }), " Update Proxmox Host")
    ))), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4" }, "Configuration Backup & Restore"), /* @__PURE__ */ React.createElement("div", { className: "space-y-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Export your configuration for backup or import it on a fresh installation. Automatic backups are created before each import."), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded" }, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-gray-900 dark:text-white mb-2" }, "Export Configuration"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-3" }, "Download all settings as a JSON file for backup or migration to another instance."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          window.location.href = `${API_BASE}/config/export`;
        },
        className: "w-full px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 16 }),
      "Export Configuration"
    )), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded" }, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-gray-900 dark:text-white mb-2" }, "Import Configuration"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-3" }, "Upload a configuration file to restore settings. Your current configuration will be automatically backed up before import."), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "file",
        ref: (el) => {
          window.configFileInput || (window.configFileInput = el);
        },
        accept: ".json",
        style: { display: "none" },
        onChange: (e) => {
          let file = e.target.files?.[0];
          if (!file) return;
          if (!confirm(`Import configuration?

This will replace all current settings. Your current configuration will be backed up automatically.

Are you sure?`)) {
            e.target.value = "";
            return;
          }
          let formData = new FormData();
          formData.append("file", file), fetch(`${API_BASE}/config/import`, {
            method: "POST",
            body: formData
          }).then((response) => response.json()).then((result) => {
            if (result.success)
              alert(`Configuration imported successfully!

` + (result.validation_warnings?.length > 0 ? `Warnings:
` + result.validation_warnings.join(`
`) : "Services will restart automatically.")), setTimeout(() => window.location.reload(), 2e3);
            else {
              let errorMsg = `Failed to import configuration:
` + result.error;
              result.validation_errors?.length > 0 && (errorMsg += `

Validation Errors:
` + result.validation_errors.join(`
`)), result.validation_warnings?.length > 0 && (errorMsg += `

Warnings:
` + result.validation_warnings.join(`
`)), alert(errorMsg);
            }
          }).catch((error2) => {
            alert("Error importing configuration: " + error2.message);
          }).finally(() => {
            e.target.value = "";
          });
        }
      }
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => window.configFileInput?.click(),
        className: "w-full px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded hover:bg-green-700 dark:hover:bg-green-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Upload, { size: 16 }),
      "Import Configuration"
    )), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded" }, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-gray-900 dark:text-white mb-2" }, "Create Backup"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-3" }, "Create a manual backup of your current configuration. Last 5 backups are kept automatically."), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          fetch(`${API_BASE}/config/backup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          }).then((response) => response.json()).then((result) => {
            result.success ? alert(`Backup created successfully!

File: ` + result.backup_file) : alert("Failed to create backup: " + result.error);
          }).catch((error2) => {
            alert("Error creating backup: " + error2.message);
          });
        },
        className: "w-full px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Save, { size: 16 }),
      "Create Backup Now"
    )), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 italic p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded" }, /* @__PURE__ */ React.createElement("strong", null, "Note:"), " Backups are stored in /opt/proxmox-balance-manager/backups/ and rotated automatically (last 5 kept)."))), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white mb-4" }, "Service Management"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          confirm(`Restart ProxBalance API service?

This will briefly interrupt data collection.`) && fetch(`${API_BASE}/system/restart-service`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ service: "proxmox-balance" })
          }).then((response) => response.json()).then((result) => {
            result.success || setError("Failed to restart service: " + (result.error || "Unknown error"));
          }).catch((error2) => setError("Error: " + error2.message));
        },
        className: "w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 16 }),
      "Restart API Service"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          confirm(`Restart Data Collector service?

This will restart the background data collection process.`) && fetch(`${API_BASE}/system/restart-service`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ service: "proxmox-collector" })
          }).then((response) => response.json()).then((result) => {
            result.success || setError("Failed to restart service: " + (result.error || "Unknown error"));
          }).catch((error2) => setError("Error: " + error2.message));
        },
        className: "w-full px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded hover:bg-orange-700 dark:hover:bg-orange-600 font-medium flex items-center justify-center gap-2"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 16 }),
      "Restart Collector Service"
    ))))));
  }

  // src/components/SettingsPage.jsx
  function SettingsPage(props) {
    let {
      darkMode,
      setDarkMode,
      config,
      setCurrentPage,
      aiEnabled,
      setAiEnabled,
      aiProvider,
      setAiProvider,
      openaiKey,
      setOpenaiKey,
      openaiModel,
      setOpenaiModel,
      anthropicKey,
      setAnthropicKey,
      anthropicModel,
      setAnthropicModel,
      localUrl,
      setLocalUrl,
      localModel,
      setLocalModel,
      localLoadingModels,
      setLocalLoadingModels,
      localAvailableModels,
      setLocalAvailableModels,
      backendCollected,
      loading,
      data,
      automationConfig,
      showAdvancedSettings,
      setShowAdvancedSettings,
      logLevel,
      setLogLevel,
      verboseLogging,
      setVerboseLogging,
      proxmoxTokenId,
      setProxmoxTokenId,
      proxmoxTokenSecret,
      setProxmoxTokenSecret,
      validatingToken,
      tokenValidationResult,
      confirmHostChange,
      setConfirmHostChange,
      savingSettings,
      error,
      setError,
      handleRefresh,
      fetchConfig: fetchConfig2,
      saveSettings: saveSettings2,
      saveAutomationConfig: saveAutomationConfig2,
      validateToken: validateToken2,
      confirmAndChangeHost
    } = props;
    return /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 min-w-0" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentPage("dashboard"),
        className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shrink-0",
        title: "Back to Dashboard"
      },
      /* @__PURE__ */ React.createElement(ArrowLeft, { size: 20, className: "text-gray-700 dark:text-gray-300" })
    ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement(Settings, { size: 28, className: "text-blue-600 dark:text-blue-400 shrink-0" }), /* @__PURE__ */ React.createElement("h1", { className: "text-xl sm:text-3xl font-bold text-gray-900 dark:text-white" }, "Settings"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setDarkMode(!darkMode),
        className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
        title: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
      },
      darkMode ? /* @__PURE__ */ React.createElement(Sun, { size: 20, className: "text-yellow-500" }) : /* @__PURE__ */ React.createElement(Moon, { size: 20, className: "text-gray-700" })
    ))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-8" }, /* @__PURE__ */ React.createElement(
      AIProviderSection,
      {
        aiEnabled,
        setAiEnabled,
        aiProvider,
        setAiProvider,
        openaiKey,
        setOpenaiKey,
        openaiModel,
        setOpenaiModel,
        anthropicKey,
        setAnthropicKey,
        anthropicModel,
        setAnthropicModel,
        localUrl,
        setLocalUrl,
        localModel,
        setLocalModel,
        localLoadingModels,
        setLocalLoadingModels,
        localAvailableModels,
        setLocalAvailableModels
      }
    ), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement(
      DataCollectionSection,
      {
        backendCollected,
        loading,
        data,
        config,
        handleRefresh,
        fetchConfig: fetchConfig2
      }
    ), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement(
      NotificationsSection,
      {
        automationConfig,
        saveAutomationConfig: saveAutomationConfig2
      }
    ), /* @__PURE__ */ React.createElement("hr", { className: "border-gray-300 dark:border-gray-600" }), /* @__PURE__ */ React.createElement("div", { className: "relative border-2 border-gray-300 dark:border-gray-600 rounded-lg p-6 bg-gray-50 dark:bg-gray-700/30 opacity-60 cursor-not-allowed" }, /* @__PURE__ */ React.createElement("div", { className: "absolute top-4 right-4" }, /* @__PURE__ */ React.createElement("span", { className: "px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full shadow" }, "COMING SOON")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-4" }, /* @__PURE__ */ React.createElement(Lock, { className: "text-gray-600 dark:text-gray-400", size: 24 }), /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-gray-600 dark:text-gray-400" }, "Authentication")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 mb-4" }, "Protect access to ProxBalance with user authentication. Configure login credentials, session management, and access control."), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 pointer-events-none" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Lock, { size: 20, className: "text-gray-400 dark:text-gray-500" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-600 dark:text-gray-400" }, "Dashboard Login"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500" }, "Username and password protection"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Lock, { size: 20, className: "text-gray-400 dark:text-gray-500" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-600 dark:text-gray-400" }, "API Token Authentication"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500" }, "Secure API access with bearer tokens"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center" }, /* @__PURE__ */ React.createElement(Lock, { size: 20, className: "text-gray-400 dark:text-gray-500" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-600 dark:text-gray-400" }, "Session Management"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500" }, "Configurable session timeout and security"))))), /* @__PURE__ */ React.createElement(
      AdvancedSystemSettings,
      {
        showAdvancedSettings,
        setShowAdvancedSettings,
        data,
        config,
        logLevel,
        setLogLevel,
        verboseLogging,
        setVerboseLogging,
        proxmoxTokenId,
        setProxmoxTokenId,
        proxmoxTokenSecret,
        setProxmoxTokenSecret,
        validatingToken,
        tokenValidationResult,
        confirmHostChange,
        setConfirmHostChange,
        validateToken: validateToken2,
        confirmAndChangeHost,
        error,
        setError
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "sticky bottom-0 mt-6 -mx-4 px-4 py-4 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 shadow-lg" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: saveSettings2,
        disabled: savingSettings,
        className: "w-full px-6 py-3 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-md"
      },
      /* @__PURE__ */ React.createElement(Save, { size: 18 }),
      savingSettings ? "Saving..." : "Save Settings"
    )))));
  }

  // src/components/Toggle.jsx
  function Toggle({ checked, onChange, color = "green" }) {
    return /* @__PURE__ */ React.createElement("label", { className: "relative inline-flex items-center cursor-pointer shrink-0 ml-4" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked,
        onChange,
        className: "sr-only peer"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: `w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 ${color === "yellow" ? "peer-checked:bg-yellow-600" : "peer-checked:bg-green-600"}` }));
  }
  function ToggleRow({ label, description, checked, onChange, color, children }) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-gray-900 dark:text-white" }, label), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400" }, description)), /* @__PURE__ */ React.createElement(Toggle, { checked, onChange, color })), children);
  }

  // src/components/automation/MainSettingsSection.jsx
  var { useState: useState4 } = React;
  function MainSettingsSection({ automationConfig, saveAutomationConfig: saveAutomationConfig2, collapsedSections, setCollapsedSections }) {
    let [confirmEnableAutomation, setConfirmEnableAutomation] = useState4(!1), [confirmDisableDryRun, setConfirmDisableDryRun] = useState4(!1);
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, mainSettings: !prev.mainSettings })),
        className: "w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      },
      /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white" }, "Core Settings"),
      /* @__PURE__ */ React.createElement(
        ChevronDown,
        {
          size: 24,
          className: `text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.mainSettings ? "-rotate-180" : ""}`
        }
      )
    ), !collapsedSections.mainSettings && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Enable Automated Migrations",
        description: "Turn automation on or off",
        checked: automationConfig.enabled || !1,
        onChange: (e) => {
          e.target.checked ? setConfirmEnableAutomation(!0) : saveAutomationConfig2({ enabled: !1 });
        }
      },
      confirmEnableAutomation && /* @__PURE__ */ React.createElement("div", { className: "px-4 pb-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 20, className: "text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-orange-900 dark:text-orange-200 mb-2" }, "Enable Automated Migrations?"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-orange-800 dark:text-orange-300 mb-3" }, "The system will automatically migrate VMs based on your configured rules."), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            saveAutomationConfig2({ enabled: !0 }), setConfirmEnableAutomation(!1);
          },
          className: "px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded text-sm font-medium flex items-center justify-center gap-1.5"
        },
        /* @__PURE__ */ React.createElement(Power, { size: 14 }),
        "Enable Automation"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setConfirmEnableAutomation(!1),
          className: "px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1.5"
        },
        /* @__PURE__ */ React.createElement(X, { size: 14 }),
        "Cancel"
      ))))))
    ), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Dry Run Mode",
        description: "Test without actual migrations (recommended)",
        checked: automationConfig.dry_run !== !1,
        onChange: (e) => {
          e.target.checked ? saveAutomationConfig2({ dry_run: !0 }) : setConfirmDisableDryRun(!0);
        },
        color: "yellow"
      },
      confirmDisableDryRun && /* @__PURE__ */ React.createElement("div", { className: "px-4 pb-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 dark:bg-red-900/20 border-2 border-red-500 dark:border-red-600 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 24, className: "text-red-600 dark:text-red-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-red-900 dark:text-red-200 mb-2 text-lg" }, "DISABLE DRY RUN MODE?"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-red-800 dark:text-red-300 space-y-2 mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "This will enable REAL automated migrations!"), /* @__PURE__ */ React.createElement("p", null, "VMs will actually be migrated automatically based on your configured rules."), /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "Are you absolutely sure?")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            saveAutomationConfig2({ dry_run: !1 }), setConfirmDisableDryRun(!1);
          },
          className: "px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-bold flex items-center justify-center gap-1.5"
        },
        /* @__PURE__ */ React.createElement(AlertTriangle, { size: 14 }),
        "Yes, Disable Dry Run"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setConfirmDisableDryRun(!1),
          className: "px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-sm hover:bg-gray-300 dark:hover:bg-gray-600 font-medium flex items-center justify-center gap-1.5"
        },
        /* @__PURE__ */ React.createElement(X, { size: 14 }),
        "Cancel (Keep Dry Run On)"
      ))))))
    ), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-gray-50 dark:bg-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("label", { className: "block font-semibold text-gray-900 dark:text-white mb-2" }, "Check Interval (minutes)"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "60",
        value: automationConfig.check_interval_minutes || 5,
        onCommit: (val) => saveAutomationConfig2({ check_interval_minutes: val }),
        className: "w-32 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1" }, "How often to check for migrations")), /* @__PURE__ */ React.createElement("div", { className: "pt-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-gray-900 dark:text-white mb-3" }, "Migration Rules"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Min Confidence Score"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        max: "100",
        value: automationConfig.rules?.min_confidence_score || 75,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, min_confidence_score: val } }),
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Max Migrations Per Run"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "20",
        value: automationConfig.rules?.max_migrations_per_run || 3,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, max_migrations_per_run: val } }),
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Cooldown Minutes"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        max: "1440",
        value: automationConfig.rules?.cooldown_minutes || 30,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, cooldown_minutes: val } }),
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Wait time between migrations of the same VM")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Max Concurrent Migrations"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "10",
        value: automationConfig.rules?.max_concurrent_migrations || 1,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, max_concurrent_migrations: val } }),
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Maximum simultaneous migrations")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Grace Period (seconds)"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        max: "300",
        value: automationConfig.rules?.grace_period_seconds !== void 0 ? automationConfig.rules.grace_period_seconds : 30,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, grace_period_seconds: val } }),
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Wait time between migrations for cluster to settle (0 = no wait)"))))));
  }

  // src/components/automation/DecisionTreeFlowchart.jsx
  function DecisionTreeFlowchart({
    collapsedSections,
    setCollapsedSections
  }) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg mb-6" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, decisionTree: !prev.decisionTree })),
        className: "w-full flex items-center justify-between p-5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors flex-wrap gap-y-3"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement(Info, { size: 24, className: "text-blue-600 dark:text-blue-400 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "font-bold text-blue-900 dark:text-blue-200 text-left" }, "Migration Decision Flowchart")),
      collapsedSections.decisionTree ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 20, className: "text-blue-600 dark:text-blue-400 shrink-0" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 20, className: "text-blue-600 dark:text-blue-400 shrink-0" })
    ), !collapsedSections.decisionTree && /* @__PURE__ */ React.createElement("div", { className: "px-5 pb-5" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-blue-800 dark:text-blue-300 space-y-4" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold text-blue-900 dark:text-blue-200" }, "This decision tree shows all possible paths through the automated migration process:"), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-750 rounded-lg p-6 border-2 border-blue-300 dark:border-blue-600 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow" }, "\u{1F680} Automation Run Triggered")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center" }, /* @__PURE__ */ React.createElement("div", { className: "w-0.5 h-6 bg-gradient-to-b from-blue-400 to-blue-500 dark:from-blue-500 dark:to-blue-600" }), /* @__PURE__ */ React.createElement("div", { className: "text-blue-500 dark:text-blue-400" }, "\u25BC")), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "1"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u2699\uFE0F"), " Is automation enabled?"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400 font-bold" }, "\u2717 NO"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "STOP")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "\u2713 YES"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "2"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u23F1\uFE0F"), " Is cooldown period elapsed?"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-orange-600 dark:text-orange-400 font-bold" }, "\u2717 NO"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "SKIP")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "\u2713 YES"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "3"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F550}"), " In allowed time window?"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400 font-bold" }, "\u2717 BLACKOUT"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "BLOCKED")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-orange-600 dark:text-orange-400 font-bold" }, "\u2717 OUTSIDE"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "SKIP")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "\u2713 YES"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "4"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F3E5}"), " Is cluster healthy? ", /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-gray-500 dark:text-gray-400" }, "(if enabled)")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400 font-bold" }, "\u2717 NO"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-red-500 dark:bg-red-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "ABORT")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "\u2713 YES"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border-2 border-indigo-300 dark:border-indigo-600 p-5 shadow-md" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-indigo-600 to-purple-600 dark:from-indigo-500 dark:to-purple-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "5"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F3AF}"), " Generate Recommendations"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 dark:text-indigo-400" }, "\u25B8"), " Calculate penalty scores for all nodes"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 dark:text-indigo-400" }, "\u25B8"), " Find VMs on high-penalty nodes"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 dark:text-indigo-400" }, "\u25B8"), " Match with low-penalty target nodes"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 dark:text-indigo-400" }, "\u25B8"), " Apply filters (tags, storage, compatibility)"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 dark:text-indigo-400" }, "\u25B8"), " Calculate confidence scores"))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "6"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F441}"), " Persistent recommendation?"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-cyan-50 dark:bg-cyan-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-cyan-600 dark:text-cyan-400 font-bold" }, "OBSERVING"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-cyan-500 dark:bg-cyan-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "DEFER"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-1" }, "Not enough consecutive observations")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "READY"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-1" }, "Met threshold, continue")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400 font-bold" }, "BYPASSED"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-1" }, "Feature disabled or maintenance evacuation")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "7"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F4CA}"), " Any recommendations above min confidence?"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-orange-600 dark:text-orange-400 font-bold" }, "\u2717 NO"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-orange-500 dark:bg-orange-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "SKIP")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "\u2713 YES"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-cyan-50 to-teal-50 dark:from-cyan-900/20 dark:to-teal-900/20 rounded-xl border-2 border-cyan-300 dark:border-cyan-600 p-5 shadow-md" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-cyan-600 to-teal-600 dark:from-cyan-500 dark:to-teal-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "8"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F9E0}"), " Intelligent Filters ", /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-gray-500 dark:text-gray-400" }, "(per recommendation, based on intelligence level)")), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-cyan-600 dark:text-cyan-400 font-bold" }, "Basic:"), " Cycle prevention, Conflict detection"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-cyan-600 dark:text-cyan-400 font-bold" }, "Standard:"), " + Cost-benefit analysis, Outcome learning, Guest tracking"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-cyan-600 dark:text-cyan-400 font-bold" }, "Full:"), " + Trend awareness, Pattern suppression, Risk gating")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-amber-600 dark:text-amber-400 font-bold" }, "FILTERED"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-amber-500 dark:bg-amber-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "SKIP"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-1" }, "Failed a filter check")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "\u2713 PASSED"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Continue \u2193")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-xl border-2 border-blue-200 dark:border-blue-700 p-5 shadow-md hover:shadow-lg transition-all hover:border-blue-400 dark:hover:border-blue-500" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-600 to-blue-700 dark:from-blue-500 dark:to-blue-600 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "9"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F9EA}"), " Is dry run mode enabled?"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-blue-600 dark:text-blue-400 font-bold" }, "\u2713 YES"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "bg-blue-500 dark:bg-blue-600 text-white px-3 py-1 rounded-md font-semibold shadow-sm" }, "LOG ONLY")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 p-2 bg-green-50 dark:bg-green-900/10 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-bold" }, "\u2717 NO"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300 font-medium" }, "Execute \u2193")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 rounded-xl border-2 border-emerald-300 dark:border-emerald-600 p-5 shadow-md" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-emerald-600 to-green-600 dark:from-emerald-500 dark:to-green-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm shrink-0 shadow-md" }, "10"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u26A1"), " Execute Migrations"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-700 dark:text-gray-300 space-y-1.5 bg-white/50 dark:bg-gray-800/50 p-3 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400" }, "\u25B8"), " Limit to max migrations per run (default: 3)"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400" }, "\u25B8"), " Execute migrations sequentially"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400" }, "\u25B8"), " If migration fails + abort_on_failure: STOP batch"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400" }, "\u25B8"), " If migration fails + pause_on_failure: DISABLE automation"), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-emerald-600 dark:text-emerald-400" }, "\u25B8"), " Track migration status and update history")))))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center" }, /* @__PURE__ */ React.createElement("div", { className: "w-0.5 h-6 bg-gradient-to-b from-emerald-400 to-green-500 dark:from-emerald-500 dark:to-green-600" }), /* @__PURE__ */ React.createElement("div", { className: "text-emerald-500 dark:text-emerald-400" }, "\u25BC")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-600 dark:from-emerald-500 dark:via-green-500 dark:to-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-shadow flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-2xl" }, "\u2713"), " ", /* @__PURE__ */ React.createElement("span", null, "Run Complete"))))))));
  }

  // src/components/automation/SmartMigrationsSection.jsx
  var { useState: useState5 } = React, INTELLIGENCE_LEVELS = [
    {
      key: "basic",
      label: "Basic",
      description: "Observation tracking + Cycle detection",
      detail: "Prevents acting on transient spikes and migration ping-pong"
    },
    {
      key: "standard",
      label: "Standard",
      description: "Basic + Cost-benefit + Outcome learning + Guest tracking",
      detail: "Learns from past migrations and avoids low-value moves",
      recommended: !0
    },
    {
      key: "full",
      label: "Full",
      description: "Standard + Trend analysis + Pattern recognition + Risk gating",
      detail: "Maximum intelligence with workload pattern recognition"
    }
  ];
  function inferIntelligenceLevel(imConfig) {
    if (imConfig?.intelligence_level) return imConfig.intelligence_level;
    let hasFull = imConfig?.trend_awareness_enabled || imConfig?.pattern_suppression_enabled || imConfig?.risk_gating_enabled, hasStandard = imConfig?.cost_benefit_enabled || imConfig?.outcome_learning_enabled || imConfig?.guest_success_tracking_enabled;
    return hasFull ? "full" : hasStandard ? "standard" : "basic";
  }
  function SmartMigrationsSection({ automationConfig, saveAutomationConfig: saveAutomationConfig2, automationStatus, collapsedSections, setCollapsedSections }) {
    let [showAdvanced, setShowAdvanced] = useState5(!1), [dismissedSuggestion, setDismissedSuggestion] = useState5(!1), imConfig = automationConfig.rules?.intelligent_migrations, currentLevel = inferIntelligenceLevel(imConfig), suggestedLevel = automationStatus?.intelligent_tracking?.suggested_level, minDataHours = imConfig?.minimum_data_collection_hours !== void 0 ? imConfig.minimum_data_collection_hours : 24, obsPeriods = imConfig?.observation_periods || 3;
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, smartMigrations: !prev.smartMigrations })),
        className: "w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      },
      /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white" }, "Smart Migrations"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1" }, "Track recommendations over time and only act on persistent imbalances")),
      /* @__PURE__ */ React.createElement(
        ChevronDown,
        {
          size: 24,
          className: `text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.smartMigrations ? "-rotate-180" : ""}`
        }
      )
    ), !collapsedSections.smartMigrations && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Enable Smart Migrations",
        description: "Prevents acting on transient load spikes",
        checked: imConfig?.enabled !== !1,
        onChange: (e) => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, enabled: e.target.checked } } })
      }
    ), imConfig?.enabled !== !1 && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, suggestedLevel && suggestedLevel !== currentLevel && !dismissedSuggestion && /* @__PURE__ */ React.createElement("div", { className: "bg-blue-100 dark:bg-blue-900/30 border border-blue-300 dark:border-blue-600 rounded-lg p-3 flex items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2 flex-1" }, /* @__PURE__ */ React.createElement(Info, { size: 16, className: "text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-blue-800 dark:text-blue-200" }, "You've collected enough data to enable ", /* @__PURE__ */ React.createElement("strong", null, suggestedLevel.charAt(0).toUpperCase() + suggestedLevel.slice(1)), " intelligence.", suggestedLevel === "standard" && " This adds cost-benefit analysis and outcome learning.", suggestedLevel === "full" && " This adds trend analysis, pattern recognition, and risk gating.", /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, intelligence_level: suggestedLevel } } }),
        className: "ml-2 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded font-semibold"
      },
      "Upgrade"
    ))), /* @__PURE__ */ React.createElement("button", { onClick: () => setDismissedSuggestion(!0), className: "text-blue-400 hover:text-blue-600 shrink-0" }, /* @__PURE__ */ React.createElement(X, { size: 14 }))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Intelligence Level"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, INTELLIGENCE_LEVELS.map((level) => {
      let isSelected = currentLevel === level.key;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: level.key,
          onClick: () => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, intelligence_level: level.key } } }),
          className: `relative text-left p-3 rounded-lg border-2 transition-all ${isSelected ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md" : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 bg-white dark:bg-gray-700"}`
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-gray-900 dark:text-white text-sm" }, level.label), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, level.recommended && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-[10px] font-semibold rounded" }, "RECOMMENDED"), isSelected && /* @__PURE__ */ React.createElement(CheckCircle, { size: 16, className: "text-blue-500 dark:text-blue-400" }))),
        /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-300" }, level.description),
        /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-500 dark:text-gray-400 mt-1" }, level.detail)
      );
    }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" }, "Required Observation Periods"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "2",
        max: "10",
        value: obsPeriods,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, observation_periods: val } } }),
        className: "w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-500 dark:text-gray-400 mt-1" }, "Consecutive times a recommendation must appear before acting")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" }, "Minimum Data Collection (hours)"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        max: "72",
        value: minDataHours,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, minimum_data_collection_hours: val } } }),
        className: "w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-500 dark:text-gray-400 mt-1" }, "How long the system must observe before first migration (0 = no minimum)"))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400" }, "The system will collect data for at least ", minDataHours, " hour", minDataHours !== 1 ? "s" : "", " and require ", obsPeriods, " consistent recommendation", obsPeriods !== 1 ? "s" : "", " before migrating."), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-200 dark:border-gray-600 pt-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowAdvanced(!showAdvanced),
        className: "flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
      },
      showAdvanced ? /* @__PURE__ */ React.createElement(ChevronUp, { size: 14 }) : /* @__PURE__ */ React.createElement(ChevronDown, { size: 14 }),
      "Advanced Tuning"
    ), showAdvanced && /* @__PURE__ */ React.createElement("div", { className: "mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" }, "Observation Window (hours)"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "72",
        value: imConfig?.observation_window_hours || 24,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, observation_window_hours: val } } }),
        className: "w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-500 dark:text-gray-400 mt-1" }, "Max age for observation tracking")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" }, "Cycle Detection Window (hours)"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "168",
        value: imConfig?.cycle_window_hours || 48,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, cycle_window_hours: val } } }),
        className: "w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-500 dark:text-gray-400 mt-1" }, "How far back to check for migration cycles")), (currentLevel === "standard" || currentLevel === "full") && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" }, "Min Cost-Benefit Ratio"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0.1",
        max: "10.0",
        step: "0.1",
        isFloat: !0,
        value: imConfig?.min_cost_benefit_ratio !== void 0 ? imConfig.min_cost_benefit_ratio : 1,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, min_cost_benefit_ratio: val } } }),
        className: "w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-500 dark:text-gray-400 mt-1" }, "Minimum improvement-to-cost ratio required")), currentLevel === "full" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1" }, "Risk Confidence Multiplier"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0.1",
        max: "5.0",
        step: "0.1",
        isFloat: !0,
        value: imConfig?.risk_confidence_multiplier !== void 0 ? imConfig.risk_confidence_multiplier : 1.2,
        onCommit: (val) => saveAutomationConfig2({ rules: { ...automationConfig.rules, intelligent_migrations: { ...imConfig, risk_confidence_multiplier: val } } }),
        className: "w-full px-2 py-2 text-base sm:text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-[10px] text-gray-500 dark:text-gray-400 mt-1" }, "Higher values require more confidence for risky moves")))))));
  }

  // src/components/automation/SafetyRulesSection.jsx
  var { useState: useState6 } = React;
  function SafetyRulesSection({ automationConfig, saveAutomationConfig: saveAutomationConfig2, collapsedSections, setCollapsedSections }) {
    let [confirmAllowContainerRestarts, setConfirmAllowContainerRestarts] = useState6(!1);
    return /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, safetyRules: !prev.safetyRules })),
        className: "w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      },
      /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white" }, "Safety & Guardrails"),
      /* @__PURE__ */ React.createElement(
        ChevronDown,
        {
          size: 24,
          className: `text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.safetyRules ? "-rotate-180" : ""}`
        }
      )
    ), !collapsedSections.safetyRules && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-gray-900 dark:text-white mb-3" }, "Tag & Affinity Rules"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Respect 'ignore' Tags",
        description: "Skip VMs tagged with 'pb-ignore' or 'ignore' during automated migrations.",
        checked: automationConfig.rules?.respect_ignore_tags !== !1,
        onChange: (e) => saveAutomationConfig2({ rules: { ...automationConfig.rules, respect_ignore_tags: e.target.checked } })
      }
    ), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Require 'auto_migrate_ok' Tag",
        description: "Only migrate VMs with 'auto-migrate-ok' or 'auto_migrate_ok' tag (opt-in mode).",
        checked: automationConfig.rules?.require_auto_migrate_ok_tag || !1,
        onChange: (e) => saveAutomationConfig2({ rules: { ...automationConfig.rules, require_auto_migrate_ok_tag: e.target.checked } })
      }
    ), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Respect Affinity (affinity_* tags)",
        description: "Keeps VMs with the same affinity tag together on the same node. Companion VMs follow when one is migrated.",
        checked: automationConfig.rules?.respect_affinity_rules !== !1,
        onChange: (e) => saveAutomationConfig2({ rules: { ...automationConfig.rules, respect_affinity_rules: e.target.checked } })
      }
    ), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Respect Anti-Affinity (exclude_* tags)",
        description: "Prevents VMs with the same exclude tag from clustering on one node.",
        checked: automationConfig.rules?.respect_exclude_affinity !== !1,
        onChange: (e) => saveAutomationConfig2({ rules: { ...automationConfig.rules, respect_exclude_affinity: e.target.checked } })
      }
    ), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Allow Container Restarts for Migration",
        description: "Enables automated migrations to restart containers that cannot be live-migrated. Containers will experience brief downtime.",
        checked: automationConfig.rules?.allow_container_restarts === !0,
        onChange: (e) => {
          e.target.checked ? setConfirmAllowContainerRestarts(!0) : saveAutomationConfig2({ rules: { ...automationConfig.rules, allow_container_restarts: !1 } });
        }
      },
      confirmAllowContainerRestarts && /* @__PURE__ */ React.createElement("div", { className: "px-4 pb-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 18, className: "text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-orange-900 dark:text-orange-200 text-sm mb-1" }, "ALLOW CONTAINER RESTARTS?"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-orange-800 dark:text-orange-300 space-y-1 mb-2" }, /* @__PURE__ */ React.createElement("p", null, "This will allow automated migrations to restart containers that cannot be live-migrated."), /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "Containers will experience brief downtime during migration.")), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            saveAutomationConfig2({ rules: { ...automationConfig.rules, allow_container_restarts: !0 } }), setConfirmAllowContainerRestarts(!1);
          },
          className: "px-2 py-1 bg-orange-600 hover:bg-orange-700 text-white rounded text-xs font-medium flex items-center justify-center gap-1"
        },
        /* @__PURE__ */ React.createElement(AlertTriangle, { size: 14 }),
        "Yes, Allow Restarts"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setConfirmAllowContainerRestarts(!1),
          className: "px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center gap-1"
        },
        /* @__PURE__ */ React.createElement(X, { size: 14 }),
        "Cancel"
      ))))))
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-gray-900 dark:text-white mb-3" }, "Safety Checks"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Check Cluster Health Before Migrating",
        description: "Verifies cluster has quorum and node resources are within limits before migrating.",
        checked: automationConfig.safety_checks?.check_cluster_health !== !1,
        onChange: (e) => saveAutomationConfig2({ safety_checks: { ...automationConfig.safety_checks, check_cluster_health: e.target.checked } })
      }
    ), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Max Node CPU %"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "50",
        max: "100",
        value: automationConfig.safety_checks?.max_node_cpu_percent || 85,
        onCommit: (val) => saveAutomationConfig2({ safety_checks: { ...automationConfig.safety_checks, max_node_cpu_percent: val } }),
        className: "w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Max Node Memory %"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "50",
        max: "100",
        value: automationConfig.safety_checks?.max_node_memory_percent || 90,
        onCommit: (val) => saveAutomationConfig2({ safety_checks: { ...automationConfig.safety_checks, max_node_memory_percent: val } }),
        className: "w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
      }
    ))), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Abort Batch if a Migration Fails",
        description: "Stops remaining migrations in the batch if any single migration fails.",
        checked: automationConfig.safety_checks?.abort_on_failure !== !1,
        onChange: (e) => saveAutomationConfig2({ safety_checks: { ...automationConfig.safety_checks, abort_on_failure: e.target.checked } })
      }
    ), /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Pause Automation After Migration Failure",
        description: "Automatically disables automated migrations if any migration fails. Requires manual review before resuming.",
        checked: automationConfig.safety_checks?.pause_on_failure === !0,
        onChange: (e) => saveAutomationConfig2({ safety_checks: { ...automationConfig.safety_checks, pause_on_failure: e.target.checked } })
      }
    )))));
  }

  // src/components/automation/DistributionBalancingSection.jsx
  function DistributionBalancingSection({
    config,
    automationConfig,
    collapsedSections,
    setCollapsedSections,
    setConfig,
    saveAutomationConfig: saveAutomationConfig2
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, distributionBalancing: !prev.distributionBalancing })),
        className: "w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      },
      /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white" }, "Distribution Balancing"),
      /* @__PURE__ */ React.createElement(
        ChevronDown,
        {
          size: 24,
          className: `text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.distributionBalancing ? "-rotate-180" : ""}`
        }
      )
    ), !collapsedSections.distributionBalancing && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, distributionBalancingHelp: !prev.distributionBalancingHelp })),
        className: "flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium"
      },
      collapsedSections.distributionBalancingHelp ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: "-rotate-90" }), "Show detailed explanation") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(ChevronDown, { size: 16 }), "Hide detailed explanation")
    ), !collapsedSections.distributionBalancingHelp && /* @__PURE__ */ React.createElement("div", { className: "mt-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-blue-900 dark:text-blue-100 mb-2" }, "What is Distribution Balancing?"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-800 dark:text-blue-200" }, "Complements performance-based recommendations by focusing on ", /* @__PURE__ */ React.createElement("strong", null, "evening out the number of VMs/CTs across nodes"), ", rather than just CPU, memory, or I/O metrics.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-blue-900 dark:text-blue-100 mb-2" }, "The Problem It Solves"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-800 dark:text-blue-200" }, "A node with 19 small VMs (DNS, monitoring, utilities) may show low resource usage but still suffers from management overhead, slower operations (start/stop/backup), and uneven workload distribution. Distribution balancing addresses this by moving small guests to less populated nodes.")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-blue-900 dark:text-blue-100 mb-2" }, "How It Works"), /* @__PURE__ */ React.createElement("ol", { className: "text-sm text-blue-800 dark:text-blue-200 list-decimal list-inside space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Counts running guests on each node (e.g., pve4: 19, pve6: 4)"), /* @__PURE__ */ React.createElement("li", null, "If difference \u2265 threshold (default: 2), finds small guests on overloaded node"), /* @__PURE__ */ React.createElement("li", null, "Only considers guests \u2264 max CPU cores (default: 2) and \u2264 max memory (default: 4 GB)"), /* @__PURE__ */ React.createElement("li", null, "Recommends migrating eligible small guests to underloaded nodes"), /* @__PURE__ */ React.createElement("li", null, "Works alongside performance-based recommendations, respects tags and storage compatibility"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-blue-900 dark:text-blue-100 mb-2" }, "When to Enable"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-800 dark:text-blue-200" }, "\u2713 Many small utility VMs (DNS, monitoring, etc.)", /* @__PURE__ */ React.createElement("br", null), "\u2713 Nodes with very different guest counts (e.g., 19 vs 4)", /* @__PURE__ */ React.createElement("br", null), "\u2713 Performance metrics don't show the imbalance", /* @__PURE__ */ React.createElement("br", null), "\u2713 Want more even workload distribution for management simplicity")))), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement(
      ToggleRow,
      {
        label: "Enable Distribution Balancing",
        description: "Automatically balance small workloads across nodes to prevent guest count imbalance",
        checked: config.distribution_balancing?.enabled || !1,
        onChange: (e) => {
          let enabled = e.target.checked, newConfig = { ...config };
          newConfig.distribution_balancing || (newConfig.distribution_balancing = {}), newConfig.distribution_balancing.enabled = enabled, setConfig(newConfig), saveAutomationConfig2({ distribution_balancing: { ...newConfig.distribution_balancing } });
        }
      }
    ), config.distribution_balancing?.enabled && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Guest Count Threshold"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "10",
        value: config.distribution_balancing?.guest_count_threshold ?? 2,
        onCommit: (val) => {
          let newConfig = { ...config };
          newConfig.distribution_balancing || (newConfig.distribution_balancing = {}), newConfig.distribution_balancing.guest_count_threshold = val, setConfig(newConfig), saveAutomationConfig2({ distribution_balancing: { ...newConfig.distribution_balancing } });
        },
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Minimum difference in guest counts to trigger balancing")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Max CPU Cores"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        max: "32",
        value: config.distribution_balancing?.max_cpu_cores ?? 2,
        onCommit: (val) => {
          let newConfig = { ...config };
          newConfig.distribution_balancing || (newConfig.distribution_balancing = {}), newConfig.distribution_balancing.max_cpu_cores = val, setConfig(newConfig), saveAutomationConfig2({ distribution_balancing: { ...newConfig.distribution_balancing } });
        },
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Only migrate guests with \u2264 this many CPU cores (0 = no limit)")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Max Memory (GB)"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        max: "256",
        value: config.distribution_balancing?.max_memory_gb ?? 4,
        onCommit: (val) => {
          let newConfig = { ...config };
          newConfig.distribution_balancing || (newConfig.distribution_balancing = {}), newConfig.distribution_balancing.max_memory_gb = val, setConfig(newConfig), saveAutomationConfig2({ distribution_balancing: { ...newConfig.distribution_balancing } });
        },
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Only migrate guests with \u2264 this much memory (0 = no limit)")))))));
  }

  // src/components/automation/TimeWindowsSection.jsx
  var { useState: useState7 } = React;
  function WindowTypeButtons({ currentType, onSelect }) {
    return /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onSelect("migration"),
        className: `px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 ${currentType === "migration" ? "bg-green-600 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`
      },
      /* @__PURE__ */ React.createElement(Calendar, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Migration"),
      " Window"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => onSelect("blackout"),
        className: `px-3 py-2 rounded text-sm font-semibold flex items-center gap-1 ${currentType === "blackout" ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}`
      },
      /* @__PURE__ */ React.createElement(Moon, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Blackout"),
      " Window"
    ));
  }
  function TimeWindowsSection({ automationConfig, saveAutomationConfig: saveAutomationConfig2, collapsedSections, setCollapsedSections, setError }) {
    let [editingWindowIndex, setEditingWindowIndex] = useState7(null), [showTimeWindowForm, setShowTimeWindowForm] = useState7(!1), [newWindowData, setNewWindowData] = useState7({ name: "", type: "migration", days: [], start_time: "00:00", end_time: "00:00" }), [confirmRemoveWindow, setConfirmRemoveWindow] = useState7(null);
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white mb-4" }, "Time Windows"), /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(Info, { size: 20, className: "text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" }, "Timezone for Time Windows"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: automationConfig.schedule?.timezone || "UTC",
        onChange: (e) => saveAutomationConfig2({
          schedule: {
            ...automationConfig.schedule,
            timezone: e.target.value
          }
        }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      },
      /* @__PURE__ */ React.createElement("option", { value: "UTC" }, "UTC (Server Time)"),
      /* @__PURE__ */ React.createElement("option", { value: "America/New_York" }, "Eastern Time (ET)"),
      /* @__PURE__ */ React.createElement("option", { value: "America/Chicago" }, "Central Time (CT)"),
      /* @__PURE__ */ React.createElement("option", { value: "America/Denver" }, "Mountain Time (MT)"),
      /* @__PURE__ */ React.createElement("option", { value: "America/Los_Angeles" }, "Pacific Time (PT)"),
      /* @__PURE__ */ React.createElement("option", { value: "America/Anchorage" }, "Alaska Time (AK)"),
      /* @__PURE__ */ React.createElement("option", { value: "Pacific/Honolulu" }, "Hawaii Time (HT)"),
      /* @__PURE__ */ React.createElement("option", { value: "Europe/London" }, "London (GMT/BST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Europe/Paris" }, "Paris (CET/CEST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Europe/Berlin" }, "Berlin (CET/CEST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Europe/Moscow" }, "Moscow (MSK)"),
      /* @__PURE__ */ React.createElement("option", { value: "Asia/Dubai" }, "Dubai (GST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Asia/Kolkata" }, "India (IST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Asia/Shanghai" }, "China (CST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Asia/Tokyo" }, "Tokyo (JST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Asia/Singapore" }, "Singapore (SGT)"),
      /* @__PURE__ */ React.createElement("option", { value: "Australia/Sydney" }, "Sydney (AEDT/AEST)"),
      /* @__PURE__ */ React.createElement("option", { value: "Pacific/Auckland" }, "Auckland (NZDT/NZST)")
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400 mt-2" }, "All time windows below use this timezone. Current server time (UTC): ", (/* @__PURE__ */ new Date()).toUTCString())))), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-4" }, "Configure when migrations are allowed (Migration Windows) or blocked (Blackout Windows). If no windows are configured, migrations are allowed at any time."), (() => {
      let migrationWindows = automationConfig.schedule?.migration_windows || [], blackoutWindows = automationConfig.schedule?.blackout_windows || [];
      if (!(migrationWindows.length > 0 || blackoutWindows.length > 0)) return null;
      let daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"], today = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][(/* @__PURE__ */ new Date()).getDay()];
      return /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3" }, "Weekly Schedule Overview"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 mt-4" }, daysOfWeek.map((day) => {
        let dayMigrations = migrationWindows.filter((w) => w.days?.includes(day)), dayBlackouts = blackoutWindows.filter((w) => w.days?.includes(day)), isToday = day === today;
        return /* @__PURE__ */ React.createElement("div", { key: day, className: "flex gap-2" }, /* @__PURE__ */ React.createElement("div", { className: `w-20 flex-shrink-0 text-xs font-medium flex items-center ${isToday ? "text-blue-600 dark:text-blue-400 font-bold" : "text-gray-600 dark:text-gray-400"}` }, day.slice(0, 3), isToday && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-blue-600 dark:text-blue-400" }, "\u25CF")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 relative h-6 bg-gray-200 dark:bg-gray-600 rounded overflow-visible" }, Array.from({ length: 25 }, (_, hour) => {
          let isMajorTick = hour % 6 === 0, isMinorTick = hour % 3 === 0 && !isMajorTick;
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: `tick-${hour}`,
              className: `absolute bottom-0 z-0 ${isMajorTick ? "h-full border-l-2 border-gray-400 dark:border-gray-500" : isMinorTick ? "h-2/3 border-l border-gray-350 dark:border-gray-500" : "h-1/3 border-l border-gray-300 dark:border-gray-550"}`,
              style: { left: `${hour / 24 * 100}%` }
            },
            isMajorTick && hour < 24 && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-3 -translate-x-1/2 text-[10px] font-medium text-gray-500 dark:text-gray-400" }, hour.toString().padStart(2, "0"))
          );
        }), dayBlackouts.map((window2, idx) => {
          let [startHour, startMin] = window2.start_time.split(":").map(Number), [endHour, endMin] = window2.end_time.split(":").map(Number), startPercent = (startHour * 60 + startMin) / 1440 * 100, width = (endHour * 60 + endMin) / 1440 * 100 - startPercent, blackoutIndex = blackoutWindows.findIndex(
            (w) => w.name === window2.name && w.start_time === window2.start_time && w.end_time === window2.end_time
          ), globalIndex = migrationWindows.length + blackoutIndex;
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: `blackout-${idx}`,
              className: "absolute top-0 bottom-0 bg-red-500 dark:bg-red-600 hover:bg-red-600 dark:hover:bg-red-700 transition-colors z-10 cursor-pointer",
              style: { left: `${startPercent}%`, width: `${width}%` },
              title: `${window2.name}: ${window2.start_time}-${window2.end_time} (BLOCKED) - Click to edit`,
              onClick: () => {
                setEditingWindowIndex(globalIndex), setTimeout(() => {
                  let element = document.querySelector(`[data-window-index="${globalIndex}"]`);
                  element && element.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
              }
            }
          );
        }), dayMigrations.map((window2, idx) => {
          let [startHour, startMin] = window2.start_time.split(":").map(Number), [endHour, endMin] = window2.end_time.split(":").map(Number), startPercent = (startHour * 60 + startMin) / 1440 * 100, width = (endHour * 60 + endMin) / 1440 * 100 - startPercent, migrationIndex = migrationWindows.findIndex(
            (w) => w.name === window2.name && w.start_time === window2.start_time && w.end_time === window2.end_time
          );
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: `migration-${idx}`,
              className: "absolute top-0 bottom-0 bg-green-500 dark:bg-green-600 hover:bg-green-600 dark:hover:bg-green-700 transition-colors z-10 cursor-pointer",
              style: { left: `${startPercent}%`, width: `${width}%` },
              title: `${window2.name}: ${window2.start_time}-${window2.end_time} (ALLOWED) - Click to edit`,
              onClick: () => {
                setEditingWindowIndex(migrationIndex), setTimeout(() => {
                  let element = document.querySelector(`[data-window-index="${migrationIndex}"]`);
                  element && element.scrollIntoView({ behavior: "smooth", block: "center" });
                }, 100);
              }
            }
          );
        })));
      })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 mt-6 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-4 h-4 bg-green-500 dark:bg-green-600 rounded" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Migrations Allowed")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-4 h-4 bg-red-500 dark:bg-red-600 rounded" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Migrations Blocked")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-4 h-4 bg-gray-200 dark:bg-gray-600 rounded border border-gray-300 dark:border-gray-500" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "No Restriction"))));
    })(), (() => {
      let migrationWindows = automationConfig.schedule?.migration_windows || [], blackoutWindows = automationConfig.schedule?.blackout_windows || [], allWindows = [
        ...migrationWindows.map((w, idx) => ({ ...w, type: "migration", originalIndex: idx })),
        ...blackoutWindows.map((w, idx) => ({ ...w, type: "blackout", originalIndex: idx }))
      ];
      return allWindows.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-sm text-gray-600 dark:text-gray-400 mb-3" }, "No time windows configured - migrations allowed at any time") : /* @__PURE__ */ React.createElement("div", { className: "space-y-2 mb-3" }, allWindows.map((window2, idx) => {
        let isMigration = window2.type === "migration", isEditing = editingWindowIndex === idx;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: `${window2.type}-${window2.originalIndex}`,
            "data-window-index": idx,
            className: `p-3 rounded-lg border ${isMigration ? "bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-700" : "bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-700"}`
          },
          isEditing ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Window Type"), /* @__PURE__ */ React.createElement(
            WindowTypeButtons,
            {
              currentType: isMigration ? "migration" : "blackout",
              onSelect: (type) => {
                if (type === "migration" === isMigration) return;
                let newMigrationWindows = [...migrationWindows], newBlackoutWindows = [...blackoutWindows];
                if (isMigration) {
                  let [removed] = newMigrationWindows.splice(window2.originalIndex, 1);
                  newBlackoutWindows.push(removed);
                } else {
                  let [removed] = newBlackoutWindows.splice(window2.originalIndex, 1);
                  newMigrationWindows.push(removed);
                }
                saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    migration_windows: newMigrationWindows,
                    blackout_windows: newBlackoutWindows
                  }
                }), setEditingWindowIndex(null);
              }
            }
          )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Window Name"), /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "text",
              value: window2.name,
              onChange: (e) => {
                let newWindows = [...isMigration ? migrationWindows : blackoutWindows];
                newWindows[window2.originalIndex] = { ...window2, name: e.target.value }, saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                  }
                });
              },
              className: "w-full px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
            }
          )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300" }, "Days of Week"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center cursor-pointer" }, /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "checkbox",
              checked: window2.days?.length === 7,
              onChange: (e) => {
                let newWindows = [...isMigration ? migrationWindows : blackoutWindows];
                newWindows[window2.originalIndex] = {
                  ...window2,
                  days: e.target.checked ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] : []
                }, saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                  }
                });
              },
              className: `w-4 h-4 border-gray-300 rounded ${isMigration ? "text-green-600 focus:ring-green-500" : "text-red-600 focus:ring-red-500"}`
            }
          ), /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400" }, "All Days"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" }, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => /* @__PURE__ */ React.createElement("label", { key: day, className: "flex items-center" }, /* @__PURE__ */ React.createElement(
            "input",
            {
              type: "checkbox",
              checked: window2.days?.includes(day),
              onChange: (e) => {
                let newWindows = [...isMigration ? migrationWindows : blackoutWindows], currentDays = window2.days || [];
                newWindows[window2.originalIndex] = {
                  ...window2,
                  days: e.target.checked ? [...currentDays, day] : currentDays.filter((d) => d !== day)
                }, saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                  }
                });
              },
              className: `w-4 h-4 border-gray-300 rounded ${isMigration ? "text-green-600 focus:ring-green-500" : "text-red-600 focus:ring-red-500"}`
            }
          ), /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-sm text-gray-700 dark:text-gray-300" }, day.slice(0, 3)))))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Start Time"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
            "select",
            {
              value: window2.start_time?.split(":")[0] || "00",
              onChange: (e) => {
                let newWindows = [...isMigration ? migrationWindows : blackoutWindows], currentMinute = window2.start_time?.split(":")[1] || "00";
                newWindows[window2.originalIndex] = { ...window2, start_time: `${e.target.value}:${currentMinute}` }, saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                  }
                });
              },
              className: "flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
            },
            Array.from({ length: 24 }, (_, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i.toString().padStart(2, "0") }, i.toString().padStart(2, "0")))
          ), /* @__PURE__ */ React.createElement("span", { className: "flex items-center text-gray-500 dark:text-gray-400" }, ":"), /* @__PURE__ */ React.createElement(
            "select",
            {
              value: window2.start_time?.split(":")[1] || "00",
              onChange: (e) => {
                let newWindows = [...isMigration ? migrationWindows : blackoutWindows], currentHour = window2.start_time?.split(":")[0] || "00";
                newWindows[window2.originalIndex] = { ...window2, start_time: `${currentHour}:${e.target.value}` }, saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                  }
                });
              },
              className: "flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
            },
            Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => /* @__PURE__ */ React.createElement("option", { key: minute, value: minute.toString().padStart(2, "0") }, minute.toString().padStart(2, "0"))),
            /* @__PURE__ */ React.createElement("option", { value: "59" }, "59 (End of Hour)")
          ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "End Time"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
            "select",
            {
              value: window2.end_time?.split(":")[0] || "00",
              onChange: (e) => {
                let newWindows = [...isMigration ? migrationWindows : blackoutWindows], currentMinute = window2.end_time?.split(":")[1] || "00";
                newWindows[window2.originalIndex] = { ...window2, end_time: `${e.target.value}:${currentMinute}` }, saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                  }
                });
              },
              className: "flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
            },
            Array.from({ length: 24 }, (_, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i.toString().padStart(2, "0") }, i.toString().padStart(2, "0")))
          ), /* @__PURE__ */ React.createElement("span", { className: "flex items-center text-gray-500 dark:text-gray-400" }, ":"), /* @__PURE__ */ React.createElement(
            "select",
            {
              value: window2.end_time?.split(":")[1] || "00",
              onChange: (e) => {
                let newWindows = [...isMigration ? migrationWindows : blackoutWindows], currentHour = window2.end_time?.split(":")[0] || "00";
                newWindows[window2.originalIndex] = { ...window2, end_time: `${currentHour}:${e.target.value}` }, saveAutomationConfig2({
                  schedule: {
                    ...automationConfig.schedule,
                    [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                  }
                });
              },
              className: "flex-1 px-3 py-2 bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-lg text-gray-900 dark:text-white"
            },
            Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => /* @__PURE__ */ React.createElement("option", { key: minute, value: minute.toString().padStart(2, "0") }, minute.toString().padStart(2, "0"))),
            /* @__PURE__ */ React.createElement("option", { value: "59" }, "59 (End of Hour)")
          )))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setEditingWindowIndex(null),
              className: "px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold flex items-center justify-center gap-1.5",
              title: "Done"
            },
            /* @__PURE__ */ React.createElement(Check, { size: 14 }),
            /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Done")
          ))) : /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 rounded text-xs font-semibold ${isMigration ? "bg-green-600 text-white" : "bg-red-600 text-white"}` }, isMigration ? "MIGRATION" : "BLACKOUT"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-900 dark:text-white" }, window2.name || `${isMigration ? "Migration" : "Blackout"} ${window2.originalIndex + 1}`), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-600 dark:text-gray-400 ml-2" }, window2.days?.join(", "), " ", window2.start_time, "-", window2.end_time)), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => setEditingWindowIndex(idx),
              className: "px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center justify-center gap-1",
              title: "Edit"
            },
            /* @__PURE__ */ React.createElement(Edit, { size: 14 }),
            /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Edit")
          ), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => {
                let windowId = `${isMigration ? "migration" : "blackout"}-${window2.originalIndex}`;
                if (confirmRemoveWindow?.id === windowId) {
                  let newWindows = [...isMigration ? migrationWindows : blackoutWindows];
                  newWindows.splice(window2.originalIndex, 1), saveAutomationConfig2({
                    schedule: {
                      ...automationConfig.schedule,
                      [isMigration ? "migration_windows" : "blackout_windows"]: newWindows
                    }
                  }), setConfirmRemoveWindow(null);
                } else
                  setConfirmRemoveWindow({ id: windowId, type: isMigration ? "migration" : "blackout" });
              },
              className: `px-2 py-1 text-white rounded text-sm flex items-center justify-center gap-1 ${confirmRemoveWindow?.id === `${isMigration ? "migration" : "blackout"}-${window2.originalIndex}` ? "bg-orange-600 hover:bg-orange-700" : "bg-red-600 hover:bg-red-700"}`,
              title: "Remove"
            },
            /* @__PURE__ */ React.createElement(Trash, { size: 14 }),
            confirmRemoveWindow?.id === `${isMigration ? "migration" : "blackout"}-${window2.originalIndex}` ? "Confirm?" : /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Remove")
          ))
        );
      }));
    })(), showTimeWindowForm ? /* @__PURE__ */ React.createElement("div", { className: `rounded-lg p-4 mb-3 border ${newWindowData.type === "migration" ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700"}` }, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-gray-900 dark:text-white mb-3" }, "Add Time Window"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Window Type"), /* @__PURE__ */ React.createElement(
      WindowTypeButtons,
      {
        currentType: newWindowData.type,
        onSelect: (type) => setNewWindowData({ ...newWindowData, type })
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Window Name"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newWindowData.name,
        onChange: (e) => setNewWindowData({ ...newWindowData, name: e.target.value }),
        placeholder: newWindowData.type === "migration" ? "e.g., Weekend Maintenance" : "e.g., Business Hours",
        className: "w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300" }, "Days of Week"), /* @__PURE__ */ React.createElement("label", { className: "flex items-center cursor-pointer" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: newWindowData.days.length === 7,
        onChange: (e) => {
          setNewWindowData({
            ...newWindowData,
            days: e.target.checked ? ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] : []
          });
        },
        className: `w-4 h-4 border-gray-300 rounded ${newWindowData.type === "migration" ? "text-green-600 focus:ring-green-500" : "text-red-600 focus:ring-red-500"}`
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400" }, "All Days"))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2" }, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => /* @__PURE__ */ React.createElement("label", { key: day, className: "flex items-center" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: newWindowData.days.includes(day),
        onChange: (e) => {
          e.target.checked ? setNewWindowData({ ...newWindowData, days: [...newWindowData.days, day] }) : setNewWindowData({ ...newWindowData, days: newWindowData.days.filter((d) => d !== day) });
        },
        className: `w-4 h-4 border-gray-300 rounded ${newWindowData.type === "migration" ? "text-green-600 focus:ring-green-500" : "text-red-600 focus:ring-red-500"}`
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-sm text-gray-700 dark:text-gray-300" }, day.slice(0, 3)))))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300" }, "Time Range"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setNewWindowData({ ...newWindowData, start_time: "00:00", end_time: "23:59" }),
        className: "px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
      },
      "All Day"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setNewWindowData({ ...newWindowData, start_time: "09:00", end_time: "17:00" }),
        className: "px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
      },
      "Business Hours"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setNewWindowData({ ...newWindowData, start_time: "22:00", end_time: "06:00" }),
        className: "px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded text-xs font-semibold hover:bg-purple-200 dark:hover:bg-purple-900/50"
      },
      "Night"
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Start Time"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newWindowData.start_time?.split(":")[0] || "00",
        onChange: (e) => {
          let currentMinute = newWindowData.start_time?.split(":")[1] || "00";
          setNewWindowData({ ...newWindowData, start_time: `${e.target.value}:${currentMinute}` });
        },
        className: "flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      },
      Array.from({ length: 24 }, (_, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i.toString().padStart(2, "0") }, i.toString().padStart(2, "0")))
    ), /* @__PURE__ */ React.createElement("span", { className: "flex items-center text-gray-500 dark:text-gray-400" }, ":"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newWindowData.start_time?.split(":")[1] || "00",
        onChange: (e) => {
          let currentHour = newWindowData.start_time?.split(":")[0] || "00";
          setNewWindowData({ ...newWindowData, start_time: `${currentHour}:${e.target.value}` });
        },
        className: "flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      },
      Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => /* @__PURE__ */ React.createElement("option", { key: minute, value: minute.toString().padStart(2, "0") }, minute.toString().padStart(2, "0"))),
      /* @__PURE__ */ React.createElement("option", { value: "59" }, "59 (End of Hour)")
    ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1" }, "End Time"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newWindowData.end_time?.split(":")[0] || "00",
        onChange: (e) => {
          let currentMinute = newWindowData.end_time?.split(":")[1] || "00";
          setNewWindowData({ ...newWindowData, end_time: `${e.target.value}:${currentMinute}` });
        },
        className: "flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      },
      Array.from({ length: 24 }, (_, i) => /* @__PURE__ */ React.createElement("option", { key: i, value: i.toString().padStart(2, "0") }, i.toString().padStart(2, "0")))
    ), /* @__PURE__ */ React.createElement("span", { className: "flex items-center text-gray-500 dark:text-gray-400" }, ":"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: newWindowData.end_time?.split(":")[1] || "00",
        onChange: (e) => {
          let currentHour = newWindowData.end_time?.split(":")[0] || "00";
          setNewWindowData({ ...newWindowData, end_time: `${currentHour}:${e.target.value}` });
        },
        className: "flex-1 px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white"
      },
      Array.from({ length: 12 }, (_, i) => i * 5).map((minute) => /* @__PURE__ */ React.createElement("option", { key: minute, value: minute.toString().padStart(2, "0") }, minute.toString().padStart(2, "0"))),
      /* @__PURE__ */ React.createElement("option", { value: "59" }, "59 (End of Hour)")
    ))))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (newWindowData.name && newWindowData.days.length > 0 && newWindowData.start_time && newWindowData.end_time) {
            let isMigration = newWindowData.type === "migration", targetArray = isMigration ? automationConfig.schedule?.migration_windows || [] : automationConfig.schedule?.blackout_windows || [], { type, ...windowData } = newWindowData;
            saveAutomationConfig2({
              schedule: {
                ...automationConfig.schedule,
                [isMigration ? "migration_windows" : "blackout_windows"]: [...targetArray, windowData]
              }
            }), setNewWindowData({ name: "", type: "migration", days: [], start_time: "00:00", end_time: "00:00" }), setShowTimeWindowForm(!1);
          } else
            setError("Please fill in all fields");
        },
        className: `px-4 py-2 rounded-lg text-sm font-semibold text-white flex items-center justify-center gap-1.5 ${newWindowData.type === "migration" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`
      },
      /* @__PURE__ */ React.createElement(Save, { size: 14 }),
      "Save Window"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setNewWindowData({ name: "", type: "migration", days: [], start_time: "00:00", end_time: "00:00" }), setShowTimeWindowForm(!1);
        },
        className: "px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-500 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(X, { size: 14 }),
      "Cancel"
    )))) : /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowTimeWindowForm(!0),
        className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(Plus, { size: 14 }),
      "Add Time Window"
    )));
  }

  // src/components/automation/MigrationLogsSection.jsx
  function MigrationLogsSection({
    automationStatus,
    automigrateLogs,
    migrationHistoryPage,
    setMigrationHistoryPage,
    migrationHistoryPageSize,
    setMigrationHistoryPageSize,
    migrationLogsTab,
    setMigrationLogsTab,
    setAutomigrateLogs,
    logRefreshTime,
    setLogRefreshTime,
    fetchAutomationStatus: fetchAutomationStatus2,
    setCurrentPage,
    collapsedSections,
    setCollapsedSections,
    automationConfig
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-4 flex-wrap gap-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white" }, "Migration Logs & History"), /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement(Info, { size: 16, className: "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" }), /* @__PURE__ */ React.createElement("div", { className: "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700", style: { minWidth: "280px" } }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold mb-2 text-blue-400 border-b border-gray-700 pb-2" }, "Migration Scoring System"), /* @__PURE__ */ React.createElement("div", { className: "text-[11px] space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-300" }, "Migrations are scored using a penalty-based system:"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 space-y-0.5" }, /* @__PURE__ */ React.createElement("div", null, "\u2022 ", /* @__PURE__ */ React.createElement("span", { className: "text-blue-300" }, "CPU Load"), " \xD7 30%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 ", /* @__PURE__ */ React.createElement("span", { className: "text-blue-300" }, "Memory Load"), " \xD7 30%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 ", /* @__PURE__ */ React.createElement("span", { className: "text-blue-300" }, "IOWait"), " \xD7 20%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 ", /* @__PURE__ */ React.createElement("span", { className: "text-blue-300" }, "Load Average"), " \xD7 10%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 ", /* @__PURE__ */ React.createElement("span", { className: "text-blue-300" }, "Storage Pressure"), " \xD7 10%")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-400" }, "Lower penalty score = better target"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-400" }, "Plus penalties for high usage & trends")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-gray-700" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-green-400 font-semibold" }, "70%+"), " = Excellent"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-yellow-400 font-semibold" }, "50-69%"), " = Good"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-orange-400 font-semibold" }, "30-49%"), " = Fair"), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-red-400 font-semibold" }, "<30%"), " = Poor"))))))), /* @__PURE__ */ React.createElement("div", { className: "border-b border-gray-200 dark:border-gray-700 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setMigrationLogsTab("history"),
        className: `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${migrationLogsTab === "history" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`
      },
      "Migration History"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setMigrationLogsTab("logs"),
        className: `px-4 py-2 text-sm font-medium border-b-2 transition-colors ${migrationLogsTab === "logs" ? "border-blue-600 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`
      },
      "Script Logs"
    ))), migrationLogsTab === "history" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3 flex-wrap gap-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400" }, automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 ? `Showing ${(migrationHistoryPage - 1) * migrationHistoryPageSize + 1}-${Math.min(migrationHistoryPage * migrationHistoryPageSize, automationStatus.recent_migrations.length)} of ${automationStatus.recent_migrations.length} migrations` : "No migrations"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: migrationHistoryPageSize,
        onChange: (e) => {
          setMigrationHistoryPageSize(Number(e.target.value)), setMigrationHistoryPage(1);
        },
        className: "px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: 5 }, "5 per page"),
      /* @__PURE__ */ React.createElement("option", { value: 10 }, "10 per page"),
      /* @__PURE__ */ React.createElement("option", { value: 25 }, "25 per page"),
      /* @__PURE__ */ React.createElement("option", { value: 50 }, "50 per page"),
      /* @__PURE__ */ React.createElement("option", { value: 100 }, "100 per page")
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: fetchAutomationStatus2,
        className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
      "Refresh"
    )), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50 dark:bg-gray-700" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" }, "Time"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" }, "VM"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" }, "Migration"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" }, "Score"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" }, "Reason"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-semibold text-gray-700 dark:text-gray-300" }, "Duration"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-gray-200 dark:divide-gray-700" }, automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 ? (() => {
      let reversedMigrations = automationStatus.recent_migrations.slice().reverse(), startIndex = (migrationHistoryPage - 1) * migrationHistoryPageSize, endIndex = startIndex + migrationHistoryPageSize;
      return reversedMigrations.slice(startIndex, endIndex).map((migration) => {
        let timeDisplay = "";
        if (migration.timestamp)
          try {
            let timestamp = migration.timestamp.endsWith("Z") ? migration.timestamp : migration.timestamp + "Z";
            timeDisplay = new Date(timestamp).toLocaleString();
          } catch {
            timeDisplay = migration.timestamp;
          }
        let durationDisplay = migration.duration_seconds ? `${Math.floor(migration.duration_seconds / 60)}m ${migration.duration_seconds % 60}s` : "-";
        return /* @__PURE__ */ React.createElement("tr", { key: migration.id, className: "hover:bg-gray-50 dark:hover:bg-gray-700/50" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap" }, timeDisplay), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm font-medium text-gray-900 dark:text-white" }, migration.name), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400" }, "ID: ", migration.vmid)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, migration.source_node), /* @__PURE__ */ React.createElement(ArrowRight, { size: 12 }), /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, migration.target_node))), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-xs" }, migration.suitability_rating !== void 0 || migration.target_node_score !== void 0 ? (() => {
          let suitabilityPercent = migration.suitability_rating !== void 0 ? migration.suitability_rating : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));
          return /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${suitabilityPercent >= 70 ? "text-green-600 dark:text-green-400" : suitabilityPercent >= 50 ? "text-yellow-600 dark:text-yellow-400" : suitabilityPercent >= 30 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"}` }, suitabilityPercent, "%"), /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement(Info, { size: 12, className: "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold mb-1 text-blue-400" }, "Scoring Breakdown"), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] space-y-0.5" }, /* @__PURE__ */ React.createElement("div", null, "Target: ", migration.target_node), /* @__PURE__ */ React.createElement("div", null, "Penalty Score: ", migration.target_node_score?.toFixed(1) || "N/A"), /* @__PURE__ */ React.createElement("div", null, "Suitability: ", suitabilityPercent, "%"), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-700 pt-1 mt-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-400" }, "Lower penalty = better target"), /* @__PURE__ */ React.createElement("div", null, "\u2022 CPU Load \xD7 30%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 Memory Load \xD7 30%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 IOWait \xD7 20%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 Load Avg \xD7 10%"), /* @__PURE__ */ React.createElement("div", null, "\u2022 Storage Pressure \xD7 10%"), /* @__PURE__ */ React.createElement("div", { className: "mt-1 text-gray-400" }, "+ Penalties for high usage/trends")), migration.target_node_score > 100 && /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-700 pt-1 mt-1 text-red-400" }, "\u26A0 Penalty score >100 indicates heavy load/trends")))));
        })() : /* @__PURE__ */ React.createElement("span", { className: "text-gray-400" }, "N/A")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-xs text-gray-600 dark:text-gray-400 max-w-xs" }, /* @__PURE__ */ React.createElement("div", { className: "truncate", title: migration.reason }, migration.reason)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 rounded text-xs font-semibold inline-flex items-center gap-1 ${migration.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : migration.status === "failed" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : migration.status === "timeout" ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" : "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"}` }, migration.status === "completed" && /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }), migration.status === "failed" && /* @__PURE__ */ React.createElement(XCircle, { size: 12 }), migration.status === "timeout" && /* @__PURE__ */ React.createElement(Clock, { size: 12 }), migration.status), migration.dry_run && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-1 rounded text-xs font-semibold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" }, "DRY RUN"))), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap" }, durationDisplay));
      });
    })() : /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { colSpan: "7", className: "px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400" }, "No migration history available"))))), automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Page ", migrationHistoryPage, " of ", Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setMigrationHistoryPage(1),
        disabled: migrationHistoryPage === 1,
        className: "px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
      },
      "First"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setMigrationHistoryPage(migrationHistoryPage - 1),
        disabled: migrationHistoryPage === 1,
        className: "px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
      },
      "Previous"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setMigrationHistoryPage(migrationHistoryPage + 1),
        disabled: migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize),
        className: "px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
      },
      "Next"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setMigrationHistoryPage(Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize)),
        disabled: migrationHistoryPage >= Math.ceil(automationStatus.recent_migrations.length / migrationHistoryPageSize),
        className: "px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300"
      },
      "Last"
    )))), migrationLogsTab === "logs" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3 flex-wrap gap-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 min-w-0" }, logRefreshTime && `Last updated: ${logRefreshTime}`), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap shrink-0" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          try {
            let data = await (await fetch("/api/automigrate/logs?lines=500")).json();
            data.success && (setAutomigrateLogs(data.logs), setLogRefreshTime((/* @__PURE__ */ new Date()).toLocaleTimeString()));
          } catch (error) {
            console.error("Error fetching logs:", error);
          }
        },
        className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium flex items-center gap-2",
        title: "Refresh Logs"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Refresh")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          if (!automigrateLogs) return;
          let blob = new Blob([automigrateLogs], { type: "text/plain" }), url = window.URL.createObjectURL(blob), a = document.createElement("a");
          a.href = url, a.download = `automigrate-logs-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.txt`, document.body.appendChild(a), a.click(), document.body.removeChild(a), window.URL.revokeObjectURL(url);
        },
        disabled: !automigrateLogs,
        className: "px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded text-sm font-medium flex items-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 14 }),
      "Download"
    ))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-900 dark:bg-black rounded border border-gray-700 p-4 max-h-96 overflow-y-auto" }, /* @__PURE__ */ React.createElement("pre", { className: "text-xs text-green-400 font-mono whitespace-pre-wrap" }, automigrateLogs || 'Click "Refresh" to load logs...')))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement(Bell, { size: 24, className: "text-blue-600 dark:text-blue-400 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white" }, "Notification Settings"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400" }, automationConfig.notifications?.enabled ? `Enabled - ${Object.entries(automationConfig.notifications?.providers || {}).filter(([, v]) => v?.enabled).length} provider(s) active` : "Configure notification providers for migration events"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentPage("settings"),
        className: "shrink-0 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Settings, { size: 16 }),
      "Open Settings"
    ))));
  }

  // src/components/automation/PenaltyScoringSection.jsx
  init_constants();
  var { useState: useState8, useEffect: useEffect2, useCallback } = React, SENSITIVITY_LABELS = { 1: "Conservative", 2: "Balanced", 3: "Aggressive" }, SENSITIVITY_DESCRIPTIONS = {
    1: "High bar for migrations. Only recommends moves with clear, sustained problems. Best for production clusters where stability is paramount.",
    2: "Moderate sensitivity. Recommends migrations when trends show growing problems. Suitable for most clusters.",
    3: "Low bar for migrations. Recommends moves proactively for even modest improvements. Best for clusters that benefit from frequent rebalancing."
  }, LOOKBACK_OPTIONS = [
    { value: 1, label: "1 day" },
    { value: 3, label: "3 days" },
    { value: 7, label: "7 days" },
    { value: 14, label: "14 days" },
    { value: 30, label: "30 days" }
  ];
  function PenaltyScoringSection({
    collapsedSections,
    setCollapsedSections,
    // Legacy penalty config props (used in expert mode)
    penaltyConfig,
    setPenaltyConfig,
    penaltyDefaults,
    penaltyConfigSaved,
    savingPenaltyConfig,
    penaltyPresets,
    activePreset,
    applyPenaltyPreset: applyPenaltyPreset2,
    cpuThreshold,
    memThreshold,
    iowaitThreshold,
    savePenaltyConfig: savePenaltyConfig2,
    resetPenaltyConfig: resetPenaltyConfig2,
    // Simplified migration settings props
    migrationSettings,
    setMigrationSettings,
    migrationSettingsDefaults,
    migrationSettingsDescriptions,
    effectivePenaltyConfig,
    hasExpertOverrides,
    savingMigrationSettings,
    migrationSettingsSaved,
    saveMigrationSettingsAction,
    resetMigrationSettingsAction,
    fetchMigrationSettingsAction
  }) {
    let [showExpertMode, setShowExpertMode] = useState8(!1), [showSimulator, setShowSimulator] = useState8(!1), [simulatorResult, setSimulatorResult] = useState8(null), [simulatingConfig, setSimulatingConfig] = useState8(!1);
    useEffect2(() => {
      !migrationSettings && fetchMigrationSettingsAction && fetchMigrationSettingsAction();
    }, []);
    let settings = migrationSettings || {
      sensitivity: 2,
      trend_weight: 60,
      lookback_days: 7,
      min_confidence: 75,
      protect_workloads: !0,
      min_score_improvement: null
    }, SENSITIVITY_MSI = { 1: 25, 2: 15, 3: 8 }, effectiveMsi = settings.min_score_improvement != null ? settings.min_score_improvement : SENSITIVITY_MSI[settings.sensitivity] || 15, updateSetting = (key, value) => {
      setMigrationSettings && setMigrationSettings((prev) => ({ ...prev, [key]: value }));
    }, runSimulation = async () => {
      let configToSim = showExpertMode ? penaltyConfig : effectivePenaltyConfig;
      if (configToSim) {
        setSimulatingConfig(!0), setShowSimulator(!0);
        try {
          let { simulatePenaltyConfig: simulatePenaltyConfig2 } = await Promise.resolve().then(() => (init_client(), client_exports)), result = await simulatePenaltyConfig2(configToSim, {
            cpu_threshold: cpuThreshold || 60,
            mem_threshold: memThreshold || 70,
            iowait_threshold: iowaitThreshold || 30
          });
          result && result.success ? setSimulatorResult(result) : setSimulatorResult({ error: result?.error || "Simulation failed" });
        } catch (err) {
          setSimulatorResult({ error: err.message });
        } finally {
          setSimulatingConfig(!1);
        }
      }
    }, isSaving = savingMigrationSettings || savingPenaltyConfig, isSaved = migrationSettingsSaved || penaltyConfigSaved;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { id: "penalty-config-section", className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, penaltyScoring: !prev.penaltyScoring })),
        className: "w-full flex items-center justify-between text-left mb-4 hover:opacity-80 transition-opacity flex-wrap gap-y-3"
      },
      /* @__PURE__ */ React.createElement("h2", { className: "text-xl font-bold text-gray-900 dark:text-white" }, "Migration Settings"),
      /* @__PURE__ */ React.createElement(
        ChevronDown,
        {
          size: 24,
          className: `text-gray-600 dark:text-gray-400 transition-transform shrink-0 ${collapsedSections.penaltyScoring ? "-rotate-180" : ""}`
        }
      )
    ), !collapsedSections.penaltyScoring && /* @__PURE__ */ React.createElement("div", { className: "space-y-5" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Configure how ProxBalance analyzes performance trends and decides when to recommend migrations."), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white" }, "Migration Sensitivity"), /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement(Info, { size: 14, className: "text-gray-400 hover:text-blue-500 cursor-help" }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50" }, "Controls how aggressively ProxBalance recommends migrations"))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-3" }, SENSITIVITY_DESCRIPTIONS[settings.sensitivity]), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, [1, 2, 3].map((level) => {
      let isActive = settings.sensitivity === level;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: level,
          onClick: () => updateSetting("sensitivity", level),
          disabled: isSaving,
          className: `px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm ${{
            1: isActive ? "bg-green-600 text-white ring-2 ring-green-300 dark:ring-green-700" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-green-50 dark:hover:bg-green-900/20 border border-gray-300 dark:border-gray-600",
            2: isActive ? "bg-blue-600 text-white ring-2 ring-blue-300 dark:ring-blue-700" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 border border-gray-300 dark:border-gray-600",
            3: isActive ? "bg-orange-600 text-white ring-2 ring-orange-300 dark:ring-orange-700" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-orange-900/20 border border-gray-300 dark:border-gray-600"
          }[level]}`
        },
        SENSITIVITY_LABELS[level],
        isActive && /* @__PURE__ */ React.createElement("span", { className: "ml-1.5 text-xs opacity-80" }, "(active)")
      );
    }))), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white" }, "Trend Weight"), /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement(Info, { size: 14, className: "text-gray-400 hover:text-blue-500 cursor-help" }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50", style: { minWidth: "240px" } }, "Controls how much historical trends matter vs. current snapshot. Higher values give more weight to sustained patterns over time."))), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-3" }, settings.trend_weight <= 20 ? "Mostly snapshot-based: decisions rely primarily on current metrics." : settings.trend_weight <= 45 ? "Snapshot-leaning: current metrics are weighted more, but trends factor in." : settings.trend_weight <= 65 ? "Balanced: decisions use a mix of current metrics and historical trends." : settings.trend_weight <= 85 ? "Trend-leaning: historical patterns are weighted more heavily than current snapshot." : "Mostly trend-based: decisions rely primarily on sustained historical patterns."), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 whitespace-nowrap w-16" }, "Snapshot"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 0,
        max: 100,
        step: 5,
        value: settings.trend_weight,
        onChange: (e) => updateSetting("trend_weight", parseInt(e.target.value)),
        className: "flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 whitespace-nowrap w-12 text-right" }, "Trends"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-gray-600 dark:text-gray-300 w-10 text-right" }, settings.trend_weight, "%"))), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white" }, "Analysis Lookback")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mb-3" }, "How many days of performance history to analyze when detecting trends. Longer periods provide more stable analysis but are slower to react to changes."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, LOOKBACK_OPTIONS.map(({ value, label }) => {
      let isActive = settings.lookback_days === value;
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          key: value,
          onClick: () => updateSetting("lookback_days", value),
          disabled: isSaving,
          className: `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isActive ? "bg-blue-600 text-white shadow-md ring-2 ring-blue-300 dark:ring-blue-700" : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"}`
        },
        label
      );
    }))), /* @__PURE__ */ React.createElement("details", { className: "group" }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex items-center gap-1 list-none" }, /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: "transition-transform group-open:rotate-180" }), "Advanced Settings"), /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "Minimum Confidence"), /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement(Info, { size: 14, className: "text-gray-400 hover:text-blue-500 cursor-help" }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50", style: { minWidth: "220px" } }, "Minimum confidence score required before recommending a migration. Higher values mean more data is needed before acting."))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 w-8" }, "50%"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "range",
        min: 50,
        max: 95,
        step: 5,
        value: settings.min_confidence,
        onChange: (e) => updateSetting("min_confidence", parseInt(e.target.value)),
        className: "flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-600"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 w-8" }, "95%"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-mono text-gray-600 dark:text-gray-300 w-10 text-right" }, settings.min_confidence, "%"))), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "Min Score Improvement"), /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement(Info, { size: 14, className: "text-gray-400 hover:text-blue-500 cursor-help" }), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50", style: { minWidth: "240px" } }, "Minimum penalty score improvement (in points) required for a migration to be recommended. Lower values recommend more migrations.")), settings.min_score_improvement != null && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => updateSetting("min_score_improvement", null),
        className: "text-xs text-blue-600 dark:text-blue-400 hover:underline ml-auto"
      },
      "Reset to preset (",
      SENSITIVITY_MSI[settings.sensitivity] || 15,
      ")"
    )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "100",
        value: effectiveMsi,
        onCommit: (val) => updateSetting("min_score_improvement", val),
        className: "w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    ), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, "points", settings.min_score_improvement == null && /* @__PURE__ */ React.createElement("span", { className: "ml-1" }, "(from ", SENSITIVITY_LABELS[settings.sensitivity], " preset)")))), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Shield, { size: 16, className: "text-blue-500" }), /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "Protect Running Workloads")), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, "Avoid migrating guests during their detected peak usage hours to minimize disruption.")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => updateSetting("protect_workloads", !settings.protect_workloads),
        className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ml-4 ${settings.protect_workloads ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: `inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.protect_workloads ? "translate-x-6" : "translate-x-1"}` })
    ))), /* @__PURE__ */ React.createElement("div", { className: "p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "What-If Simulator"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Preview how your current settings would affect recommendations before saving.")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: runSimulation,
        disabled: simulatingConfig,
        className: "px-3 py-1.5 bg-indigo-600 dark:bg-indigo-500 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 disabled:opacity-50 transition-colors flex items-center gap-1.5"
      },
      simulatingConfig ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin" }), " Simulating...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Eye, { size: 14 }), " Simulate")
    )), showSimulator && simulatorResult && !simulatorResult.error && /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Current Settings"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, simulatorResult.current_count), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400" }, "recommendations")), /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Proposed Settings"), /* @__PURE__ */ React.createElement("div", { className: `text-2xl font-bold ${simulatorResult.proposed_count > simulatorResult.current_count ? "text-orange-600 dark:text-orange-400" : simulatorResult.proposed_count < simulatorResult.current_count ? "text-green-600 dark:text-green-400" : "text-gray-900 dark:text-white"}` }, simulatorResult.proposed_count), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400" }, "recommendations"))), simulatorResult.changes && simulatorResult.changes.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h5", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5" }, "Changes"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1 max-h-40 overflow-y-auto" }, simulatorResult.changes.map((change, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-center gap-2 text-xs p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: `px-1.5 py-0.5 rounded-lg font-medium ${change.action === "added" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}` }, change.action === "added" ? "+New" : "-Removed"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300" }, change.type, " ", change.vmid, " (", change.name, ")"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-auto" }, change.source_node, " \u2192 ", change.target_node))))), simulatorResult.node_score_comparison && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h5", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5" }, "Node Score Impact"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5" }, Object.entries(simulatorResult.node_score_comparison).map(([node, scores]) => /* @__PURE__ */ React.createElement("div", { key: node, className: "flex items-center justify-between text-xs p-1.5 bg-gray-50 dark:bg-gray-700/30 rounded-lg" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, node), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, scores.current, " \u2192 ", scores.proposed, /* @__PURE__ */ React.createElement("span", { className: `ml-1 font-medium ${scores.delta < 0 ? "text-green-600 dark:text-green-400" : scores.delta > 0 ? "text-red-600 dark:text-red-400" : "text-gray-500"}` }, "(", scores.delta > 0 ? "+" : "", scores.delta, ")")))))), simulatorResult.changes?.length === 0 && simulatorResult.current_count === simulatorResult.proposed_count && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 text-center py-2" }, "No changes \u2014 proposed settings produce the same recommendations.")), showSimulator && simulatorResult?.error && /* @__PURE__ */ React.createElement("div", { className: "mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400" }, "Simulation error: ", simulatorResult.error)))), /* @__PURE__ */ React.createElement("details", { className: "group", open: showExpertMode, onToggle: (e) => setShowExpertMode(e.target.open) }, /* @__PURE__ */ React.createElement("summary", { className: "cursor-pointer text-sm font-medium text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-200 flex items-center gap-1 list-none" }, /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: "transition-transform group-open:rotate-180" }), "Expert Mode: Raw Penalty Weights"), /* @__PURE__ */ React.createElement("div", { className: "mt-3 space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" }), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-yellow-700 dark:text-yellow-300" }, "These values are automatically managed by the simplified settings above. Manual changes here will override automatic mapping and your settings will be saved as expert overrides."))), penaltyConfig && penaltyDefaults && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "Time Period Weights"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400" }, "Control how much weight to give to recent vs. historical metrics. Values must sum to 1.0."), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-700 dark:text-gray-300 mb-1" }, "Current Weight (default: ", penaltyDefaults.weight_current, ")"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        step: "0.1",
        min: "0",
        max: "1",
        isFloat: !0,
        value: penaltyConfig.weight_current,
        onCommit: (val) => setPenaltyConfig({ ...penaltyConfig, weight_current: val }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-700 dark:text-gray-300 mb-1" }, "24h Weight (default: ", penaltyDefaults.weight_24h, ")"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        step: "0.1",
        min: "0",
        max: "1",
        isFloat: !0,
        value: penaltyConfig.weight_24h,
        onCommit: (val) => setPenaltyConfig({ ...penaltyConfig, weight_24h: val }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-700 dark:text-gray-300 mb-1" }, "7d Weight (default: ", penaltyDefaults.weight_7d, ")"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        step: "0.1",
        min: "0",
        max: "1",
        isFloat: !0,
        value: penaltyConfig.weight_7d,
        onCommit: (val) => setPenaltyConfig({ ...penaltyConfig, weight_7d: val }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    ))), (() => {
      let sum = (penaltyConfig.weight_current || 0) + (penaltyConfig.weight_24h || 0) + (penaltyConfig.weight_7d || 0), isValid = Math.abs(sum - 1) < 0.01;
      return /* @__PURE__ */ React.createElement("div", { className: `text-xs font-medium ${isValid ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}` }, "Sum: ", sum.toFixed(2), " ", isValid ? "\u2713 Valid" : "\u2717 Must equal 1.0");
    })()), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "CPU Penalties"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, [["cpu_high_penalty", "High"], ["cpu_very_high_penalty", "Very High"], ["cpu_extreme_penalty", "Extreme"]].map(([key, label]) => /* @__PURE__ */ React.createElement("div", { key }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-700 dark:text-gray-300 mb-1" }, label, " (default: ", penaltyDefaults[key], ")"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        value: penaltyConfig[key],
        onCommit: (val) => setPenaltyConfig({ ...penaltyConfig, [key]: val }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    ))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "Memory Penalties"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, [["mem_high_penalty", "High"], ["mem_very_high_penalty", "Very High"], ["mem_extreme_penalty", "Extreme"]].map(([key, label]) => /* @__PURE__ */ React.createElement("div", { key }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-700 dark:text-gray-300 mb-1" }, label, " (default: ", penaltyDefaults[key], ")"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        value: penaltyConfig[key],
        onCommit: (val) => setPenaltyConfig({ ...penaltyConfig, [key]: val }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    ))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "IOWait Penalties"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3" }, [["iowait_moderate_penalty", "Moderate"], ["iowait_high_penalty", "High"], ["iowait_severe_penalty", "Severe"]].map(([key, label]) => /* @__PURE__ */ React.createElement("div", { key }, /* @__PURE__ */ React.createElement("label", { className: "block text-xs text-gray-700 dark:text-gray-300 mb-1" }, label, " (default: ", penaltyDefaults[key], ")"), /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "0",
        value: penaltyConfig[key],
        onCommit: (val) => setPenaltyConfig({ ...penaltyConfig, [key]: val }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    ))))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" }, /* @__PURE__ */ React.createElement("h4", { className: "font-medium text-gray-900 dark:text-white text-sm" }, "Minimum Score Improvement"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400" }, "Minimum score improvement (in points) required for a migration to be recommended."), /* @__PURE__ */ React.createElement("div", { className: "max-w-md" }, /* @__PURE__ */ React.createElement(
      NumberField,
      {
        min: "1",
        max: "100",
        value: penaltyConfig.min_score_improvement !== void 0 ? penaltyConfig.min_score_improvement : 15,
        onCommit: (val) => setPenaltyConfig({ ...penaltyConfig, min_score_improvement: val }),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    ))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 pt-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: savePenaltyConfig2,
        disabled: savingPenaltyConfig,
        className: "flex-1 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 text-sm"
      },
      savingPenaltyConfig ? "Saving..." : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Save, { size: 14 }), " Save Expert Overrides")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: resetPenaltyConfig2,
        disabled: savingPenaltyConfig,
        className: "px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium disabled:opacity-50 flex items-center justify-center gap-1.5 text-sm"
      },
      /* @__PURE__ */ React.createElement(RotateCcw, { size: 14 }),
      " Reset Expert"
    ))))), isSaved && /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-green-100 dark:bg-green-900/30 border border-green-500 rounded-lg text-green-800 dark:text-green-300 text-sm" }, "Settings saved successfully!"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2 pt-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: saveMigrationSettingsAction,
        disabled: isSaving,
        className: `flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 ${migrationSettingsSaved ? "bg-green-600 dark:bg-green-500 hover:bg-green-700 dark:hover:bg-green-600" : "bg-blue-600 dark:bg-blue-500 hover:bg-blue-700 dark:hover:bg-blue-600"}`
      },
      isSaving ? "Saving..." : migrationSettingsSaved ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle, { size: 14 }), " Saved!") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Save, { size: 14 }), " Save Settings")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: resetMigrationSettingsAction,
        disabled: isSaving,
        className: "flex-1 px-4 py-2 bg-gray-600 dark:bg-gray-500 text-white rounded-lg hover:bg-gray-700 dark:hover:bg-gray-600 font-medium disabled:opacity-50 flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(RotateCcw, { size: 14 }),
      " Reset to Defaults"
    )))));
  }

  // src/components/AutomationPage.jsx
  function AutomationPage(props) {
    let {
      automationConfig,
      automationStatus,
      automigrateLogs,
      collapsedSections,
      config,
      confirmRemoveWindow,
      editingWindowIndex,
      fetchAutomationStatus: fetchAutomationStatus2,
      logRefreshTime,
      migrationHistoryPage,
      migrationHistoryPageSize,
      migrationLogsTab,
      newWindowData,
      penaltyConfig,
      setPenaltyConfig,
      penaltyDefaults,
      penaltyConfigSaved,
      savingPenaltyConfig,
      penaltyPresets,
      activePreset,
      applyPenaltyPreset: applyPenaltyPreset2,
      cpuThreshold,
      memThreshold,
      iowaitThreshold,
      savePenaltyConfig: savePenaltyConfig2,
      resetPenaltyConfig: resetPenaltyConfig2,
      migrationSettings,
      setMigrationSettings,
      migrationSettingsDefaults,
      migrationSettingsDescriptions,
      effectivePenaltyConfig,
      hasExpertOverrides,
      savingMigrationSettings,
      migrationSettingsSaved,
      saveMigrationSettingsAction,
      resetMigrationSettingsAction,
      fetchMigrationSettingsAction,
      saveAutomationConfig: saveAutomationConfig2,
      setAutomigrateLogs,
      setCollapsedSections,
      setConfig,
      setConfirmRemoveWindow,
      setCurrentPage,
      setEditingWindowIndex,
      setError,
      setLogRefreshTime,
      setMigrationHistoryPage,
      setMigrationHistoryPageSize,
      setMigrationLogsTab,
      setNewWindowData,
      setShowTimeWindowForm,
      setTestResult,
      showTimeWindowForm,
      testAutomation: testAutomation2,
      testingAutomation,
      testResult
    } = props;
    return automationConfig ? /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 sm:pb-0" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-5xl mx-auto p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between flex-wrap gap-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 min-w-0" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentPage("dashboard"),
        className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 shrink-0",
        title: "Back to Dashboard"
      },
      /* @__PURE__ */ React.createElement(ArrowLeft, { size: 20, className: "text-gray-700 dark:text-gray-300" })
    ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement(Clock, { size: 28, className: "text-blue-600 dark:text-blue-400 shrink-0" }), /* @__PURE__ */ React.createElement("h1", { className: "text-xl sm:text-3xl font-bold text-gray-900 dark:text-white" }, "Automated Migrations"), /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement(Info, { size: 18, className: "text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-help" }), /* @__PURE__ */ React.createElement("div", { className: "absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700", style: { minWidth: "280px" } }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold mb-1.5" }, "How Automated Migrations Work"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1 text-gray-300" }, /* @__PURE__ */ React.createElement("p", null, "1. Runs on a schedule (every N minutes)"), /* @__PURE__ */ React.createElement("p", null, "2. Fetches current recommendations from the engine"), /* @__PURE__ */ React.createElement("p", null, "3. Validates each migration against safety rules"), /* @__PURE__ */ React.createElement("p", null, "4. Executes approved migrations one at a time"), /* @__PURE__ */ React.createElement("p", null, "5. Waits for cooldown between migrations")), /* @__PURE__ */ React.createElement("div", { className: "absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-full" }, /* @__PURE__ */ React.createElement("div", { className: "border-8 border-transparent border-b-gray-900 dark:border-b-gray-800" })))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 flex-wrap" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: testAutomation2,
        disabled: testingAutomation,
        className: "flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-blue-400 disabled:cursor-not-allowed"
      },
      testingAutomation ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }), " Testing...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Play, { size: 16 }), " Test Run")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentPage("dashboard"),
        className: "flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
      },
      /* @__PURE__ */ React.createElement(ArrowLeft, { size: 16 }),
      "Back"
    )))), testResult && /* @__PURE__ */ React.createElement("div", { className: `mb-6 p-4 rounded-lg border ${testResult.success ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" : "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, testResult.success ? /* @__PURE__ */ React.createElement(CheckCircle, { size: 20, className: "text-green-600 dark:text-green-400 mt-0.5" }) : /* @__PURE__ */ React.createElement(XCircle, { size: 20, className: "text-red-600 dark:text-red-400 mt-0.5" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: `font-semibold ${testResult.success ? "text-green-900 dark:text-green-200" : "text-red-900 dark:text-red-200"}` }, testResult.success ? "Test Run Complete" : "Test Run Failed"), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-1 text-gray-700 dark:text-gray-300" }, testResult.message || testResult.error))), /* @__PURE__ */ React.createElement("button", { onClick: () => setTestResult(null), className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" }, /* @__PURE__ */ React.createElement(X, { size: 16 })))), /* @__PURE__ */ React.createElement(
      MainSettingsSection,
      {
        automationConfig,
        saveAutomationConfig: saveAutomationConfig2,
        collapsedSections,
        setCollapsedSections
      }
    ), /* @__PURE__ */ React.createElement(
      DecisionTreeFlowchart,
      {
        collapsedSections,
        setCollapsedSections
      }
    ), /* @__PURE__ */ React.createElement(
      SmartMigrationsSection,
      {
        automationConfig,
        automationStatus,
        saveAutomationConfig: saveAutomationConfig2,
        collapsedSections,
        setCollapsedSections
      }
    ), /* @__PURE__ */ React.createElement(
      SafetyRulesSection,
      {
        automationConfig,
        saveAutomationConfig: saveAutomationConfig2,
        collapsedSections,
        setCollapsedSections
      }
    ), /* @__PURE__ */ React.createElement(
      PenaltyScoringSection,
      {
        collapsedSections,
        setCollapsedSections,
        penaltyConfig,
        setPenaltyConfig,
        penaltyDefaults,
        penaltyConfigSaved,
        savingPenaltyConfig,
        penaltyPresets,
        activePreset,
        applyPenaltyPreset: applyPenaltyPreset2,
        cpuThreshold,
        memThreshold,
        iowaitThreshold,
        savePenaltyConfig: savePenaltyConfig2,
        resetPenaltyConfig: resetPenaltyConfig2,
        migrationSettings,
        setMigrationSettings,
        migrationSettingsDefaults,
        migrationSettingsDescriptions,
        effectivePenaltyConfig,
        hasExpertOverrides,
        savingMigrationSettings,
        migrationSettingsSaved,
        saveMigrationSettingsAction,
        resetMigrationSettingsAction,
        fetchMigrationSettingsAction
      }
    ), /* @__PURE__ */ React.createElement(
      DistributionBalancingSection,
      {
        config,
        automationConfig,
        collapsedSections,
        setCollapsedSections,
        setConfig,
        saveAutomationConfig: saveAutomationConfig2
      }
    ), /* @__PURE__ */ React.createElement(
      TimeWindowsSection,
      {
        automationConfig,
        saveAutomationConfig: saveAutomationConfig2,
        collapsedSections,
        setCollapsedSections,
        editingWindowIndex,
        setEditingWindowIndex,
        showTimeWindowForm,
        setShowTimeWindowForm,
        newWindowData,
        setNewWindowData,
        confirmRemoveWindow,
        setConfirmRemoveWindow,
        setError
      }
    ), /* @__PURE__ */ React.createElement(
      MigrationLogsSection,
      {
        automationStatus,
        automigrateLogs,
        migrationHistoryPage,
        setMigrationHistoryPage,
        migrationHistoryPageSize,
        setMigrationHistoryPageSize,
        migrationLogsTab,
        setMigrationLogsTab,
        setAutomigrateLogs,
        logRefreshTime,
        setLogRefreshTime,
        fetchAutomationStatus: fetchAutomationStatus2,
        setCurrentPage,
        collapsedSections,
        setCollapsedSections,
        automationConfig
      }
    ))) : /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400" }, "Loading automation settings..."));
  }

  // src/components/dashboard/NodeDetailsModal.jsx
  function NodeDetailsModal({
    selectedNode,
    setSelectedNode,
    maintenanceNodes,
    setMaintenanceNodes,
    canMigrate,
    evacuatingNodes,
    planningNodes,
    setPlanningNodes,
    setEvacuationPlan,
    setPlanNode,
    setError,
    nodeScores,
    penaltyConfig,
    generateSparkline,
    API_BASE: API_BASE4,
    setGuestTargets
  }) {
    return selectedNode ? /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4", onClick: () => setSelectedNode(null) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0" }, /* @__PURE__ */ React.createElement(Server, { size: 24, className: `shrink-0 ${maintenanceNodes.has(selectedNode.name) ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"}` }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base sm:text-xl font-bold text-gray-900 dark:text-white truncate" }, selectedNode.name), /* @__PURE__ */ React.createElement("p", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400" }, "Node Details")), maintenanceNodes.has(selectedNode.name) && /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline px-2.5 py-1 bg-yellow-500 text-white text-xs font-bold rounded-full shrink-0" }, "MAINTENANCE")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setSelectedNode(null),
        className: "ml-2 shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
      },
      /* @__PURE__ */ React.createElement(X, { size: 22 })
    )), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-3 sm:gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Guests"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, selectedNode.guests ? Object.keys(selectedNode.guests).length : 0)), /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-20", preserveAspectRatio: "none", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement(
      "polyline",
      {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        className: "text-blue-600 dark:text-blue-400",
        points: generateSparkline(selectedNode.cpu_percent || 0, 100, 40, 0.3)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-300 mb-1" }, "CPU Usage"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, (selectedNode.cpu_percent || 0).toFixed(1), "%"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400" }, selectedNode.cpu_cores || 0, " cores"))), /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-20", preserveAspectRatio: "none", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement(
      "polyline",
      {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        className: "text-purple-600 dark:text-purple-400",
        points: generateSparkline(selectedNode.mem_percent || 0, 100, 40, 0.25)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-300 mb-1" }, "Memory Usage"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, (selectedNode.mem_percent || 0).toFixed(1), "%"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400" }, ((selectedNode.mem_used || 0) / 1073741824).toFixed(1), " GB / ", ((selectedNode.mem_total || 0) / 1073741824).toFixed(1), " GB"))), /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-20", preserveAspectRatio: "none", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement(
      "polyline",
      {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2",
        className: "text-orange-600 dark:text-orange-400",
        points: generateSparkline(selectedNode.metrics?.current_iowait || 0, 100, 40, 0.35)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-300 mb-1" }, "IOWait"), /* @__PURE__ */ React.createElement("div", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, (selectedNode.metrics?.current_iowait || 0).toFixed(1), "%"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400" }, "I/O latency")))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Status"), /* @__PURE__ */ React.createElement("div", { className: `text-lg font-semibold ${selectedNode.status === "online" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}` }, selectedNode.status || "unknown")), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-700 rounded-lg p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Uptime"), /* @__PURE__ */ React.createElement("div", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, selectedNode.uptime ? Math.floor(selectedNode.uptime / 86400) + "d" : "N/A"))), selectedNode.metrics && /* @__PURE__ */ React.createElement("div", { className: "mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-3" }, /* @__PURE__ */ React.createElement(Activity, { size: 16, className: "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-900 dark:text-white" }, "Migration Target Suitability")), nodeScores && nodeScores[selectedNode.name] && /* @__PURE__ */ React.createElement("div", { className: "mb-3 p-3 bg-white dark:bg-gray-800 rounded-lg border-2 border-blue-300 dark:border-blue-600" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Suitability Rating"), /* @__PURE__ */ React.createElement("div", { className: `text-2xl font-bold ${nodeScores[selectedNode.name].suitability_rating >= 70 ? "text-green-600 dark:text-green-400" : nodeScores[selectedNode.name].suitability_rating >= 50 ? "text-yellow-600 dark:text-yellow-400" : nodeScores[selectedNode.name].suitability_rating >= 30 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"}` }, nodeScores[selectedNode.name].suitability_rating, "%")), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, /* @__PURE__ */ React.createElement("div", { className: `inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${nodeScores[selectedNode.name].suitable ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"}` }, nodeScores[selectedNode.name].suitable ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }), " Suitable") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(XCircle, { size: 12 }), " Not Suitable")), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mt-1" }, nodeScores[selectedNode.name].reason))), nodeScores[selectedNode.name].penalty_categories && (() => {
      let cats = nodeScores[selectedNode.name].penalty_categories, total = cats.cpu + cats.memory + cats.iowait + cats.trends + cats.spikes;
      if (total === 0) return /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-green-600 dark:text-green-400" }, "No active penalties"));
      let segments = [
        { key: "cpu", value: cats.cpu, color: "bg-red-500", textColor: "text-red-600 dark:text-red-400", label: "CPU" },
        { key: "memory", value: cats.memory, color: "bg-blue-500", textColor: "text-blue-600 dark:text-blue-400", label: "Memory" },
        { key: "iowait", value: cats.iowait, color: "bg-orange-500", textColor: "text-orange-600 dark:text-orange-400", label: "IOWait" },
        { key: "trends", value: cats.trends, color: "bg-yellow-500", textColor: "text-yellow-600 dark:text-yellow-400", label: "Trends" },
        { key: "spikes", value: cats.spikes, color: "bg-purple-500", textColor: "text-purple-600 dark:text-purple-400", label: "Spikes" }
      ].filter((s) => s.value > 0);
      return /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1.5" }, "Penalty Breakdown (", total, " pts total)"), /* @__PURE__ */ React.createElement("div", { className: "flex h-2.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600" }, segments.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.key, className: `${s.color} transition-all`, style: { width: `${s.value / total * 100}%` }, title: `${s.label}: ${s.value} pts` }))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1 mt-1.5" }, segments.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.key, className: "flex items-center gap-1 text-[10px]" }, /* @__PURE__ */ React.createElement("span", { className: `inline-block w-2 h-2 rounded-full ${s.color}` }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, s.label), /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${s.textColor}` }, s.value)))));
    })()), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-3" }, "Weighted scoring used for recommendations: ", penaltyConfig ? `${(penaltyConfig.weight_current * 100).toFixed(0)}% current, ${(penaltyConfig.weight_24h * 100).toFixed(0)}% 24h avg, ${(penaltyConfig.weight_7d * 100).toFixed(0)}% 7-day avg` : "50% current, 30% 24h avg, 20% 7-day avg"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "CPU Score"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-blue-600 dark:text-blue-400" }, (() => {
      let current = selectedNode.cpu_percent || 0, short = selectedNode.metrics.avg_cpu || current, long = selectedNode.metrics.avg_cpu_week || short, wCurrent = penaltyConfig?.weight_current ?? 0.5, w24h = penaltyConfig?.weight_24h ?? 0.3, w7d = penaltyConfig?.weight_7d ?? 0.2;
      return (current * wCurrent + short * w24h + long * w7d).toFixed(1);
    })(), "%"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1" }, "Now: ", (selectedNode.cpu_percent || 0).toFixed(1), "% | 24h: ", (selectedNode.metrics.avg_cpu || 0).toFixed(1), "% | 7d: ", (selectedNode.metrics.avg_cpu_week || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Memory Score"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-purple-600 dark:text-purple-400" }, (() => {
      let current = selectedNode.mem_percent || 0, short = selectedNode.metrics.avg_mem || current, long = selectedNode.metrics.avg_mem_week || short, wCurrent = penaltyConfig?.weight_current ?? 0.5, w24h = penaltyConfig?.weight_24h ?? 0.3, w7d = penaltyConfig?.weight_7d ?? 0.2;
      return (current * wCurrent + short * w24h + long * w7d).toFixed(1);
    })(), "%"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1" }, "Now: ", (selectedNode.mem_percent || 0).toFixed(1), "% | 24h: ", (selectedNode.metrics.avg_mem || 0).toFixed(1), "% | 7d: ", (selectedNode.metrics.avg_mem_week || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded p-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "IOWait Score"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-semibold text-orange-600 dark:text-orange-400" }, (() => {
      let current = selectedNode.metrics.current_iowait || 0, short = selectedNode.metrics.avg_iowait || current, long = selectedNode.metrics.avg_iowait_week || short, wCurrent = penaltyConfig?.weight_current ?? 0.5, w24h = penaltyConfig?.weight_24h ?? 0.3, w7d = penaltyConfig?.weight_7d ?? 0.2;
      return (current * wCurrent + short * w24h + long * w7d).toFixed(1);
    })(), "%"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 mt-1" }, "Now: ", (selectedNode.metrics.current_iowait || 0).toFixed(1), "% | 24h: ", (selectedNode.metrics.avg_iowait || 0).toFixed(1), "% | 7d: ", (selectedNode.metrics.avg_iowait_week || 0).toFixed(1), "%"))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 text-xs text-gray-500 dark:text-gray-400 italic" }, "Suitability Rating: 0-100% score showing how well the target node fits this VM (higher is better). Based on current load, sustained averages, and historical trends. ", /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-semibold" }, "70%+"), " = Excellent, ", /* @__PURE__ */ React.createElement("span", { className: "text-yellow-600 dark:text-yellow-400 font-semibold" }, "50-69%"), " = Good, ", /* @__PURE__ */ React.createElement("span", { className: "text-orange-600 dark:text-orange-400 font-semibold" }, "30-49%"), " = Fair, ", /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400 font-semibold" }, "<30%"), " = Poor.")), maintenanceNodes.has(selectedNode.name) && /* @__PURE__ */ React.createElement("div", { className: "mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 20, className: "text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-yellow-800 dark:text-yellow-200" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold mb-1" }, "Maintenance Mode Active"), /* @__PURE__ */ React.createElement("p", null, 'This node is excluded from load balancing and migration recommendations. Use "Plan Evacuation" to migrate all VMs/CTs before performing maintenance tasks.')))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          maintenanceNodes.has(selectedNode.name) ? setMaintenanceNodes((prev) => {
            let newSet = new Set(prev);
            return newSet.delete(selectedNode.name), newSet;
          }) : setMaintenanceNodes((prev) => /* @__PURE__ */ new Set([...prev, selectedNode.name]));
        },
        className: `w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98] ${maintenanceNodes.has(selectedNode.name) ? "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white" : "bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white"}`
      },
      /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-center gap-2" }, maintenanceNodes.has(selectedNode.name) ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M5 13l4 4L19 7" })), "Exit Maintenance Mode") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16 }), "Enter Maintenance Mode"))
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          if (!canMigrate) {
            setError("Read-only API token (PVEAuditor) - Cannot perform migrations");
            return;
          }
          if ((selectedNode.guests ? Object.keys(selectedNode.guests).length : 0) === 0) {
            setError(`Node ${selectedNode.name} has no VMs/CTs to evacuate`);
            return;
          }
          setPlanningNodes((prev) => /* @__PURE__ */ new Set([...prev, selectedNode.name]));
          try {
            let planResult = await (await fetch(`${API_BASE4}/nodes/evacuate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                node: selectedNode.name,
                maintenance_nodes: Array.from(maintenanceNodes),
                confirm: !1,
                // Request plan only
                target_node: null,
                // Auto-select target
                guest_targets: {}
                // No per-guest overrides initially
              })
            })).json();
            planResult.success && planResult.plan ? (setEvacuationPlan(planResult), setPlanNode(selectedNode.name), setSelectedNode(null)) : (console.error("Plan generation failed:", planResult), setError(`Failed to generate evacuation plan: ${planResult.error}`));
          } catch (error) {
            console.error("Plan fetch error:", error), setError(`Error generating plan: ${error.message}`);
          } finally {
            setPlanningNodes((prev) => {
              let newSet = new Set(prev);
              return newSet.delete(selectedNode.name), newSet;
            });
          }
        },
        disabled: !canMigrate || evacuatingNodes.has(selectedNode.name) || planningNodes.has(selectedNode.name) || !selectedNode.guests || Object.keys(selectedNode.guests).length === 0,
        className: `w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm transform ${!canMigrate || !selectedNode.guests || Object.keys(selectedNode.guests).length === 0 ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed opacity-60" : planningNodes.has(selectedNode.name) || evacuatingNodes.has(selectedNode.name) ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white cursor-wait" : "bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"}`,
        title: canMigrate ? !selectedNode.guests || Object.keys(selectedNode.guests).length === 0 ? "No guests to evacuate" : "" : "Read-only API token - Cannot migrate"
      },
      canMigrate ? planningNodes.has(selectedNode.name) ? /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(Loader, { className: "animate-spin", size: 16 }), "Planning Migration...") : evacuatingNodes.has(selectedNode.name) ? /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(Loader, { className: "animate-spin", size: 16 }), "Evacuating...") : !selectedNode.guests || Object.keys(selectedNode.guests).length === 0 ? /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement("svg", { className: "w-4 h-4", fill: "none", stroke: "currentColor", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" })), "No Guests") : /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(MoveRight, { size: 16 }), "Plan Evacuation") : /* @__PURE__ */ React.createElement("span", { className: "flex items-center justify-center gap-2" }, /* @__PURE__ */ React.createElement(Lock, { size: 16 }), "Read-only Mode")
    ))))) : null;
  }

  // src/components/dashboard/GuestDetailsModal.jsx
  function GuestDetailsModal({
    selectedGuestDetails,
    setSelectedGuestDetails,
    generateSparkline,
    guestModalCollapsed,
    setGuestModalCollapsed,
    guestMigrationOptions,
    loadingGuestOptions,
    fetchGuestMigrationOptions: fetchGuestMigrationOptions2,
    canMigrate,
    setSelectedGuest,
    setMigrationTarget,
    setShowMigrationDialog
  }) {
    return selectedGuestDetails ? /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-[60] sm:p-4", onClick: () => setSelectedGuestDetails(null) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-t-xl sm:rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] sm:max-h-[90vh] flex flex-col", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: `p-1.5 rounded-lg shrink-0 ${selectedGuestDetails.type === "qemu" ? "bg-purple-500" : "bg-green-500"}` }, selectedGuestDetails.type === "qemu" ? /* @__PURE__ */ React.createElement(HardDrive, { size: 20, className: "text-white" }) : /* @__PURE__ */ React.createElement(Package, { size: 20, className: "text-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base sm:text-lg font-bold text-gray-900 dark:text-white truncate" }, selectedGuestDetails.name || `Guest ${selectedGuestDetails.vmid}`), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400" }, selectedGuestDetails.type === "qemu" ? "VM" : "CT", " #", selectedGuestDetails.vmid))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setSelectedGuestDetails(null),
        className: "ml-2 shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700"
      },
      /* @__PURE__ */ React.createElement(X, { size: 20 })
    )), /* @__PURE__ */ React.createElement("div", { className: "p-4 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3 pb-3 border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: `inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${selectedGuestDetails.status === "running" ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"}` }, selectedGuestDetails.status === "running" ? /* @__PURE__ */ React.createElement(Activity, { size: 12 }) : /* @__PURE__ */ React.createElement(AlertCircle, { size: 12 }), selectedGuestDetails.status), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, "on"), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-medium text-gray-900 dark:text-white" }, selectedGuestDetails.currentNode))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded p-2 border border-blue-200 dark:border-blue-800" }, /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-30", preserveAspectRatio: "none", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement(
      "polyline",
      {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        className: "text-blue-600 dark:text-blue-400",
        points: generateSparkline(selectedGuestDetails.cpu_current || 0, 100, 30, 0.3)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] uppercase tracking-wide text-blue-600 dark:text-blue-400 font-medium mb-0.5" }, "CPU"), /* @__PURE__ */ React.createElement("div", { className: "text-xl font-bold text-gray-900 dark:text-white" }, (selectedGuestDetails.cpu_current || 0).toFixed(1), "%"), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-500 dark:text-gray-400" }, selectedGuestDetails.cpu_cores || 0, " cores"))), /* @__PURE__ */ React.createElement("div", { className: "relative overflow-hidden bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded p-2 border border-purple-200 dark:border-purple-800" }, /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-30", preserveAspectRatio: "none", viewBox: "0 0 100 100" }, /* @__PURE__ */ React.createElement(
      "polyline",
      {
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "2.5",
        className: "text-purple-600 dark:text-purple-400",
        points: generateSparkline(selectedGuestDetails.mem_max_gb > 0 ? selectedGuestDetails.mem_used_gb / selectedGuestDetails.mem_max_gb * 100 : 0, 100, 30, 0.25)
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "relative z-10" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] uppercase tracking-wide text-purple-600 dark:text-purple-400 font-medium mb-0.5" }, "Memory"), /* @__PURE__ */ React.createElement("div", { className: "text-xl font-bold text-gray-900 dark:text-white" }, selectedGuestDetails.mem_max_gb > 0 ? (selectedGuestDetails.mem_used_gb / selectedGuestDetails.mem_max_gb * 100).toFixed(1) : 0, "%"), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-500 dark:text-gray-400" }, (selectedGuestDetails.mem_used_gb || 0).toFixed(1), " / ", (selectedGuestDetails.mem_max_gb || 0).toFixed(1), " GB")))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-green-50 dark:bg-green-900/20 rounded p-2 border border-green-200 dark:border-green-800" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] uppercase tracking-wide text-green-600 dark:text-green-400 font-medium mb-1" }, "Disk I/O"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-600 dark:text-gray-400" }, "Read"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-gray-900 dark:text-white" }, ((selectedGuestDetails.disk_read_bps || 0) / (1024 * 1024)).toFixed(1), " MB/s")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-600 dark:text-gray-400" }, "Write"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-gray-900 dark:text-white" }, ((selectedGuestDetails.disk_write_bps || 0) / (1024 * 1024)).toFixed(1), " MB/s")))), /* @__PURE__ */ React.createElement("div", { className: "bg-cyan-50 dark:bg-cyan-900/20 rounded p-2 border border-cyan-200 dark:border-cyan-800" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] uppercase tracking-wide text-cyan-600 dark:text-cyan-400 font-medium mb-1" }, "Network I/O"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-600 dark:text-gray-400" }, "In"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-gray-900 dark:text-white" }, ((selectedGuestDetails.net_in_bps || 0) / (1024 * 1024)).toFixed(1), " MB/s")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-600 dark:text-gray-400" }, "Out"), /* @__PURE__ */ React.createElement("span", { className: "text-sm font-bold text-gray-900 dark:text-white" }, ((selectedGuestDetails.net_out_bps || 0) / (1024 * 1024)).toFixed(1), " MB/s"))))), selectedGuestDetails.tags && selectedGuestDetails.tags.all_tags && selectedGuestDetails.tags.all_tags.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-200 dark:border-gray-700 pt-2 mt-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 font-medium mb-1.5" }, "Tags"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1.5" }, selectedGuestDetails.tags.all_tags.map((tag, idx) => /* @__PURE__ */ React.createElement("span", { key: idx, className: "px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs" }, tag)))), selectedGuestDetails.type === "CT" && selectedGuestDetails.mount_points && selectedGuestDetails.mount_points.has_mount_points && /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-200 dark:border-gray-700 pt-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setGuestModalCollapsed((prev) => ({
          ...prev,
          mountPoints: !prev.mountPoints
        })),
        className: "flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Folder, { size: 16, className: `${selectedGuestDetails.mount_points.has_unshared_bind_mount ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}` }), /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-900 dark:text-white" }, "Mount Points (", selectedGuestDetails.mount_points.mount_count, ")")),
      guestModalCollapsed.mountPoints ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: "text-gray-500" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 16, className: "text-gray-500" })
    ), !guestModalCollapsed.mountPoints && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, selectedGuestDetails.mount_points.mount_points && selectedGuestDetails.mount_points.mount_points.map((mp, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: `p-3 rounded-lg border ${mp.is_bind_mount && !mp.is_shared ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700" : mp.is_bind_mount && mp.is_shared ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono text-sm font-semibold text-gray-900 dark:text-white" }, mp.mount_path), mp.is_bind_mount && mp.is_shared && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded" }, "SHARED"), mp.is_bind_mount && !mp.is_shared && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-orange-500 text-white text-[10px] font-bold rounded" }, "UNSHARED")), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Source:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, mp.source)), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mt-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Type:"), " ", mp.is_bind_mount ? "Bind Mount" : "Storage Mount"))), mp.is_bind_mount && !mp.is_shared && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-orange-200 dark:border-orange-800" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-orange-700 dark:text-orange-300 font-medium" }, "\u26A0\uFE0F Migration requires --restart --force and manual path verification on target node")), mp.is_bind_mount && mp.is_shared && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-green-200 dark:border-green-800" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-green-700 dark:text-green-300 font-medium" }, "\u2713 Can be migrated (ensure path exists on target node)"))))), selectedGuestDetails.mount_points.has_unshared_bind_mount ? /* @__PURE__ */ React.createElement("div", { className: "mt-3 p-3 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-orange-800 dark:text-orange-200" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold mb-1" }, "Manual Migration Required"), /* @__PURE__ */ React.createElement("p", null, "This container has unshared bind mounts that require manual intervention. Use ", /* @__PURE__ */ React.createElement("span", { className: "font-mono bg-orange-200 dark:bg-orange-800 px-1" }, "pct migrate ", selectedGuestDetails.vmid, " <target> --restart --force"), " and verify paths exist on target node.")))) : selectedGuestDetails.mount_points.has_shared_mount ? /* @__PURE__ */ React.createElement("div", { className: "mt-3 p-3 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 16, className: "text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-green-800 dark:text-green-200" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold mb-1" }, "Safe to Migrate"), /* @__PURE__ */ React.createElement("p", null, "All bind mounts are marked as shared. Ensure these paths exist on the target node before migration.")))) : null)), selectedGuestDetails.local_disks && selectedGuestDetails.local_disks.is_pinned && /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-200 dark:border-gray-700 pt-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setGuestModalCollapsed((prev) => ({
          ...prev,
          passthroughDisks: !prev.passthroughDisks
        })),
        className: "flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "text-red-600 dark:text-red-400" }), /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-900 dark:text-white" }, "Cannot Migrate - ", selectedGuestDetails.local_disks.pinned_reason)),
      guestModalCollapsed.passthroughDisks ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: "text-gray-500" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 16, className: "text-gray-500" })
    ), !guestModalCollapsed.passthroughDisks && /* @__PURE__ */ React.createElement(React.Fragment, null, selectedGuestDetails.local_disks.passthrough_disks && selectedGuestDetails.local_disks.passthrough_disks.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("h5", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2" }, "Passthrough Disks (", selectedGuestDetails.local_disks.passthrough_count, ")"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, selectedGuestDetails.local_disks.passthrough_disks.map((disk, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "p-3 rounded-lg border bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono text-sm font-semibold text-gray-900 dark:text-white" }, disk.key), /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded" }, "HARDWARE PASSTHROUGH")), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Device:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-mono text-[11px]" }, disk.device)))), /* @__PURE__ */ React.createElement("div", { className: "mt-2 pt-2 border-t border-red-200 dark:border-red-800" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs text-red-700 dark:text-red-300 font-medium" }, "\u26A0\uFE0F This disk is physically attached to the current node's hardware. Cannot be migrated.")))))), /* @__PURE__ */ React.createElement("div", { className: "mt-3 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-red-800 dark:text-red-200" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold mb-1" }, "Migration Blocked"), /* @__PURE__ */ React.createElement("p", null, "This ", selectedGuestDetails.type, " has ", selectedGuestDetails.local_disks.total_pinned_disks, " disk(s) that prevent automatic migration. Manual intervention required.")))))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-200 dark:border-gray-700 pt-3 mt-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setGuestModalCollapsed((prev) => ({ ...prev, migrationOptions: !prev.migrationOptions })), !guestMigrationOptions && fetchGuestMigrationOptions2 && fetchGuestMigrationOptions2(selectedGuestDetails.vmid);
        },
        className: "flex items-center justify-between w-full mb-2 hover:bg-gray-50 dark:hover:bg-gray-700/50 p-2 rounded transition-colors"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(BarChart2, { size: 16, className: "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-900 dark:text-white" }, "Migration Options"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Score comparison across all nodes")),
      guestModalCollapsed.migrationOptions ? /* @__PURE__ */ React.createElement(ChevronUp, { size: 16, className: "text-gray-500" }) : /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: "text-gray-500" })
    ), guestModalCollapsed.migrationOptions && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, loadingGuestOptions ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center p-4 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin mr-2" }), " Loading migration options...") : guestMigrationOptions?.options ? /* @__PURE__ */ React.createElement(React.Fragment, null, guestMigrationOptions.options.map((opt) => {
      let maxScore = Math.max(...guestMigrationOptions.options.filter((o) => !o.disqualified).map((o) => o.score), 1), barWidth = opt.disqualified ? 100 : Math.min(100, opt.score / maxScore * 100);
      return /* @__PURE__ */ React.createElement("div", { key: opt.node, className: `p-2 rounded border text-xs ${opt.is_current ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-900/20" : opt.disqualified ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 opacity-60" : opt.suitable ? "border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-900/10" : "border-gray-200 dark:border-gray-700"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white flex items-center gap-1" }, opt.node, !opt.disqualified && opt.trend_analysis && (() => {
        let dir = opt.trend_analysis.cpu_direction;
        return dir === "sustained_increase" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-red-500", title: `CPU ${opt.trend_analysis.cpu_rate_per_day > 0 ? "+" : ""}${opt.trend_analysis.cpu_rate_per_day?.toFixed(1)}%/day` }) : dir === "rising" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-orange-400", title: "CPU rising" }) : dir === "falling" || dir === "sustained_decrease" ? /* @__PURE__ */ React.createElement(TrendingDown, { size: 10, className: "text-green-500", title: "CPU falling" }) : /* @__PURE__ */ React.createElement(Minus, { size: 10, className: "text-gray-400", title: "CPU stable" });
      })()), opt.is_current && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded" }, "CURRENT"), opt.disqualified && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-gray-400 text-white text-[9px] font-bold rounded" }, "DISQUALIFIED"), !opt.is_current && !opt.disqualified && opt.improvement > 0 && /* @__PURE__ */ React.createElement("span", { className: `px-1.5 py-0.5 text-[9px] font-bold rounded ${opt.improvement >= 30 ? "bg-green-500 text-white" : opt.improvement >= 15 ? "bg-yellow-500 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300"}` }, "+", opt.improvement.toFixed(0), " pts"), !opt.disqualified && opt.trend_analysis?.stability_score != null && (() => {
        let s = opt.trend_analysis.stability_score, label = s >= 80 ? "Stable" : s >= 60 ? "Moderate" : s >= 40 ? "Variable" : "Volatile", color = s >= 80 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : s >= 60 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : s >= 40 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300";
        return /* @__PURE__ */ React.createElement("span", { className: `px-1 py-0 rounded text-[9px] font-medium ${color}`, title: `Stability: ${s}/100` }, label);
      })(), !opt.disqualified && opt.overcommit_ratio > 0.85 && (() => {
        let oc = opt.overcommit_ratio, color = oc > 1.2 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : oc > 1 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300";
        return /* @__PURE__ */ React.createElement("span", { className: `px-1 py-0 rounded text-[9px] font-medium ${color}`, title: `Memory overcommit: ${(oc * 100).toFixed(0)}% (${opt.committed_mem_gb?.toFixed(1) || "?"}GB committed)` }, "OC ", (oc * 100).toFixed(0), "%");
      })()), /* @__PURE__ */ React.createElement("div", { className: "text-right" }, opt.disqualified ? /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, opt.reason) : /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${opt.suitability_rating >= 70 ? "text-green-600 dark:text-green-400" : opt.suitability_rating >= 50 ? "text-yellow-600 dark:text-yellow-400" : opt.suitability_rating >= 30 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"}` }, opt.suitability_rating, "%"))), !opt.disqualified && /* @__PURE__ */ React.createElement("div", { className: "flex h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: `rounded-full transition-all ${opt.suitability_rating >= 70 ? "bg-green-500" : opt.suitability_rating >= 50 ? "bg-yellow-500" : opt.suitability_rating >= 30 ? "bg-orange-500" : "bg-red-500"}`, style: { width: `${opt.suitability_rating}%` } })));
    })) : /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 p-2" }, "No migration data available")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setSelectedGuestDetails(null),
        className: "px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(X, { size: 14 }),
      " Close"
    ), canMigrate && selectedGuestDetails.status === "running" && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setSelectedGuest(selectedGuestDetails), setMigrationTarget(""), setShowMigrationDialog(!0), setSelectedGuestDetails(null);
        },
        className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium flex items-center gap-2"
      },
      /* @__PURE__ */ React.createElement(MoveRight, { size: 16 }),
      "Migrate"
    )))) : null;
  }

  // src/components/dashboard/EvacuationModals.jsx
  function EvacuationModals({
    evacuationPlan,
    setEvacuationPlan,
    planNode,
    setPlanNode,
    guestTargets,
    setGuestTargets,
    guestActions,
    setGuestActions,
    showConfirmModal,
    setShowConfirmModal,
    setEvacuatingNodes,
    maintenanceNodes,
    fetchGuestLocations: fetchGuestLocations2,
    setError,
    API_BASE: API_BASE4
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, evacuationPlan && planNode && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", onClick: () => {
      setEvacuationPlan(null), setPlanNode(null), setGuestTargets({});
    } }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg sm:text-xl font-bold text-gray-900 dark:text-white" }, "Evacuation Plan for ", evacuationPlan.source_node), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setEvacuationPlan(null), setPlanNode(null), setGuestTargets({});
        },
        className: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      },
      /* @__PURE__ */ React.createElement(X, { size: 24 })
    )), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6 overflow-y-auto max-h-[calc(90vh-200px)]" }, evacuationPlan.will_skip > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-yellow-800 dark:text-yellow-200" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, evacuationPlan.will_skip), ' guest(s) cannot be migrated. Reasons may include: missing storage on target nodes, errors, or "ignore" tag. These are shown in yellow below.')), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full text-sm" }, /* @__PURE__ */ React.createElement("thead", { className: "bg-gray-50 dark:bg-gray-700" }, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "VM/CT"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "Name"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "Type"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "Storage"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "Status"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "Target"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "Will Restart?"), /* @__PURE__ */ React.createElement("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase" }, "Action"))), /* @__PURE__ */ React.createElement("tbody", { className: "divide-y divide-gray-200 dark:divide-gray-700" }, evacuationPlan.plan.map((item) => /* @__PURE__ */ React.createElement("tr", { key: item.vmid, className: item.skipped ? "bg-yellow-50 dark:bg-yellow-900/10" : "" }, /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 font-medium text-gray-900 dark:text-white" }, item.vmid), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3 text-gray-700 dark:text-gray-300" }, item.name), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 text-xs rounded ${item.type === "qemu" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" : item.type === "lxc" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300" : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"}` }, item.type === "qemu" ? "VM" : item.type === "lxc" ? "CT" : "Unknown")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, item.storage_volumes && item.storage_volumes.length > 0 ? /* @__PURE__ */ React.createElement("span", { className: `text-xs ${item.storage_compatible ? "text-gray-600 dark:text-gray-400" : "text-red-600 dark:text-red-400 font-semibold"}` }, item.storage_volumes.join(", ")) : /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 dark:text-gray-500 italic" }, "none")), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 text-xs rounded ${item.status === "running" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" : item.status === "stopped" ? "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300" : "bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300"}` }, item.status)), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, item.skipped ? /* @__PURE__ */ React.createElement("span", { className: "text-yellow-600 dark:text-yellow-400 text-xs italic" }, item.skip_reason) : /* @__PURE__ */ React.createElement(
      "select",
      {
        value: guestTargets[item.vmid] || item.target,
        onChange: (e) => setGuestTargets({ ...guestTargets, [item.vmid]: e.target.value }),
        className: "text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white font-medium"
      },
      evacuationPlan.available_targets.map((target) => /* @__PURE__ */ React.createElement("option", { key: target, value: target }, target))
    )), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, !item.skipped && (item.will_restart ? /* @__PURE__ */ React.createElement("span", { className: "text-orange-600 dark:text-orange-400 font-medium" }, "Yes") : /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400" }, "No"))), /* @__PURE__ */ React.createElement("td", { className: "px-4 py-3" }, item.skipped ? /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 dark:text-gray-500 italic" }, "N/A") : /* @__PURE__ */ React.createElement(
      "select",
      {
        value: guestActions[item.vmid] || "migrate",
        onChange: (e) => setGuestActions({ ...guestActions, [item.vmid]: e.target.value }),
        className: "text-sm px-2 py-1 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "migrate" }, "Migrate"),
      /* @__PURE__ */ React.createElement("option", { value: "ignore" }, "Ignore"),
      /* @__PURE__ */ React.createElement("option", { value: "poweroff" }, "Power Off")
    ))))))), /* @__PURE__ */ React.createElement("div", { className: "mt-6 bg-blue-50 dark:bg-blue-900/20 p-4 rounded" }, /* @__PURE__ */ React.createElement("h4", { className: "font-semibold text-blue-900 dark:text-blue-100 mb-2" }, "Important Notes:"), /* @__PURE__ */ React.createElement("ul", { className: "text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside" }, /* @__PURE__ */ React.createElement("li", null, "Running VMs will use live migration (no downtime)"), /* @__PURE__ */ React.createElement("li", null, "Running containers will restart during migration (brief downtime)"), /* @__PURE__ */ React.createElement("li", null, "Stopped VMs/CTs will be moved without starting"), /* @__PURE__ */ React.createElement("li", null, "Migrations are performed one at a time to avoid overloading hosts"), /* @__PURE__ */ React.createElement("li", null, "Available target nodes: ", evacuationPlan.available_targets.join(", "))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setEvacuationPlan(null), setPlanNode(null), setGuestActions({}), setGuestTargets({});
        },
        className: "flex items-center justify-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded font-medium"
      },
      /* @__PURE__ */ React.createElement(X, { size: 16, className: "sm:hidden" }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Cancel")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowConfirmModal(!0),
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded font-medium"
      },
      /* @__PURE__ */ React.createElement(Check, { size: 16, className: "sm:hidden" }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Review & Confirm")
    )))), showConfirmModal && evacuationPlan && planNode && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", onClick: () => setShowConfirmModal(!1) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg sm:text-xl font-semibold text-gray-900 dark:text-white" }, "Confirm Evacuation"), /* @__PURE__ */ React.createElement("button", { onClick: () => setShowConfirmModal(!1) }, /* @__PURE__ */ React.createElement(XCircle, { size: 24 }))), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6" }, (() => {
      let toMigrate = [], toIgnore = [], toPowerOff = [];
      return evacuationPlan.plan.forEach((item) => {
        if (item.skipped) return;
        let action = guestActions[item.vmid] || "migrate";
        action === "migrate" ? toMigrate.push(item) : action === "ignore" ? toIgnore.push(item) : action === "poweroff" && toPowerOff.push(item);
      }), /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, toMigrate.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-lg font-semibold text-blue-600 mb-2" }, "Migrate (", toMigrate.length, ")"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, toMigrate.map((item) => /* @__PURE__ */ React.createElement("div", { key: item.vmid, className: "flex justify-between p-2 bg-blue-50 dark:bg-blue-900/20 rounded" }, /* @__PURE__ */ React.createElement("span", null, item.vmid, " - ", item.name), /* @__PURE__ */ React.createElement("span", null, "\u2192 ", item.target))))), toIgnore.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-lg font-semibold text-gray-600 mb-2" }, "Ignore (", toIgnore.length, ")"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600" }, toIgnore.map((item) => item.vmid).join(", "))), toPowerOff.length > 0 && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h4", { className: "text-lg font-semibold text-red-600 mb-2" }, "Power Off (", toPowerOff.length, ")"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600" }, toPowerOff.map((item) => item.vmid).join(", "))));
    })()), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowConfirmModal(!1),
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded"
      },
      /* @__PURE__ */ React.createElement(X, { size: 16, className: "sm:hidden" }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Cancel")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          setShowConfirmModal(!1), setEvacuatingNodes((prev) => /* @__PURE__ */ new Set([...prev, planNode]));
          try {
            let result = await (await fetch(`${API_BASE4}/nodes/evacuate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                node: planNode,
                maintenance_nodes: Array.from(maintenanceNodes),
                confirm: !0,
                guest_actions: guestActions,
                guest_targets: guestTargets
                // Include per-guest target overrides
              })
            })).json();
            if (result.success)
              setEvacuationPlan(null), setPlanNode(null), setGuestActions({}), setGuestTargets({}), fetchGuestLocations2();
            else
              throw new Error(result.error || "Failed to start evacuation");
          } catch (error) {
            console.error("Evacuation error:", error), setError(`Error: ${error.message}`);
          } finally {
            setEvacuatingNodes((prev) => {
              let newSet = new Set(prev);
              return newSet.delete(planNode), newSet;
            });
          }
        },
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded"
      },
      /* @__PURE__ */ React.createElement(AlertTriangle, { size: 14 }),
      " Confirm Evacuation"
    )))));
  }

  // src/components/dashboard/MigrationModals.jsx
  init_constants();
  function MigrationModals({
    showMigrationDialog,
    setShowMigrationDialog,
    selectedGuest,
    canMigrate,
    migrationTarget,
    setMigrationTarget,
    data,
    setData,
    executeMigration,
    showTagModal,
    setShowTagModal,
    tagModalGuest,
    setTagModalGuest,
    newTag,
    setNewTag,
    setError,
    handleAddTag,
    confirmRemoveTag,
    setConfirmRemoveTag,
    confirmAndRemoveTag,
    confirmMigration,
    setConfirmMigration,
    confirmAndMigrate,
    showBatchConfirmation,
    setShowBatchConfirmation,
    pendingBatchMigrations,
    collapsedSections,
    setCollapsedSections,
    confirmBatchMigration,
    cancelMigrationModal,
    setCancelMigrationModal,
    cancellingMigration,
    setCancellingMigration,
    fetchAutomationStatus: fetchAutomationStatus2
  }) {
    return /* @__PURE__ */ React.createElement(React.Fragment, null, showMigrationDialog && selectedGuest && canMigrate && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", onClick: () => setShowMigrationDialog(!1) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md" }, /* @__PURE__ */ React.createElement(Activity, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" }, "Migrate Guest"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5" }, "Move VM or container"))), /* @__PURE__ */ React.createElement("div", { className: "mb-4 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("strong", null, "Guest:"), " ", selectedGuest.name || `Guest ${selectedGuest.vmid}`, " (", selectedGuest.vmid, ")"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("strong", null, "Type:"), " ", (selectedGuest.type || "").toUpperCase() === "VM" || (selectedGuest.type || "").toUpperCase() === "QEMU" ? "VM" : "Container"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("strong", null, "Current Node:"), " ", selectedGuest.currentNode)), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Target Node"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: migrationTarget,
        onChange: (e) => setMigrationTarget(e.target.value),
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Select target node..."),
      data && data.nodes && Object.values(data.nodes).filter((node) => node.name !== selectedGuest.currentNode && node.status === "online").map((node) => /* @__PURE__ */ React.createElement("option", { key: node.name, value: node.name }, node.name))
    )), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowMigrationDialog(!1),
        className: "px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(X, { size: 14 }),
      " Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          migrationTarget && (executeMigration({
            vmid: selectedGuest.vmid,
            source_node: selectedGuest.currentNode,
            target_node: migrationTarget,
            type: selectedGuest.type,
            name: selectedGuest.name
          }), setShowMigrationDialog(!1));
        },
        disabled: !migrationTarget,
        className: "px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
      },
      /* @__PURE__ */ React.createElement(MoveRight, { size: 14 }),
      " Migrate"
    )))), showTagModal && tagModalGuest && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", onClick: () => {
      setShowTagModal(!1), setNewTag(""), setTagModalGuest(null);
    } }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg sm:text-xl font-semibold text-gray-900 dark:text-white" }, "Add Tag"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setShowTagModal(!1), setNewTag(""), setTagModalGuest(null);
        },
        className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      },
      /* @__PURE__ */ React.createElement(XCircle, { size: 24 })
    )), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mb-2" }, "Guest: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, "[", tagModalGuest.type, " ", tagModalGuest.vmid, "] ", tagModalGuest.name)), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Node: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, tagModalGuest.node))), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Quick Add"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, !tagModalGuest.tags.has_ignore && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          try {
            let vmid = tagModalGuest.vmid, result = await (await fetch(`${API_BASE}/guests/${vmid}/tags`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tag: "ignore" })
            })).json();
            if (result.success) {
              setShowTagModal(!1), setNewTag(""), setTagModalGuest(null);
              let refreshResult = await (await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                method: "POST"
              })).json();
              refreshResult.success && data && setData({
                ...data,
                guests: {
                  ...data.guests,
                  [vmid]: {
                    ...data.guests[vmid],
                    tags: refreshResult.tags
                  }
                }
              });
            } else
              setError(`Error: ${result.error}`);
          } catch (error) {
            setError(`Error adding tag: ${error.message}`);
          }
        },
        className: "px-3 py-1.5 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 rounded hover:bg-yellow-200 dark:hover:bg-yellow-900/50"
      },
      "+ ignore"
    ), !tagModalGuest.tags.all_tags?.includes("auto_migrate_ok") && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          try {
            let vmid = tagModalGuest.vmid, result = await (await fetch(`${API_BASE}/guests/${vmid}/tags`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tag: "auto_migrate_ok" })
            })).json();
            if (result.success) {
              setShowTagModal(!1), setNewTag(""), setTagModalGuest(null);
              let refreshResult = await (await fetch(`${API_BASE}/guests/${vmid}/tags/refresh`, {
                method: "POST"
              })).json();
              refreshResult.success && data && setData({
                ...data,
                guests: {
                  ...data.guests,
                  [vmid]: {
                    ...data.guests[vmid],
                    tags: refreshResult.tags
                  }
                }
              });
            } else
              setError(`Error: ${result.error}`);
          } catch (error) {
            setError(`Error adding tag: ${error.message}`);
          }
        },
        className: "px-3 py-1.5 text-sm bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700 rounded hover:bg-green-200 dark:hover:bg-green-900/50"
      },
      "+ auto_migrate_ok"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setNewTag("exclude_"),
        className: "px-3 py-1.5 text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700 rounded hover:bg-blue-200 dark:hover:bg-blue-900/50"
      },
      "+ exclude_..."
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setNewTag("affinity_"),
        className: "px-3 py-1.5 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700 rounded hover:bg-purple-200 dark:hover:bg-purple-900/50"
      },
      "+ affinity_..."
    ))), /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Or Enter Custom Tag"), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        value: newTag,
        onChange: (e) => setNewTag(e.target.value),
        onKeyPress: (e) => {
          e.key === "Enter" && handleAddTag();
        },
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500",
        placeholder: "e.g., exclude_database, affinity_web"
      }
    ), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400 mt-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, "ignore"), " = never migrate | ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, "exclude_[name]"), " = anti-affinity | ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, "affinity_[name]"), " = keep together")), tagModalGuest.tags.all_tags.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2" }, "Current Tags"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, tagModalGuest.tags.all_tags.map((tag) => /* @__PURE__ */ React.createElement("span", { key: tag, className: "text-xs px-2 py-1 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded font-medium" }, tag))))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setShowTagModal(!1), setNewTag(""), setTagModalGuest(null);
        },
        className: "flex items-center justify-center gap-1.5 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
      },
      /* @__PURE__ */ React.createElement(X, { size: 14 }),
      " Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleAddTag,
        disabled: !newTag.trim(),
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
      },
      /* @__PURE__ */ React.createElement(Plus, { size: 14 }),
      " Add Tag"
    )))), confirmRemoveTag && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", onClick: () => setConfirmRemoveTag(null) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg sm:text-xl font-semibold text-gray-900 dark:text-white" }, "Confirm Tag Removal"), /* @__PURE__ */ React.createElement("button", { onClick: () => setConfirmRemoveTag(null) }, /* @__PURE__ */ React.createElement(XCircle, { size: 24, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" }))), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-gray-700 dark:text-gray-300" }, "Remove tag ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold text-red-600 dark:text-red-400" }, '"', confirmRemoveTag.tag, '"'), " from ", confirmRemoveTag.guest.type, " ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, confirmRemoveTag.guest.vmid), " (", confirmRemoveTag.guest.name, ")?")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmRemoveTag(null),
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      },
      /* @__PURE__ */ React.createElement(X, { size: 14 }),
      " Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: confirmAndRemoveTag,
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
      },
      /* @__PURE__ */ React.createElement(Trash, { size: 14 }),
      " Remove Tag"
    )))), confirmMigration && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", onClick: () => setConfirmMigration(null) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg sm:text-xl font-semibold text-gray-900 dark:text-white" }, "Confirm Migration"), /* @__PURE__ */ React.createElement("button", { onClick: () => setConfirmMigration(null) }, /* @__PURE__ */ React.createElement(XCircle, { size: 24, className: "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" }))), /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-gray-700 dark:text-gray-300 mb-4" }, "Start migration for ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-blue-600 dark:text-blue-400" }, confirmMigration.type, " ", confirmMigration.vmid), " (", confirmMigration.name, ")?"), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-2 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "From:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-red-600 dark:text-red-400" }, confirmMigration.source_node)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "To:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-green-600 dark:text-green-400" }, confirmMigration.target_node)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Memory:"), /* @__PURE__ */ React.createElement("span", { className: "font-mono text-gray-900 dark:text-gray-100" }, (confirmMigration.mem_gb || 0).toFixed(1), " GB")), confirmMigration.score_improvement !== void 0 && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Improvement:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-green-600 dark:text-green-400" }, "+", confirmMigration.score_improvement.toFixed(1)))), confirmMigration.reason && /* @__PURE__ */ React.createElement("div", { className: "mt-4 text-xs text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Reason:"), " ", confirmMigration.reason)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end gap-3 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setConfirmMigration(null),
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      },
      /* @__PURE__ */ React.createElement(X, { size: 14 }),
      " Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: confirmAndMigrate,
        className: "px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-2"
      },
      /* @__PURE__ */ React.createElement(Play, { size: 16 }),
      "Start Migration"
    )))), showBatchConfirmation && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" }, /* @__PURE__ */ React.createElement("div", { className: "border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 24, className: "text-yellow-500" }), "Confirm Batch Migration"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowBatchConfirmation(!1),
        className: "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      },
      /* @__PURE__ */ React.createElement(X, { size: 24 })
    )), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-2" }, "Review the migration plan below. Migrations will be executed ", /* @__PURE__ */ React.createElement("strong", null, "sequentially"), " (one at a time).")), /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto px-4 sm:px-6 py-4" }, /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-300 dark:border-blue-700 rounded-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-blue-900 dark:text-blue-200" }, /* @__PURE__ */ React.createElement(Info, { size: 20 }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "font-semibold" }, "Total Migrations: ", pendingBatchMigrations.length), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-700 dark:text-blue-300 mt-1" }, "Each migration will be tracked with real-time progress. You can monitor the status panel for updates.")))), /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(List, { size: 18 }), "Migration Tasks"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, pendingBatchMigrations.map((rec, idx) => {
      let sourceNode = data?.nodes?.[rec.source_node], targetNode = data?.nodes?.[rec.target_node];
      return /* @__PURE__ */ React.createElement("div", { key: idx, className: "border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-gray-50 dark:bg-gray-900/50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-mono bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300" }, "#", idx + 1), /* @__PURE__ */ React.createElement("span", { className: "font-bold text-gray-900 dark:text-white" }, "[", rec.type, " ", rec.vmid, "] ", rec.name), rec.priority && /* @__PURE__ */ React.createElement("span", { className: `text-xs px-2 py-0.5 rounded font-semibold ${rec.priority === "high" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : rec.priority === "medium" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"}` }, rec.priority)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2 text-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Source Node"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-red-600 dark:text-red-400 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 }), rec.source_node), sourceNode && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mt-1" }, "CPU: ", sourceNode.cpu_percent?.toFixed(1), "% | RAM: ", sourceNode.mem_percent?.toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 mb-1" }, "Target Node"), /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-green-600 dark:text-green-400 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 }), rec.target_node), targetNode && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mt-1" }, "CPU: ", targetNode.cpu_percent?.toFixed(1), "% | RAM: ", targetNode.mem_percent?.toFixed(1), "%"))), rec.reasoning && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Reason:"), " ", rec.reasoning), /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: (e) => {
            e.stopPropagation();
            let commandKey = `ai-command-${idx}`;
            setCollapsedSections((prev) => ({
              ...prev,
              [commandKey]: !prev[commandKey]
            }));
          },
          className: "text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
        },
        /* @__PURE__ */ React.createElement(Terminal, { size: 12 }),
        collapsedSections[`ai-command-${idx}`] ? "Show" : "Hide",
        " command"
      ), !collapsedSections[`ai-command-${idx}`] && /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: (e) => {
            e.stopPropagation(), navigator.clipboard.writeText(rec.command);
            let btn = e.currentTarget, originalText = btn.textContent;
            btn.textContent = "Copied!", btn.classList.add("bg-green-100", "dark:bg-green-900"), setTimeout(() => {
              btn.textContent = originalText, btn.classList.remove("bg-green-100", "dark:bg-green-900");
            }, 1e3);
          },
          className: "text-xs font-mono bg-gray-200 dark:bg-gray-700 p-2 rounded mt-1 text-gray-700 dark:text-gray-300 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all",
          title: "Click to copy"
        },
        rec.command
      )))));
    }))), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 bg-gray-50 dark:bg-gray-900/50" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "inline mr-1 text-yellow-500" }), "Migrations will execute one at a time to ensure system stability"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowBatchConfirmation(!1),
        className: "px-6 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 flex items-center gap-2"
      },
      /* @__PURE__ */ React.createElement(X, { size: 16 }),
      "Cancel"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: confirmBatchMigration,
        className: "px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-2 font-semibold"
      },
      /* @__PURE__ */ React.createElement(CheckCircle, { size: 16 }),
      "Start ",
      pendingBatchMigrations.length,
      " Migration",
      pendingBatchMigrations.length !== 1 ? "s" : ""
    )))))), cancelMigrationModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", onClick: () => setCancelMigrationModal(null) }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg p-4 sm:p-6 max-w-md w-full shadow-xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto", onClick: (e) => e.stopPropagation() }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-red-100 dark:bg-red-900/30 rounded-lg" }, /* @__PURE__ */ React.createElement(AlertTriangle, { className: "text-red-600 dark:text-red-400", size: 24 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-gray-900 dark:text-gray-100" }, "Cancel Migration?"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1" }, "This will stop the migration in progress"))), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 mb-6 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300" }, cancelMigrationModal.name), /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs font-semibold" }, cancelMigrationModal.type === "qemu" ? "VM" : "CT", " ", cancelMigrationModal.vmid)), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, cancelMigrationModal.source_node), /* @__PURE__ */ React.createElement(ArrowRight, { size: 14 }), /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, cancelMigrationModal.target_node)), cancelMigrationModal.progress_info && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-500" }, "Progress: ", cancelMigrationModal.progress_info.human_readable)), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3 justify-end" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCancelMigrationModal(null),
        className: "flex items-center justify-center gap-1.5 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-semibold transition-colors"
      },
      /* @__PURE__ */ React.createElement(Play, { size: 14 }),
      " Keep Running"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          setCancellingMigration(!0);
          try {
            cancelMigrationModal.onConfirm ? await cancelMigrationModal.onConfirm() : (await fetch(`/api/migrations/${cancelMigrationModal.task_id}/cancel`, {
              method: "POST",
              headers: { "Content-Type": "application/json" }
            })).ok ? (setCancelMigrationModal(null), fetchAutomationStatus2()) : setError("Failed to cancel migration");
          } catch (error) {
            console.error("Error cancelling migration:", error), setError("Error cancelling migration");
          } finally {
            setCancellingMigration(!1);
          }
        },
        disabled: cancellingMigration,
        className: `px-4 py-2 ${cancellingMigration ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"} dark:bg-red-700 dark:hover:bg-red-800 text-white rounded-lg font-semibold transition-colors flex items-center gap-2`
      },
      cancellingMigration ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("svg", { className: "animate-spin h-4 w-4", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24" }, /* @__PURE__ */ React.createElement("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), /* @__PURE__ */ React.createElement("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })), "Cancelling...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(X, { size: 16 }), "Cancel Migration")
    )))));
  }

  // src/components/dashboard/AutomationStatusSection.jsx
  var { useState: useState9 } = React;
  function AutomationStatusSection({
    automationStatus,
    automationConfig,
    scoreHistory,
    collapsedSections,
    setCollapsedSections,
    toggleSection,
    setCurrentPage,
    fetchAutomationStatus: fetchAutomationStatus2,
    runAutomationNow: runAutomationNow2,
    runningAutomation,
    runNowMessage,
    setRunNowMessage,
    setCancelMigrationModal,
    runHistory,
    expandedRun,
    setExpandedRun
  }) {
    let [chartTab, setChartTab] = useState9("migrations");
    return automationStatus ? /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: `p-2.5 rounded-lg shadow-md shrink-0 ${automationStatus.enabled ? "bg-gradient-to-br from-green-600 to-emerald-600" : "bg-gradient-to-br from-gray-500 to-gray-600"}` }, /* @__PURE__ */ React.createElement(Clock, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg sm:text-2xl font-bold text-gray-900 dark:text-white truncate" }, "Automated Migrations"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5 flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement("span", null, "Scheduled automatic balancing"), automationStatus.state?.current_window && /* @__PURE__ */ React.createElement("span", { className: "text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-600 rounded" }, automationStatus.state.current_window), automationStatus.state?.last_run && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-500" }, "Last: ", (() => {
      let ts = typeof automationStatus.state.last_run == "object" ? automationStatus.state.last_run.timestamp : automationStatus.state.last_run;
      return formatRelativeTime(ts) || "Never";
    })()))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleSection("automatedMigrations"),
        className: "ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
        title: collapsedSections.automatedMigrations ? "Expand section" : "Collapse section"
      },
      collapsedSections.automatedMigrations ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 22, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 22, className: "text-gray-600 dark:text-gray-400" })
    ))), collapsedSections.automatedMigrations && automationStatus.dry_run && automationStatus.enabled && /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement("span", { className: "inline-block px-3 py-1.5 bg-yellow-50 dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800 text-sm font-bold text-yellow-700 dark:text-yellow-300" }, "DRY RUN MODE")), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-1.5 sm:gap-3 mb-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: async () => {
          if (automationStatus.enabled)
            try {
              (await fetch("/api/automigrate/toggle-timer", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ active: !automationStatus.timer_active })
              })).ok ? fetchAutomationStatus2() : console.error("Failed to toggle timer");
            } catch (error) {
              console.error("Error toggling timer:", error);
            }
        },
        disabled: !automationStatus.enabled,
        className: `px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg border text-sm font-semibold transition-colors flex items-center gap-1.5 sm:gap-2 ${automationStatus.enabled ? automationStatus.timer_active ? "bg-green-50 dark:bg-gray-800 border-green-200 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-gray-700 cursor-pointer" : "bg-yellow-50 dark:bg-gray-800 border-yellow-200 dark:border-yellow-700 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-gray-700 cursor-pointer" : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed"}`,
        title: automationStatus.enabled ? automationStatus.timer_active ? "Click to pause scheduled checks" : "Click to resume scheduled checks" : "Enable automation in settings first"
      },
      /* @__PURE__ */ React.createElement("div", { className: `w-2 h-2 rounded-full ${automationStatus.enabled ? automationStatus.timer_active ? "bg-green-500 animate-pulse" : "bg-yellow-500" : "bg-gray-400"}` }),
      automationStatus.enabled ? automationStatus.timer_active ? /* @__PURE__ */ React.createElement(CheckCircle, { size: 14 }) : /* @__PURE__ */ React.createElement(Pause, { size: 14 }) : /* @__PURE__ */ React.createElement(XCircle, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, automationStatus.enabled ? automationStatus.timer_active ? "Active" : "Paused" : "Disabled")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentPage("automation"),
        className: "px-2 py-1 sm:px-3 sm:py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5 sm:gap-2",
        title: "Configure Automation"
      },
      /* @__PURE__ */ React.createElement(Settings, { size: 16 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Configure")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: runAutomationNow2,
        disabled: !automationStatus.enabled || runningAutomation,
        className: `px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 sm:gap-2 ${automationStatus.enabled && !runningAutomation ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"}`,
        title: automationStatus.enabled ? runningAutomation ? "Running..." : "Run automation check now" : "Enable automation first"
      },
      runningAutomation ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Loader, { size: 14, className: "animate-spin" }), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Running...")) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Play, { size: 14 }), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Run Now"))
    ), automationStatus.enabled && (() => {
      if (automationStatus.in_progress_migrations?.some((m) => m.initiated_by === "automated"))
        return /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Loader, { size: 12, className: "animate-spin" }), " Running");
      if (automationStatus.next_check) {
        let ts = automationStatus.next_check.endsWith?.("Z") ? automationStatus.next_check : automationStatus.next_check + "Z", diffMins = Math.floor((new Date(ts) - /* @__PURE__ */ new Date()) / 6e4);
        return diffMins > 0 ? /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Next: ", diffMins, "m") : /* @__PURE__ */ React.createElement("span", { className: "text-xs text-green-600 dark:text-green-400 font-semibold" }, "Next: Now");
      }
      return automationStatus.check_interval_minutes ? /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Every ", automationStatus.check_interval_minutes, "m") : null;
    })()), !collapsedSections.automatedMigrations && /* @__PURE__ */ React.createElement(React.Fragment, null, runNowMessage && /* @__PURE__ */ React.createElement("div", { className: `mb-4 p-3 rounded-lg text-sm ${runNowMessage.type === "success" ? "bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-green-700 text-green-700 dark:text-green-300" : runNowMessage.type === "info" ? "bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-blue-700 text-blue-700 dark:text-blue-300" : "bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2 flex-1" }, runNowMessage.type === "success" ? /* @__PURE__ */ React.createElement(CheckCircle, { size: 16, className: "mt-0.5 flex-shrink-0" }) : runNowMessage.type === "info" ? /* @__PURE__ */ React.createElement(Info, { size: 16, className: "mt-0.5 flex-shrink-0" }) : /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "mt-0.5 flex-shrink-0" }), /* @__PURE__ */ React.createElement("span", { style: { whiteSpace: "pre-line" } }, runNowMessage.text)), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setRunNowMessage(null),
        className: "flex-shrink-0 hover:opacity-70 transition-opacity",
        "aria-label": "Close message"
      },
      /* @__PURE__ */ React.createElement(X, { size: 16 })
    ))), automationStatus.dry_run && automationStatus.enabled && /* @__PURE__ */ React.createElement("div", { className: "mb-4 p-3 bg-yellow-50 dark:bg-gray-800 border border-yellow-200 dark:border-yellow-700 rounded-lg text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "text-yellow-600 dark:text-yellow-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-yellow-700 dark:text-yellow-300" }, "DRY RUN MODE"), /* @__PURE__ */ React.createElement("span", { className: "text-yellow-600 dark:text-yellow-400" }, "- No actual migrations will be performed"))), automationStatus.intelligent_tracking?.enabled && automationStatus.intelligent_tracking?.learning_progress && (() => {
      let lp = automationStatus.intelligent_tracking.learning_progress, pct = lp.min_required_hours > 0 ? Math.min(100, Math.round(lp.data_collection_hours / lp.min_required_hours * 100)) : 100;
      if (pct >= 100) return null;
      let level = automationStatus.intelligent_tracking.intelligence_level;
      return /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mb-3 px-1 text-xs" }, /* @__PURE__ */ React.createElement(Info, { size: 14, className: "text-blue-500 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-0.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Learning: ", Math.round(lp.data_collection_hours), "h / ", lp.min_required_hours, "h"), level && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-blue-100 dark:bg-gray-800 text-blue-700 dark:text-blue-300 text-[10px] font-semibold rounded capitalize" }, level), lp.guest_profiles_count > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-500" }, lp.guest_profiles_count, " profiles"), lp.outcomes_count > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-500" }, lp.outcomes_count, " outcomes")), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1" }, /* @__PURE__ */ React.createElement("div", { className: "h-1 rounded-full bg-blue-500 transition-all", style: { width: `${pct}%` } }))), /* @__PURE__ */ React.createElement("span", { className: "text-blue-600 dark:text-blue-400 font-semibold shrink-0" }, pct, "%"));
    })(), (() => {
      let migrations = automationStatus.recent_migrations || [], hasHistory = migrations.length > 0, hasHealth = scoreHistory && scoreHistory.length > 1;
      if (!hasHistory && !hasHealth) return null;
      let dailyStats = Array.from({ length: 7 }, (_, i) => {
        let date = /* @__PURE__ */ new Date();
        return date.setDate(date.getDate() - (6 - i)), date.setHours(0, 0, 0, 0), date;
      }).map((date) => {
        let dayStart = new Date(date), dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);
        let dayMigrations = migrations.filter((m) => {
          let ts = m.timestamp;
          !ts.endsWith("Z") && !ts.includes("+") && (ts += "Z");
          let d = new Date(ts);
          return d >= dayStart && d <= dayEnd;
        });
        return {
          date,
          total: dayMigrations.length,
          successful: dayMigrations.filter((m) => m.status === "completed").length,
          failed: dayMigrations.filter((m) => m.status === "failed").length,
          skipped: dayMigrations.filter((m) => m.status === "skipped").length,
          label: date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
        };
      }), maxMigrations = Math.max(...dailyStats.map((d) => d.total), 1), healthPoints = [], healthMin = 0, healthMax = 100, healthRange = 1;
      hasHealth && (healthPoints = scoreHistory.map((e) => e.cluster_health).filter((v) => v != null), healthPoints.length >= 2 && (healthMin = Math.min(...healthPoints), healthMax = Math.max(...healthPoints), healthRange = healthMax - healthMin || 1));
      let activeTab = hasHistory && hasHealth ? chartTab : hasHistory ? "migrations" : "health";
      return /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 mb-4" }, hasHistory && hasHealth && /* @__PURE__ */ React.createElement("div", { className: "flex border-b border-gray-200 dark:border-gray-600 px-3" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setChartTab("migrations"),
          className: `px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === "migrations" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`
        },
        "Migration History"
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setChartTab("health"),
          className: `px-3 py-2 text-xs font-medium border-b-2 transition-colors ${activeTab === "health" ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"}`
        },
        "Cluster Health"
      )), /* @__PURE__ */ React.createElement("div", { className: "p-4" }, activeTab === "migrations" && hasHistory && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-gray-900 dark:text-white mb-3" }, "Last 7 Days"), /* @__PURE__ */ React.createElement("div", { className: "flex items-end justify-between gap-1 h-32" }, dailyStats.map((day, idx) => {
        let heightPercent = day.total / maxMigrations * 100;
        return /* @__PURE__ */ React.createElement("div", { key: idx, className: "flex-1 flex flex-col items-center gap-1" }, /* @__PURE__ */ React.createElement("div", { className: "w-full flex flex-col-reverse gap-0.5", style: { height: "100px" } }, day.total > 0 ? /* @__PURE__ */ React.createElement(React.Fragment, null, day.successful > 0 && /* @__PURE__ */ React.createElement("div", { className: "w-full bg-green-500 dark:bg-green-600 rounded-t", style: { height: `${day.successful / day.total * heightPercent}%` }, title: `${day.successful} successful` }), day.failed > 0 && /* @__PURE__ */ React.createElement("div", { className: "w-full bg-red-500 dark:bg-red-600", style: { height: `${day.failed / day.total * heightPercent}%` }, title: `${day.failed} failed` }), day.skipped > 0 && /* @__PURE__ */ React.createElement("div", { className: "w-full bg-yellow-500 dark:bg-yellow-600 rounded-b", style: { height: `${day.skipped / day.total * heightPercent}%` }, title: `${day.skipped} skipped` })) : /* @__PURE__ */ React.createElement("div", { className: "w-full h-1 bg-gray-200 dark:bg-gray-600 rounded" })), /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-gray-900 dark:text-white" }, day.total > 0 ? day.total : ""), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-500 dark:text-gray-400 text-center" }, day.label));
      })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-4 mt-3 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-green-500 dark:bg-green-600 rounded" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Success")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-red-500 dark:bg-red-600 rounded" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Failed")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("div", { className: "w-3 h-3 bg-yellow-500 dark:bg-yellow-600 rounded" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Skipped")))), activeTab === "health" && hasHealth && healthPoints.length >= 2 && (() => {
        let linePoints = healthPoints.map((v, i) => {
          let x = 4 + i / (healthPoints.length - 1) * 392, y = 76 - (v - healthMin) / healthRange * 72;
          return `${x},${y}`;
        }).join(" "), areaPoints = `4,76 ${linePoints} 396,76`, latest = healthPoints[healthPoints.length - 1], trend = latest - healthPoints[0];
        return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-gray-900 dark:text-white" }, "Cluster Health"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-gray-900 dark:text-white" }, latest.toFixed(1), "%"), /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${trend >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}` }, trend >= 0 ? "+" : "", trend.toFixed(1)))), /* @__PURE__ */ React.createElement("svg", { viewBox: "0 0 400 80", className: "w-full", style: { height: "80px" }, preserveAspectRatio: "none" }, /* @__PURE__ */ React.createElement("defs", null, /* @__PURE__ */ React.createElement("linearGradient", { id: "healthGrad", x1: "0", y1: "0", x2: "0", y2: "1" }, /* @__PURE__ */ React.createElement("stop", { offset: "0%", stopColor: "#3b82f6" }), /* @__PURE__ */ React.createElement("stop", { offset: "100%", stopColor: "#3b82f6", stopOpacity: "0" }))), /* @__PURE__ */ React.createElement("polygon", { points: areaPoints, fill: "url(#healthGrad)", opacity: "0.3" }), /* @__PURE__ */ React.createElement("polyline", { points: linePoints, fill: "none", stroke: "#3b82f6", strokeWidth: "2", strokeLinejoin: "round" })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between text-[10px] text-gray-400 dark:text-gray-500 mt-1" }, /* @__PURE__ */ React.createElement("span", null, new Date(scoreHistory[0].timestamp).toLocaleDateString()), /* @__PURE__ */ React.createElement("span", null, new Date(scoreHistory[scoreHistory.length - 1].timestamp).toLocaleDateString())));
      })()));
    })(), automationStatus.in_progress_migrations && automationStatus.in_progress_migrations.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "animate-spin text-blue-600 dark:text-blue-400" }), "Migrations In Progress"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, automationStatus.in_progress_migrations.map((migration, idx) => {
      let elapsedTime = "N/A";
      if (migration.starttime && typeof migration.starttime == "number" && migration.starttime > 0)
        try {
          let elapsedSeconds = Math.floor(Date.now() / 1e3 - migration.starttime);
          if (elapsedSeconds >= 0) {
            let minutes = Math.floor(elapsedSeconds / 60), seconds = elapsedSeconds % 60;
            elapsedTime = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
          }
        } catch (err) {
          console.error("Error calculating elapsed time:", err);
        }
      let isAutomated = migration.initiated_by === "automated";
      return /* @__PURE__ */ React.createElement("div", { key: idx, className: `text-sm rounded-lg p-3 border-2 animate-pulse ${isAutomated ? "bg-blue-50 dark:bg-gray-800 border-blue-300 dark:border-blue-600" : "bg-purple-50 dark:bg-gray-800 border-purple-300 dark:border-purple-600"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-900 dark:text-white font-medium" }, migration.name, " (", migration.vmid, ")"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 text-xs" }, migration.source_node, " \u2192 ", migration.target_node || "?"), migration.type === "VM" ? /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-green-100 dark:bg-gray-800 text-green-700 dark:text-green-300 text-[10px] font-semibold rounded border border-green-300 dark:border-green-600", title: "Live migration (no downtime)" }, "LIVE") : /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-orange-100 dark:bg-gray-800 text-orange-700 dark:text-orange-300 text-[10px] font-semibold rounded border border-orange-300 dark:border-orange-600", title: "Migration with restart (brief downtime)" }, "RESTART"), !isAutomated && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-purple-100 dark:bg-gray-800 text-purple-700 dark:text-purple-300 text-[10px] font-semibold rounded border border-purple-300 dark:border-purple-600" }, "MANUAL")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${isAutomated ? "bg-blue-100 text-blue-700 dark:bg-gray-700 dark:text-blue-400" : "bg-purple-100 text-purple-700 dark:bg-gray-700 dark:text-purple-400"}` }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Running"), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setCancelMigrationModal(migration),
          className: "px-2 py-0.5 bg-red-100 hover:bg-red-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-red-700 dark:text-red-300 rounded text-xs font-semibold transition-colors flex items-center gap-1",
          title: "Cancel migration"
        },
        /* @__PURE__ */ React.createElement(X, { size: 12 }),
        " Cancel"
      ))), /* @__PURE__ */ React.createElement("div", { className: `mt-1 text-xs flex items-center gap-3 ${isAutomated ? "text-gray-600 dark:text-gray-400" : "text-purple-600 dark:text-purple-400"}` }, migration.starttime && migration.starttime > 0 ? /* @__PURE__ */ React.createElement("span", null, "Started: ", new Date(migration.starttime * 1e3).toLocaleTimeString()) : /* @__PURE__ */ React.createElement("span", null, "Started: Unknown"), /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${isAutomated ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"}` }, "Elapsed: ", elapsedTime)), migration.progress && /* @__PURE__ */ React.createElement("div", { className: "mt-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between text-xs mb-1" }, /* @__PURE__ */ React.createElement("span", { className: `${isAutomated ? "text-blue-600 dark:text-blue-400" : "text-purple-600 dark:text-purple-400"} font-semibold` }, "Progress: ", migration.progress.percentage, "%", migration.progress.speed_mib_s && /* @__PURE__ */ React.createElement("span", { className: "ml-2 font-normal text-[10px]" }, "(", migration.progress.speed_mib_s.toFixed(1), " MiB/s)")), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 text-[10px]" }, migration.progress.human_readable)), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2" }, /* @__PURE__ */ React.createElement("div", { className: `h-2 rounded-full transition-all duration-300 ${isAutomated ? "bg-blue-600 dark:bg-blue-500" : "bg-purple-600 dark:bg-purple-500"}`, style: { width: `${migration.progress.percentage}%` } }))));
    }))), automationStatus.state?.last_run && typeof automationStatus.state.last_run == "object" && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, lastRunSummary: !prev.lastRunSummary })),
        className: "w-full flex items-center justify-between mb-3 hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded-lg transition-colors"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ClipboardList, { size: 16, className: "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300" }, "Last Run Summary"), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, formatRelativeTime(automationStatus.state.last_run.timestamp))),
      collapsedSections.lastRunSummary ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 18, className: "text-gray-500" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 18, className: "text-gray-500" })
    ), !collapsedSections.lastRunSummary && /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Status"), /* @__PURE__ */ React.createElement("div", { className: `text-sm font-bold ${automationStatus.state.last_run.status === "success" ? "text-green-600 dark:text-green-400" : automationStatus.state.last_run.status === "partial" ? "text-yellow-600 dark:text-yellow-400" : automationStatus.state.last_run.status === "failed" ? "text-red-600 dark:text-red-400" : automationStatus.state.last_run.status === "no_action" ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}` }, automationStatus.state.last_run.status === "success" ? "Success" : automationStatus.state.last_run.status === "partial" ? "Partial" : automationStatus.state.last_run.status === "failed" ? "Failed" : automationStatus.state.last_run.status === "no_action" ? "Cluster Balanced" : automationStatus.state.last_run.status)), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Migrations"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-gray-900 dark:text-white" }, automationStatus.state.last_run.migrations_successful || 0, " / ", automationStatus.state.last_run.migrations_executed || 0)), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Duration"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-gray-900 dark:text-white" }, automationStatus.state.last_run.duration_seconds ? `${Math.floor(automationStatus.state.last_run.duration_seconds / 60)}m ${automationStatus.state.last_run.duration_seconds % 60}s` : "N/A")), /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, "Mode"), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-gray-900 dark:text-white" }, automationStatus.state.last_run.mode === "dry_run" ? "Dry Run" : "Live"))), automationStatus.state.last_run.status === "no_action" && /* @__PURE__ */ React.createElement("div", { className: "p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg mb-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 16, className: "text-green-600 dark:text-green-400 shrink-0" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-green-700 dark:text-green-300" }, "No action needed \u2014 cluster is balanced and no migrations were required.")), automationStatus.state.last_run.decisions && automationStatus.state.last_run.decisions.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3 mb-3 max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" }, "Decisions Made:"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, [...automationStatus.state.last_run.decisions].sort((a, b) => {
      let getOrder = (d) => d.action === "executed" || d.action === "pending" || d.action === "failed" ? 0 : d.action === "observing" || d.action === "deferred" ? 1 : d.action === "skipped" ? 2 : 3;
      return getOrder(a) - getOrder(b) || (a.priority_rank || 999) - (b.priority_rank || 999);
    }).map((decision, idx) => {
      let isExecuted = decision.action === "executed" || decision.action === "failed", isPending = decision.action === "pending", borderColor = isExecuted ? "border-green-500" : isPending ? "border-blue-500" : decision.action === "observing" ? "border-cyan-500" : decision.action === "deferred" ? "border-amber-500" : decision.action === "skipped" ? "border-yellow-500" : "border-gray-400", bgColor = isExecuted ? "bg-green-50 dark:bg-gray-700" : isPending ? "bg-blue-50 dark:bg-gray-700" : decision.action === "observing" ? "bg-cyan-50 dark:bg-gray-700" : decision.action === "deferred" ? "bg-amber-50 dark:bg-gray-700" : "bg-gray-50 dark:bg-gray-700";
      return /* @__PURE__ */ React.createElement("div", { key: idx, className: `text-xs ${bgColor} rounded p-2 border-l-4 ${borderColor} ${isPending ? "animate-pulse" : ""}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, decision.priority_rank && /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded font-bold text-[10px] ${decision.priority_rank === 1 ? "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200" : "bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-300"}` }, "#", decision.priority_rank), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, decision.action === "filtered" ? "\u2297" : decision.action === "skipped" ? "\u23ED" : decision.action === "pending" ? "\u{1F504}" : decision.action === "executed" ? "\u2705" : decision.action === "observing" ? "\u{1F441}" : decision.action === "deferred" ? "\u{1F550}" : "\u2717", " ", decision.name || `VM/CT ${decision.vmid}`), decision.type && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[9px] bg-blue-100 text-blue-700 dark:bg-gray-800 dark:text-blue-400" }, decision.type), decision.distribution_balancing && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[9px] bg-purple-100 text-purple-700 dark:bg-gray-800 dark:text-purple-400", title: "Distribution Balancing" }, "Balance")), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, decision.source_node, " \u2192 ", decision.target_node, decision.target_node_score && ` (score: ${decision.target_node_score})`)), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded text-[10px] font-semibold ${decision.action === "executed" ? "bg-green-100 text-green-700 dark:bg-gray-800 dark:text-green-400" : decision.action === "pending" ? "bg-blue-100 text-blue-700 dark:bg-gray-800 dark:text-blue-400" : decision.action === "observing" ? "bg-cyan-100 text-cyan-700 dark:bg-gray-800 dark:text-cyan-400" : decision.action === "deferred" ? "bg-amber-100 text-amber-700 dark:bg-gray-800 dark:text-amber-400" : decision.action === "skipped" ? "bg-yellow-100 text-yellow-700 dark:bg-gray-800 dark:text-yellow-400" : decision.action === "filtered" ? "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" : "bg-red-100 text-red-700 dark:bg-gray-800 dark:text-red-400"}` }, decision.action)), /* @__PURE__ */ React.createElement("div", { className: "mt-1 text-gray-600 dark:text-gray-400" }, decision.selected_reason || decision.reason), decision.confidence_score && /* @__PURE__ */ React.createElement("div", { className: "mt-1 text-blue-600 dark:text-blue-400 font-semibold text-[10px]" }, "Confidence: ", decision.confidence_score, "%"), decision.reasoning && /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500 dark:text-gray-400" }, decision.reasoning.score_improvement != null && /* @__PURE__ */ React.createElement("span", null, "Score: +", Number(decision.reasoning.score_improvement).toFixed(1)), decision.reasoning.cost_benefit != null && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 dark:text-gray-600" }, "|"), /* @__PURE__ */ React.createElement("span", null, "Cost-benefit: ", Number(decision.reasoning.cost_benefit).toFixed(1), "x")), decision.reasoning.observation_count != null && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 dark:text-gray-600" }, "|"), /* @__PURE__ */ React.createElement("span", null, "Observed ", decision.reasoning.observation_count, "/", decision.reasoning.required_observations)), decision.reasoning.hours_tracked != null && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 dark:text-gray-600" }, "|"), /* @__PURE__ */ React.createElement("span", null, Number(decision.reasoning.hours_tracked).toFixed(1), "h tracked")), decision.reasoning.guest_behavior && decision.reasoning.guest_behavior !== "unknown" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 dark:text-gray-600" }, "|"), /* @__PURE__ */ React.createElement("span", null, decision.reasoning.guest_behavior))), decision.error && /* @__PURE__ */ React.createElement("div", { className: "mt-1 text-red-600 dark:text-red-400 text-[10px]" }, "Error: ", decision.error));
    }))), automationStatus.state.last_run.safety_checks && /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" }, "Safety Checks:"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 gap-2 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 14, className: "text-green-600 dark:text-green-400 mt-0.5 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-gray-900 dark:text-white" }, "Migration Window"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400" }, automationStatus.state.last_run.safety_checks.migration_window))), /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 14, className: "text-green-600 dark:text-green-400 mt-0.5 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-gray-900 dark:text-white" }, "Cluster Health"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400" }, automationStatus.state.last_run.safety_checks.cluster_health))), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, "Running migrations:"), " ", automationStatus.state.last_run.safety_checks.running_migrations || 0))), automationStatus.state?.activity_log && automationStatus.state.activity_log.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3 mt-3 max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" }, "Activity Log \u2014 Skipped (", automationStatus.state.activity_log.length, "):"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, automationStatus.state.activity_log.map((activity, aidx) => /* @__PURE__ */ React.createElement("div", { key: aidx, className: "text-xs bg-white dark:bg-gray-700 rounded p-2 border-l-4 border-yellow-400 dark:border-yellow-600 flex items-start gap-2" }, /* @__PURE__ */ React.createElement(MinusCircle, { size: 12, className: "text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, activity.name), activity.vmid && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-1" }, "(", activity.vmid, ")"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400 mt-0.5" }, activity.reason)))))), (!automationStatus.state.last_run.decisions || automationStatus.state.last_run.decisions.length === 0) && (!automationStatus.state?.activity_log || automationStatus.state.activity_log.length === 0) && automationStatus.filter_reasons && automationStatus.filter_reasons.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded p-3 mt-3 max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2" }, "Filtered (", automationStatus.filter_reasons.length, "):"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, automationStatus.filter_reasons.map((reason, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "text-xs bg-white dark:bg-gray-700 rounded p-2 border-l-4 border-yellow-400 dark:border-yellow-600 flex items-start gap-2" }, /* @__PURE__ */ React.createElement(MinusCircle, { size: 12, className: "text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300" }, reason))))))), automationStatus.recent_migrations && automationStatus.recent_migrations.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 recent-auto-migrations" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300" }, "Recent Auto-Migrations"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          let migrations = automationStatus.recent_migrations || [];
          if (migrations.length === 0) return;
          let headers = ["Timestamp", "VM ID", "VM Name", "Source Node", "Target Node", "Suitability %", "Reason", "Confidence Score", "Status", "Duration (s)", "Dry Run", "Window"], rows = migrations.map((m) => [
            m.timestamp || "",
            m.vmid || "",
            m.name || "",
            m.source_node || "",
            m.target_node || "",
            m.suitability_rating || m.target_node_score || "",
            (m.reason || "").replace(/,/g, ";"),
            m.confidence_score || "",
            m.status || "",
            m.duration_seconds || "",
            m.dry_run ? "Yes" : "No",
            (m.window_name || "").replace(/,/g, ";")
          ]), csv = [headers.join(","), ...rows.map((row) => row.join(","))].join(`
`), blob = new Blob([csv], { type: "text/csv" }), url = window.URL.createObjectURL(blob), a = document.createElement("a");
          a.href = url, a.download = `proxbalance-migrations-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.csv`, document.body.appendChild(a), a.click(), document.body.removeChild(a), window.URL.revokeObjectURL(url);
        },
        className: "flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors",
        title: "Export migration history to CSV"
      },
      /* @__PURE__ */ React.createElement(Download, { size: 12 }),
      " Export CSV"
    )), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, (() => {
      let seen = /* @__PURE__ */ new Map(), uniqueMigrations = [], sortedMigrations = [...automationStatus.recent_migrations].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      for (let migration of sortedMigrations) {
        let key = `${migration.vmid}-${migration.source_node}-${migration.target_node}`;
        seen.has(key) || (seen.set(key, !0), uniqueMigrations.push(migration));
      }
      return uniqueMigrations.slice(0, 3);
    })().map((migration) => {
      let timeDisplay = formatRelativeTime(migration.timestamp);
      return /* @__PURE__ */ React.createElement("div", { key: migration.id, className: "text-sm bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-1 flex-wrap" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-900 dark:text-white font-medium" }, migration.name, " (", migration.vmid, ")"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 text-xs" }, migration.source_node, " \u2192 ", migration.target_node, (migration.suitability_rating !== void 0 || migration.target_node_score !== void 0) && (() => {
        let suitabilityPercent = migration.suitability_rating !== void 0 ? migration.suitability_rating : Math.max(0, Math.round(100 - Math.min(migration.target_node_score || 0, 100)));
        return /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-[10px] inline-flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "relative group inline-block" }, /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${suitabilityPercent >= 70 ? "text-green-600 dark:text-green-400" : suitabilityPercent >= 50 ? "text-yellow-600 dark:text-yellow-400" : suitabilityPercent >= 30 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400"}` }, suitabilityPercent, "%"), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1.5 bg-gray-900 dark:bg-gray-800 text-white text-[10px] rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 border border-gray-700" }, /* @__PURE__ */ React.createElement("div", null, "Target: ", migration.target_node), /* @__PURE__ */ React.createElement("div", null, "Penalty: ", migration.target_node_score?.toFixed(1) || "N/A"), /* @__PURE__ */ React.createElement("div", null, "Suitability: ", suitabilityPercent, "%"))));
      })()), migration.dry_run && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 bg-yellow-100 dark:bg-gray-800 text-yellow-700 dark:text-yellow-400 text-xs rounded" }, "DRY RUN")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, timeDisplay && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, timeDisplay), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded text-xs font-semibold flex items-center gap-1 ${migration.status === "completed" ? "bg-green-100 text-green-700 dark:bg-gray-800 dark:text-green-400" : migration.status === "failed" ? "bg-red-100 text-red-700 dark:bg-gray-800 dark:text-red-400" : migration.status === "skipped" ? "bg-yellow-100 text-yellow-700 dark:bg-gray-800 dark:text-yellow-400" : migration.status === "timeout" ? "bg-orange-100 text-orange-700 dark:bg-gray-800 dark:text-orange-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}` }, migration.status === "completed" && /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }), migration.status === "failed" && /* @__PURE__ */ React.createElement(XCircle, { size: 12 }), migration.status === "skipped" && /* @__PURE__ */ React.createElement(AlertTriangle, { size: 12 }), migration.status === "timeout" && /* @__PURE__ */ React.createElement(Clock, { size: 12 }), migration.status))), migration.reason && /* @__PURE__ */ React.createElement("div", { className: "mt-1 flex items-center gap-3" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-600 dark:text-gray-400" }, migration.reason), migration.duration_seconds !== void 0 && migration.duration_seconds > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-500" }, migration.duration_seconds, "s")), migration.status === "failed" && /* @__PURE__ */ React.createElement("div", { className: "mt-2 p-2 bg-red-50 dark:bg-gray-800 border border-red-200 dark:border-red-700 rounded flex items-start gap-2" }, /* @__PURE__ */ React.createElement(XCircle, { size: 14, className: "text-red-600 dark:text-red-400 mt-0.5 shrink-0" }), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-red-800 dark:text-red-300 flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Error:"), " ", migration.error || "Migration failed (check logs for details)")));
    }))), (runHistory.length > 0 || automationStatus.state?.activity_log?.length > 0) && /* @__PURE__ */ React.createElement("div", { className: "mt-4 pt-4 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Clock, { size: 14 }), "Run History"), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, runHistory.slice(0, 5).map((run, idx) => {
      let isExpanded = expandedRun === run.timestamp, timeDisplay = formatRelativeTime(run.timestamp);
      return /* @__PURE__ */ React.createElement("div", { key: idx, className: "bg-white dark:bg-gray-700 rounded-lg p-3 border border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "flex items-center justify-between cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 rounded p-1 transition-colors",
          onClick: () => setExpandedRun(isExpanded ? null : run.timestamp)
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, isExpanded ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 14, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronRight, { size: 14, className: "text-gray-600 dark:text-gray-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-gray-700 dark:text-gray-200" }, timeDisplay), /* @__PURE__ */ React.createElement("span", { className: `px-1.5 py-0.5 rounded text-[10px] font-semibold ${run.status === "success" ? "bg-green-100 text-green-700 dark:bg-gray-800 dark:text-green-300" : run.status === "partial" ? "bg-yellow-100 text-yellow-700 dark:bg-gray-800 dark:text-yellow-300" : run.status === "no_action" ? "bg-green-50 text-green-600 dark:bg-gray-800 dark:text-green-400" : "bg-red-100 text-red-700 dark:bg-gray-800 dark:text-red-300"}` }, run.status === "no_action" ? "balanced" : run.status)),
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300" }, /* @__PURE__ */ React.createElement("span", null, run.migrations_executed || 0, " migration", run.migrations_executed !== 1 ? "s" : ""), /* @__PURE__ */ React.createElement("span", null, run.duration_seconds || 0, "s"))
      ), isExpanded && /* @__PURE__ */ React.createElement(React.Fragment, null, run.decisions && run.decisions.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-2 pl-3" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-800 rounded-lg p-2.5 space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-semibold text-gray-500 dark:text-gray-400 uppercase" }, "Decisions (", run.decisions.length, ")"), run.decisions.map((decision, didx) => /* @__PURE__ */ React.createElement("div", { key: didx, className: `text-xs p-2 rounded bg-white dark:bg-gray-700 border-l-2 ${decision.action === "executed" ? "border-green-500" : decision.action === "pending" ? "border-blue-500" : decision.action === "observing" ? "border-cyan-500" : decision.action === "deferred" ? "border-amber-500" : decision.action === "skipped" ? "border-yellow-500" : "border-gray-400"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, decision.action === "executed" && /* @__PURE__ */ React.createElement(CheckCircle, { size: 10, className: "text-green-600 dark:text-green-400" }), decision.action === "pending" && /* @__PURE__ */ React.createElement(RefreshCw, { size: 10, className: "text-blue-600 dark:text-blue-400" }), decision.action === "observing" && /* @__PURE__ */ React.createElement(Info, { size: 10, className: "text-cyan-600 dark:text-cyan-400" }), decision.action === "deferred" && /* @__PURE__ */ React.createElement(Clock, { size: 10, className: "text-amber-600 dark:text-amber-400" }), decision.action === "skipped" && /* @__PURE__ */ React.createElement(Minus, { size: 10, className: "text-yellow-600 dark:text-yellow-400" }), decision.action === "filtered" && /* @__PURE__ */ React.createElement(XCircle, { size: 10, className: "text-gray-600 dark:text-gray-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-900 dark:text-gray-100" }, decision.name), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "(", decision.vmid, ")"), decision.distribution_balancing && /* @__PURE__ */ React.createElement("span", { className: "ml-1", title: "Distribution Balancing" }, "\u2696\uFE0F")), decision.priority_rank && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-semibold text-gray-500 dark:text-gray-400" }, "#", decision.priority_rank)), decision.reason && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-600 dark:text-gray-300 mt-0.5" }, decision.reason), decision.reasoning && /* @__PURE__ */ React.createElement("div", { className: "mt-0.5 flex flex-wrap gap-1.5 text-[9px] text-gray-500 dark:text-gray-400" }, decision.reasoning.score_improvement != null && /* @__PURE__ */ React.createElement("span", null, "+", Number(decision.reasoning.score_improvement).toFixed(1), "pts"), decision.reasoning.cost_benefit != null && /* @__PURE__ */ React.createElement("span", null, "CB:", Number(decision.reasoning.cost_benefit).toFixed(1), "x"), decision.reasoning.observation_count != null && /* @__PURE__ */ React.createElement("span", null, decision.reasoning.observation_count, "/", decision.reasoning.required_observations, " obs"))))))));
    }))))) : null;
  }

  // src/components/dashboard/GuestTagManagement.jsx
  function GuestTagManagement({
    data,
    collapsedSections,
    toggleSection,
    guestSearchFilter,
    setGuestSearchFilter,
    guestCurrentPage,
    setGuestCurrentPage,
    guestPageSize,
    setGuestPageSize,
    guestSortField,
    setGuestSortField,
    guestSortDirection,
    setGuestSortDirection,
    canMigrate,
    setTagModalGuest,
    setShowTagModal,
    handleRemoveTag,
    ignoredGuests,
    excludeGuests,
    affinityGuests,
    autoMigrateOkGuests,
    guestProfiles
  }) {
    return data ? /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-3 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between gap-2 mb-3 sm:mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 sm:gap-3 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-1.5 sm:p-2.5 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg shadow-md shrink-0" }, /* @__PURE__ */ React.createElement(Tag, { size: 18, className: "text-white sm:hidden" }), /* @__PURE__ */ React.createElement(Tag, { size: 24, className: "text-white hidden sm:block" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-base sm:text-2xl font-bold text-gray-900 dark:text-white" }, "Guest Tag Management"), /* @__PURE__ */ React.createElement("p", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-0.5 hidden sm:block" }, "Manage ignore tags and affinity rules for all guests"))), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleSection("taggedGuests"),
        className: "p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 shrink-0",
        title: collapsedSections.taggedGuests ? "Expand section" : "Collapse section"
      },
      collapsedSections.taggedGuests ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 20, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 20, className: "text-gray-600 dark:text-gray-400" })
    )), collapsedSections.taggedGuests ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 sm:gap-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded" }, /* @__PURE__ */ React.createElement(HardDrive, { size: 16, className: "text-gray-600 dark:text-gray-400 shrink-0 sm:hidden" }), /* @__PURE__ */ React.createElement(HardDrive, { size: 18, className: "text-gray-600 dark:text-gray-400 shrink-0 hidden sm:block" }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate" }, "Total"), /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400" }, Object.keys(data.guests).length))), /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${ignoredGuests.length > 0 ? "bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800" : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60"}` }, /* @__PURE__ */ React.createElement(Shield, { size: 16, className: `shrink-0 sm:hidden ${ignoredGuests.length > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement(Shield, { size: 18, className: `shrink-0 hidden sm:block ${ignoredGuests.length > 0 ? "text-yellow-600 dark:text-yellow-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate" }, "Ignored"), /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400" }, ignoredGuests.length))), /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${autoMigrateOkGuests.length > 0 ? "bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800" : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60"}` }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 16, className: `shrink-0 sm:hidden ${autoMigrateOkGuests.length > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement(CheckCircle, { size: 18, className: `shrink-0 hidden sm:block ${autoMigrateOkGuests.length > 0 ? "text-green-600 dark:text-green-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate" }, "Auto-Migrate"), /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400" }, autoMigrateOkGuests.length))), /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${excludeGuests.length > 0 ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800" : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60"}` }, /* @__PURE__ */ React.createElement(Shield, { size: 16, className: `shrink-0 sm:hidden ${excludeGuests.length > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement(Shield, { size: 18, className: `shrink-0 hidden sm:block ${excludeGuests.length > 0 ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate" }, "Anti-Affinity"), /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400" }, excludeGuests.length))), /* @__PURE__ */ React.createElement("div", { className: `flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded border ${affinityGuests.length > 0 ? "bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800" : "bg-gray-50 dark:bg-gray-700/30 border-gray-200 dark:border-gray-700 opacity-60"}` }, /* @__PURE__ */ React.createElement(Shield, { size: 16, className: `shrink-0 sm:hidden ${affinityGuests.length > 0 ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement(Shield, { size: 18, className: `shrink-0 hidden sm:block ${affinityGuests.length > 0 ? "text-purple-600 dark:text-purple-400" : "text-gray-400 dark:text-gray-500"}` }), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-sm sm:text-base text-gray-900 dark:text-white truncate" }, "Affinity"), /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400" }, affinityGuests.length)))) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "mb-4 flex flex-wrap gap-2 sm:gap-3 items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-[150px] sm:min-w-[200px]" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "text",
        placeholder: "Search guests by ID, name, node...",
        value: guestSearchFilter,
        onChange: (e) => {
          setGuestSearchFilter(e.target.value), setGuestCurrentPage(1);
        },
        className: "w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Per page:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: guestPageSize,
        onChange: (e) => {
          setGuestPageSize(Number(e.target.value)), setGuestCurrentPage(1);
        },
        className: "px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      },
      /* @__PURE__ */ React.createElement("option", { value: "10" }, "10"),
      /* @__PURE__ */ React.createElement("option", { value: "25" }, "25"),
      /* @__PURE__ */ React.createElement("option", { value: "50" }, "50"),
      /* @__PURE__ */ React.createElement("option", { value: "100" }, "100")
    ))), /* @__PURE__ */ React.createElement("div", { className: "overflow-x-auto" }, /* @__PURE__ */ React.createElement("table", { className: "w-full" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", { className: "border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement(
      "th",
      {
        onClick: () => {
          guestSortField === "type" ? setGuestSortDirection(guestSortDirection === "asc" ? "desc" : "asc") : (setGuestSortField("type"), setGuestSortDirection("asc"));
        },
        className: "text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, "Type", guestSortField === "type" && /* @__PURE__ */ React.createElement("span", null, guestSortDirection === "asc" ? "\u2191" : "\u2193"))
    ), /* @__PURE__ */ React.createElement(
      "th",
      {
        onClick: () => {
          guestSortField === "vmid" ? setGuestSortDirection(guestSortDirection === "asc" ? "desc" : "asc") : (setGuestSortField("vmid"), setGuestSortDirection("asc"));
        },
        className: "hidden sm:table-cell text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, "ID", guestSortField === "vmid" && /* @__PURE__ */ React.createElement("span", null, guestSortDirection === "asc" ? "\u2191" : "\u2193"))
    ), /* @__PURE__ */ React.createElement(
      "th",
      {
        onClick: () => {
          guestSortField === "name" ? setGuestSortDirection(guestSortDirection === "asc" ? "desc" : "asc") : (setGuestSortField("name"), setGuestSortDirection("asc"));
        },
        className: "text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, "Name", guestSortField === "name" && /* @__PURE__ */ React.createElement("span", null, guestSortDirection === "asc" ? "\u2191" : "\u2193"))
    ), /* @__PURE__ */ React.createElement(
      "th",
      {
        onClick: () => {
          guestSortField === "node" ? setGuestSortDirection(guestSortDirection === "asc" ? "desc" : "asc") : (setGuestSortField("node"), setGuestSortDirection("asc"));
        },
        className: "text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, "Node", guestSortField === "node" && /* @__PURE__ */ React.createElement("span", null, guestSortDirection === "asc" ? "\u2191" : "\u2193"))
    ), /* @__PURE__ */ React.createElement(
      "th",
      {
        onClick: () => {
          guestSortField === "status" ? setGuestSortDirection(guestSortDirection === "asc" ? "desc" : "asc") : (setGuestSortField("status"), setGuestSortDirection("asc"));
        },
        className: "text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, "Status", guestSortField === "status" && /* @__PURE__ */ React.createElement("span", null, guestSortDirection === "asc" ? "\u2191" : "\u2193"))
    ), /* @__PURE__ */ React.createElement(
      "th",
      {
        onClick: () => {
          guestSortField === "tags" ? setGuestSortDirection(guestSortDirection === "asc" ? "desc" : "asc") : (setGuestSortField("tags"), setGuestSortDirection("asc"));
        },
        className: "hidden sm:table-cell text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 select-none"
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, "Tags", guestSortField === "tags" && /* @__PURE__ */ React.createElement("span", null, guestSortDirection === "asc" ? "\u2191" : "\u2193"))
    ), canMigrate && /* @__PURE__ */ React.createElement("th", { className: "hidden sm:table-cell text-left p-3 text-sm font-semibold text-gray-700 dark:text-gray-300" }, "Actions"))), /* @__PURE__ */ React.createElement("tbody", null, (() => {
      let filteredGuests = Object.values(data.guests);
      if (guestSearchFilter) {
        let searchLower = guestSearchFilter.toLowerCase();
        filteredGuests = filteredGuests.filter(
          (guest) => guest.vmid.toString().includes(searchLower) || (guest.name || "").toLowerCase().includes(searchLower) || guest.node.toLowerCase().includes(searchLower) || guest.type.toLowerCase().includes(searchLower) || guest.status.toLowerCase().includes(searchLower)
        );
      }
      filteredGuests.sort((a, b) => {
        let aVal, bVal;
        switch (guestSortField) {
          case "vmid":
            aVal = a.vmid, bVal = b.vmid;
            break;
          case "name":
            aVal = (a.name || "").toLowerCase(), bVal = (b.name || "").toLowerCase();
            break;
          case "node":
            aVal = a.node.toLowerCase(), bVal = b.node.toLowerCase();
            break;
          case "type":
            aVal = a.type.toLowerCase(), bVal = b.type.toLowerCase();
            break;
          case "status":
            aVal = a.status.toLowerCase(), bVal = b.status.toLowerCase();
            break;
          case "tags":
            let aTagCount = (a.tags.has_ignore ? 1 : 0) + a.tags.exclude_groups.length, bTagCount = (b.tags.has_ignore ? 1 : 0) + b.tags.exclude_groups.length;
            if (aTagCount !== bTagCount)
              aVal = aTagCount, bVal = bTagCount;
            else {
              let aFirstTag = a.tags.has_ignore ? "ignore" : a.tags.exclude_groups[0] || "", bFirstTag = b.tags.has_ignore ? "ignore" : b.tags.exclude_groups[0] || "";
              aVal = aFirstTag.toLowerCase(), bVal = bFirstTag.toLowerCase();
            }
            break;
          default:
            aVal = a.vmid, bVal = b.vmid;
        }
        return guestSortDirection === "asc" ? aVal < bVal ? -1 : aVal > bVal ? 1 : 0 : aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      });
      let totalGuests = filteredGuests.length, totalPages = Math.ceil(totalGuests / guestPageSize), startIndex = (guestCurrentPage - 1) * guestPageSize, endIndex = startIndex + guestPageSize, paginatedGuests = filteredGuests.slice(startIndex, endIndex);
      return /* @__PURE__ */ React.createElement(React.Fragment, null, paginatedGuests.map((guest) => {
        let guestHasTags = guest.tags.has_ignore || guest.tags.all_tags?.includes("auto_migrate_ok") || guest.tags.exclude_groups?.length > 0 || guest.tags.affinity_groups?.length > 0;
        return /* @__PURE__ */ React.createElement(
          "tr",
          {
            key: guest.vmid,
            className: `border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${canMigrate ? "sm:cursor-default cursor-pointer" : ""}`,
            onClick: () => {
              canMigrate && window.innerWidth < 640 && (setTagModalGuest(guest), setShowTagModal(!0));
            }
          },
          /* @__PURE__ */ React.createElement("td", { className: "p-3" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 text-xs rounded font-medium ${guest.type === "VM" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"}` }, guest.type)),
          /* @__PURE__ */ React.createElement("td", { className: "hidden sm:table-cell p-3 text-sm font-mono text-gray-900 dark:text-white" }, guest.vmid),
          /* @__PURE__ */ React.createElement("td", { className: "p-3" }, /* @__PURE__ */ React.createElement("div", { className: "text-sm text-gray-900 dark:text-white flex items-center gap-1.5" }, guest.name, (() => {
            let profile = guestProfiles?.[String(guest.vmid)];
            if (!profile || profile.confidence === "low") return null;
            let cls = {
              steady: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
              bursty: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
              growing: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
              cyclical: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
            }[profile.behavior];
            return cls ? /* @__PURE__ */ React.createElement("span", { className: `px-1.5 py-0.5 rounded text-[9px] font-semibold ${cls}`, title: `${profile.behavior} workload (${profile.confidence} confidence, ${profile.data_points} data points)` }, profile.behavior.charAt(0).toUpperCase() + profile.behavior.slice(1)) : null;
          })()), guestHasTags && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mt-1 sm:hidden" }, guest.tags.has_ignore && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium" }, "ignore"), guest.tags.all_tags?.includes("auto_migrate_ok") && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] px-1.5 py-0.5 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded font-medium" }, "auto_migrate"), guest.tags.exclude_groups?.map((tag) => /* @__PURE__ */ React.createElement("span", { key: tag, className: "text-[10px] px-1.5 py-0.5 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium" }, tag)), guest.tags.affinity_groups?.map((tag) => /* @__PURE__ */ React.createElement("span", { key: tag, className: "text-[10px] px-1.5 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-800 dark:text-purple-200 rounded font-medium" }, tag)))),
          /* @__PURE__ */ React.createElement("td", { className: "p-3 text-sm text-gray-600 dark:text-gray-400" }, guest.node),
          /* @__PURE__ */ React.createElement("td", { className: "p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 px-2 py-1 text-xs rounded font-medium ${guest.status === "migrating" ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300" : guest.status === "running" ? "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300" : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"}`, title: guest.status.charAt(0).toUpperCase() + guest.status.slice(1) }, guest.status === "migrating" ? /* @__PURE__ */ React.createElement(Loader, { size: 12, className: "animate-spin" }) : guest.status === "running" ? /* @__PURE__ */ React.createElement(Play, { size: 12 }) : /* @__PURE__ */ React.createElement(Power, { size: 12 }), /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, guest.status)), canMigrate && /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: (e) => {
                e.stopPropagation(), setTagModalGuest(guest), setShowTagModal(!0);
              },
              className: "sm:hidden p-1 text-purple-500 hover:text-purple-400 hover:bg-purple-900/30 rounded transition-colors",
              title: "Manage tags"
            },
            /* @__PURE__ */ React.createElement(Tag, { size: 14 })
          ))),
          /* @__PURE__ */ React.createElement("td", { className: "hidden sm:table-cell p-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1" }, guest.tags.has_ignore && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 text-xs px-2 py-1 bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded font-medium" }, "ignore", canMigrate && /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => handleRemoveTag(guest, "ignore"),
              className: "hover:bg-yellow-300 dark:hover:bg-yellow-700 rounded-full p-0.5",
              title: "Remove ignore tag"
            },
            /* @__PURE__ */ React.createElement(X, { size: 12 })
          )), guest.tags.all_tags?.includes("auto_migrate_ok") && /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1 text-xs px-2 py-1 bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 rounded font-medium" }, "auto_migrate_ok", canMigrate && /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => handleRemoveTag(guest, "auto_migrate_ok"),
              className: "hover:bg-green-300 dark:hover:bg-green-700 rounded-full p-0.5",
              title: "Remove auto_migrate_ok tag"
            },
            /* @__PURE__ */ React.createElement(X, { size: 12 })
          )), guest.tags.exclude_groups.map((tag) => /* @__PURE__ */ React.createElement("span", { key: tag, className: "inline-flex items-center gap-1 text-xs px-2 py-1 bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 rounded font-medium" }, tag, canMigrate && /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => handleRemoveTag(guest, tag),
              className: "hover:bg-blue-300 dark:hover:bg-blue-700 rounded-full p-0.5",
              title: `Remove tag "${tag}"`
            },
            /* @__PURE__ */ React.createElement(X, { size: 12 })
          ))))),
          canMigrate && /* @__PURE__ */ React.createElement("td", { className: "hidden sm:table-cell p-3" }, /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => {
                setTagModalGuest(guest), setShowTagModal(!0);
              },
              className: "flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 hover:bg-purple-700 text-white rounded transition-colors",
              title: "Add tag"
            },
            /* @__PURE__ */ React.createElement(Plus, { size: 12 }),
            "Add"
          ))
        );
      }));
    })()))), (() => {
      let filteredGuestsCount = guestSearchFilter ? Object.values(data.guests).filter((guest) => {
        let searchLower = guestSearchFilter.toLowerCase();
        return guest.vmid.toString().includes(searchLower) || (guest.name || "").toLowerCase().includes(searchLower) || guest.node.toLowerCase().includes(searchLower) || guest.type.toLowerCase().includes(searchLower) || guest.status.toLowerCase().includes(searchLower);
      }).length : Object.keys(data.guests).length, totalPages = Math.ceil(filteredGuestsCount / guestPageSize);
      if (totalPages <= 1) return null;
      let startIndex = (guestCurrentPage - 1) * guestPageSize + 1, endIndex = Math.min(guestCurrentPage * guestPageSize, filteredGuestsCount);
      return /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "text-xs sm:text-sm text-gray-600 dark:text-gray-400" }, "Showing ", startIndex, "-", endIndex, " of ", filteredGuestsCount, " guests"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1 sm:gap-2" }, /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setGuestCurrentPage(1),
          disabled: guestCurrentPage === 1,
          className: "px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700",
          title: "First"
        },
        /* @__PURE__ */ React.createElement(ChevronsLeft, { size: 14, className: "sm:hidden" }),
        /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "First")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setGuestCurrentPage(guestCurrentPage - 1),
          disabled: guestCurrentPage === 1,
          className: "px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700",
          title: "Previous"
        },
        /* @__PURE__ */ React.createElement(ChevronLeft, { size: 14, className: "sm:hidden" }),
        /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Prev")
      ), /* @__PURE__ */ React.createElement("span", { className: "text-xs sm:text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" }, guestCurrentPage, " / ", totalPages), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setGuestCurrentPage(guestCurrentPage + 1),
          disabled: guestCurrentPage === totalPages,
          className: "px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700",
          title: "Next"
        },
        /* @__PURE__ */ React.createElement(ChevronRight, { size: 14, className: "sm:hidden" }),
        /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Next")
      ), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setGuestCurrentPage(totalPages),
          disabled: guestCurrentPage === totalPages,
          className: "px-2 sm:px-3 py-1 border border-gray-300 dark:border-gray-600 rounded text-xs sm:text-sm text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 dark:hover:bg-gray-700",
          title: "Last"
        },
        /* @__PURE__ */ React.createElement(ChevronsRight, { size: 14, className: "sm:hidden" }),
        /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Last")
      )));
    })())) : null;
  }

  // src/components/dashboard/DashboardHeader.jsx
  function DashboardHeader({
    data,
    darkMode,
    toggleDarkMode,
    setCurrentPage,
    dashboardHeaderCollapsed,
    setDashboardHeaderCollapsed,
    handleLogoHover,
    logoBalancing,
    clusterHealth,
    systemInfo,
    setShowUpdateModal,
    showBranchModal,
    setShowBranchModal,
    fetchBranches: fetchBranches2,
    recommendations
  }) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { onMouseEnter: handleLogoHover, className: logoBalancing ? "logo-balancing" : "transition-transform" }, /* @__PURE__ */ React.createElement(ProxBalanceLogo, { size: dashboardHeaderCollapsed ? 64 : 128 })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h1", { className: `font-bold bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 bg-clip-text text-transparent transition-all ${dashboardHeaderCollapsed ? "text-xl" : "text-2xl sm:text-3xl"}` }, "ProxBalance"), !dashboardHeaderCollapsed && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400" }, "Cluster Optimization"), dashboardHeaderCollapsed && data && data.nodes && (() => {
      let nodes = Object.values(data.nodes), totalCPU = (nodes.reduce((sum, node) => sum + (node.cpu_percent || 0), 0) / nodes.length).toFixed(1), totalMemory = (nodes.reduce((sum, node) => sum + (node.mem_percent || 0), 0) / nodes.length).toFixed(1), onlineNodes = nodes.filter((node) => node.status === "online").length;
      return /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 sm:gap-4 mt-1 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Nodes: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-green-600 dark:text-green-400" }, onlineNodes, "/", nodes.length)), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "CPU: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-blue-600 dark:text-blue-400" }, totalCPU, "%")), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "RAM: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-purple-600 dark:text-purple-400" }, totalMemory, "%")), clusterHealth && /* @__PURE__ */ React.createElement("span", { className: `flex items-center gap-1 ${clusterHealth.quorate ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`, title: clusterHealth.quorate ? "Cluster is quorate" : "Cluster NOT quorate!" }, clusterHealth.quorate ? /* @__PURE__ */ React.createElement(CheckCircle, { size: 14 }) : /* @__PURE__ */ React.createElement(AlertTriangle, { size: 14 }), /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Quorum")), systemInfo && /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => {
            fetchBranches2(), setShowBranchModal(!0);
          },
          className: "sm:hidden flex items-center gap-1 text-gray-500 dark:text-gray-500 hover:text-blue-600 dark:hover:text-blue-400",
          title: "Click to manage branches"
        },
        /* @__PURE__ */ React.createElement(GitBranch, { size: 12 }),
        /* @__PURE__ */ React.createElement("span", { className: "font-mono text-blue-600 dark:text-blue-400 underline decoration-dotted" }, systemInfo.branch?.length > 20 ? systemInfo.branch.substring(0, 20) + "..." : systemInfo.branch)
      ));
    })())), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3" }, systemInfo && systemInfo.updates_available && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowUpdateModal(!0),
        className: "flex items-center gap-2 px-4 py-2 bg-yellow-600 dark:bg-yellow-500 text-white rounded hover:bg-yellow-700 dark:hover:bg-yellow-600",
        title: `${systemInfo.commits_behind} update(s) available`
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 18 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline" }, "Update Available")
    ), /* @__PURE__ */ React.createElement(
      "a",
      {
        href: "https://github.com/Pr0zak/ProxBalance",
        target: "_blank",
        rel: "noopener noreferrer",
        className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
        title: "View on GitHub"
      },
      /* @__PURE__ */ React.createElement(GitHub, { size: 20, className: "text-gray-700 dark:text-gray-300" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: toggleDarkMode,
        className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
        title: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"
      },
      darkMode ? /* @__PURE__ */ React.createElement(Sun, { size: 20, className: "text-yellow-500" }) : /* @__PURE__ */ React.createElement(Moon, { size: 20, className: "text-gray-700" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCurrentPage("settings"),
        className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600",
        title: "Settings"
      },
      /* @__PURE__ */ React.createElement(Settings, { size: 20, className: "text-gray-700 dark:text-gray-300" })
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setDashboardHeaderCollapsed(!dashboardHeaderCollapsed),
        className: "p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
        title: dashboardHeaderCollapsed ? "Expand Header" : "Collapse Header"
      },
      dashboardHeaderCollapsed ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 22, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 22, className: "text-gray-600 dark:text-gray-400" })
    ))), !dashboardHeaderCollapsed && /* @__PURE__ */ React.createElement("div", { className: "px-6 pb-6" }, data && data.nodes && (() => {
      let nodes = Object.values(data.nodes), totalCPU = nodes.reduce((sum, node) => sum + (node.cpu_percent || 0), 0) / nodes.length, totalMemory = nodes.reduce((sum, node) => sum + (node.mem_percent || 0), 0) / nodes.length, totalIOWait = nodes.reduce((sum, node) => sum + (node.metrics?.current_iowait || 0), 0) / nodes.length, totalNodes = nodes.length, onlineNodes = nodes.filter((node) => node.status === "online").length;
      return /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5 mb-6 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-y-2 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md shrink-0" }, /* @__PURE__ */ React.createElement(Server, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h3", { className: "text-base sm:text-lg font-bold text-gray-900 dark:text-white" }, "Cluster Resource Utilization"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400" }, onlineNodes, " of ", totalNodes, " nodes online")))), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300" }, "CPU"), /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-bold text-blue-600 dark:text-blue-400" }, totalCPU.toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `h-3 rounded-full transition-all duration-500 ${totalCPU > 80 ? "bg-gradient-to-r from-red-500 to-red-600" : totalCPU > 60 ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gradient-to-r from-green-500 to-emerald-500"}`,
          style: { width: `${Math.min(100, totalCPU)}%` }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-gray-500 dark:text-gray-400" }, "Average across all nodes")), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300" }, "Memory"), /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-bold text-purple-600 dark:text-purple-400" }, totalMemory.toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `h-3 rounded-full transition-all duration-500 ${totalMemory > 80 ? "bg-gradient-to-r from-red-500 to-red-600" : totalMemory > 60 ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gradient-to-r from-purple-500 to-pink-500"}`,
          style: { width: `${Math.min(100, totalMemory)}%` }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-gray-500 dark:text-gray-400" }, "Average across all nodes")), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm font-semibold text-gray-700 dark:text-gray-300" }, "IOWait"), /* @__PURE__ */ React.createElement("span", { className: "text-2xl font-bold text-orange-600 dark:text-orange-400" }, totalIOWait.toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          className: `h-3 rounded-full transition-all duration-500 ${totalIOWait > 20 ? "bg-gradient-to-r from-red-500 to-red-600" : totalIOWait > 10 ? "bg-gradient-to-r from-yellow-500 to-orange-500" : "bg-gradient-to-r from-green-500 to-emerald-500"}`,
          style: { width: `${Math.min(100, totalIOWait)}%` }
        }
      )), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-xs text-gray-500 dark:text-gray-400" }, "Average across all nodes"))));
    })(), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 p-4 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(Server, { size: 20, className: "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-500" }, "Nodes")), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-blue-600 dark:text-blue-400" }, data.summary.total_nodes)), /* @__PURE__ */ React.createElement("div", { className: "bg-green-50 dark:bg-green-900/30 p-4 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(HardDrive, { size: 20, className: "text-green-600 dark:text-green-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-500" }, "Guests")), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-green-600 dark:text-green-400" }, data.summary.total_guests), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-500" }, data.summary.vms, " VMs, ", data.summary.containers, " CTs")), /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 dark:bg-yellow-900/30 p-4 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(Activity, { size: 20, className: "text-yellow-600 dark:text-yellow-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-500" }, "Recommendations")), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-yellow-600 dark:text-yellow-400" }, recommendations.length)), /* @__PURE__ */ React.createElement("div", { className: "bg-purple-50 dark:bg-purple-900/30 p-4 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 20, className: "text-purple-600 dark:text-purple-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-500" }, "Tagged")), /* @__PURE__ */ React.createElement("p", { className: "text-2xl font-bold text-purple-600 dark:text-purple-400" }, data.summary.ignored_guests + data.summary.excluded_guests)))));
  }

  // src/components/dashboard/ClusterMap.jsx
  function ClusterMap({
    data,
    collapsedSections,
    toggleSection,
    showPoweredOffGuests,
    setShowPoweredOffGuests,
    clusterMapViewMode,
    setClusterMapViewMode,
    maintenanceNodes,
    setSelectedNode,
    setSelectedGuestDetails,
    guestsMigrating,
    migrationProgress,
    completedMigrations
  }) {
    return data ? /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-y-3 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg shadow-md shrink-0" }, /* @__PURE__ */ React.createElement(Server, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg sm:text-2xl font-bold text-gray-900 dark:text-white" }, "Cluster Map"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5" }, "Visual cluster overview")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleSection("clusterMap"),
        className: "ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
        title: collapsedSections.clusterMap ? "Expand section" : "Collapse section"
      },
      collapsedSections.clusterMap ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 22, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 22, className: "text-gray-600 dark:text-gray-400" })
    )), !collapsedSections.clusterMap && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4 flex-wrap" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Show Powered Off:"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowPoweredOffGuests(!showPoweredOffGuests),
        className: `relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${showPoweredOffGuests ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`,
        title: showPoweredOffGuests ? "Click to hide powered off VMs/CTs" : "Click to show powered off VMs/CTs"
      },
      /* @__PURE__ */ React.createElement(
        "span",
        {
          className: `inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${showPoweredOffGuests ? "translate-x-6" : "translate-x-1"}`
        }
      )
    )), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-gray-600 dark:text-gray-400" }, "View by:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap rounded-lg bg-gray-100 dark:bg-gray-700 p-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setClusterMapViewMode("cpu"),
        className: `flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${clusterMapViewMode === "cpu" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`,
        title: "CPU"
      },
      /* @__PURE__ */ React.createElement(Cpu, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline ml-1" }, "CPU")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setClusterMapViewMode("memory"),
        className: `flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${clusterMapViewMode === "memory" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`,
        title: "Memory"
      },
      /* @__PURE__ */ React.createElement(MemoryStick, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline ml-1" }, "Memory")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setClusterMapViewMode("allocated"),
        className: `flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${clusterMapViewMode === "allocated" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`,
        title: "Allocated"
      },
      /* @__PURE__ */ React.createElement(Database, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline ml-1" }, "Allocated")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setClusterMapViewMode("disk_io"),
        className: `flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${clusterMapViewMode === "disk_io" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`,
        title: "Disk I/O"
      },
      /* @__PURE__ */ React.createElement(Zap, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline ml-1" }, "Disk I/O")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setClusterMapViewMode("network"),
        className: `flex items-center gap-0.5 px-3 py-1 text-sm rounded transition-colors ${clusterMapViewMode === "network" ? "bg-blue-600 text-white" : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"}`,
        title: "Network"
      },
      /* @__PURE__ */ React.createElement(Globe, { size: 14 }),
      /* @__PURE__ */ React.createElement("span", { className: "hidden sm:inline ml-1" }, "Network")
    )))), !collapsedSections.clusterMap && /* @__PURE__ */ React.createElement("div", { className: "relative", style: { minHeight: "400px" } }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-4 sm:gap-8 justify-center items-start py-8" }, Object.values(data.nodes).map((node) => {
      let allNodeGuests = Object.values(data.guests || {}).filter((g) => g.node === node.name), poweredOffCount = allNodeGuests.filter((g) => g.status !== "running").length, nodeGuests = showPoweredOffGuests ? allNodeGuests : allNodeGuests.filter((g) => g.status === "running"), maxResources = Math.max(...Object.values(data.guests || {}).filter(
        (g) => showPoweredOffGuests || g.status === "running"
      ).map((g) => {
        if (clusterMapViewMode === "cpu")
          return g.cpu_current || 0;
        if (clusterMapViewMode === "memory")
          return g.mem_max_gb > 0 ? (g.mem_used_gb || 0) / g.mem_max_gb * 100 : 0;
        if (clusterMapViewMode === "allocated") {
          let cpuCores = g.cpu_cores || 0, memGB = g.mem_max_gb || 0;
          return cpuCores + memGB;
        } else if (clusterMapViewMode === "disk_io") {
          let diskRead = (g.disk_read_bps || 0) / 1048576, diskWrite = (g.disk_write_bps || 0) / (1024 * 1024);
          return diskRead + diskWrite;
        } else if (clusterMapViewMode === "network") {
          let netIn = (g.net_in_bps || 0) / 1048576, netOut = (g.net_out_bps || 0) / (1024 * 1024);
          return netIn + netOut;
        } else
          return g.cpu_current || 0;
      }), 1);
      return /* @__PURE__ */ React.createElement("div", { key: node.name, className: "flex flex-col items-center gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "relative group" }, /* @__PURE__ */ React.createElement(
        "div",
        {
          onClick: () => setSelectedNode(node),
          className: `w-28 sm:w-32 rounded-lg border-4 flex flex-col items-center justify-between p-2 sm:p-2 cursor-pointer transition-all hover:shadow-xl hover:scale-105 ${maintenanceNodes.has(node.name) ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500 dark:border-yellow-600 hover:border-yellow-600 dark:hover:border-yellow-500" : node.status === "online" ? "bg-gray-50 dark:bg-gray-900 border-blue-500 dark:border-blue-600 hover:border-blue-600 dark:hover:border-blue-500" : "bg-gray-100 dark:bg-gray-800 border-gray-400 dark:border-gray-600"}`
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center z-10" }, /* @__PURE__ */ React.createElement(Server, { className: `w-5 h-5 sm:w-7 sm:h-7 ${maintenanceNodes.has(node.name) ? "text-yellow-600 dark:text-yellow-400" : node.status === "online" ? "text-blue-600 dark:text-blue-400" : "text-gray-500"}` }), /* @__PURE__ */ React.createElement("div", { className: "text-sm font-bold text-gray-900 dark:text-white mt-1" }, node.name), maintenanceNodes.has(node.name) && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-bold px-1.5 py-0.5 bg-yellow-500 text-white rounded mt-0.5" }, "MAINTENANCE"), /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-600 dark:text-gray-400" }, nodeGuests.length, " guests", !showPoweredOffGuests && poweredOffCount > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-500" }, " (+", poweredOffCount, " off)"))),
        /* @__PURE__ */ React.createElement("div", { className: "w-full space-y-1.5 z-10 mt-1.5" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] sm:text-xs mb-0.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400 font-medium" }, "CPU")), /* @__PURE__ */ React.createElement("div", { className: "w-full h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `h-full rounded-full transition-all duration-500 ${(node.cpu_percent || 0) > 80 ? "bg-red-500" : (node.cpu_percent || 0) > 60 ? "bg-yellow-500" : "bg-green-500"}`,
            style: { width: `${Math.min(100, node.cpu_percent || 0)}%` }
          }
        ))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] sm:text-xs mb-0.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400 font-medium" }, "MEM")), /* @__PURE__ */ React.createElement("div", { className: "w-full h-2.5 sm:h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden" }, /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `h-full rounded-full transition-all duration-500 ${(node.mem_percent || 0) > 80 ? "bg-red-500" : (node.mem_percent || 0) > 70 ? "bg-yellow-500" : "bg-blue-500"}`,
            style: { width: `${Math.min(100, node.mem_percent || 0)}%` }
          }
        ))))
      ), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white text-xs rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-sm mb-2 text-blue-400 border-b border-gray-700 pb-2" }, node.name), maintenanceNodes.has(node.name) && /* @__PURE__ */ React.createElement("div", { className: "text-yellow-400 font-bold bg-yellow-900/30 px-2 py-1 rounded mb-2" }, "\u{1F527} MAINTENANCE MODE"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "CPU:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-green-400" }, (node.cpu_percent || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Memory:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-blue-400" }, (node.mem_percent || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "IOWait:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-purple-400" }, (node.metrics?.current_iowait || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4 border-t border-gray-700 pt-1.5 mt-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Cores:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-orange-400" }, node.cpu_cores || 0))))), nodeGuests.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "w-0.5 h-8 bg-gradient-to-b from-blue-400 to-transparent dark:from-blue-600" }), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-3 justify-center max-w-xs" }, nodeGuests.map((guest) => {
        let cpuUsage = guest.cpu_current || 0, memPercent = guest.mem_max_gb > 0 ? (guest.mem_used_gb || 0) / guest.mem_max_gb * 100 : 0, resourceValue;
        if (clusterMapViewMode === "cpu")
          resourceValue = cpuUsage;
        else if (clusterMapViewMode === "memory")
          resourceValue = memPercent;
        else if (clusterMapViewMode === "allocated") {
          let cpuCores = guest.cpu_cores || 0, memGB = guest.mem_max_gb || 0;
          resourceValue = cpuCores + memGB;
        } else if (clusterMapViewMode === "disk_io") {
          let diskRead = (guest.disk_read_bps || 0) / 1048576, diskWrite = (guest.disk_write_bps || 0) / (1024 * 1024);
          resourceValue = diskRead + diskWrite;
        } else if (clusterMapViewMode === "network") {
          let netIn = (guest.net_in_bps || 0) / 1048576, netOut = (guest.net_out_bps || 0) / (1024 * 1024);
          resourceValue = netIn + netOut;
        } else
          resourceValue = cpuUsage;
        let sizeRatio = maxResources > 0 ? resourceValue / maxResources : 0.3, size = Math.max(30, Math.min(80, 30 + sizeRatio * 50)), getGuestColor = () => {
          let guestType = (guest.type || "").toUpperCase();
          return guestType === "CT" || guestType === "LXC" ? "bg-green-500 dark:bg-green-600" : guestType === "VM" || guestType === "QEMU" ? "bg-purple-500 dark:bg-purple-600" : "bg-gray-500 dark:bg-gray-600";
        }, isMigrating = guestsMigrating[guest.vmid] === !0, progress = migrationProgress[guest.vmid], isCompleted = completedMigrations[guest.vmid] !== void 0, isStopped = guest.status !== "running";
        return /* @__PURE__ */ React.createElement("div", { key: guest.vmid, className: "relative group" }, /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `rounded-full ${getGuestColor()} flex items-center justify-center text-white font-bold shadow-lg hover:shadow-xl transition-all cursor-pointer hover:ring-2 hover:ring-blue-400 ${isMigrating ? "animate-pulse ring-2 ring-yellow-400" : ""} ${isCompleted ? "ring-2 ring-green-400" : ""} ${isStopped ? "opacity-40" : ""}`,
            style: { width: `${size}px`, height: `${size}px`, fontSize: `${Math.max(10, size / 4)}px` },
            onClick: () => {
              isMigrating || setSelectedGuestDetails({ ...guest, currentNode: node.name });
            }
          },
          guest.vmid
        ), isMigrating && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" })), isCompleted && !isMigrating && /* @__PURE__ */ React.createElement("div", { className: "absolute -top-1 -right-1 bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-lg" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 })), guest.mount_points?.has_mount_points && !isMigrating && !isCompleted && /* @__PURE__ */ React.createElement(
          "div",
          {
            className: `absolute -top-0.5 -right-0.5 ${guest.mount_points.has_unshared_bind_mount ? "bg-orange-500" : "bg-cyan-400"} rounded-full w-3 h-3 shadow-lg ring-2 ring-white dark:ring-gray-800`,
            title: `${guest.mount_points.mount_count} mount point(s)${guest.mount_points.has_shared_mount ? " (shared - safe to migrate)" : " (requires manual migration)"}`
          }
        ), guest.local_disks?.is_pinned && !isMigrating && !isCompleted && /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "absolute -top-0.5 -left-0.5 bg-red-500 rounded-full w-3 h-3 shadow-lg ring-2 ring-white dark:ring-gray-800",
            title: `Cannot migrate: ${guest.local_disks.pinned_reason} (${guest.local_disks.total_pinned_disks} disk(s))`
          }
        ), /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-700 dark:to-gray-800 text-white text-xs rounded-lg shadow-2xl border border-gray-700 dark:border-gray-600 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none whitespace-nowrap z-10" }, /* @__PURE__ */ React.createElement("div", { className: "font-bold text-sm mb-2 text-blue-400 border-b border-gray-700 pb-2" }, guest.name || `Guest ${guest.vmid}`, /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-gray-400 font-normal text-xs" }, "(", (guest.type || "").toUpperCase() === "VM" || (guest.type || "").toUpperCase() === "QEMU" ? "VM" : "CT", ")")), isMigrating && /* @__PURE__ */ React.createElement("div", { className: "text-yellow-400 font-bold bg-yellow-900/30 px-2 py-1 rounded mb-2" }, "\u{1F504} Migrating... ", progress?.percentage ? `${progress.percentage}%` : ""), isCompleted && !isMigrating && /* @__PURE__ */ React.createElement("div", { className: "text-green-400 font-bold bg-green-900/30 px-2 py-1 rounded mb-2" }, "\u2713 Migration Complete"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, clusterMapViewMode === "allocated" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "CPU Cores:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-orange-400" }, guest.cpu_cores || 0)), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Memory Allocated:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-blue-400" }, (guest.mem_max_gb || 0).toFixed(1), " GB"))) : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "CPU Usage:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-green-400" }, cpuUsage.toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Memory Usage:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-blue-400" }, memPercent.toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", { className: "text-gray-400 text-xs ml-auto" }, "(", (guest.mem_used_gb || 0).toFixed(1), " / ", (guest.mem_max_gb || 0).toFixed(1), " GB)")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Status:"), /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${guest.status === "running" ? "text-green-400" : "text-gray-400"}` }, guest.status)), /* @__PURE__ */ React.createElement("div", { className: "border-t border-gray-700 pt-1.5 mt-1.5 space-y-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Disk Read:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-cyan-400" }, ((guest.disk_read_bps || 0) / (1024 * 1024)).toFixed(2), " MB/s")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Disk Write:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-cyan-400" }, ((guest.disk_write_bps || 0) / (1024 * 1024)).toFixed(2), " MB/s")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Net In:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-purple-400" }, ((guest.net_in_bps || 0) / (1024 * 1024)).toFixed(2), " MB/s")), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between gap-4" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300" }, "Net Out:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-purple-400" }, ((guest.net_out_bps || 0) / (1024 * 1024)).toFixed(2), " MB/s"))), guest.mount_points?.has_mount_points && /* @__PURE__ */ React.createElement("div", { className: `border-t border-gray-700 pt-1.5 mt-1.5 flex items-center gap-2 ${guest.mount_points.has_unshared_bind_mount ? "text-orange-400" : "text-green-400"} bg-gray-800/50 px-2 py-1 rounded` }, /* @__PURE__ */ React.createElement(Folder, { size: 14 }), /* @__PURE__ */ React.createElement("div", { className: "flex flex-col" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold" }, guest.mount_points.mount_count, " mount point", guest.mount_points.mount_count > 1 ? "s" : "", guest.mount_points.has_shared_mount && " (shared)", guest.mount_points.has_unshared_bind_mount && " (manual migration required)"))))));
      })));
    })), /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center gap-6 mt-6 text-xs text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-6 h-6 rounded-full bg-purple-500 dark:bg-purple-600" }), /* @__PURE__ */ React.createElement("span", null, "VM")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "w-6 h-6 rounded-full bg-green-500 dark:bg-green-600" }), /* @__PURE__ */ React.createElement("span", null, "Container")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, clusterMapViewMode === "cpu" ? "Circle size = CPU usage (%)" : clusterMapViewMode === "memory" ? "Circle size = Memory usage (%)" : clusterMapViewMode === "allocated" ? "Circle size = CPU cores + Memory allocated (GB)" : clusterMapViewMode === "disk_io" ? "Circle size = Disk I/O (Read + Write MB/s)" : clusterMapViewMode === "network" ? "Circle size = Network I/O (In + Out MB/s)" : "Circle size = CPU usage (%)"))))) : null;
  }

  // src/components/dashboard/NodeStatusSection.jsx
  function NodeStatusSection({
    data,
    collapsedSections,
    toggleSection,
    showPredicted,
    setShowPredicted,
    recommendationData,
    recommendations,
    nodeGridColumns,
    setNodeGridColumns,
    chartPeriod,
    setChartPeriod,
    nodeScores,
    generateSparkline
  }) {
    return /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-y-3 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-gradient-to-br from-cyan-600 to-blue-600 rounded-lg shadow-md shrink-0" }, /* @__PURE__ */ React.createElement(HardDrive, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg sm:text-2xl font-bold text-gray-900 dark:text-white" }, "Node Status"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5" }, "Detailed node metrics")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleSection("nodeStatus"),
        className: "ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
        title: collapsedSections.nodeStatus ? "Expand section" : "Collapse section"
      },
      collapsedSections.nodeStatus ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 22, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 22, className: "text-gray-600 dark:text-gray-400" })
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-3 sm:gap-4" }, recommendationData?.summary?.batch_impact && recommendations.length > 0 && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowPredicted(!showPredicted),
        className: `flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${showPredicted ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700" : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600"}`,
        title: "Show predicted node metrics after all recommended migrations"
      },
      /* @__PURE__ */ React.createElement(Eye, { size: 14 }),
      showPredicted ? "Showing Predicted" : "Show Predicted"
    ), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Grid:"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-1" }, [1, 2, 3, 4].map((cols) => /* @__PURE__ */ React.createElement(
      "button",
      {
        key: cols,
        onClick: () => setNodeGridColumns(cols),
        className: `px-3 py-1 text-sm rounded transition-colors ${nodeGridColumns === cols ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"}`,
        title: `${cols} column${cols > 1 ? "s" : ""}`
      },
      cols
    )))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Chart Period:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: chartPeriod,
        onChange: (e) => setChartPeriod(e.target.value),
        className: "px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
      },
      /* @__PURE__ */ React.createElement("option", { value: "1h" }, "1 Hour"),
      /* @__PURE__ */ React.createElement("option", { value: "6h" }, "6 Hours"),
      /* @__PURE__ */ React.createElement("option", { value: "12h" }, "12 Hours"),
      /* @__PURE__ */ React.createElement("option", { value: "24h" }, "24 Hours"),
      /* @__PURE__ */ React.createElement("option", { value: "7d" }, "7 Days"),
      /* @__PURE__ */ React.createElement("option", { value: "30d" }, "30 Days"),
      /* @__PURE__ */ React.createElement("option", { value: "1y" }, "1 Year")
    )))), collapsedSections.nodeStatus ? /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3" }, Object.values(data.nodes).map((node) => {
      let predicted = showPredicted && recommendationData?.summary?.batch_impact?.after?.node_scores?.[node.name], before = showPredicted && recommendationData?.summary?.batch_impact?.before?.node_scores?.[node.name];
      return /* @__PURE__ */ React.createElement("div", { key: node.name, className: `border rounded p-3 hover:shadow-md transition-shadow ${showPredicted && predicted ? "border-indigo-300 dark:border-indigo-600 ring-1 ring-indigo-200 dark:ring-indigo-800" : "border-gray-200 dark:border-gray-700"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-sm font-semibold text-gray-900 dark:text-white" }, node.name), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, showPredicted && predicted && before && /* @__PURE__ */ React.createElement("span", { className: `text-[9px] font-medium px-1 py-0.5 rounded ${predicted.cpu < before.cpu - 0.5 ? "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" : predicted.cpu > before.cpu + 0.5 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400" : "bg-gray-100 dark:bg-gray-700 text-gray-500"}` }, predicted.guest_count !== before.guest_count ? `${predicted.guest_count > before.guest_count ? "+" : ""}${predicted.guest_count - before.guest_count} guest${Math.abs(predicted.guest_count - before.guest_count) !== 1 ? "s" : ""}` : "no change"), /* @__PURE__ */ React.createElement("span", { className: `w-2 h-2 rounded-full ${node.status === "online" ? "bg-green-500" : "bg-red-500"}`, title: node.status }))), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center relative z-10" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400 flex items-center gap-0.5" }, "CPU:", (() => {
        let trend = node.metrics?.cpu_trend, ta = node.score_details?.trend_analysis || nodeScores?.[node.name]?.trend_analysis, dir = ta?.cpu_direction || trend;
        return dir === "sustained_increase" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-red-500", title: ta ? `CPU ${ta.cpu_rate_per_day > 0 ? "+" : ""}${ta.cpu_rate_per_day?.toFixed(1)}%/day` : "Rising fast" }) : dir === "rising" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-orange-400", title: ta ? `CPU ${ta.cpu_rate_per_day > 0 ? "+" : ""}${ta.cpu_rate_per_day?.toFixed(1)}%/day` : "Rising" }) : dir === "falling" || dir === "sustained_decrease" ? /* @__PURE__ */ React.createElement(TrendingDown, { size: 10, className: "text-green-500", title: "Falling" }) : null;
      })()), showPredicted && predicted ? /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 line-through mr-1" }, (node.cpu_percent || 0).toFixed(0), "%"), /* @__PURE__ */ React.createElement("span", { className: `${predicted.cpu < (node.cpu_percent || 0) - 0.5 ? "text-green-600 dark:text-green-400" : predicted.cpu > (node.cpu_percent || 0) + 0.5 ? "text-orange-600 dark:text-orange-400" : "text-blue-600 dark:text-blue-400"}` }, predicted.cpu.toFixed(1), "%")) : /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-blue-600 dark:text-blue-400" }, (node.cpu_percent || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-25", preserveAspectRatio: "none", viewBox: "0 0 100 100", style: { top: "-2px", height: "calc(100% + 4px)" } }, /* @__PURE__ */ React.createElement(
        "polyline",
        {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "4",
          className: "text-blue-500",
          points: generateSparkline(node.cpu_percent || 0, 100, 30, 0.3)
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center relative z-10" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400 flex items-center gap-0.5" }, "Memory:", (() => {
        let trend = node.metrics?.mem_trend, ta = node.score_details?.trend_analysis || nodeScores?.[node.name]?.trend_analysis, dir = ta?.mem_direction || trend;
        return dir === "sustained_increase" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-red-500", title: ta ? `Mem ${ta.mem_rate_per_day > 0 ? "+" : ""}${ta.mem_rate_per_day?.toFixed(1)}%/day` : "Rising fast" }) : dir === "rising" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-orange-400", title: "Rising" }) : dir === "falling" || dir === "sustained_decrease" ? /* @__PURE__ */ React.createElement(TrendingDown, { size: 10, className: "text-green-500", title: "Falling" }) : null;
      })()), showPredicted && predicted ? /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 line-through mr-1" }, (node.mem_percent || 0).toFixed(0), "%"), /* @__PURE__ */ React.createElement("span", { className: `${predicted.mem < (node.mem_percent || 0) - 0.5 ? "text-green-600 dark:text-green-400" : predicted.mem > (node.mem_percent || 0) + 0.5 ? "text-orange-600 dark:text-orange-400" : "text-purple-600 dark:text-purple-400"}` }, predicted.mem.toFixed(1), "%")) : /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-purple-600 dark:text-purple-400" }, (node.mem_percent || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-25", preserveAspectRatio: "none", viewBox: "0 0 100 100", style: { top: "-2px", height: "calc(100% + 4px)" } }, /* @__PURE__ */ React.createElement(
        "polyline",
        {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "4",
          className: "text-purple-500",
          points: generateSparkline(node.mem_percent || 0, 100, 30, 0.25)
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement("div", { className: "flex justify-between items-center relative z-10" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400 flex items-center gap-0.5" }, "IOWait:", (() => {
        let iowait = node.metrics?.current_iowait || 0, avgIowait = node.metrics?.avg_iowait || 0;
        return iowait > 30 ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-red-500", title: `IOWait ${iowait.toFixed(1)}% (critical)` }) : iowait > 15 && avgIowait > 10 ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-orange-400", title: `IOWait ${iowait.toFixed(1)}% (elevated, avg ${avgIowait.toFixed(1)}%)` }) : null;
      })()), /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${(node.metrics?.current_iowait || 0) > 30 ? "text-red-600 dark:text-red-400" : ((node.metrics?.current_iowait || 0) > 15, "text-orange-600 dark:text-orange-400")}` }, (node.metrics?.current_iowait || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("svg", { className: "absolute inset-0 w-full h-full opacity-25", preserveAspectRatio: "none", viewBox: "0 0 100 100", style: { top: "-2px", height: "calc(100% + 4px)" } }, /* @__PURE__ */ React.createElement(
        "polyline",
        {
          fill: "none",
          stroke: "currentColor",
          strokeWidth: "4",
          className: "text-orange-500",
          points: generateSparkline(node.metrics?.current_iowait || 0, 100, 30, 0.35)
        }
      ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between pt-1 border-t border-gray-200 dark:border-gray-600" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Suitability:"), /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${nodeScores && nodeScores[node.name] ? nodeScores[node.name].suitability_rating >= 70 ? "text-green-600 dark:text-green-400" : nodeScores[node.name].suitability_rating >= 50 ? "text-yellow-600 dark:text-yellow-400" : nodeScores[node.name].suitability_rating >= 30 ? "text-orange-600 dark:text-orange-400" : "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"}` }, nodeScores && nodeScores[node.name] ? `${nodeScores[node.name].suitability_rating}%` : "N/A")), nodeScores && nodeScores[node.name] && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-1 mt-0.5" }, nodeScores[node.name].trend_analysis?.stability_score != null && (() => {
        let s = nodeScores[node.name].trend_analysis.stability_score, label = s >= 80 ? "Stable" : s >= 60 ? "Moderate" : s >= 40 ? "Variable" : "Volatile", color = s >= 80 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : s >= 60 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : s >= 40 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300", factor = nodeScores[node.name].trend_analysis.cpu_stability_factor, factorTip = factor && factor !== 1 ? ` | CPU penalties ${factor < 1 ? `reduced ${Math.round((1 - factor) * 100)}%` : `inflated ${Math.round((factor - 1) * 100)}%`}` : "";
        return /* @__PURE__ */ React.createElement(
          "span",
          {
            className: `px-1.5 py-0 rounded text-[9px] font-medium ${color}`,
            title: `Stability: ${s}/100${factorTip}`
          },
          label
        );
      })(), nodeScores[node.name].overcommit_ratio > 0 && (() => {
        let oc = nodeScores[node.name].overcommit_ratio, committed = nodeScores[node.name].committed_mem_gb, color = oc > 1.2 ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : oc > 1 ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : oc > 0.85 ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" : "";
        return color ? /* @__PURE__ */ React.createElement(
          "span",
          {
            className: `px-1.5 py-0 rounded text-[9px] font-medium ${color}`,
            title: `Memory overcommit: ${(oc * 100).toFixed(0)}% (${committed?.toFixed(1) || "?"}GB committed)`
          },
          "OC ",
          (oc * 100).toFixed(0),
          "%"
        ) : null;
      })()), nodeScores && nodeScores[node.name] && nodeScores[node.name].penalty_categories && (() => {
        let cats = nodeScores[node.name].penalty_categories, total = cats.cpu + cats.memory + cats.iowait + cats.trends + cats.spikes;
        if (total === 0) return null;
        let segments = [
          { key: "cpu", value: cats.cpu, color: "bg-red-500", label: "CPU" },
          { key: "memory", value: cats.memory, color: "bg-blue-500", label: "Memory" },
          { key: "iowait", value: cats.iowait, color: "bg-orange-500", label: "IOWait" },
          { key: "trends", value: cats.trends, color: "bg-yellow-500", label: "Trends" },
          { key: "spikes", value: cats.spikes, color: "bg-purple-500", label: "Spikes" }
        ].filter((s) => s.value > 0);
        return /* @__PURE__ */ React.createElement("div", { className: "mt-1" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-500 dark:text-gray-400 mb-0.5" }, "Penalty Sources (", total, " pts)"), /* @__PURE__ */ React.createElement("div", { className: "flex h-1.5 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-600", title: segments.map((s) => `${s.label}: ${s.value}`).join(", ") }, segments.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.key, className: `${s.color}`, style: { width: `${s.value / total * 100}%` } }))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-x-2 mt-0.5" }, segments.map((s) => /* @__PURE__ */ React.createElement("span", { key: s.key, className: "text-[9px] text-gray-500 dark:text-gray-400 flex items-center gap-0.5" }, /* @__PURE__ */ React.createElement("span", { className: `inline-block w-1.5 h-1.5 rounded-full ${s.color}` }), s.label))));
      })(), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Guests:"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, node.guests?.length || 0))));
    })) : /* @__PURE__ */ React.createElement("div", { className: `grid gap-4 transition-all duration-300 ease-in-out ${nodeGridColumns === 1 ? "grid-cols-1" : nodeGridColumns === 2 ? "grid-cols-1 lg:grid-cols-2" : nodeGridColumns === 3 ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1 md:grid-cols-2 xl:grid-cols-4"}` }, Object.values(data.nodes).map((node) => /* @__PURE__ */ React.createElement("div", { key: node.name, className: "border border-gray-200 dark:border-gray-700 rounded p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, node.name), /* @__PURE__ */ React.createElement("span", { className: `text-sm font-medium ${node.status === "online" ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}` }, node.status)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 text-sm mb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "CPU:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-blue-600 dark:text-blue-400" }, (node.cpu_percent || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Memory:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-purple-600 dark:text-purple-400" }, (node.mem_percent || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "IOWait:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-orange-600 dark:text-orange-400" }, (node.metrics?.current_iowait || 0).toFixed(1), "%")), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Cores:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, node.cpu_cores || 0)), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, "Guests:"), " ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-900 dark:text-white" }, node.guests?.length || 0))), node.trend_data && typeof node.trend_data == "object" && Object.keys(node.trend_data).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-4", style: { height: "200px" } }, /* @__PURE__ */ React.createElement("canvas", { id: `chart-${node.name}` }))))));
  }

  // src/utils/useIsMobile.js
  var { useState: useState10, useEffect: useEffect3 } = React, useIsMobile = (breakpoint = 768) => {
    let [isMobile, setIsMobile] = useState10(
      typeof window < "u" && window.matchMedia(`(max-width: ${breakpoint}px)`).matches
    );
    return useEffect3(() => {
      let mql = window.matchMedia(`(max-width: ${breakpoint}px)`), handler = (e) => setIsMobile(e.matches);
      return mql.addEventListener("change", handler), () => mql.removeEventListener("change", handler);
    }, [breakpoint]), isMobile;
  }, useIsMobile_default = useIsMobile;

  // src/components/dashboard/recommendations/RecommendationSummaryBar.jsx
  function RecommendationSummaryBar({ recommendationData }) {
    if (!recommendationData?.summary) return null;
    let summary = recommendationData.summary;
    return /* @__PURE__ */ React.createElement("div", { className: `mb-4 rounded-lg border p-4 ${summary.urgency === "high" ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700" : summary.urgency === "medium" ? "bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700" : summary.urgency === "none" ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700" : "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Activity, { size: 18, className: summary.urgency === "high" ? "text-yellow-600 dark:text-yellow-400" : summary.urgency === "medium" ? "text-orange-600 dark:text-orange-400" : summary.urgency === "none" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-sm text-gray-900 dark:text-white" }, "Cluster Health: ", summary.cluster_health, "/100")), summary.urgency !== "none" && /* @__PURE__ */ React.createElement("span", { className: `text-xs px-2 py-0.5 rounded font-medium ${summary.urgency === "high" ? "bg-yellow-200 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200" : summary.urgency === "medium" ? "bg-orange-200 dark:bg-orange-800 text-orange-800 dark:text-orange-200" : "bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200"}` }, summary.urgency_label)), /* @__PURE__ */ React.createElement("div", { className: "w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: `h-2 rounded-full transition-all ${summary.cluster_health >= 70 ? "bg-green-500" : summary.cluster_health >= 50 ? "bg-yellow-500" : summary.cluster_health >= 30 ? "bg-orange-500" : "bg-red-500"}`,
        style: { width: `${summary.cluster_health}%` }
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", null, summary.total_recommendations, " migration", summary.total_recommendations !== 1 ? "s" : "", " recommended"), summary.reasons_breakdown?.length > 0 && /* @__PURE__ */ React.createElement("span", null, "(", summary.reasons_breakdown.join(", "), ")"), summary.total_improvement > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-medium" }, "+", summary.total_improvement.toFixed(0), " pts total improvement"), summary.predicted_health > summary.cluster_health && /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400" }, "Predicted health after: ", summary.predicted_health, "/100"), summary.convergence_message && /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-medium flex items-center gap-1" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }), " Converged")));
  }

  // src/components/dashboard/recommendations/AlertsBanner.jsx
  function AlertsBanner({
    recommendationData,
    collapsedSections,
    setCollapsedSections
  }) {
    let hasAdvisories = recommendationData?.capacity_advisories?.length > 0, hasConflicts = recommendationData?.conflicts?.length > 0, hasForecasts = recommendationData?.forecasts?.length > 0;
    return !hasAdvisories && !hasConflicts && !hasForecasts ? null : /* @__PURE__ */ React.createElement(React.Fragment, null, hasAdvisories && /* @__PURE__ */ React.createElement("div", { className: "mb-4 space-y-2" }, recommendationData.capacity_advisories.map((adv, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: `rounded-lg border p-3 text-sm ${adv.severity === "critical" ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200" : adv.severity === "warning" ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200" : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: `shrink-0 mt-0.5 ${adv.severity === "critical" ? "text-red-600 dark:text-red-400" : adv.severity === "warning" ? "text-yellow-600 dark:text-yellow-400" : "text-blue-600 dark:text-blue-400"}` }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-xs uppercase tracking-wide mb-0.5" }, adv.severity === "critical" ? "Critical" : adv.severity === "warning" ? "Warning" : "Info", ": ", adv.type.replace(/_/g, " ")), /* @__PURE__ */ React.createElement("div", null, adv.message), adv.suggestions?.length > 0 && /* @__PURE__ */ React.createElement("ul", { className: "mt-1 text-xs opacity-80 list-disc list-inside" }, adv.suggestions.map((s, j) => /* @__PURE__ */ React.createElement("li", { key: j }, s)))))))), hasConflicts && /* @__PURE__ */ React.createElement("div", { className: "mb-4 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-900/20 p-3 text-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 16, className: "text-orange-600 dark:text-orange-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-orange-800 dark:text-orange-200" }, "Migration Conflicts Detected (", recommendationData.conflicts.length, ")")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs text-orange-700 dark:text-orange-300" }, recommendationData.conflicts.map((c, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "p-2 bg-white dark:bg-gray-800/50 rounded border border-orange-200 dark:border-orange-800" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium mb-1" }, "Target: ", c.target_node, " \u2014 ", c.incoming_guests.length, " incoming migrations"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-1" }, c.exceeds_cpu && /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400" }, "Combined CPU: ", c.combined_predicted_cpu, "% (threshold: ", c.cpu_threshold, "%)"), c.exceeds_mem && /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400" }, "Combined Memory: ", c.combined_predicted_mem, "% (threshold: ", c.mem_threshold, "%)")), /* @__PURE__ */ React.createElement("div", { className: "italic" }, c.resolution))))), hasForecasts && /* @__PURE__ */ React.createElement("div", { className: "mb-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, forecastAlerts: !prev.forecastAlerts })),
        className: "flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors mb-2"
      },
      /* @__PURE__ */ React.createElement(ChevronDown, { size: 16, className: `transition-transform ${collapsedSections.forecastAlerts ? "" : "rotate-180"}` }),
      /* @__PURE__ */ React.createElement(Zap, { size: 14, className: "text-amber-500" }),
      "Trend Forecasts (",
      recommendationData.forecasts.length,
      ")",
      /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 dark:text-gray-500" }, "\u2014 Projected threshold crossings")
    ), !collapsedSections.forecastAlerts && /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, recommendationData.forecasts.map((fc, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: `flex items-start gap-3 p-3 rounded-lg border ${fc.severity === "critical" ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700" : fc.severity === "warning" ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700" : "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700"}` }, /* @__PURE__ */ React.createElement("div", { className: `shrink-0 p-1.5 rounded-full ${fc.severity === "critical" ? "bg-red-100 dark:bg-red-800" : fc.severity === "warning" ? "bg-amber-100 dark:bg-amber-800" : "bg-blue-100 dark:bg-blue-800"}` }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 14, className: fc.severity === "critical" ? "text-red-600 dark:text-red-400" : fc.severity === "warning" ? "text-amber-600 dark:text-amber-400" : "text-blue-600 dark:text-blue-400" })), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-sm text-gray-900 dark:text-white" }, fc.node), /* @__PURE__ */ React.createElement("span", { className: `px-1.5 py-0.5 text-[10px] font-bold rounded uppercase ${fc.severity === "critical" ? "bg-red-600 text-white" : fc.severity === "warning" ? "bg-amber-500 text-white" : "bg-blue-500 text-white"}` }, fc.severity), /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 uppercase" }, fc.metric)), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400 mb-1" }, fc.message), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-3 text-[10px] text-gray-500 dark:text-gray-500" }, /* @__PURE__ */ React.createElement("span", null, "Current: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, fc.current_value?.toFixed(1), "%")), /* @__PURE__ */ React.createElement("span", null, "Threshold: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, fc.threshold, "%")), /* @__PURE__ */ React.createElement("span", null, "Projected: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, fc.projected_value?.toFixed(1), "%")), fc.estimated_hours_to_crossing && /* @__PURE__ */ React.createElement("span", null, "ETA: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, "~", fc.estimated_hours_to_crossing < 24 ? `${fc.estimated_hours_to_crossing.toFixed(0)}h` : `${(fc.estimated_hours_to_crossing / 24).toFixed(1)}d`)), /* @__PURE__ */ React.createElement("span", null, "Rate: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, fc.trend_rate_per_day > 0 ? "+" : "", fc.trend_rate_per_day?.toFixed(1), "%/day")), /* @__PURE__ */ React.createElement("span", null, "Confidence: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, fc.confidence), " (R\xB2=", fc.r_squared?.toFixed(2), ")"))))))));
  }

  // src/components/dashboard/recommendations/RecommendationFilters.jsx
  function RecommendationFilters({
    recommendations,
    showRecFilters,
    setShowRecFilters,
    recFilterConfidence,
    setRecFilterConfidence,
    recFilterSourceNode,
    setRecFilterSourceNode,
    recFilterTargetNode,
    setRecFilterTargetNode,
    recSortBy,
    setRecSortBy,
    recSortDir,
    setRecSortDir
  }) {
    return recommendations.length ? /* @__PURE__ */ React.createElement("div", { className: "mb-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowRecFilters((prev) => !prev),
        className: "flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors mb-2"
      },
      /* @__PURE__ */ React.createElement(Filter, { size: 12 }),
      showRecFilters ? "Hide Filters" : "Filter & Sort",
      (recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && /* @__PURE__ */ React.createElement("span", { className: "ml-1 px-1.5 py-0.5 bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400 rounded text-[10px] font-medium" }, "Active")
    ), showRecFilters && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 mb-2" }, /* @__PURE__ */ React.createElement(
      "select",
      {
        value: recFilterConfidence,
        onChange: (e) => setRecFilterConfidence(e.target.value),
        className: "text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Min Confidence: Any"),
      /* @__PURE__ */ React.createElement("option", { value: "80" }, "\u2265 80%"),
      /* @__PURE__ */ React.createElement("option", { value: "60" }, "\u2265 60%"),
      /* @__PURE__ */ React.createElement("option", { value: "40" }, "\u2265 40%"),
      /* @__PURE__ */ React.createElement("option", { value: "20" }, "\u2265 20%")
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: recFilterSourceNode,
        onChange: (e) => setRecFilterSourceNode(e.target.value),
        className: "text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Source: All Nodes"),
      [...new Set(recommendations.map((r) => r.source_node))].sort().map((n) => /* @__PURE__ */ React.createElement("option", { key: n, value: n }, n))
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: recFilterTargetNode,
        onChange: (e) => setRecFilterTargetNode(e.target.value),
        className: "text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Target: All Nodes"),
      [...new Set(recommendations.map((r) => r.target_node))].sort().map((n) => /* @__PURE__ */ React.createElement("option", { key: n, value: n }, n))
    ), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: recSortBy,
        onChange: (e) => setRecSortBy(e.target.value),
        className: "text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300"
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Sort: Default"),
      /* @__PURE__ */ React.createElement("option", { value: "score_improvement" }, "Score Improvement"),
      /* @__PURE__ */ React.createElement("option", { value: "confidence_score" }, "Confidence"),
      /* @__PURE__ */ React.createElement("option", { value: "risk_score" }, "Risk Score"),
      /* @__PURE__ */ React.createElement("option", { value: "cost_benefit_ratio" }, "Cost-Benefit Ratio")
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setRecSortDir((d) => d === "desc" ? "asc" : "desc"),
        className: "text-xs px-2 py-1.5 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600",
        title: `Sort direction: ${recSortDir}`
      },
      recSortDir === "desc" ? "\u2193 Desc" : "\u2191 Asc"
    ), (recFilterConfidence || recFilterTargetNode || recFilterSourceNode || recSortBy) && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setRecFilterConfidence(""), setRecFilterTargetNode(""), setRecFilterSourceNode(""), setRecSortBy("");
        },
        className: "text-xs px-2 py-1.5 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
      },
      "Clear All"
    ))) : null;
  }

  // src/components/dashboard/recommendations/RecommendationCard.jsx
  function RecommendationCard({
    rec,
    idx,
    penaltyConfig,
    recommendationData,
    migrationStatus,
    setMigrationStatus,
    completedMigrations,
    guestsMigrating,
    migrationProgress,
    cancelMigration,
    setConfirmMigration,
    canMigrate,
    collapsedSections,
    setCollapsedSections
  }) {
    let key = `${rec.vmid}-${rec.target_node}`, status = migrationStatus[key], completed = completedMigrations[rec.vmid], isCompleted = completed !== void 0, isMaintenance = rec.reason && rec.reason.toLowerCase().includes("maintenance"), changeLog = recommendationData?.changes_since_last, isNewRec = changeLog?.new_recommendations?.some((r) => String(r.vmid) === String(rec.vmid)), changedTarget = changeLog?.changed_targets?.find((r) => String(r.vmid) === String(rec.vmid));
    return /* @__PURE__ */ React.createElement("div", { className: `border rounded p-4 transition-all duration-300 ${isCompleted ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75" : isMaintenance ? "border-yellow-400 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/10" : "border-gray-200 dark:border-gray-700"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 mb-1" }, /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${isCompleted ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-white"}` }, "[", rec.type, " ", rec.vmid, "] ", rec.name), rec.mount_point_info?.has_mount_points && /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `flex items-center gap-1 px-2 py-0.5 ${rec.mount_point_info.has_unshared_bind_mount ? "bg-orange-500" : "bg-green-500"} text-white text-[10px] font-bold rounded`,
        title: `${rec.mount_point_info.mount_count} mount point(s)${rec.mount_point_info.has_shared_mount ? " (shared - can migrate)" : " (requires manual migration)"}`
      },
      /* @__PURE__ */ React.createElement(Folder, { size: 10 }),
      rec.mount_point_info.mount_count,
      " MP"
    ), isMaintenance && !isCompleted && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-yellow-500 text-white text-[10px] font-bold rounded" }, "MAINTENANCE"), isNewRec && !isCompleted && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-green-500 text-white text-[10px] font-bold rounded" }, "NEW"), changedTarget && !isCompleted && /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "px-2 py-0.5 bg-indigo-500 text-white text-[10px] font-bold rounded",
        title: `Target changed from ${changedTarget.old_target} \u2192 ${changedTarget.new_target}`
      },
      "TARGET CHANGED"
    ), isCompleted && /* @__PURE__ */ React.createElement(CheckCircle, { size: 18, className: "text-green-600 dark:text-green-400" }), status === "failed" && /* @__PURE__ */ React.createElement(XCircle, { size: 18, className: "text-red-600 dark:text-red-400" })), /* @__PURE__ */ React.createElement("div", { className: `text-sm mt-1 flex items-center gap-2 flex-wrap ${isCompleted ? "text-green-600 dark:text-green-400" : ""}` }, isCompleted ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "MIGRATED:"), " ", rec.source_node, " \u2192 ", completed.newNode, " \u2713") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded font-semibold" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "FROM:"), /* @__PURE__ */ React.createElement("span", null, rec.source_node), rec.score_details?.source?.metrics && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-normal opacity-75 ml-0.5" }, "(", rec.score_details.source.metrics.current_cpu?.toFixed(0) || "?", "% CPU)"), rec.trend_evidence?.available && (() => {
      let dir = rec.trend_evidence.source_node_trend?.cpu_direction;
      return dir === "sustained_increase" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-red-600 ml-0.5", title: "CPU rising fast" }) : dir === "rising" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-orange-500 ml-0.5", title: "CPU rising" }) : dir === "falling" || dir === "sustained_decrease" ? /* @__PURE__ */ React.createElement(TrendingDown, { size: 10, className: "text-green-500 ml-0.5", title: "CPU falling" }) : null;
    })()), /* @__PURE__ */ React.createElement(ArrowRight, { size: 16, className: "text-gray-400 dark:text-gray-500" }), /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded font-semibold" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "TO:"), /* @__PURE__ */ React.createElement("span", null, rec.target_node), rec.score_details?.target?.metrics && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] font-normal opacity-75 ml-0.5" }, "(", rec.score_details.target.metrics.predicted_cpu?.toFixed(0) || "?", "% CPU)"), rec.trend_evidence?.available && (() => {
      let dir = rec.trend_evidence.target_node_trend?.cpu_direction;
      return dir === "sustained_increase" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-orange-500 ml-0.5", title: "CPU rising" }) : dir === "rising" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 10, className: "text-yellow-500 ml-0.5", title: "CPU rising slightly" }) : dir === "falling" || dir === "sustained_decrease" ? /* @__PURE__ */ React.createElement(TrendingDown, { size: 10, className: "text-green-500 ml-0.5", title: "CPU falling" }) : /* @__PURE__ */ React.createElement(Minus, { size: 10, className: "text-gray-400 ml-0.5", title: "CPU stable" });
    })()), rec.score_improvement !== void 0 && (() => {
      let pct = Math.min(100, rec.score_improvement / 80 * 100), barColor = rec.score_improvement >= 50 ? "bg-green-500" : rec.score_improvement >= 30 ? "bg-yellow-500" : rec.score_improvement >= (penaltyConfig?.min_score_improvement || 15) ? "bg-orange-500" : "bg-red-500";
      return /* @__PURE__ */ React.createElement("span", { className: "inline-flex items-center gap-1.5 min-w-[120px]", title: `Score improvement: +${rec.score_improvement.toFixed(1)} penalty points` }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-400" }, "+", rec.score_improvement.toFixed(0)), /* @__PURE__ */ React.createElement("span", { className: "flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden min-w-[60px]" }, /* @__PURE__ */ React.createElement("span", { className: `block h-full rounded-full ${barColor} transition-all`, style: { width: `${pct}%` } })));
    })())), /* @__PURE__ */ React.createElement("div", { className: `text-xs mt-1 ${isCompleted ? "text-green-600 dark:text-green-400" : "text-gray-600 dark:text-gray-400"}` }, rec.structured_reason ? /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: `font-medium ${isMaintenance ? "text-yellow-600 dark:text-yellow-400" : rec.structured_reason.primary_reason === "iowait_relief" ? "text-orange-600 dark:text-orange-400" : ""}` }, rec.structured_reason.primary_label), rec.structured_reason.primary_reason === "iowait_relief" && /* @__PURE__ */ React.createElement("span", { className: "ml-1 px-1.5 py-0 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-[10px] font-bold rounded", title: "Migration triggered by sustained high I/O wait on source node" }, "I/O"), rec.structured_reason.contributing_factors?.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-gray-500 dark:text-gray-500" }, "\u2014 ", rec.structured_reason.contributing_factors.slice(0, 3).map((f) => f.label).join("; ")), /* @__PURE__ */ React.createElement("span", { className: "ml-2" }, "| ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Memory:"), " ", (rec.mem_gb || 0).toFixed(1), " GB"), rec.confidence_score !== void 0 && /* @__PURE__ */ React.createElement("span", { className: "ml-2 inline-flex items-center gap-1", title: `Confidence: ${rec.confidence_score}%` }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "|"), /* @__PURE__ */ React.createElement("span", { className: "inline-flex gap-0.5" }, [20, 40, 60, 80, 100].map((threshold) => /* @__PURE__ */ React.createElement("span", { key: threshold, className: `w-1.5 h-1.5 rounded-full ${rec.confidence_score >= threshold ? rec.confidence_score >= 70 ? "bg-green-500" : rec.confidence_score >= 40 ? "bg-yellow-500" : "bg-orange-500" : "bg-gray-300 dark:bg-gray-600"}` }))), /* @__PURE__ */ React.createElement("span", { className: `font-semibold text-[10px] ${rec.confidence_score >= 70 ? "text-green-600 dark:text-green-400" : rec.confidence_score >= 40 ? "text-yellow-600 dark:text-yellow-400" : "text-orange-600 dark:text-orange-400"}` }, rec.confidence_score, "%"))) : /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Reason:"), " ", /* @__PURE__ */ React.createElement("span", { className: isMaintenance ? "font-bold text-yellow-600 dark:text-yellow-400" : "" }, rec.reason), " | ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Memory:"), " ", (rec.mem_gb || 0).toFixed(1), " GB"), rec.ai_confidence_adjustment && rec.ai_confidence_adjustment !== 0 && /* @__PURE__ */ React.createElement("span", { className: "ml-2", title: "AI-adjusted confidence modification" }, "| ", /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "AI Adjustment:"), " ", /* @__PURE__ */ React.createElement("span", { className: `font-semibold ${rec.ai_confidence_adjustment > 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}` }, rec.ai_confidence_adjustment > 0 ? "+" : "", rec.ai_confidence_adjustment))), !isCompleted && (rec.risk_level || rec.has_conflict) && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 mt-1" }, rec.risk_level && /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rec.risk_level === "very_high" ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300" : rec.risk_level === "high" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : rec.risk_level === "moderate" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"}`, title: rec.risk_factors?.map((f) => f.detail).join(`
`) || "" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 10 }), "Risk: ", rec.risk_level === "very_high" ? "Very High" : rec.risk_level.charAt(0).toUpperCase() + rec.risk_level.slice(1), "(", rec.risk_score, "/100)"), rec.has_conflict && /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
        title: `Multiple migrations targeting ${rec.conflict_target} \u2014 combined load may exceed thresholds`
      },
      /* @__PURE__ */ React.createElement(XCircle, { size: 10 }),
      "Target Conflict"
    ), rec.cost_benefit && rec.cost_benefit.ratio != null && /* @__PURE__ */ React.createElement("span", { className: `inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${rec.cost_benefit.ratio >= 2 ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : rec.cost_benefit.ratio >= 1 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}`, title: `Cost-benefit ratio: ${rec.cost_benefit.ratio.toFixed(1)}x \u2014 Score improvement: +${rec.cost_benefit.score_improvement?.toFixed(0) || "?"} pts, Est. duration: ${rec.cost_benefit.estimated_duration_minutes?.toFixed(0) || "?"} min` }, "ROI: ", rec.cost_benefit.ratio.toFixed(1), "x")), rec.ai_insight && /* @__PURE__ */ React.createElement("div", { className: "mt-2 p-2 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700 rounded text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-purple-600 dark:text-purple-400 font-semibold shrink-0" }, "AI:"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300" }, rec.ai_insight))), rec.bind_mount_warning && /* @__PURE__ */ React.createElement("div", { className: `mt-2 p-2 ${rec.mount_point_info?.has_unshared_bind_mount ? "bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-300 dark:border-orange-700" : "bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border border-green-300 dark:border-green-700"} rounded text-xs` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(Folder, { size: 14, className: `shrink-0 ${rec.mount_point_info?.has_unshared_bind_mount ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}` }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-300" }, rec.bind_mount_warning))), rec.decision_explanation && /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 text-xs text-gray-600 dark:text-gray-400 italic" }, rec.decision_explanation), (rec.score_details || rec.trend_evidence?.available) && !isCompleted && /* @__PURE__ */ React.createElement("div", { className: "mt-1" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          let detailsKey = `details-${idx}`;
          setCollapsedSections((prev) => ({ ...prev, [detailsKey]: !prev[detailsKey] }));
        },
        className: "text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
      },
      /* @__PURE__ */ React.createElement(Activity, { size: 12 }),
      collapsedSections[`details-${idx}`] ? "Hide details" : "Why this migration?"
    ), collapsedSections[`details-${idx}`] && /* @__PURE__ */ React.createElement("div", { className: "mt-2 p-3 bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border border-indigo-200 dark:border-indigo-700 rounded text-xs space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-red-600 dark:text-red-400 mb-1 flex items-center gap-1" }, "Source: ", rec.source_node, rec.trend_evidence?.available && (() => {
      let dir = rec.trend_evidence.source_node_trend?.cpu_direction;
      return dir === "sustained_increase" || dir === "rising" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 12, className: "text-red-500" }) : dir === "sustained_decrease" || dir === "falling" ? /* @__PURE__ */ React.createElement(TrendingDown, { size: 12, className: "text-green-500" }) : /* @__PURE__ */ React.createElement(Minus, { size: 12, className: "text-gray-400" });
    })()), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5 text-gray-600 dark:text-gray-400" }, rec.score_details && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, "Score: ", rec.score_details.source?.total_score?.toFixed(1) || "N/A"), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500" }, "Penalties:"), Object.entries(rec.score_details.source?.penalties || {}).filter(([, v]) => v > 0).map(([key2, val]) => /* @__PURE__ */ React.createElement("div", { key: key2, className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, key2.replace(/_/g, " ")), /* @__PURE__ */ React.createElement("span", { className: "text-red-500 dark:text-red-400 font-mono" }, "+", val))), Object.values(rec.score_details.source?.penalties || {}).every((v) => v === 0) && /* @__PURE__ */ React.createElement("div", { className: "text-green-600 dark:text-green-400" }, "No penalties")), rec.trend_evidence?.available && /* @__PURE__ */ React.createElement("div", { className: rec.score_details ? "mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-700/50" : "" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-0.5" }, "Trends:"), /* @__PURE__ */ React.createElement("div", null, "CPU: ", rec.trend_evidence.source_node_trend?.cpu_trend || "N/A"), /* @__PURE__ */ React.createElement("div", null, "Memory: ", rec.trend_evidence.source_node_trend?.mem_trend || "N/A"), /* @__PURE__ */ React.createElement("div", null, "Stability: ", rec.trend_evidence.source_node_trend?.stability_score || "?", "/100"), rec.trend_evidence.source_node_trend?.above_baseline && /* @__PURE__ */ React.createElement("div", { className: "text-orange-600 dark:text-orange-400 font-medium" }, "Above baseline (", rec.trend_evidence.source_node_trend.baseline_deviation_sigma?.toFixed(1) || "?", "\u03C3)")))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-green-600 dark:text-green-400 mb-1 flex items-center gap-1" }, "Target: ", rec.target_node, rec.trend_evidence?.available && (() => {
      let dir = rec.trend_evidence.target_node_trend?.cpu_direction;
      return dir === "sustained_increase" || dir === "rising" ? /* @__PURE__ */ React.createElement(TrendingUp, { size: 12, className: "text-orange-500" }) : dir === "sustained_decrease" || dir === "falling" ? /* @__PURE__ */ React.createElement(TrendingDown, { size: 12, className: "text-green-500" }) : /* @__PURE__ */ React.createElement(Minus, { size: 12, className: "text-gray-400" });
    })()), /* @__PURE__ */ React.createElement("div", { className: "space-y-0.5 text-gray-600 dark:text-gray-400" }, rec.score_details && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", null, "Score: ", rec.score_details.target?.total_score?.toFixed(1) || "N/A"), /* @__PURE__ */ React.createElement("div", { className: "text-[10px] mt-1 font-medium text-gray-500 dark:text-gray-500" }, "Penalties:"), Object.entries(rec.score_details.target?.penalties || {}).filter(([, v]) => v > 0).map(([key2, val]) => /* @__PURE__ */ React.createElement("div", { key: key2, className: "flex justify-between" }, /* @__PURE__ */ React.createElement("span", null, key2.replace(/_/g, " ")), /* @__PURE__ */ React.createElement("span", { className: "text-red-500 dark:text-red-400 font-mono" }, "+", val))), Object.values(rec.score_details.target?.penalties || {}).every((v) => v === 0) && /* @__PURE__ */ React.createElement("div", { className: "text-green-600 dark:text-green-400" }, "No penalties")), rec.trend_evidence?.available && /* @__PURE__ */ React.createElement("div", { className: rec.score_details ? "mt-2 pt-2 border-t border-indigo-200/50 dark:border-indigo-700/50" : "" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-0.5" }, "Trends:"), /* @__PURE__ */ React.createElement("div", null, "CPU: ", rec.trend_evidence.target_node_trend?.cpu_trend || "N/A"), /* @__PURE__ */ React.createElement("div", null, "Memory: ", rec.trend_evidence.target_node_trend?.mem_trend || "N/A"), /* @__PURE__ */ React.createElement("div", null, "Stability: ", rec.trend_evidence.target_node_trend?.stability_score || "?", "/100"))))), rec.score_details?.target?.metrics && /* @__PURE__ */ React.createElement("div", { className: "pt-2 border-t border-indigo-200 dark:border-indigo-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] font-medium text-gray-500 dark:text-gray-500 mb-1" }, "After migration on ", rec.target_node, ":"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", null, "CPU: ", rec.score_details.target.metrics.predicted_cpu, "%"), /* @__PURE__ */ React.createElement("span", null, "Memory: ", rec.score_details.target.metrics.predicted_mem, "%"), /* @__PURE__ */ React.createElement("span", null, "Headroom: ", rec.score_details.target.metrics.cpu_headroom, "% CPU, ", rec.score_details.target.metrics.mem_headroom, "% mem"))), rec.score_details && (rec.score_details.target?.trend_analysis || rec.score_details.source?.trend_analysis) && /* @__PURE__ */ React.createElement("div", { className: "pt-2 border-t border-indigo-200 dark:border-indigo-700 flex flex-wrap gap-2" }, rec.score_details.source?.trend_analysis?.cpu_stability_factor != null && rec.score_details.source.trend_analysis.cpu_stability_factor !== 1 && /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "text-[10px] px-1.5 py-0.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded text-gray-600 dark:text-gray-400",
        title: `Source CPU penalties scaled by ${rec.score_details.source.trend_analysis.cpu_stability_factor}x based on stability score ${rec.score_details.source.trend_analysis.stability_score}`
      },
      "Source CPU factor: ",
      rec.score_details.source.trend_analysis.cpu_stability_factor,
      "x"
    ), rec.score_details.target?.trend_analysis?.cpu_stability_factor != null && rec.score_details.target.trend_analysis.cpu_stability_factor !== 1 && /* @__PURE__ */ React.createElement(
      "span",
      {
        className: "text-[10px] px-1.5 py-0.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded text-gray-600 dark:text-gray-400",
        title: `Target CPU penalties scaled by ${rec.score_details.target.trend_analysis.cpu_stability_factor}x based on stability score ${rec.score_details.target.trend_analysis.stability_score}`
      },
      "Target CPU factor: ",
      rec.score_details.target.trend_analysis.cpu_stability_factor,
      "x"
    )), rec.trend_evidence?.guest_trend && /* @__PURE__ */ React.createElement("div", { className: "pt-2 border-t border-indigo-200 dark:border-indigo-700" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Guest Behavior"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `px-2 py-0.5 rounded text-[10px] font-bold ${rec.trend_evidence.guest_trend.behavior === "growing" ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300" : rec.trend_evidence.guest_trend.behavior === "bursty" ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300" : rec.trend_evidence.guest_trend.behavior === "steady" ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"}` }, rec.trend_evidence.guest_trend.behavior || "unknown"), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "CPU: ", rec.trend_evidence.guest_trend.cpu_growth_rate || "N/A"), rec.trend_evidence.guest_trend.previous_migrations > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "| Migrated ", rec.trend_evidence.guest_trend.previous_migrations, "x before"), rec.trend_evidence.guest_trend.peak_hours?.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "| Peak hours: ", rec.trend_evidence.guest_trend.peak_hours.map((h) => `${h}:00`).join(", ")))), rec.trend_evidence?.decision_factors?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "pt-2 border-t border-indigo-200 dark:border-indigo-700" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-gray-700 dark:text-gray-300 mb-1" }, "Decision Factors"), /* @__PURE__ */ React.createElement("div", { className: "space-y-1" }, rec.trend_evidence.decision_factors.map((f, i) => /* @__PURE__ */ React.createElement("div", { key: i, className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement("span", { className: `shrink-0 w-1.5 h-1.5 rounded-full mt-1.5 ${f.type === "problem" ? "bg-red-500" : f.type === "positive" ? "bg-green-500" : f.type === "concern" ? "bg-yellow-500" : "bg-gray-400"}` }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, f.factor, f.weight === "high" && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-[9px] font-bold text-gray-400 dark:text-gray-500" }, "(HIGH)")))))), rec.trend_evidence?.data_quality && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-400 dark:text-gray-500 pt-1" }, "Based on ", rec.trend_evidence.data_quality.node_history_days || 0, " days of node history,", " ", rec.trend_evidence.data_quality.guest_history_days || 0, " days of guest history.", " ", rec.trend_evidence.data_quality.confidence_note))), /* @__PURE__ */ React.createElement("div", { className: "mt-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: (e) => {
          e.stopPropagation();
          let commandKey = `command-${idx}`;
          setCollapsedSections((prev) => ({ ...prev, [commandKey]: !prev[commandKey] }));
        },
        className: "text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
      },
      /* @__PURE__ */ React.createElement(Terminal, { size: 12 }),
      collapsedSections[`command-${idx}`] ? "Hide command" : "Show command"
    )), collapsedSections[`command-${idx}`] && /* @__PURE__ */ React.createElement(
      "div",
      {
        onClick: (e) => {
          e.stopPropagation(), navigator.clipboard.writeText(rec.command);
          let btn = e.currentTarget, originalText = btn.textContent;
          btn.textContent = "Copied!", btn.classList.add("bg-green-100", "dark:bg-green-900"), setTimeout(() => {
            btn.textContent = originalText, btn.classList.remove("bg-green-100", "dark:bg-green-900");
          }, 1e3);
        },
        className: `text-xs font-mono p-2 rounded mt-1 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all ${isCompleted ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" : "bg-gray-100 dark:bg-gray-900 text-gray-700 dark:text-gray-300"}`,
        title: "Click to copy"
      },
      rec.command
    ))), /* @__PURE__ */ React.createElement("div", { className: "sm:ml-4 flex items-center gap-2 shrink-0" }, (() => {
      if (isCompleted)
        return /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 16 }), "Migrated"), canMigrate && /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: async () => {
              try {
                let { fetchRollbackInfo: fetchRollbackInfo2, executeRollback: executeRollback2 } = await import("../../api/client.js"), infoRes = await fetchRollbackInfo2(rec.vmid);
                if (infoRes.error || !infoRes.success) {
                  setMigrationStatus((prev) => ({ ...prev, [`rollback-${rec.vmid}`]: "unavailable" }));
                  return;
                }
                let info = infoRes.rollback_info;
                if (!info.available) {
                  alert(`Rollback unavailable: ${info.detail}`);
                  return;
                }
                if (!info.rollback_safe && !confirm(`Rollback may be risky: ${info.detail}

Proceed anyway?`) || !confirm(`Rollback ${rec.type} ${rec.vmid} (${rec.name}) back to ${info.original_node}?`)) return;
                setMigrationStatus((prev) => ({ ...prev, [`rollback-${rec.vmid}`]: "running" }));
                let result = await executeRollback2(rec.vmid);
                result.success ? setMigrationStatus((prev) => ({ ...prev, [`rollback-${rec.vmid}`]: "done" })) : (alert(`Rollback failed: ${result.error || "Unknown error"}`), setMigrationStatus((prev) => ({ ...prev, [`rollback-${rec.vmid}`]: "failed" })));
              } catch (err) {
                alert(`Rollback error: ${err.message}`);
              }
            },
            disabled: migrationStatus[`rollback-${rec.vmid}`] === "running",
            className: "px-3 py-2 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex items-center gap-1 transition-colors",
            title: "Rollback: migrate back to original node"
          },
          migrationStatus[`rollback-${rec.vmid}`] === "running" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Rolling back...") : migrationStatus[`rollback-${rec.vmid}`] === "done" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(CheckCircle, { size: 12 }), " Rolled back") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RotateCcw, { size: 12 }), " Rollback")
        ));
      let isMigrating = guestsMigrating[rec.vmid] === !0;
      if (isMigrating && canMigrate) {
        let progress = migrationProgress[rec.vmid], progressText = "", tooltipText = "Cancel migration in progress";
        return progress && (progress.percentage ? (progressText = ` ${progress.percentage}%`, progress.total_human_readable && (tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`)) : progressText = ` (${progress.human_readable})`), /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => cancelMigration(rec.vmid, rec.target_node),
            className: "px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse",
            title: tooltipText
          },
          /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }),
          "Cancel",
          progressText
        );
      }
      return /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: () => setConfirmMigration(rec),
          disabled: !canMigrate || status === "running" || isMigrating,
          className: "px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2",
          title: canMigrate ? isMigrating ? "Migration in progress" : "" : "Read-only API token (PVEAuditor) - Cannot perform migrations"
        },
        canMigrate ? isMigrating ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }), " Migrating...") : status === "running" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }), " Starting...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Play, { size: 16 }), " Migrate") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Lock, { size: 16 }), " Read-Only")
      );
    })())));
  }

  // src/components/dashboard/recommendations/SkippedGuests.jsx
  function SkippedGuests({
    recommendationData,
    penaltyConfig,
    collapsedSections,
    setCollapsedSections
  }) {
    return recommendationData?.skipped_guests?.length ? /* @__PURE__ */ React.createElement("div", { className: "mt-4" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setCollapsedSections((prev) => ({ ...prev, skippedGuests: !prev.skippedGuests })),
        className: "flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
      },
      /* @__PURE__ */ React.createElement(
        ChevronDown,
        {
          size: 16,
          className: `transition-transform ${collapsedSections.skippedGuests ? "" : "rotate-180"}`
        }
      ),
      /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Not Recommended (", recommendationData.skipped_guests.length, " guests evaluated)"),
      /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 dark:text-gray-500" }, "\u2014 Why weren't these guests recommended?")
    ), !collapsedSections.skippedGuests && /* @__PURE__ */ React.createElement("div", { className: "mt-2 space-y-1" }, recommendationData.skipped_guests.slice(0, 20).map((skipped, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "flex items-start gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("span", { className: `shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center rounded-full text-[9px] font-bold ${skipped.reason === "insufficient_improvement" ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400" : skipped.reason === "ha_managed" ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400" : skipped.reason === "no_suitable_target" ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400" : "bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400"}` }, skipped.reason === "insufficient_improvement" ? "~" : skipped.reason === "ha_managed" ? "H" : skipped.reason === "no_suitable_target" ? "!" : skipped.reason === "stopped" ? "S" : skipped.reason === "passthrough_disk" ? "P" : skipped.reason === "has_ignore_tag" ? "I" : skipped.reason === "unshared_bind_mount" ? "B" : "?"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "[", skipped.type, " ", skipped.vmid, "] ", skipped.name), /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 dark:text-gray-500 ml-1" }, "on ", skipped.node), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-2" }, "\u2014 ", skipped.detail), skipped.score_improvement !== void 0 && /* @__PURE__ */ React.createElement("span", { className: "ml-1 text-yellow-600 dark:text-yellow-400 font-mono" }, "(+", skipped.score_improvement, " pts, need ", penaltyConfig?.min_score_improvement || 15, ")")))), recommendationData.skipped_guests.length > 20 && /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 text-center py-1" }, "...and ", recommendationData.skipped_guests.length - 20, " more"))) : null;
  }

  // src/components/dashboard/recommendations/insights/ScoringExplainer.jsx
  function ScoringExplainer({ penaltyConfig, setCurrentPage, setOpenPenaltyConfigOnAutomation }) {
    return /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-700 dark:text-gray-300" }, "ProxBalance uses a penalty-based scoring system to evaluate every guest on every node. Migrations are recommended when moving a guest would improve its suitability rating by ", /* @__PURE__ */ React.createElement("span", { className: "font-bold" }, penaltyConfig?.min_score_improvement || 15, "+ points"), "."), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h5", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5" }, "Suitability Rating Scale"), /* @__PURE__ */ React.createElement("div", { className: "flex rounded overflow-hidden h-5 mb-1" }, /* @__PURE__ */ React.createElement("div", { className: "bg-red-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold" }, "0-30"), /* @__PURE__ */ React.createElement("div", { className: "bg-orange-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold" }, "30-50"), /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold" }, "50-70"), /* @__PURE__ */ React.createElement("div", { className: "bg-green-500 flex-1 flex items-center justify-center text-white text-[10px] font-bold" }, "70-100")), /* @__PURE__ */ React.createElement("div", { className: "flex text-[10px] text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-center" }, "Poor"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-center" }, "Fair"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-center" }, "Good"), /* @__PURE__ */ React.createElement("div", { className: "flex-1 text-center" }, "Excellent"))), /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-gray-100 dark:bg-gray-700/50 rounded" }, /* @__PURE__ */ React.createElement("h5", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1" }, "Your Configuration"), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", null, "CPU weight: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, "30%")), /* @__PURE__ */ React.createElement("span", null, "Memory weight: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, "30%")), /* @__PURE__ */ React.createElement("span", null, "IOWait weight: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, "20%")), /* @__PURE__ */ React.createElement("span", null, "Other factors: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, "20%")), /* @__PURE__ */ React.createElement("span", null, "Current period: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, penaltyConfig ? (penaltyConfig.weight_current * 100).toFixed(0) : "50", "%")), /* @__PURE__ */ React.createElement("span", null, "24h average: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, penaltyConfig ? (penaltyConfig.weight_24h * 100).toFixed(0) : "30", "%")), /* @__PURE__ */ React.createElement("span", null, "7-day average: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, penaltyConfig ? (penaltyConfig.weight_7d * 100).toFixed(0) : "20", "%")), /* @__PURE__ */ React.createElement("span", null, "Min improvement: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, penaltyConfig?.min_score_improvement || 15, " pts")))), /* @__PURE__ */ React.createElement("ul", { className: "ml-4 space-y-1 text-gray-600 dark:text-gray-400 text-xs list-disc" }, /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Penalties applied for:"), " High CPU/memory/IOWait, rising trends, historical spikes, predicted post-migration overload"), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Smart decisions:"), " Balances immediate needs with long-term stability and capacity planning")), /* @__PURE__ */ React.createElement("div", { className: "text-xs" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setCurrentPage("automation"), setOpenPenaltyConfigOnAutomation(!0);
        },
        className: "text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 underline font-semibold"
      },
      "Configure penalty scoring weights in Automation \u2192"
    )));
  }

  // src/components/dashboard/recommendations/insights/EngineDiagnostics.jsx
  function EngineDiagnostics({ recommendationData, recommendations }) {
    return recommendationData?.generated_at ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs" }, /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-400 mb-0.5" }, "Generation Time"), /* @__PURE__ */ React.createElement("div", { className: "font-mono font-semibold text-gray-900 dark:text-white" }, recommendationData.generation_time_ms ? `${recommendationData.generation_time_ms}ms` : "N/A")), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-400 mb-0.5" }, "Recommendations"), /* @__PURE__ */ React.createElement("div", { className: "font-mono font-semibold text-gray-900 dark:text-white" }, recommendationData.count || recommendations.length)), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-400 mb-0.5" }, "Guests Evaluated"), /* @__PURE__ */ React.createElement("div", { className: "font-mono font-semibold text-gray-900 dark:text-white" }, (recommendationData.count || 0) + (recommendationData.skipped_guests?.length || 0))), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-400 mb-0.5" }, "Skipped"), /* @__PURE__ */ React.createElement("div", { className: "font-mono font-semibold text-gray-900 dark:text-white" }, recommendationData.skipped_guests?.length || 0)), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-400 mb-0.5" }, "AI Enhanced"), /* @__PURE__ */ React.createElement("div", { className: `font-semibold ${recommendationData.ai_enhanced ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400"}` }, recommendationData.ai_enhanced ? "Yes" : "No")), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-900/50 rounded p-2 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-400 mb-0.5" }, "Conflicts / Advisories"), /* @__PURE__ */ React.createElement("div", { className: "font-mono font-semibold text-gray-900 dark:text-white" }, recommendationData.conflicts?.length || 0, " / ", recommendationData.capacity_advisories?.length || 0))), recommendationData.summary?.convergence_message && /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-700 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-700 dark:text-green-300 font-medium" }, "Cluster Converged: "), /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400" }, recommendationData.summary.convergence_message)), recommendationData.parameters && /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "Thresholds: "), /* @__PURE__ */ React.createElement("span", { className: "font-mono text-gray-700 dark:text-gray-300" }, "CPU ", recommendationData.parameters.cpu_threshold, "% | Mem ", recommendationData.parameters.mem_threshold, "% | IOWait ", recommendationData.parameters.iowait_threshold, "%"), recommendationData.parameters.maintenance_nodes?.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-yellow-600 dark:text-yellow-400" }, "| Maintenance: ", recommendationData.parameters.maintenance_nodes.join(", "))), recommendationData.summary?.skip_reasons && Object.keys(recommendationData.summary.skip_reasons).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "p-2 bg-white dark:bg-gray-900/50 rounded border border-gray-200 dark:border-gray-700 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 block mb-1" }, "Skip Reasons:"), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2" }, Object.entries(recommendationData.summary.skip_reasons).map(([reason, count]) => /* @__PURE__ */ React.createElement("span", { key: reason, className: "px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300 font-mono" }, reason, ": ", count))))) : null;
  }

  // src/components/dashboard/recommendations/insights/WorkloadPatterns.jsx
  var { useState: useState11, useEffect: useEffect4 } = React;
  function WorkloadPatterns({ API_BASE: API_BASE4, active }) {
    let [patterns, setPatterns] = useState11(null), [loading, setLoading] = useState11(!1);
    return useEffect4(() => {
      !active || patterns || loading || (setLoading(!0), fetch(`${API_BASE4}/workload-patterns?hours=168`).then((r) => r.json()).then((res) => {
        res.success && setPatterns(res.patterns || []);
      }).catch(() => {
      }).finally(() => setLoading(!1)));
    }, [active]), loading ? /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 py-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Analyzing patterns...") : !patterns || patterns.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 py-4" }, "Insufficient history data for pattern analysis. Patterns emerge after several days of data collection.") : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, patterns.map((p, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "bg-white dark:bg-gray-900/50 rounded p-2.5 border border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-1.5" }, /* @__PURE__ */ React.createElement(Server, { size: 12, className: "text-blue-500" }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold text-gray-700 dark:text-gray-300" }, p.node), /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-400 dark:text-gray-500" }, p.data_points, " data points")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]" }, p.daily_pattern ? /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-blue-700 dark:text-blue-300 mb-0.5" }, "Daily Cycle ", /* @__PURE__ */ React.createElement("span", { className: "text-blue-500" }, "(", p.daily_pattern.pattern_confidence, ")")), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400" }, "Peak: ", p.daily_pattern.peak_avg_cpu, "% | Trough: ", p.daily_pattern.trough_avg_cpu, "%"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-500" }, "Biz hrs: ", p.daily_pattern.business_hours_avg, "% | Off hrs: ", p.daily_pattern.off_hours_avg, "%")) : /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500" }, "No daily cycle detected"), p.weekly_pattern ? /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-purple-700 dark:text-purple-300 mb-0.5" }, "Weekly Cycle ", /* @__PURE__ */ React.createElement("span", { className: "text-purple-500" }, "(", p.weekly_pattern.pattern_confidence, ")")), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400" }, "Weekday: ", p.weekly_pattern.weekday_avg, "% | Weekend: ", p.weekly_pattern.weekend_avg, "%"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-500" }, "Peak days: ", p.weekly_pattern.peak_days?.join(", "))) : /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500" }, "No weekly cycle detected"), p.burst_detection?.detected ? /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800" }, /* @__PURE__ */ React.createElement("div", { className: "font-medium text-amber-700 dark:text-amber-300 mb-0.5" }, "Burst Detection"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-600 dark:text-gray-400" }, p.burst_detection.recurring_bursts, " recurring burst hour(s)"), /* @__PURE__ */ React.createElement("div", { className: "text-gray-500 dark:text-gray-500" }, "Avg burst: ", p.burst_detection.avg_burst_cpu, "% at hours ", p.burst_detection.burst_hours?.join(", "))) : /* @__PURE__ */ React.createElement("div", { className: "p-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500" }, "No recurring bursts")), p.recommendation_timing && /* @__PURE__ */ React.createElement("div", { className: "mt-1.5 text-[10px] text-green-600 dark:text-green-400 flex items-center gap-1" }, /* @__PURE__ */ React.createElement(Clock, { size: 10 }), " ", p.recommendation_timing))));
  }

  // src/components/dashboard/recommendations/insights/BatchImpact.jsx
  function BatchImpact({ recommendationData }) {
    let batchImpact = recommendationData?.summary?.batch_impact;
    return batchImpact ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-300" }, Object.entries(batchImpact.before?.node_scores || {}).map(([node, before]) => {
      let after = batchImpact.after?.node_scores?.[node];
      if (!after) return null;
      let cpuDelta = after.cpu - before.cpu, memDelta = after.mem - before.mem, guestDelta = after.guest_count - before.guest_count;
      return /* @__PURE__ */ React.createElement("div", { key: node, className: "p-2 bg-gray-50 dark:bg-gray-700/30 rounded" }, /* @__PURE__ */ React.createElement("div", { className: "font-semibold text-gray-800 dark:text-gray-200 mb-1" }, node), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-3 gap-1" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "CPU"), /* @__PURE__ */ React.createElement("div", { className: "font-mono" }, before.cpu.toFixed(0), "%", /* @__PURE__ */ React.createElement("span", { className: `ml-1 ${cpuDelta < -0.5 ? "text-green-600 dark:text-green-400" : cpuDelta > 0.5 ? "text-red-600 dark:text-red-400" : "text-gray-400"}` }, cpuDelta !== 0 ? `\u2192${after.cpu.toFixed(0)}%` : ""))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "Mem"), /* @__PURE__ */ React.createElement("div", { className: "font-mono" }, before.mem.toFixed(0), "%", /* @__PURE__ */ React.createElement("span", { className: `ml-1 ${memDelta < -0.5 ? "text-green-600 dark:text-green-400" : memDelta > 0.5 ? "text-red-600 dark:text-red-400" : "text-gray-400"}` }, memDelta !== 0 ? `\u2192${after.mem.toFixed(0)}%` : ""))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "Guests"), /* @__PURE__ */ React.createElement("div", { className: "font-mono" }, before.guest_count, guestDelta !== 0 && /* @__PURE__ */ React.createElement("span", { className: `ml-1 ${guestDelta < 0 ? "text-blue-600 dark:text-blue-400" : "text-orange-600 dark:text-orange-400"}` }, "\u2192", after.guest_count)))));
    })), batchImpact.improvement && /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("span", null, "Health: ", recommendationData.summary.cluster_health, " \u2192 ", recommendationData.summary.predicted_health, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-medium ml-1" }, "(+", batchImpact.improvement.health_delta.toFixed(1), ")")), /* @__PURE__ */ React.createElement("span", null, "Variance: ", batchImpact.before.score_variance.toFixed(1), " \u2192 ", batchImpact.after.score_variance.toFixed(1)), batchImpact.improvement.all_nodes_improved && /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 font-medium" }, "All nodes improved or stable"))) : null;
  }

  // src/components/dashboard/recommendations/insights/ChangeLog.jsx
  function ChangeLog({ recommendationData }) {
    let changes = recommendationData?.changes_since_last;
    return changes ? changes.new_recommendations?.length > 0 || changes.removed_recommendations?.length > 0 || changes.changed_targets?.length > 0 ? /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap gap-2 mb-2" }, changes.new_recommendations?.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-bold bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" }, "+", changes.new_recommendations.length, " new"), changes.removed_recommendations?.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" }, "-", changes.removed_recommendations.length, " removed"), changes.changed_targets?.length > 0 && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-bold bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300" }, changes.changed_targets.length, " changed"), changes.unchanged > 0 && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400" }, changes.unchanged, " unchanged")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 text-xs" }, changes.new_recommendations?.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: `new-${i}`, className: "flex items-center gap-2 text-green-700 dark:text-green-300" }, /* @__PURE__ */ React.createElement(Plus, { size: 12 }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "[", r.vmid, "] ", r.name), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, r.source_node, " \u2192 ", r.target_node))), changes.removed_recommendations?.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: `rem-${i}`, className: "flex items-center gap-2 text-red-700 dark:text-red-300" }, /* @__PURE__ */ React.createElement(Minus, { size: 12 }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "[", r.vmid, "] ", r.name), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, r.source_node, " \u2192 ", r.target_node, " (no longer needed)"))), changes.changed_targets?.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: `chg-${i}`, className: "flex items-center gap-2 text-yellow-700 dark:text-yellow-300" }, /* @__PURE__ */ React.createElement(ArrowRight, { size: 12 }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "[", r.vmid, "] ", r.name), /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400" }, "target changed: ", r.old_target, " \u2192 ", r.new_target))))) : /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 py-4" }, "No changes since last generation.") : null;
  }

  // src/components/dashboard/recommendations/insights/ExecutionPlan.jsx
  function ExecutionPlan({ recommendationData }) {
    let plan = recommendationData?.execution_plan;
    return !plan?.ordered_recommendations?.length || plan.ordered_recommendations.length <= 1 ? /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 py-4" }, "Execution plan shows the optimal order for running migrations when multiple are recommended. It identifies which migrations can run in parallel and which must be sequential to avoid conflicts. Only shown when there are 2+ recommendations.") : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-600 dark:text-gray-400" }, plan.total_steps, " steps"), plan.can_parallelize && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-[10px] font-medium rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400" }, "Parallel groups available")), /* @__PURE__ */ React.createElement("div", { className: "space-y-1.5" }, plan.ordered_recommendations.map((step, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "flex items-center gap-2 text-xs p-2 bg-gray-50 dark:bg-gray-800/50 rounded border border-gray-100 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("div", { className: "shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 font-bold text-[11px]" }, step.step), /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "[", step.vmid, "] ", step.name), /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 dark:text-gray-500 mx-1" }, step.source_node), /* @__PURE__ */ React.createElement(ArrowRight, { size: 10, className: "inline text-gray-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-gray-400 dark:text-gray-500 mx-1" }, step.target_node)), step.parallel_group !== void 0 && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-[9px] font-medium rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400" }, "Group ", step.parallel_group + 1), step.reason_for_order && /* @__PURE__ */ React.createElement("span", { className: "text-[10px] text-gray-400 dark:text-gray-500 max-w-[200px] truncate", title: step.reason_for_order }, step.reason_for_order))), plan.can_parallelize && plan.parallel_groups?.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-400 dark:text-gray-500 mt-1 px-2" }, "Steps within the same group can run in parallel. Groups must execute sequentially.")));
  }

  // src/components/dashboard/recommendations/insights/MigrationOutcomes.jsx
  var { useState: useState12, useEffect: useEffect5 } = React;
  function MigrationOutcomes({ API_BASE: API_BASE4, active }) {
    let [outcomes, setOutcomes] = useState12(null), [loading, setLoading] = useState12(!1);
    return useEffect5(() => {
      !active || outcomes || loading || (setLoading(!0), (async () => {
        try {
          let { fetchMigrationOutcomes: fetchMigrationOutcomes2, refreshMigrationOutcomes: refreshMigrationOutcomes2 } = await import("../../../api/client.js");
          await refreshMigrationOutcomes2();
          let res = await fetchMigrationOutcomes2(null, 10);
          res.success && setOutcomes(res.outcomes || []);
        } catch (e) {
          console.error("Error loading outcomes:", e);
        }
        setLoading(!1);
      })());
    }, [active]), loading ? /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 py-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Loading outcomes...") : !outcomes || outcomes.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 py-4" }, "No migration outcomes tracked yet. Outcomes are recorded automatically when migrations are executed, comparing predicted vs. actual resource changes.") : /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, outcomes.map((outcome, idx) => {
      let pre = outcome.pre_migration || {}, post = outcome.post_migration || {}, isPending = outcome.status === "pending_post_capture";
      return /* @__PURE__ */ React.createElement("div", { key: idx, className: `text-xs p-2.5 rounded border ${isPending ? "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20" : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50"}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-1.5" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium text-gray-700 dark:text-gray-300" }, "[", outcome.guest_type, " ", outcome.vmid, "] ", outcome.source_node, " \u2192 ", outcome.target_node), /* @__PURE__ */ React.createElement("span", { className: `px-1.5 py-0.5 text-[9px] font-bold rounded ${isPending ? "bg-amber-500 text-white" : outcome.accuracy_pct >= 70 ? "bg-green-500 text-white" : "bg-gray-500 text-white"}` }, isPending ? "PENDING" : outcome.accuracy_pct != null ? `${outcome.accuracy_pct}% accurate` : "COMPLETED")), !isPending && post && /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 gap-2" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-400 dark:text-gray-500 mb-0.5" }, "Source CPU"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, pre.source_node?.cpu, "%"), /* @__PURE__ */ React.createElement(ArrowRight, { size: 8, className: "text-gray-400" }), /* @__PURE__ */ React.createElement("span", { className: `font-medium ${(pre.source_node?.cpu || 0) > (post.source_node?.cpu || 0) ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}` }, post.source_node?.cpu, "%"))), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-gray-400 dark:text-gray-500 mb-0.5" }, "Source Memory"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-gray-600 dark:text-gray-400" }, pre.source_node?.mem, "%"), /* @__PURE__ */ React.createElement(ArrowRight, { size: 8, className: "text-gray-400" }), /* @__PURE__ */ React.createElement("span", { className: `font-medium ${(pre.source_node?.mem || 0) > (post.source_node?.mem || 0) ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}` }, post.source_node?.mem, "%")))), isPending && /* @__PURE__ */ React.createElement("div", { className: "text-[10px] text-amber-600 dark:text-amber-400" }, "Post-migration metrics pending (captured after 5 minute cooldown)"));
    }));
  }

  // src/components/dashboard/recommendations/insights/RecommendationHistory.jsx
  var { useState: useState13, useEffect: useEffect6 } = React;
  function RecommendationHistory({ API_BASE: API_BASE4, active }) {
    let [historyData, setHistoryData] = useState13(null), [loading, setLoading] = useState13(!1), [hours, setHours] = useState13(24);
    if (useEffect6(() => {
      if (!active) return;
      let cancelled = !1;
      return setLoading(!0), fetch(`${API_BASE4}/score-history?hours=${hours}`).then((r) => r.json()).then((res) => {
        cancelled || setHistoryData(res.history || []);
      }).catch(() => {
      }).finally(() => {
        cancelled || setLoading(!1);
      }), () => {
        cancelled = !0;
      };
    }, [hours, active]), loading)
      return /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-500 dark:text-gray-400 py-4 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: "animate-spin" }), " Loading history...");
    if (!historyData || historyData.length === 0)
      return /* @__PURE__ */ React.createElement("div", { className: "text-xs text-gray-400 dark:text-gray-500 py-4" }, "No score history data yet. History is recorded automatically every time recommendations are generated.");
    let entries = historyData.slice(-48), healthValues = entries.map((e) => e.cluster_health || 0), recCounts = entries.map((e) => e.recommendation_count || 0), maxRec = Math.max(...recCounts, 1);
    return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 text-[10px] text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 bg-green-500 rounded-full inline-block" }), " Cluster Health"), /* @__PURE__ */ React.createElement("span", { className: "flex items-center gap-1" }, /* @__PURE__ */ React.createElement("span", { className: "w-2 h-2 bg-orange-500 rounded-full inline-block" }), " Rec Count")), /* @__PURE__ */ React.createElement("select", { value: hours, onChange: (e) => setHours(Number(e.target.value)), className: "text-[10px] px-1.5 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("option", { value: 6 }, "6h"), /* @__PURE__ */ React.createElement("option", { value: 24 }, "24h"), /* @__PURE__ */ React.createElement("option", { value: 72 }, "3 days"), /* @__PURE__ */ React.createElement("option", { value: 168 }, "7 days"))), /* @__PURE__ */ React.createElement("div", { className: "flex items-end gap-px h-16" }, entries.map((entry, i) => {
      let healthPct = healthValues[i] / 100 * 100, recPct = recCounts[i] > 0 ? Math.max(10, recCounts[i] / maxRec * 100) : 0, timeLabel = new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return /* @__PURE__ */ React.createElement("div", { key: i, className: "flex-1 flex flex-col items-center gap-0.5 group relative", title: `${timeLabel}
Health: ${healthValues[i].toFixed(0)}%
Recs: ${recCounts[i]}` }, /* @__PURE__ */ React.createElement("div", { className: "w-full flex flex-col justify-end h-16" }, /* @__PURE__ */ React.createElement("div", { className: "w-full bg-green-400 dark:bg-green-500 rounded-t-sm opacity-60 group-hover:opacity-100 transition-opacity", style: { height: `${healthPct}%`, minHeight: healthPct > 0 ? "1px" : "0" } })), recPct > 0 && /* @__PURE__ */ React.createElement("div", { className: "absolute bottom-0 w-1 bg-orange-500 rounded-t-sm opacity-70", style: { height: `${recPct * 0.6}%`, minHeight: "2px" } }));
    })), /* @__PURE__ */ React.createElement("div", { className: "flex justify-between mt-1 text-[9px] text-gray-400 dark:text-gray-500" }, /* @__PURE__ */ React.createElement("span", null, entries.length > 0 ? new Date(entries[0].timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""), /* @__PURE__ */ React.createElement("span", null, entries.length > 0 ? new Date(entries[entries.length - 1].timestamp).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "")), /* @__PURE__ */ React.createElement("div", { className: "mt-2 text-[10px] text-gray-500 dark:text-gray-400" }, entries.length, " snapshots over last ", hours, "h \u2014 Latest health: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, healthValues[healthValues.length - 1]?.toFixed(0), "%"), ", Recs: ", /* @__PURE__ */ React.createElement("strong", { className: "text-gray-700 dark:text-gray-300" }, recCounts[recCounts.length - 1])));
  }

  // src/components/dashboard/recommendations/InsightsDrawer.jsx
  var { useState: useState14, useEffect: useEffect7, useRef: useRef2 } = React, TABS = [
    { id: "impact", label: "Impact", icon: BarChart2 },
    { id: "diagnostics", label: "Diagnostics", icon: Terminal },
    { id: "patterns", label: "Patterns", icon: Activity },
    { id: "history", label: "History", icon: Calendar }
  ];
  function InsightsDrawer({
    open,
    onClose,
    recommendationData,
    recommendations,
    penaltyConfig,
    setCurrentPage,
    setOpenPenaltyConfigOnAutomation,
    API_BASE: API_BASE4,
    isMobile
  }) {
    let [activeTab, setActiveTab] = useState14("impact"), drawerRef = useRef2(null);
    return useEffect7(() => {
      if (!open) return;
      let handleKey = (e) => {
        e.key === "Escape" && onClose();
      };
      return window.addEventListener("keydown", handleKey), () => window.removeEventListener("keydown", handleKey);
    }, [open]), useEffect7(() => (open ? document.body.style.overflow = "hidden" : document.body.style.overflow = "", () => {
      document.body.style.overflow = "";
    }), [open]), open ? /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 z-[60]" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "absolute inset-0 bg-black/30 transition-opacity",
        onClick: onClose
      }
    ), /* @__PURE__ */ React.createElement(
      "div",
      {
        ref: drawerRef,
        className: `absolute top-0 right-0 h-full ${isMobile ? "w-full" : "w-[520px]"} bg-white dark:bg-gray-800 shadow-2xl flex flex-col transform transition-transform duration-200`
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 shrink-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("div", { className: "p-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg" }, /* @__PURE__ */ React.createElement(BarChart2, { size: 18, className: "text-gray-600 dark:text-gray-300" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "text-base font-bold text-gray-900 dark:text-white" }, "Insights & Analytics"), /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-500 dark:text-gray-400" }, "Deep-dive into recommendation data"))), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: onClose,
          className: "p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 transition-colors"
        },
        /* @__PURE__ */ React.createElement(X, { size: 20 })
      )),
      /* @__PURE__ */ React.createElement("div", { className: "flex border-b border-gray-200 dark:border-gray-700 shrink-0 px-2" }, TABS.map((tab) => {
        let Icon = tab.icon, isActive = activeTab === tab.id;
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            key: tab.id,
            onClick: () => setActiveTab(tab.id),
            className: `flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium border-b-2 transition-colors ${isActive ? "border-blue-500 text-blue-600 dark:text-blue-400" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600"}`
          },
          /* @__PURE__ */ React.createElement(Icon, { size: 14 }),
          tab.label
        );
      })),
      /* @__PURE__ */ React.createElement("div", { className: "flex-1 overflow-y-auto p-4" }, activeTab === "impact" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(BarChart2, { size: 14, className: "text-blue-500 dark:text-blue-400" }), "Batch Migration Impact"), /* @__PURE__ */ React.createElement(BatchImpact, { recommendationData })), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(List, { size: 14, className: "text-blue-500 dark:text-blue-400" }), "Execution Plan", /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-gray-500 dark:text-gray-400" }, "\u2014 Optimal migration ordering")), /* @__PURE__ */ React.createElement(ExecutionPlan, { recommendationData })), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 14, className: "text-blue-500 dark:text-blue-400" }), "Changes Since Last Generation"), /* @__PURE__ */ React.createElement(ChangeLog, { recommendationData }))), activeTab === "diagnostics" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Terminal, { size: 14, className: "text-gray-500 dark:text-gray-400" }), "Engine Diagnostics", recommendationData?.generation_time_ms && /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-gray-500 dark:text-gray-400" }, "Generated in ", recommendationData.generation_time_ms, "ms")), /* @__PURE__ */ React.createElement(EngineDiagnostics, { recommendationData, recommendations })), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Info, { size: 14, className: "text-blue-500 dark:text-blue-400" }), "How Scoring Works"), /* @__PURE__ */ React.createElement(
        ScoringExplainer,
        {
          penaltyConfig,
          setCurrentPage,
          setOpenPenaltyConfigOnAutomation
        }
      ))), activeTab === "patterns" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Activity, { size: 14, className: "text-blue-500 dark:text-blue-400" }), "Workload Patterns", /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-gray-500 dark:text-gray-400" }, "\u2014 Daily/weekly cycle analysis")), /* @__PURE__ */ React.createElement(WorkloadPatterns, { API_BASE: API_BASE4, active: activeTab === "patterns" })), /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(BarChart2, { size: 14, className: "text-green-500 dark:text-green-400" }), "Migration Outcomes", /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-gray-500 dark:text-gray-400" }, "\u2014 Predicted vs. actual results")), /* @__PURE__ */ React.createElement(MigrationOutcomes, { API_BASE: API_BASE4, active: activeTab === "patterns" }))), activeTab === "history" && /* @__PURE__ */ React.createElement("div", { className: "space-y-6" }, /* @__PURE__ */ React.createElement("section", null, /* @__PURE__ */ React.createElement("h4", { className: "text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(Calendar, { size: 14, className: "text-purple-500 dark:text-purple-400" }), "Recommendation History", /* @__PURE__ */ React.createElement("span", { className: "text-xs font-normal text-gray-500 dark:text-gray-400" }, "\u2014 Score trends over time")), /* @__PURE__ */ React.createElement(RecommendationHistory, { API_BASE: API_BASE4, active: activeTab === "history" }))))
    )) : null;
  }

  // src/components/dashboard/MigrationRecommendationsSection.jsx
  var { useState: useState15 } = React;
  function MigrationRecommendationsSection({
    // Data
    data,
    recommendations,
    loadingRecommendations,
    generateRecommendations: generateRecommendations2,
    recommendationData,
    penaltyConfig,
    // Section collapse
    collapsedSections,
    setCollapsedSections,
    toggleSection,
    // Migrations
    canMigrate,
    migrationStatus,
    setMigrationStatus,
    completedMigrations,
    guestsMigrating,
    migrationProgress,
    cancelMigration,
    trackMigration,
    setConfirmMigration,
    // Navigation
    setCurrentPage,
    setOpenPenaltyConfigOnAutomation,
    // Node scores (for predicted view)
    nodeScores,
    // API
    API_BASE: API_BASE4
  }) {
    let [recFilterConfidence, setRecFilterConfidence] = useState15(""), [recFilterTargetNode, setRecFilterTargetNode] = useState15(""), [recFilterSourceNode, setRecFilterSourceNode] = useState15(""), [recSortBy, setRecSortBy] = useState15(""), [recSortDir, setRecSortDir] = useState15("desc"), [showRecFilters, setShowRecFilters] = useState15(!1), [showInsights, setShowInsights] = useState15(!1), isMobile = useIsMobile_default(), getFilteredRecs = () => {
      let filtered = [...recommendations];
      if (recFilterConfidence) {
        let minConf = parseInt(recFilterConfidence);
        filtered = filtered.filter((r) => (r.confidence_score || 0) >= minConf);
      }
      return recFilterSourceNode && (filtered = filtered.filter((r) => r.source_node === recFilterSourceNode)), recFilterTargetNode && (filtered = filtered.filter((r) => r.target_node === recFilterTargetNode)), recSortBy && filtered.sort((a, b) => {
        let getValue = (rec) => recSortBy === "cost_benefit_ratio" ? rec.cost_benefit?.ratio || 0 : rec[recSortBy] || 0, va = getValue(a), vb = getValue(b);
        return recSortDir === "asc" ? va - vb : vb - va;
      }), filtered;
    };
    return /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-24 overflow-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-y-3 mb-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-gradient-to-br from-orange-600 to-red-600 rounded-lg shadow-md shrink-0" }, /* @__PURE__ */ React.createElement(Activity, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg sm:text-2xl font-bold text-gray-900 dark:text-white" }, "Migration Recommendations"), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleSection("recommendations"),
        className: "p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-all duration-200",
        title: collapsedSections.recommendations ? "Expand section" : "Collapse section"
      },
      collapsedSections.recommendations ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 20, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 20, className: "text-gray-600 dark:text-gray-400" })
    )), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mt-0.5" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400" }, "Suggested optimizations"), recommendationData?.ai_enhanced && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-900/40 dark:to-blue-900/40 border border-purple-300 dark:border-purple-600 rounded text-xs font-semibold text-purple-700 dark:text-purple-300" }, "AI Enhanced"), recommendationData?.generated_at && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-500 dark:text-gray-500" }, "\u2022 Generated: ", (() => {
      let genTime = new Date(recommendationData.generated_at);
      return formatLocalTime(genTime);
    })(), " (backend auto-generates every 10-60min based on cluster size)")))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, !collapsedSections.recommendations && recommendationData?.generated_at && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setShowInsights(!0),
        className: "flex items-center gap-1.5 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 transition-all duration-200",
        title: "View detailed analytics and insights"
      },
      /* @__PURE__ */ React.createElement(Eye, { size: 16 }),
      "Insights"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: generateRecommendations2,
        disabled: loadingRecommendations || !data,
        className: "flex items-center gap-2 px-4 py-2 bg-orange-600 dark:bg-orange-500 text-white rounded-lg hover:bg-orange-700 dark:hover:bg-orange-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-200",
        title: "Manually generate new recommendations now"
      },
      loadingRecommendations ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 18, className: "animate-spin" }), "Generating...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 18 }), "Generate Now")
    )))), !collapsedSections.recommendations && /* @__PURE__ */ React.createElement("div", { className: "transition-all duration-300 ease-in-out" }, !loadingRecommendations && /* @__PURE__ */ React.createElement(RecommendationSummaryBar, { recommendationData }), !loadingRecommendations && /* @__PURE__ */ React.createElement(
      AlertsBanner,
      {
        recommendationData,
        collapsedSections,
        setCollapsedSections
      }
    ), !loadingRecommendations && /* @__PURE__ */ React.createElement(
      RecommendationFilters,
      {
        recommendations,
        showRecFilters,
        setShowRecFilters,
        recFilterConfidence,
        setRecFilterConfidence,
        recFilterSourceNode,
        setRecFilterSourceNode,
        recFilterTargetNode,
        setRecFilterTargetNode,
        recSortBy,
        setRecSortBy,
        recSortDir,
        setRecSortDir
      }
    ), loadingRecommendations ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-8" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 48, className: "mx-auto mb-3 text-blue-500 dark:text-blue-400 animate-spin" }), /* @__PURE__ */ React.createElement("p", { className: "font-medium text-gray-700 dark:text-gray-300" }, "Generating recommendations..."), recommendationData?.ai_enhanced && /* @__PURE__ */ React.createElement("p", { className: "text-sm text-purple-600 dark:text-purple-400 mt-1" }, "AI enhancement in progress")) : recommendations.length === 0 ? /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 48, className: "mx-auto mb-2 text-green-500 dark:text-green-400" }), /* @__PURE__ */ React.createElement("p", { className: "font-medium" }, "Cluster is balanced!"), /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, "No migrations needed")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-3" }, getFilteredRecs().map((rec, idx) => /* @__PURE__ */ React.createElement(
      RecommendationCard,
      {
        key: idx,
        rec,
        idx,
        penaltyConfig,
        recommendationData,
        migrationStatus,
        setMigrationStatus,
        completedMigrations,
        guestsMigrating,
        migrationProgress,
        cancelMigration,
        setConfirmMigration,
        canMigrate,
        collapsedSections,
        setCollapsedSections
      }
    ))), !loadingRecommendations && /* @__PURE__ */ React.createElement(
      SkippedGuests,
      {
        recommendationData,
        penaltyConfig,
        collapsedSections,
        setCollapsedSections
      }
    )), /* @__PURE__ */ React.createElement(
      InsightsDrawer,
      {
        open: showInsights,
        onClose: () => setShowInsights(!1),
        recommendationData,
        recommendations,
        penaltyConfig,
        setCurrentPage,
        setOpenPenaltyConfigOnAutomation,
        API_BASE: API_BASE4,
        isMobile
      }
    ));
  }

  // src/components/dashboard/AIRecommendationsSection.jsx
  function AIRecommendationsSection({
    config,
    aiEnabled,
    collapsedSections,
    toggleSection,
    aiRecommendations,
    loadingAi,
    aiAnalysisPeriod,
    setAiAnalysisPeriod,
    fetchAiRecommendations: fetchAiRecommendations2,
    migrationStatus,
    setMigrationStatus,
    completedMigrations,
    guestsMigrating,
    migrationProgress,
    cancelMigration,
    canMigrate,
    trackMigration,
    API_BASE: API_BASE4
  }) {
    return !config?.ai_recommendations_enabled || !aiEnabled ? null : /* @__PURE__ */ React.createElement("div", { className: "hidden bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-850 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-y-3 mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-lg shadow-md shrink-0" }, /* @__PURE__ */ React.createElement(Activity, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg sm:text-2xl font-bold text-gray-900 dark:text-white" }, "AI-Enhanced Recommendations"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5" }, "AI-powered migration insights")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => toggleSection("aiRecommendations"),
        className: "ml-2 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200",
        title: collapsedSections.aiRecommendations ? "Expand section" : "Collapse section"
      },
      collapsedSections.aiRecommendations ? /* @__PURE__ */ React.createElement(ChevronDown, { size: 22, className: "text-gray-600 dark:text-gray-400" }) : /* @__PURE__ */ React.createElement(ChevronUp, { size: 22, className: "text-gray-600 dark:text-gray-400" })
    )), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2 sm:gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("label", { className: "text-sm font-medium text-gray-700 dark:text-gray-300" }, "Analysis Period:"), /* @__PURE__ */ React.createElement(
      "select",
      {
        value: aiAnalysisPeriod,
        onChange: (e) => setAiAnalysisPeriod(e.target.value),
        className: "px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
      },
      /* @__PURE__ */ React.createElement("option", { value: "1h" }, "Last Hour"),
      /* @__PURE__ */ React.createElement("option", { value: "6h" }, "Last 6 Hours"),
      /* @__PURE__ */ React.createElement("option", { value: "24h" }, "Last 24 Hours"),
      /* @__PURE__ */ React.createElement("option", { value: "7d" }, "Last 7 Days"),
      /* @__PURE__ */ React.createElement("option", { value: "30d" }, "Last 30 Days")
    )), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: fetchAiRecommendations2,
        disabled: loadingAi,
        className: "flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400"
      },
      loadingAi ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 18, className: "animate-spin" }), "Analyzing...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 18 }), "Get AI Analysis")
    ))), !collapsedSections.aiRecommendations && /* @__PURE__ */ React.createElement("div", { className: "transition-all duration-300 ease-in-out" }, !aiRecommendations && !loadingAi && /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(Activity, { size: 48, className: "mx-auto mb-2" }), /* @__PURE__ */ React.createElement("p", { className: "font-medium" }, "AI Analysis Available"), /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, 'Click "Get AI Analysis" to receive AI-powered migration recommendations')), aiRecommendations && !aiRecommendations.success && /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-red-800 dark:text-red-200" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "AI Analysis Error")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-700 dark:text-red-300 mt-2" }, aiRecommendations.error)), aiRecommendations && aiRecommendations.success && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, aiRecommendations.analysis && /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(Activity, { size: 20, className: "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-blue-900 dark:text-blue-200" }, "Cluster Analysis")), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-800 dark:text-blue-200" }, aiRecommendations.analysis)), aiRecommendations.predicted_issues && aiRecommendations.predicted_issues.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 20, className: "text-yellow-600 dark:text-yellow-400" }), /* @__PURE__ */ React.createElement("span", { className: "font-medium text-yellow-900 dark:text-yellow-200" }, "Predicted Issues")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, aiRecommendations.predicted_issues.map((issue, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "text-sm text-yellow-800 dark:text-yellow-200" }, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, issue.node), " - ", issue.prediction, /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-xs" }, "(", ((issue.confidence || 0) * 100).toFixed(0), "% confidence)"))))), aiRecommendations.recommendations && aiRecommendations.recommendations.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "text-center py-8 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 48, className: "mx-auto mb-2 text-green-500 dark:text-green-400" }), /* @__PURE__ */ React.createElement("p", { className: "font-medium" }, "No AI Recommendations"), /* @__PURE__ */ React.createElement("p", { className: "text-sm" }, "AI analysis found cluster is well-balanced")), aiRecommendations.recommendations && aiRecommendations.recommendations.filter((rec) => rec.priority !== "skipped").length > 0 && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, aiRecommendations.recommendations.filter((rec) => rec.priority !== "skipped").map((rec, idx) => {
      let key = `ai-${rec.vmid}-${rec.target_node}`, status = migrationStatus[key], isCompleted = completedMigrations[rec.vmid] !== void 0, priorityColors = {
        high: "bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200",
        medium: "bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200",
        low: "bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200"
      }, riskColor = rec.risk_score > 0.5 ? "text-red-600 dark:text-red-400" : rec.risk_score > 0.2 ? "text-yellow-600 dark:text-yellow-400" : "text-green-600 dark:text-green-400";
      return /* @__PURE__ */ React.createElement("div", { key: idx, className: `border rounded-lg p-4 transition-all duration-300 ${isCompleted ? "border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 opacity-75" : priorityColors[rec.priority] || priorityColors.medium}` }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-bold text-lg" }, "[", rec.type, " ", rec.vmid, "] ", rec.name), /* @__PURE__ */ React.createElement("span", { className: `px-2 py-1 rounded text-xs font-bold uppercase ${rec.priority === "high" ? "bg-red-600 text-white" : rec.priority === "medium" ? "bg-yellow-600 text-white" : "bg-green-600 text-white"}` }, rec.priority, " Priority")), /* @__PURE__ */ React.createElement("div", { className: "text-sm mb-2" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-red-700 dark:text-red-300" }, "FROM:"), " ", rec.source_node, /* @__PURE__ */ React.createElement("span", { className: "mx-2" }, "\u2192"), /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-green-700 dark:text-green-300" }, "TO:"), " ", rec.target_node), /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded p-3 mb-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2 mb-1" }, /* @__PURE__ */ React.createElement(Shield, { size: 16, className: "text-blue-600 dark:text-blue-400 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-sm" }, "AI Reasoning:"), /* @__PURE__ */ React.createElement("p", { className: "text-sm mt-1" }, rec.reasoning)))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-xs mb-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 14, className: riskColor }), /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Risk Score:"), /* @__PURE__ */ React.createElement("span", { className: `font-bold ${riskColor}` }, ((rec.risk_score || 0) * 100).toFixed(0), "%")), rec.estimated_impact && /* @__PURE__ */ React.createElement("div", { className: "bg-green-50 dark:bg-green-900/30 rounded p-2 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "font-semibold" }, "Expected Impact:"), " ", rec.estimated_impact)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 shrink-0" }, (() => {
        if (isCompleted)
          return /* @__PURE__ */ React.createElement("div", { className: "px-4 py-2 bg-green-600 dark:bg-green-500 text-white rounded flex items-center gap-2" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 16 }), "Migrated");
        let isMigrating = guestsMigrating[rec.vmid] === !0, migrationKey = `${rec.vmid}-${rec.target_node}`;
        if (isMigrating && canMigrate) {
          let progress = migrationProgress[rec.vmid], progressText = "", tooltipText = "Cancel migration in progress";
          return progress && (progress.percentage ? (progressText = ` ${progress.percentage}%`, progress.total_human_readable && (tooltipText = `Copying ${progress.human_readable} / ${progress.total_human_readable}`)) : progressText = ` (${progress.human_readable})`), /* @__PURE__ */ React.createElement(
            "button",
            {
              onClick: () => cancelMigration(rec.vmid, rec.target_node),
              className: "px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 flex items-center gap-2 animate-pulse",
              title: tooltipText
            },
            /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }),
            "Cancel",
            progressText
          );
        }
        return /* @__PURE__ */ React.createElement(
          "button",
          {
            onClick: () => {
              let aiKey = `ai-${rec.vmid}-${rec.target_node}`;
              setMigrationStatus((prev) => ({ ...prev, [aiKey]: "running" })), fetch(`${API_BASE4}/migrate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  source_node: rec.source_node,
                  vmid: rec.vmid,
                  target_node: rec.target_node,
                  type: rec.type
                })
              }).then((response) => response.json()).then((result) => {
                result.success ? trackMigration(rec.vmid, result.source_node, result.target_node, result.task_id, rec.type) : (console.error(`[AI Migration] Migration failed for VMID ${rec.vmid}:`, result.error), setMigrationStatus((prev) => ({ ...prev, [aiKey]: "failed" })));
              }).catch((err) => {
                console.error(`[AI Migration] Exception for VMID ${rec.vmid}:`, err), setMigrationStatus((prev) => ({ ...prev, [aiKey]: "failed" }));
              });
            },
            disabled: !canMigrate || status === "running" || isMigrating,
            className: "px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2",
            title: canMigrate ? isMigrating ? "Migration in progress" : "" : "Read-only API token (PVEAuditor) - Cannot perform migrations"
          },
          canMigrate ? isMigrating ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }), "Migrating...") : status === "running" ? /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: "animate-spin" }), "Starting...") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Play, { size: 16 }), "Migrate") : /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Lock, { size: 16 }), "Read-Only")
        );
      })())));
    })))));
  }

  // src/components/dashboard/SystemModals.jsx
  var SystemModals = ({
    showUpdateModal,
    setShowUpdateModal,
    updating,
    updateLog,
    setUpdateLog,
    updateResult,
    setUpdateResult,
    updateError,
    handleUpdate: handleUpdate2,
    systemInfo,
    showBranchModal,
    setShowBranchModal,
    loadingBranches,
    availableBranches,
    branchPreview,
    setBranchPreview,
    loadingPreview,
    switchingBranch,
    rollingBack,
    fetchBranches: fetchBranches2,
    switchBranch: switchBranch2,
    rollbackBranch: rollbackBranch2,
    clearTestingMode: clearTestingMode2,
    fetchBranchPreview: fetchBranchPreview2
  }) => /* @__PURE__ */ React.createElement(React.Fragment, null, showUpdateModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full p-4 sm:p-6 max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: `p-2.5 bg-gradient-to-br from-blue-600 to-cyan-600 rounded-lg shadow-md ${updating ? "animate-pulse" : ""}` }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 24, className: updating ? "text-white animate-spin" : "text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" }, "Update ProxBalance"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5" }, "System update management"))), !updating && updateResult !== "success" && /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowUpdateModal(!1), setUpdateLog([]), setUpdateResult(null);
      },
      className: "p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
    },
    /* @__PURE__ */ React.createElement(X, { size: 20, className: "text-gray-600 dark:text-gray-400" })
  )), systemInfo && !updating && updateResult === null && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "flex-shrink-0" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 24, className: "text-blue-600 dark:text-blue-400" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-blue-900 dark:text-blue-200 mb-2" }, "Update Available"), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-blue-800 dark:text-blue-300 space-y-1" }, /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Current Branch:"), " ", systemInfo.branch), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Current Commit:"), " ", systemInfo.commit), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Commits Behind:"), " ", systemInfo.commits_behind), /* @__PURE__ */ React.createElement("p", null, /* @__PURE__ */ React.createElement("span", { className: "font-medium" }, "Last Updated:"), " ", systemInfo.last_commit_date))))), systemInfo.changelog && systemInfo.changelog.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded p-4" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-green-900 dark:text-green-200 mb-3 flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "\u{1F4CB} What's New"), /* @__PURE__ */ React.createElement("span", { className: "text-xs px-2 py-0.5 bg-green-200 dark:bg-green-800 rounded-full" }, systemInfo.changelog.length, " update", systemInfo.changelog.length > 1 ? "s" : "")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2 max-h-48 overflow-y-auto" }, systemInfo.changelog.map((item, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "flex items-start gap-2 text-sm" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400 flex-shrink-0" }, "\u25CF"), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("span", { className: "text-green-900 dark:text-green-100" }, item.message), /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-xs font-mono text-green-600 dark:text-green-400" }, "(", item.commit, ")")))))), /* @__PURE__ */ React.createElement("div", { className: "bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-2" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 20, className: "text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-yellow-800 dark:text-yellow-300" }, /* @__PURE__ */ React.createElement("p", { className: "font-semibold mb-1" }, "This will:"), /* @__PURE__ */ React.createElement("ul", { className: "list-disc ml-4 space-y-1" }, /* @__PURE__ */ React.createElement("li", null, "Pull the latest code from branch: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, systemInfo.branch)), /* @__PURE__ */ React.createElement("li", null, "Update Python dependencies"), /* @__PURE__ */ React.createElement("li", null, "Restart ProxBalance services"), /* @__PURE__ */ React.createElement("li", null, "The page will automatically reload after update"))))), /* @__PURE__ */ React.createElement("div", { className: "flex gap-3" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setShowUpdateModal(!1),
      className: "flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
    },
    /* @__PURE__ */ React.createElement(X, { size: 14 }),
    " Cancel"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: handleUpdate2,
      disabled: systemInfo && systemInfo.update_in_progress,
      className: "flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 18 }),
    systemInfo && systemInfo.update_in_progress ? "Operation in progress..." : "Update Now"
  ))), updating && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-12 space-y-4" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 40, className: "text-blue-600 dark:text-blue-400 animate-spin" }), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, "Updating ProxBalance..."), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1" }, "This may take a minute."))), !updating && updateResult === "success" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 24, className: "text-green-600 dark:text-green-400" }), /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, "Update complete!")), updateLog.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "font-mono text-sm space-y-1" }, updateLog.map((line, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "text-gray-800 dark:text-gray-200" }, line.includes("\u2713") ? /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400" }, line) : line.includes("Error") || line.includes("\u26A0") || line.includes("Failed") ? /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400" }, line) : line.includes("\u2501") ? /* @__PURE__ */ React.createElement("span", { className: "text-blue-600 dark:text-blue-400" }, line) : /* @__PURE__ */ React.createElement("span", null, line))))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => window.location.reload(),
      className: "flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
    },
    /* @__PURE__ */ React.createElement(RefreshCw, { size: 16 }),
    "Close & Reload"
  ))), !updating && updateResult === "up-to-date" && /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center justify-center py-8 space-y-4" }, /* @__PURE__ */ React.createElement(CheckCircle, { size: 40, className: "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, "Already up to date"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-500 dark:text-gray-400 mt-1" }, "No new updates available.")), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowUpdateModal(!1), setUpdateLog([]), setUpdateResult(null);
      },
      className: "px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600"
    },
    "Close"
  )), !updating && updateResult === "error" && /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(AlertTriangle, { size: 20, className: "text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-red-900 dark:text-red-200" }, "Update failed"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-800 dark:text-red-300 mt-1" }, updateError)))), updateLog.length > 0 && /* @__PURE__ */ React.createElement("details", null, /* @__PURE__ */ React.createElement("summary", { className: "text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-gray-800 dark:hover:text-gray-200" }, "Show update log"), /* @__PURE__ */ React.createElement("div", { className: "mt-2 bg-gray-50 dark:bg-gray-900 rounded-lg p-4 max-h-64 overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "font-mono text-sm space-y-1" }, updateLog.map((line, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "text-gray-800 dark:text-gray-200" }, line.includes("\u2713") ? /* @__PURE__ */ React.createElement("span", { className: "text-green-600 dark:text-green-400" }, line) : line.includes("Error") || line.includes("\u26A0") || line.includes("Failed") ? /* @__PURE__ */ React.createElement("span", { className: "text-red-600 dark:text-red-400" }, line) : line.includes("\u2501") ? /* @__PURE__ */ React.createElement("span", { className: "text-blue-600 dark:text-blue-400" }, line) : /* @__PURE__ */ React.createElement("span", null, line)))))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowUpdateModal(!1), setUpdateLog([]), setUpdateResult(null);
      },
      className: "px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center justify-center gap-1.5"
    },
    /* @__PURE__ */ React.createElement(X, { size: 14 }),
    " Close"
  ))))), showBranchModal && /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" }, /* @__PURE__ */ React.createElement("div", { className: "bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto" }, /* @__PURE__ */ React.createElement("div", { className: "p-4 sm:p-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "p-2.5 bg-gradient-to-br from-purple-600 to-violet-600 rounded-lg shadow-md" }, /* @__PURE__ */ React.createElement(GitBranch, { size: 24, className: "text-white" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-xl sm:text-2xl font-bold text-gray-900 dark:text-white" }, "Branch Manager"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-0.5" }, "Test feature branches before pushing to main"))), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowBranchModal(!1), setBranchPreview(null);
      },
      className: "p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200"
    },
    /* @__PURE__ */ React.createElement(X, { size: 20, className: "text-gray-600 dark:text-gray-400" })
  )), loadingBranches ? /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center py-8" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 24, className: "animate-spin text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-gray-600 dark:text-gray-400" }, "Loading branches...")) : /* @__PURE__ */ React.createElement("div", { className: "space-y-4" }, systemInfo && systemInfo.update_in_progress && /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 18, className: "text-blue-600 dark:text-blue-400 animate-spin" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-blue-800 dark:text-blue-300" }, "An update or branch switch is in progress. Health check is verifying the service..."))), systemInfo && systemInfo.previous_branch && systemInfo.previous_branch !== systemInfo.branch && /* @__PURE__ */ React.createElement("div", { className: "bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(ArrowLeft, { size: 18, className: "text-amber-600 dark:text-amber-400" }), /* @__PURE__ */ React.createElement("span", { className: "text-sm text-amber-800 dark:text-amber-300" }, "Testing a branch? Return to ", /* @__PURE__ */ React.createElement("span", { className: "font-mono font-semibold" }, systemInfo.previous_branch))), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: clearTestingMode2,
      disabled: rollingBack || switchingBranch || systemInfo && systemInfo.update_in_progress,
      className: "px-3 py-1.5 text-amber-700 dark:text-amber-300 text-sm rounded border border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50 disabled:opacity-50 disabled:cursor-not-allowed",
      title: "Stay on current branch and dismiss this banner"
    },
    "Dismiss"
  ), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: rollbackBranch2,
      disabled: rollingBack || switchingBranch || systemInfo && systemInfo.update_in_progress,
      className: "px-3 py-1.5 bg-amber-600 text-white text-sm rounded hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
    },
    rollingBack ? "Switching..." : systemInfo && systemInfo.update_in_progress ? "Busy..." : "Go Back"
  )))), branchPreview && /* @__PURE__ */ React.createElement("div", { className: "bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-3" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-indigo-900 dark:text-indigo-200 flex items-center gap-2" }, /* @__PURE__ */ React.createElement(GitBranch, { size: 16 }), /* @__PURE__ */ React.createElement("span", { className: "font-mono" }, branchPreview.branch)), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => setBranchPreview(null),
      className: "text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
    },
    /* @__PURE__ */ React.createElement(X, { size: 12 }),
    " Close preview"
  )), /* @__PURE__ */ React.createElement("div", { className: "text-sm text-indigo-800 dark:text-indigo-300 space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-4 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded" }, "+", branchPreview.ahead, " ahead"), /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 rounded" }, "-", branchPreview.behind, " behind"), /* @__PURE__ */ React.createElement("span", { className: "text-indigo-600 dark:text-indigo-400" }, "vs ", branchPreview.base_branch)), branchPreview.commits && branchPreview.commits.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "mt-2 max-h-40 overflow-y-auto space-y-1" }, branchPreview.commits.map((item, idx) => /* @__PURE__ */ React.createElement("div", { key: idx, className: "flex items-start gap-2 text-xs" }, /* @__PURE__ */ React.createElement("span", { className: "text-indigo-500 dark:text-indigo-400 flex-shrink-0" }, "\u25CF"), /* @__PURE__ */ React.createElement("span", { className: "text-indigo-900 dark:text-indigo-100" }, item.message), /* @__PURE__ */ React.createElement("span", { className: "font-mono text-indigo-500 dark:text-indigo-400 flex-shrink-0" }, "(", item.commit, ")")))), branchPreview.commits && branchPreview.commits.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-indigo-600 dark:text-indigo-400 italic" }, "No unique commits (branch is up to date with ", branchPreview.base_branch, ")")), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex justify-end" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => switchBranch2(branchPreview.branch),
      disabled: switchingBranch || systemInfo && systemInfo.update_in_progress,
      className: "px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white text-sm rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
    },
    switchingBranch ? "Switching..." : systemInfo && systemInfo.update_in_progress ? "Operation in progress..." : `Switch to ${branchPreview.branch}`
  ))), loadingPreview && /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-center py-4" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 18, className: "animate-spin text-indigo-600 dark:text-indigo-400" }), /* @__PURE__ */ React.createElement("span", { className: "ml-2 text-sm text-gray-600 dark:text-gray-400" }, "Loading branch preview...")), /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("h3", { className: "font-semibold text-gray-900 dark:text-white mb-3" }, "Available Branches"), availableBranches.length === 0 ? /* @__PURE__ */ React.createElement("p", { className: "text-gray-600 dark:text-gray-400 text-sm" }, "No branches found") : availableBranches.map((branch) => /* @__PURE__ */ React.createElement(
    "div",
    {
      key: branch.name,
      className: `border rounded-lg p-4 transition-all duration-200 ${branch.current ? "border-purple-500 dark:border-purple-600 bg-purple-50 dark:bg-purple-900/20" : branch.previous ? "border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/10" : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"}`
    },
    /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "flex-1 min-w-0" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 flex-wrap" }, /* @__PURE__ */ React.createElement(GitBranch, { size: 16, className: branch.current ? "text-purple-600 dark:text-purple-400" : "text-gray-500 dark:text-gray-400" }), /* @__PURE__ */ React.createElement("span", { className: `font-mono font-semibold ${branch.current ? "text-purple-700 dark:text-purple-300" : "text-gray-900 dark:text-white"}` }, branch.name), branch.current && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-purple-600 dark:bg-purple-500 text-white text-xs rounded-full" }, "Current"), branch.previous && !branch.current && /* @__PURE__ */ React.createElement("span", { className: "px-2 py-0.5 bg-amber-500 text-white text-xs rounded-full" }, "Previous"), branch.ahead_of_base > 0 && /* @__PURE__ */ React.createElement("span", { className: "px-1.5 py-0.5 text-xs bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded" }, "+", branch.ahead_of_base)), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3 mt-1 ml-6" }, branch.last_commit && /* @__PURE__ */ React.createElement("p", { className: "text-xs text-gray-600 dark:text-gray-400 truncate" }, branch.last_commit.substring(0, 60), branch.last_commit.length > 60 ? "..." : ""), branch.last_commit_date && /* @__PURE__ */ React.createElement("span", { className: "text-xs text-gray-400 dark:text-gray-500 flex-shrink-0" }, branch.last_commit_date))), !branch.current && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 ml-3 flex-shrink-0" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => fetchBranchPreview2(branch.name),
        disabled: loadingPreview || systemInfo && systemInfo.update_in_progress,
        className: "px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50",
        title: "Preview branch changes"
      },
      "Preview"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => switchBranch2(branch.name),
        disabled: switchingBranch || systemInfo && systemInfo.update_in_progress,
        className: "px-3 py-2 text-sm bg-purple-600 dark:bg-purple-500 text-white rounded hover:bg-purple-700 dark:hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
      },
      switchingBranch ? "Switching..." : systemInfo && systemInfo.update_in_progress ? "Busy..." : "Switch"
    )))
  ))), /* @__PURE__ */ React.createElement("div", { className: "flex justify-end pt-4" }, /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: () => {
        setShowBranchModal(!1), setBranchPreview(null);
      },
      className: "px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center gap-1.5"
    },
    /* @__PURE__ */ React.createElement(X, { size: 14 }),
    " Close"
  ))))))), SystemModals_default = SystemModals;

  // src/components/dashboard/DashboardFooter.jsx
  function DashboardFooter({
    lastUpdate,
    backendCollected,
    handleRefresh,
    loading,
    systemInfo,
    data,
    fetchBranches: fetchBranches2,
    setShowBranchModal,
    clearTestingMode: clearTestingMode2
  }) {
    return /* @__PURE__ */ React.createElement("div", { className: "hidden sm:block fixed bottom-0 left-0 right-0 bg-gray-100/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 py-2 px-4 z-40" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 text-xs text-gray-600 dark:text-gray-400" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-4" }, lastUpdate && /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Clock, { size: 12 }), /* @__PURE__ */ React.createElement("span", null, "UI refreshed: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-700 dark:text-gray-300" }, formatLocalTime(lastUpdate), " ", getTimezoneAbbr()))), backendCollected && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300 dark:text-gray-700" }, "|"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-1.5" }, /* @__PURE__ */ React.createElement(Server, { size: 12 }), /* @__PURE__ */ React.createElement("span", null, "Data collected: ", /* @__PURE__ */ React.createElement("span", { className: "font-semibold text-gray-700 dark:text-gray-300" }, formatLocalTime(backendCollected), " ", getTimezoneAbbr()), data?.performance?.total_time && /* @__PURE__ */ React.createElement("span", { className: "text-gray-500 dark:text-gray-400 ml-1" }, "(", data.performance.total_time, "s)")), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: handleRefresh,
        disabled: loading,
        className: "ml-1 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
        title: "Refresh data collection now"
      },
      /* @__PURE__ */ React.createElement(RefreshCw, { size: 12, className: loading ? "animate-spin text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400" })
    ))), systemInfo && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300 dark:text-gray-700" }, "|"), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2" }, /* @__PURE__ */ React.createElement("span", null, "Branch: ", /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          fetchBranches2(), setShowBranchModal(!0);
        },
        className: "font-mono text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline decoration-dotted cursor-pointer",
        title: "Click to manage branches"
      },
      systemInfo.branch
    )), systemInfo.previous_branch && systemInfo.previous_branch !== systemInfo.branch && /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: clearTestingMode2,
        className: "px-1.5 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 rounded hover:bg-amber-200 dark:hover:bg-amber-800/50 cursor-pointer",
        title: `Click to dismiss \u2014 previously on ${systemInfo.previous_branch}`
      },
      "testing \xD7"
    ), /* @__PURE__ */ React.createElement("span", { className: "text-gray-300 dark:text-gray-700" }, "|"), /* @__PURE__ */ React.createElement("span", null, "Commit: ", /* @__PURE__ */ React.createElement("span", { className: "font-mono text-gray-600 dark:text-gray-400" }, systemInfo.commit)), systemInfo.updates_available && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("span", { className: "text-gray-300 dark:text-gray-700" }, "|"), /* @__PURE__ */ React.createElement("span", { className: "text-yellow-600 dark:text-yellow-400 font-semibold" }, systemInfo.commits_behind, " update", systemInfo.commits_behind > 1 ? "s" : "", " available"))))), /* @__PURE__ */ React.createElement("div", { className: "text-xs font-semibold bg-gradient-to-r from-yellow-400 via-orange-500 to-orange-600 bg-clip-text text-transparent" }, "ProxBalance")));
  }

  // src/components/DashboardPage.jsx
  var { useState: useState16 } = React;
  function DashboardPage({
    // Data & loading
    data,
    setData,
    loading,
    error,
    setError,
    config,
    // Dark mode
    darkMode,
    toggleDarkMode,
    // Navigation
    setCurrentPage,
    setScrollToApiConfig,
    setOpenPenaltyConfigOnAutomation,
    // Token auth
    tokenAuthError,
    setTokenAuthError,
    // Dashboard header
    dashboardHeaderCollapsed,
    setDashboardHeaderCollapsed,
    handleLogoHover,
    logoBalancing,
    // Cluster health
    clusterHealth,
    // System info & updates
    systemInfo,
    showUpdateModal,
    setShowUpdateModal,
    updating,
    updateLog,
    setUpdateLog,
    updateResult,
    setUpdateResult,
    updateError,
    handleUpdate: handleUpdate2,
    // Branch management
    showBranchModal,
    setShowBranchModal,
    loadingBranches,
    availableBranches,
    branchPreview,
    setBranchPreview,
    loadingPreview,
    switchingBranch,
    rollingBack,
    fetchBranches: fetchBranches2,
    switchBranch: switchBranch2,
    rollbackBranch: rollbackBranch2,
    clearTestingMode: clearTestingMode2,
    fetchBranchPreview: fetchBranchPreview2,
    // Automation
    automationStatus,
    automationConfig,
    fetchAutomationStatus: fetchAutomationStatus2,
    runAutomationNow: runAutomationNow2,
    runningAutomation,
    runNowMessage,
    setRunNowMessage,
    runHistory,
    expandedRun,
    setExpandedRun,
    // Recommendations
    recommendations,
    loadingRecommendations,
    generateRecommendations: generateRecommendations2,
    recommendationData,
    penaltyConfig,
    // AI recommendations
    aiEnabled,
    aiRecommendations,
    loadingAi,
    aiAnalysisPeriod,
    setAiAnalysisPeriod,
    fetchAiRecommendations: fetchAiRecommendations2,
    // Migrations
    canMigrate,
    migrationStatus,
    setMigrationStatus,
    completedMigrations,
    guestsMigrating,
    migrationProgress,
    cancelMigration,
    trackMigration,
    // Migration dialog
    showMigrationDialog,
    setShowMigrationDialog,
    selectedGuest,
    setSelectedGuest,
    migrationTarget,
    setMigrationTarget,
    executeMigration,
    // Tag management
    showTagModal,
    setShowTagModal,
    tagModalGuest,
    setTagModalGuest,
    newTag,
    setNewTag,
    handleAddTag,
    handleRemoveTag,
    // Remove tag confirmation
    confirmRemoveTag,
    setConfirmRemoveTag,
    confirmAndRemoveTag,
    // Migration confirmation
    confirmMigration,
    setConfirmMigration,
    confirmAndMigrate,
    // Batch migration
    showBatchConfirmation,
    setShowBatchConfirmation,
    pendingBatchMigrations,
    confirmBatchMigration,
    // Cancel migration
    cancelMigrationModal,
    setCancelMigrationModal,
    cancellingMigration,
    setCancellingMigration,
    // Section collapse
    collapsedSections,
    setCollapsedSections,
    toggleSection,
    // Timestamps
    lastUpdate,
    backendCollected,
    handleRefresh,
    // Cluster map
    clusterMapViewMode,
    setClusterMapViewMode,
    showPoweredOffGuests,
    setShowPoweredOffGuests,
    selectedNode,
    setSelectedNode,
    selectedGuestDetails,
    setSelectedGuestDetails,
    // Node status
    nodeGridColumns,
    setNodeGridColumns,
    chartPeriod,
    setChartPeriod,
    nodeScores,
    // Guest profiles & score history
    guestProfiles,
    scoreHistory,
    // Maintenance & evacuation
    maintenanceNodes,
    setMaintenanceNodes,
    evacuatingNodes,
    setEvacuatingNodes,
    planningNodes,
    setPlanningNodes,
    evacuationPlan,
    setEvacuationPlan,
    planNode,
    setPlanNode,
    guestActions,
    setGuestActions,
    guestTargets,
    setGuestTargets,
    showConfirmModal,
    setShowConfirmModal,
    // Guest tag management table
    guestSearchFilter,
    setGuestSearchFilter,
    guestCurrentPage,
    setGuestCurrentPage,
    guestPageSize,
    setGuestPageSize,
    guestSortField,
    setGuestSortField,
    guestSortDirection,
    setGuestSortDirection,
    // Guest modal collapsed state
    guestModalCollapsed,
    setGuestModalCollapsed,
    // Helper functions
    checkAffinityViolations,
    generateSparkline,
    fetchGuestLocations: fetchGuestLocations2,
    // Guest migration options
    guestMigrationOptions,
    loadingGuestOptions,
    fetchGuestMigrationOptions: fetchGuestMigrationOptions2,
    setGuestMigrationOptions,
    // API base
    API_BASE: API_BASE4
  }) {
    let [showPredicted, setShowPredicted] = useState16(!1), ignoredGuests = Object.values(data.guests || {}).filter((g) => g.tags?.has_ignore), excludeGuests = Object.values(data.guests || {}).filter((g) => g.tags?.exclude_groups?.length > 0), affinityGuests = Object.values(data.guests || {}).filter((g) => g.tags?.affinity_groups?.length > 0 || g.tags?.all_tags?.some((t) => t.startsWith("affinity_"))), autoMigrateOkGuests = Object.values(data.guests || {}).filter((g) => g.tags?.all_tags?.includes("auto_migrate_ok")), violations = checkAffinityViolations();
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pb-20 sm:pb-4 overflow-x-hidden" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto" }, tokenAuthError && /* @__PURE__ */ React.createElement("div", { className: "mb-4 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-600 dark:border-red-400 p-4 rounded-r-lg shadow-lg" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 24, className: "text-red-600 dark:text-red-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-bold text-red-900 dark:text-red-200 mb-1" }, "API Token Authentication Failed"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-800 dark:text-red-300 mb-3" }, "ProxBalance cannot connect to the Proxmox API due to invalid or misconfigured token credentials. This prevents cluster data collection and monitoring."), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => {
          setScrollToApiConfig(!0), setCurrentPage("settings");
        },
        className: "flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 font-medium"
      },
      /* @__PURE__ */ React.createElement(Settings, { size: 16 }),
      "Fix Token Configuration"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        onClick: () => setTokenAuthError(!1),
        className: "flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
      },
      /* @__PURE__ */ React.createElement(X, { size: 16 }),
      "Dismiss"
    ))))), /* @__PURE__ */ React.createElement(
      DashboardHeader,
      {
        data,
        darkMode,
        toggleDarkMode,
        setCurrentPage,
        dashboardHeaderCollapsed,
        setDashboardHeaderCollapsed,
        handleLogoHover,
        logoBalancing,
        clusterHealth,
        systemInfo,
        setShowUpdateModal,
        setShowBranchModal,
        fetchBranches: fetchBranches2,
        recommendations
      }
    ), /* @__PURE__ */ React.createElement(
      AutomationStatusSection,
      {
        automationStatus,
        automationConfig,
        scoreHistory,
        collapsedSections,
        setCollapsedSections,
        toggleSection,
        setCurrentPage,
        fetchAutomationStatus: fetchAutomationStatus2,
        runAutomationNow: runAutomationNow2,
        runningAutomation,
        runNowMessage,
        setRunNowMessage,
        setCancelMigrationModal,
        runHistory,
        expandedRun,
        setExpandedRun
      }
    ), /* @__PURE__ */ React.createElement(
      GuestTagManagement,
      {
        data,
        guestProfiles,
        collapsedSections,
        toggleSection,
        guestSearchFilter,
        setGuestSearchFilter,
        guestCurrentPage,
        setGuestCurrentPage,
        guestPageSize,
        setGuestPageSize,
        guestSortField,
        setGuestSortField,
        guestSortDirection,
        setGuestSortDirection,
        canMigrate,
        setTagModalGuest,
        setShowTagModal,
        handleRemoveTag,
        ignoredGuests,
        excludeGuests,
        affinityGuests,
        autoMigrateOkGuests
      }
    ), /* @__PURE__ */ React.createElement(
      ClusterMap,
      {
        data,
        collapsedSections,
        toggleSection,
        showPoweredOffGuests,
        setShowPoweredOffGuests,
        clusterMapViewMode,
        setClusterMapViewMode,
        maintenanceNodes,
        setSelectedNode,
        setSelectedGuestDetails,
        guestsMigrating,
        migrationProgress,
        completedMigrations
      }
    ), /* @__PURE__ */ React.createElement(
      NodeDetailsModal,
      {
        selectedNode,
        setSelectedNode,
        maintenanceNodes,
        setMaintenanceNodes,
        canMigrate,
        evacuatingNodes,
        planningNodes,
        setPlanningNodes,
        setEvacuationPlan,
        setPlanNode,
        setError,
        nodeScores,
        penaltyConfig,
        generateSparkline,
        API_BASE: API_BASE4
      }
    ), /* @__PURE__ */ React.createElement(
      GuestDetailsModal,
      {
        selectedGuestDetails,
        setSelectedGuestDetails,
        generateSparkline,
        guestModalCollapsed,
        setGuestModalCollapsed,
        guestMigrationOptions,
        loadingGuestOptions,
        fetchGuestMigrationOptions: fetchGuestMigrationOptions2,
        canMigrate,
        setSelectedGuest,
        setMigrationTarget,
        setShowMigrationDialog
      }
    ), /* @__PURE__ */ React.createElement(
      EvacuationModals,
      {
        evacuationPlan,
        setEvacuationPlan,
        planNode,
        setPlanNode,
        guestTargets,
        setGuestTargets,
        guestActions,
        setGuestActions,
        showConfirmModal,
        setShowConfirmModal,
        setEvacuatingNodes,
        maintenanceNodes,
        fetchGuestLocations: fetchGuestLocations2,
        setError,
        API_BASE: API_BASE4
      }
    ), /* @__PURE__ */ React.createElement(
      NodeStatusSection,
      {
        data,
        collapsedSections,
        toggleSection,
        showPredicted,
        setShowPredicted,
        recommendationData,
        recommendations,
        nodeGridColumns,
        setNodeGridColumns,
        chartPeriod,
        setChartPeriod,
        nodeScores,
        generateSparkline
      }
    ), /* @__PURE__ */ React.createElement(
      MigrationRecommendationsSection,
      {
        data,
        recommendations,
        loadingRecommendations,
        generateRecommendations: generateRecommendations2,
        recommendationData,
        penaltyConfig,
        collapsedSections,
        setCollapsedSections,
        toggleSection,
        canMigrate,
        migrationStatus,
        setMigrationStatus,
        completedMigrations,
        guestsMigrating,
        migrationProgress,
        cancelMigration,
        trackMigration,
        setConfirmMigration,
        setCurrentPage,
        setOpenPenaltyConfigOnAutomation,
        nodeScores,
        API_BASE: API_BASE4
      }
    ), /* @__PURE__ */ React.createElement(
      AIRecommendationsSection,
      {
        config,
        aiEnabled,
        collapsedSections,
        toggleSection,
        aiRecommendations,
        loadingAi,
        aiAnalysisPeriod,
        setAiAnalysisPeriod,
        fetchAiRecommendations: fetchAiRecommendations2,
        migrationStatus,
        setMigrationStatus,
        completedMigrations,
        guestsMigrating,
        migrationProgress,
        cancelMigration,
        canMigrate,
        trackMigration,
        API_BASE: API_BASE4
      }
    ))), /* @__PURE__ */ React.createElement(
      SystemModals_default,
      {
        showUpdateModal,
        setShowUpdateModal,
        updating,
        updateLog,
        setUpdateLog,
        updateResult,
        setUpdateResult,
        updateError,
        handleUpdate: handleUpdate2,
        systemInfo,
        showBranchModal,
        setShowBranchModal,
        loadingBranches,
        availableBranches,
        branchPreview,
        setBranchPreview,
        loadingPreview,
        switchingBranch,
        rollingBack,
        fetchBranches: fetchBranches2,
        switchBranch: switchBranch2,
        rollbackBranch: rollbackBranch2,
        clearTestingMode: clearTestingMode2,
        fetchBranchPreview: fetchBranchPreview2
      }
    ), /* @__PURE__ */ React.createElement(
      MigrationModals,
      {
        showMigrationDialog,
        setShowMigrationDialog,
        selectedGuest,
        canMigrate,
        migrationTarget,
        setMigrationTarget,
        data,
        setData,
        executeMigration,
        showTagModal,
        setShowTagModal,
        tagModalGuest,
        setTagModalGuest,
        newTag,
        setNewTag,
        handleAddTag,
        setError,
        confirmRemoveTag,
        setConfirmRemoveTag,
        confirmAndRemoveTag,
        confirmMigration,
        setConfirmMigration,
        confirmAndMigrate,
        showBatchConfirmation,
        setShowBatchConfirmation,
        pendingBatchMigrations,
        confirmBatchMigration,
        collapsedSections,
        setCollapsedSections,
        cancelMigrationModal,
        setCancelMigrationModal,
        cancellingMigration,
        setCancellingMigration,
        fetchAutomationStatus: fetchAutomationStatus2
      }
    ), /* @__PURE__ */ React.createElement(
      DashboardFooter,
      {
        lastUpdate,
        backendCollected,
        handleRefresh,
        loading,
        systemInfo,
        data,
        fetchBranches: fetchBranches2,
        setShowBranchModal,
        clearTestingMode: clearTestingMode2
      }
    ));
  }

  // src/components/IconLegend.jsx
  var { useState: useState17 } = React, iconGroups = [
    {
      label: "Actions",
      icons: [
        { Icon: Save, name: "Save" },
        { Icon: Edit, name: "Edit" },
        { Icon: Trash, name: "Delete / Remove" },
        { Icon: Copy, name: "Copy" },
        { Icon: Plus, name: "Add / Create" },
        { Icon: Minus, name: "Remove" },
        { Icon: Check, name: "Confirm / Done" },
        { Icon: X, name: "Close / Cancel" },
        { Icon: Download, name: "Download / Export" },
        { Icon: Upload, name: "Upload / Import" },
        { Icon: Search, name: "Search / Find" },
        { Icon: Filter, name: "Filter" },
        { Icon: RefreshCw, name: "Refresh / Reload" },
        { Icon: RotateCcw, name: "Reset / Undo" }
      ]
    },
    {
      label: "Navigation",
      icons: [
        { Icon: ArrowLeft, name: "Back" },
        { Icon: ArrowRight, name: "Forward / Go to" },
        { Icon: ChevronLeft, name: "Previous" },
        { Icon: ChevronRight, name: "Next" },
        { Icon: ChevronsLeft, name: "First page" },
        { Icon: ChevronsRight, name: "Last page" },
        { Icon: ChevronDown, name: "Expand" },
        { Icon: ChevronUp, name: "Collapse" },
        { Icon: MoveRight, name: "Migrate / Move" }
      ]
    },
    {
      label: "Status",
      icons: [
        { Icon: CheckCircle, name: "Success / Enabled" },
        { Icon: XCircle, name: "Error / Disabled" },
        { Icon: AlertCircle, name: "Alert" },
        { Icon: AlertTriangle, name: "Warning" },
        { Icon: Info, name: "Information" },
        { Icon: HelpCircle, name: "Help" },
        { Icon: Loader, name: "Loading" },
        { Icon: Shield, name: "Protected / Safe" },
        { Icon: Lock, name: "Locked / Secure" },
        { Icon: Eye, name: "Visible / Preview" },
        { Icon: EyeOff, name: "Hidden" }
      ]
    },
    {
      label: "Infrastructure",
      icons: [
        { Icon: Server, name: "Node / Server" },
        { Icon: HardDrive, name: "Storage / Disk" },
        { Icon: Cpu, name: "CPU" },
        { Icon: MemoryStick, name: "Memory / RAM" },
        { Icon: Database, name: "Database" },
        { Icon: Globe, name: "Network" },
        { Icon: Wifi, name: "Connectivity" },
        { Icon: Zap, name: "Performance / I/O" },
        { Icon: Power, name: "Power / Toggle" },
        { Icon: Package, name: "VM / Container" }
      ]
    },
    {
      label: "Features",
      icons: [
        { Icon: Activity, name: "Dashboard / Metrics" },
        { Icon: Clock, name: "Automation / Schedule" },
        { Icon: Settings, name: "Settings" },
        { Icon: Play, name: "Run / Start" },
        { Icon: Pause, name: "Pause" },
        { Icon: Square, name: "Stop" },
        { Icon: History, name: "History / Logs" },
        { Icon: Bell, name: "Notifications" },
        { Icon: Calendar, name: "Schedule / Window" },
        { Icon: Tag, name: "Tag / Label" },
        { Icon: ClipboardList, name: "Recommendations" },
        { Icon: Folder, name: "Group / Category" },
        { Icon: List, name: "List view" },
        { Icon: Terminal, name: "Console / CLI" }
      ]
    },
    {
      label: "System",
      icons: [
        { Icon: Sun, name: "Light mode" },
        { Icon: Moon, name: "Dark mode" },
        { Icon: GitHub, name: "GitHub" },
        { Icon: GitBranch, name: "Branch / Version" },
        { Icon: UserPlus, name: "Add user" },
        { Icon: Users, name: "Manage users" }
      ]
    }
  ];
  function IconLegend({ darkMode, onClose }) {
    let [searchTerm, setSearchTerm] = useState17(""), filteredGroups = iconGroups.map((group) => ({
      ...group,
      icons: group.icons.filter(
        (icon) => icon.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    })).filter((group) => group.icons.length > 0);
    return /* @__PURE__ */ React.createElement("div", { className: "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4", onClick: onClose }, /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col",
        onClick: (e) => e.stopPropagation()
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700" }, /* @__PURE__ */ React.createElement("h2", { className: "text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2" }, /* @__PURE__ */ React.createElement(HelpCircle, { size: 20 }), " Icon Reference"), /* @__PURE__ */ React.createElement("button", { onClick: onClose, className: "p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded", title: "Close" }, /* @__PURE__ */ React.createElement(X, { size: 20, className: "text-gray-500 dark:text-gray-400" }))),
      /* @__PURE__ */ React.createElement("div", { className: "px-4 pt-3 pb-2" }, /* @__PURE__ */ React.createElement("div", { className: "relative" }, /* @__PURE__ */ React.createElement(Search, { size: 16, className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" }), /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "text",
          placeholder: "Search icons...",
          value: searchTerm,
          onChange: (e) => setSearchTerm(e.target.value),
          className: "w-full pl-9 pr-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
        }
      ))),
      /* @__PURE__ */ React.createElement("div", { className: "overflow-y-auto p-4 pt-2 space-y-4" }, filteredGroups.map((group) => /* @__PURE__ */ React.createElement("div", { key: group.label }, /* @__PURE__ */ React.createElement("h3", { className: "text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2" }, group.label), /* @__PURE__ */ React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-3 gap-1.5" }, group.icons.map(({ Icon, name }) => /* @__PURE__ */ React.createElement(
        "div",
        {
          key: name,
          className: "flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-gray-50 dark:bg-gray-700/50 text-sm"
        },
        /* @__PURE__ */ React.createElement(Icon, { size: 16, className: "text-gray-600 dark:text-gray-300 flex-shrink-0" }),
        /* @__PURE__ */ React.createElement("span", { className: "text-gray-700 dark:text-gray-200 truncate" }, name)
      ))))), filteredGroups.length === 0 && /* @__PURE__ */ React.createElement("p", { className: "text-center text-gray-500 dark:text-gray-400 py-4" }, "No icons match your search."))
    ));
  }

  // src/hooks/useDarkMode.js
  var { useState: useState18 } = React;
  function useDarkMode(initialDark = !0) {
    let [darkMode, setDarkMode] = useState18(initialDark);
    return { darkMode, setDarkMode, toggleDarkMode: () => {
      setDarkMode(!darkMode), document.documentElement.classList.toggle("dark");
    } };
  }

  // src/hooks/useUIState.js
  var { useState: useState19, useEffect: useEffect8 } = React;
  function useUIState() {
    let [currentPage, setCurrentPage] = useState19("dashboard"), [showSettings, setShowSettings] = useState19(!1), [showAdvancedSettings, setShowAdvancedSettings] = useState19(!1), [showIconLegend, setShowIconLegend] = useState19(!1), [scrollToApiConfig, setScrollToApiConfig] = useState19(!1), [logoBalancing, setLogoBalancing] = useState19(!1), [countdownTick, setCountdownTick] = useState19(0), [refreshElapsed, setRefreshElapsed] = useState19(0), [dashboardHeaderCollapsed, setDashboardHeaderCollapsed] = useState19(() => {
      let saved = localStorage.getItem("dashboardHeaderCollapsed");
      return saved ? JSON.parse(saved) : !1;
    }), [nodeGridColumns, setNodeGridColumns] = useState19(() => {
      let saved = localStorage.getItem("nodeGridColumns");
      return saved ? parseInt(saved) : 3;
    }), [collapsedSections, setCollapsedSections] = useState19(() => {
      let defaults = {
        clusterMap: !1,
        maintenance: !0,
        nodeStatus: !0,
        recommendations: !1,
        aiRecommendations: !1,
        taggedGuests: !0,
        analysisDetails: !0,
        mainSettings: !1,
        smartMigrations: !0,
        safetyRules: !1,
        additionalRules: !1,
        automatedMigrations: !0,
        howItWorks: !0,
        decisionTree: !0,
        penaltyScoring: !0,
        distributionBalancing: !0,
        distributionBalancingHelp: !0,
        lastRunSummary: !0,
        mountPoints: !0,
        passthroughDisks: !0,
        notificationSettings: !0
      }, saved = localStorage.getItem("collapsedSections");
      return saved ? { ...defaults, ...JSON.parse(saved) } : defaults;
    }), [clusterMapViewMode, setClusterMapViewMode] = useState19(() => {
      let saved = localStorage.getItem("clusterMapViewMode");
      return saved === "usage" ? "cpu" : saved || "cpu";
    }), [showPoweredOffGuests, setShowPoweredOffGuests] = useState19(() => {
      let saved = localStorage.getItem("showPoweredOffGuests");
      return saved === null ? !0 : saved === "true";
    }), [guestModalCollapsed, setGuestModalCollapsed] = useState19({
      mountPoints: !0,
      passthroughDisks: !0
    });
    return useEffect8(() => {
      localStorage.setItem("collapsedSections", JSON.stringify(collapsedSections));
    }, [collapsedSections]), useEffect8(() => {
      localStorage.setItem("nodeGridColumns", nodeGridColumns.toString());
    }, [nodeGridColumns]), useEffect8(() => {
      localStorage.setItem("clusterMapViewMode", clusterMapViewMode);
    }, [clusterMapViewMode]), useEffect8(() => {
      localStorage.setItem("showPoweredOffGuests", showPoweredOffGuests.toString());
    }, [showPoweredOffGuests]), useEffect8(() => {
      localStorage.setItem("dashboardHeaderCollapsed", JSON.stringify(dashboardHeaderCollapsed));
    }, [dashboardHeaderCollapsed]), useEffect8(() => {
      let interval = setInterval(() => {
        setCountdownTick((prev) => prev + 1);
      }, 1e3);
      return () => clearInterval(interval);
    }, []), useEffect8(() => {
    }, [showSettings]), {
      currentPage,
      setCurrentPage,
      showSettings,
      setShowSettings,
      showAdvancedSettings,
      setShowAdvancedSettings,
      showIconLegend,
      setShowIconLegend,
      scrollToApiConfig,
      setScrollToApiConfig,
      logoBalancing,
      countdownTick,
      refreshElapsed,
      setRefreshElapsed,
      dashboardHeaderCollapsed,
      setDashboardHeaderCollapsed,
      nodeGridColumns,
      setNodeGridColumns,
      collapsedSections,
      setCollapsedSections,
      clusterMapViewMode,
      setClusterMapViewMode,
      showPoweredOffGuests,
      setShowPoweredOffGuests,
      guestModalCollapsed,
      setGuestModalCollapsed,
      toggleSection: (section) => {
        setCollapsedSections((prev) => ({
          ...prev,
          [section]: !prev[section]
        }));
      },
      handleLogoHover: () => {
        logoBalancing || (setLogoBalancing(!0), setTimeout(() => setLogoBalancing(!1), 2e3));
      }
    };
  }

  // src/hooks/useAuth.js
  var { useState: useState20 } = React;
  function useAuth(API_BASE4) {
    let [canMigrate, setCanMigrate] = useState20(!0), [permissionReason, setPermissionReason] = useState20(""), [proxmoxTokenId, setProxmoxTokenId] = useState20(""), [proxmoxTokenSecret, setProxmoxTokenSecret] = useState20(""), [validatingToken, setValidatingToken] = useState20(!1), [tokenValidationResult, setTokenValidationResult] = useState20(null), [tokenAuthError, setTokenAuthError] = useState20(!1);
    return {
      canMigrate,
      setCanMigrate,
      permissionReason,
      setPermissionReason,
      proxmoxTokenId,
      setProxmoxTokenId,
      proxmoxTokenSecret,
      setProxmoxTokenSecret,
      validatingToken,
      tokenValidationResult,
      tokenAuthError,
      setTokenAuthError,
      checkPermissions: async () => {
        try {
          let result = await (await fetch(`${API_BASE4}/permissions`)).json();
          result.success && (setCanMigrate(result.can_migrate), setPermissionReason(result.reason || ""));
        } catch (err) {
          console.error("Permission check failed:", err), setCanMigrate(!0);
        }
      },
      validateToken: async () => {
        setValidatingToken(!0), setTokenValidationResult(null);
        try {
          let result = await (await fetch(`${API_BASE4}/validate-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              proxmox_api_token_id: proxmoxTokenId,
              proxmox_api_token_secret: proxmoxTokenSecret
            })
          })).json();
          result.success ? setTokenValidationResult({
            success: !0,
            message: "Token is valid!",
            permissions: result.permissions || [],
            version: result.version || "Unknown"
          }) : setTokenValidationResult({
            success: !1,
            message: result.error || "Token validation failed",
            permissions: []
          });
        } catch (error) {
          setTokenValidationResult({
            success: !1,
            message: `Validation error: ${error.message}`,
            permissions: []
          });
        } finally {
          setValidatingToken(!1);
        }
      }
    };
  }

  // src/hooks/useConfig.js
  var { useState: useState21, useEffect: useEffect9 } = React;
  function useConfig(API_BASE4, deps = {}) {
    let { setError } = deps, [config, setConfig] = useState21(null), [autoRefreshInterval, setAutoRefreshInterval] = useState21(3600 * 1e3), [tempBackendInterval, setTempBackendInterval] = useState21(60), [tempUiInterval, setTempUiInterval] = useState21(60), [savingSettings, setSavingSettings] = useState21(!1), [savingCollectionSettings, setSavingCollectionSettings] = useState21(!1), [collectionSettingsSaved, setCollectionSettingsSaved] = useState21(!1), [logLevel, setLogLevel] = useState21("INFO"), [verboseLogging, setVerboseLogging] = useState21(!1), [penaltyConfig, setPenaltyConfig] = useState21(null), [penaltyDefaults, setPenaltyDefaults] = useState21(null), [savingPenaltyConfig, setSavingPenaltyConfig] = useState21(!1), [penaltyConfigSaved, setPenaltyConfigSaved] = useState21(!1), [penaltyPresets, setPenaltyPresets] = useState21(null), [activePreset, setActivePreset] = useState21("custom"), [openPenaltyConfigOnAutomation, setOpenPenaltyConfigOnAutomation] = useState21(!1), [migrationSettings, setMigrationSettings] = useState21(null), [migrationSettingsDefaults, setMigrationSettingsDefaults] = useState21(null), [migrationSettingsDescriptions, setMigrationSettingsDescriptions] = useState21(null), [effectivePenaltyConfig, setEffectivePenaltyConfig] = useState21(null), [hasExpertOverrides, setHasExpertOverrides] = useState21(!1), [savingMigrationSettings, setSavingMigrationSettings] = useState21(!1), [migrationSettingsSaved, setMigrationSettingsSaved] = useState21(!1), fetchConfig2 = async () => {
      try {
        let result = await (await fetch(`${API_BASE4}/config`)).json();
        if (result.success) {
          setConfig(result.config);
          let intervalMs = (result.config.ui_refresh_interval_minutes || 60) * 60 * 1e3;
          return setAutoRefreshInterval(intervalMs), setTempBackendInterval(result.config.collection_interval_minutes || 60), setTempUiInterval(result.config.ui_refresh_interval_minutes || 60), result.config;
        }
      } catch (err) {
        console.error("Failed to load config:", err);
      }
      return null;
    }, fetchPenaltyConfig2 = async () => {
      try {
        let result = await (await fetch(`${API_BASE4}/penalty-config`)).json();
        result.success && (setPenaltyConfig(result.config), setPenaltyDefaults(result.defaults), result.presets && setPenaltyPresets(result.presets), result.active_preset && setActivePreset(result.active_preset));
      } catch (err) {
        console.error("Failed to load penalty config:", err);
      }
    };
    return {
      config,
      setConfig,
      autoRefreshInterval,
      setAutoRefreshInterval,
      tempBackendInterval,
      setTempBackendInterval,
      tempUiInterval,
      setTempUiInterval,
      savingSettings,
      savingCollectionSettings,
      setSavingCollectionSettings,
      collectionSettingsSaved,
      setCollectionSettingsSaved,
      logLevel,
      setLogLevel,
      verboseLogging,
      setVerboseLogging,
      penaltyConfig,
      setPenaltyConfig,
      penaltyDefaults,
      savingPenaltyConfig,
      penaltyConfigSaved,
      penaltyPresets,
      activePreset,
      openPenaltyConfigOnAutomation,
      setOpenPenaltyConfigOnAutomation,
      fetchConfig: fetchConfig2,
      fetchPenaltyConfig: fetchPenaltyConfig2,
      applyPenaltyPreset: async (presetName) => {
        try {
          setSavingPenaltyConfig(!0);
          let result = await (await fetch(`${API_BASE4}/penalty-config/presets/${presetName}`, { method: "POST" })).json();
          result.success && (setPenaltyConfig(result.config), setActivePreset(result.active_preset || presetName), setPenaltyConfigSaved(!0), setTimeout(() => setPenaltyConfigSaved(!1), 3e3));
        } catch (err) {
          console.error("Failed to apply preset:", err);
        } finally {
          setSavingPenaltyConfig(!1);
        }
      },
      saveSettings: async (settingsPayload) => {
        setSavingSettings(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(settingsPayload)
          })).json();
          if (result.success) {
            setConfig(result.config);
            let intervalMs = (result.config.ui_refresh_interval_minutes || tempUiInterval) * 60 * 1e3;
            return setAutoRefreshInterval(intervalMs), { success: !0, config: result.config, intervalMs };
          } else
            return setError && setError("Failed to save settings: " + result.error), { success: !1 };
        } catch (err) {
          return setError && setError("Failed to save settings: " + err.message), { success: !1 };
        } finally {
          setSavingSettings(!1);
        }
      },
      savePenaltyConfig: async () => {
        setSavingPenaltyConfig(!0), setPenaltyConfigSaved(!1);
        try {
          let result = await (await fetch(`${API_BASE4}/penalty-config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ config: penaltyConfig })
          })).json();
          result.success ? (setPenaltyConfig(result.config), setPenaltyConfigSaved(!0), setTimeout(() => setPenaltyConfigSaved(!1), 3e3)) : setError && setError(`Failed to save penalty config: ${result.error}`);
        } catch (err) {
          console.error("Failed to save penalty config:", err), setError && setError(`Error saving penalty config: ${err.message}`);
        } finally {
          setSavingPenaltyConfig(!1);
        }
      },
      resetPenaltyConfig: async () => {
        setSavingPenaltyConfig(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/penalty-config/reset`, {
            method: "POST"
          })).json();
          result.success ? setPenaltyConfig(result.config) : setError && setError(`Failed to reset penalty config: ${result.error}`);
        } catch (err) {
          console.error("Failed to reset penalty config:", err), setError && setError(`Error resetting penalty config: ${err.message}`);
        } finally {
          setSavingPenaltyConfig(!1);
        }
      },
      // Migration settings
      migrationSettings,
      setMigrationSettings,
      migrationSettingsDefaults,
      migrationSettingsDescriptions,
      effectivePenaltyConfig,
      hasExpertOverrides,
      savingMigrationSettings,
      migrationSettingsSaved,
      fetchMigrationSettings: async () => {
        try {
          let result = await (await fetch(`${API_BASE4}/migration-settings`)).json();
          result.success && (setMigrationSettings(result.settings), setMigrationSettingsDefaults(result.defaults), setMigrationSettingsDescriptions(result.descriptions), setEffectivePenaltyConfig(result.effective_penalty_config), setHasExpertOverrides(result.has_expert_overrides || !1));
        } catch (err) {
          console.error("Failed to load migration settings:", err);
        }
      },
      saveMigrationSettingsAction: async () => {
        if (migrationSettings) {
          setSavingMigrationSettings(!0), setMigrationSettingsSaved(!1);
          try {
            let result = await (await fetch(`${API_BASE4}/migration-settings`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ settings: migrationSettings })
            })).json();
            result.success ? (setMigrationSettings(result.settings), setEffectivePenaltyConfig(result.effective_penalty_config), setMigrationSettingsSaved(!0), setTimeout(() => setMigrationSettingsSaved(!1), 3e3), fetchPenaltyConfig2()) : setError && setError(`Failed to save migration settings: ${result.error}`);
          } catch (err) {
            console.error("Failed to save migration settings:", err), setError && setError(`Error saving migration settings: ${err.message}`);
          } finally {
            setSavingMigrationSettings(!1);
          }
        }
      },
      resetMigrationSettingsAction: async () => {
        setSavingMigrationSettings(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/migration-settings/reset`, {
            method: "POST"
          })).json();
          result.success ? (setMigrationSettings(result.settings), setEffectivePenaltyConfig(result.effective_penalty_config), setMigrationSettingsSaved(!0), setTimeout(() => setMigrationSettingsSaved(!1), 3e3), fetchPenaltyConfig2()) : setError && setError(`Failed to reset migration settings: ${result.error}`);
        } catch (err) {
          console.error("Failed to reset migration settings:", err), setError && setError(`Error resetting migration settings: ${err.message}`);
        } finally {
          setSavingMigrationSettings(!1);
        }
      }
    };
  }

  // src/hooks/useClusterData.js
  var { useState: useState22, useMemo } = React;
  function useClusterData(API_BASE4, deps = {}) {
    let { setTokenAuthError, checkPermissions: checkPermissions2, autoRefreshInterval } = deps, [data, setData] = useState22(null), [loading, setLoading] = useState22(!1), [error, setError] = useState22(null), [lastUpdate, setLastUpdate] = useState22(null), [nextUpdate, setNextUpdate] = useState22(null), [backendCollected, setBackendCollected] = useState22(null), [clusterHealth, setClusterHealth] = useState22(null), [nodeScores, setNodeScores] = useState22(null), [chartPeriod, setChartPeriod] = useState22("1h"), [charts, setCharts] = useState22({}), [chartJsLoaded, setChartJsLoaded] = useState22(!1), [chartJsLoading, setChartJsLoading] = useState22(!1), [guestProfiles, setGuestProfiles] = useState22(null), [scoreHistory, setScoreHistory] = useState22(null), fetchAnalysis2 = async () => {
      setLoading(!0), setError(null);
      try {
        let response = await fetch(`${API_BASE4}/analyze`);
        if (!response.ok) {
          if (response.status === 503) {
            let errorMsg = (await response.json()).error || "Service temporarily unavailable";
            errorMsg.toLowerCase().includes("token") || errorMsg.toLowerCase().includes("auth") || errorMsg.toLowerCase().includes("401") || errorMsg.toLowerCase().includes("unauthorized") ? (setError(`${errorMsg}. Please check your API token configuration in Settings.`), setTokenAuthError && setTokenAuthError(!0)) : (setError(errorMsg), setTokenAuthError && setTokenAuthError(!1));
          } else
            setError(`Server error: ${response.status}. Please check your API token configuration in Settings.`), setTokenAuthError && setTokenAuthError(!1);
          setLoading(!1);
          return;
        }
        let result = await response.json();
        if (result.success && result.data) {
          setData(result.data);
          let now = /* @__PURE__ */ new Date();
          setLastUpdate(now);
          let interval = autoRefreshInterval || 3600 * 1e3;
          setNextUpdate(new Date(now.getTime() + interval)), result.data.collected_at && setBackendCollected(new Date(result.data.collected_at)), result.data.cluster_health && setClusterHealth(result.data.cluster_health), fetchGuestLocations2();
        } else
          setError(result.error || "No data received");
      } catch (err) {
        setError(`Connection failed: ${err.message}`);
      }
      setLoading(!1);
    }, fetchGuestLocations2 = async () => {
      try {
        let result = await (await fetch(`${API_BASE4}/guests/locations`)).json();
        result.success && result.guests && result.nodes ? setData((prevData) => {
          if (!prevData) return prevData;
          let newData = { ...prevData };
          return newData.guests = { ...prevData.guests }, Object.keys(result.guests).forEach((vmid) => {
            let locationGuest = result.guests[vmid];
            newData.guests[vmid] && (newData.guests[vmid] = {
              ...newData.guests[vmid],
              node: locationGuest.node,
              status: locationGuest.status
            });
          }), newData.nodes = { ...prevData.nodes }, Object.keys(result.nodes).forEach((nodeName) => {
            newData.nodes[nodeName] && (newData.nodes[nodeName] = {
              ...newData.nodes[nodeName],
              guests: result.nodes[nodeName].guests
            });
          }), newData;
        }) : result.error && (result.error.toLowerCase().includes("token") || result.error.toLowerCase().includes("401") || result.error.toLowerCase().includes("unauthorized")) && setTokenAuthError && setTokenAuthError(!0);
      } catch (err) {
        console.error("[fetchGuestLocations] Error fetching guest locations:", err);
      }
    }, handleRefresh = async (callbacks = {}) => {
      setLoading(!0), setError(null);
      let startTime = Date.now(), elapsedInterval = setInterval(() => {
        callbacks.setRefreshElapsed && callbacks.setRefreshElapsed(Math.floor((Date.now() - startTime) / 1e3));
      }, 1e3);
      try {
        let oldTimestamp = data?.collected_at;
        if (!(await fetch(`${API_BASE4}/refresh`, { method: "POST" })).ok) throw new Error("Failed to trigger data collection");
        let attempts = 0, maxAttempts = 40;
        for (; attempts < maxAttempts; ) {
          let delay = attempts < 10 ? 500 : 1e3;
          await new Promise((resolve) => setTimeout(resolve, delay));
          let response = await fetch(`${API_BASE4}/analyze`);
          if (response.ok) {
            let newTimestamp = (await response.json())?.data?.collected_at;
            if (newTimestamp && newTimestamp !== oldTimestamp) {
              clearInterval(elapsedInterval), await fetchAnalysis2();
              return;
            }
          }
          attempts++;
        }
        clearInterval(elapsedInterval), await fetchAnalysis2();
      } catch (err) {
        clearInterval(elapsedInterval), setError(`Refresh failed: ${err.message}`), setLoading(!1);
      }
    }, fetchNodeScores2 = async (thresholds = {}, maintenanceNodes = /* @__PURE__ */ new Set()) => {
      if (data)
        try {
          let result = await (await fetch(`${API_BASE4}/node-scores`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cpu_threshold: thresholds.cpu || 50,
              mem_threshold: thresholds.mem || 60,
              iowait_threshold: thresholds.iowait || 30,
              maintenance_nodes: Array.from(maintenanceNodes)
            })
          })).json();
          result.success && setNodeScores(result.scores);
        } catch (err) {
          console.error("Error fetching node scores:", err);
        }
    }, generateSparkline = useMemo(() => (value, maxValue, samples = 40, frequency = 0.3) => {
      let points = [];
      for (let i = 0; i < samples; i++) {
        let variation = Math.sin(i * frequency) * value * 0.3 + Math.random() * value * 0.2, adjustedValue = Math.max(0, value + variation), x = i / (samples - 1) * 100, y = 100 - adjustedValue / maxValue * 100;
        points.push(`${x},${y}`);
      }
      return points.join(" ");
    }, []);
    return {
      data,
      setData,
      loading,
      setLoading,
      error,
      setError,
      lastUpdate,
      setLastUpdate,
      nextUpdate,
      setNextUpdate,
      backendCollected,
      clusterHealth,
      nodeScores,
      chartPeriod,
      setChartPeriod,
      charts,
      setCharts,
      chartJsLoaded,
      chartJsLoading,
      guestProfiles,
      scoreHistory,
      fetchAnalysis: fetchAnalysis2,
      fetchGuestLocations: fetchGuestLocations2,
      fetchGuestProfiles: async () => {
        try {
          let result = await (await fetch(`${API_BASE4}/guest-profiles`)).json();
          result.success && setGuestProfiles(result.profiles);
        } catch (err) {
          console.error("Error fetching guest profiles:", err);
        }
      },
      fetchScoreHistory: async (limit = 168) => {
        try {
          let result = await (await fetch(`${API_BASE4}/score-history?limit=${limit}`)).json();
          result.success && setScoreHistory(result.history);
        } catch (err) {
          console.error("Error fetching score history:", err);
        }
      },
      handleRefresh,
      fetchNodeScores: fetchNodeScores2,
      generateSparkline,
      loadChartJs: async () => {
        if (!(chartJsLoaded || chartJsLoading)) {
          setChartJsLoading(!0);
          try {
            await new Promise((resolve, reject) => {
              let script1 = document.createElement("script");
              script1.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js", script1.onload = resolve, script1.onerror = reject, document.head.appendChild(script1);
            }), await new Promise((resolve, reject) => {
              let script2 = document.createElement("script");
              script2.src = "https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js", script2.onload = resolve, script2.onerror = reject, document.head.appendChild(script2);
            }), setChartJsLoaded(!0);
          } catch (error2) {
            console.error("Failed to load Chart.js:", error2);
          } finally {
            setChartJsLoading(!1);
          }
        }
      }
    };
  }

  // src/hooks/useRecommendations.js
  init_constants();
  var { useState: useState23, useEffect: useEffect10 } = React;
  function useRecommendations(API_BASE4, deps = {}) {
    let { data, maintenanceNodes } = deps, [recommendations, setRecommendations] = useState23([]), [recommendationData, setRecommendationData] = useState23(null), [loadingRecommendations, setLoadingRecommendations] = useState23(!1), [feedbackGiven, setFeedbackGiven] = useState23({}), [cpuThreshold, setCpuThreshold] = useState23(() => {
      let saved = localStorage.getItem("proxbalance_cpu_threshold");
      return saved ? Number(saved) : 50;
    }), [memThreshold, setMemThreshold] = useState23(() => {
      let saved = localStorage.getItem("proxbalance_mem_threshold");
      return saved ? Number(saved) : 60;
    }), [iowaitThreshold, setIowaitThreshold] = useState23(() => {
      let saved = localStorage.getItem("proxbalance_iowait_threshold");
      return saved ? Number(saved) : 30;
    });
    useEffect10(() => {
      localStorage.setItem("proxbalance_cpu_threshold", cpuThreshold.toString());
    }, [cpuThreshold]), useEffect10(() => {
      localStorage.setItem("proxbalance_mem_threshold", memThreshold.toString());
    }, [memThreshold]), useEffect10(() => {
      localStorage.setItem("proxbalance_iowait_threshold", iowaitThreshold.toString());
    }, [iowaitThreshold]);
    let fetchCachedRecommendations2 = async () => {
      if (data)
        try {
          let result = await (await fetch(`${API_BASE4}/recommendations`)).json();
          result.success ? (setRecommendations(result.recommendations), setRecommendationData(result)) : result.cache_missing && generateRecommendations2();
        } catch (err) {
          console.error("Error fetching cached recommendations:", err);
        }
    }, generateRecommendations2 = async () => {
      if (data) {
        setLoadingRecommendations(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/recommendations`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cpu_threshold: cpuThreshold,
              mem_threshold: memThreshold,
              iowait_threshold: iowaitThreshold,
              maintenance_nodes: maintenanceNodes ? Array.from(maintenanceNodes) : []
            })
          })).json();
          result.success && (setRecommendations(result.recommendations), setRecommendationData(result));
        } catch (err) {
          console.error("Error generating recommendations:", err);
        } finally {
          setLoadingRecommendations(!1);
        }
      }
    };
    return {
      recommendations,
      setRecommendations,
      recommendationData,
      loadingRecommendations,
      feedbackGiven,
      cpuThreshold,
      setCpuThreshold,
      memThreshold,
      setMemThreshold,
      iowaitThreshold,
      setIowaitThreshold,
      fetchCachedRecommendations: fetchCachedRecommendations2,
      fetchRecommendations: fetchCachedRecommendations2,
      generateRecommendations: generateRecommendations2,
      onFeedback: async (rec, rating) => {
        let key = `${rec.vmid}-${rec.target_node}`;
        try {
          (await fetch(`${API_BASE4}/recommendations/feedback`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              vmid: rec.vmid,
              rating,
              source_node: rec.source_node,
              target_node: rec.target_node,
              score_improvement: rec.score_improvement
            })
          })).ok && setFeedbackGiven((prev) => ({ ...prev, [key]: rating }));
        } catch (err) {
          console.error("Failed to submit feedback:", err);
        }
      }
    };
  }

  // src/hooks/useAIRecommendations.js
  var { useState: useState24 } = React;
  function useAIRecommendations(API_BASE4, deps = {}) {
    let { data, setError } = deps, [aiEnabled, setAiEnabled] = useState24(!1), [aiProvider, setAiProvider] = useState24("none"), [openaiKey, setOpenaiKey] = useState24(""), [openaiModel, setOpenaiModel] = useState24("gpt-4o"), [openaiModelCustom, setOpenaiModelCustom] = useState24(""), [openaiAvailableModels, setOpenaiAvailableModels] = useState24([]), [openaiLoadingModels, setOpenaiLoadingModels] = useState24(!1), [anthropicKey, setAnthropicKey] = useState24(""), [anthropicModel, setAnthropicModel] = useState24("claude-3-5-sonnet-20241022"), [anthropicModelCustom, setAnthropicModelCustom] = useState24(""), [anthropicAvailableModels, setAnthropicAvailableModels] = useState24([]), [anthropicLoadingModels, setAnthropicLoadingModels] = useState24(!1), [localUrl, setLocalUrl] = useState24("http://localhost:11434"), [localModel, setLocalModel] = useState24("llama2"), [localModelCustom, setLocalModelCustom] = useState24(""), [localAvailableModels, setLocalAvailableModels] = useState24([]), [localLoadingModels, setLocalLoadingModels] = useState24(!1), [aiRecommendations, setAiRecommendations] = useState24(null), [loadingAi, setLoadingAi] = useState24(!1), [aiAnalysisPeriod, setAiAnalysisPeriod] = useState24("24h");
    return {
      aiEnabled,
      setAiEnabled,
      aiProvider,
      setAiProvider,
      openaiKey,
      setOpenaiKey,
      openaiModel,
      setOpenaiModel,
      openaiModelCustom,
      setOpenaiModelCustom,
      openaiAvailableModels,
      setOpenaiAvailableModels,
      openaiLoadingModels,
      setOpenaiLoadingModels,
      anthropicKey,
      setAnthropicKey,
      anthropicModel,
      setAnthropicModel,
      anthropicModelCustom,
      setAnthropicModelCustom,
      anthropicAvailableModels,
      setAnthropicAvailableModels,
      anthropicLoadingModels,
      setAnthropicLoadingModels,
      localUrl,
      setLocalUrl,
      localModel,
      setLocalModel,
      localModelCustom,
      setLocalModelCustom,
      localAvailableModels,
      setLocalAvailableModels,
      localLoadingModels,
      setLocalLoadingModels,
      aiRecommendations,
      setAiRecommendations,
      loadingAi,
      aiAnalysisPeriod,
      setAiAnalysisPeriod,
      initFromConfig: (config) => {
        config && (setAiProvider(config.ai_provider || "none"), setAiEnabled(config.ai_recommendations_enabled || !1), config.ai_config && (config.ai_config.openai && (setOpenaiKey(config.ai_config.openai.api_key || ""), setOpenaiModel(config.ai_config.openai.model || "gpt-4o")), config.ai_config.anthropic && (setAnthropicKey(config.ai_config.anthropic.api_key || ""), setAnthropicModel(config.ai_config.anthropic.model || "claude-3-5-sonnet-20241022")), config.ai_config.local && (setLocalUrl(config.ai_config.local.base_url || "http://localhost:11434"), setLocalModel(config.ai_config.local.model || "llama2"))));
      },
      fetchAiRecommendations: async (thresholds = {}, maintenanceNodes = /* @__PURE__ */ new Set()) => {
        if (data) {
          setLoadingAi(!0);
          try {
            let result = await (await fetch(`${API_BASE4}/ai-recommendations`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                cpu_threshold: thresholds.cpu || 50,
                mem_threshold: thresholds.mem || 60,
                analysis_period: aiAnalysisPeriod,
                maintenance_nodes: Array.from(maintenanceNodes)
              })
            })).json();
            result.success ? setAiRecommendations(result) : setAiRecommendations({ success: !1, error: result.error });
          } catch (err) {
            setAiRecommendations({ success: !1, error: err.message });
          }
          setLoadingAi(!1);
        }
      },
      fetchAiModels: async (provider, apiKey = null, baseUrl = null) => {
        let setLoadingFn = provider === "openai" ? setOpenaiLoadingModels : provider === "anthropic" ? setAnthropicLoadingModels : setLocalLoadingModels, setModelsFn = provider === "openai" ? setOpenaiAvailableModels : provider === "anthropic" ? setAnthropicAvailableModels : setLocalAvailableModels;
        setLoadingFn(!0);
        try {
          let payload = { provider };
          apiKey && (payload.api_key = apiKey), baseUrl && (payload.base_url = baseUrl);
          let result = await (await fetch(`${API_BASE4}/ai-models`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          })).json();
          result.success ? setModelsFn(result.models) : setError && setError(`Failed to fetch models: ${result.error}`);
        } catch (err) {
          setError && setError(`Failed to fetch models: ${err.message}`);
        }
        setLoadingFn(!1);
      },
      getSettingsPayload: () => ({
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
    };
  }

  // src/hooks/useMigrations.js
  var { useState: useState25 } = React;
  function useMigrations(API_BASE4, deps = {}) {
    let { setData, setError, fetchGuestLocations: fetchGuestLocations2 } = deps, [migrationStatus, setMigrationStatus] = useState25({}), [activeMigrations, setActiveMigrations] = useState25({}), [guestsMigrating, setGuestsMigrating] = useState25({}), [migrationProgress, setMigrationProgress] = useState25({}), [completedMigrations, setCompletedMigrations] = useState25({}), [showBatchConfirmation, setShowBatchConfirmation] = useState25(!1), [pendingBatchMigrations, setPendingBatchMigrations] = useState25([]), [showMigrationDialog, setShowMigrationDialog] = useState25(!1), [selectedGuest, setSelectedGuest] = useState25(null), [migrationTarget, setMigrationTarget] = useState25(""), [confirmMigration, setConfirmMigration] = useState25(null), [cancelMigrationModal, setCancelMigrationModal] = useState25(null), [cancellingMigration, setCancellingMigration] = useState25(!1), [guestMigrationOptions, setGuestMigrationOptions] = useState25(null), [loadingGuestOptions, setLoadingGuestOptions] = useState25(!1), [showTagModal, setShowTagModal] = useState25(!1), [tagModalGuest, setTagModalGuest] = useState25(null), [newTag, setNewTag] = useState25(""), [tagOperation, setTagOperation] = useState25(""), [confirmRemoveTag, setConfirmRemoveTag] = useState25(null), [confirmHostChange, setConfirmHostChange] = useState25(null), [guestSortField, setGuestSortField] = useState25("tags"), [guestSortDirection, setGuestSortDirection] = useState25("desc"), [guestPageSize, setGuestPageSize] = useState25(10), [guestCurrentPage, setGuestCurrentPage] = useState25(1), [guestSearchFilter, setGuestSearchFilter] = useState25(""), [selectedNode, setSelectedNode] = useState25(null), [selectedGuestDetails, setSelectedGuestDetails] = useState25(null), trackMigration = async (vmid, sourceNode, targetNode, taskId, guestType) => {
      let key = `${vmid}-${targetNode}`;
      setActiveMigrations((prev) => ({
        ...prev,
        [key]: { vmid, sourceNode, targetNode, taskId, type: guestType }
      })), setGuestsMigrating((prev) => ({ ...prev, [vmid]: !0 }));
      let pollInterval = setInterval(async () => {
        try {
          let migStatus = await (await fetch(`${API_BASE4}/guests/${vmid}/migration-status`)).json(), taskStatus = await (await fetch(`${API_BASE4}/tasks/${sourceNode}/${taskId}`)).json();
          if (taskStatus.success && taskStatus.progress && setMigrationProgress((prev) => ({
            ...prev,
            [vmid]: taskStatus.progress
          })), migStatus.success && (setGuestsMigrating((prev) => ({ ...prev, [vmid]: migStatus.is_migrating })), !migStatus.is_migrating)) {
            if (clearInterval(pollInterval), setMigrationProgress((prev) => {
              let updated = { ...prev };
              return delete updated[vmid], updated;
            }), taskStatus.status === "stopped" && (taskStatus.exitstatus === "unexpected status" || taskStatus.exitstatus === "migration aborted")) {
              setMigrationStatus((prev) => ({ ...prev, [key]: "failed" })), setActiveMigrations((prev) => {
                let newMigrations = { ...prev };
                return delete newMigrations[key], newMigrations;
              }), setGuestsMigrating((prev) => {
                let updated = { ...prev };
                return delete updated[vmid], updated;
              });
              return;
            }
            let locationResult = await (await fetch(`${API_BASE4}/guests/${vmid}/location`)).json();
            locationResult.success && (setData && setData((prevData) => {
              if (!prevData) return prevData;
              let guest = prevData.guests[vmid], oldNode = guest.node, newNode = locationResult.node, newData = { ...prevData };
              return newData.guests = {
                ...prevData.guests,
                [vmid]: {
                  ...guest,
                  node: newNode,
                  status: locationResult.status
                }
              }, newData.nodes = { ...prevData.nodes }, newData.nodes[oldNode] && (newData.nodes[oldNode] = {
                ...newData.nodes[oldNode],
                guests: (newData.nodes[oldNode].guests || []).filter((gid) => gid !== vmid)
              }), newData.nodes[newNode] && (newData.nodes[newNode] = {
                ...newData.nodes[newNode],
                guests: [...newData.nodes[newNode].guests || [], vmid]
              }), newData;
            }), setCompletedMigrations((prev) => ({
              ...prev,
              [vmid]: {
                targetNode,
                newNode: locationResult.node,
                timestamp: Date.now()
              }
            })), setMigrationStatus((prev) => ({ ...prev, [key]: "success" })), setActiveMigrations((prev) => {
              let newMigrations = { ...prev };
              return delete newMigrations[key], newMigrations;
            }), setTimeout(() => {
              setMigrationStatus((prev) => {
                let newStatus = { ...prev };
                return delete newStatus[key], newStatus;
              });
            }, 5e3), fetchGuestLocations2 && fetchGuestLocations2());
          }
        } catch (err) {
          console.error("Error polling migration task:", err);
        }
      }, 3e3);
      setTimeout(() => clearInterval(pollInterval), 3e5);
    }, executeMigration = async (rec) => {
      let key = `${rec.vmid}-${rec.target_node}`;
      setMigrationStatus((prev) => ({ ...prev, [key]: "running" }));
      try {
        let result = await (await fetch(`${API_BASE4}/migrate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_node: rec.source_node,
            vmid: rec.vmid,
            target_node: rec.target_node,
            type: rec.type
          })
        })).json();
        result.success ? trackMigration(rec.vmid, result.source_node, result.target_node, result.task_id, rec.type) : setMigrationStatus((prev) => ({ ...prev, [key]: "failed" }));
      } catch {
        setMigrationStatus((prev) => ({ ...prev, [key]: "failed" }));
      }
    };
    return {
      migrationStatus,
      setMigrationStatus,
      activeMigrations,
      guestsMigrating,
      migrationProgress,
      completedMigrations,
      showBatchConfirmation,
      setShowBatchConfirmation,
      pendingBatchMigrations,
      setPendingBatchMigrations,
      showMigrationDialog,
      setShowMigrationDialog,
      selectedGuest,
      setSelectedGuest,
      migrationTarget,
      setMigrationTarget,
      confirmMigration,
      setConfirmMigration,
      cancelMigrationModal,
      setCancelMigrationModal,
      cancellingMigration,
      setCancellingMigration,
      guestMigrationOptions,
      setGuestMigrationOptions,
      loadingGuestOptions,
      showTagModal,
      setShowTagModal,
      tagModalGuest,
      setTagModalGuest,
      newTag,
      setNewTag,
      tagOperation,
      setTagOperation,
      confirmRemoveTag,
      setConfirmRemoveTag,
      confirmHostChange,
      setConfirmHostChange,
      guestSortField,
      setGuestSortField,
      guestSortDirection,
      setGuestSortDirection,
      guestPageSize,
      setGuestPageSize,
      guestCurrentPage,
      setGuestCurrentPage,
      guestSearchFilter,
      setGuestSearchFilter,
      selectedNode,
      setSelectedNode,
      selectedGuestDetails,
      setSelectedGuestDetails,
      trackMigration,
      executeMigration,
      cancelMigration: async (vmid, targetNode, data) => {
        let key = `${vmid}-${targetNode}`, migration = activeMigrations[key];
        if (!migration) {
          setError && setError("Migration info not found");
          return;
        }
        setCancelMigrationModal({
          name: migration.name || `${migration.type} ${vmid}`,
          vmid,
          type: migration.type,
          source_node: migration.sourceNode,
          target_node: targetNode,
          task_id: migration.taskId,
          onConfirm: async () => {
            try {
              let result = await (await fetch(`${API_BASE4}/tasks/${migration.sourceNode}/${migration.taskId}/stop`, {
                method: "POST"
              })).json();
              if (result.success) {
                setActiveMigrations((prev) => {
                  let newMigrations = { ...prev };
                  return delete newMigrations[key], newMigrations;
                }), setMigrationStatus((prev) => ({ ...prev, [key]: "cancelled" }));
                let locationResult = await (await fetch(`${API_BASE4}/guests/${vmid}/location`)).json();
                locationResult.success && data && setData && setData({
                  ...data,
                  guests: {
                    ...data.guests,
                    [vmid]: {
                      ...data.guests[vmid],
                      node: locationResult.node,
                      status: locationResult.status
                    }
                  }
                }), setTimeout(() => {
                  setMigrationStatus((prev) => {
                    let newStatus = { ...prev };
                    return delete newStatus[key], newStatus;
                  });
                }, 5e3), setCancelMigrationModal(null);
              } else
                setError && setError(`Failed to cancel migration: ${result.error}`);
            } catch (error) {
              setError && setError(`Error cancelling migration: ${error.message}`);
            }
          }
        });
      },
      confirmAndMigrate: async () => {
        if (!confirmMigration) return;
        let rec = confirmMigration;
        setConfirmMigration(null), await executeMigration(rec);
      },
      fetchGuestMigrationOptions: async (vmid, thresholds = {}, maintenanceNodes = /* @__PURE__ */ new Set()) => {
        setLoadingGuestOptions(!0), setGuestMigrationOptions(null);
        try {
          let result = await (await fetch(`${API_BASE4}/guest/${vmid}/migration-options`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              cpu_threshold: thresholds.cpu || 50,
              mem_threshold: thresholds.mem || 60,
              maintenance_nodes: Array.from(maintenanceNodes || [])
            })
          })).json();
          result.success && setGuestMigrationOptions(result);
        } catch (err) {
          console.error("Failed to fetch guest migration options:", err);
        } finally {
          setLoadingGuestOptions(!1);
        }
      },
      checkAffinityViolations: (data) => {
        if (!data) return [];
        let violations = [];
        return Object.values(data.nodes).forEach((node) => {
          let guestsOnNode = node.guests.map((gid) => data.guests[gid]);
          guestsOnNode.forEach((guest) => {
            guest.tags.exclude_groups.length > 0 && guest.tags.exclude_groups.forEach((excludeTag) => {
              let conflicts = guestsOnNode.filter(
                (other) => other.vmid !== guest.vmid && other.tags.all_tags.includes(excludeTag)
              );
              conflicts.length > 0 && violations.push({
                guest,
                node: node.name,
                excludeTag,
                conflicts
              });
            });
          });
        }), violations;
      },
      handleAddTag: async (data) => {
        if (!newTag.trim()) {
          setError && setError("Please enter a tag name");
          return;
        }
        if (newTag.includes(";") || newTag.includes(" ")) {
          setError && setError("Tag cannot contain spaces or semicolons");
          return;
        }
        try {
          let vmid = tagModalGuest.vmid, result = await (await fetch(`${API_BASE4}/guests/${vmid}/tags`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tag: newTag.trim() })
          })).json();
          if (result.success) {
            setShowTagModal(!1), setNewTag(""), setTagModalGuest(null);
            let refreshResult = await (await fetch(`${API_BASE4}/guests/${vmid}/tags/refresh`, {
              method: "POST"
            })).json();
            refreshResult.success && data && setData && setData({
              ...data,
              guests: {
                ...data.guests,
                [vmid]: {
                  ...data.guests[vmid],
                  tags: refreshResult.tags
                }
              }
            });
          } else
            setError && setError(`Error: ${result.error}`);
        } catch (error) {
          setError && setError(`Error adding tag: ${error.message}`);
        }
      },
      handleRemoveTag: async (guest, tag) => {
        setConfirmRemoveTag({ guest, tag });
      },
      confirmAndRemoveTag: async (data) => {
        if (!confirmRemoveTag) return;
        let { guest, tag } = confirmRemoveTag;
        setConfirmRemoveTag(null);
        try {
          let vmid = guest.vmid, result = await (await fetch(`${API_BASE4}/guests/${vmid}/tags/${tag}`, {
            method: "DELETE"
          })).json();
          if (result.success) {
            let refreshResult = await (await fetch(`${API_BASE4}/guests/${vmid}/tags/refresh`, {
              method: "POST"
            })).json();
            refreshResult.success && data && setData && setData({
              ...data,
              guests: {
                ...data.guests,
                [vmid]: {
                  ...data.guests[vmid],
                  tags: refreshResult.tags
                }
              }
            });
          } else
            setError && setError(`Error: ${result.error}`);
        } catch (error) {
          setError && setError(`Error removing tag: ${error.message}`);
        }
      },
      confirmAndChangeHost: async (fetchConfig2) => {
        if (!confirmHostChange) return;
        let newHost = confirmHostChange;
        setConfirmHostChange(null);
        try {
          let result = await (await fetch(`${API_BASE4}/system/change-host`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ host: newHost })
          })).json();
          result.success ? (fetchConfig2 && fetchConfig2(), document.getElementById("proxmoxHostInput").value = newHost) : setError && setError("Failed to update host: " + (result.error || "Unknown error"));
        } catch (error) {
          setError && setError("Error: " + error.message);
        }
      }
    };
  }

  // src/hooks/useAutomation.js
  var { useState: useState26 } = React;
  function useAutomation(API_BASE4, deps = {}) {
    let { setError } = deps, [automationStatus, setAutomationStatus] = useState26({
      enabled: !1,
      timer_active: !1,
      check_interval_minutes: 0,
      dry_run: !1,
      state: {}
    }), [loadingAutomationStatus, setLoadingAutomationStatus] = useState26(!1), [runHistory, setRunHistory] = useState26([]), [loadingRunHistory, setLoadingRunHistory] = useState26(!1), [expandedRun, setExpandedRun] = useState26(null), [automationConfig, setAutomationConfig] = useState26({
      enabled: !1,
      dry_run: !1,
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
      time_windows: []
    }), [savingAutomationConfig, setSavingAutomationConfig] = useState26(!1), [testResult, setTestResult] = useState26(null), [testingAutomation, setTestingAutomation] = useState26(!1), [runningAutomation, setRunningAutomation] = useState26(!1), [runNowMessage, setRunNowMessage] = useState26(null), [automigrateLogs, setAutomigrateLogs] = useState26(null), [logRefreshTime, setLogRefreshTime] = useState26(null), [migrationLogsTab, setMigrationLogsTab] = useState26("history"), [migrationHistoryPage, setMigrationHistoryPage] = useState26(1), [migrationHistoryPageSize, setMigrationHistoryPageSize] = useState26(5), [showTimeWindowForm, setShowTimeWindowForm] = useState26(!1), [editingWindowIndex, setEditingWindowIndex] = useState26(null), [newWindowData, setNewWindowData] = useState26({
      name: "",
      type: "migration",
      days: [],
      start_time: "00:00",
      end_time: "00:00"
    }), [confirmRemoveWindow, setConfirmRemoveWindow] = useState26(null), fetchAutomationStatus2 = async () => {
      setLoadingAutomationStatus(!0);
      try {
        let result = await (await fetch(`${API_BASE4}/automigrate/status`)).json();
        result.success && setAutomationStatus(result);
      } catch (err) {
        console.error("Failed to fetch automation status:", err);
      } finally {
        setLoadingAutomationStatus(!1);
      }
    };
    return {
      automationStatus,
      setAutomationStatus,
      loadingAutomationStatus,
      runHistory,
      expandedRun,
      setExpandedRun,
      automationConfig,
      setAutomationConfig,
      savingAutomationConfig,
      testResult,
      setTestResult,
      testingAutomation,
      runningAutomation,
      runNowMessage,
      setRunNowMessage,
      automigrateLogs,
      setAutomigrateLogs,
      logRefreshTime,
      setLogRefreshTime,
      migrationLogsTab,
      setMigrationLogsTab,
      migrationHistoryPage,
      setMigrationHistoryPage,
      migrationHistoryPageSize,
      setMigrationHistoryPageSize,
      showTimeWindowForm,
      setShowTimeWindowForm,
      editingWindowIndex,
      setEditingWindowIndex,
      newWindowData,
      setNewWindowData,
      confirmRemoveWindow,
      setConfirmRemoveWindow,
      fetchAutomationStatus: fetchAutomationStatus2,
      fetchRunHistory: async (limit = 10) => {
        setLoadingRunHistory(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/automigrate/history?type=runs&limit=${limit}`)).json();
          result.success && setRunHistory(result.runs || []);
        } catch (err) {
          console.error("Failed to fetch run history:", err);
        } finally {
          setLoadingRunHistory(!1);
        }
      },
      fetchAutomationConfig: async () => {
        try {
          let result = await (await fetch(`${API_BASE4}/automigrate/config`)).json();
          result.success && setAutomationConfig(result.config);
        } catch (err) {
          console.error("Failed to fetch automation config:", err);
        }
      },
      saveAutomationConfig: async (updates) => {
        setSavingAutomationConfig(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/automigrate/config`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updates)
          })).json();
          result.success ? (setAutomationConfig(result.config), fetchAutomationStatus2()) : setError && setError(`Failed to save settings: ${result.error}`);
        } catch (err) {
          console.error("Failed to save automation config:", err), setError && setError(`Error saving settings: ${err.message}`);
        } finally {
          setSavingAutomationConfig(!1);
        }
      },
      testAutomation: async () => {
        setTestingAutomation(!0), setTestResult(null);
        try {
          let result = await (await fetch(`${API_BASE4}/automigrate/test`, {
            method: "POST"
          })).json();
          setTestResult(result);
        } catch (err) {
          setTestResult({ success: !1, error: err.message });
        } finally {
          setTestingAutomation(!1);
        }
      },
      runAutomationNow: async () => {
        setRunningAutomation(!0), setRunNowMessage(null);
        try {
          let result = await (await fetch(`${API_BASE4}/automigrate/run`, {
            method: "POST"
          })).json();
          if (result.success) {
            if (result.migration_info) {
              let migration = result.migration_info;
              setRunNowMessage({
                type: "success",
                text: `Migration started: ${migration.name} (${migration.vmid}) from ${migration.source_node} to ${migration.target_node}`
              }), setTimeout(() => fetchAutomationStatus2(), 2e3);
            } else {
              setRunNowMessage({ type: "info", text: "Automation check running... checking for recommendations and filtering rules." });
              let runStartTime = /* @__PURE__ */ new Date();
              await new Promise((resolve) => setTimeout(resolve, 1e4));
              let statusData = await (await fetch(`${API_BASE4}/automigrate/status`)).json();
              await fetchAutomationStatus2();
              let newMigrations = statusData.recent_migrations?.[0], recentTimestamp = newMigrations ? new Date(newMigrations.timestamp) : null;
              if (recentTimestamp && recentTimestamp >= runStartTime && /* @__PURE__ */ new Date() - recentTimestamp < 3e4)
                setRunNowMessage({
                  type: "success",
                  text: `Migration started: ${newMigrations.name} (${newMigrations.vmid}) from ${newMigrations.source_node} to ${newMigrations.target_node}`
                });
              else if (statusData.in_progress_migrations && statusData.in_progress_migrations.length > 0) {
                let migration = statusData.in_progress_migrations[0];
                setRunNowMessage({
                  type: "info",
                  text: `Migration already in progress: ${migration.name} (${migration.vmid})`
                });
              } else {
                let filterReasons = statusData.filter_reasons || [], messageText = "Automation completed. No migrations were started";
                filterReasons.length > 0 ? messageText += `:
` + filterReasons.map((r) => `  \u2022 ${r}`).join(`
`) : messageText += " (cluster is balanced or no recommendations available).", setRunNowMessage({
                  type: "info",
                  text: messageText
                });
              }
            }
            setTimeout(() => setRunNowMessage(null), 3e4);
          } else
            setRunNowMessage({ type: "error", text: `Failed to start automation: ${result.error}` }), setTimeout(() => setRunNowMessage(null), 3e4);
        } catch (err) {
          setRunNowMessage({ type: "error", text: `Error: ${err.message}` }), setTimeout(() => setRunNowMessage(null), 3e4), console.error("Failed to run automation:", err);
        } finally {
          setRunningAutomation(!1);
        }
      }
    };
  }

  // src/hooks/useEvacuation.js
  var { useState: useState27, useEffect: useEffect11 } = React;
  function useEvacuation(deps = {}) {
    let { saveAutomationConfig: saveAutomationConfig2, automationConfig } = deps, [maintenanceNodes, setMaintenanceNodes] = useState27(() => {
      let saved = localStorage.getItem("maintenanceNodes");
      return saved ? new Set(JSON.parse(saved)) : /* @__PURE__ */ new Set();
    }), [evacuatingNodes, setEvacuatingNodes] = useState27(/* @__PURE__ */ new Set()), [evacuationStatus, setEvacuationStatus] = useState27({}), [evacuationPlan, setEvacuationPlan] = useState27(null), [planNode, setPlanNode] = useState27(null), [planningNodes, setPlanningNodes] = useState27(/* @__PURE__ */ new Set()), [guestActions, setGuestActions] = useState27({}), [guestTargets, setGuestTargets] = useState27({}), [showConfirmModal, setShowConfirmModal] = useState27(!1);
    return useEffect11(() => {
      if (localStorage.setItem("maintenanceNodes", JSON.stringify(Array.from(maintenanceNodes))), automationConfig !== null && saveAutomationConfig2) {
        let maintenanceArray = Array.from(maintenanceNodes), currentMaintenance = automationConfig.maintenance_nodes || [];
        JSON.stringify(maintenanceArray.sort()) !== JSON.stringify(currentMaintenance.sort()) && saveAutomationConfig2({ maintenance_nodes: maintenanceArray });
      }
    }, [maintenanceNodes]), {
      maintenanceNodes,
      setMaintenanceNodes,
      evacuatingNodes,
      setEvacuatingNodes,
      evacuationStatus,
      setEvacuationStatus,
      evacuationPlan,
      setEvacuationPlan,
      planNode,
      setPlanNode,
      planningNodes,
      setPlanningNodes,
      guestActions,
      setGuestActions,
      guestTargets,
      setGuestTargets,
      showConfirmModal,
      setShowConfirmModal
    };
  }

  // src/hooks/useUpdates.js
  var { useState: useState28 } = React;
  function useUpdates(API_BASE4, deps = {}) {
    let { setError } = deps, [systemInfo, setSystemInfo] = useState28(null), [updating, setUpdating] = useState28(!1), [updateLog, setUpdateLog] = useState28([]), [updateResult, setUpdateResult] = useState28(null), [updateError, setUpdateError] = useState28(null), [showUpdateModal, setShowUpdateModal] = useState28(!1), [showBranchModal, setShowBranchModal] = useState28(!1), [availableBranches, setAvailableBranches] = useState28([]), [loadingBranches, setLoadingBranches] = useState28(!1), [switchingBranch, setSwitchingBranch] = useState28(!1), [branchPreview, setBranchPreview] = useState28(null), [loadingPreview, setLoadingPreview] = useState28(!1), [rollingBack, setRollingBack] = useState28(!1), fetchSystemInfo2 = async () => {
      try {
        let result = await (await fetch(`${API_BASE4}/system/info`)).json();
        result.success && setSystemInfo(result);
      } catch (err) {
        console.error("Failed to fetch system info:", err);
      }
    };
    return {
      systemInfo,
      updating,
      updateLog,
      setUpdateLog,
      updateResult,
      setUpdateResult,
      updateError,
      showUpdateModal,
      setShowUpdateModal,
      showBranchModal,
      setShowBranchModal,
      availableBranches,
      loadingBranches,
      switchingBranch,
      branchPreview,
      setBranchPreview,
      loadingPreview,
      rollingBack,
      fetchSystemInfo: fetchSystemInfo2,
      handleUpdate: async () => {
        setUpdating(!0), setUpdateLog([]), setUpdateResult(null), setUpdateError(null), setShowUpdateModal(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/system/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          })).json();
          result.success ? (setUpdateLog(result.log || []), result.updated ? setUpdateResult("success") : setUpdateResult("up-to-date")) : (setUpdateLog([...result.log || [], `Error: ${result.error}`]), setUpdateResult("error"), setUpdateError(result.error || "Unknown error"));
        } catch (err) {
          setUpdateLog((prev) => [...prev, `Error: ${err.message}`]), setUpdateResult("error"), setUpdateError(err.message);
        }
        setUpdating(!1);
      },
      fetchBranches: async () => {
        setLoadingBranches(!0), setBranchPreview(null);
        try {
          let result = await (await fetch(`${API_BASE4}/system/branches`)).json();
          result.success ? setAvailableBranches(result.branches || []) : console.error("Failed to fetch branches:", result.error);
        } catch (err) {
          console.error("Error fetching branches:", err);
        }
        setLoadingBranches(!1);
      },
      fetchBranchPreview: async (branchName) => {
        setLoadingPreview(!0), setBranchPreview(null);
        try {
          let result = await (await fetch(`${API_BASE4}/system/branch-preview/${encodeURIComponent(branchName)}`)).json();
          result.success && setBranchPreview(result);
        } catch (err) {
          console.error("Error fetching branch preview:", err);
        }
        setLoadingPreview(!1);
      },
      switchBranch: async (branchName) => {
        setSwitchingBranch(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/system/switch-branch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ branch: branchName })
          })).json();
          result.success ? (setShowBranchModal(!1), setBranchPreview(null), await fetchSystemInfo2(), setTimeout(() => window.location.reload(), 1e3)) : setError && setError(`Failed to switch branch: ${result.error}`);
        } catch (err) {
          setError && setError(`Error switching branch: ${err.message}`);
        }
        setSwitchingBranch(!1);
      },
      rollbackBranch: async () => {
        setRollingBack(!0);
        try {
          let result = await (await fetch(`${API_BASE4}/system/rollback-branch`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          })).json();
          result.success ? (setShowBranchModal(!1), setBranchPreview(null), await fetchSystemInfo2(), setTimeout(() => window.location.reload(), 1e3)) : setError && setError(`Failed to rollback: ${result.error}`);
        } catch (err) {
          setError && setError(`Error rolling back branch: ${err.message}`);
        }
        setRollingBack(!1);
      },
      clearTestingMode: async () => {
        try {
          (await (await fetch(`${API_BASE4}/system/clear-testing-mode`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
          })).json()).success && await fetchSystemInfo2();
        } catch (err) {
          setError && setError(`Error clearing testing mode: ${err.message}`);
        }
      }
    };
  }

  // src/index.jsx
  init_constants();
  var { useState: useState29, useEffect: useEffect12, useMemo: useMemo2, useCallback: useCallback2, useRef: useRef3 } = React, ProxmoxBalanceManager = () => {
    let isMobile = useIsMobile_default(640), { darkMode, setDarkMode, toggleDarkMode } = useDarkMode(!0), ui = useUIState(), auth = useAuth(API_BASE), automation = useAutomation(API_BASE, { setError: (e) => cluster.setError(e) }), evacuation = useEvacuation({ saveAutomationConfig: automation.saveAutomationConfig, automationConfig: automation.automationConfig }), configHook = useConfig(API_BASE, { setError: (e) => cluster.setError(e) }), updates = useUpdates(API_BASE, { setError: (e) => cluster.setError(e) }), cluster = useClusterData(API_BASE, {
      setTokenAuthError: auth.setTokenAuthError,
      checkPermissions: auth.checkPermissions,
      autoRefreshInterval: configHook.autoRefreshInterval
    }), recs = useRecommendations(API_BASE, {
      data: cluster.data,
      maintenanceNodes: evacuation.maintenanceNodes
    }), ai = useAIRecommendations(API_BASE, {
      data: cluster.data,
      setError: cluster.setError
    }), migrations = useMigrations(API_BASE, {
      setData: cluster.setData,
      setError: cluster.setError,
      fetchGuestLocations: cluster.fetchGuestLocations
    });
    useEffect12(() => {
      document.documentElement.classList.add("dark"), configHook.fetchConfig().then((cfg) => {
        cfg && (ai.initFromConfig(cfg), auth.setProxmoxTokenId(cfg.proxmox_api_token_id || ""), auth.setProxmoxTokenSecret(cfg.proxmox_api_token_secret || ""));
      }), updates.fetchSystemInfo(), automation.fetchAutomationStatus(), automation.fetchAutomationConfig(), automation.fetchRunHistory(), auth.checkPermissions(), configHook.fetchPenaltyConfig(), configHook.fetchMigrationSettings();
    }, []), useEffect12(() => {
      if (cluster.data) {
        let splashScreen = document.getElementById("loading-screen");
        splashScreen && (splashScreen.classList.add("hidden"), setTimeout(() => {
          splashScreen.style.display = "none";
        }, 500));
      }
    }, [cluster.data]), useEffect12(() => {
      let interval = setInterval(() => {
        automation.fetchAutomationStatus(), automation.fetchRunHistory();
      }, 1e4);
      return () => clearInterval(interval);
    }, []), useEffect12(() => {
      cluster.fetchAnalysis();
    }, []), useEffect12(() => {
      let interval = setInterval(() => {
        cluster.fetchAnalysis();
      }, configHook.autoRefreshInterval);
      return () => clearInterval(interval);
    }, [configHook.autoRefreshInterval]), useEffect12(() => {
      cluster.data && !recs.loadingRecommendations && (recs.fetchCachedRecommendations(), cluster.fetchNodeScores(
        { cpu: recs.cpuThreshold, mem: recs.memThreshold, iowait: recs.iowaitThreshold },
        evacuation.maintenanceNodes
      ));
    }, [cluster.data, recs.cpuThreshold, recs.memThreshold, recs.iowaitThreshold, evacuation.maintenanceNodes]), useEffect12(() => {
      if (!cluster.data) return;
      let interval = setInterval(() => {
        recs.fetchCachedRecommendations();
      }, 12e4);
      return () => clearInterval(interval);
    }, [cluster.data]), useEffect12(() => {
      cluster.data && (cluster.fetchGuestProfiles(), cluster.fetchScoreHistory());
    }, [cluster.data]), useEffect12(() => {
      ui.currentPage === "automation" && configHook.openPenaltyConfigOnAutomation && requestAnimationFrame(() => {
        ui.setCollapsedSections((prev) => ({ ...prev, penaltyScoring: !1 })), setTimeout(() => {
          let penaltySection = document.getElementById("penalty-config-section");
          penaltySection && (penaltySection.scrollIntoView({ behavior: "smooth", block: "center" }), penaltySection.style.boxShadow = "0 0 20px rgba(59, 130, 246, 0.5)", setTimeout(() => {
            penaltySection.style.boxShadow = "";
          }, 2e3));
        }, 200), setTimeout(() => {
          configHook.setOpenPenaltyConfigOnAutomation(!1);
        }, 300);
      });
    }, [ui.currentPage, configHook.openPenaltyConfigOnAutomation]), useEffect12(() => {
      ui.scrollToApiConfig && ui.currentPage === "settings" && (ui.setShowAdvancedSettings(!0), setTimeout(() => {
        let element = document.getElementById("proxmox-api-config");
        element && (element.scrollIntoView({ behavior: "smooth", block: "start" }), element.classList.add("ring-4", "ring-red-500", "ring-opacity-50", "rounded-lg"), setTimeout(() => {
          element.classList.remove("ring-4", "ring-red-500", "ring-opacity-50", "rounded-lg");
        }, 3e3)), ui.setScrollToApiConfig(!1);
      }, 400));
    }, [ui.scrollToApiConfig, ui.currentPage]), useEffect12(() => {
      !ui.collapsedSections.nodeStatus && !cluster.chartJsLoaded && cluster.loadChartJs();
    }, [ui.collapsedSections.nodeStatus]), useEffect12(() => {
      migrations.selectedGuestDetails && ui.setGuestModalCollapsed({ mountPoints: !0, passthroughDisks: !0 });
    }, [migrations.selectedGuestDetails?.vmid]), useEffect12(() => {
      if (!cluster.data || !cluster.data.nodes || ui.collapsedSections.nodeStatus || !cluster.chartJsLoaded || typeof Chart > "u") return;
      Object.values(cluster.charts).forEach((chart) => {
        try {
          chart.destroy();
        } catch (e) {
          console.error("Error destroying chart:", e);
        }
      });
      let newCharts = {};
      return Object.values(cluster.data.nodes).forEach((node) => {
        if (!node.trend_data || typeof node.trend_data != "object") return;
        let canvas = document.getElementById(`chart-${node.name}`);
        if (!canvas) return;
        let sourceTimeframe = "day", periodSeconds = {
          "1h": 3600,
          "6h": 6 * 3600,
          "12h": 12 * 3600,
          "24h": 24 * 3600,
          "7d": 168 * 3600,
          "30d": 720 * 3600,
          "1y": 365 * 24 * 3600
        }[cluster.chartPeriod] || 24 * 3600;
        cluster.chartPeriod === "1h" ? sourceTimeframe = "hour" : ["6h", "12h", "24h"].includes(cluster.chartPeriod) ? sourceTimeframe = "day" : cluster.chartPeriod === "7d" ? sourceTimeframe = "week" : cluster.chartPeriod === "30d" ? sourceTimeframe = "month" : cluster.chartPeriod === "1y" && (sourceTimeframe = "year");
        let trendData = node.trend_data?.[sourceTimeframe] || node.trend_data?.day || [];
        if (!trendData || trendData.length === 0) return;
        let now = Math.floor(Date.now() / 1e3), filteredData = trendData.filter((point) => now - point.time <= periodSeconds);
        if (filteredData.length === 0) return;
        let sampleRate = { "1h": 2, "6h": 5, "12h": 10, "24h": 20, "7d": 20, "30d": 25, "1y": 25 }[cluster.chartPeriod] || 1, sampledData = filteredData.filter(
          (point, index, arr) => index === 0 || index === arr.length - 1 || index % sampleRate === 0
        ), ctx = canvas.getContext("2d"), isDark = darkMode;
        try {
          newCharts[node.name] = new Chart(ctx, {
            type: "line",
            data: {
              labels: sampledData.map((point) => new Date(point.time * 1e3).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })),
              datasets: [
                { label: "CPU %", data: sampledData.map((p) => p.cpu), borderColor: "rgb(59, 130, 246)", backgroundColor: "rgba(59, 130, 246, 0.1)", tension: 0.4, fill: !0 },
                { label: "Memory %", data: sampledData.map((p) => p.mem), borderColor: "rgb(16, 185, 129)", backgroundColor: "rgba(16, 185, 129, 0.1)", tension: 0.4, fill: !0 },
                { label: "IOWait %", data: sampledData.map((p) => p.iowait || 0), borderColor: "rgb(245, 158, 11)", backgroundColor: "rgba(245, 158, 11, 0.1)", tension: 0.4, fill: !0 }
              ]
            },
            options: {
              responsive: !0,
              maintainAspectRatio: !1,
              interaction: { mode: "index", intersect: !1 },
              plugins: {
                legend: { display: !0, position: "top", labels: { color: isDark ? "#9ca3af" : "#4b5563", font: { size: 11 } } },
                tooltip: { backgroundColor: isDark ? "#1f2937" : "#ffffff", titleColor: isDark ? "#f3f4f6" : "#111827", bodyColor: isDark ? "#d1d5db" : "#374151", borderColor: isDark ? "#374151" : "#e5e7eb", borderWidth: 1 },
                annotation: {
                  annotations: cluster.nodeScores && cluster.nodeScores[node.name] ? {
                    scoreLine: {
                      type: "line",
                      yMin: cluster.nodeScores[node.name].suitability_rating,
                      yMax: cluster.nodeScores[node.name].suitability_rating,
                      borderColor: (() => {
                        let r = cluster.nodeScores[node.name].suitability_rating;
                        return r >= 70 ? "rgba(34, 197, 94, 0.7)" : r >= 50 ? "rgba(234, 179, 8, 0.7)" : r >= 30 ? "rgba(249, 115, 22, 0.7)" : "rgba(239, 68, 68, 0.7)";
                      })(),
                      borderWidth: 3,
                      borderDash: [5, 5],
                      label: {
                        display: !0,
                        content: `Suitability: ${cluster.nodeScores[node.name].suitability_rating}%`,
                        position: "start",
                        backgroundColor: (() => {
                          let r = cluster.nodeScores[node.name].suitability_rating;
                          return r >= 70 ? "rgba(34, 197, 94, 0.9)" : r >= 50 ? "rgba(234, 179, 8, 0.9)" : r >= 30 ? "rgba(249, 115, 22, 0.9)" : "rgba(239, 68, 68, 0.9)";
                        })(),
                        color: "#ffffff",
                        font: { size: 11, weight: "bold" },
                        padding: 4
                      }
                    }
                  } : {}
                }
              },
              scales: {
                x: { display: !0, grid: { color: isDark ? "#374151" : "#e5e7eb" }, ticks: { color: isDark ? "#9ca3af" : "#6b7280", maxTicksLimit: 8, font: { size: 10 } } },
                y: { display: !0, min: 0, max: 100, grid: { color: isDark ? "#374151" : "#e5e7eb" }, ticks: { color: isDark ? "#9ca3af" : "#6b7280", font: { size: 10 }, callback: function(value) {
                  return value + "%";
                } } }
              }
            }
          });
        } catch (error) {
          console.error(`Error creating chart for node ${node.name}:`, error);
        }
      }), cluster.setCharts(newCharts), () => {
        Object.values(newCharts).forEach((chart) => chart.destroy());
      };
    }, [cluster.data, cluster.chartPeriod, darkMode, ui.collapsedSections.nodeStatus, recs.cpuThreshold, recs.memThreshold, ui.currentPage, cluster.chartJsLoaded]);
    let handleRefresh = async () => {
      await cluster.handleRefresh({ setRefreshElapsed: ui.setRefreshElapsed });
    }, saveSettings2 = async () => {
      let result = await configHook.saveSettings({
        collection_interval_minutes: configHook.tempBackendInterval,
        ui_refresh_interval_minutes: configHook.tempUiInterval,
        proxmox_auth_method: "api_token",
        proxmox_api_token_id: auth.proxmoxTokenId,
        proxmox_api_token_secret: auth.proxmoxTokenSecret,
        ...ai.getSettingsPayload()
      });
      if (result.success) {
        ui.setShowSettings(!1);
        let now = /* @__PURE__ */ new Date();
        cluster.setLastUpdate(now), cluster.setNextUpdate(new Date(now.getTime() + result.intervalMs));
      }
    }, wrappedHandleAddTag = () => migrations.handleAddTag(cluster.data), wrappedConfirmAndRemoveTag = () => migrations.confirmAndRemoveTag(cluster.data), wrappedConfirmAndChangeHost = () => migrations.confirmAndChangeHost(configHook.fetchConfig), wrappedCancelMigration = (vmid, targetNode) => migrations.cancelMigration(vmid, targetNode, cluster.data), wrappedCheckAffinityViolations = () => migrations.checkAffinityViolations(cluster.data), wrappedFetchAiRecommendations = () => ai.fetchAiRecommendations(
      { cpu: recs.cpuThreshold, mem: recs.memThreshold },
      evacuation.maintenanceNodes
    ), wrappedFetchGuestMigrationOptions = (vmid) => migrations.fetchGuestMigrationOptions(
      vmid,
      { cpu: recs.cpuThreshold, mem: recs.memThreshold },
      evacuation.maintenanceNodes
    ), wrappedFetchNodeScores = () => cluster.fetchNodeScores(
      { cpu: recs.cpuThreshold, mem: recs.memThreshold, iowait: recs.iowaitThreshold },
      evacuation.maintenanceNodes
    ), iconLegendModal = ui.showIconLegend ? /* @__PURE__ */ React.createElement(IconLegend, { darkMode, onClose: () => ui.setShowIconLegend(!1) }) : null;
    return ui.currentPage === "settings" ? /* @__PURE__ */ React.createElement(React.Fragment, null, iconLegendModal, /* @__PURE__ */ React.createElement(
      SettingsPage,
      {
        darkMode,
        setDarkMode,
        setCurrentPage: ui.setCurrentPage,
        aiEnabled: ai.aiEnabled,
        setAiEnabled: ai.setAiEnabled,
        aiProvider: ai.aiProvider,
        setAiProvider: ai.setAiProvider,
        openaiKey: ai.openaiKey,
        setOpenaiKey: ai.setOpenaiKey,
        openaiModel: ai.openaiModel,
        setOpenaiModel: ai.setOpenaiModel,
        anthropicKey: ai.anthropicKey,
        setAnthropicKey: ai.setAnthropicKey,
        anthropicModel: ai.anthropicModel,
        setAnthropicModel: ai.setAnthropicModel,
        localUrl: ai.localUrl,
        setLocalUrl: ai.setLocalUrl,
        localModel: ai.localModel,
        setLocalModel: ai.setLocalModel,
        localAvailableModels: ai.localAvailableModels,
        setLocalAvailableModels: ai.setLocalAvailableModels,
        localLoadingModels: ai.localLoadingModels,
        setLocalLoadingModels: ai.setLocalLoadingModels,
        backendCollected: cluster.backendCollected,
        loading: cluster.loading,
        handleRefresh,
        data: cluster.data,
        config: configHook.config,
        fetchConfig: configHook.fetchConfig,
        savingCollectionSettings: configHook.savingCollectionSettings,
        setSavingCollectionSettings: configHook.setSavingCollectionSettings,
        collectionSettingsSaved: configHook.collectionSettingsSaved,
        setCollectionSettingsSaved: configHook.setCollectionSettingsSaved,
        setError: cluster.setError,
        automationConfig: automation.automationConfig,
        saveAutomationConfig: automation.saveAutomationConfig,
        showAdvancedSettings: ui.showAdvancedSettings,
        setShowAdvancedSettings: ui.setShowAdvancedSettings,
        logLevel: configHook.logLevel,
        setLogLevel: configHook.setLogLevel,
        verboseLogging: configHook.verboseLogging,
        setVerboseLogging: configHook.setVerboseLogging,
        proxmoxTokenId: auth.proxmoxTokenId,
        setProxmoxTokenId: auth.setProxmoxTokenId,
        proxmoxTokenSecret: auth.proxmoxTokenSecret,
        setProxmoxTokenSecret: auth.setProxmoxTokenSecret,
        validatingToken: auth.validatingToken,
        validateToken: auth.validateToken,
        tokenValidationResult: auth.tokenValidationResult,
        confirmHostChange: migrations.confirmHostChange,
        setConfirmHostChange: migrations.setConfirmHostChange,
        confirmAndChangeHost: wrappedConfirmAndChangeHost,
        savingSettings: configHook.savingSettings,
        saveSettings: saveSettings2,
        formatLocalTime,
        getTimezoneAbbr
      }
    ), isMobile && /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-around h-14" }, /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setCurrentPage("dashboard"), className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(Activity, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "Dashboard")), /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setCurrentPage("automation"), className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(Clock, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "Automation")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    }, className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400" }, /* @__PURE__ */ React.createElement(Settings, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold" }, "Settings"))))) : ui.currentPage === "automation" ? /* @__PURE__ */ React.createElement(React.Fragment, null, iconLegendModal, /* @__PURE__ */ React.createElement(
      AutomationPage,
      {
        automationConfig: automation.automationConfig,
        automationStatus: automation.automationStatus,
        automigrateLogs: automation.automigrateLogs,
        collapsedSections: ui.collapsedSections,
        config: configHook.config,
        confirmRemoveWindow: automation.confirmRemoveWindow,
        editingWindowIndex: automation.editingWindowIndex,
        fetchAutomationStatus: automation.fetchAutomationStatus,
        logRefreshTime: automation.logRefreshTime,
        migrationHistoryPage: automation.migrationHistoryPage,
        migrationHistoryPageSize: automation.migrationHistoryPageSize,
        migrationLogsTab: automation.migrationLogsTab,
        newWindowData: automation.newWindowData,
        penaltyConfig: configHook.penaltyConfig,
        setPenaltyConfig: configHook.setPenaltyConfig,
        penaltyDefaults: configHook.penaltyDefaults,
        penaltyConfigSaved: configHook.penaltyConfigSaved,
        savingPenaltyConfig: configHook.savingPenaltyConfig,
        penaltyPresets: configHook.penaltyPresets,
        activePreset: configHook.activePreset,
        applyPenaltyPreset: configHook.applyPenaltyPreset,
        cpuThreshold: recs.cpuThreshold,
        memThreshold: recs.memThreshold,
        iowaitThreshold: recs.iowaitThreshold,
        savePenaltyConfig: configHook.savePenaltyConfig,
        resetPenaltyConfig: configHook.resetPenaltyConfig,
        migrationSettings: configHook.migrationSettings,
        setMigrationSettings: configHook.setMigrationSettings,
        migrationSettingsDefaults: configHook.migrationSettingsDefaults,
        migrationSettingsDescriptions: configHook.migrationSettingsDescriptions,
        effectivePenaltyConfig: configHook.effectivePenaltyConfig,
        hasExpertOverrides: configHook.hasExpertOverrides,
        savingMigrationSettings: configHook.savingMigrationSettings,
        migrationSettingsSaved: configHook.migrationSettingsSaved,
        saveMigrationSettingsAction: configHook.saveMigrationSettingsAction,
        resetMigrationSettingsAction: configHook.resetMigrationSettingsAction,
        fetchMigrationSettingsAction: configHook.fetchMigrationSettings,
        saveAutomationConfig: automation.saveAutomationConfig,
        setAutomigrateLogs: automation.setAutomigrateLogs,
        setCollapsedSections: ui.setCollapsedSections,
        setConfig: configHook.setConfig,
        setConfirmRemoveWindow: automation.setConfirmRemoveWindow,
        setCurrentPage: ui.setCurrentPage,
        setEditingWindowIndex: automation.setEditingWindowIndex,
        setError: cluster.setError,
        setLogRefreshTime: automation.setLogRefreshTime,
        setMigrationHistoryPage: automation.setMigrationHistoryPage,
        setMigrationHistoryPageSize: automation.setMigrationHistoryPageSize,
        setMigrationLogsTab: automation.setMigrationLogsTab,
        setNewWindowData: automation.setNewWindowData,
        setShowTimeWindowForm: automation.setShowTimeWindowForm,
        setTestResult: automation.setTestResult,
        showTimeWindowForm: automation.showTimeWindowForm,
        testAutomation: automation.testAutomation,
        testingAutomation: automation.testingAutomation,
        testResult: automation.testResult
      }
    ), isMobile && /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-around h-14" }, /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setCurrentPage("dashboard"), className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(Activity, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "Dashboard")), /* @__PURE__ */ React.createElement("button", { onClick: () => {
    }, className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400" }, /* @__PURE__ */ React.createElement(Clock, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold" }, "Automation")), /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setCurrentPage("settings"), className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(Settings, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "Settings"))))) : cluster.data ? /* @__PURE__ */ React.createElement(React.Fragment, null, iconLegendModal, /* @__PURE__ */ React.createElement(
      DashboardPage,
      {
        data: cluster.data,
        setData: cluster.setData,
        loading: cluster.loading,
        error: cluster.error,
        setError: cluster.setError,
        config: configHook.config,
        darkMode,
        toggleDarkMode,
        setCurrentPage: ui.setCurrentPage,
        setScrollToApiConfig: ui.setScrollToApiConfig,
        setOpenPenaltyConfigOnAutomation: configHook.setOpenPenaltyConfigOnAutomation,
        tokenAuthError: auth.tokenAuthError,
        setTokenAuthError: auth.setTokenAuthError,
        dashboardHeaderCollapsed: ui.dashboardHeaderCollapsed,
        setDashboardHeaderCollapsed: ui.setDashboardHeaderCollapsed,
        handleLogoHover: ui.handleLogoHover,
        logoBalancing: ui.logoBalancing,
        clusterHealth: cluster.clusterHealth,
        systemInfo: updates.systemInfo,
        showUpdateModal: updates.showUpdateModal,
        setShowUpdateModal: updates.setShowUpdateModal,
        updating: updates.updating,
        updateLog: updates.updateLog,
        setUpdateLog: updates.setUpdateLog,
        updateResult: updates.updateResult,
        setUpdateResult: updates.setUpdateResult,
        updateError: updates.updateError,
        handleUpdate: updates.handleUpdate,
        showBranchModal: updates.showBranchModal,
        setShowBranchModal: updates.setShowBranchModal,
        loadingBranches: updates.loadingBranches,
        availableBranches: updates.availableBranches,
        branchPreview: updates.branchPreview,
        setBranchPreview: updates.setBranchPreview,
        loadingPreview: updates.loadingPreview,
        switchingBranch: updates.switchingBranch,
        rollingBack: updates.rollingBack,
        fetchBranches: updates.fetchBranches,
        switchBranch: updates.switchBranch,
        rollbackBranch: updates.rollbackBranch,
        clearTestingMode: updates.clearTestingMode,
        fetchBranchPreview: updates.fetchBranchPreview,
        automationStatus: automation.automationStatus,
        automationConfig: automation.automationConfig,
        fetchAutomationStatus: automation.fetchAutomationStatus,
        runAutomationNow: automation.runAutomationNow,
        runningAutomation: automation.runningAutomation,
        runNowMessage: automation.runNowMessage,
        setRunNowMessage: automation.setRunNowMessage,
        runHistory: automation.runHistory,
        expandedRun: automation.expandedRun,
        setExpandedRun: automation.setExpandedRun,
        recommendations: recs.recommendations,
        loadingRecommendations: recs.loadingRecommendations,
        generateRecommendations: recs.generateRecommendations,
        recommendationData: recs.recommendationData,
        penaltyConfig: configHook.penaltyConfig,
        aiEnabled: ai.aiEnabled,
        aiRecommendations: ai.aiRecommendations,
        loadingAi: ai.loadingAi,
        aiAnalysisPeriod: ai.aiAnalysisPeriod,
        setAiAnalysisPeriod: ai.setAiAnalysisPeriod,
        fetchAiRecommendations: wrappedFetchAiRecommendations,
        canMigrate: auth.canMigrate,
        migrationStatus: migrations.migrationStatus,
        setMigrationStatus: migrations.setMigrationStatus,
        completedMigrations: migrations.completedMigrations,
        guestsMigrating: migrations.guestsMigrating,
        migrationProgress: migrations.migrationProgress,
        cancelMigration: wrappedCancelMigration,
        trackMigration: migrations.trackMigration,
        showMigrationDialog: migrations.showMigrationDialog,
        setShowMigrationDialog: migrations.setShowMigrationDialog,
        selectedGuest: migrations.selectedGuest,
        setSelectedGuest: migrations.setSelectedGuest,
        migrationTarget: migrations.migrationTarget,
        setMigrationTarget: migrations.setMigrationTarget,
        executeMigration: migrations.executeMigration,
        showTagModal: migrations.showTagModal,
        setShowTagModal: migrations.setShowTagModal,
        tagModalGuest: migrations.tagModalGuest,
        setTagModalGuest: migrations.setTagModalGuest,
        newTag: migrations.newTag,
        setNewTag: migrations.setNewTag,
        handleAddTag: wrappedHandleAddTag,
        handleRemoveTag: migrations.handleRemoveTag,
        confirmRemoveTag: migrations.confirmRemoveTag,
        setConfirmRemoveTag: migrations.setConfirmRemoveTag,
        confirmAndRemoveTag: wrappedConfirmAndRemoveTag,
        confirmMigration: migrations.confirmMigration,
        setConfirmMigration: migrations.setConfirmMigration,
        confirmAndMigrate: migrations.confirmAndMigrate,
        showBatchConfirmation: migrations.showBatchConfirmation,
        setShowBatchConfirmation: migrations.setShowBatchConfirmation,
        pendingBatchMigrations: migrations.pendingBatchMigrations,
        cancelMigrationModal: migrations.cancelMigrationModal,
        setCancelMigrationModal: migrations.setCancelMigrationModal,
        cancellingMigration: migrations.cancellingMigration,
        setCancellingMigration: migrations.setCancellingMigration,
        collapsedSections: ui.collapsedSections,
        setCollapsedSections: ui.setCollapsedSections,
        toggleSection: ui.toggleSection,
        lastUpdate: cluster.lastUpdate,
        backendCollected: cluster.backendCollected,
        handleRefresh,
        clusterMapViewMode: ui.clusterMapViewMode,
        setClusterMapViewMode: ui.setClusterMapViewMode,
        showPoweredOffGuests: ui.showPoweredOffGuests,
        setShowPoweredOffGuests: ui.setShowPoweredOffGuests,
        selectedNode: migrations.selectedNode,
        setSelectedNode: migrations.setSelectedNode,
        selectedGuestDetails: migrations.selectedGuestDetails,
        setSelectedGuestDetails: migrations.setSelectedGuestDetails,
        nodeGridColumns: ui.nodeGridColumns,
        setNodeGridColumns: ui.setNodeGridColumns,
        chartPeriod: cluster.chartPeriod,
        setChartPeriod: cluster.setChartPeriod,
        nodeScores: cluster.nodeScores,
        guestProfiles: cluster.guestProfiles,
        scoreHistory: cluster.scoreHistory,
        maintenanceNodes: evacuation.maintenanceNodes,
        setMaintenanceNodes: evacuation.setMaintenanceNodes,
        evacuatingNodes: evacuation.evacuatingNodes,
        setEvacuatingNodes: evacuation.setEvacuatingNodes,
        planningNodes: evacuation.planningNodes,
        setPlanningNodes: evacuation.setPlanningNodes,
        evacuationPlan: evacuation.evacuationPlan,
        setEvacuationPlan: evacuation.setEvacuationPlan,
        planNode: evacuation.planNode,
        setPlanNode: evacuation.setPlanNode,
        guestActions: evacuation.guestActions,
        setGuestActions: evacuation.setGuestActions,
        guestTargets: evacuation.guestTargets,
        setGuestTargets: evacuation.setGuestTargets,
        showConfirmModal: evacuation.showConfirmModal,
        setShowConfirmModal: evacuation.setShowConfirmModal,
        guestSearchFilter: migrations.guestSearchFilter,
        setGuestSearchFilter: migrations.setGuestSearchFilter,
        guestCurrentPage: migrations.guestCurrentPage,
        setGuestCurrentPage: migrations.setGuestCurrentPage,
        guestPageSize: migrations.guestPageSize,
        setGuestPageSize: migrations.setGuestPageSize,
        guestSortField: migrations.guestSortField,
        setGuestSortField: migrations.setGuestSortField,
        guestSortDirection: migrations.guestSortDirection,
        setGuestSortDirection: migrations.setGuestSortDirection,
        guestModalCollapsed: ui.guestModalCollapsed,
        setGuestModalCollapsed: ui.setGuestModalCollapsed,
        checkAffinityViolations: wrappedCheckAffinityViolations,
        generateSparkline: cluster.generateSparkline,
        fetchGuestLocations: cluster.fetchGuestLocations,
        guestMigrationOptions: migrations.guestMigrationOptions,
        loadingGuestOptions: migrations.loadingGuestOptions,
        fetchGuestMigrationOptions: wrappedFetchGuestMigrationOptions,
        setGuestMigrationOptions: migrations.setGuestMigrationOptions,
        API_BASE
      }
    ), isMobile && /* @__PURE__ */ React.createElement("div", { className: "fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-50 sm:hidden" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-around h-14" }, /* @__PURE__ */ React.createElement("button", { onClick: () => {
    }, className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-orange-600 dark:text-orange-400" }, /* @__PURE__ */ React.createElement(Activity, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs font-semibold" }, "Dashboard")), /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setCurrentPage("automation"), className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(Clock, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "Automation")), /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setCurrentPage("settings"), className: "flex flex-col items-center justify-center gap-0.5 px-3 py-1 text-gray-500 dark:text-gray-400" }, /* @__PURE__ */ React.createElement(Settings, { size: 20 }), /* @__PURE__ */ React.createElement("span", { className: "text-xs" }, "Settings"))))) : /* @__PURE__ */ React.createElement("div", { className: "min-h-screen bg-gray-100 dark:bg-gray-900 p-4 pb-20 sm:pb-4" }, iconLegendModal, /* @__PURE__ */ React.createElement("div", { className: "max-w-7xl mx-auto" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center justify-between mb-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(ProxBalanceLogo, { size: 40 }), /* @__PURE__ */ React.createElement("h1", { className: "text-2xl font-bold text-gray-900 dark:text-white" }, "ProxBalance")), /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setShowIconLegend(!0), className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600", title: "Icon Reference" }, /* @__PURE__ */ React.createElement(HelpCircle, { size: 20, className: "text-gray-600 dark:text-gray-300" })), /* @__PURE__ */ React.createElement("button", { onClick: () => setDarkMode(!darkMode), className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600", title: darkMode ? "Switch to Light Mode" : "Switch to Dark Mode" }, darkMode ? /* @__PURE__ */ React.createElement(Sun, { size: 20, className: "text-yellow-500" }) : /* @__PURE__ */ React.createElement(Moon, { size: 20, className: "text-gray-700" })), /* @__PURE__ */ React.createElement("button", { onClick: () => ui.setCurrentPage("settings"), className: "p-2 rounded-lg bg-blue-600 dark:bg-blue-500 text-white hover:bg-blue-700 dark:hover:bg-blue-600", title: "Settings" }, /* @__PURE__ */ React.createElement(Settings, { size: 20 })))), cluster.error && /* @__PURE__ */ React.createElement("div", { className: "mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement(AlertCircle, { size: 24, className: "text-red-600 dark:text-red-400 shrink-0 mt-0.5" }), /* @__PURE__ */ React.createElement("div", { className: "flex-1" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-red-900 dark:text-red-200" }, "Connection Error"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-red-800 dark:text-red-300 mt-1" }, cluster.error), /* @__PURE__ */ React.createElement("button", { onClick: handleRefresh, disabled: cluster.loading, className: "mt-3 px-4 py-2 bg-red-600 dark:bg-red-500 text-white rounded hover:bg-red-700 dark:hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16, className: cluster.loading ? "animate-spin" : "" }), cluster.loading ? "Retrying..." : "Retry")))), cluster.loading && !cluster.error && /* @__PURE__ */ React.createElement("div", { className: "bg-white dark:bg-gray-800 rounded-lg shadow p-8 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-4" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 48, className: "text-blue-600 dark:text-blue-400 animate-spin" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-gray-900 dark:text-white" }, "Loading cluster data..."), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-gray-600 dark:text-gray-400 mt-1" }, "Please wait 30-60 seconds for initial data collection")))), !cluster.loading && !cluster.error && /* @__PURE__ */ React.createElement("div", { className: "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-8 text-center" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-col items-center gap-4" }, /* @__PURE__ */ React.createElement(Info, { size: 48, className: "text-blue-600 dark:text-blue-400" }), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-lg font-semibold text-blue-900 dark:text-blue-200" }, "No Data Available"), /* @__PURE__ */ React.createElement("p", { className: "text-sm text-blue-800 dark:text-blue-300 mt-1" }, "Waiting for cluster data collection. Please wait 30-60 seconds and refresh."), /* @__PURE__ */ React.createElement("button", { onClick: handleRefresh, className: "mt-4 px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-600 flex items-center gap-2 mx-auto" }, /* @__PURE__ */ React.createElement(RefreshCw, { size: 16 }), "Refresh"))))));
  }, root = ReactDOM.createRoot(document.getElementById("root"));
  root.render(/* @__PURE__ */ React.createElement(ProxmoxBalanceManager, null));
})();
