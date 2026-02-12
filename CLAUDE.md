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
| Data Storage | JSON files (no database) |
| Proxmox API | proxmoxer library |
| AI Providers | OpenAI, Anthropic Claude, Ollama |
| Notifications | Pushover, Email/SMTP, Telegram, Discord, Slack, Webhooks |

## Repository Structure

```
ProxBalance/
├── app.py                       # Flask entry point (60 lines, modular Blueprint architecture)
├── collector_api.py             # Proxmox data collection service (960 lines)
├── ai_provider.py               # AI provider abstraction (609 lines, OpenAI/Anthropic/Ollama)
├── notifications.py             # Multi-provider notification system (804 lines)
├── automigrate.py               # Automated migration orchestrator (1,462 lines)
├── update_manager.py            # Update checking and branch management (1,062 lines)
├── update_timer.py              # Update timer helper (60 lines)
├── generate_recommendations.py  # Background recommendation generation (264 lines)
├── set_cluster_preset.py        # Cluster size preset configuration (108 lines)
│
├── proxbalance/                 # Core backend package (modular architecture)
│   ├── __init__.py              # Package exports (48 lines)
│   ├── config_manager.py        # Config loading, Proxmox client, path constants (328 lines)
│   ├── cache.py                 # In-memory cache with 60s TTL (53 lines)
│   ├── scoring.py               # Penalty-based scoring algorithm (1,147 lines)
│   ├── recommendations.py       # AI-powered recommendation engine (2,165 lines)
│   ├── migrations.py            # Migration execution logic (860 lines)
│   ├── evacuation.py            # Node evacuation planning (975 lines)
├── app.py                       # Flask entry point (~63 lines, modular Blueprint architecture)
├── collector_api.py             # Proxmox data collection service (834 lines)
├── ai_provider.py               # AI provider abstraction (OpenAI/Anthropic/Ollama)
├── notifications.py             # Multi-provider notification system
├── automigrate.py               # Automated migration orchestrator (1,426 lines)
├── update_manager.py            # Update checking and branch management
├── update_timer.py              # Update timer helper
├── generate_recommendations.py  # Background recommendation generation
├── set_cluster_preset.py        # Cluster size preset configuration
│
├── proxbalance/                 # Core backend package (16 domain modules)
│   ├── __init__.py              # Package exports
│   ├── constants.py             # Shared path constants, file paths, tuning values
│   ├── config_manager.py        # Config loading/saving, Proxmox client (type-hinted)
│   ├── cache.py                 # In-memory cache with 60s TTL
│   ├── error_handlers.py        # Centralized Flask error handling, @api_route decorator
│   ├── scoring.py               # Penalty-based scoring algorithm (~900 lines)
│   ├── recommendations.py       # Recommendation engine (~838 lines)
│   ├── recommendation_analysis.py # Confidence scoring, structured reasons, conflict detection
│   ├── storage.py               # Storage compatibility and verification
│   ├── distribution.py          # Guest distribution balancing across nodes
│   ├── migrations.py            # Migration execution logic (~643 lines)
│   ├── evacuation.py            # Node evacuation planning and sessions (~821 lines)
│   ├── forecasting.py           # Trend projection, forecast recommendations
│   ├── patterns.py              # Workload pattern detection
│   ├── outcomes.py              # Migration outcome tracking
│   ├── execution_planner.py     # Topological execution ordering
│   ├── reporting.py             # Summaries, capacity advisories
│   │
│   └── routes/                  # Flask Blueprints (all API endpoints, use @api_route)
│       ├── __init__.py          # register_blueprints() — registers all 10 blueprints
│       ├── analysis.py          # /api/cluster-analysis, /api/cluster-summary, etc. (181 lines)
│       ├── automation.py        # /api/automigrate/* endpoints (835 lines)
│       ├── config.py            # /api/config endpoints (586 lines)
│       ├── evacuation.py        # /api/nodes/evacuate endpoints (511 lines)
│       ├── guests.py            # /api/guests/* endpoints (674 lines)
│       ├── migrations.py        # /api/migrate endpoint (273 lines)
│       ├── notifications.py     # /api/notifications/test endpoint (57 lines)
│       ├── penalty.py           # /api/penalty-config endpoint (221 lines)
│       ├── recommendations.py   # /api/recommendations endpoints (1,435 lines)
│       └── system.py            # /api/update/*, /api/health, etc. (871 lines)
│
├── src/                         # Frontend source (React JSX)
│   ├── index.jsx                # Entry point for esbuild bundling (2,547 lines)
│   ├── app.jsx                  # Main React SPA component (~12,300 lines)
│   ├── input.css                # Tailwind CSS directives and custom animations
│   ├── components/
│   │   ├── DashboardPage.jsx    # Dashboard UI with charts (7,005 lines)
│   │   ├── AutomationPage.jsx   # Automation configuration (2,634 lines)
│   │   ├── SettingsPage.jsx     # Settings panel (2,240 lines)
│   │   ├── IconLegend.jsx       # Icon reference panel (173 lines)
│   │   ├── Icons.jsx            # SVG icon components (78 lines)
│   │   └── Skeletons.jsx        # Loading skeleton components (31 lines)
│   ├── api/
│   │   └── client.js            # API client with error handling (851 lines)
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
│   ├── index.jsx                # Root component + hook composition (~658 lines)
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
│   │   ├── dashboard/           # 13 dashboard sub-components
│   │   ├── AutomationPage.jsx   # Automation wrapper (~223 lines)
│   │   ├── automation/          # 6 automation sub-components
│   │   ├── SettingsPage.jsx     # Settings wrapper (~213 lines)
│   │   ├── settings/            # 5 settings sub-components
│   │   ├── Icons.jsx            # SVG icon components
│   │   └── Skeletons.jsx        # Loading skeleton components
│   ├── api/
│   │   └── client.js            # API client with error handling
│   └── utils/
│       ├── constants.js         # Shared frontend constants (API_BASE, thresholds)
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
│   ├── MODULAR_REFACTORING_PLAN.md     # Architecture refactoring plan
│   ├── MOBILE_REDESIGN_PLAN.md         # Mobile UI redesign planning
│   ├── RECOMMENDATION_IMPROVEMENTS_PLAN.md  # Recommendation engine improvements
│   ├── TESTING_UPDATE_COMPATIBILITY.md  # Update testing procedures
│   └── UPDATE_FROM_OLD_VERSION.md       # Migration guide from old versions
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

1. **Data Collection** (`collector_api.py`) — Gathers metrics from the Proxmox API using proxmoxer. Runs on a systemd timer (default 120 min). Supports parallel collection with configurable worker count. Writes to `cluster_cache.json`.

2. **Application Logic** (`app.py` + `proxbalance/`) — Flask REST API using a **Blueprint architecture**. The entry point (`app.py`, 60 lines) creates the Flask app and registers 10 route blueprints. Core logic is in domain modules:
   - `proxbalance/scoring.py` — Penalty-based node health scoring (1,147 lines)
   - `proxbalance/recommendations.py` — AI-powered migration recommendations (2,165 lines)
   - `proxbalance/migrations.py` — Migration execution and tracking (860 lines)
   - `proxbalance/evacuation.py` — Node evacuation planning and sessions (975 lines)
   - `proxbalance/config_manager.py` — Configuration, path constants, Proxmox client (328 lines)
2. **Application Logic** (`app.py` + `proxbalance/`) — Flask REST API using a **Blueprint architecture**. The entry point (`app.py`, ~63 lines) creates the Flask app, registers error handlers, and registers 10 route blueprints. Core logic is in 16 domain modules:
   - `proxbalance/scoring.py` — Penalty-based node health scoring
   - `proxbalance/recommendations.py` — Migration recommendation engine
   - `proxbalance/recommendation_analysis.py` — Confidence scoring, structured reasons, conflict detection
   - `proxbalance/storage.py` — Storage compatibility checks and verification
   - `proxbalance/distribution.py` — Guest distribution balancing across nodes
   - `proxbalance/migrations.py` — Migration execution
   - `proxbalance/evacuation.py` — Node evacuation planning and sessions
   - `proxbalance/forecasting.py` — Trend projection, forecast recommendations
   - `proxbalance/patterns.py` — Workload pattern detection
   - `proxbalance/outcomes.py` — Migration outcome tracking
   - `proxbalance/execution_planner.py` — Topological execution ordering
   - `proxbalance/reporting.py` — Summaries, capacity advisories
   - `proxbalance/config_manager.py` — Configuration, path constants, Proxmox client
   - `proxbalance/constants.py` — Shared path constants, file paths
   - `proxbalance/cache.py` — In-memory TTL cache (60-second default)
   - `proxbalance/error_handlers.py` — Centralized error handling, `@api_route` decorator

3. **Frontend** (`src/`, `index.html`) — React SPA bundled by esbuild. Componentized architecture: `src/index.jsx` is the root composition layer (~658 lines) that wires 11 custom hooks together; page components delegate to 24 sub-components across `dashboard/`, `settings/`, and `automation/` directories. Built output goes to `assets/js/app.js`. React and ReactDOM are loaded as global scripts in `index.html` (not bundled).

### Background Services (systemd timers)

- **Data collector** — Configurable interval (default 120 min)
- **Recommendation generator** — Every 10 min, dynamic based on cluster size
- **Automated migration runner** — Every 5 min (configurable via config)

### Data Persistence

JSON files on disk — no database:
- `cluster_cache.json` — Collected Proxmox metrics
- `config.json` — Application configuration (gitignored, contains secrets)
- `migration_history.json` — Migration audit log

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

## Key Files to Know

### Backend
- **`app.py`** — Thin entry point (60 lines). Creates Flask app, sets up shared state (cache, update manager), and registers blueprints. Do not add route handlers here.
- **`proxbalance/routes/`** — All 48+ API endpoints split across 10 Blueprint modules. Find endpoints by their URL prefix (e.g., `/api/config` → `routes/config.py`).
- **`proxbalance/scoring.py`** — The penalty-based scoring algorithm (1,147 lines). Central to cluster analysis. Contains 30+ configurable penalty weights in `DEFAULT_PENALTY_CONFIG`.
- **`proxbalance/recommendations.py`** — Guest selection, storage compatibility checks, recommendation generation logic (2,165 lines). The largest domain module.
- **`proxbalance/config_manager.py`** — Path constants (`BASE_PATH`, `CACHE_FILE`, `CONFIG_FILE`), config loading/saving, Proxmox client creation. Imported everywhere.
- **`proxbalance/evacuation.py`** — Evacuation planning with session management (975 lines).
- **`proxbalance/migrations.py`** — Migration execution, rollback info capture, outcome recording (860 lines).
- **`collector_api.py`** — Proxmox API integration (960 lines). Authentication, data collection for nodes/guests/RRD metrics, parallel collection.
- **`ai_provider.py`** — `AIProviderFactory` for creating provider instances (609 lines). Uses ABC pattern. Each provider (OpenAI, Anthropic, Ollama) is a class with a common interface. Includes shared prompt building and metric summarization.
- **`automigrate.py`** — Automated migration orchestrator (1,462 lines). Runs as a standalone service via systemd timer.
- **`notifications.py`** — Multi-provider notifications (804 lines): Pushover, Email, Telegram, Discord, Slack, Webhooks.
- **`update_manager.py`** — Update checking, branch management, version comparison (1,062 lines).

### Frontend
- **`src/app.jsx`** — The main React SPA (~12,300 lines). Contains most UI components, state management, and routing logic.
- **`src/components/DashboardPage.jsx`** — Dashboard with cluster charts and metrics (7,005 lines).
- **`src/components/AutomationPage.jsx`** — Automation configuration UI (2,634 lines).
- **`src/components/SettingsPage.jsx`** — Settings and configuration panel (2,240 lines).
- **`src/components/IconLegend.jsx`** — Icon reference panel (173 lines).
- **`src/api/client.js`** — Centralized API client for all backend calls (851 lines). Async functions returning data or `{ error: true, message: "..." }` objects.
- **`src/index.jsx`** — esbuild entry point that bootstraps the React app (2,547 lines).
- **`app.py`** — Thin entry point (~63 lines). Creates Flask app, registers error handlers, sets up shared state (cache, update manager), and registers blueprints. Do not add route handlers here.
- **`proxbalance/routes/`** — All 48+ API endpoints split across 10 Blueprint modules. Routes use `@api_route` decorator for centralized error handling. Find endpoints by their URL prefix (e.g., `/api/config` → `routes/config.py`).
- **`proxbalance/scoring.py`** — The penalty-based scoring algorithm. Central to cluster analysis.
- **`proxbalance/config_manager.py`** — Config loading/saving, Proxmox client creation. Re-exports path constants from `constants.py`. Imported everywhere.
- **`proxbalance/constants.py`** — Shared path constants (`BASE_PATH`, `CACHE_FILE`, `CONFIG_FILE`, etc.) and tuning values.
- **`proxbalance/error_handlers.py`** — `api_success()`/`api_error()` response helpers, `@api_route` decorator, Flask-level 404/405/500 handlers.
- **`proxbalance/recommendations.py`** — Guest selection, recommendation generation. Delegates to `storage.py`, `distribution.py`, `recommendation_analysis.py`.
- **`proxbalance/evacuation.py`** — Evacuation planning with session management (~821 lines). Uses `storage.py` for storage verification.
- **`collector_api.py`** — Proxmox API integration. Authentication, data collection for nodes/guests/RRD metrics, parallel collection.
- **`ai_provider.py`** — `AIProviderFactory` for creating provider instances. Each provider (OpenAI, Anthropic, Ollama) is a class with a common interface.
- **`automigrate.py`** — Automated migration orchestrator. Runs as a standalone service via systemd timer.
- **`notifications.py`** — Multi-provider notifications (Pushover, Email, Telegram, Discord, Slack, Webhooks).

### Frontend
- **`src/index.jsx`** — Root component and hook composition layer (~658 lines). Wires 11 custom hooks together, handles chart rendering, page routing with prop passing.
- **`src/hooks/`** — 11 custom React hooks encapsulating all state management (data fetching, migrations, automation, auth, config, etc.). Hooks accept `deps` objects for cross-hook references.
- **`src/components/DashboardPage.jsx`** — Dashboard wrapper (~416 lines) delegating to 13 sub-components in `dashboard/`.
- **`src/components/AutomationPage.jsx`** — Automation wrapper (~223 lines) delegating to 6 sub-components in `automation/`.
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
- **Patterns**:
  - Class-based abstractions with ABC for providers (AI, notifications)
  - Try-except blocks around all Proxmox API calls and file I/O
  - Graceful degradation: return `{"error": True, "message": "..."}` dicts instead of raising exceptions
  - Type hints on function parameters and return values
  - Section separators with dashed comment headers for long files
- **Imports**: Standard library first, then third-party, then local. Domain modules export through `proxbalance/__init__.py`. Route blueprints are registered in `proxbalance/routes/__init__.py`. Lazy imports inside `register_blueprints()` to avoid circular dependencies.
- **Docstrings**: Module-level triple-quoted docstrings. Function docstrings with Args/Returns/Raises sections.
- **Patterns**: Class-based abstractions for providers (AI, notifications). Route handlers use `@api_route` decorator for automatic error handling. Inner try-except blocks for specific error cases (400, 404). Graceful degradation when services are unavailable.
- **Imports**: Domain modules export through `proxbalance/__init__.py`. Route blueprints are registered in `proxbalance/routes/__init__.py`.

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
- **Safety**: `set -euo pipefail` at script start
- **Visual**: Color-coded output with unicode markers (checkmarks, crosses, info diamonds)
- **Section separators**: Double-line box-drawing characters for major sections

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <subject>
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Common scopes: `api`, `ui`, `collector`, `affinity`, `update`, `notifications`, `dashboard`, `automation`, `tags`, `mobile`

Examples from this repo:
```
feat(api): add webhook support for migration events
fix(collector): handle missing SSH keys gracefully
feat(affinity): add VM affinity rules to keep groups together on same host
refactor(update): refactor update system into dedicated update_manager module
fix(notifications): add per-migration action alerts
feat(ui): add icons to buttons and create icon reference panel
feat(notifications): add success/failure filtering and new event types
fix(dashboard): prevent bottom nav from overlapping cluster map modals on mobile
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
- Implementation: `proxbalance/scoring.py` (1,147 lines)
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
5. Services: Nginx (port 80) → Gunicorn (port 5000) + background systemd timers

