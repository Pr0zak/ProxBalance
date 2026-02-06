# CLAUDE.md - ProxBalance AI Assistant Guide

## Project Overview

ProxBalance is an intelligent cluster monitoring and VM/CT migration management system for **Proxmox VE**. It provides real-time metrics, a penalty-based scoring algorithm for node health, AI-powered migration recommendations, automated migration scheduling, and an interactive web dashboard.

**Target users**: Proxmox administrators managing multi-node clusters.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.8+ (Flask 2.0+, Gunicorn) |
| Frontend | React 17+ (JSX), Tailwind CSS (CDN), Chart.js |
| Reverse Proxy | Nginx |
| Process Manager | Systemd (services + timers) |
| Data Storage | JSON files (no database) |
| Proxmox API | proxmoxer library |
| AI Providers | OpenAI, Anthropic Claude, Ollama |
| Notifications | Pushover, Email/SMTP, Telegram, Discord, Slack, Webhooks |

## Repository Structure

```
ProxBalance/
├── app.py                     # Flask REST API server (~6100 lines, 48+ endpoints)
├── collector_api.py           # Proxmox data collection service
├── ai_provider.py             # AI provider abstraction (OpenAI/Anthropic/Ollama)
├── notifications.py           # Multi-provider notification system
├── automigrate.py             # Automated migration orchestrator
├── update_manager.py          # Update checking and branch management
├── generate_recommendations.py # Background recommendation generation
├── set_cluster_preset.py      # Cluster size preset configuration
│
├── src/
│   ├── app.jsx                # Main React SPA (~11800 lines)
│   ├── automation_page.jsx    # Automation configuration page
│   └── automation_widget.jsx  # Automation status widget
│
├── index.html                 # SPA entry point with React bootstrap
│
├── config.example.json        # Configuration template
├── requirements.txt           # Python dependencies
│
├── systemd/                   # Systemd service and timer files
│   ├── proxmox-balance.service
│   ├── proxmox-collector.service / .timer
│   ├── proxmox-balance-automigrate.service / .timer
│   └── proxmox-balance-recommendations.service / .timer
│
├── nginx/                     # Nginx reverse proxy config
├── assets/                    # SVG logos and favicon
├── docs/                      # Comprehensive documentation (13 files)
│
├── install.sh                 # Main LXC container installer
├── update.sh                  # Update to latest version
├── check-status.sh            # System health check
└── test-page-load.js          # Puppeteer page load testing
```

## Architecture

**Three-tier design:**

1. **Data Collection** (`collector_api.py`) - Gathers metrics from the Proxmox API using proxmoxer. Runs on a systemd timer (default 60 min). Supports parallel collection with configurable worker count.

2. **Application Logic** (`app.py`) - Flask REST API. Serves 48+ endpoints covering cluster analysis, migrations, configuration, AI recommendations, and system management. Implements the penalty-based scoring algorithm. Reads from `cluster_cache.json` for fast responses with a 60-second in-memory TTL cache.

3. **Frontend** (`src/app.jsx`, `index.html`) - React SPA with Tailwind CSS. Dashboard, cluster map (5 view modes), node status, migration UI, automation controls, settings, and AI configuration. JSX is compiled via Babel CLI during deployment.

**Background services** (all via systemd timers):
- Data collector (configurable interval)
- Recommendation generator (dynamic 5-120 min based on cluster size)
- Automated migration runner (user-configurable)

**Data persistence**: JSON files on disk (`cluster_cache.json`, `config.json`, `migration_history.json`). No database.

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

