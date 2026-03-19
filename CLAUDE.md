# CLAUDE.md - ProxBalance AI Assistant Guide

## Project Overview

ProxBalance is an intelligent cluster monitoring and VM/CT migration management system for **Proxmox VE**. It provides real-time metrics, a penalty-based scoring algorithm for node health, AI-powered migration recommendations, automated migration scheduling, and an interactive web dashboard.

**Target users**: Proxmox administrators managing multi-node clusters.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+ (Flask 2.0+, Gunicorn) |
| Frontend | React 17+ (JSX), Tailwind CSS (CDN), Chart.js |
| Build Tool | esbuild (JSX bundling) |
| Reverse Proxy | Nginx |
| Process Manager | Systemd (services + timers) |
| Data Storage | SQLite (WAL mode) + JSON config files |
| Proxmox API | proxmoxer library |
| AI Providers | OpenAI, Anthropic Claude, Ollama |
| Notifications | Pushover, Email/SMTP, Telegram, Discord, Slack, Webhooks |

## Repository Structure

```
ProxBalance/
├── app.py                       # Flask entry point (~63 lines, modular Blueprint architecture)
├── collector_api.py             # Proxmox data collection service (834 lines)
├── ai_provider.py               # AI provider abstraction (OpenAI/Anthropic/Ollama)
├── notifications.py             # Multi-provider notification system
├── automigrate.py               # Automated migration orchestrator (~1,500 lines)
├── update_manager.py            # Update checking and branch management
├── update_timer.py              # Update timer helper
├── generate_recommendations.py  # Background recommendation generation
├── set_cluster_preset.py        # Cluster size preset configuration
│
├── proxbalance/                 # Core backend package (19 domain modules)
│   ├── __init__.py              # Package exports
│   ├── constants.py             # Shared path constants, file paths, tuning values
│   ├── config_manager.py        # Config loading/saving, Proxmox client (type-hinted)
│   ├── cache.py                 # In-memory cache with 60s TTL
│   ├── db.py                    # SQLite connection management, schema DDL, JSON migration
│   ├── migration_db.py          # Migration history, automation state, recommendation tracking
│   ├── error_handlers.py        # Centralized Flask error handling, @api_route decorator
│   ├── scoring.py               # Penalty-based scoring algorithm (~900 lines)
│   ├── recommendations.py       # Recommendation engine (~838 lines)
│   ├── recommendation_analysis.py # Confidence scoring, structured reasons, conflict detection
│   ├── storage.py               # Storage compatibility and verification
│   ├── distribution.py          # Guest distribution balancing across nodes
│   ├── migrations.py            # Migration execution logic (~643 lines)
│   ├── evacuation.py            # Node evacuation planning and sessions (~821 lines)
│   ├── forecasting.py           # Trend projection, forecast recommendations, score history
│   ├── metrics_store.py         # Node/guest metrics time-series storage (SQLite)
│   ├── guest_profiles.py        # Guest behavior profiling and classification (SQLite)
│   ├── patterns.py              # Workload pattern detection
│   ├── outcomes.py              # Migration outcome tracking (SQLite)
│   ├── trend_analysis.py        # Node/guest trend analysis
│   ├── execution_planner.py     # Topological execution ordering
│   ├── reporting.py             # Summaries, capacity advisories
│   ├── settings_mapper.py       # Simplified settings ↔ penalty config mapping
│   │
│   └── routes/                  # Flask Blueprints (all API endpoints, use @api_route)
│       ├── __init__.py          # register_blueprints() — registers all 10 blueprints
│       ├── analysis.py          # /api/cluster-analysis, /api/cluster-summary, etc.
│       ├── automation.py        # /api/automigrate/* endpoints
│       ├── config.py            # /api/config endpoints
│       ├── evacuation.py        # /api/nodes/evacuate endpoints
│       ├── guests.py            # /api/guests/* endpoints
│       ├── migrations.py        # /api/migrate endpoint
│       ├── notifications.py     # /api/notifications/test endpoint
│       ├── penalty.py           # /api/penalty-config endpoint
│       ├── recommendations.py   # /api/recommendations endpoints
│       └── system.py            # /api/update/*, /api/health, etc.
│
├── src/                         # Frontend source (React JSX, componentized)
│   ├── index.jsx                # Root component + hook composition (~560 lines)
│   ├── hooks/                   # 11 custom React hooks
│   │   ├── useDarkMode.js       # Dark mode toggle
│   │   ├── useAuth.js           # Permissions, token validation
│   │   ├── useUIState.js        # Page routing, collapsed sections, localStorage
│   │   ├── useConfig.js         # Config loading/saving, penalty config
│   │   ├── useEvacuation.js     # Maintenance nodes, evacuation state
│   │   ├── useUpdates.js        # System info, updates, branch management
│   │   ├── useClusterData.js    # Data fetching, node scores, sparklines
│   │   ├── useRecommendations.js # Recommendations, thresholds, feedback
│   │   ├── useAIRecommendations.js # AI provider config, AI analysis
│   │   ├── useMigrations.js     # Migration execution, tracking, tags
│   │   └── useAutomation.js     # Automation status/config, run history
│   ├── components/
│   │   ├── DashboardPage.jsx    # Dashboard wrapper (~416 lines)
│   │   ├── MobileTabBar.jsx     # Reusable mobile bottom tab navigation
│   │   ├── dashboard/           # 14 dashboard sub-components (includes NodeChart.jsx)
│   │   ├── AutomationPage.jsx   # Automation wrapper (~223 lines)
│   │   ├── automation/          # 8 automation sub-components
│   │   ├── SettingsPage.jsx     # Settings wrapper (~213 lines)
│   │   ├── settings/            # 5 settings sub-components
│   │   ├── ErrorBoundary.jsx     # Error boundary (prevents white-screen crashes)
│   │   ├── Icons.jsx            # SVG icon components
│   │   └── Skeletons.jsx        # Loading skeleton components
│   ├── api/
│   │   └── client.js            # API client with error handling
│   └── utils/
│       ├── constants.js         # Shared frontend constants (API_BASE, thresholds)
│       ├── designTokens.js      # Centralized design tokens (glass cards, buttons, modals)
│       ├── formatters.js        # Utility formatting functions
│       └── useIsMobile.js       # Mobile responsiveness hook
│
├── index.html                   # SPA entry point (loads React, ReactDOM, then app.js)
├── tailwind.config.js           # Tailwind CSS configuration
├── assets/                      # SVG logos, favicon, and built JS
│   ├── js/app.js                # Bundled frontend output (built by esbuild, gitignored)
│   ├── logo_v2.svg, favicon.svg, etc.
│
├── config.example.json          # Configuration template (149 lines)
├── requirements.txt             # Python dependencies (7 packages)
├── LICENSE                      # MIT License
├── .gitattributes               # LF line ending enforcement
│
├── systemd/                     # Systemd service and timer files
│   ├── proxmox-balance.service
│   ├── proxmox-collector.service / .timer
│   ├── proxmox-balance-automigrate.service / .timer
│   └── proxmox-balance-recommendations.service / .timer
│
├── nginx/                       # Nginx reverse proxy config
│   └── proxmox-balance          # port 80 → Gunicorn port 5000
│
├── docs/                        # Documentation (18 markdown files + images)
│   ├── README.md                # Documentation index
│   ├── API.md                   # REST API reference (48+ endpoints)
│   ├── SCORING_ALGORITHM.md     # Penalty scoring details
│   ├── AUTOMATION.md            # Auto-migration scheduling
│   ├── AI_FEATURES.md           # AI provider configuration
│   ├── CONFIGURATION.md         # All config.json options
│   ├── NOTIFICATIONS.md         # Notification provider setup
│   ├── FEATURES.md              # Feature overview and capabilities
│   ├── INSTALL.md               # Installation guide
│   ├── USAGE.md                 # User guide for workflows and UI
│   ├── TROUBLESHOOTING.md       # Common issues and solutions
│   ├── CONTRIBUTING.md          # Development guidelines
│   ├── DOCKER_DEV.md            # Docker development setup
│   └── UPDATE_FROM_OLD_VERSION.md  # Migration guide from old versions
│
├── install.sh                   # Main LXC container installer (~2,200 lines)
├── upgrade-to-v2.sh             # V2 upgrade path
├── update.sh                    # Update to latest version
├── post_update.sh               # Post-update hooks
├── build.sh                     # Frontend build (esbuild JSX → assets/js/app.js)
├── check-status.sh              # System health check
├── debug-services.sh            # Service debugging helper
├── create_api_token.sh          # Proxmox API token creation
├── test_api_token.sh            # API token validation
├── manage_settings.sh           # Settings management utility
├── hotfix-502.sh                # Emergency 502 error fix
└── test-page-load.js            # Puppeteer page load performance test
```

