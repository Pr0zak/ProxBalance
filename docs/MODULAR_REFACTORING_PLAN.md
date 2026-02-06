# ProxBalance Modular Refactoring Plan

## Current State

| File | Lines | Problem |
|------|-------|---------|
| `app.py` | 6,114 | Monolithic Flask API: scoring algorithm, migration execution, evacuation logic, config management, 48+ routes all in one file |
| `src/app.jsx` | 11,827 | Entire React SPA in a single file: 40+ icon components, 300+ state hooks, 150+ event handlers, all dashboard/settings/automation UI |

Total: ~18,000 lines across 2 files that should be broken into focused modules.

---

## Phase 1: Backend — Extract `app.py` into a Package

### Goal
Transform `app.py` (6,114 lines) into a `proxbalance/` Python package with focused modules. Each module owns one domain. Routes stay thin — they validate input, call domain logic, and return responses.

### Target Structure

```
proxbalance/
├── __init__.py              # Flask app factory, register blueprints
├── cache.py                 # CacheManager class (~50 lines)
├── config_manager.py        # load_config(), save_config(), validation, import/export (~400 lines)
├── scoring.py               # Penalty scoring algorithm, health scores, thresholds (~500 lines)
├── recommendations.py       # Recommendation engine, guest selection, distribution (~400 lines)
├── migrations.py            # execute_migration(), batch, cancel, status tracking (~300 lines)
├── evacuation.py            # Evacuation planning, execution, session tracking (~400 lines)
├── proxmox_client.py        # get_proxmox_client(), Proxmox API helpers (~100 lines)
├── utils.py                 # Shared utilities (formatters, file I/O helpers) (~100 lines)
│
└── routes/
    ├── __init__.py           # Register all blueprints
    ├── analysis.py           # /api/cluster-analysis, /api/cluster-summary, /api/nodes-only, /api/guests-only
    ├── recommendations.py    # /api/recommendations, /api/ai-recommendations, /api/node-scores
    ├── migrations.py         # /api/migrate, /api/migrate/batch, /api/migrations/*/cancel
    ├── evacuation.py         # /api/nodes/evacuate, /api/nodes/evacuate/status/*
    ├── config.py             # /api/config, /api/permissions, /api/validate-token, import/export
    ├── penalty.py            # /api/penalty-config, /api/penalty-config/reset
    ├── system.py             # /api/system/*, /api/logs/*
    ├── guests.py             # /api/guests/*, /api/tasks/*
    ├── automation.py         # /api/automigrate/*
    └── notifications.py      # /api/notifications/*
```

### Step-by-Step Breakdown

#### Step 1.1: Create Package Skeleton + App Factory
- Create `proxbalance/` directory with `__init__.py`
- Move Flask app creation into a `create_app()` factory function
- Keep `app.py` as a thin entry point that calls `create_app()`
- **Verify**: `python app.py` still starts the server, all routes respond

#### Step 1.2: Extract `CacheManager` → `proxbalance/cache.py`
- Move the `CacheManager` class (app.py lines ~141-180)
- Update imports in `app.py`
- **Low risk** — self-contained class with no external dependencies

#### Step 1.3: Extract Proxmox Client → `proxbalance/proxmox_client.py`
- Move `get_proxmox_client()` and related connection helpers
- These are used by migration execution and data collection code
- **Low risk** — pure utility function

#### Step 1.4: Extract Configuration Management → `proxbalance/config_manager.py`
- Move `load_config()`, `save_config()`, config validation logic
- Move config import/export/backup functions
- Move `DEFAULT_PENALTY_CONFIG` and penalty config load/save
- These are referenced throughout `app.py` — will need careful import updates

#### Step 1.5: Extract Scoring Algorithm → `proxbalance/scoring.py`
- Move from app.py lines ~797-1100:
  - `DEFAULT_PENALTY_CONFIG` (if not already in config_manager)
  - `calculate_intelligent_thresholds()`
  - `calculate_node_health_score()`
  - `predict_post_migration_load()`
  - `calculate_target_node_score()`
- These are the core value of ProxBalance — extract carefully with full test coverage

