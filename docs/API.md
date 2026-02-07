# API Reference

ProxBalance exposes a REST API on port 5000 (proxied through Nginx on port 80). All endpoints are prefixed with `/api/`.

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

---

## Health and Status

### GET /api/health

Returns API health status.

```bash
curl http://<host>/api/health
```

```json
{
  "status": "ok"
}
```

---

## Cluster Data

### GET /api/analyze

Returns full cluster analysis including nodes, guests, and metrics.

```bash
curl http://<host>/api/analyze
```

### GET /api/cluster-summary

Returns a summary of cluster state (node count, guest count, resource totals).

### GET /api/nodes-only

Returns node data without guest details.

### GET /api/guests-only

Returns guest data without node details.

### POST /api/refresh

Triggers an immediate data collection from the Proxmox API.

```bash
curl -X POST http://<host>/api/refresh
```

---

## Recommendations

### POST /api/recommendations

Generates migration recommendations based on current thresholds.

```bash
curl -X POST http://<host>/api/recommendations \
  -H "Content-Type: application/json" \
  -d '{"cpu_threshold": 60, "mem_threshold": 70}'
```

### GET /api/recommendations

Returns cached recommendations from the last generation.

### GET /api/recommendations/threshold-suggestions

Returns suggested threshold values based on current cluster state.

### POST /api/node-scores

Returns penalty scores for all nodes, used for evaluating migration targets.

```bash
curl -X POST http://<host>/api/node-scores \
  -H "Content-Type: application/json" \
  -d '{"vmid": 100}'
```

---

## Migrations

### POST /api/migrate

Executes a single guest migration.

```bash
curl -X POST http://<host>/api/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "vmid": 100,
    "source_node": "pve1",
    "target_node": "pve2",
    "guest_type": "VM"
  }'
```

### POST /api/migrate/batch

Executes multiple migrations sequentially.

```bash
curl -X POST http://<host>/api/migrate/batch \
  -H "Content-Type: application/json" \
  -d '{
    "migrations": [
      {"vmid": 100, "source_node": "pve1", "target_node": "pve2", "guest_type": "VM"},
      {"vmid": 101, "source_node": "pve1", "target_node": "pve3", "guest_type": "CT"}
    ]
  }'
```

### POST /api/migrations/{task_id}/cancel

Cancels a running migration by task ID.

### GET /api/guests/{vmid}/migration-status

Returns the migration status for a specific guest.

---

## Node Operations

### POST /api/nodes/evacuate

Evacuates all guests from a node (used for maintenance mode).

```bash
curl -X POST http://<host>/api/nodes/evacuate \
  -H "Content-Type: application/json" \
  -d '{"node": "pve1"}'
```

### GET /api/nodes/evacuate/status/{session_id}

Returns the status of an ongoing evacuation.

### GET /api/nodes/{node}/storage

Lists available storage on a node.

### POST /api/storage/verify

Verifies storage compatibility between source and target nodes for a guest.

```bash
curl -X POST http://<host>/api/storage/verify \
  -H "Content-Type: application/json" \
  -d '{"vmid": 100, "target_node": "pve2"}'
```

---

## Guest Operations

### GET /api/guests/{vmid}/location

Returns the current node location of a guest.

### GET /api/guests/locations

Returns locations for all guests.

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

### GET /api/tasks/{node}/{taskid}

Returns the status of a Proxmox task.

### POST /api/tasks/{node}/{taskid}/stop

Stops a running Proxmox task.

---

## Automation

### GET /api/automigrate/status

Returns the current automation status, including statistics and recent migrations.

### GET /api/automigrate/history

Returns automated migration history.

### POST /api/automigrate/test

Runs a test automation cycle (dry run).

### POST /api/automigrate/run

Triggers an immediate automation cycle.

### GET /api/automigrate/config
### POST /api/automigrate/config

Gets or updates automation configuration.

### POST /api/automigrate/toggle-timer

Enables or disables the automation systemd timer.

### GET /api/automigrate/logs

Returns recent automation log entries.

---

## AI Recommendations

### POST /api/ai-recommendations

Generates AI-powered migration recommendations.

```bash
curl -X POST http://<host>/api/ai-recommendations \
  -H "Content-Type: application/json" \
  -d '{"cpu_threshold": 60, "mem_threshold": 70}'
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

Returns available models for a given AI provider.

```bash
curl -X POST http://<host>/api/ai-models \
  -H "Content-Type: application/json" \
  -d '{"provider": "anthropic"}'
```

---

## Configuration

### GET /api/config

Returns the current configuration (sensitive fields redacted).

### POST /api/config

Updates configuration values.

```bash
curl -X POST http://<host>/api/config \
  -H "Content-Type: application/json" \
  -d '{"collection_interval_minutes": 120}'
```

### GET /api/config/export

Exports the full configuration as a downloadable JSON file.

### POST /api/config/backup

Creates a backup of the current configuration.

### POST /api/config/import

Imports a configuration from a JSON file.

### POST /api/validate-token

Tests a Proxmox API token for connectivity.

### GET /api/penalty-config

Returns the current penalty scoring configuration.

### POST /api/penalty-config

Updates penalty scoring weights.

### POST /api/penalty-config/reset

Resets penalty scoring to defaults.

### GET /api/permissions

Returns current API token permissions.

### POST /api/settings/collection

Updates collection optimization settings.

---

## Notifications

### POST /api/notifications/test

Sends a test notification to verify provider configuration.

```bash
curl -X POST http://<host>/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "discord"}'
```

### GET /api/notifications/providers

Returns the list of configured notification providers and their status.

---

## System Management

### GET /api/system/info

Returns system version, branch, and update status.

### GET /api/system/check-update

Checks for available updates.

### POST /api/system/update

Triggers an update to the latest version.

### GET /api/system/branches

Lists available git branches.

### POST /api/system/switch-branch

Switches to a different branch.

### GET /api/system/branch-preview/{branch}

Previews changes on a branch before switching.

### POST /api/system/rollback-branch

Rolls back to the previous branch.

### POST /api/system/restart-service

Restarts a ProxBalance service.

```bash
curl -X POST http://<host>/api/system/restart-service \
  -H "Content-Type: application/json" \
  -d '{"service": "proxmox-balance"}'
```

### POST /api/system/change-host

Changes the Proxmox host connection.

### POST /api/system/token-permissions

Checks or modifies API token permissions.

### POST /api/system/recreate-token

Recreates the API authentication token.

### POST /api/system/delete-token

Deletes the API authentication token.

---

## Logs

### GET /api/logs/download

Downloads service logs as a file. Supports query parameters for filtering by service and line count.

```bash
curl http://<host>/api/logs/download?service=proxmox-balance&lines=200
```

---

[Back to Documentation](README.md)