## Architecture

### Three-Tier Modular Design

1. **Data Collection** (`collector_api.py`) — Gathers metrics from the Proxmox API using proxmoxer. Runs on a systemd timer (default 120 min). Supports parallel collection with configurable worker count. Writes to `cluster_cache.json` (current snapshot) and persists time-series metrics to SQLite.

2. **Application Logic** (`app.py` + `proxbalance/`) — Flask REST API using a **Blueprint architecture**. The entry point (`app.py`, ~63 lines) creates the Flask app, initializes the SQLite database, registers error handlers, and registers 10 route blueprints. Core logic is in 19 domain modules:
   - `proxbalance/db.py` — SQLite connection management, schema DDL, one-time JSON migration
   - `proxbalance/migration_db.py` — Migration history, automation state, recommendation tracking
   - `proxbalance/metrics_store.py` — Node/guest metrics time-series (SQLite INSERTs)
   - `proxbalance/scoring.py` — Penalty-based node health scoring
   - `proxbalance/recommendations.py` — Migration recommendation engine
   - `proxbalance/recommendation_analysis.py` — Confidence scoring, structured reasons, conflict detection
   - `proxbalance/storage.py` — Storage compatibility checks and verification
   - `proxbalance/distribution.py` — Guest distribution balancing across nodes
   - `proxbalance/migrations.py` — Migration execution
   - `proxbalance/evacuation.py` — Node evacuation planning and sessions
   - `proxbalance/forecasting.py` — Trend projection, forecast recommendations, score history
   - `proxbalance/guest_profiles.py` — Guest behavior profiling and classification
   - `proxbalance/patterns.py` — Workload pattern detection
   - `proxbalance/outcomes.py` — Migration outcome tracking
   - `proxbalance/trend_analysis.py` — Node/guest trend analysis
   - `proxbalance/execution_planner.py` — Topological execution ordering
   - `proxbalance/reporting.py` — Summaries, capacity advisories
   - `proxbalance/config_manager.py` — Configuration, path constants, Proxmox client
   - `proxbalance/constants.py` — Shared path constants, file paths, SQLite pragmas
   - `proxbalance/cache.py` — In-memory TTL cache (60-second default)
   - `proxbalance/error_handlers.py` — Centralized error handling, `@api_route` decorator

