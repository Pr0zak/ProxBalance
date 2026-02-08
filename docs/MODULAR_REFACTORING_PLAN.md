# ProxBalance Modular Refactoring Plan

> **Last updated**: 2026-02-08
> **Status**: Phase 1 ~85% complete, Phase 2 ~25% complete, Phase 3 ~15% complete

## Progress Summary

### What's Done (Phase 1 — Backend)

| Step | Description | Status |
|------|-------------|--------|
| 1.1 | Package skeleton + thin `app.py` entry point (60 lines) | Done |
| 1.2 | `CacheManager` → `proxbalance/cache.py` (53 lines) | Done |
| 1.3 | Proxmox client → merged into `config_manager.py` | Done (deviation: no separate `proxmox_client.py`) |
| 1.4 | Configuration → `proxbalance/config_manager.py` (328 lines) | Done |
| 1.5 | Scoring algorithm → `proxbalance/scoring.py` | Done (but bloated to 1,147 lines) |
| 1.6 | Recommendations → `proxbalance/recommendations.py` | Done (but bloated to 2,165 lines) |
| 1.7 | Migrations → `proxbalance/migrations.py` | Done (but bloated to 860 lines) |
| 1.8 | Evacuation → `proxbalance/evacuation.py` (975 lines) | Done |
| 1.9 | Routes → 10 Flask Blueprints in `proxbalance/routes/` | Done |
| 1.10 | Entry points updated | Done |

### What's Done (Phase 2 — Frontend)

| Step | Description | Status |
|------|-------------|--------|
| 2.1 | esbuild build system | Done |
| 2.2 | Icons extracted → `src/components/Icons.jsx` (78 lines) | Done |
| 2.3 | API client → `src/api/client.js` (851 lines) | Done (over target) |
| 2.4 | Utilities → `src/utils/formatters.js` (17 lines), `useIsMobile.js` (24 lines) | Partial |
| 2.5 | Custom hooks extraction | **Not started** |
| 2.6 | Common components extraction | **Not started** |
| 2.7 | Dashboard sub-components | **Not started** (DashboardPage is 7,005 lines) |
| 2.8 | Settings sub-components | **Not started** (SettingsPage is 2,240 lines) |
| 2.9 | Automation sub-components | **Not started** (AutomationPage is 2,634 lines) |
| 2.10 | Slim root component | **Not started** (index.jsx is 2,547 lines) |

### Dead Code

- `src/app.jsx` (12,321 lines) — **unused legacy file**, superseded by `src/index.jsx`. Must be deleted.

---

## Current File Sizes (2026-02-08)

### Backend

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `app.py` | 60 | ~60 | On target |
| `proxbalance/cache.py` | 53 | ~50 | On target |
| `proxbalance/config_manager.py` | 328 | ~400 | On target |
| `proxbalance/scoring.py` | 1,147 | ~500 | **Over — needs split** |
| `proxbalance/recommendations.py` | 2,165 | ~400 | **Over — needs split** |
| `proxbalance/migrations.py` | 860 | ~300 | **Over — needs split** |
| `proxbalance/evacuation.py` | 975 | ~400 | **Over — needs split** |
| `proxbalance/routes/recommendations.py` | 1,435 | thin | **Over — business logic in routes** |
| `proxbalance/routes/system.py` | 871 | thin | Over |
| `proxbalance/routes/automation.py` | 835 | thin | Over |
| `proxbalance/routes/guests.py` | 674 | thin | Over |
| `proxbalance/routes/config.py` | 586 | thin | Over |
| `proxbalance/routes/evacuation.py` | 511 | thin | Acceptable |

### Frontend

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `src/index.jsx` | 2,547 | ~200 | **Over — needs hooks extracted** |
| `src/app.jsx` | 12,321 | delete | **Dead code — delete** |
| `src/components/DashboardPage.jsx` | 7,005 | ~500 | **Over — needs sub-components** |
| `src/components/AutomationPage.jsx` | 2,634 | ~400 | **Over — needs sub-components** |
| `src/components/SettingsPage.jsx` | 2,240 | ~500 | **Over — needs sub-components** |
| `src/api/client.js` | 851 | ~400 | Over but acceptable |
| `src/components/Icons.jsx` | 78 | ~300 | On target |
| `src/components/Skeletons.jsx` | 31 | ~80 | On target |
| `src/components/IconLegend.jsx` | 173 | — | Not in plan (bonus) |
| `src/utils/formatters.js` | 17 | ~80 | On target |
| `src/utils/useIsMobile.js` | 24 | — | Not in plan (bonus) |

