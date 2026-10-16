# ProxBalance Documentation

Documentation for ProxBalance, cluster monitoring and load balancing for Proxmox VE.

---

## Getting Started

- **[Installation Guide](INSTALL.md)** - Quick install, manual setup and post-installation steps
- **[Usage Guide](USAGE.md)** - Dashboard, Insights, Automation and Settings pages, migrations, tagging and maintenance

## Reference

- **[Configuration Reference](CONFIGURATION.md)** - Every `config.json` option
- **[Releasing and Updating](RELEASING.md)** - Update channels, how updates run and roll back, and how to cut a release
- **[API Reference](API.md)** - REST API endpoints for scripts and integrations
- **[Scoring Algorithm](SCORING_ALGORITHM.md)** - Penalty-based scoring, including IO pressure and the soft affinity penalty
- **[Prometheus Metrics](PROMETHEUS.md)** - `/api/metrics` endpoint, scrape config and Grafana dashboard

## Features

- **[Feature Overview](FEATURES.md)** - Every feature, with screenshots
- **[Automated Migrations](AUTOMATION.md)** - Automatic and semi-automatic modes, scheduling, safety checks, placement rules and distribution balancing
- **[AI Features](AI_FEATURES.md)** - Optional AI review with OpenAI, Anthropic or Ollama
- **[Notifications](NOTIFICATIONS.md)** - Providers (Pushover, Email, Telegram, Discord, Slack, Webhooks), alerts, repeats and silences

## Maintenance

- **[Troubleshooting](TROUBLESHOOTING.md)** - Settings → Diagnostics, scripts and common issues
- **[Updating](UPDATE_FROM_OLD_VERSION.md)** - Update methods and channels
- **[Release notes](releases/)** - Notes for each release from v2.16.0

## Development

- **[Contributing](CONTRIBUTING.md)** - Code style, pull requests and development setup
- **[Docker Development](DOCKER_DEV.md)** - Local development with Docker
- **[Testing update compatibility](TESTING_UPDATE_COMPATIBILITY.md)** - Checks for the update path

## Historical planning documents

These describe plans made before the features were built. The feature docs above describe what exists now.

- [Intelligent migration plan](INTELLIGENT_MIGRATION_PLAN.md)
- [Mobile redesign plan](MOBILE_REDESIGN_PLAN.md)
- [Modular refactoring plan](MODULAR_REFACTORING_PLAN.md)
- [Recommendation improvements plan](RECOMMENDATION_IMPROVEMENTS_PLAN.md)

---

## Quick Diagnostics

In the web UI, open **Settings → Diagnostics** (`#/settings/diagnostics`). From the Proxmox host:

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
├── app.py                       # Flask entry point (registers the route blueprints)
├── collector_api.py             # Proxmox data collection service
├── automigrate.py               # Automated migration engine
├── generate_recommendations.py  # Background recommendation generator
├── notifications.py             # Notification providers
├── ai_provider.py               # AI provider abstraction (OpenAI/Anthropic/Ollama)
├── update_manager.py            # Version info and update checks
├── release_updater.py           # Release updater: backup, verified web bundle, rollback
│
├── proxbalance/                 # Backend package (domain modules)
│   ├── scoring.py               # Penalty-based scoring
│   ├── recommendations.py       # Recommendation engine
│   ├── placement_rules.py       # Affinity / anti-affinity rules from tags and pools
│   ├── ha_rules.py              # Proxmox HA rules and groups
│   ├── semi_auto.py             # Semi-automatic mode approval queue
│   ├── alert_state.py           # Alert hysteresis, repeats and silences
│   ├── audit_log.py             # Change log
│   ├── diagnostics.py           # Settings → Diagnostics checks
│   ├── disk_health.py           # SMART disk health
│   ├── failure_sim.py           # "What if a node fails?"
│   ├── rolling_update.py        # Rolling update plan
│   ├── rightsizing.py           # Right-sizing hints
│   ├── forecasting.py           # Trend projection
│   ├── evacuation.py            # Node evacuation planning
│   ├── migrations.py            # Migration execution
│   ├── db.py                    # SQLite connections and schema
│   ├── ...                      # Storage, distribution, outcomes, patterns, metrics and others
│   └── routes/                  # Flask blueprints: analysis, audit, automation, config,
│                                #   diagnostics, evacuation, guests, metrics, migrations,
│                                #   notifications, penalty, recommendations, rules,
│                                #   simulate, system
│
├── src/                         # Frontend source (React JSX, built with esbuild)
│   ├── index.jsx                # Root component, hook composition, hash routing
│   ├── hooks/                   # Custom React hooks (state management)
│   ├── components/
│   │   ├── DashboardPage.jsx    # Dashboard + dashboard/ sub-components
│   │   ├── InsightsPage.jsx     # Insights + insights/ sub-components
│   │   ├── AutomationPage.jsx   # Automation + automation/ sub-components
│   │   ├── SettingsPage.jsx     # Settings + settings/ sub-components
│   │   └── QuickSearch.jsx      # Ctrl/Cmd+K search
│   ├── api/client.js            # API client
│   └── utils/                   # Design tokens, formatters, schedule and other helpers
│
├── index.html                   # SPA entry point
├── assets/                      # Logos, favicon and built JS/CSS
├── config.example.json          # Configuration template
├── requirements.txt             # Python dependencies (pinned)
├── install.sh                   # LXC installer
├── update.sh                    # Update from the Proxmox host
├── tests/                       # pytest suites and JavaScript tests
├── systemd/                     # Service and timer units
├── nginx/                       # Nginx reverse proxy config
└── docs/                        # Documentation and screenshots
```

---

[Back to Main README](../README.md)