3. **Frontend** (`src/`, `index.html`) — React SPA bundled by esbuild. Componentized architecture: `src/index.jsx` is the root composition layer (~560 lines) that wires 11 custom hooks together; page components delegate to 27 sub-components across `dashboard/`, `settings/`, and `automation/` directories. Uses a **glassmorphism design system** with centralized tokens in `src/utils/designTokens.js`. Built output goes to `assets/js/app.js`. React and ReactDOM are loaded as global scripts in `index.html` (not bundled).

### Background Services (systemd timers)

- **Data collector** — Configurable interval (default 120 min)
- **Recommendation generator** — Every 10 min, dynamic based on cluster size
- **Automated migration runner** — Every 5 min (configurable via config)

### Data Persistence

**SQLite database** (`proxbalance.db`, WAL mode):
- `node_metrics` / `guest_metrics` — Time-series metrics from each collection cycle
- `guest_profiles` — Guest behavior profiling samples
- `score_history` — Node health score snapshots
- `migration_outcomes` — Pre/post migration metric snapshots
- `migration_history` — Migration audit log
- `automation_state` — Key-value store for automigrate state
- `automation_run_history` — Automation run summaries
- `recommendation_tracking` — Per-guest recommendation state

**JSON files** (kept as JSON):
- `cluster_cache.json` — Latest collected Proxmox metrics snapshot (read by all routes)
- `config.json` — Application configuration (gitignored, contains secrets)
- `recommendations_cache.json` — Cached recommendation results
- `evacuation_sessions/*.json` — Active evacuation session state

