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
| Mode (`mode`) | `automatic` | `automatic` or `semi`. See [Semi-automatic mode](#semi-automatic-mode) |
| Approval expiry (`approval_ttl_hours`) | `24` | Semi-automatic mode: hours a queued move waits for approval (1-168) |
| Check Interval | `5 min` | How often the engine evaluates |
| Min Confidence Score | `75` | Minimum suitability rating (0-100) |
| Max Migrations Per Run | `3` | Rate limit per cycle |
| Max Concurrent | `1` | Concurrent migration limit |
| Max Into One Node Per Run | `0` (off) | Most migrations one target node may receive in a run (0-5). See [Target inflow cap](#target-inflow-cap) |
| Cooldown | `30 min` | Time between migrations per guest |

### Semi-automatic mode

Quick Setup has a mode choice under the two switches. It acts immediately, like the switches.

| Mode | What runs on its own | What waits |
|------|----------------------|------------|
| Automatic (default) | Every move that passes the rules | Nothing |
| Semi-automatic | Maintenance evacuations, and moves whose **source** node is over its critical limit | Every other move the run would have made |

The critical limit is the pair of target safety limits under **Safety checks**: `max_node_cpu_percent` (default 85, on the ~15-minute CPU average) and `max_node_memory_percent` (default 90). A node over either one is too busy to receive guests, and in semi-automatic mode its guests can leave without approval.

The split happens after every other rule, so semi-automatic mode never runs a move that automatic mode would refuse: windows, blackouts, cooldown, confidence, Smart Migrations observation, HA rules, tag rules, target storage, the inflow cap and target safety all still apply. Affinity companions follow a move that runs, as in automatic mode.

**Waiting for approval.** Each queued move appears in Quick Setup (guest, from → to, why; the full reason, confidence and expiry under the row's arrow) with **Approve** and **Dismiss**; the dashboard's automation banner shows "N moves waiting for approval". The queue is stored in SQLite (`approval_queue`), one entry per guest:

- A later run that wants the same guest on a different target replaces the entry (and its approval).
- An entry is removed when the guest no longer has a recommendation, after `approval_ttl_hours` (default 24), or when its move runs.
- A run queues at most as many moves as it could have executed (`max_migrations_per_run` minus moves already made); the rest are recorded as lower priority, as in automatic mode.

**Approve** marks the entry approved and starts a run (the same path as Run Now), which executes it with every check evaluated again. If a check fails (for example outside the migration window, or the target is now too busy) the move stays approved and runs on a later check, until it expires or its recommendation changes. If a migration is already running, the move runs on the next check.

**Dismiss** hides the move; it is not asked again until the entry expires or the target changes.

**Dry run wins.** With dry run on, semi-automatic runs record which moves they would queue (shown as "would ask") but never write the queue, ignore approvals, and the approve endpoint refuses. `POST /api/automigrate/test` never touches the queue.

In run history a queued move has its own action, `queued`, and its own colour in Recent checks ("needs approval"). A move that ran without approval in semi-automatic mode carries `auto_run` (`evacuation`, `critical` or `approved`) and `auto_run_detail` in its decision. With `notifications.on_queued` (default on) a notification is sent once per guest and target when a move starts waiting.

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
- Cross-midnight windows are supported (`22:00` to `06:00`). A window's days are the days it starts on: a window listed for Friday covers Friday 22:00 through Saturday 06:00. (Before v2.13.1 both parts were checked against the current day, so the same window covered Friday 00:00-06:00 and Friday 22:00-24:00 instead.)
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

### Target inflow cap

`rules.max_target_inflow_per_cycle` (Automation page, What to Migrate > Limits, "Max into one node per run") caps how many migrations a single run may send to the same target node. Without it, a run with `max_migrations_per_run: 3` can move three guests onto the emptiest node before the scores are re-read, which often overshoots and starts the next run moving guests back out.

- `0` (default) turns the cap off. Valid values are 0-5; the API rejects anything else with HTTP 400, and an out-of-range value edited into `config.json` by hand is clamped.
- Each successful migration to a node counts, and so does every affinity companion that follows it there. Companions are never held back by the cap, because the group has to stay together.
- A recommendation whose target is at the cap is skipped with the reason "Target inflow cap: <node> already received N migrations this run" and `skip_code: "target_inflow_cap"` on its decision. The run then takes the next eligible recommendation for a different node, so the cap redistributes moves rather than only cutting them.
- The cap applies to maintenance evacuations too: draining a node takes more runs, but the receiving nodes are not flooded.
- Only migrations started by the current run are counted. Migrations still running from an earlier run or started by hand are covered by `max_concurrent_migrations`, not by this cap.

Manual plans on the dashboard (Suggestions > Run plan) are not blocked by the cap, in the same way `max_migrations_per_run` does not limit them. When the plan you are about to run sends more guests to one node than the cap allows, the Suggestions tab shows a warning naming the node and offers to leave the extra moves out of this run; you can still run the plan as it is.

### Target storage

A migration copies every disk on node-local storage (local-lvm, a ZFS pool, a directory) onto the storage with the same id on the target node. Before each move the engine projects that storage's usage after the copy, adding the disks of guests this run has already moved there. Shared storage (NFS, CIFS, PBS, Ceph, shared LVM/iSCSI: anything Proxmox marks `shared`) is not copied and never counts. Disk sizes are the provisioned sizes from the guest config, which is the worst case for thin storage.

- If a disk won't fit (projected usage above 100%, or more data than the storage's free space), the move is skipped with the reason "Target storage full: local-lvm on pve6: 96% → 104% (40 GB won't fit)" and `skip_code: "target_storage_full"` on its decision. This applies to maintenance evacuations and affinity companions too, because Proxmox would fail the migration anyway.
- If any storage would end above 90%, the move still runs, and its decision carries `storage_warning` (for example "Target storage nearly full: local-lvm on pve6: 85% → 95%"), which is also written to the automation log.
- The recommendation engine already avoids targets whose storage can't hold the guest, so a skip here usually means storage filled up since the recommendations were generated, or an earlier move in the same run took the room.
- No disk data (a cache from a collector before this feature) or no usage numbers for the storage means no check: missing data never blocks a move.

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
| `affinity_*` | Soft affinity: a move that splits guests sharing the same `affinity_` tag costs `affinity_soft_penalty` score points but is allowed (when `respect_affinity_rules` is `true`) |
| `affinity_req_*` | Required (hard) affinity: the group `affinity_<name>` moves together through companion migrations |
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

When the automation considers migrating a guest, it checks whether the target node already hosts another guest with the same `exclude_*` tag. If so, the migration is blocked. Anti-affinity is always a hard rule.

### Affinity rules (affinity_* tags): soft or required

Guests tagged with the same `affinity_<group>` tag prefer the same node. The rule is **soft**: when the recommendation engine scores a target that would leave the guest with fewer group members than it has now (more members on the source than on the target), it adds `affinity_soft_penalty` (default 15, the same as the default `min_score_improvement`) to that target's score. A split therefore needs about twice the usual gain, but it is allowed, and no companion migrations are generated. The recommendation lists the groups it splits in `affinity_split`, and its card says "Splits soft group ...".

To make a group **required** (hard), tag at least one member `affinity_req_<group>`. `affinity_req_web` and `affinity_web` are the same group `affinity_web`; one `affinity_req_` tag makes the whole group required. Both are valid Proxmox tags. Required groups keep the companion behaviour:

```bash
# Tag VMs that must stay together
pvesh set /nodes/pve1/qemu/200/config --tags "affinity_req_webstack"
pvesh set /nodes/pve1/qemu/201/config --tags "affinity_req_webstack"
```

Companion migration behavior (required groups only):
- The first guest recommended for migration is the **group leader**
- All other group members not already on the target node become **affinity companions**
- Companions that have the `ignore` tag, are stopped, or have pinned disks are skipped
- Recommendation cards show "AFFINITY GROUP LEADER" and "AFFINITY COMPANION" badges

Controlled by `respect_affinity_rules` (default: `true`). Turning it off disables both the soft penalty and companion migrations.

> **Upgrading:** before v2.19 every `affinity_*` group was required. Existing `affinity_*` tags are now soft. Retag a group `affinity_req_<name>` to keep companion migrations for it.

### Pool rules

Proxmox resource pools can act as affinity or anti-affinity groups. The collector reads `/pools` (read-only; the token needs `Pool.Audit` on the pools). Configure under `automated_migrations.rules`:

```json
"pool_rules": {
  "db-replicas": "anti-affinity",
  "webstack": { "type": "affinity", "required": true }
}
```

A pool's members are the guests in it. Anti-affinity pools are always hard; affinity pools are soft unless `required` is `true`. If the collector cannot read the pools, pool rules are ignored (logged once) and the rules list says so.

### Placement rules list and "Enforce now"

Automation → What to Migrate → Guest Rules lists every rule from tags and pools, marked Hard or Soft, with where its members run (expand a rule for its members). When a hard rule is broken (two anti-affinity members on one node, or a required group split across nodes), **Enforce now** shows the moves that would fix it and any guests it can't move, and asks before running them:

- Anti-affinity: on each shared node, the member that is hardest to move (unmovable, then the most memory) stays; the others go to the best-scoring node with no member.
- Required affinity: members join the node holding an unmovable member, or else the node with the most members.
- Targets respect memory capacity, other anti-affinity rules, Proxmox HA rules and maintenance mode. Soft rules are never enforced.

Confirmed moves start through the batch migrate path. When automation is in dry-run mode nothing moves and the dialog says so. See [API](API.md#placement-rules).

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

The recommendation engine also treats maintenance nodes as sources to empty (including HA-managed and ignored guests) and never as targets. Guests with passthrough disks, and VMs with PCI or USB passthrough, still cannot be moved.

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
- "Target inflow cap: <node> already received N migrations this run" -- the node reached `max_target_inflow_per_cycle` this run; the guest is reconsidered next run
- "Cluster not quorate" -- safety check
- "Maximum concurrent migrations already running" -- concurrency limit
- Mode `dry_run` -- simulation mode, nothing is executed

### Schedule says blocked although windows are defined

If every migration window is disabled, automation is blocked at all times; only an empty window list means "no restriction". Enable at least one window, or delete them all. Also check that the current day is in the window's `days` (for an overnight window, list the day it starts; the after-midnight part applies to the following day) and that `schedule.timezone` is what you expect.

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
