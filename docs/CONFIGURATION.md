# Configuration Reference

All ProxBalance settings are stored in `config.json`. Most settings can be managed through the web UI Settings panel. This document provides a complete reference.

---

## Table of Contents

- [Core Settings](#core-settings)
- [Proxmox Connection](#proxmox-connection)
- [Collection Optimization](#collection-optimization)
- [Recommendation Thresholds](#recommendation-thresholds)
- [AI Configuration](#ai-configuration)
- [Automated Migrations](#automated-migrations)
- [Distribution Balancing](#distribution-balancing)
- [Notifications](#notifications)

---

## Core Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `collection_interval_minutes` | int | `60` | How often the collector gathers cluster data (5-240) |
| `ui_refresh_interval_minutes` | int | `15` | How often the dashboard auto-refreshes (5-120) |

---

## Proxmox Connection

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `proxmox_host` | string | - | IP or hostname of a Proxmox node |
| `proxmox_port` | int | `8006` | Proxmox API port |
| `proxmox_auth_method` | string | `"api_token"` | Authentication method |
| `proxmox_api_token_id` | string | - | API token ID (`user@realm!tokenname`) |
| `proxmox_api_token_secret` | string | - | API token secret (UUID) |
| `proxmox_verify_ssl` | bool | `false` | Verify SSL certificates |

The API token needs the **PVEAuditor** role for read-only monitoring, or **PVEVMAdmin** for monitoring and migrations. Both the user and the token require ACL permissions.

---

## Collection Optimization

Controls how data is gathered from the Proxmox API.

```json
"collection_optimization": {
    "cluster_size": "medium",
    "parallel_collection_enabled": true,
    "max_parallel_workers": 5,
    "skip_stopped_guest_rrd": true,
    "node_rrd_timeframe": "day",
    "guest_rrd_timeframe": "hour"
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `cluster_size` | string | `"medium"` | Preset: `small`, `medium`, `large`, or `custom` |
| `parallel_collection_enabled` | bool | `true` | Collect node data in parallel |
| `max_parallel_workers` | int | `5` | Number of parallel worker threads (1-8) |
| `skip_stopped_guest_rrd` | bool | `true` | Skip RRD data for stopped guests |
| `node_rrd_timeframe` | string | `"day"` | RRD timeframe for node metrics |
| `guest_rrd_timeframe` | string | `"hour"` | RRD timeframe for guest metrics |

### Cluster Size Presets

| Preset | Guests | Interval | Workers |
|--------|--------|----------|---------|
| Small | < 30 | 5 min | 3 |
| Medium | 30-100 | 15 min | 5 |
| Large | 100+ | 30 min | 8 |

---

## Recommendation Thresholds

Control when migration recommendations are generated.

```json
"recommendation_thresholds": {
    "cpu_threshold": 60,
    "mem_threshold": 70,
    "iowait_threshold": 30
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `cpu_threshold` | int | `60` | CPU usage percentage to trigger recommendations (40-90) |
| `mem_threshold` | int | `70` | Memory usage percentage to trigger recommendations (50-95) |
| `iowait_threshold` | int | `30` | IOWait percentage threshold |

---

## AI Configuration

Optional AI-powered analysis. See [AI Features](AI_FEATURES.md) for setup details.

```json
"ai_provider": "none",
"ai_recommendations_enabled": false,
"ai_config": {
    "openai": {
        "api_key": "",
        "model": "gpt-4o"
    },
    "anthropic": {
        "api_key": "",
        "model": "claude-sonnet-4-5-20250929"
    },
    "local": {
        "base_url": "http://localhost:11434",
        "model": "llama3.1:8b"
    }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `ai_provider` | string | `"none"` | Provider: `none`, `openai`, `anthropic`, `local` |
| `ai_recommendations_enabled` | bool | `false` | Enable AI recommendations |
| `ai_config.openai.api_key` | string | `""` | OpenAI API key |
| `ai_config.openai.model` | string | `"gpt-4o"` | OpenAI model name |
| `ai_config.anthropic.api_key` | string | `""` | Anthropic API key |
| `ai_config.anthropic.model` | string | `"claude-sonnet-4-5-20250929"` | Anthropic model name |
| `ai_config.local.base_url` | string | `"http://localhost:11434"` | Ollama base URL |
| `ai_config.local.model` | string | `"llama3.1:8b"` | Ollama model name |

---

## Automated Migrations

Full automation configuration. See [Automation Guide](AUTOMATION.md) for usage details.

```json
"automated_migrations": {
    "enabled": false,
    "dry_run": true,
    "check_interval_minutes": 5,
    "schedule": { ... },
    "rules": { ... },
    "safety_checks": { ... },
    "notifications": { ... }
}
```

### Top-Level

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | `false` | Enable automated migrations |
| `dry_run` | bool | `true` | Simulate migrations without executing |
| `check_interval_minutes` | int | `5` | How often the engine evaluates the cluster (1-60) |

### Schedule

```json
"schedule": {
    "migration_windows": [
        {
            "name": "Nightly Window",
            "enabled": true,
            "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "start_time": "22:00",
            "end_time": "06:00",
            "timezone": "America/New_York"
        }
    ],
    "blackout_windows": [
        {
            "name": "Business Hours",
            "enabled": true,
            "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
            "start_time": "08:00",
            "end_time": "18:00"
        }
    ]
}
```

Blackout windows always take priority over migration windows. If no windows are defined, migrations are allowed at all times. If only migration windows exist, migrations are restricted to those windows.

### Rules

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `min_confidence_score` | int | `75` | Minimum suitability rating to execute (1-100) |
| `max_migrations_per_run` | int | `3` | Maximum migrations per automation cycle (1-10) |
| `max_concurrent_migrations` | int | `1` | Concurrent migration limit |
| `cooldown_minutes` | int | `30` | Time between migrations for the same guest (1-1440) |
| `respect_ignore_tags` | bool | `true` | Honor `ignore` tags |
| `respect_exclude_tags` | bool | `true` | Honor `exclude_*` tags |
| `respect_exclude_affinity` | bool | `true` | Honor anti-affinity rules |
| `require_auto_migrate_ok_tag` | bool | `false` | Whitelist mode: only migrate tagged guests |

### Safety Checks

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `check_cluster_health` | bool | `true` | Verify cluster health before migrating |
| `require_quorum` | bool | `true` | Require cluster quorum |
| `max_node_memory_percent` | int | `90` | Maximum target node memory usage |
| `max_node_cpu_percent` | int | `85` | Maximum target node CPU usage |
| `abort_on_failure` | bool | `true` | Disable automation after a failure |

---

## Distribution Balancing

Balances guest counts across nodes by migrating small VMs/CTs.

```json
"distribution_balancing": {
    "enabled": false,
    "guest_count_threshold": 2,
    "max_cpu_cores": 2,
    "max_memory_gb": 4
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | `false` | Enable distribution balancing |
| `guest_count_threshold` | int | `2` | Minimum guest count difference to trigger (1-10) |
| `max_cpu_cores` | int | `2` | Only migrate guests with this many cores or fewer (0 = no limit) |
| `max_memory_gb` | int | `4` | Only migrate guests with this much RAM or less (0 = no limit) |

---

## Notifications

Notification providers for automated migration events. See [Notifications](NOTIFICATIONS.md) for setup details.

```json
"automated_migrations": {
    "notifications": {
        "enabled": false,
        "on_start": true,
        "on_complete": true,
        "on_failure": true,
        "providers": { ... }
    }
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | `false` | Enable notifications globally |
| `on_start` | bool | `true` | Notify when a migration starts |
| `on_complete` | bool | `true` | Notify when a migration completes |
| `on_failure` | bool | `true` | Notify when a migration fails |

See the [Notifications](NOTIFICATIONS.md) page for provider-specific configuration.

---

## Example Configuration

See [config.example.json](../config.example.json) for a complete example with all default values.

---

[Back to Documentation](README.md)