On first startup, `init_db()` automatically migrates any legacy JSON data files into SQLite and renames them to `.json.migrated`.

## Development Setup

```bash
# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# For development tools (not in requirements.txt)
pip install pytest black flake8

# Run the Flask API locally
python3 app.py

# Build the frontend (requires Node.js and esbuild)
./build.sh
# Or manually: npx esbuild src/index.jsx --bundle --outfile=assets/js/app.js \
#   --format=iife --jsx=transform --target=es2020 --minify-syntax
```

**Production**: Gunicorn (2 workers, port 5000) behind Nginx (port 80).

### Frontend Build

The frontend uses **esbuild** (not Babel). The build script (`build.sh`) bundles `src/index.jsx` and all imports into `assets/js/app.js` as an IIFE. React/ReactDOM are external globals loaded via script tags in `index.html`.

- No `package.json` is committed (gitignored)
- Node.js is only needed for esbuild during build
- Built output `assets/js/app.js` is also gitignored
- Tailwind CSS config is in `tailwind.config.js`; custom directives in `src/input.css`

**Production path**: `/opt/proxmox-balance-manager`

**Deployment note**: Nginx serves static files from `/var/www/html/`, not `/opt/proxmox-balance-manager/`. After building, the `post_update.sh` script copies built assets to the nginx root. If deploying manually, copy `assets/js/app.js`, `assets/css/tailwind.css`, and `index.html` to `/var/www/html/`.

### Design System (Glassmorphism)

The UI uses a **glassmorphism/depth aesthetic** — backdrop-blur, frosted glass cards, layered depth — applied equally across all pages. All design tokens are centralized in `src/utils/designTokens.js`.

**Key tokens:**
- `GLASS_CARD` — Primary section cards: backdrop-blur-xl, semi-transparent bg, rounded-2xl, subtle shadow
- `GLASS_CARD_SUBTLE` — Secondary/less prominent cards
- `INNER_CARD` — Nested cards inside glass cards
- `BTN_PRIMARY` / `BTN_SECONDARY` / `BTN_DANGER` / `BTN_ICON` — Buttons with rounded-xl, colored shadow glow, press feedback, focus rings
- `MODAL_OVERLAY` / `MODAL_CONTAINER` — Glass modals with backdrop-blur and entrance animation
- `iconBadge(color)` — Gradient icon badges for section headers
- `ICON` — Standardized icon sizes: `{ section: 22, page: 26, action: 16, inline: 14 }`

**Rules:**
- **Never copy-paste Tailwind classes** for cards, buttons, or modals. Import from `designTokens.js`.
- Section headers use `iconBadge('color')` for the icon badge and `ICON.section` for icon size.
- Collapsible sections use a **single rotating ChevronDown** (not ChevronDown/ChevronUp ternary): `<ChevronDown className={\`transition-transform duration-200 \${!collapsed ? 'rotate-180' : ''}\`} />`
- Page backgrounds use gradient: `bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950`
- Modal entrance uses CSS `modal-enter` animation class (defined in `src/input.css`)
- Animations are **minimal**: chevron rotations and modal entrances only — no section collapse animations.

