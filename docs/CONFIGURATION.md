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
- [Sensitive Fields](#sensitive-fields)

---

## Core Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `collection_interval_minutes` | int | `60` | How often the collector gathers cluster data (1-240) |
| `ui_refresh_interval_minutes` | int | `15` | How often the dashboard auto-refreshes (Settings > Connection, "Dashboard auto-refresh") |
| `api_key` | string | `""` | Optional key required on every `/api/` call except `/api/health`, sent as `X-API-Key` or `Authorization: Bearer`. Empty disables the check |
| `cors_origins` | array | `[]` | Allowed CORS origins. Empty restricts to same-origin |

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

`proxmox_username` and `proxmox_password` are used by the collector only when `proxmox_auth_method` is not `api_token`.

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
| `max_parallel_workers` | int | `5` | Number of parallel worker threads (1-10) |
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
| `cpu_threshold` | int | `60` | CPU usage percentage to trigger recommendations |
| `mem_threshold` | int | `70` | Memory usage percentage to trigger recommendations |
| `iowait_threshold` | int | `30` | IOWait percentage threshold |

The web UI sliders cover 10-95% for CPU and memory and 5-60% for IOWait; the API (`POST /api/settings/recommendation-thresholds`) accepts 1-100.

---

## AI Configuration

Optional AI-powered analysis. See [AI Features](AI_FEATURES.md) for setup details.

```json
"ai_provider": "none",
"ai_recommendations_enabled": false,
"ai_config": {
    "openai": {
        "api_key": "",
        "model": "gpt-4o",
        "base_url": "https://api.openai.com/v1"
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
| `ai_config.openai.base_url` | string | `"https://api.openai.com/v1"` | OpenAI-compatible API base URL. The stored key is only sent to this URL |
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
    "maintenance_nodes": [],
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
| `maintenance_nodes` | array | `[]` | Nodes in maintenance mode. Set from the node window in the dashboard; automation evacuates them (see [Maintenance Mode](AUTOMATION.md#maintenance-mode)) |

### Schedule

```json
"schedule": {
    "timezone": "America/New_York",
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

Blackout windows always take priority over migration windows. If the `migration_windows` list is empty, migrations are allowed at all times. If it has windows, migrations are restricted to the enabled ones, and a list whose windows are **all disabled** blocks every run.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `timezone` | string | `"UTC"` | IANA timezone used for every window that has no `timezone` of its own. The web UI sets this one value for all windows. Workload pattern analysis also buckets hours in this timezone |
| `*.name` | string | - | Window name shown in the UI and logs |
| `*.enabled` | bool | `true` | Disabled windows never match |
| `*.days` | array | - | Lowercase day names. A window only matches on these days; for an overnight window both parts are checked against the current day |
| `*.start_time` / `*.end_time` | string | - | `HH:MM`, inclusive. `start_time` later than `end_time` means the window crosses midnight |
| `*.timezone` | string | schedule `timezone` | Optional per-window override |

### Rules

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `min_confidence_score` | int | `75` | Minimum suitability rating to execute (1-100) |
| `max_migrations_per_run` | int | `3` | Maximum migrations per automation cycle (1-10) |
| `max_concurrent_migrations` | int | `1` | Concurrent migration limit |
| `cooldown_minutes` | int | `30` | Time between migrations for the same guest (1-1440) |
| `respect_ignore_tags` | bool | `true` | Honor `ignore` tags (skip tagged guests) |
| `respect_exclude_tags` | bool | `true` | Honor `exclude_*` tags (anti-affinity) |
| `respect_exclude_affinity` | bool | `true` | Enforce anti-affinity placement checks |
| `respect_affinity_rules` | bool | `true` | Honor `affinity_*` tags (pro-affinity companion migrations) |
| `require_auto_migrate_ok_tag` | bool | `false` | Whitelist mode: only migrate guests tagged `auto_migrate_ok` (the older `auto-migrate-ok` spelling also works) |

### Safety Checks

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `check_cluster_health` | bool | `true` | Verify cluster health before migrating |
| `require_quorum` | bool | `true` | Require cluster quorum |
| `max_node_memory_percent` | int | `90` | Maximum target node memory usage |
| `max_node_cpu_percent` | int | `85` | Maximum target node CPU usage |
| `verify_before_migrate` | bool | `true` | Re-check the guest's current location before a live migration |
| `abort_on_failure` | bool | `true` | Disable automation after a failure |

`max_node_cpu_percent` and `max_node_memory_percent` are also the limits used for recommendation conflict detection and batch-impact warnings, and for `resource_threshold` notifications.

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
| `on_start` | bool | `true` | Notify when an automation run starts |
| `on_complete` | bool | `true` | Notify when an automation run completes |
| `on_failure` | bool | `true` | Notify when pre-flight safety checks abort a run |

Further event switches (`on_action`, `on_node_status`, `on_evacuation`, `on_update_available` and others) are listed in [Notifications - Global Settings](NOTIFICATIONS.md#global-settings), together with provider-specific configuration.

---

## Sensitive Fields

These fields are treated as secrets:

| Location | Fields |
|----------|--------|
| Root | `proxmox_api_token_secret`, `proxmox_password`, `api_key` |
| `ai_config.<provider>` | `api_key` |
| `automated_migrations.notifications.providers.<provider>` | `api_token`, `user_key`, `bot_token`, `webhook_url`, `smtp_password`, `password`, `url`, every value in `headers` |
| `automated_migrations.notifications` (legacy) | `webhook_url` |

- The API never returns them: `GET /api/config`, `GET /api/automigrate/config`, config export and server backups show `***` in their place.
- Saving a form that still contains `***` keeps the stored value, so editing other settings never overwrites a secret. The same applies to `POST /api/config/import`, so re-importing an exported file keeps the current secrets.
- Because backups and exports are redacted, restoring one on a fresh install requires entering the secrets again.

---

## Example Configuration

See [config.example.json](../config.example.json) for a complete example with all default values.

---

[Back to Documentation](README.md)
