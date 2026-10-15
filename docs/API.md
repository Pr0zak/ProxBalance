# API Reference

ProxBalance exposes a REST API on port 5000 (proxied through Nginx on port 80). All endpoints are prefixed with `/api/`.

If `api_key` is set in `config.json`, every `/api/` endpoint except `/api/health` requires the key, sent as `X-API-Key: <key>` or `Authorization: Bearer <key>`. A missing or wrong key returns `401` with `{"error": true, "message": "Invalid or missing API key"}`.

---

## Table of Contents

- [Health and Status](#health-and-status)
- [Cluster Data](#cluster-data)
- [Recommendations](#recommendations)
- [Migrations](#migrations)
- [Node Operations](#node-operations)
- [Guest Operations](#guest-operations)
- [Automation](#automation)
- [AI Recommendations](#ai-recommendations)
- [Configuration](#configuration)
- [Notifications](#notifications)
- [System Management](#system-management)
- [Logs](#logs)
- [Advanced Recommendation, Trend and Outcome Endpoints](#advanced-recommendation-trend-and-outcome-endpoints)

---

## Health and Status

### GET /api/health

Returns API health status. This endpoint never requires the API key.

```bash
curl http://<host>/api/health
```

```json
{
  "status": "ok"
}
```

### GET /api/metrics

Prometheus metrics in the text exposition format (`Content-Type: text/plain; version=0.0.4`), not the JSON envelope. Values come from the cluster cache, `config.json` and the SQLite database; a scrape never calls the Proxmox API. Unknown values are left out rather than reported as 0. If the metrics cannot be built at all, the endpoint answers `503` with a body containing only `proxbalance_up 0`. Like the other `/api/` endpoints it needs the API key only when `api_key` is set.

```bash
curl http://<host>/api/metrics
```

```text
# HELP proxbalance_up 1 when the cluster cache was read, 0 when it is missing or unreadable.
# TYPE proxbalance_up gauge
proxbalance_up 1
# HELP proxbalance_node_cpu_recent_percent Node CPU usage averaged over the last 15 minutes, percent (what scoring uses).
# TYPE proxbalance_node_cpu_recent_percent gauge
proxbalance_node_cpu_recent_percent{node="pve3"} 23.4
```

The full metric list, a Prometheus scrape config and a Grafana dashboard are in [PROMETHEUS.md](PROMETHEUS.md).

---

## Cluster Data

### GET /api/analyze

Returns full cluster analysis including nodes, guests, and metrics.

```bash
curl http://<host>/api/analyze
```

When nothing has been collected yet, it returns `503` and does **not** start a collection (a read never starts work). Start one with `POST /api/refresh`, then read again in 30-60 seconds:

```json
{
  "success": false,
  "error": "No data collected yet. Use Collect now (POST /api/refresh) and refresh in 30-60 seconds.",
  "no_data": true,
  "collection_triggered": false
}
```

### GET /api/cluster-summary

Returns a summary of cluster state (node count, guest count, resource totals).

With no collected data it returns the same `503` no-data body as `GET /api/analyze` and does not start a collection.

Includes `cluster_spread` (also added to `GET /api/analyze` data and the `POST /api/node-scores` response): for `memory` and `cpu`, the `min`/`max` (with `min_node`/`max_node`), `spread` (max − min, percentage points), `mean`, `cv` (population std-dev ÷ mean) and `nodes` counted, over online nodes only. CPU is the ~15-minute `recent_cpu` that scoring uses. A metric with fewer than two readings is `null`.

### GET /api/nodes-only

Returns node data without guest details.

### GET /api/guests-only

Returns guest data without node details.

Each guest has a `disks` list: its storage-backed volumes from the guest config, `{key, storage, volume, size_gb}`, where `size_gb` is the provisioned size (`null` when the config gives none, as for most unused disks). Bind mounts, passthrough devices and CD-ROM drives are left out. Node storage entries (in `/api/cluster-analysis` and `/api/nodes-only`) carry `shared` (Proxmox's flag) next to `total_gb`, `used_gb`, `avail_gb` and `usage_pct`.

### POST /api/refresh

Triggers an immediate data collection from the Proxmox API. This is the only way to start a collection on demand (the dashboard's **Collect now**); the read endpoints never start one.

```bash
curl -X POST http://<host>/api/refresh
```

### POST /api/pve-crs

Writes Proxmox Cluster Resource Scheduler settings to `/cluster/options` (the `crs` property in `datacenter.cfg`), then triggers a collection so the dashboard reflects the change. The API token needs `Sys.Modify` on `/`; without it the endpoint returns `403` with an explanation.

| Field | Type | Description |
|-------|------|-------------|
| `ha` | string | `basic`, `static` or `dynamic` (default `basic`) |
| `ha-rebalance-on-start` | bool | Optional |
| `ha-auto-rebalance` | bool | Optional |
| `ha-auto-rebalance-threshold` | int | Optional, 0-100 |
| `ha-auto-rebalance-margin` | int | Optional, 0-100 |
| `ha-auto-rebalance-hold-duration` | int | Optional, 0-1000 |
| `ha-auto-rebalance-method` | string | Optional, `bruteforce` or `topsis` |

```bash
curl -X POST http://<host>/api/pve-crs \
  -H "Content-Type: application/json" \
  -d '{"ha": "dynamic", "ha-auto-rebalance": true}'
```

```json
{ "success": true, "crs": "ha=dynamic,ha-auto-rebalance=1" }
```

### GET /api/score-history

Returns cluster health score snapshots for timeline charting, oldest first. One snapshot is written each recommendation cycle.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | int | 168 | Maximum rows (or buckets) to return, most recent N |
| `bucket` | int | 0 | Bucket size in minutes (for example 60, 360, 1440). When set, samples are grouped into time buckets and averaged. When 0 or omitted, raw rows are returned |

```bash
curl "http://<host>/api/score-history?limit=48&bucket=60"
```

```json
{
  "success": true,
  "bucket_minutes": 60,
  "history": [
    {
      "timestamp": "2026-02-08T10:00:00+00:00",
      "cluster_health": 72.4,
      "recommendation_count": 3,
      "nodes": {
        "pve1": {"suitability": 68.2, "cpu": 41.5, "mem": 63.0},
        "pve2": {"suitability": 77.9, "cpu": 22.1, "mem": 48.7}
      }
    }
  ]
}
```

In bucketed results, each node's `suitability`, `cpu` and `mem` are averaged independently over the samples in the bucket, so a sample missing one field does not skew the others. Nodes with no suitability value in a bucket are left out. `recommendation_count` is summed across the bucket.

---

## Recommendations

### POST /api/recommendations

Generates migration recommendations based on the given thresholds and caches the result.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `cpu_threshold` | number | 60 | CPU % that triggers recommendations |
| `mem_threshold` | number | 70 | Memory % that triggers recommendations |
| `iowait_threshold` | number | 30 | IOWait % that triggers recommendations |
| `maintenance_nodes` | array | `[]` | Nodes whose guests should be evacuated |

```bash
curl -X POST http://<host>/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{"cpu_threshold": 60, "mem_threshold": 70}'
```

The response contains `recommendations`, `skipped_guests`, `summary`, `conflicts`, `capacity_advisories`, `forecasts` and `execution_plan`.

**Batch impact (`summary.batch_impact`)** predicts the cluster after all recommended moves:

| Field | Description |
|-------|-------------|
| `before.node_scores` / `after.node_scores` | Per-node `cpu`, `mem` and `guest_count` before and after |
| `before.score_variance` / `after.score_variance` | Spread of node load |
| `improvement` | `health_delta`, `variance_reduction_pct`, `all_nodes_improved` |
| `moves` | One entry per recommendation: `vmid`, `source_node`, `target_node`, `source_cpu`, `source_mem`, `target_cpu`, `target_mem` (percentage points) and `health_delta` |
| `limits` | The per-node safety limits `{"cpu": %, "mem": %}` that conflicts are checked against |

Each move is estimated on its own: the target side uses the guest's allocated memory and the engine's predicted CPU (conservative), while the source side only gets back what the guest actually uses right now. Deltas are summed and clamped to 0-100 once at the end. Because `moves` is included, a client can recompute the "after" picture for any subset of the recommendations with the same math.

**Conflicts (`conflicts[]`)** are flagged when several recommendations target the same node and their combined predicted load would exceed the limits:

```json
{
  "target_node": "pve2",
  "incoming_guests": [{"vmid": 101, "name": "app-01", "predicted_cpu_impact": 8.5, "predicted_mem_impact": 12.5}],
  "outgoing_guests": [{"vmid": 105, "name": "cache-01", "freed_cpu": 3.1, "freed_mem": 4.0}],
  "combined_predicted_cpu": 71.0,
  "combined_predicted_mem": 93.4,
  "cpu_threshold": 85,
  "mem_threshold": 90,
  "exceeds_cpu": false,
  "exceeds_mem": true,
  "resolution": "Consider moving app-01 (VM 101) to pve3 instead",
  "resolution_action": "retarget",
  "resolution_vmid": 101,
  "resolution_name": "app-01",
  "resolution_target": "pve3"
}
```

- `resolution_action` is `retarget` (send `resolution_vmid` to `resolution_target`) or `defer` (leave it out of this run; `resolution_target` is `null`). The alternative target is never the guest's own source node.
- `outgoing_guests` lists recommended moves off the conflicted node with what they would free. They are reported but not subtracted from the combined load, because automation filters recommendations independently and an outgoing move may not run.
- Recommendations involved in a conflict carry `has_conflict: true` and `conflict_target`. Automated migrations skip conflicted recommendations (except maintenance evacuations).

**Seen counts (`seen_*`)**: when automation and intelligent migrations are both enabled, each recommendation that automation has observed also carries how settled it is. These fields are read live from automation's tracking on every request (GET and POST); they are not stored in the recommendations cache.

| Field | Meaning |
|-------|---------|
| `seen_count` | Consecutive automation runs that recommended moving this guest. Automation acts once it reaches `seen_required`. Counted per guest, not per target: a change of target does not restart it, but a run without the guest does. |
| `seen_required` | The configured `observation_periods`. |
| `seen_same_target` | How many of those runs, counting back from the latest, named the current `target_node`. `0` if automation last saw another target; `null` if unknown. |
| `seen_status` | `observing` or `ready` (count and minimum data time both met). |
| `seen_last_at` | When automation last saw it (ISO 8601). |

The fields are omitted, never zero-filled, when the count is unknown: automation or intelligent migrations off, the guest never observed or dropped from the last run, maintenance evacuations and distribution balancing (which skip the count), or automation not having refreshed the entry within 3 check intervals (at least 30 minutes).

**Target storage (`target_storage`, `target_storage_level`)**: every recommendation carries the projected usage of the target node's local storage after the move, for each storage that would receive a copied disk. Shared storage (the collector's `shared` flag; NFS, CIFS, PBS, Ceph, shared LVM/iSCSI) is never listed, so a guest whose disks are all on shared storage gets an empty list. Moves earlier in the list into the same target are counted first (and in-flight moves when the engine knows them).

```json
"target_storage": [
  {"storage": "local-lvm", "node": "pve6", "size_gb": 32.0, "pending_gb": 8.0, "total_gb": 793.8,
   "used_before_pct": 72.0, "used_after_pct": 77.0, "level": "ok"}
],
"target_storage_level": "ok"
```

| Field | Meaning |
|-------|---------|
| `storage`, `node` | Storage id on the target node (Proxmox reuses the source storage id; ProxBalance passes no storage mapping) |
| `size_gb` | This guest's disks on that storage, by provisioned size (the worst case for thin storage) |
| `pending_gb` | Disks of earlier planned moves into the same storage |
| `used_before_pct` | The storage's usage now |
| `used_after_pct` | Usage after the earlier planned moves and this one |
| `level` | `ok`, `warning` (> 80%), `critical` (> 90%) or `wont_fit` (> 100%, or more data than the free space) |
| `target_storage_level` | The worst `level`, or `null` when the list is empty |

Entries are sorted worst first. A storage with no usage numbers, an inactive storage, or a disk with no known size gives no entry rather than a 0. The engine already rejects targets where a disk won't fit (skip reason "`<node>`: target storage full (...)"), so `wont_fit` appears only on moves added outside that check (distribution balancing, affinity companions).

### GET /api/recommendations

Returns cached recommendations from the last generation, in the same shape as the POST response. Supports filtering and pagination; see [GET /api/recommendations (with filtering)](#get-apirecommendations-with-filtering).

### POST /api/node-scores

Returns penalty scores for all nodes, used for evaluating migration targets.

| Field | Type | Default |
|-------|------|---------|
| `cpu_threshold` | number | 60 |
| `mem_threshold` | number | 70 |
| `iowait_threshold` | number | 15 |
| `maintenance_nodes` | array | `[]` |

```bash
curl -X POST http://<host>/api/node-scores \
  -H "Content-Type: application/json" \
  -d '{"cpu_threshold": 60, "mem_threshold": 70, "iowait_threshold": 30}'
```

Response: `{"success": true, "scores": {"<node>": {...}}, "cluster_spread": {...}}`, including each node's `penalty_breakdown` and two explanation fields:

- `penalty_items` — every non-zero penalty, largest first: `key`, `category`, `label`, `value` (the reading), `threshold` (the tier it crossed), `unit` (`%`, `x` or `%/day`), `base_points`, `points` (after adjustments) and `adjustments` (e.g. the stable-CPU factor or the 60-point memory cap). `value`/`threshold` are `null` for label-based penalties (a "rising" trend). The `points` add up to `score_breakdown.penalty_points`.
- `score_breakdown` — `base` (each weighted component: `value`, `weight`, `points`), `base_points`, `penalty_points`, `score`, `headroom` (= `suitability_rating`), `capped` and `notes`. `base_points + penalty_points = score`; `headroom = 100 − min(score, 100)`.

### POST /api/guest/{vmid}/migration-options

Returns migration suitability scores for a specific guest across all nodes.

```bash
curl -X POST http://<host>/api/guest/100/migration-options \
  -H "Content-Type: application/json" \
  -d '{"cpu_threshold": 60, "mem_threshold": 70, "maintenance_nodes": []}'
```

Each option for another node carries `target_storage` (same shape as on recommendations, without counting other planned moves) when the guest has disks on that node's local storage; the key is absent otherwise. A node where a disk won't fit is returned with `disqualified: true` and a reason like "Storage full: local-lvm on pve3: 2% → 200% (96 GB won't fit)". The migrate confirmation dialog uses this to show the target storage lines and to block a move that won't fit.

### POST /api/penalty-config/simulate

Simulates recommendations with a proposed penalty config without saving it.

```bash
curl -X POST http://<host>/api/penalty-config/simulate \
  -H "Content-Type: application/json" \
  -d '{"config": {"cpu_high_penalty": 25, "min_score_improvement": 20}, "cpu_threshold": 60}'
```

### GET /api/recommendations/diagnostics

Returns diagnostic summary of the recommendation engine's state including generation timing, guest counts, skip reasons, scoring config, AI status, cache ages, and conflict/advisory counts.

```bash
curl http://<host>/api/recommendations/diagnostics
```

```json
{
  "success": true,
  "diagnostics": {
    "last_generation": "2026-02-08T10:30:00Z",
    "generation_time_ms": 1250,
    "guests_evaluated": 45,
    "guests_recommended": 3,
    "guests_skipped": 42,
    "skip_reason_breakdown": {"insufficient_improvement": 30, "ha_managed": 5},
    "ai_enhanced": false,
    "cache_status": {"cluster_cache_age_minutes": 12.5, "recommendations_cache_age_minutes": 2.1},
    "conflicts_count": 0,
    "advisories_count": 1
  }
}
```

### POST /api/recommendations/feedback

Submits feedback on a recommendation.

| Field | Type | Description |
|-------|------|-------------|
| `vmid` | int | Guest ID |
| `rating` | string | `helpful` or `not_helpful` |
| `reason` | string | Optional reason |
| `source_node` / `target_node` | string | Optional context |

```bash
curl -X POST http://<host>/api/recommendations/feedback \
  -H "Content-Type: application/json" \
  -d '{"vmid": 100, "rating": "helpful"}'
```

### GET /api/recommendations/feedback

Returns recommendation feedback summary with stats and recent entries.

---

## Migrations

### POST /api/migrate

Starts a single guest migration.

| Field | Type | Description |
|-------|------|-------------|
| `vmid` | int | Guest ID |
| `source_node` | string | Current node |
| `target_node` | string | Destination node |
| `type` | string | `VM` or `CT` (default `VM`) |
| `record_outcome` | bool | Record a migration outcome for this move (default `true`) |

```bash
curl -X POST http://<host>/api/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "vmid": 100,
    "source_node": "pve1",
    "target_node": "pve2",
    "type": "VM"
  }'
```

A successful response means the Proxmox migration task was started, not that it finished. Track it with [GET /api/tasks/{node}/{taskid}](#get-apitasksnodetaskid).

When the task starts, a pre-migration snapshot is taken and a migration outcome is recorded; the 5 min / 1 h / 24 h post-migration snapshots are captured later by [POST /api/migrate/outcomes/refresh](#post-apimigrateoutcomesrefresh). The automation service sends `record_outcome: false` because it records the outcome itself after the task completes.

### POST /api/migrate/batch

Executes multiple migrations sequentially.

```bash
curl -X POST http://<host>/api/migrate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "migrations": [
      {"vmid": 100, "source_node": "pve1", "target_node": "pve2", "type": "VM"},
      {"vmid": 101, "source_node": "pve1", "target_node": "pve3", "type": "CT"}
    ]
  }'
```

### POST /api/migrate/validate

Validates a proposed migration before execution. Runs 6 checks: data staleness, guest state, target resources, storage compatibility, active locks, and affinity rules.

```bash
curl -X POST http://<host>/api/migrate/validate \
  -H "Content-Type: application/json" \
  -d '{
    "vmid": 100,
    "source_node": "pve1",
    "target_node": "pve2",
    "type": "VM"
  }'
```

```json
{
  "success": true,
  "validation": {
    "passed": true,
    "checks": [
      {"name": "staleness", "passed": true, "detail": "Data is 5 minutes old"},
      {"name": "guest_state", "passed": true, "detail": "Guest running on pve1"},
      {"name": "resources", "passed": true, "detail": "Target has sufficient capacity"},
      {"name": "storage", "passed": true, "detail": "Storage compatible"},
      {"name": "locks", "passed": true, "detail": "No active locks"},
      {"name": "affinity", "passed": true, "detail": "No anti-affinity conflicts"}
    ],
    "warnings": []
  }
}
```

### POST /api/migrations/{task_id}/cancel

Cancels a running migration by task ID.

### GET /api/guests/{vmid}/migration-status

Returns the migration status for a specific guest.

---

## Node Operations

### Maintenance mode

Maintenance mode is stored on the server, in `automated_migrations.maintenance_nodes`. There is no separate endpoint: read the list with [GET /api/automigrate/config](#get-apiautomigrateconfig) and change it by posting the whole new list:

```bash
curl -X POST http://<host>/api/automigrate/config \
  -H "Content-Type: application/json" \
  -d '{"maintenance_nodes": ["pve1"]}'
```

The web UI does a read-modify-write of this list, one node at a time. Recommendation generation and the automation service read it from the config; with live automation enabled, the next run starts moving guests off maintenance nodes (see [Automation - Maintenance mode](AUTOMATION.md#maintenance-mode)).

### POST /api/nodes/evacuate

Plans or starts the evacuation of a node.

| Field | Type | Description |
|-------|------|-------------|
| `node` | string | Node to evacuate (required) |
| `maintenance_nodes` | array | Nodes that must not receive guests |
| `confirm` | bool | `false` (default) returns the plan; `true` starts the evacuation |
| `guest_actions` | object | Per-guest action keyed by vmid string: `migrate`, `ignore` or `poweroff` |
| `guest_targets` | object | Per-guest target node keyed by vmid string |
| `target_node` | string | Optional target for every guest without its own pick |

Target priority is: the guest's entry in `guest_targets`, then `target_node`, then the least-loaded online node that has every storage the guest uses. An explicit pick is never replaced: if the chosen node is unavailable (offline, in maintenance, or the source node) or lacks one of the guest's storages, that guest is recorded as failed with the reason and stays where it is.

```bash
# Review the plan
curl -X POST http://<host>/api/nodes/evacuate \
  -H "Content-Type: application/json" \
  -d '{"node": "pve1"}'

# Execute with explicit per-guest choices
curl -X POST http://<host>/api/nodes/evacuate \
  -H "Content-Type: application/json" \
  -d '{
    "node": "pve1",
    "confirm": true,
    "guest_actions": {"100": "migrate", "101": "ignore"},
    "guest_targets": {"100": "pve2"}
  }'
```

Plan response (`confirm: false`):

```json
{
  "success": true,
  "source_node": "pve1",
  "available_targets": ["pve2", "pve3"],
  "total_guests": 2,
  "will_migrate": 1,
  "will_skip": 1,
  "plan": [
    {"vmid": 100, "name": "web-01", "type": "qemu", "status": "running", "target": "pve2",
     "will_restart": false, "skipped": false, "skip_reason": null,
     "storage_volumes": ["local-lvm"], "storage_compatible": true}
  ]
}
```

Execute response (`confirm: true`): `{"success": true, "session_id": "<uuid>", "message": "Evacuation started in background", "total_guests": 2}`.

### GET /api/nodes/evacuate/status/{session_id}

Returns the status of an ongoing evacuation: `status`, `progress` (`total`, `processed`, `successful`, `failed`, `current_guest`, `remaining`), per-guest `results`, `error` and `completed`.

### GET /api/nodes/{node}/storage

Lists available storage on a node.

### POST /api/storage/verify

Verifies that the storage used by the given guests exists on the target nodes.

```bash
curl -X POST http://<host>/api/storage/verify \
  -H "Content-Type: application/json" \
  -d '{"source_node": "pve1", "target_nodes": ["pve2", "pve3"], "guests": [100, 101]}'
```

---

## Guest Operations

### GET /api/guests/{vmid}/location

Returns the current node location of a guest.

### GET /api/guests/locations

Returns locations for all guests.

### GET /api/guests/{vmid}/history

Returns a guest's CPU and memory time series (0-100%), downsampled to about 80 points.

| Parameter | Type | Default |
|-----------|------|---------|
| `hours` | int | 24 |

```json
{"success": true, "vmid": "100", "points": [{"time": "...", "cpu": 12.5, "mem": 48.2}],
 "rightsizing": {"status": "ok", "running_pct": 99.6, "days": 7.0, "kind": "vm", "ignored": false,
                 "hints": [{"kind": "cpu", "current": 4, "suggested": 2, "avg_pct": 3.4, "p95_pct": 9.0, "vcpus_freed": 2, "gb_freed": 0.0}]}}
```

`rightsizing` carries `kind` (`vm` or `ct`; the side panel marks a container's sizes "(limit)") and always covers the last 7 days whatever `hours` is, and is the same assessment `GET /api/insights/rightsizing` makes (see there for hint shapes). `status` is `ok` (assessed; `hints` may be empty), `not_enough_history` (under 3 days of samples), `no_data` or `template`. It is `null` when the guest isn't in the cluster cache.

### GET /api/insights/rightsizing

Guests whose allocation doesn't match their last 7 days of use, read from the stored metrics history (never from Proxmox). Rules, evaluated per guest:

- **Mostly stopped**: running under 30% of the window. A note with no size; it replaces the CPU and memory checks.
- **Idle CPU**: running over 50% of the window, average CPU under 10% of its vCPUs and p95 at most 60% → `ceil(vcpus × 0.4)` vCPUs, never below 1 and never below the cores its p95 load needs, only when lower than now.
- **Oversized memory**: average use under 30% of the allocation → p95 use plus 30% headroom, rounded up to 512 MB, only when lower than now. VMs only when the guest agent is running and the reading isn't ~100% (without the agent Proxmox reports the host's view).

A guest needs at least 3 days of samples; with less, or none, it gets no hint. "Running" is the guest's sample count over the collector runs since its first sample (the collector stores samples only for running guests). Guests tagged `ignore` are still assessed and marked `ignored`. Aggregated history contributes its own p95 to the window's p95, so the p95 is at or above the true one.

Sorted by what each could free: vCPUs plus GB converted to vCPUs at the cluster's host memory-per-CPU ratio; mostly-stopped guests last.

Each guest carries `kind`: `vm` or `ct`. Totals are split the same way (`totals.vm`, `totals.ct`) because a container's cores and memory are limits, not reservations: lowering them frees little on the host and mostly matters for overcommit accounting. Only `totals.vm` is real capacity; the Insights card's "VMs could free …" header uses it and lists containers in a collapsed group.

```json
{
  "success": true, "window_days": 7, "min_history_days": 3,
  "guests": [
    {"vmid": 106, "name": "haos10.5", "node": "pve3", "type": "VM", "kind": "vm", "ignored": false,
     "running_pct": 100.0, "days": 7.0, "vcpus_freed": 1, "gb_freed": 0.0,
     "hints": [{"kind": "cpu", "current": 2, "suggested": 1, "avg_pct": 5.6, "p95_pct": 8.9, "vcpus_freed": 1, "gb_freed": 0.0}]},
    {"vmid": 241, "name": "claude-dev", "node": "pve4", "type": "CT", "kind": "ct", "ignored": true,
     "running_pct": 100.0, "days": 7.0, "vcpus_freed": 2, "gb_freed": 9.5,
     "hints": [
       {"kind": "cpu", "current": 4, "suggested": 2, "avg_pct": 3.4, "p95_pct": 9.0, "vcpus_freed": 2, "gb_freed": 0.0},
       {"kind": "memory", "current_gb": 16.0, "suggested_gb": 6.5, "suggested_mb": 6656, "avg_gb": 3.89, "p95_gb": 4.87, "avg_pct": 24.3, "vcpus_freed": 0, "gb_freed": 9.5}
     ]},
    {"vmid": 238, "name": "networkoptimizer", "node": "pve4", "type": "CT", "kind": "ct", "ignored": false,
     "running_pct": 4.4, "days": 7.0, "vcpus_freed": 0, "gb_freed": 0.0,
     "hints": [{"kind": "stopped", "running_pct": 4.4, "vcpus_freed": 0, "gb_freed": 0.0}]}
  ],
  "totals": {"vm": {"vcpus_freed": 1, "gb_freed": 0.0, "guests_with_hints": 2, "mostly_stopped": 1},
             "ct": {"vcpus_freed": 30, "gb_freed": 77.9, "guests_with_hints": 31, "mostly_stopped": 1},
             "assessed": 40, "not_enough_history": 6, "no_data": 27}
}
```

### GET /api/guest-profiles

Returns behavior classifications for all profiled guests, keyed by vmid: `behavior`, `confidence`, `cpu_volatility`, `peak_multiplier`, `growth_rate_per_day`, `data_points`.

### GET /api/guests/{vmid}/tags

Returns tags for a guest.

### POST /api/guests/{vmid}/tags

Adds a tag to a guest.

```bash
curl -X POST http://<host>/api/guests/100/tags \
  -H "Content-Type: application/json" \
  -d '{"tag": "ignore"}'
```

### DELETE /api/guests/{vmid}/tags/{tag}

Removes a tag from a guest.

### POST /api/guests/{vmid}/tags/refresh

Refreshes cached tag data for a guest from Proxmox without requiring a full data collection cycle.

### GET /api/affinity-groups

Returns all affinity groups with their members and split detection status.

```bash
curl http://<host>/api/affinity-groups
```

```json
{
  "success": true,
  "affinity_groups": [
    {
      "name": "affinity_webstack",
      "members": [
        {"vmid": 200, "name": "nginx", "type": "VM", "node": "pve1", "status": "running"},
        {"vmid": 201, "name": "app-server", "type": "VM", "node": "pve1", "status": "running"}
      ],
      "member_count": 2,
      "nodes": ["pve1"],
      "is_split": false,
      "status": "together"
    }
  ],
  "total_groups": 1,
  "split_groups": 0
}
```

Groups with members on different nodes have `is_split: true` and `status: "split"`.

### Placement rules

#### GET /api/placement-rules

Every affinity and anti-affinity rule from tags (`exclude_*`, `affinity_*`, `affinity_req_*`) and from `rules.pool_rules`.

```json
{
  "success": true,
  "rules": [
    {"id": "tag:exclude_dns", "name": "exclude_dns", "kind": "anti-affinity", "required": true,
     "source": "tag", "hard": true, "ok": false, "nodes": ["pve3", "pve5"],
     "members": [{"vmid": 233, "name": "dns1", "node": "pve3", "status": "running"}]}
  ],
  "violations": 1,
  "soft_penalty": 15,
  "pools_available": true,
  "respect_affinity_rules": true
}
```

`hard` is true for anti-affinity and for required affinity. `ok` is whether the rule holds now; `violations` counts broken hard rules. `pools_available` is false when the collector could not read `/pools` (pool rules are then ignored).

#### GET /api/placement-rules/enforce-plan

The moves that would make every hard rule hold. Plans only.

```json
{
  "success": true,
  "violations": [{"rule_id": "tag:exclude_dns", "name": "exclude_dns", "kind": "anti-affinity", "detail": "2 on pve3"}],
  "moves": [{"vmid": 234, "name": "dns2", "type": "CT", "source_node": "pve3", "target_node": "pve5",
             "rule": "exclude_dns", "reason": "Leave pve3, which also runs another exclude_dns member", "mem_gb": 1.0}],
  "unresolved": [],
  "execution_plan": {"total_steps": 1, "ordered_recommendations": [...]},
  "dry_run": false
}
```

`unresolved` lists guests the plan can't move (ignore tag, passthrough disks, no node that fits) with a reason. Soft rules never appear.

#### POST /api/placement-rules/enforce

Runs the confirmed moves: `{"vmids": [234]}`. The plan is recomputed; only confirmed vmids still in it run (others come back in `dropped`; 409 when none remain). When `automated_migrations.dry_run` is true nothing moves and the response has `dry_run: true`. Otherwise the moves go through `POST /api/migrate/batch` logic (HA rules re-checked live) and the batch result is returned with `moves`.

### GET /api/tasks/{node}/{taskid}

Returns the status of a Proxmox task.

### POST /api/tasks/{node}/{taskid}/stop

Stops a running Proxmox task.

---

## Automation

### GET /api/automigrate/status

Returns the current automation status: `enabled`, `dry_run`, `timer_active`, `check_interval_minutes`, `next_check`, `recent_migrations`, `in_progress_migrations`, `state` (including `last_run`), `filter_reasons` and `intelligent_tracking`.

### GET /api/automigrate/history

Returns automation run history or individual migration history.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `type` | string | `runs` | `runs` (automation runs with their decisions) or `migrations` |
| `limit` | int | 50 | Maximum entries |
| `status` | string | (all) | Filter by status |

### POST /api/automigrate/test

Runs one automation cycle **always as a dry run**, regardless of the configured `dry_run` value, and returns its output. The run sets `PROXBALANCE_FORCE_DRY_RUN=1` for `automigrate.py`, which also means it sends no notifications and does not count as an observation for Smart Migrations. The normal checks still apply, so a test exits early if automation is disabled or the schedule blocks it.

```json
{
  "success": true,
  "return_code": 0,
  "output": "...",
  "error": null
}
```

### POST /api/automigrate/run

Triggers an immediate automation cycle in the background, using the configured `dry_run` value. Returns `409` if a migration is already running cluster-wide. The response includes `migration_info` (`vmid`, `name`, `type`, `source_node`, `target_node`) when a migration started within the first seconds.

### GET /api/automigrate/config

Returns `config.automated_migrations`. Notification credentials are replaced by `***` (see [Secret fields](#secret-fields)).

### POST /api/automigrate/config

Updates automation configuration. Top-level keys in the body are merged one level deep into `automated_migrations` (a nested object such as `rules` or `schedule` is updated key by key; lists such as `maintenance_nodes` are replaced). `distribution_balancing` is stored at the config root. Values sent back as `***` keep the stored secret. Changing `rules.cooldown_minutes` records a cooldown reset time. The response returns the updated config with secrets redacted.

```bash
curl -X POST http://<host>/api/automigrate/config \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "rules": {"max_migrations_per_run": 2}}'
```

### POST /api/automigrate/toggle-timer

Starts or stops the automation systemd timer.

```bash
curl -X POST http://<host>/api/automigrate/toggle-timer \
  -H "Content-Type: application/json" \
  -d '{"active": false}'
```

### GET /api/automigrate/logs

Returns recent `proxmox-balance-automigrate.service` journal lines.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `lines` | int | 100 | Number of lines (maximum 1000) |

---

## AI Recommendations

### POST /api/ai-recommendations

Generates AI-powered migration recommendations.

```bash
curl -X POST http://<host>/api/ai-recommendations \
  -H "Content-Type: application/json" \
  -d '{"analysis_period": "24h", "maintenance_nodes": []}'
```

Response:

```json
{
  "success": true,
  "analysis": "Cluster summary from AI...",
  "recommendations": [
    {
      "vmid": 100,
      "name": "web-server",
      "source_node": "pve1",
      "target_node": "pve2",
      "type": "VM",
      "priority": "high",
      "reasoning": "Detailed explanation...",
      "risk_score": 0.15,
      "estimated_impact": "Reduces pve1 CPU to ~65%",
      "best_time": "now"
    }
  ],
  "predicted_issues": []
}
```

### POST /api/ai-models

Returns available models for a given AI provider (`openai`, `anthropic` or `local`).

```bash
curl -X POST http://<host>/api/ai-models \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai"}'
```

| Field | Description |
|-------|-------------|
| `provider` | Required |
| `api_key` | Optional (OpenAI). `***` or omitted means "use the stored key" |
| `base_url` | Optional (OpenAI, Ollama) |

For OpenAI, the stored API key is only sent to the stored (or default) `base_url`. If the request names a different `base_url`, it must also include its own `api_key`, otherwise the endpoint returns `400 API key required`. Anthropic returns a fixed model list.

---

## Configuration

### Secret fields

Read endpoints never return credentials. These fields are replaced by the placeholder `***` when they hold a value:

- `proxmox_api_token_secret`, `proxmox_password`, `api_key` (ProxBalance's own API key)
- `ai_config.<provider>.api_key`
- `automated_migrations.notifications.providers.<provider>`: `api_token`, `user_key`, `bot_token`, `webhook_url`, `smtp_password`, `password`, `url`, and every value in `headers`
- The legacy `automated_migrations.notifications.webhook_url` and a legacy root-level `notifications` block

Redaction applies to `GET /api/config`, `POST /api/config` responses, `GET /api/config/export`, server backups (`POST /api/config/backup` and the automatic pre-import backup), and `GET`/`POST /api/automigrate/config`.

When a client sends `***` back unchanged, `POST /api/config`, `POST /api/automigrate/config` and `POST /api/config/import` keep the stored value instead of saving the placeholder. A `***` with nothing stored behind it is saved as an empty string.

### GET /api/config

Returns the current configuration with secret fields redacted.

### POST /api/config

Updates configuration values. Unchanged Proxmox credentials (`proxmox_auth_method`, `proxmox_api_token_id`, `proxmox_api_token_secret`) are ignored, so they do not trigger a collector restart, and an empty `proxmox_api_token_secret` never overwrites a stored one.

```bash
curl -X POST http://<host>/api/config \
  -H "Content-Type: application/json" \
  -d '{"collection_interval_minutes": 120}'
```

### GET /api/config/export

Exports the configuration as a downloadable JSON file (`export_metadata` plus `configuration`), with secrets redacted.

### POST /api/config/backup

Creates a redacted backup of the current configuration in `/opt/proxmox-balance-manager/backups/` (the last 5 are kept).

### POST /api/config/import

Imports a configuration from an uploaded JSON file (multipart form field `file`). Both an export file and a plain `config.json` are accepted. Values that are `***` (as in an export) are restored from the current config, so re-importing an export keeps the stored secrets. The config is validated first (`400` with `validation_errors` and `validation_warnings` on failure), the imported API token is tested, and if it is invalid while the current token works, the current token is kept. A redacted pre-import backup is written before saving.

### POST /api/validate-token

Tests a Proxmox API token for connectivity. Body: `proxmox_api_token_id`, `proxmox_api_token_secret`.

### GET /api/penalty-config

Returns the current penalty scoring configuration, the defaults, the available presets and `active_preset` (or `custom`).

### POST /api/penalty-config

Updates penalty scoring weights.

### POST /api/penalty-config/reset

Resets penalty scoring to defaults.

### GET /api/penalty-config/presets

Returns the scoring presets with their full config and the `active_preset`.

### POST /api/penalty-config/presets/{name}

Applies a named penalty configuration preset. Available presets: `conservative`, `balanced`, `aggressive`.

```bash
curl -X POST http://<host>/api/penalty-config/presets/aggressive
```

### GET /api/migration-settings

Returns the simplified migration settings (`sensitivity`, `trend_weight`, `lookback_days`, `min_confidence`, `protect_workloads`, optional `min_score_improvement` and `expert_overrides`), the resulting `effective_penalty_config`, defaults, descriptions and `has_expert_overrides`.

### PUT /api/migration-settings

Saves simplified migration settings (body is the settings object, or `{"settings": {...}}`) and rewrites `penalty_scoring` from them.

```bash
curl -X PUT http://<host>/api/migration-settings \
  -H "Content-Type: application/json" \
  -d '{"sensitivity": 2, "min_confidence": 75}'
```

### POST /api/migration-settings/reset

Resets migration settings (and the mapped penalty config) to defaults.

### GET /api/permissions

Returns current API token permissions.

### POST /api/settings/collection

Updates collection settings: `collection_interval_minutes` and `collection_optimization`.

### GET /api/settings/recommendation-thresholds
### POST /api/settings/recommendation-thresholds

Gets or updates `cpu_threshold`, `mem_threshold` and `iowait_threshold` (each 1-100).

```bash
curl -X POST http://<host>/api/settings/recommendation-thresholds \
  -H "Content-Type: application/json" \
  -d '{"cpu_threshold": 65, "mem_threshold": 75}'
```

---

## Notifications

### POST /api/notifications/test

Sends a test notification using the **saved** settings. With no body it tests every enabled channel; `{"provider": "<name>"}` tests only that channel (`pushover`, `email`, `telegram`, `discord`, `slack` or `webhook`).

```bash
curl -X POST http://<host>/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "discord"}'
```

```json
{
  "success": false,
  "results": {
    "discord": { "success": true },
    "slack": { "success": false, "error": "404 Client Error: Not Found for url: ***" }
  },
  "skipped": {
    "email": "SMTP host is required"
  },
  "message": "1 sent, 1 failed, 1 skipped"
}
```

- `results` is keyed by channel name. `skipped` lists enabled channels left out because their configuration is incomplete, with the reason.
- `success` is `true` only when at least one channel was tested, none was skipped, and every test succeeded.
- Error text and skip reasons are scrubbed: any configured credential or URL is replaced by `***`.
- Returns `400` if notifications are disabled, no channel is enabled, the channel name is unknown, or the requested channel is not enabled in the saved settings.

See [Notifications - Testing](NOTIFICATIONS.md#testing).

### GET /api/notifications/providers

Returns the available providers, the default notification config and, for the saved config, whether each enabled channel is ready or skipped:

```json
{
  "success": true,
  "providers": ["pushover", "email", "telegram", "discord", "slack", "webhook"],
  "defaults": { "enabled": false, "providers": { } },
  "channels": {
    "discord": { "ready": true },
    "email": { "ready": false, "reason": "SMTP host is required" }
  }
}
```

---

## System Management

### GET /api/system/info

Returns the running version, branch and update status. Update fields: `updates_available`, `update_type` (`release`, `switch_to_release` or `branch`), `current_version`, `latest_version`, `update_channel`, `latest_release` (`tag`, `name`, `url`, `published_at`, `notes`, `prerelease`, `prebuilt`), `update_check_error`, and `update_in_progress`.

### GET /api/system/check-update

Checks for an update on the install's channel (see [Releasing and updating](RELEASING.md)). The stable and beta channels read published GitHub releases, cached for 30 minutes; add `?force=1` to bypass the cache. Sends one `update_available` notification per new version when that event is enabled.

### POST /api/system/update

Starts an update to the newest version on the channel and returns immediately with `{"success": true, "started": true, "target": "v2.16.0"}`, or `{"started": false, "message": "Already up to date"}`. The update runs in its own systemd unit (`proxbalance-update`): backup, checkout, web bundle (checksum-verified, or built locally), dependencies, restart and health check, with automatic rollback on failure. The API restarts during the update, so poll `GET /api/system/update-status`.

### GET /api/system/update-status

Progress or result of the last update: `state` (`idle`, `running`, `succeeded`, `failed`, `rolled_back`), `target`, `from`, `steps` (`name`, `ok`, `detail`, `at`), `error`, `backup` (backup folder), `started_at`, `finished_at`.

### POST /api/system/update-channel

Sets `updates.channel` to `stable`, `beta` or `dev`. Body: `{"channel": "beta"}`. Returns the new channel and a fresh update check.

### POST /api/system/restart-service

Restarts a ProxBalance service. Valid services: `proxmox-balance`, `proxmox-collector`.

```bash
curl -X POST http://<host>/api/system/restart-service \
  -H "Content-Type: application/json" \
  -d '{"service": "proxmox-balance"}'
```

Restarting `proxmox-balance` restarts the API itself, so the request may be dropped.

### POST /api/system/change-host

Changes the Proxmox host connection. Body: `{"host": "192.168.1.10"}`.

### POST /api/system/token-permissions

Changes API token permissions. Body: `token_id`, `permission_level` (default `readonly`).

### POST /api/system/recreate-token

Recreates the API authentication token. Body: `token_id`, `permission_level`.

### POST /api/system/delete-token

Deletes the API authentication token. Body: `token_id`.

---

## Logs

### GET /api/logs/download

Downloads the last 1000 journal lines of a service as a text file.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `service` | string | `proxmox-balance` | `proxmox-balance` or `proxmox-collector` |

```bash
curl -OJ "http://<host>/api/logs/download?service=proxmox-collector"
```

Automation logs are available from [GET /api/automigrate/logs](#get-apiautomigratelogs).

---

## Advanced Recommendation, Trend and Outcome Endpoints

### GET /api/recommendations (with filtering)

Supports filtering and pagination via query parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | int | Max recommendations to return |
| `offset` | int | Skip first N recommendations |
| `min_confidence` | int | Minimum confidence score (0-100) |
| `target_node` | string | Filter by target node name |
| `source_node` | string | Filter by source node name |
| `sort` | string | Sort by: `score_improvement`, `confidence_score`, `risk_score`, `priority` |
| `sort_dir` | string | `asc` or `desc` (default: `desc`) |

Response includes `total_count`, `filtered_count`, and `count` pagination metadata.

### GET /api/recommendations/skipped

Returns skipped guests with optional filtering.

| Parameter | Type | Description |
|-----------|------|-------------|
| `reason` | string | Filter by skip reason (e.g., `insufficient_improvement`, `ha_managed`) |
| `limit` | int | Max results |
| `offset` | int | Pagination offset |

### GET /api/recommendations/forecasts

Returns proactive trend-based forecast alerts (projected from recent score history).

| Parameter | Type | Description |
|-----------|------|-------------|
| `severity` | string | Filter: `critical`, `warning`, `info` |
| `node` | string | Filter by node name |
| `metric` | string | Filter: `cpu`, `memory` |

### GET /api/trends/nodes

Returns a trend summary for every node (direction, current average and rate per day for CPU, memory and IOWait, stability and projected threshold crossings).

| Parameter | Type | Default |
|-----------|------|---------|
| `lookback_days` | int | 7 |
| `cpu_threshold` | number | 60 |
| `mem_threshold` | number | 70 |

### GET /api/trends/node/{node}

Returns the trend analysis for one node. Same parameters as `/api/trends/nodes`.

### GET /api/trends/guest/{vmid}

Returns the trend analysis for one guest. Parameter: `lookback_days` (default 7).

### GET /api/migrate/rollback-info/{vmid}

Returns rollback availability information for a guest, including original node, time since migration, and safety assessment.

### POST /api/migrate/rollback

Executes a rollback migration — moves a guest back to its original node.

```json
{ "vmid": 100 }
```

### GET /api/migrate/outcomes

Returns migration outcome records, most recent first. Outcomes are recorded for automated migrations, affinity companion migrations and manual migrations (`/api/migrate`).

| Parameter | Type | Description |
|-----------|------|-------------|
| `vmid` | int | Filter by VM/CT ID |
| `limit` | int | Max results (default: 20) |

Each outcome has `vmid`, `source_node`, `target_node`, `guest_type`, `status` (`pending_5min`, `pending_1h`, `pending_24h`, then `completed`), `pre_migration`, `post_5min`, `post_1h`, `post_24h`, `predicted_improvement`, `actual_improvement`, `sustained_improvement`, `accuracy_pct` and `verdict`.

Each post snapshot carries `timestamp`, `elapsed_seconds` (since the migration) and `late`. A snapshot is `late: true` when it was taken more than twice its window plus 30 minutes after the migration (for example, the service was down). A late snapshot measures "now" rather than the window, so clients should not treat it as a measurement of the migration.

### POST /api/migrate/outcomes/refresh

Captures post-migration snapshots for pending outcomes whose window has passed. Returns `updated`, `skipped` and `error`. The recommendations timer also runs this each cycle.

### GET /api/workload-patterns

Analyzes workload patterns using score history data.

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | string | Analyze only this node |
| `hours` | int | Hours of history to analyze (default: 168 = 7 days) |

Hour-of-day and day-of-week buckets use the automation schedule's timezone (`automated_migrations.schedule.timezone`, default `UTC`), so quiet windows and burst hours line up with the configured migration windows. The response includes `patterns` (one per node), `history_entries`, `hours_analyzed` and `timezone`.

Each pattern includes `daily_pattern`, `weekly_pattern`, `burst_detection` and:

- `quiet_window`: `{"start_hour": 2, "end_hour": 5, "avg_cpu": 11.3}`, the quietest contiguous 3-hour stretch (it can wrap midnight; `end_hour` is exclusive)
- `recommendation_timing`: the same window as text, for example `"Migrate during 02:00-05:00 when load is minimal (avg 11%)"`

### GET /api/simulate/node-failure

"What if a node fails?" simulation from the latest collected data (no Proxmox calls).

| Parameter | Type | Description |
|-----------|------|-------------|
| `node` | string | Node to fail. Omitted: run every online node and return the N-1 summary |
| `storage` | string | `capacity` (default): could the other nodes hold its guests? Disks on node-local storage are assumed restored elsewhere. `strict` (unplanned failure): guests whose disks are on node-local storage can't restart elsewhere |
| `mem_ceiling` | float | Highest memory % a survivor may reach (default 95, clamped 50–100) |
| `tight_pct` | float | A survivor ending above this memory % makes the result `tight` (default 85) |

Only running guests on the failed node move. Guests with passthrough disks or hardware (the guest's `passthrough_devices`: hostpci, usb, container `dev` entries), unshared bind mounts or, in `strict` mode, node-local disks go to `cant_restart` with a reason. A disk is node-local when its storage (from the guest's `disks[].storage`) has `shared: false` on the node, or, for entries collected before the flag existed, a non-shared storage type. The rest are placed largest memory first onto the survivor with the most free memory that stays at or under `mem_ceiling`, skipping nodes that an `exclude_*` tag or a Proxmox HA rule blocks. Memory demand is a VM's allocation and a container's current use. The `ignore` tag does not block a restart; such placements carry `ignored: true`.

Single node response (`data`): `status` (`ok`, `tight`, `stranded`, `short`, `offline`), `verdict`, `nodes` (per survivor `mem_before`, `mem_after`, `cpu_before`, `cpu_after`, `added`, `added_gb`), `placements` (`vmid`, `name`, `type`, `from`, `to`, `mem_gb`, `ha_managed`, `ignored`, optional `local_storage`), `cant_restart` and `doesnt_fit` (`vmid`, `name`, `type`, `mem_gb`, `reason`), `busiest`, `running_guests`, `local_storage_guests`, `local_disk_note` (for example `"If pve4 fails unexpectedly, its 5 guests don't restart elsewhere: their disks are node-local (restore from backup)"`, or null).

Summary response (`data`): `nodes` (per node `status`, `verdict`, `placed`, `cant_restart`, `doesnt_fit`, `doesnt_fit_gb`, `busiest`, `local_disk_note`), `can_lose`, `n1_ok`, `local_storage_guests`, `verdict`.

---

[Back to Documentation](README.md)