## Key Files to Know

### Backend
- **`app.py`** — Thin entry point (~63 lines). Creates Flask app, calls `init_db()`, registers error handlers, sets up shared state (cache, update manager), and registers blueprints. Do not add route handlers here.
- **`proxbalance/db.py`** — SQLite connection management (thread-local, WAL mode), schema DDL for 10 tables, one-time JSON→SQLite migration. All data modules depend on this.
- **`proxbalance/migration_db.py`** — Shared data layer for migration history, automation state (key-value), run history, and recommendation tracking. Used by `automigrate.py` and `proxbalance/migrations.py`.
- **`proxbalance/metrics_store.py`** — Time-series storage for node/guest metrics. Single-row SQLite INSERTs instead of full-file JSON rewrites. Supports tiered compression (raw → hourly → 6-hour aggregates).
- **`proxbalance/routes/`** — All 48+ API endpoints split across 10 Blueprint modules. Routes use `@api_route` decorator for centralized error handling. Find endpoints by their URL prefix (e.g., `/api/config` → `routes/config.py`).
- **`proxbalance/scoring.py`** — The penalty-based scoring algorithm. Central to cluster analysis.
- **`proxbalance/config_manager.py`** — Config loading/saving, Proxmox client creation. Re-exports path constants from `constants.py`. Imported everywhere.
- **`proxbalance/constants.py`** — Shared path constants (`BASE_PATH`, `CACHE_FILE`, `CONFIG_FILE`, `DB_FILE`, etc.) and tuning values.
- **`proxbalance/error_handlers.py`** — `api_success()`/`api_error()` response helpers, `@api_route` decorator, Flask-level 404/405/500 handlers.
- **`proxbalance/recommendations.py`** — Guest selection, recommendation generation. Delegates to `storage.py`, `distribution.py`, `recommendation_analysis.py`.
- **`proxbalance/evacuation.py`** — Evacuation planning with session management (~821 lines). Uses `storage.py` for storage verification.
- **`collector_api.py`** — Proxmox API integration. Authentication, data collection for nodes/guests/RRD metrics, parallel collection. Calls `init_db()` on startup.
- **`ai_provider.py`** — `AIProviderFactory` for creating provider instances. Each provider (OpenAI, Anthropic, Ollama) is a class with a common interface.
- **`automigrate.py`** — Automated migration orchestrator. Runs as a standalone service via systemd timer. Uses `migration_db` for all persistence.
- **`notifications.py`** — Multi-provider notifications (Pushover, Email, Telegram, Discord, Slack, Webhooks).

### Frontend
- **`src/index.jsx`** — Root component and hook composition layer (~560 lines). Wires 11 custom hooks together, page routing with prop passing. Chart rendering is delegated to `NodeChart.jsx`.
- **`src/utils/designTokens.js`** — Centralized design tokens for the glassmorphism UI. Exports `GLASS_CARD`, `GLASS_CARD_SUBTLE`, `INNER_CARD`, `BTN_PRIMARY`, `BTN_SECONDARY`, `BTN_DANGER`, `BTN_ICON`, `MODAL_OVERLAY`, `MODAL_CONTAINER`, `BADGE`, `TEXT_HEADING`, `TEXT_SUBHEADING`, `ICON` sizes, and `iconBadge()` helper. **All UI components import from here — never copy-paste Tailwind classes for cards/buttons/modals.**
- **`src/hooks/`** — 11 custom React hooks encapsulating all state management (data fetching, migrations, automation, auth, config, etc.). Hooks accept `deps` objects for cross-hook references.
- **`src/components/MobileTabBar.jsx`** — Reusable mobile bottom tab navigation with last-update timestamp. Used on all 3 pages.
- **`src/components/dashboard/NodeChart.jsx`** — Self-contained Chart.js component per node. Manages its own chart lifecycle (create/destroy).
- **`src/components/DashboardPage.jsx`** — Dashboard wrapper (~416 lines) delegating to 14 sub-components in `dashboard/`.
- **`src/components/AutomationPage.jsx`** — Automation wrapper (~223 lines) delegating to 8 sub-components in `automation/`.
- **`src/components/SettingsPage.jsx`** — Settings wrapper (~213 lines) delegating to 5 sub-components in `settings/`.
- **`src/api/client.js`** — Centralized API client for all backend calls.
- **`src/utils/constants.js`** — Shared frontend constants (`API_BASE`, default thresholds, refresh intervals).

