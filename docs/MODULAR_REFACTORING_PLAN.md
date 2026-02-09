# ProxBalance Modular Refactoring Plan

> **Last updated**: 2026-02-09
> **Status**: Phase 1B complete, Phase 2 COMPLETE, Phase 3 COMPLETE, Phase 4 IN PROGRESS

## Progress Summary

### Phase 1: Backend — COMPLETE

| Step | Description | Status |
|------|-------------|--------|
| 1.1 | Package skeleton + thin `app.py` entry point (60 lines) | Done |
| 1.2 | `CacheManager` → `proxbalance/cache.py` (53 lines) | Done |
| 1.3 | Proxmox client → merged into `config_manager.py` | Done |
| 1.4 | Configuration → `proxbalance/config_manager.py` (328 lines) | Done |
| 1.5 | Scoring algorithm → `proxbalance/scoring.py` (900 lines) | Done |
| 1.6 | Recommendations → `proxbalance/recommendations.py` (1,385 lines) | Done |
| 1.7 | Migrations → `proxbalance/migrations.py` (643 lines) | Done |
| 1.8 | Evacuation → `proxbalance/evacuation.py` (975 lines) | Done |
| 1.9 | Routes → 10 Flask Blueprints in `proxbalance/routes/` | Done |
| 1.10 | Entry points updated | Done |

### Phase 1B: Backend Decomposition — COMPLETE

| Step | Description | Status |
|------|-------------|--------|
| 1B.1 | `proxbalance/forecasting.py` (340 lines) — extracted from scoring.py + recommendations.py | Done |
| 1B.2 | `proxbalance/patterns.py` (171 lines) — extracted from scoring.py | Done |
| 1B.3 | `proxbalance/outcomes.py` (260 lines) — extracted from migrations.py | Done |
| 1B.4 | `proxbalance/execution_planner.py` (269 lines) — extracted from recommendations.py | Done |
| 1B.5 | `proxbalance/reporting.py` (307 lines) — extracted from recommendations.py | Done |
| — | Re-exports in original modules for backwards compatibility | Done |
| — | `proxbalance/__init__.py` updated with new module imports | Done |

### Phase 2: Frontend Componentization — COMPLETE

| Step | Description | Status |
|------|-------------|--------|
| 2.0 | Delete dead `src/app.jsx` (12,321 lines) | **Done** |
| 2.7 | Dashboard sub-components → `src/components/dashboard/` (13 files) | **Done** |
| 2.8 | Settings sub-components → `src/components/settings/` (5 files) | **Done** |
| 2.9 | Automation sub-components → `src/components/automation/` (6 files) | **Done** |
| 2.5 | Custom hooks extraction → `src/hooks/` (11 hooks) | **Done** |
| 2.10 | Slim root component (index.jsx: 2,547 → 658 lines, -74%) | **Done** |

### Phase 3: Shared Improvements — COMPLETE

| Step | Description | Status |
|------|-------------|--------|
| 3.1 | Shared constants modules (`proxbalance/constants.py` + `src/utils/constants.js`) | **Done** |
| 3.2 | Centralized error handling (`proxbalance/error_handlers.py`) | **Done** |
| 3.3 | Type hints for `config_manager.py` (9 functions) | **Done** |
| 3.3 | Type hints for `evacuation.py` (9 functions) | **Done** |
| 3.3 | Type hints for `scoring.py`, `recommendations.py`, `migrations.py` | **Done** |
| 3.3 | Type hints for Phase 1B modules (forecasting, patterns, outcomes, execution_planner, reporting) | **Done** |

### Phase 4: Deep Decomposition + Route Cleanup — IN PROGRESS

| Step | Description | Status |
|------|-------------|--------|
| 4.1 | Extract `proxbalance/storage.py` from recommendations.py + evacuation.py (284 lines) | **Done** |
| 4.2 | Extract `proxbalance/distribution.py` from recommendations.py (133 lines) | **Done** |
| 4.3 | Extract `proxbalance/recommendation_analysis.py` from recommendations.py (331 lines) | **Done** |
| 4.4 | Adopt `@api_route` decorator across all 10 route files (~68 handlers) | **In Progress** |
| 4.5 | Update CLAUDE.md to reflect current architecture | **Done** |

---

## Current File Sizes (2026-02-09)

### Backend Domain Modules

