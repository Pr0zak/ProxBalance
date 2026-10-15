# Scoring Algorithm

This document describes ProxBalance's penalty-based scoring system for evaluating migration targets.

---

## Overview

ProxBalance uses cumulative penalties instead of hard disqualifications. Every online node remains a potential migration target, but undesirable conditions increase a node's penalty score. Nodes are ranked by penalty (lowest = best), then scores are converted to suitability ratings (0-100%) for display.

### Design Principles

1. **No hard disqualifications** -- every online node is always a candidate
2. **Cumulative penalties** -- multiple factors add up
3. **Relative comparison** -- nodes are ranked against each other, not against absolute thresholds
4. **Flexible** -- overloaded nodes can always be evacuated
5. **Configurable** -- penalty weights can be tuned through the web UI

---

## Suitability Rating

The suitability rating converts raw penalty scores into a percentage:

```
Suitability = 100 - ((node_penalty - best_penalty) / (worst_penalty - best_penalty) * 100)
```

- **100%** = best available target (lowest penalty)
- **75-99%** = good target
- **50-74%** = acceptable target
- **25-49%** = poor target
- **0%** = worst available target (highest penalty)

The best node always gets 100% and the worst gets 0%. Other nodes are distributed proportionally.

---

## Penalty Factors

### CPU usage

Nodes with CPU above 70% receive 10 penalty points per percentage point over the threshold.

```
if cpu > 70%: penalty += (cpu - 70) * 10
```

Example: 85% CPU = 150 points.

### Memory usage

Same formula as CPU, triggered above 70%.

```
if memory > 70%: penalty += (memory - 70) * 10
```

### IOWait

Higher weight (20x) because I/O bottlenecks severely impact VM performance.

```
if iowait > 5%: penalty += iowait * 20
```

Example: 15% IOWait = 300 points.

### IO pressure (PSI)

A companion to IOWait. Linux pressure stall information ("some") is the share of time at least one task was stalled waiting on disk. IOWait only counts CPU time that was otherwise idle, so a busy node can stall on disk with little IOWait; IO pressure still shows it.

Proxmox VE 9 reports it in the RRD data (`pressureiosome`, `pressureiofull`, plus `pressurecpusome`, `pressurememorysome`/`full`) for nodes and guests, already as a percentage. The collector keeps:

- node `metrics`: `recent_io_pressure` (~15-minute average), `current_io_pressure`, `avg_io_pressure`, `max_io_pressure` (24 h), `avg_io_pressure_week` (7 d), `recent_io_pressure_full`, `avg_io_pressure_full_week`, `recent_cpu_pressure`, `recent_mem_pressure`
- node `trend_data` points: `io_pressure`
- guests: `io_pressure`, `io_pressure_full`, `cpu_pressure`, `mem_pressure` (~15-minute averages)
- `node_metrics` / `guest_metrics` tables: an `io_pressure` column

Only the 7-day average is scored, so it matters only when pressure is high for days, never for a burst:

| 7-day avg IO pressure | Penalty key | Default points |
|---|---|---|
| > 50% | `io_pressure_sustained_critical` | 25 |
| > 30% | `io_pressure_sustained_high` | 10 |

The points land in `penalties.io_pressure_sustained` and count towards the IOWait category. Like the sustained IOWait penalties they apply only when `weight_7d > 0`, scale with the sensitivity setting, and are dropped on an IOWait-exempt node (a guest with its own disks causes both).

When Proxmox reports no PSI (Proxmox VE 8), none of these fields exist: missing is never stored as 0, the `io_pressure_sustained` key is absent and the score is exactly what it was without this feature.

### Guest count

Discourages concentrating too many guests on one node.

```
penalty += guest_count * 5
```

### Maintenance mode

Massive penalty to effectively exclude maintenance nodes unless no alternatives exist.

```
if maintenance: penalty += 10000
```

### Storage incompatibility

High penalty when the target node lacks required storage, but not infinite -- emergency evacuations can still use incompatible nodes.

```
if missing_storage: penalty += 5000
```

### Anti-affinity violation

Strong discouragement when the target already hosts a guest with the same `exclude_*` tag.

```
if affinity_conflict: penalty += 1000
```

Recommendations, automation, evacuations and Enforce now also treat anti-affinity as a hard rule and skip such a target outright; the penalty covers the node scores shown in the UI.

### Soft affinity split