### Configuration
- **`config.example.json`** — Reference for all configuration options (149 lines). The actual `config.json` is gitignored.

## Code Conventions

### Python (Backend)
- **Style**: PEP 8 (format with `black`, lint with `flake8`). No linting config files committed; conventions enforced through code review.
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes, `UPPER_SNAKE_CASE` for constants
- **Architecture**: Domain logic in `proxbalance/*.py`, routes in `proxbalance/routes/*.py` as Flask Blueprints. Shared state via `current_app.config`.
- **Patterns**: Class-based abstractions for providers (AI, notifications). Route handlers use `@api_route` decorator for automatic error handling. Inner try-except blocks for specific error cases (400, 404). Graceful degradation when services are unavailable.
- **Database**: All SQLite access goes through `proxbalance/db.py` for connections. Data modules (`metrics_store`, `guest_profiles`, `forecasting`, `outcomes`, `migration_db`) each own their tables. Thread-local connections with WAL mode.
- **Imports**: Standard library first, then third-party, then local. Domain modules export through `proxbalance/__init__.py`. Route blueprints are registered in `proxbalance/routes/__init__.py`. Lazy imports inside `register_blueprints()` to avoid circular dependencies.
- **Docstrings**: Module-level triple-quoted docstrings. Function docstrings with Args/Returns/Raises sections.

### JavaScript/JSX (Frontend)
- **Style**: 2-space indentation, semicolons
- **Naming**: `camelCase` for functions/variables, `PascalCase` for React components. Event handlers follow `handleXxx` pattern. Boolean state uses `is`/`show` prefix.
- **Framework**: React 17+ with hooks (`useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`), Tailwind CSS utility classes
- **Build**: esbuild bundles `src/index.jsx` → `assets/js/app.js` (IIFE format, ES2020 target)
- **API pattern**: Every API function is `async`, returns data directly on success or `{ error: true, message: "..." }` on failure (no exceptions thrown). Errors logged to console.
- **Props**: Destructured with inline comments grouping related props by category.

### Bash (Shell Scripts)
- **Style**: Google Shell Style Guide, 2-space indentation
- **Variables**: Always quoted (`"$variable"`)
- **Safety**: `set -euo pipefail` at script start. Use `mktemp` for temporary files (not predictable `/tmp` paths). Use `printf -v` for safe variable assignment (not `eval`).
- **Visual**: Color-coded output with unicode markers (checkmarks, crosses, info diamonds)
- **Section separators**: Double-line box-drawing characters for major sections

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <subject>
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Common scopes: `api`, `ui`, `collector`, `affinity`, `update`, `notifications`, `dashboard`, `automation`, `tags`, `mobile`, `db`

Examples from this repo:
```
feat(api): add webhook support for migration events
fix(collector): handle missing SSH keys gracefully
feat(affinity): add VM affinity rules to keep groups together on same host
refactor(update): refactor update system into dedicated update_manager module
feat(db): migrate JSON storage to SQLite for 99.99% write reduction
fix(notifications): add per-migration action alerts
feat(ui): add icons to buttons and create icon reference panel
```

## Configuration

The main configuration file is `config.json` (gitignored). Use `config.example.json` as reference. Key sections:

- **Proxmox connection**: host, port, API token auth (token ID + secret)
- **Collection optimization**: cluster size preset, parallel workers, RRD timeframes
- **Recommendation thresholds**: CPU/memory/IOWait thresholds triggering recommendations
- **Automated migrations**: enabled/disabled, dry-run mode, migration windows, blackout windows, safety checks, cooldown periods, affinity rules
- **Distribution balancing**: guest count threshold, CPU/memory limits for redistribution
- **AI config**: provider selection (OpenAI/Anthropic/Ollama), API keys, model selection
- **Notifications**: per-provider config for Pushover, Email, Telegram, Discord, Slack, Webhooks
- **Penalty scoring**: 30+ configurable penalty weights (all adjustable via Settings UI)

## Scoring Algorithm

ProxBalance uses a **penalty-based scoring system** rather than hard rules:

- Penalties applied for undesirable conditions (high CPU, memory pressure, IOWait, rising trends, spikes)
- Three time-period weights: Current (50%), 24h average (30%), 7d average (20%)
- Suitability ratings normalized to 0-100% (lower is better/healthier)
- All penalty weights configurable through the Settings UI via `DEFAULT_PENALTY_CONFIG`
- Penalty categories: current load, sustained load (7-day), IOWait, trends, spikes, predicted post-migration
- Implementation: `proxbalance/scoring.py`
- Detailed documentation: `docs/SCORING_ALGORITHM.md`

## AI Provider Architecture

The AI system uses an **abstract base class pattern** (`ai_provider.py`):

- `AIProvider` (ABC) defines the interface: `get_recommendations()` and `enhance_recommendations()`
- Shared utility methods: `_summarize_metrics()` (reduces token count), `_build_prompt()` (constructs analysis prompts)
- Concrete implementations: `OpenAIProvider`, `AnthropicProvider`, `OllamaProvider`
- `AIProviderFactory` creates the appropriate provider based on config
- Token optimization: metrics are summarized and stopped/template guests are filtered out before sending to AI

## API Endpoints

The Flask API exposes 48+ REST endpoints under `/api/`, organized into 10 Blueprint modules:

| Blueprint | File | Key Endpoints |
|-----------|------|---------------|
| analysis | `routes/analysis.py` | `/api/cluster-analysis`, `/api/cluster-summary`, `/api/nodes-only`, `/api/guests-only` |
| recommendations | `routes/recommendations.py` | `/api/recommendations`, `/api/recommendation-thresholds`, `/api/guest-options`, `/api/feedback` |
| migrations | `routes/migrations.py` | `/api/migrate` |
| evacuation | `routes/evacuation.py` | `/api/nodes/evacuate`, `/api/evacuation-plan` |
| config | `routes/config.py` | `/api/config` |
| penalty | `routes/penalty.py` | `/api/penalty-config` |
| system | `routes/system.py` | `/api/update/*`, `/api/health`, `/api/version`, `/api/status` |
| guests | `routes/guests.py` | `/api/guests/*` |
| automation | `routes/automation.py` | `/api/automigrate/*` |
| notifications | `routes/notifications.py` | `/api/notifications/test` |

## Testing

Limited formal testing infrastructure:

- **`test-page-load.js`** — Puppeteer-based page load performance test (measures TTFB, render time, grades performance)
- **`test_api_token.sh`** — API token validation script
- **Manual testing** — Start services and verify via logs: `journalctl -u proxmox-balance -n 50`
- No pytest/jest test suites currently in the repository

## Deployment

ProxBalance deploys as an **unprivileged LXC container** within Proxmox VE:

1. `install.sh` creates an LXC container (Debian 12) on the Proxmox host
2. Installs Python, Node.js, Nginx, and all dependencies
3. Configures systemd services and timers
4. Creates Proxmox API tokens automatically
5. Services: Nginx (port 80, with security headers) → Gunicorn (port 5000) + background systemd timers
6. Systemd services run with hardening: `NoNewPrivileges=true`, `ProtectSystem=strict`, `PrivateTmp=true`

**Upgrade path**: `upgrade-to-v2.sh` handles migration from v1 to the modular v2 architecture.

## Important Notes for AI Assistants