| File | Lines | Notes |
|------|-------|-------|
| `app.py` | 63 | Thin entry point — on target |
| `proxbalance/cache.py` | 53 | On target |
| `proxbalance/constants.py` | 56 | **New** — shared constants, path definitions |
| `proxbalance/config_manager.py` | 315 | On target, type-hinted, imports from constants.py |
| `proxbalance/error_handlers.py` | 108 | **New** — centralized error handling |
| `proxbalance/scoring.py` | 900 | Reduced from 1,147 (-21%) |
| `proxbalance/recommendations.py` | 838 | Reduced from 2,165 (-61%) |
| `proxbalance/recommendation_analysis.py` | 331 | **New** — confidence, reasons, conflicts |
| `proxbalance/storage.py` | 284 | **New** — storage compatibility + verification |
| `proxbalance/distribution.py` | 133 | **New** — guest distribution balancing |
| `proxbalance/migrations.py` | 643 | Reduced from 860 (-25%) |
| `proxbalance/evacuation.py` | 821 | Reduced from 975 (-16%) |
| `proxbalance/forecasting.py` | 340 | **New** — trend projection, forecast recs |
| `proxbalance/patterns.py` | 171 | **New** — workload pattern detection |
| `proxbalance/outcomes.py` | 260 | **New** — migration outcome tracking |
| `proxbalance/execution_planner.py` | 269 | **New** — topological execution ordering |
| `proxbalance/reporting.py` | 307 | **New** — summaries, capacity advisories |

### Frontend Pages (Wrapper Components)

| File | Lines | Before | Reduction |
|------|-------|--------|-----------|
| `src/components/DashboardPage.jsx` | 416 | 7,005 | **-94%** |
| `src/components/SettingsPage.jsx` | 213 | 2,240 | **-90%** |
| `src/components/AutomationPage.jsx` | 223 | 2,634 | **-92%** |
| `src/index.jsx` | 658 | 2,547 | **-74%** |

### Frontend Sub-Components

#### `src/components/dashboard/` (13 files, 7,123 lines total)

| File | Lines | Description |
|------|-------|-------------|
| `MigrationRecommendationsSection.jsx` | 1,631 | Recommendations, filters, outcomes, history |
| `AutomationStatusSection.jsx` | 1,180 | Automation panel, run history, in-progress |
| `MigrationModals.jsx` | 681 | Migration dialog, tags, batch confirm, cancel |
| `GuestTagManagement.jsx` | 548 | Guest tagging table with filters/sort |
| `ClusterMap.jsx` | 534 | Visual cluster diagram with migration flow |
| `SystemModals.jsx` | 456 | Update modal + branch manager modal |
| `GuestDetailsModal.jsx` | 452 | Guest resources, tags, migration options |
| `NodeDetailsModal.jsx` | 434 | Node stats, penalties, suitability modal |
| `AIRecommendationsSection.jsx` | 318 | AI-enhanced recommendations panel |
| `EvacuationModals.jsx` | 294 | Evacuation plan + confirmation modals |
| `NodeStatusSection.jsx` | 281 | Node metrics grid, sparklines, penalties |
| `DashboardHeader.jsx` | 240 | Logo, title, cluster stats, resources |
| `DashboardFooter.jsx` | 74 | Footer bar with timestamps |

#### `src/components/settings/` (5 files, 2,087 lines total)

| File | Lines | Description |
|------|-------|-------------|
| `PenaltyScoringSection.jsx` | 584 | Penalty config with simulator |
| `NotificationsSection.jsx` | 523 | All notification providers |
| `AdvancedSystemSettings.jsx` | 500 | Advanced system config |
| `DataCollectionSection.jsx` | 281 | Collection optimization |
| `AIProviderSection.jsx` | 199 | AI provider config forms |

#### `src/components/automation/` (6 files, 2,490 lines total)

| File | Lines | Description |
|------|-------|-------------|
| `TimeWindowsSection.jsx` | 887 | Timezone, timeline, window management |
| `MigrationLogsSection.jsx` | 385 | History table, logs, pagination |
| `MainSettingsSection.jsx` | 349 | Enable/disable, dry run, presets |
| `SafetyRulesSection.jsx` | 347 | Safety toggles and limits |
| `DecisionTreeFlowchart.jsx` | 293 | Migration decision tree diagram |
| `DistributionBalancingSection.jsx` | 229 | Distribution config |

#### `src/hooks/` (11 files, 1,919 lines total)

| File | Lines | Description |
|------|-------|-------------|
| `useMigrations.js` | 496 | Migration execution, tracking, tags, guest management |
| `useAutomation.js` | 262 | Automation status/config, run history, time windows |
| `useClusterData.js` | 248 | Data fetching, node scores, charts, sparklines |
| `useUpdates.js` | 177 | System info, updates, branch management |
| `useConfig.js` | 174 | Config loading/saving, penalty config |
| `useAIRecommendations.js` | 151 | AI provider config, AI analysis |
| `useRecommendations.js` | 146 | Recommendations, thresholds, feedback |
| `useUIState.js` | 132 | Page routing, collapsed sections, localStorage |
| `useAuth.js` | 77 | Permissions, token validation |
| `useEvacuation.js` | 44 | Maintenance nodes, evacuation state |
| `useDarkMode.js` | 12 | Dark mode toggle with class management |