**Upgrade path**: `upgrade-to-v2.sh` handles migration from v1 to the modular v2 architecture.

## Important Notes for AI Assistants

- **`config.json` contains secrets** — Never commit it. Use `config.example.json` for reference.
- **Modular architecture** — `app.py` is a thin 60-line entry point. Route handlers are in `proxbalance/routes/`. Core logic is in `proxbalance/` domain modules. Do not add large blocks of code back into `app.py`.
- **`src/app.jsx` is still very large** (~12,300 lines) — Be precise when making edits. Search for specific component names or use line ranges.
- **`proxbalance/recommendations.py`** is the largest domain module (2,165 lines) — contains guest selection, storage compatibility, and recommendation generation logic. Be careful with edits.
- **Modular architecture** — `app.py` is a thin ~63-line entry point. Route handlers are in `proxbalance/routes/` (use `@api_route` decorator). Core logic is in `proxbalance/` domain modules (16 modules). Do not add large blocks of code back into `app.py`.
- **`src/app.jsx` was deleted** — The frontend is now fully componentized. `src/index.jsx` (~658 lines) is the root composition layer. UI is split into 24 sub-components across `dashboard/`, `settings/`, and `automation/` directories. State lives in 11 custom hooks in `src/hooks/`.
- **Hook dependency pattern** — Hooks accept a `deps` object for cross-hook references (e.g., `useMigrations(API_BASE, { setData, setError })`). The root component wires hooks together and creates wrapper functions for cross-hook calls.
- **Frontend build** — Uses esbuild, not Babel. Run `./build.sh` to rebuild. Output goes to `assets/js/app.js`.
- **No package.json committed** — It's gitignored. Use `npx esbuild` or install locally.
- **JSON-file storage** — No database. All state lives in JSON files (`cluster_cache.json`, `config.json`, `migration_history.json`).
- **Systemd timers** — Collection, recommendations, and auto-migration are separate systemd services, not in-process cron jobs.
- **Blueprint routing** — All routes use full paths (e.g., `/api/config`), not url_prefix. Find a route by searching for `@*_bp.route('/api/...')` in `proxbalance/routes/`.
- **Shared state** — Blueprints access shared objects (cache_manager, update_manager) via `current_app.config['key']`.
- **Error handling pattern** — Both backend and frontend return `{ error: true, message: "..." }` objects rather than throwing exceptions. Follow this pattern.
- **Branch workflow** — Development happens on `DEV`, merged to `master` for releases.
- **No CI/CD** — No GitHub Actions or other CI configuration. No linting config files committed. Use `black` and `flake8` manually.
- **Line ending enforcement** — `.gitattributes` enforces LF line endings for all text files.
- **Backward-compatible re-exports** — When modules are extracted, original modules re-export the moved functions to avoid breaking existing imports (e.g., `config_manager.py` re-exports from `constants.py`).
- **All domain modules are type-hinted** — All 10 core domain modules have 100% function signature type hints using `typing` module.
- **Branch workflow** — Development happens on `dev`, merged to `main` for releases.
