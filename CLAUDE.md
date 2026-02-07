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
├── collector_api.py             # Proxmox data collection service (834 lines)
├── ai_provider.py               # AI provider abstraction (OpenAI/Anthropic/Ollama)
├── notifications.py             # Multi-provider notification system
├── automigrate.py               # Automated migration orchestrator (1,426 lines)
├── update_manager.py            # Update checking and branch management
├── update_timer.py              # Update timer helper
├── generate_recommendations.py  # Background recommendation generation
├── set_cluster_preset.py        # Cluster size preset configuration
│
├── proxbalance/                 # Core backend package (modular architecture)
│   ├── __init__.py              # Package exports
│   ├── config_manager.py        # Config loading, Proxmox client, path constants
│   ├── cache.py                 # In-memory cache with 60s TTL
│   ├── scoring.py               # Penalty-based scoring algorithm (632 lines)
│   ├── migrations.py            # Migration execution logic
│   ├── evacuation.py            # Node evacuation planning (932 lines)
│   ├── recommendations.py       # AI-powered recommendation engine (935 lines)
│   │
│   └── routes/                  # Flask Blueprints (all API endpoints)
│       ├── __init__.py          # register_blueprints() — registers all 10 blueprints
│       ├── analysis.py          # /api/cluster-analysis, /api/cluster-summary, etc.
│       ├── automation.py        # /api/automigrate/* endpoints (826 lines)
│       ├── config.py            # /api/config endpoints (586 lines)
│       ├── evacuation.py        # /api/nodes/evacuate endpoints (511 lines)
│       ├── guests.py            # /api/guests/* endpoints (674 lines)
│       ├── migrations.py        # /api/migrate endpoint
│       ├── notifications.py     # /api/notifications/test endpoint
│       ├── penalty.py           # /api/penalty-config endpoint
│       ├── recommendations.py   # /api/recommendations endpoints (327 lines)
│       └── system.py            # /api/update/*, /api/health, etc. (861 lines)
│
├── src/                         # Frontend source (React JSX)
│   ├── index.jsx                # Entry point for esbuild bundling (2,422 lines)
│   ├── app.jsx                  # Main React SPA component (~11,900 lines)
│   ├── components/
│   │   ├── DashboardPage.jsx    # Dashboard UI with charts (5,333 lines)
│   │   ├── AutomationPage.jsx   # Automation configuration (2,588 lines)
│   │   ├── SettingsPage.jsx     # Settings panel (1,857 lines)
│   │   ├── Icons.jsx            # SVG icon components
│   │   └── Skeletons.jsx        # Loading skeleton components
│   ├── api/
│   │   └── client.js            # API client with error handling (504 lines)
│   └── utils/
│       ├── formatters.js        # Utility formatting functions
│       └── useIsMobile.js       # Mobile responsiveness hook
│
├── index.html                   # SPA entry point (loads React, ReactDOM, then app.js)
├── assets/                      # SVG logos, favicon, and built JS
│   ├── js/app.js                # Bundled frontend output (built by esbuild)
│   ├── logo_v2.svg, favicon.svg, etc.
│
├── config.example.json          # Configuration template (140 lines)
├── requirements.txt             # Python dependencies (7 packages)
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
├── docs/                        # Documentation (17 markdown files + images)
│   ├── README.md                # Documentation index
│   ├── API.md                   # REST API reference (48+ endpoints)
│   ├── SCORING_ALGORITHM.md     # Penalty scoring details
│   ├── AUTOMATION.md            # Auto-migration scheduling
│   ├── AI_FEATURES.md           # AI provider configuration
│   ├── CONFIGURATION.md         # All config.json options
│   ├── NOTIFICATIONS.md         # Notification provider setup
│   ├── INSTALL.md, USAGE.md, FEATURES.md, TROUBLESHOOTING.md
│   ├── DOCKER_DEV.md, CONTRIBUTING.md
│   ├── MODULAR_REFACTORING_PLAN.md
│   ├── MOBILE_REDESIGN_PLAN.md  # Mobile UI redesign planning
│   ├── TESTING_UPDATE_COMPATIBILITY.md
│   └── UPDATE_FROM_OLD_VERSION.md
│
├── install.sh                   # Main LXC container installer (2,171 lines)
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

1. **Data Collection** (`collector_api.py`) — Gathers metrics from the Proxmox API using proxmoxer. Runs on a systemd timer (default 60 min). Supports parallel collection with configurable worker count. Writes to `cluster_cache.json`.

2. **Application Logic** (`app.py` + `proxbalance/`) — Flask REST API using a **Blueprint architecture**. The entry point (`app.py`, 60 lines) creates the Flask app and registers 10 route blueprints. Core logic is in domain modules:
   - `proxbalance/scoring.py` — Penalty-based node health scoring
   - `proxbalance/recommendations.py` — AI-powered migration recommendations
   - `proxbalance/migrations.py` — Migration execution
   - `proxbalance/evacuation.py` — Node evacuation planning and sessions
   - `proxbalance/config_manager.py` — Configuration, path constants, Proxmox client
   - `proxbalance/cache.py` — In-memory TTL cache (60-second default)

3. **Frontend** (`src/`, `index.html`) — React SPA bundled by esbuild. Source lives in `src/` with component, API client, and utility modules. Built output goes to `assets/js/app.js`. React and ReactDOM are loaded as global scripts in `index.html` (not bundled).

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

**Production path**: `/opt/proxmox-balance-manager`

## Key Files to Know