#### Step 1.6: Extract Recommendation Engine → `proxbalance/recommendations.py`
- Move from app.py lines ~1100-1666:
  - `select_guests_to_migrate()`
  - `build_storage_cache()`
  - `check_storage_compatibility()`
  - `find_distribution_candidates()`
  - `generate_recommendations()`
- Depends on scoring module — import from `proxbalance.scoring`

#### Step 1.7: Extract Migration Execution → `proxbalance/migrations.py`
- Move from app.py lines ~2066-2400:
  - `execute_migration()`
  - `execute_batch_migration()`
  - Migration status tracking and cancellation logic
- Depends on `proxmox_client` for API calls

#### Step 1.8: Extract Evacuation Logic → `proxbalance/evacuation.py`
- Move from app.py lines ~2417-2756:
  - `evacuate_node()` / `_execute_evacuation()`
  - `_update_evacuation_progress()`
  - Evacuation session file management
  - Storage verification helpers
- Depends on `migrations` module for actual execution

#### Step 1.9: Extract Routes into Blueprints → `proxbalance/routes/`
- Convert each route group into a Flask Blueprint:
  - `analysis_bp`, `recommendations_bp`, `migrations_bp`, `evacuation_bp`, `config_bp`, `penalty_bp`, `system_bp`, `guests_bp`, `automation_bp`, `notifications_bp`
- Routes become thin wrappers calling domain modules
- Register all blueprints in `proxbalance/__init__.py`
- **This is the largest step** — do one blueprint at a time

#### Step 1.10: Update Entry Points
- Ensure `app.py` remains a thin entry point: `from proxbalance import create_app; app = create_app()`
- Update `automigrate.py` and `generate_recommendations.py` if they import from app.py directly (currently they use HTTP calls, so impact should be minimal)
- Update systemd service files if python paths change
- Update `install.sh` and `update.sh` if they reference app.py internals

### Risk Mitigation
- **No database migrations needed** — JSON file storage is path-based, not import-based
- **Gunicorn entry point** — systemd service uses `gunicorn app:app`, will need to become `gunicorn proxbalance:create_app()`  (or keep `app.py` as a re-export shim)
- **Background scripts use HTTP** — `automigrate.py` and `generate_recommendations.py` call API endpoints, not Python imports, so they are unaffected
- **Keep `app.py` as a shim** during transition: it can re-export the Flask app from the package so existing deployment scripts don't break

---

## Phase 2: Frontend — Extract `src/app.jsx` into Components

### Goal
Break `src/app.jsx` (11,827 lines) into focused component files. Since there's no bundler (Babel CLI only), use a convention where component files are concatenated or Babel compiles a directory.

### Build System Consideration
The current build compiles JSX via Babel CLI without a bundler. Two approaches:

**Option A: Single-entry with imports (requires bundler)**
- Add a lightweight bundler (esbuild — fast, zero-config)
- Use standard ES module imports between component files
- `npx esbuild src/app.jsx --bundle --outfile=static/app.js`

**Option B: Concatenation order (no bundler, fragile)**
- Split into files that are concatenated in dependency order
- Fragile and hard to maintain — not recommended

**Recommendation**: Option A with esbuild. It adds ~5MB to node_modules, compiles in <100ms, and enables proper module imports. The existing Babel step can be replaced entirely since esbuild handles JSX natively.

### Target Structure