Guests sharing an `affinity_<group>` tag (or an affinity pool in `rules.pool_rules`) prefer the same node. When the recommendation engine scores a target that would leave the guest with fewer group members than it has now (more members on the source than on the target, counting moves already planned in this run), it adds `affinity_soft_penalty` points to that target's score:

```
if splits_soft_group(guest, target): score += affinity_soft_penalty   # default 15, range 0-100
```

The default equals the Balanced `min_score_improvement` (15), so a split needs about twice the usual gain. The move is allowed; the recommendation lists the groups it splits in `affinity_split`, and its card says "Splits soft group ...". `0` turns the penalty off, and so does `respect_affinity_rules: false`. Required groups (`affinity_req_<group>`) are not penalised: they move together through companion migrations (below).

### Source node

Prevents recommending migration to the node the guest is already on.

```
if target == source: penalty += 999999
```

---

## Anchored Load

Some guests never move under normal operation: they carry the `ignore` tag or are pinned by passthrough disks (a NAS VM, a camera recorder). Their CPU is a fixed baseline on their host, so counting it as load ProxBalance could relieve makes the host look permanently overloaded and pushes every other guest off it without ever bringing CPU down.

For each node, the engine sums the CPU of its running anchored guests (each guest's last-hour average, as a share of the node's CPU) into `anchored_cpu`, capped at 90%. When deciding whether a node needs relief, and how much a move gives, node CPU is re-expressed as a share of the capacity the anchored guests leave free:

```
movable_cpu = (node_cpu - anchored_cpu) / (100 - anchored_cpu) * 100
```

Example: nas-01 holds 50% of cygnus. cygnus at 60% has 10 of its 50 free points in use, so movable CPU is 20% and cygnus is not a source. At 92%, movable CPU is 84%, above a 70% threshold, so ProxBalance moves guests off it.

Anchored load still counts in full when a node is scored as a migration **target**, because an incoming guest will compete with it. The node-scores API returns `anchored_cpu` and `anchored_guests` for each node.

### Per-guest relief

A node-versus-node score difference says nothing about the guest being moved: a guest using 1% CPU and one using 30% got the same improvement, so the cheapest guests moved first and the source never improved. The improvement is now scaled by how much of the source's excess this guest would remove:

```
relief_fraction = min(1, guest_cpu_relief / cpu_excess)       # memory: same with mem relief / (mem - floor)
score_improvement = (source_score - target_score) * relief_fraction
```

Maintenance evacuations and IOWait relief keep the full difference. A guest whose scaled improvement falls below `min_score_improvement` is skipped with a detail saying what share of the excess it would have removed.

### Smoothed readings

"Current" CPU and IOWait are the average of the last ~15 one-minute RRD points (`recent_cpu`, `recent_iowait`) rather than the single sample taken at collection time. Source gating, current-load penalties, conflict detection and the automigrate target safety check all use them, so one sample landing on a short burst can't trigger a migration.

---

## Recommendation Generation

### Process

1. **Identify guests needing migration**: source node in maintenance, IOWait-stressed, at or above the memory floor (`source_mem_migration_floor`, default 65%), or with time-weighted movable CPU (see Anchored Load) at or above the CPU threshold. Guests on a node whose CPU is over the threshold only because of anchored guests are skipped as `source_load_anchored`
2. **Score all targets**: For each candidate guest, calculate penalties for every online node
3. **Rank by penalty**: Sort targets lowest-first
4. **Convert to suitability ratings**: Normalize to 0-100%
5. **Generate recommendations**: Create migration suggestions for guests where the best target meets the minimum threshold
6. **Generate companion migrations**: For guests in a required affinity group (`affinity_req_*`, or a pool rule with `required: true`), add recommendations for the other group members to follow to the same target node

### Affinity companion generation

After standard recommendations are generated, the engine checks each recommended guest for required affinity groups. If a guest belongs to one, all other group members not already on the target node are added as companion migration recommendations. Companions that have `ignore` tags, are stopped, or have pinned disks are skipped.

### Execution priority

When multiple migrations are recommended:

1. Maintenance evacuations (highest)
2. Anti-affinity violations
3. Overloaded node evacuations
4. Affinity companion migrations
5. Load balancing optimizations (lowest)

---

## Time Period Weights

The algorithm blends current metrics with historical data:

```
weighted_value = current * weight_current + avg_24h * weight_24h + avg_7d * weight_7d
```