---

## Phase 1B: Backend — Decompose Bloated Domain Modules

New features (forecasting, patterns, outcomes, execution planning) were added directly into existing modules instead of new focused files. This phase extracts them.

### Step 1B.1: Extract `proxbalance/forecasting.py` from `scoring.py`

Move trend projection and forecasting functions:

```python
# FROM scoring.py:
project_trend()                      # lines 881-969, ~89 lines

# FROM recommendations.py:
_generate_forecast_recommendations() # lines 1273-1431, ~159 lines
_save_score_snapshot()               # lines 1432-1495, ~64 lines
```

**Result**: `forecasting.py` (~312 lines) — trend projection, forecast recommendations, score snapshots.

### Step 1B.2: Extract `proxbalance/patterns.py` from `scoring.py`

```python
# FROM scoring.py:
analyze_workload_patterns()          # lines 987-1147, ~161 lines
```

**Result**: `patterns.py` (~161 lines) — daily/weekly pattern detection, burst analysis.

### Step 1B.3: Extract `proxbalance/outcomes.py` from `migrations.py`

```python
# FROM migrations.py:
_load_migration_outcomes()           # lines 34-48
_save_migration_outcomes()           # lines 51-66
capture_pre_migration_snapshot()     # lines 69-105
record_migration_outcome()           # lines 108-150
update_post_migration_metrics()      # lines 153-251
```

**Result**: `outcomes.py` (~210 lines) — migration outcome tracking, pre/post snapshots.

**Result for `migrations.py`**: Drops from 860 to ~450 lines (execute, batch, cancel, validate, rollback).

### Step 1B.4: Extract `proxbalance/execution_planner.py` from `recommendations.py`

```python
# FROM recommendations.py:
_compute_execution_order()           # lines 1012-1272, ~261 lines
```

**Result**: `execution_planner.py` (~261 lines) — topological sort, parallel groups, cycle detection.

### Step 1B.5: Extract `proxbalance/reporting.py` from `recommendations.py`

```python
# FROM recommendations.py:
_build_summary()                     # lines 594-769, ~176 lines
_generate_capacity_advisories()      # lines 771-892, ~122 lines
```

**Result**: `reporting.py` (~298 lines) — cluster health summaries, capacity advisories.

### Post-1B Target Sizes

| Module | Before | After | Content |
|--------|--------|-------|---------|
| `scoring.py` | 1,147 | ~773 | Core scoring, thresholds, risk |
| `recommendations.py` | 2,165 | ~1,086 | Guest selection, confidence, recommendations |
| `migrations.py` | 860 | ~450 | Execute, batch, cancel, validate |
| `forecasting.py` | — | ~312 | Trend projection, forecast recs, snapshots |
| `patterns.py` | — | ~161 | Workload pattern detection |
| `outcomes.py` | — | ~210 | Migration outcome tracking |
| `execution_planner.py` | — | ~261 | Topological execution ordering |
| `reporting.py` | — | ~298 | Summaries and capacity advisories |

### Import Updates Required

After extraction, update imports in:
- `proxbalance/__init__.py` — add new module exports
- `proxbalance/recommendations.py` — import from `forecasting`, `execution_planner`, `reporting`
- `proxbalance/routes/recommendations.py` — import from new modules
- `generate_recommendations.py` — if it imports directly

---

## Phase 2 (Revised): Frontend Componentization

### Step 2.0: Delete Dead Code
- Delete `src/app.jsx` (12,321 lines of unused legacy code)

### Step 2.5 (Revised): Extract Custom Hooks → `src/hooks/`

`index.jsx` has 102 useState declarations across 10+ domains. Extract into focused hooks:

| Hook | State Variables | Handlers | Lines |
|------|----------------|----------|-------|
| `useClusterData.js` | data, loading, error, lastUpdate, nextUpdate, backendCollected, clusterHealth, nodeScores, autoRefreshInterval | fetchAnalysis, handleRefresh, fetchNodeScores | ~200 |
| `useRecommendations.js` | recommendations, recommendationData, loadingRecommendations, cpuThreshold, memThreshold, iowaitThreshold, thresholdMode, thresholdSuggestions, feedbackGiven | generateRecommendations, fetchCachedRecommendations, onFeedback | ~200 |
| `useAIRecommendations.js` | aiProvider, aiEnabled, aiRecommendations, loadingAi, aiAnalysisPeriod, openai*, anthropic*, local* | fetchAiRecommendations, fetchAiModels | ~150 |
| `useMigrations.js` | migrationStatus, activeMigrations, guestsMigrating, migrationProgress, completedMigrations, showBatchConfirmation, pendingBatchMigrations, guestMigrationOptions, loadingGuestOptions | executeMigration, trackMigration, cancelMigration, confirmAndMigrate, fetchGuestMigrationOptions | ~250 |
| `useAutomation.js` | automationStatus, automationConfig, runHistory, expandedRun, runningAutomation, runNowMessage, editingPreset, testResult, testingAutomation, showTimeWindowForm, editingWindowIndex, newWindowData | fetchAutomationStatus, runAutomationNow, fetchRunHistory | ~200 |
| `useConfig.js` | config, tempBackendInterval, tempUiInterval, savingSettings, collectionSettingsSaved, penaltyConfig, penaltyDefaults, showPenaltyConfig | fetchConfig, saveSettings, fetchPenaltyConfig | ~150 |
| `useAuth.js` | canMigrate, permissionReason, proxmoxTokenId, proxmoxTokenSecret, validatingToken, tokenValidationResult, tokenAuthError, scrollToApiConfig | checkPermissions, validateToken | ~100 |
| `useEvacuation.js` | maintenanceNodes, evacuatingNodes, evacuationStatus, evacuationPlan, planNode, planningNodes, guestActions, guestTargets, showConfirmModal | evacuateNode, cancelEvacuation | ~150 |
| `useUpdates.js` | systemInfo, updating, updateLog, updateResult, updateError, showUpdateModal, showBranchModal, availableBranches, branchPreview, loadingPreview, switchingBranch, rollingBack, loadingBranches | fetchSystemInfo, handleUpdate, fetchBranches, switchBranch, rollbackBranch | ~200 |
| `useDarkMode.js` | darkMode | toggleDarkMode | ~20 |
| `useUIState.js` | currentPage, dashboardHeaderCollapsed, nodeGridColumns, collapsedSections, clusterMapViewMode, showPoweredOffGuests, selectedNode, selectedGuestDetails, chartPeriod, guestSort*, guestPage*, guestSearch*, guestModalCollapsed, selectedGuest, showMigrationDialog, migrationTarget, showTagModal, tagModalGuest, newTag, confirmRemoveTag, showIconLegend, logoBalancing | toggleSection | ~150 |

**Result**: `index.jsx` drops from 2,547 to ~300 lines (hook composition + page routing + render).

### Step 2.7 (Revised): Extract Dashboard Sub-Components

`DashboardPage.jsx` (7,005 lines) splits into these files under `src/components/dashboard/`:

| Component | Source Lines | Est. Size | Description |
|-----------|-------------|-----------|-------------|
| `DashboardHeader.jsx` | 175-395 | ~220 | Logo, title, cluster stats, resource utilization |
| `AutomationStatusSection.jsx` | 396-1550 | ~1,154 | Automation panel, run history, in-progress migrations |
| `GuestTagManagement.jsx` | 1554-2072 | ~518 | Guest tagging table with filters/sort/pagination |
| `ClusterMap.jsx` | 2072-2581 | ~510 | Visual cluster diagram with migration flow |
| `NodeDetailsModal.jsx` | 2582-2998 | ~416 | Node stats, penalties, migration suitability modal |
| `GuestDetailsModal.jsx` | 2999-3435 | ~436 | Guest resources, tags, migration options modal |
| `EvacuationModals.jsx` | 3435-3711 | ~276 | Evacuation plan + confirmation modals |
| `NodeStatusSection.jsx` | 3712-5540 | ~1,828 | Node metrics, charts, penalties, workload patterns |
| `AIRecommendations.jsx` | 5543-5850 | ~307 | AI analysis panel |
| `MigrationModals.jsx` | 6291-7005 | ~714 | Migration dialog, tag modal, batch confirmation, cancel |
| `DashboardPage.jsx` (shell) | — | ~500 | Layout orchestrator importing all sub-components |