```
src/
├── app.jsx                    # Root component, routing, top-level state (~200 lines)
├── api/
│   └── client.js              # All fetch() calls to /api/* endpoints (~400 lines)
│
├── hooks/
│   ├── useClusterData.js      # Data fetching + polling logic (~150 lines)
│   ├── useConfig.js           # Configuration state + save/load (~100 lines)
│   ├── useMigrations.js       # Migration state + execution (~150 lines)
│   ├── useAutomation.js       # Automation state + controls (~100 lines)
│   └── useDarkMode.js         # Theme toggle with localStorage (~30 lines)
│
├── components/
│   ├── icons/
│   │   └── Icons.jsx          # All 40+ SVG icon components (~300 lines)
│   │
│   ├── common/
│   │   ├── SkeletonLoaders.jsx  # Loading skeleton components (~80 lines)
│   │   ├── Modal.jsx            # Reusable modal wrapper (~50 lines)
│   │   └── StatusBadge.jsx      # Status indicator badges (~40 lines)
│   │
│   ├── dashboard/
│   │   ├── DashboardPage.jsx    # Dashboard layout + section orchestration (~300 lines)
│   │   ├── Header.jsx           # App header, refresh, version info (~150 lines)
│   │   ├── ClusterMap.jsx       # 5-mode cluster visualization (~400 lines)
│   │   ├── NodeCards.jsx        # Node status cards with charts (~500 lines)
│   │   ├── Recommendations.jsx  # Algorithm + AI recommendation panels (~400 lines)
│   │   ├── GuestList.jsx        # Searchable/sortable guest table (~400 lines)
│   │   ├── MigrationDialog.jsx  # Migration confirmation + execution UI (~300 lines)
│   │   ├── EvacuationPanel.jsx  # Node evacuation UI (~300 lines)
│   │   ├── MaintenanceMode.jsx  # Maintenance mode controls (~200 lines)
│   │   └── TaggedGuests.jsx     # Guest tag management (~200 lines)
│   │
│   ├── settings/
│   │   ├── SettingsPage.jsx     # Settings layout (~200 lines)
│   │   ├── GeneralSettings.jsx  # Thresholds, collection config (~300 lines)
│   │   ├── AISettings.jsx       # AI provider configuration (~300 lines)
│   │   ├── PenaltyConfig.jsx    # Penalty weight editor (~300 lines)
│   │   ├── TokenSettings.jsx    # Proxmox token management (~200 lines)
│   │   └── SystemSettings.jsx   # Branch, update, service management (~300 lines)
│   │
│   └── automation/
│       ├── AutomationPage.jsx   # Automation layout (~200 lines)
│       ├── AutomationConfig.jsx # Automation settings form (~400 lines)
│       └── AutomationWidget.jsx # Dashboard status widget (~150 lines)
│
└── utils/
    ├── formatters.js          # Time formatting, number formatting (~80 lines)
    ├── sparkline.js           # Sparkline SVG generation (~50 lines)
    └── constants.js           # Default values, color maps, thresholds (~50 lines)
```

### Step-by-Step Breakdown

#### Step 2.1: Set Up esbuild
- Install esbuild: `npm install --save-dev esbuild`
- Create build script that replaces the Babel step
- Verify the existing app works with the new build
- Update `update.sh` and `install.sh` to use esbuild instead of Babel

#### Step 2.2: Extract Icons → `src/components/icons/Icons.jsx`
- Move all 40+ SVG icon components (the simplest extraction)
- Export each as a named export
- Update imports in the main file
- **Low risk** — pure presentational components with no state

#### Step 2.3: Extract API Client → `src/api/client.js`
- Consolidate all `fetch('/api/...')` calls into a single module
- Each function takes parameters and returns parsed JSON
- Handles error responses consistently
- Components call `api.fetchAnalysis()` instead of inline fetch

#### Step 2.4: Extract Utility Functions → `src/utils/`
- `formatters.js`: `formatLocalTime()`, `getTimezoneAbbr()`, number formatters
- `sparkline.js`: `generateSparkline()` SVG generation
- `constants.js`: default config values, color maps, grid presets

#### Step 2.5: Extract Custom Hooks → `src/hooks/`
- Group related `useState` + `useEffect` + handler functions into custom hooks
- `useClusterData`: data fetching, polling, refresh logic
- `useConfig`: configuration state, save/load, validation
- `useMigrations`: migration execution, tracking, batch operations
- `useAutomation`: automation status, config, run/test
- `useDarkMode`: theme toggle with localStorage persistence

#### Step 2.6: Extract Common Components → `src/components/common/`
- `SkeletonLoaders.jsx`: `SkeletonCard`, `SkeletonNodeCard`, `SkeletonClusterMap`
- `Modal.jsx`: reusable modal wrapper (currently inlined in multiple places)
- `StatusBadge.jsx`: status indicators used across pages

