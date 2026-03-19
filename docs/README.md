# ProxBalance Documentation

Complete documentation for ProxBalance - cluster monitoring and automated load balancing for Proxmox VE.

---

## Getting Started

- **[Installation Guide](INSTALL.md)** - Quick install, manual setup, and post-installation steps
- **[Usage Guide](USAGE.md)** - Cluster map, migrations, tagging, and dashboard workflows

## Reference

- **[Configuration Reference](CONFIGURATION.md)** - All config.json options with descriptions
- **[API Reference](API.md)** - REST API endpoints for automation and scripting
- **[Scoring Algorithm](SCORING_ALGORITHM.md)** - Penalty-based scoring system internals

## Features

- **[Feature Overview](FEATURES.md)** - Complete feature list with descriptions
- **[Automated Migrations](AUTOMATION.md)** - Scheduling, safety checks, tagging, and distribution balancing
- **[AI Features](AI_FEATURES.md)** - AI-powered recommendations with OpenAI, Anthropic, or Ollama
- **[Notifications](NOTIFICATIONS.md)** - Multi-provider alert system (Pushover, Email, Telegram, Discord, Slack, Webhooks)

## Maintenance

- **[Troubleshooting](TROUBLESHOOTING.md)** - Diagnostics and common issues
- **[Updating](UPDATE_FROM_OLD_VERSION.md)** - Update methods and branch management

## Development

- **[Contributing](CONTRIBUTING.md)** - Code style, pull requests, and development setup
- **[Docker Development](DOCKER_DEV.md)** - Local development with Docker

---

## Quick Diagnostics

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <container-id>
```

## Support

- **Troubleshooting**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Bug Reports**: [GitHub Issues](https://github.com/Pr0zak/ProxBalance/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions)

---

## Project Structure

```
ProxBalance/
├── app.py                       # Flask entry point (modular Blueprint architecture)
├── collector_api.py             # Proxmox data collection service
├── ai_provider.py               # AI provider abstraction (OpenAI/Anthropic/Ollama)
├── automigrate.py               # Automated migration engine
├── generate_recommendations.py  # Background recommendation generator
├── notifications.py             # Multi-provider notification system
├── update_manager.py            # Update/version management
│
├── proxbalance/                 # Core backend package (16 domain modules)
│   ├── config_manager.py        # Config loading, Proxmox client
│   ├── constants.py             # Shared path constants, tuning values
│   ├── cache.py                 # In-memory cache with 60s TTL
│   ├── error_handlers.py        # @api_route decorator, response helpers
│   ├── scoring.py               # Penalty-based scoring algorithm
│   ├── recommendations.py       # Recommendation engine
│   ├── recommendation_analysis.py # Confidence scoring, conflict detection
│   ├── storage.py               # Storage compatibility checks
│   ├── distribution.py          # Guest distribution balancing
│   ├── migrations.py            # Migration execution logic
│   ├── evacuation.py            # Node evacuation planning
│   ├── forecasting.py           # Trend projection
│   ├── patterns.py              # Workload pattern detection
│   ├── outcomes.py              # Migration outcome tracking
│   ├── execution_planner.py     # Topological execution ordering
│   ├── reporting.py             # Summaries, capacity advisories
│   └── routes/                  # Flask Blueprints (all API endpoints, @api_route)
│       ├── analysis.py          # /api/cluster-analysis, /api/cluster-summary
│       ├── automation.py        # /api/automigrate/* endpoints
│       ├── config.py            # /api/config endpoints
│       ├── evacuation.py        # /api/nodes/evacuate endpoints
│       ├── guests.py            # /api/guests/*, /api/affinity-groups
│       ├── migrations.py        # /api/migrate endpoint
│       ├── notifications.py     # /api/notifications/test endpoint
│       ├── penalty.py           # /api/penalty-config endpoint
│       ├── recommendations.py   # /api/recommendations endpoints
│       └── system.py            # /api/update/*, /api/health, /api/version
│
├── src/                         # Frontend source (React JSX)
│   ├── index.jsx                # Root component + hook composition (~658 lines)
│   ├── hooks/                   # 11 custom React hooks (state management)
│   ├── components/
│   │   ├── DashboardPage.jsx    # Dashboard wrapper + 13 sub-components
│   │   ├── AutomationPage.jsx   # Automation wrapper + 6 sub-components
│   │   ├── SettingsPage.jsx     # Settings wrapper + 5 sub-components
│   │   ├── Icons.jsx            # SVG icon components
│   │   └── Skeletons.jsx        # Loading skeleton components
│   ├── api/
│   │   └── client.js            # API client with error handling
│   └── utils/
│       ├── constants.js         # Shared frontend constants
│       ├── formatters.js        # Utility formatting functions
│       └── useIsMobile.js       # Mobile responsiveness hook
│
├── index.html                   # SPA entry point
├── assets/                      # SVG logos, favicon, and built JS
├── config.example.json          # Configuration template
├── requirements.txt             # Python dependencies
├── install.sh                   # Automated LXC installer
├── systemd/                     # Systemd service and timer files
├── nginx/                       # Nginx reverse proxy config
└── docs/                        # Documentation (17 markdown files)
```

---

[Back to Main README](../README.md)