### Step 2.8 (Revised): Extract Settings Sub-Components

`SettingsPage.jsx` (2,240 lines) splits into `src/components/settings/`:

| Component | Est. Size | Description |
|-----------|-----------|-------------|
| `GeneralSettings.jsx` | ~300 | Thresholds, collection config |
| `AISettings.jsx` | ~400 | AI provider configuration |
| `PenaltyConfig.jsx` | ~400 | Penalty weight editor |
| `TokenSettings.jsx` | ~200 | Proxmox token management |
| `NotificationSettings.jsx` | ~300 | Notification provider config |
| `SettingsPage.jsx` (shell) | ~300 | Layout + tab navigation |

### Step 2.9 (Revised): Extract Automation Sub-Components

`AutomationPage.jsx` (2,634 lines) splits into `src/components/automation/`:

| Component | Est. Size | Description |
|-----------|-----------|-------------|
| `AutomationConfig.jsx` | ~800 | Automation settings form |
| `MigrationWindows.jsx` | ~400 | Time window editor |
| `SafetyChecks.jsx` | ~300 | Safety check configuration |
| `AffinityRules.jsx` | ~300 | Affinity rule management |
| `AutomationPage.jsx` (shell) | ~400 | Layout + section orchestration |

---

## Phase 3 (Revised): Shared Improvements

### Step 3.1: Shared Constants

**Backend** — `proxbalance/constants.py`:
- Move `DEFAULT_PENALTY_CONFIG` from `scoring.py`
- Move path constants from `config_manager.py`
- Move `OUTCOMES_FILE`, `MAX_OUTCOME_ENTRIES`, `POST_CAPTURE_DELAY_SECONDS` from `migrations.py`

**Frontend** — `src/utils/constants.js`:
- Export `API_BASE` and all API endpoint paths
- Default threshold values
- Refresh interval constants
- Color maps and UI constants

### Step 3.2: Centralized Error Handling

**Backend**: Add Flask error handlers in `proxbalance/__init__.py`:
- `@app.errorhandler(400)`, `@app.errorhandler(500)`
- Standardize response format: `{"success": false, "error": "message"}`
- Reduce 328 individual try/except blocks in routes

**Frontend**: API client already consistent (`{ error: true, message }`) — acceptable.

### Step 3.3: Type Hints

| File | Current Coverage | Target |
|------|-----------------|--------|
| `scoring.py` | 87% | 100% |
| `recommendations.py` | 79% | 100% |
| `migrations.py` | 58% | 100% |
| `cache.py` | 100% | 100% |
| `config_manager.py` | 0% | 100% |
| `evacuation.py` | 0% | 100% |

---

## Execution Order (Revised)

| Priority | Step | Effort | Impact | Risk |
|----------|------|--------|--------|------|
| **1** | 2.0: Delete dead `src/app.jsx` | Trivial | -12,321 lines | None |
| **2** | 1B.1-1B.5: Extract backend modules | Medium | 5 new focused modules | Low |
| **3** | 2.5: Extract frontend hooks | High | index.jsx drops to ~300 lines | Medium |
| **4** | 2.7: Dashboard sub-components | High | DashboardPage drops to ~500 lines | Medium |
| **5** | 2.8-2.9: Settings + Automation sub-components | Medium | Each page drops to ~300-400 lines | Medium |
| **6** | 3.1-3.3: Constants, error handling, type hints | Low | Developer experience | Low |

### Guiding Principles

1. **One module, one responsibility** — each file should be describable in one sentence
2. **Extract, don't rewrite** — move existing code, fix imports, verify behavior
3. **Keep `app.py` as a shim** — don't break deployment scripts
4. **Commit after each extraction** — prevent progress loss, enable rollback
5. **No new features during refactoring** — only structural changes
6. **Preserve all existing behavior** — this is a refactor, not a redesign

### Expected Final Outcome

| Metric | Original | Current | Target |
|--------|----------|---------|--------|
| Largest Python file | 6,114 | 2,165 | ~800 |
| Largest JSX file | 11,827 | 7,005 | ~800 |
| Python domain modules | 1 | 6 | 11 |
| JSX component files | 1 | 8 | ~30 |
| Frontend hooks | 0 | 0 | 11 |
| Dead code | 0 | 12,321 | 0 |