- **`config.json` contains secrets** — Never commit it. Use `config.example.json` for reference. The GET `/api/config` endpoint redacts secret fields (token secrets, passwords, API keys) via `_redact_config()` in `routes/config.py`. Secrets are only accepted on POST, never returned on GET.
- **Modular architecture** — `app.py` is a thin ~63-line entry point. Route handlers are in `proxbalance/routes/` (use `@api_route` decorator). Core logic is in `proxbalance/` domain modules (19 modules). Do not add large blocks of code back into `app.py`.
- **SQLite storage** — All time-series data, metrics, profiles, outcomes, and migration history live in `proxbalance.db` (WAL mode). Only `cluster_cache.json`, `config.json`, `recommendations_cache.json`, and evacuation sessions remain as JSON. The database is initialized via `init_db()` in `app.py` and `collector_api.py` on startup.
- **`src/app.jsx` was deleted** — The frontend is now fully componentized. `src/index.jsx` (~560 lines) is the root composition layer. UI is split into 27 sub-components across `dashboard/`, `settings/`, and `automation/` directories. State lives in 11 custom hooks in `src/hooks/`.
- **Design tokens are mandatory** — All card, button, modal, and badge classes must come from `src/utils/designTokens.js`. Never copy-paste raw Tailwind class strings for these elements. See the "Design System (Glassmorphism)" section above.
- **Chart rendering is per-component** — `NodeChart.jsx` manages its own Chart.js lifecycle. The root `index.jsx` no longer manages chart instances.
- **Mobile tab bar** — `MobileTabBar.jsx` is a shared component used on all 3 pages. Do not duplicate mobile navigation markup.
- **Nginx serves from `/var/www/html/`** — After building, assets must be copied there (handled by `post_update.sh`). The backend runs on port 5000 and is proxied by nginx.
- **Hook dependency pattern** — Hooks accept a `deps` object for cross-hook references (e.g., `useMigrations(API_BASE, { setData, setError })`). The root component wires hooks together and creates wrapper functions for cross-hook calls.
- **Frontend build** — Uses esbuild, not Babel. Run `./build.sh` to rebuild. Output goes to `assets/js/app.js`.
- **No package.json committed** — It's gitignored. Use `npx esbuild` or install locally.
- **Systemd timers** — Collection, recommendations, and auto-migration are separate systemd services, not in-process cron jobs.
- **Blueprint routing** — All routes use full paths (e.g., `/api/config`), not url_prefix. Find a route by searching for `@*_bp.route('/api/...')` in `proxbalance/routes/`.
- **Shared state** — Blueprints access shared objects (cache_manager, update_manager) via `current_app.config['key']`.
- **Error handling pattern** — Both backend and frontend return `{ error: true, message: "..." }` objects rather than throwing exceptions. Follow this pattern. The root React component is wrapped in an `ErrorBoundary` that prevents white-screen crashes.
- **Python dependencies are pinned** — `requirements.txt` uses exact versions (`==`). Update versions explicitly when upgrading.
- **Branch workflow** — Development happens on `DEV`, merged to `main` for releases.
- **No CI/CD** — No GitHub Actions or other CI configuration. No linting config files committed. Use `black` and `flake8` manually.
- **Line ending enforcement** — `.gitattributes` enforces LF line endings for all text files.
- **Backward-compatible re-exports** — When modules are extracted, original modules re-export the moved functions to avoid breaking existing imports (e.g., `config_manager.py` re-exports from `constants.py`).
- **All domain modules are type-hinted** — All core domain modules have 100% function signature type hints using `typing` module.

## Custom Skills (Slash Commands)

Skills are in `.claude/skills/` and available via `/command`:

| Command | Description |
|---------|-------------|
| `/build` | Build the frontend (esbuild + Tailwind) |
| `/deploy [ctid]` | Deploy to the production LXC container via update.sh |
| `/check-cluster` | Check cluster health, automation, and recommendations via MCP |
| `/review [file\|branch]` | Code review for security, bugs, and style issues |
| `/test` | Run Python syntax checks, shell validation, pytest, and import verification |