---

## Remaining Work

### Phase 3.1: Shared Constants — DONE

**Backend** — `proxbalance/constants.py` (56 lines):
- `BASE_PATH`, `GIT_REPO_PATH` (environment-aware)
- `CACHE_FILE`, `CONFIG_FILE`, `SESSIONS_DIR`, `OUTCOMES_FILE`, `SCORE_HISTORY_FILE`
- `DISK_PREFIXES`, `MAX_OUTCOME_ENTRIES`, `POST_CAPTURE_DELAY_SECONDS`, `SCORE_HISTORY_MAX_ENTRIES`
- `config_manager.py` re-exports for backward compatibility

**Frontend** — `src/utils/constants.js` (10 lines):
- `API_BASE` (deduplicated from 8 files)
- `DEFAULT_CPU_THRESHOLD`, `DEFAULT_MEM_THRESHOLD`, `DEFAULT_IOWAIT_THRESHOLD`
- `RECOMMENDATIONS_REFRESH_INTERVAL`, `AUTOMATION_STATUS_REFRESH_INTERVAL`

### Phase 3.2: Centralized Error Handling — DONE

**Backend** — `proxbalance/error_handlers.py` (108 lines):
- `api_success()` / `api_error()` response helpers
- `@api_route` decorator for automatic exception handling
- `register_error_handlers(app)` for Flask-level 404/405/500 handlers
- Registered in `app.py`

### Phase 3.3: Type Hints Completion — DONE

| File | Estimated Coverage | Target | Status |
|------|-------------------|--------|--------|
| `config_manager.py` | 100% | 100% | **Done** (9 functions) |
| `evacuation.py` | 100% | 100% | **Done** (9 functions) |
| `scoring.py` | 100% | 100% | **Done** |
| `recommendations.py` | 100% | 100% | **Done** |
| `migrations.py` | 100% | 100% | **Done** |
| `forecasting.py` | 100% | 100% | **Done** |
| `patterns.py` | 100% | 100% | **Done** |
| `outcomes.py` | 100% | 100% | **Done** |
| `execution_planner.py` | 100% | 100% | **Done** |
| `reporting.py` | 100% | 100% | **Done** |

---

## Execution Order for Remaining Work

| Priority | Step | Effort | Impact |
|----------|------|--------|--------|
| ~~**1**~~ | ~~2.5: Extract frontend hooks from index.jsx~~ | ~~High~~ | **Done** (658 lines) |
| ~~**1**~~ | ~~3.1: Shared constants (deduplicate API_BASE etc.)~~ | ~~Low~~ | **Done** (constants.py + constants.js) |
| ~~**2**~~ | ~~3.2: Centralized Flask error handling~~ | ~~Medium~~ | **Done** (error_handlers.py) |
| ~~**3**~~ | ~~3.3: Type hints completion (all 10 modules)~~ | ~~Low~~ | **Done** (10 modules, 100% coverage) |

### Guiding Principles

1. **One module, one responsibility** — each file describable in one sentence
2. **Extract, don't rewrite** — move existing code, fix imports, verify behavior
3. **Keep `app.py` as a shim** — don't break deployment scripts
4. **Commit after each extraction** — prevent progress loss, enable rollback
5. **No new features during refactoring** — only structural changes
6. **Preserve all existing behavior** — this is a refactor, not a redesign

---

## Metrics

### Overall Progress

| Metric | Original | Current | Target |
|--------|----------|---------|--------|
| Largest Python file | 2,165 | 900 (scoring.py) | ~800 |
| Largest JSX file | 12,321 | 658 (index.jsx) | ~500 |
| Python domain modules | 6 | 16 | 16 |
| JSX component files | 3 | 27 | 27 |
| Frontend hooks | 0 | 11 | 11 |
| Dead code lines | 12,321 | 0 | 0 |

### Lines Eliminated from Monolithic Files

| File | Original | Current | Removed |
|------|----------|---------|---------|
| `src/app.jsx` | 12,321 | deleted | -12,321 |
| `index.jsx` | 2,547 | 658 | -1,889 |
| `DashboardPage.jsx` | 7,005 | 416 | -6,589 |
| `AutomationPage.jsx` | 2,634 | 223 | -2,411 |
| `SettingsPage.jsx` | 2,240 | 213 | -2,027 |
| `scoring.py` | 1,147 | 900 | -247 |
| `recommendations.py` | 2,165 | 838 | -1,327 |
| `migrations.py` | 860 | 643 | -217 |
| `evacuation.py` | 975 | 821 | -154 |
| **Total** | **31,894** | **3,712** | **-28,182 (-88%)** |
