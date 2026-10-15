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
- [Migration Settings and Penalty Scoring](#migration-settings-and-penalty-scoring)
- [Rolling Update Plan](#rolling-update-plan)
- [Sensitive Fields](#sensitive-fields)

---

## Core Settings

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `collection_interval_minutes` | int | `60` | How often the collector gathers cluster data (1-240) |
| `ui_refresh_interval_minutes` | int | `15` | How often the dashboard auto-refreshes (Settings > Connection, "Dashboard auto-refresh") |
| `api_key` | string | `""` | Optional key required on every `/api/` call except `/api/health`, sent as `X-API-Key` or `Authorization: Bearer`. Empty disables the check |
| `updates.channel` | string | `"stable"` | Which updates the updater offers: `stable` (tested releases), `beta` (releases and pre-releases) or `dev` (every commit on the checked-out branch). See [Releasing and updating](RELEASING.md) |
| `cors_origins` | array | `[]` | Allowed CORS origins. Empty restricts to same-origin. Origins listed here are also accepted by the CSRF check |
| `csrf_protection` | bool | `true` | Blocks state-changing `/api/` requests (POST, PUT, PATCH, DELETE) that a browser sends from another site. See below. Set to `false` only for a reverse-proxy setup that breaks it |
| `rollback_window_hours` | number | `2` | How long after a completed migration a rollback to the original node is offered |


### CSRF protection

With `csrf_protection` on (the default), every POST, PUT, PATCH and DELETE under `/api/` goes through one check before it reaches a route:

1. A request that carries a valid `api_key` header (`X-API-Key` or `Authorization: Bearer`) is allowed. Another site cannot make a browser attach that header, so it cannot be forged.
2. If the browser sends `Sec-Fetch-Site`, the values `same-origin` and `none` are allowed. `same-site` and `cross-site` get `403 {"success": false, "error": true, "message": "Cross-site request blocked"}`.
3. Otherwise, if the browser sends `Origin`, it must be the address the browser used to reach ProxBalance, or one of `cors_origins`. Anything else gets the same 403.
4. Requests with neither header (curl, scripts, Prometheus, the ProxBalance systemd services, the MCP server) are allowed, because they cannot come from a victim's browser.

GET, HEAD and OPTIONS are never checked, and `/api/health` is exempt. The dashboard needs no setup: it calls the API on the same origin.

The "address the browser used" is rebuilt from the `Host` header plus the request scheme. Behind a reverse proxy that terminates TLS, the proxy must keep the original `Host` and send `X-Forwarded-Proto` (Nginx Proxy Manager does both by default, and the bundled nginx passes them on). A proxy that rewrites `Host` should also send `X-Forwarded-Host`. If yours does neither, add the public address to `cors_origins` (for example `["https://proxbalance.example.com"]`) or, as a last resort, set `csrf_protection` to `false`.

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
    "mode": "automatic",
    "approval_ttl_hours": 24,
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
| `dry_run` | bool | `true` | Simulate migrations without executing. Wins over `mode`: nothing moves and nothing is queued |
| `mode` | string | `"automatic"` | `automatic`: run every move that passes the rules. `semi`: run only maintenance evacuations and moves off a node over `max_node_cpu_percent` / `max_node_memory_percent`; queue every other move for approval. See [Semi-automatic mode](AUTOMATION.md#semi-automatic-mode) |
| `approval_ttl_hours` | int | `24` | Semi-automatic mode: hours a queued move waits for approval before it expires (1-168) |
| `check_interval_minutes` | int | `5` | How often the engine evaluates the cluster (1-60) |
| `migration_poll_timeout_seconds` | int | `7200` | How long automation waits for one migration task to finish before it stops polling |
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
| `*.days` | array | - | Lowercase day names. The days a window starts on. An overnight window runs from `start_time` on a listed day to `end_time` the next day |
| `*.start_time` / `*.end_time` | string | - | `HH:MM`, inclusive. `start_time` later than `end_time` means the window crosses midnight |
| `*.timezone` | string | schedule `timezone` | Optional per-window override |

### Rules

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `min_confidence_score` | int | `75` | Minimum suitability rating to execute (1-100) |
| `max_migrations_per_run` | int | `3` | Maximum migrations per automation cycle (1-10) |
| `max_concurrent_migrations` | int | `1` | Concurrent migration limit |
| `max_target_inflow_per_cycle` | int | `0` | Most migrations one target node may receive in a single automation run (0-5, `0` = no limit). See [Target inflow cap](AUTOMATION.md#target-inflow-cap) |
| `cooldown_minutes` | int | `30` | Time between migrations for the same guest (1-1440) |
| `respect_ignore_tags` | bool | `true` | Honor `ignore` tags (skip tagged guests) |
| `respect_exclude_tags` | bool | `true` | Honor `exclude_*` tags (anti-affinity) |
| `respect_exclude_affinity` | bool | `true` | Enforce anti-affinity placement checks |
| `respect_affinity_rules` | bool | `true` | Honor affinity rules: the soft split penalty, and companion migrations for required groups |
| `affinity_soft_penalty` | number | `15` | Score points added to a target that splits a soft affinity group (0-100). See [Affinity rules](AUTOMATION.md#affinity-rules-affinity_-tags-soft-or-required) |
| `pool_rules` | object | `{}` | Proxmox pools as placement groups: `{"<pool>": "affinity" \| "anti-affinity"}` or `{"<pool>": {"type": "affinity", "required": true}}`. See [Pool rules](AUTOMATION.md#pool-rules) |
| `allow_container_restarts` | bool | `true` | A running container can't live-migrate, so moving it stops and restarts it. Set `false` to have automation skip running containers (manual moves still work). Missing means allowed |
| `require_auto_migrate_ok_tag` | bool | `false` | Whitelist mode: only migrate guests tagged `auto_migrate_ok` (the older `auto-migrate-ok` spelling also works) |
| `grace_period_seconds` | int | `30` | Pause between two migrations in the same run ("settle time" in the UI) |
| `cooldown_reset_at` | string | - | Set by the UI when cooldown settings change; cooldowns are counted from this time. Not meant to be edited |
| `intelligent_migrations` | object | see below | Smart Migrations: observation gating and extra checks |

### Smart Migrations (`rules.intelligent_migrations`)

Set in **Automation → Behavior → Smart Migrations**.

```json
"intelligent_migrations": {
    "enabled": true,
    "intelligence_level": "standard",
    "observation_periods": 3,
    "observation_window_hours": 24,
    "minimum_data_collection_hours": 24,
    "risk_confidence_multiplier": 1.2,
    "min_cost_benefit_ratio": 1.0,
    "cycle_window_hours": 48,
    "stale_retention_hours": 48
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | bool | `true` in the example, `false` when missing | Turn Smart Migrations on |
| `intelligence_level` | string | `"standard"` | `basic`: cycle detection only. `standard`: adds cost-benefit, outcome learning and per-guest success tracking. `full`: adds trend awareness, pattern suppression and risk gating |
| `observation_periods` | int | `3` | Runs in a row a suggestion must appear in before automation acts on it ("seen 2 of 3 runs") |
| `observation_window_hours` | number | `24` | Window in which those observations must fall |
| `minimum_data_collection_hours` | number | `24` | Hours of collected data needed before automation acts |
| `risk_confidence_multiplier` | number | `1.2` | Risk gating: for a high-risk move (risk score over 50) the minimum confidence is multiplied by this |
| `min_cost_benefit_ratio` | number | `1.0` | Cost-benefit: the least benefit-to-cost ratio a move needs |
| `cycle_window_hours` | number | `48` | Cycle detection: a move that sends a guest back to a node it left within this window is skipped |
| `stale_retention_hours` | number | `48` | How long a suggestion that dropped out is kept in tracking before it is forgotten |

Older configs may carry individual switches (`cycle_detection_enabled`, `cost_benefit_enabled`, `outcome_learning_enabled`, `guest_success_tracking_enabled`, `trend_awareness_enabled`, `pattern_suppression_enabled`, `risk_gating_enabled`). They are read only when `intelligence_level` is not set.

### Safety Checks

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `check_cluster_health` | bool | `true` | Verify cluster health before migrating |
| `require_quorum` | bool | `true` | Require cluster quorum |
| `max_node_memory_percent` | int | `90` | Maximum target node memory usage |
| `max_node_cpu_percent` | int | `85` | Maximum target node CPU usage |
| `verify_before_migrate` | bool | `true` | Re-check the guest's current location before a live migration |
| `abort_on_failure` | bool | `true` | Stop the rest of this run's moves after one fails. When `false`, the run goes on with other guests; a guest whose move failed is not retried in the same run |
| `pause_on_failure` | bool | `false` | After a real (not dry-run) move fails, stop the run and turn automation off (`enabled: false`) until you turn it back on. Logged in the change log as "Automation turned off: the move of … failed" |

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
        "on_queued": true,
        "alert_resolve_collections": 3,
        "alert_resolve_margin": 5,
        "event_dedupe_seconds": 120,
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
| `on_queued` | bool | `true` | Semi-automatic mode: notify once per guest and target when a move starts waiting for approval |
| `alert_resolve_collections` | int | `3` | An active alert resolves after this many checks in a row on the good side |
| `alert_resolve_margin` | number | `5` | For threshold alerts, a check counts towards resolving only when the value is at least this many points past the limit |
| `event_dedupe_seconds` | int | `120` | Drop an event notification with the same type and text as one sent within this many seconds (`0` = off) |

Further event switches (`on_action`, `on_node_status`, `on_evacuation`, `on_update_available` and others) are listed in [Notifications - Global Settings](NOTIFICATIONS.md#global-settings), together with provider-specific configuration. How alerts resolve and how silences work is in [Alerts, repeats and silences](NOTIFICATIONS.md#alerts-repeats-and-silences).

---

## Migration Settings and Penalty Scoring

The scoring that produces suggestions is set in **Automation → Behavior**. Two sections of `config.json` hold it.

### `migration_settings`

The simplified settings. ProxBalance maps them to penalty weights.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `sensitivity` | int | `2` | `1` Conservative, `2` Balanced, `3` Aggressive. Scales the penalties and the gain a move needs |
| `trend_weight` | int | `60` | How much rising or falling trends count, 0-100% |
| `lookback_days` | int | `7` | History used for sustained-load penalties: 1, 3, 7, 14 or 30 |
| `min_confidence` | int | `75` | Minimum confidence for a suggestion, 50-95% |
| `protect_workloads` | bool | `true` | Avoid suggesting moves during a guest's busy hours |
| `min_score_improvement` | int or null | `null` | Points a move must gain. `null` derives it from `sensitivity` (25, 15 or 8) |
| `expert_overrides` | object or null | `null` | Penalty weights to use directly instead of the mapping |

Edit through `GET`/`PUT /api/migration-settings` or the UI.

### `penalty_scoring`

The penalty weights themselves (written by the expert penalty fields in **Automation → Behavior**, or by `POST /api/penalty-config`). Missing keys use the defaults in `proxbalance/scoring.py` (`DEFAULT_PENALTY_CONFIG`). Examples:

| Key | Default | Description |
|-----|---------|-------------|
| `io_pressure_sustained_high` | `10` | Points when a node's 7-day average IO pressure is over 30% |
| `io_pressure_sustained_critical` | `25` | Points when it is over 50% |
| `iowait_exempt_enabled` | `true` | Leave the IOWait penalties (and IO pressure) out for nodes marked IOWait-exempt |

The full list, with what each penalty measures, is in [Scoring Algorithm](SCORING_ALGORITHM.md). `GET /api/penalty-config` returns the values in effect.

---

## Rolling Update Plan

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `rolling_update.self_vmid` | int | - | VMID of the guest ProxBalance runs in, so the plan puts its node last. When missing, ProxBalance looks for a guest named like the container's hostname, then a guest named `proxbalance` |

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