### Backend
- **`app.py`** — Thin entry point (60 lines). Creates Flask app, sets up shared state (cache, update manager), and registers blueprints. Do not add route handlers here.
- **`proxbalance/routes/`** — All 48+ API endpoints split across 10 Blueprint modules. Find endpoints by their URL prefix (e.g., `/api/config` → `routes/config.py`).
- **`proxbalance/scoring.py`** — The penalty-based scoring algorithm. Central to cluster analysis.
- **`proxbalance/config_manager.py`** — Path constants (`BASE_PATH`, `CACHE_FILE`, `CONFIG_FILE`), config loading/saving, Proxmox client creation. Imported everywhere.
- **`proxbalance/recommendations.py`** — Guest selection, storage compatibility checks, recommendation generation logic.
- **`proxbalance/evacuation.py`** — Evacuation planning with session management. Largest domain module (932 lines).
- **`collector_api.py`** — Proxmox API integration. Authentication, data collection for nodes/guests/RRD metrics, parallel collection.
- **`ai_provider.py`** — `AIProviderFactory` for creating provider instances. Each provider (OpenAI, Anthropic, Ollama) is a class with a common interface.
- **`automigrate.py`** — Automated migration orchestrator. Runs as a standalone service via systemd timer.
- **`notifications.py`** — Multi-provider notifications (Pushover, Email, Telegram, Discord, Slack, Webhooks).

### Frontend
- **`src/app.jsx`** — The main React SPA (~11,900 lines). Contains most UI components, state management, and routing logic.
- **`src/components/DashboardPage.jsx`** — Dashboard with cluster charts and metrics (5,322 lines).
- **`src/components/AutomationPage.jsx`** — Automation configuration UI.
- **`src/components/SettingsPage.jsx`** — Settings and configuration panel.
- **`src/api/client.js`** — Centralized API client for all backend calls.
- **`src/index.jsx`** — esbuild entry point that bootstraps the React app.

### Configuration
- **`config.example.json`** — Reference for all configuration options. The actual `config.json` is gitignored.

## Code Conventions

### Python (Backend)
- **Style**: PEP 8 (format with `black`, lint with `flake8`)
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes
- **Architecture**: Domain logic in `proxbalance/*.py`, routes in `proxbalance/routes/*.py` as Flask Blueprints. Shared state via `current_app.config`.
- **Patterns**: Class-based abstractions for providers (AI, notifications). Try-except blocks around all Proxmox API calls. Graceful degradation when services are unavailable.
- **Imports**: Domain modules export through `proxbalance/__init__.py`. Route blueprints are registered in `proxbalance/routes/__init__.py`.

### JavaScript/JSX (Frontend)
- **Style**: 2-space indentation, semicolons
- **Naming**: `camelCase` for functions/variables, `PascalCase` for React components
- **Framework**: React 17+ with hooks, Tailwind CSS utility classes
- **Build**: esbuild bundles `src/index.jsx` → `assets/js/app.js` (IIFE format, ES2020 target)

### Bash (Shell Scripts)
- **Style**: Google Shell Style Guide, 2-space indentation
- **Variables**: Always quoted (`"$variable"`)

### Commit Messages
Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
<type>(<scope>): <subject>
```
Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples from this repo:
```
feat(api): add webhook support for migration events
fix(collector): handle missing SSH keys gracefully
feat(affinity): add VM affinity rules to keep groups together on same host
refactor(update): refactor update system into dedicated update_manager module
docs(readme): add troubleshooting section for 502 errors
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
- Suitability ratings normalized to 0-100%
- All penalty weights configurable through the Settings UI
- Implementation: `proxbalance/scoring.py`
- Detailed documentation: `docs/SCORING_ALGORITHM.md`

## API Endpoints

The Flask API exposes 48+ REST endpoints under `/api/`, organized into 10 Blueprint modules:

| Blueprint | File | Key Endpoints |
|-----------|------|---------------|
| analysis | `routes/analysis.py` | `/api/cluster-analysis`, `/api/cluster-summary`, `/api/nodes-only`, `/api/guests-only` |
| recommendations | `routes/recommendations.py` | `/api/recommendations` |
| migrations | `routes/migrations.py` | `/api/migrate` |
| evacuation | `routes/evacuation.py` | `/api/nodes/evacuate`, `/api/evacuation-plan` |
| config | `routes/config.py` | `/api/config` |
| penalty | `routes/penalty.py` | `/api/penalty-config` |
| system | `routes/system.py` | `/api/update/*`, `/api/health`, `/api/version` |
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
- **`src/app.jsx` is still very large** (~11,900 lines) — Be precise when making edits. Search for specific component names.
- **Frontend build** — Uses esbuild, not Babel. Run `./build.sh` to rebuild. Output goes to `assets/js/app.js`.
- **No package.json committed** — It's gitignored. Use `npx esbuild` or install locally.
- **JSON-file storage** — No database. All state lives in JSON files (`cluster_cache.json`, `config.json`, `migration_history.json`).
- **Systemd timers** — Collection, recommendations, and auto-migration are separate systemd services, not in-process cron jobs.
- **Blueprint routing** — All routes use full paths (e.g., `/api/config`), not url_prefix. Find a route by searching for `@*_bp.route('/api/...')` in `proxbalance/routes/`.
- **Shared state** — Blueprints access shared objects (cache_manager, update_manager) via `current_app.config['key']`.
- **Branch workflow** — Development happens on `dev`, merged to `main` for releases.