#### Step 2.7: Extract Dashboard Components → `src/components/dashboard/`
- This is the largest extraction — do one component at a time:
  1. `Header.jsx` — relatively self-contained
  2. `ClusterMap.jsx` — complex but isolated visualization
  3. `NodeCards.jsx` — node status cards
  4. `Recommendations.jsx` — recommendation panels
  5. `GuestList.jsx` — guest table with sorting/filtering
  6. `MigrationDialog.jsx` — migration confirmation modal
  7. `EvacuationPanel.jsx` — evacuation UI
  8. `MaintenanceMode.jsx` — maintenance controls
  9. `TaggedGuests.jsx` — tag management
  10. `DashboardPage.jsx` — orchestrates the above

#### Step 2.8: Extract Settings Components → `src/components/settings/`
- `GeneralSettings.jsx`, `AISettings.jsx`, `PenaltyConfig.jsx`
- `TokenSettings.jsx`, `SystemSettings.jsx`
- `SettingsPage.jsx` — layout wrapper

#### Step 2.9: Extract Automation Components → `src/components/automation/`
- `AutomationConfig.jsx` — full config form
- `AutomationWidget.jsx` — dashboard widget
- `AutomationPage.jsx` — page layout

#### Step 2.10: Slim Down Root `app.jsx`
- Root component handles only:
  - Page routing (dashboard / settings / automation)
  - Top-level providers/context
  - Composing page components
- Target: ~200 lines

---

## Phase 3: Shared Improvements

### Step 3.1: Add a Shared Constants Module
- Python: `proxbalance/constants.py` — default configs, file paths, penalty defaults
- JS: `src/utils/constants.js` — API paths, default UI state, color maps

### Step 3.2: Centralize Error Handling
- Python: Flask error handlers in `proxbalance/__init__.py` instead of try/except in every route
- JS: API client returns consistent error objects, components handle uniformly

### Step 3.3: Add Type Hints (Python)
- Add type hints to all extracted module functions
- Enables IDE support and catches bugs during development
- Can be validated with `mypy` in CI later

---

## Execution Order & Priority

| Priority | Phase | Effort | Impact | Risk |
|----------|-------|--------|--------|------|
| 1 | 1.1-1.3 | Low | Foundation for all backend work | Low |
| 2 | 1.4-1.6 | Medium | Extracts core algorithm (~1,500 lines from app.py) | Medium |
| 3 | 1.7-1.8 | Medium | Extracts migration/evacuation (~700 lines) | Medium |
| 4 | 1.9-1.10 | High | Routes into blueprints — largest change | Medium |
| 5 | 2.1-2.2 | Low | Build system + icons extraction | Low |
| 6 | 2.3-2.5 | Medium | API client + hooks — enables all component extractions | Medium |
| 7 | 2.6-2.10 | High | Component extractions — most lines moved | Medium |
| 8 | 3.1-3.3 | Low | Polish and developer experience | Low |

### Guiding Principles

1. **One module, one responsibility** — each file should be describable in one sentence
2. **Extract, don't rewrite** — move existing code, fix imports, verify behavior
3. **Keep `app.py` as a shim** — don't break deployment scripts during transition
4. **Test after each step** — verify the server starts and routes respond after every extraction
5. **No new features during refactoring** — only structural changes
6. **Preserve all existing behavior** — this is a refactor, not a redesign

### Expected Outcome

| Metric | Before | After |
|--------|--------|-------|
| Largest Python file | 6,114 lines | ~500 lines (any single module) |
| Largest JSX file | 11,827 lines | ~500 lines (any single component) |
| Python modules | 9 files | ~20 files in organized package |
| JSX components | 1 file | ~25 files in organized directories |
| Find a route handler | Search 6K lines | Open `routes/<domain>.py` |
| Find a React component | Search 12K lines | Open `components/<section>/<Name>.jsx` |
| Modify scoring algorithm | Edit massive app.py | Edit focused `scoring.py` |
| Add a new API endpoint | Add to monolith | Add to relevant blueprint |
