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

- **[Automated Migrations](AUTOMATION.md)** - Scheduling, safety checks, and distribution balancing
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
├── app.py                    # Flask API server
├── collector_api.py          # Proxmox data collection
├── ai_provider.py            # AI provider abstraction
├── automigrate.py            # Automated migration engine
├── generate_recommendations.py # Recommendation generator
├── notifications.py          # Multi-provider notifications
├── update_manager.py         # Update/version management
├── index.html                # React web UI
├── src/app.jsx               # React source
├── config.example.json       # Configuration template
├── requirements.txt          # Python dependencies
├── install.sh                # Automated installer
├── systemd/                  # Service and timer files
├── nginx/                    # Reverse proxy config
└── docs/                     # Documentation
```

---

[Back to Main README](../README.md)