# Production: runs behind Gunicorn (2 workers, port 5000) + Nginx (port 80)
```

The frontend uses local copies of React/ReactDOM (not CDN). JSX is compiled with Babel CLI. No `package.json` is committed (it's in `.gitignore`). Node.js 20 LTS is only needed for Babel compilation during build/update.

**Production path**: `/opt/proxmox-balance-manager`
**Docker dev path**: `/app` (with cache at `/app/cache`)

## Key Files to Know

- **`app.py`** - The core of the application. Contains all API endpoints, the penalty-based scoring algorithm, migration execution logic, evacuation planning, and configuration management. This is the largest and most critical file.
- **`collector_api.py`** - Proxmox API integration. Handles authentication, data collection for nodes/guests/RRD metrics, and parallel collection optimization.
- **`ai_provider.py`** - Abstraction layer with `AIProviderFactory` for creating provider instances. Each provider (OpenAI, Anthropic, Ollama) is a class implementing a common interface.
- **`src/app.jsx`** - The entire frontend in a single React file. All components, state management, and UI logic live here.
- **`config.example.json`** - Reference for all configuration options. The actual `config.json` is gitignored (contains secrets).

## Code Conventions

### Python (Backend)
- **Style**: PEP 8 (format with `black`, lint with `flake8`)
- **Naming**: `snake_case` for functions/variables, `PascalCase` for classes
- **Patterns**: Class-based abstractions for providers (AI, notifications). Try-except blocks around all Proxmox API calls. Graceful degradation when services are unavailable.

### JavaScript/JSX (Frontend)
- **Style**: 2-space indentation, semicolons
- **Naming**: `camelCase` for functions/variables, `PascalCase` for React components
- **Framework**: React 17+ with hooks, Tailwind CSS utility classes

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
docs(readme): add troubleshooting section for 502 errors
```

## Configuration

The main configuration file is `config.json` (gitignored). Use `config.example.json` as reference. Key sections:

- **Proxmox connection**: host, port, API token auth
- **Collection optimization**: cluster size preset, parallel workers, RRD timeframes
- **Recommendation thresholds**: CPU/memory/IOWait thresholds triggering recommendations
- **Automated migrations**: enabled/disabled, dry-run mode, migration windows, blackout windows, safety checks, cooldown periods
- **AI config**: provider selection (OpenAI/Anthropic/Ollama), API keys, model selection
- **Penalty scoring**: 30+ configurable penalty weights (all adjustable via Settings UI)

## Scoring Algorithm

ProxBalance uses a **penalty-based scoring system** rather than hard rules:

- Penalties are applied for undesirable conditions (high CPU, memory pressure, IOWait, rising trends, spikes)
- Three time-period weights: Current (50%), 24h average (30%), 7d average (20%)
- Suitability ratings normalized to 0-100%
- All penalty weights are configurable through the UI
- Detailed documentation: `docs/SCORING_ALGORITHM.md`

## API Endpoints

The Flask API (`app.py`) exposes 48+ REST endpoints under `/api/`. Key groups:

- `/api/cluster-analysis` - Full cluster analysis with scoring
- `/api/cluster-summary`, `/api/nodes-only`, `/api/guests-only` - Progressive loading
- `/api/migrate` - Execute VM/CT migrations
- `/api/evacuation-plan` - Node evacuation planning
- `/api/recommendations` - AI-powered migration recommendations
- `/api/automigrate/*` - Automated migration configuration and status
- `/api/config` - Read/write configuration
- `/api/notifications/*` - Notification provider management
- `/api/update/*` - Update checking and execution
- `/api/penalty-config` - Scoring penalty weight management

## Testing

Limited formal testing infrastructure:

- **`test-page-load.js`** - Puppeteer-based page load performance test (measures TTFB, render time, grades performance)
- **`test_api_token.sh`** - API token validation script
- **Manual testing** - Start services and verify via logs: `journalctl -u proxmox-balance -n 50`
- No pytest/jest test suites currently in the repository

## Deployment

ProxBalance deploys as an **unprivileged LXC container** within Proxmox VE (not Docker):

1. `install.sh` creates an LXC container (Debian 12) on the Proxmox host
2. Installs Python, Node.js 20 LTS, Nginx, and all dependencies
3. Configures systemd services and timers
4. Creates Proxmox API tokens automatically
5. Services: Nginx (port 80) -> Gunicorn (port 5000) + background systemd timers

## Important Notes for AI Assistants

- **`config.json` contains secrets** - Never commit it. Use `config.example.json` for reference.
- **`app.py` is very large** (~6100 lines) - Be precise when making edits. Search for specific function names or route decorators.
- **`src/app.jsx` is the entire frontend** (~11800 lines) - Same caution applies. All React components are in this single file.
- **No package.json** - It's gitignored. The frontend build uses Babel CLI directly, not npm scripts.
- **JSON-file storage** - There is no database. All state lives in JSON files on disk (`cluster_cache.json`, `config.json`, `migration_history.json`).
- **Systemd timers drive background work** - Collection, recommendations, and auto-migration are not in-process cron jobs; they are separate systemd services.
- **Branch workflow** - Development happens on `dev`, merged to `main` for releases. Use `feature/` or `fix/` branch prefixes.