`current` is the ~15-minute average described under Smoothed readings, not the instantaneous sample.

Default weights:
- Current: 0.5
- 24-hour average: 0.3
- 7-day average: 0.2

Weights must sum to 1.0. Configurable through Settings > Penalty Scoring Configuration.

**Presets:**
- Balanced (default): `0.5 / 0.3 / 0.2`
- Short-term focus: `0.6 / 0.4 / 0.0`
- Historical focus: `0.2 / 0.5 / 0.3`

---

## Configuration

### Web UI

1. Open Settings
2. Expand "Penalty Scoring Configuration"
3. Adjust time period weights and penalty values
4. Click "Save Penalty Config"

### Minimum suitability threshold

Controls the minimum rating for automated migrations to execute. Set in the automation rules:

| Setting | Threshold | Behavior |
|---------|-----------|----------|
| Conservative | 80-90% | Fewer migrations, only excellent targets |
| Balanced | 75% (default) | Standard operation |
| Aggressive | 50-60% | More migrations, accepts suboptimal targets |

---

## Examples

### Simple load balancing

VM 101 on node1 (CPU 85%, memory 70%). Two targets available:

| Node | CPU penalty | Memory penalty | Guest count penalty | Total |
|------|------------|----------------|-------------------|-------|
| node2 (CPU 40%, 12 guests) | 0 | 0 | 60 | 60 |
| node3 (CPU 60%, 8 guests) | 0 | 0 | 40 | **40** |

Result: node3 = 100% suitability, node2 = 0%. Migrate to node3.

### IOWait impact

VM 102 needs migration. Two targets:

| Node | CPU penalty | IOWait penalty | Guest count penalty | Total |
|------|------------|----------------|-------------------|-------|
| node2 (CPU 50%, IOWait 15%) | 0 | 300 | 50 | 350 |
| node3 (CPU 65%, IOWait 3%) | 0 | 0 | 45 | **45** |

Result: node3 = 100% despite higher CPU, because IOWait penalties dominate. Migrate to node3.

### Anti-affinity

VM 201 tagged `exclude_firewall`. VM 202 (same tag) already on node2:

| Node | Resource penalties | Affinity penalty | Total |
|------|-------------------|-----------------|-------|
| node2 (CPU 40%) | 50 | 1000 | 1050 |
| node3 (CPU 60%) | 60 | 0 | **60** |

Result: node3 = 100%. The affinity violation makes node2 unsuitable.

### Pro-affinity companion migration

VM 300 and VM 301 are both in the required group `affinity_webstack` (VM 300 is tagged `affinity_req_webstack`). VM 300 is on node1 (overloaded), VM 301 is on node2. The engine recommends migrating VM 300 to node3:

1. VM 300 is scored and recommended to move from node1 → node3 (group leader)
2. VM 301 is in the same group and is on node2 (not node3), so it is added as a companion
3. Both VMs end up on node3, keeping the affinity group together

### Maintenance evacuation

Node1 in maintenance. Both remaining nodes are loaded:

| Node | CPU penalty | Memory penalty | IOWait penalty | Total |
|------|------------|----------------|----------------|-------|
| node2 (CPU 75%, mem 80%, IOWait 8%) | 50 | 100 | 160 | **310** |
| node3 (CPU 85%, mem 90%, IOWait 12%) | 150 | 200 | 240 | 590 |

Result: node2 = 100%, node3 = 0%. No hard disqualification means evacuation always succeeds -- guests migrate to node2 first, and to node3 once node2 penalties increase.

---

## Explaining a headroom figure

The headroom shown on the dashboard is `100 − min(score, 100)`, where
`score = base load + penalty points` and the base load is
`current load × 25% + load after a small guest × 40% + capacity in use × 20% + local storage fill × 15%`.
`/api/node-scores` returns this itemised (`penalty_items`, `score_breakdown`) and the
dashboard lists it in the Cluster Health breakdown ("Why N?") and the node side panel,
e.g. `CPU peak this week 82% (over 80%) → +10`. Penalties scaled by the stable-CPU factor
or the 60-point memory cap show the adjustment next to them, so the lines always add up
to the score.

The cluster summary also reports a **spread**: max − min across online nodes for memory %
and CPU % (the 15-minute average), with the coefficient of variation. It is shown next to
the health figure and is informational; it does not change any score.

---

[Back to Documentation](README.md)
