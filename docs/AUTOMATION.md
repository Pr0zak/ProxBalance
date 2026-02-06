# Automated Migrations

ProxBalance can automatically migrate VMs and containers based on cluster conditions, schedules, and safety rules.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Scheduling](#scheduling)
- [Safety Checks](#safety-checks)
- [Tag Behavior](#tag-behavior)
- [Distribution Balancing](#distribution-balancing)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

1. Open the Automated Migrations section on the dashboard
2. Click "Configure"
3. Enable automation (dry-run is on by default)
4. Test with "Test Now" to review what would happen
5. Disable dry-run when ready

Recommended approach: run in dry-run mode for several days, review logs, then enable live migrations with conservative settings.

---

## Configuration

### Web UI

The configuration panel is accessible from the Automated Migrations widget on the dashboard.

### Key settings

| Setting | Default | Description |
|---------|---------|-------------|
| Enable Automation | `false` | Master switch |
| Dry Run | `true` | Simulate without executing |
| Check Interval | `5 min` | How often the engine evaluates |
| Min Confidence Score | `75` | Minimum suitability rating (0-100) |
| Max Migrations Per Run | `3` | Rate limit per cycle |
| Max Concurrent | `1` | Concurrent migration limit |
| Cooldown | `30 min` | Time between migrations per guest |

### Presets

The web UI offers three presets:

| Preset | Confidence | Max/Run | Cooldown | Description |
|--------|-----------|---------|----------|-------------|
| Conservative | 85 | 1 | 60 min | Minimal intervention |
| Balanced | 75 | 3 | 30 min | Default recommended |
| Aggressive | 60 | 5 | 15 min | Active load balancing |

### Direct config editing

```bash
pct exec <ctid> -- nano /opt/proxmox-balance-manager/config.json
```

See [Configuration Reference](CONFIGURATION.md) for all available options.

---

## Scheduling

### Migration windows

Define when migrations are allowed:

```json
"migration_windows": [
    {
        "name": "Nightly Window",
        "enabled": true,
        "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "start_time": "22:00",
        "end_time": "06:00",
        "timezone": "America/New_York"
    }
]
```

- If no windows are defined, migrations are allowed at any time
- Cross-midnight windows are supported (`22:00` to `06:00`)
- All times are in the specified timezone

### Blackout windows

Define when migrations are blocked. Blackout windows always override migration windows.

```json
"blackout_windows": [
    {
        "name": "Business Hours",
        "enabled": true,
        "days": ["monday", "tuesday", "wednesday", "thursday", "friday"],
        "start_time": "08:00",
        "end_time": "18:00"
    }
]
```

### Evaluation logic

1. If a blackout window is active: skip
2. If migration windows are defined and none are active: skip
3. Otherwise: evaluate and migrate

---

## Safety Checks

Safety checks run before every migration. If any check fails, the migration is skipped.

| Check | Default | Description |
|-------|---------|-------------|
| Cluster health | `true` | Verifies the cluster is healthy |
| Require quorum | `true` | Ensures a majority of nodes are online |
| Max node memory | `90%` | Rejects target nodes above this memory threshold |
| Max node CPU | `85%` | Rejects target nodes above this CPU threshold |
| Abort on failure | `true` | Disables automation after a migration failure |

### Duplicate migration prevention

Before starting a migration, the engine queries the Proxmox task API for running migrations. If a guest already has an active migration, it is skipped. This prevents lock conflicts from overlapping automation cycles.

### Rollback detection

The engine tracks recent migration history to detect "ping-pong" scenarios where a guest is migrated back and forth. Rollbacks are logged and the guest is placed on cooldown.

---

## Tag Behavior

| Tag | Effect on automation |
|-----|---------------------|
| `ignore` | Guest is never auto-migrated (when `respect_ignore_tags` is `true`) |
| `exclude_*` | Anti-affinity is enforced (when `respect_exclude_tags` is `true`) |
| `auto-migrate-ok` | Whitelist mode: only tagged guests are migrated (when `require_auto_migrate_ok_tag` is `true`) |

### Whitelist mode

When `require_auto_migrate_ok_tag` is enabled, only guests with the `auto-migrate-ok` tag are considered for automated migration. All other guests are skipped regardless of cluster conditions.

### Maintenance mode override

During maintenance evacuations, tag restrictions are bypassed. All guests on a maintenance node are migrated regardless of `ignore` or `exclude_*` tags.

---

## Distribution Balancing

Addresses uneven guest counts across nodes, independent of resource usage.

```json
"distribution_balancing": {
    "enabled": false,
    "guest_count_threshold": 2,
    "max_cpu_cores": 2,
    "max_memory_gb": 4
}
```

- **Threshold**: Only triggers when the difference in guest counts between nodes exceeds this value
- **Size limits**: Only considers small guests (by CPU and memory) to minimize migration impact
- Set `max_cpu_cores` or `max_memory_gb` to `0` for no limit

---

## Monitoring

### Web UI

The automation dashboard provides:

- **Status**: Active/disabled, dry-run indicator, next check countdown
- **Statistics**: 24-hour and 7-day counts, success rates
- **In-progress**: Live progress with transfer rate and elapsed time
- **Recent migrations**: Last 10 completed, with status, duration, and confidence
- **Activity log**: Decisions and skip reasons
- **History chart**: 7-day visual breakdown
- **Log viewer**: Terminal-style log display (last 500 lines)

### Command line

```bash
# Follow logs in real-time
pct exec <ctid> -- journalctl -u proxmox-balance-automigrate.service -f

# View recent logs
pct exec <ctid> -- journalctl -u proxmox-balance-automigrate.service -n 100

# Check timer status
pct exec <ctid> -- systemctl list-timers proxmox-balance-automigrate.timer

# Search for a specific guest
pct exec <ctid> -- journalctl -u proxmox-balance-automigrate.service | grep "VM 120"
```

### CSV export

Download migration history from the web UI for offline analysis. Includes timestamps, guest IDs, source/target nodes, confidence scores, and status.

---

## Troubleshooting

### Automation not running

```bash
# Check timer is enabled
pct exec <ctid> -- systemctl is-enabled proxmox-balance-automigrate.timer

# Check timer schedule
pct exec <ctid> -- systemctl list-timers proxmox-balance-automigrate.timer

# Check config
pct exec <ctid> -- jq '.automated_migrations.enabled' /opt/proxmox-balance-manager/config.json
```

### Migrations skipped

Check the activity log or journal for skip reasons:

- "Cooldown active" -- guest was recently migrated
- "Below confidence threshold" -- suitability too low
- "Outside migration window" -- scheduling restriction
- "Blackout window active" -- blocked by blackout period
- "Already has active migration" -- duplicate prevention
- "Cluster health check failed" -- safety check
- "Dry run" -- simulation mode

### Migrations failing

```bash
# View error details
pct exec <ctid> -- journalctl -u proxmox-balance-automigrate.service | grep -i "error\|failed"

# Check Proxmox tasks
pvesh get /cluster/tasks | jq '.[] | select(.status != "OK")'
```

Common causes: storage incompatibility, insufficient resources on target, guest locked by another operation, API token lacks migration permissions.

---

[Back to Documentation](README.md)
