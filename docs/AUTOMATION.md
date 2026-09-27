# Automated Migrations

ProxBalance can automatically migrate VMs and containers based on cluster conditions, schedules, and safety rules.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Scheduling](#scheduling)
- [Safety Checks](#safety-checks)
- [Tag Behavior](#tag-behavior)
- [Maintenance Mode](#maintenance-mode)
- [Distribution Balancing](#distribution-balancing)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

---

## Quick Start

1. Open the **Automation** page (`#/automation`)
2. In **Quick Setup**, switch automation on (dry run is on by default)
3. Review the Schedule, Filters and Behavior tabs and save any edits
4. Watch the decisions in **History & Logs**, or trigger a forced dry run from the API: `curl -X POST http://<host>/api/automigrate/test`
5. Turn dry run off when ready

Recommended approach: run in dry-run mode for several days, review logs, then enable live migrations with conservative settings.

`POST /api/automigrate/test` always runs as a dry run, whatever the `dry_run` setting: it never migrates, sends no notifications and does not count as an observation for Smart Migrations. **Run Now** (on the dashboard's auto-migration banner, or `POST /api/automigrate/run`) runs a real cycle with the configured `dry_run` value.

---

## Configuration

### Web UI

The **Automation** page has a Quick Setup strip above five tabs, each deep-linkable as `#/automation/<tab>`:

| Tab | Contents |
|-----|----------|
| Schedule | When to migrate: status line, weekly grid, check interval, migration and blackout windows, timezone |
| Filters | What to migrate: recommendation thresholds, tag rules (ignore, `auto_migrate_ok` whitelist, affinity, anti-affinity), distribution balancing |
| Behavior | How to migrate: safety checks, failure handling, Smart Migrations, scoring and sensitivity |
| History & Logs | Recent migrations and the automation log |
| Reference | How decisions are made |

Quick Setup shows one status line (state, the reason, the last run and its result, and the next check) over three tiles: the automation switch, dry run, and sensitivity. The automation and dry-run switches take effect immediately, each with its own confirmation. Every other edit is staged and saved together from the "N unsaved changes · Discard · Save changes" bar; leaving the page with pending edits asks first.

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

### Sensitivity

Quick Setup's sensitivity chips set `migration_settings.sensitivity`, which scales the penalty scoring used to generate recommendations (see `GET`/`PUT /api/migration-settings`):

| Level | Behavior |
|-------|----------|
| 1 Conservative | Only clear, sustained problems |
| 2 Balanced (default) | Acts when trends show growing problems |
| 3 Aggressive | Rebalances proactively for modest gains |

Sensitivity does not change the rules above (confidence, per-run limit, cooldown).

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

- If the `migration_windows` list is empty, migrations are allowed at any time
- If the list has windows but **every one is disabled**, migrations are blocked at all times. Only an empty list means "unrestricted". The dashboard banner and the Automation page apply the same rule
- A window matches only on its listed `days`. Start and end times are inclusive
- Cross-midnight windows are supported (`22:00` to `06:00`). Both parts are checked against the current day, so a window listed for Friday covers Friday 00:00-06:00 and Friday 22:00-24:00, not Saturday morning. List the following day too if you want the whole night
- Times are evaluated in the window's `timezone` if set, otherwise in `schedule.timezone` (default `UTC`). The web UI sets `schedule.timezone` for all windows

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

1. If migration windows are defined and none is active (including when all are disabled): skip
2. If an enabled blackout window is active: skip
3. Otherwise: evaluate and migrate

The dashboard's auto-migration banner and the Automation page's status line evaluate the saved schedule with the same rules and say when automation can next act (for example "outside migration windows · can act next Sun 03:00").

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
| `no-auto-migrate` | Guest is never auto-migrated (alternative to `ignore`) |
| `exclude_*` | Anti-affinity: guests sharing the same `exclude_` tag are kept on separate nodes (when `respect_exclude_tags` is `true`) |
| `affinity_*` | Pro-affinity: guests sharing the same `affinity_` tag are kept together on the same node (when `respect_affinity_rules` is `true`) |
| `auto_migrate_ok` | Whitelist mode: only tagged guests are migrated (when `require_auto_migrate_ok_tag` is `true`). The older `auto-migrate-ok` spelling also works |

### Ignore and no-auto-migrate

Both `ignore` and `no-auto-migrate` prevent a guest from being automatically migrated. They are checked independently — a guest with either tag is skipped. The `ignore` tag is controlled by the `respect_ignore_tags` setting, while `no-auto-migrate` is always enforced.

The installer automatically applies the `ignore` tag to the ProxBalance container itself to prevent the automation from migrating its own service.

### Anti-affinity (exclude_* tags)

Guests tagged with the same `exclude_<group>` tag are prevented from being placed on the same node. This is useful for separating redundant services (e.g., two database replicas).

```bash
# Tag two database VMs to stay on separate nodes
pvesh set /nodes/pve1/qemu/101/config --tags "exclude_database"
pvesh set /nodes/pve2/qemu/102/config --tags "exclude_database"
```

When the automation considers migrating a guest, it checks whether the target node already hosts another guest with the same `exclude_*` tag. If so, the migration is blocked.

### Affinity rules (affinity_* tags)

Guests tagged with the same `affinity_<group>` tag are kept together on the same node. When one member of an affinity group is recommended for migration, all other members are automatically recommended to follow to the same target node ("companion migrations").

```bash
# Tag VMs that should stay together
pvesh set /nodes/pve1/qemu/200/config --tags "affinity_webstack"
pvesh set /nodes/pve1/qemu/201/config --tags "affinity_webstack"
pvesh set /nodes/pve1/qemu/202/config --tags "affinity_webstack"
```

Companion migration behavior:
- The first guest recommended for migration is the **group leader**
- All other group members not already on the target node become **affinity companions**
- Companions that have the `ignore` tag, are stopped, or have pinned disks are skipped
- The dashboard displays split detection warnings when affinity group members are on different nodes
- Recommendation cards show "AFFINITY GROUP LEADER" and "AFFINITY COMPANION" badges

Controlled by `respect_affinity_rules` (default: `true`).

### Whitelist mode

When `require_auto_migrate_ok_tag` is enabled, only guests with the `auto_migrate_ok` tag (the tag the web UI applies) are considered for automated migration. The older `auto-migrate-ok` spelling is also accepted. All other guests are skipped regardless of cluster conditions.

### Maintenance mode override

During maintenance evacuations, tag restrictions are bypassed. All guests on a maintenance node are migrated regardless of `ignore`, `no-auto-migrate`, or `exclude_*` tags. See [Maintenance Mode](#maintenance-mode).

---

## Maintenance Mode

Maintenance mode is stored on the server in `automated_migrations.maintenance_nodes`, so every browser and the automation service see the same list. Put a node into maintenance from its node window on the dashboard (you are asked to confirm), or by posting the list to `POST /api/automigrate/config` (see [API](API.md#maintenance-mode)).

What happens next depends on the automation state:

- **Live automation:** the next run starts moving every guest off the node, running and stopped, up to `max_migrations_per_run` per run. Maintenance moves bypass the observation period, cooldown, confidence threshold, conflict gate and ignore/exclude tags. Migration and blackout windows still apply.
- **Dry run or automation off:** nothing moves on its own. Use the node's evacuation plan to move guests manually.

The recommendation engine also treats maintenance nodes as sources to empty (including HA-managed and ignored guests) and never as targets. Guests with passthrough disks still cannot be moved.

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

- **Dashboard banner**: automation state, when the schedule next lets it act (or which blackout is active), the last move, a "Watching N guests" list of guests under observation, and **Run Now**
- **Active Migrations KPI**: migrations in flight, with progress and a Cancel button
- **Automation page, Quick Setup**: state, reason, last run result and the next check (with "will skip" when the schedule blocks it)
- **History & Logs tab**: paginated recent migrations with status and decisions, and a log viewer (last 500 lines of the automation journal) with Download
- **Insights page**: measured migration outcomes (source-node CPU and memory before, and 5 minutes and 24 hours after, each move)

Migration outcomes are recorded for automated migrations (after the Proxmox task completes), affinity companion migrations and manual migrations. Post-migration snapshots taken long after their window (for example after downtime) are flagged `late` and left out of the comparisons.

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

### History via the API

```bash
# Automation runs with their decisions
curl "http://<host>/api/automigrate/history?type=runs&limit=20"

# Individual migrations
curl "http://<host>/api/automigrate/history?type=migrations&limit=100"
```

---

## Troubleshooting

### Automation not running

```bash
# Check timer is enabled
pct exec <ctid> -- systemctl is-enabled proxmox-balance-automigrate.timer

# Check timer schedule — should show a future NEXT timestamp
pct exec <ctid> -- systemctl list-timers proxmox-balance-automigrate.timer

# Check config
pct exec <ctid> -- jq '.automated_migrations.enabled' /opt/proxmox-balance-manager/config.json
```

If `NEXT` is `n/a`, the timer has no future trigger. As of v2.9.0 the unit
uses wall-clock `OnCalendar=*:0/N` so this should be self-healing — but
older installs may still carry the legacy `OnUnitActiveSec=` drop-in,
which silently breaks the schedule the first time the service exits
non-zero. Either run `bash post_update.sh` (auto-migrates the drop-in)
or rewrite it manually:

```bash
pct exec <ctid> -- bash -c '
  cat > /etc/systemd/system/proxmox-balance-automigrate.timer.d/interval.conf <<EOF
[Timer]
OnUnitActiveSec=
OnCalendar=
OnCalendar=*:0/30
EOF
  systemctl daemon-reload
  systemctl restart proxmox-balance-automigrate.timer
'
```

### Migrations skipped

Check the run decisions (History & Logs) or the journal for skip reasons:

- "In cooldown period" -- guest was recently migrated
- "Confidence N% below minimum M%" -- suitability too low
- "Outside all migration windows" -- scheduling restriction (also shown when every migration window is disabled)
- "In blackout: <name>" -- blocked by a blackout window
- "Migration conflict on target <node>" -- several moves into one node would exceed the safety limits
- "Cluster not quorate" -- safety check
- "Maximum concurrent migrations already running" -- concurrency limit
- Mode `dry_run` -- simulation mode, nothing is executed

### Schedule says blocked although windows are defined

If every migration window is disabled, automation is blocked at all times; only an empty window list means "no restriction". Enable at least one window, or delete them all. Also check that the current day is in the window's `days` (for an overnight window, the after-midnight part only matches on the listed days) and that `schedule.timezone` is what you expect.

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
