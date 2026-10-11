# Prometheus Metrics

ProxBalance serves Prometheus metrics at:

```
http://<proxbalance-host>/api/metrics
```

The path sits under `/api/`, which Nginx already proxies to Gunicorn, so no Nginx change is needed. The body is the Prometheus text exposition format, version 0.0.4.

Every value comes from data ProxBalance already holds: the cluster cache written by the collector, `config.json`, and the SQLite database. A scrape never calls the Proxmox API, so scraping every 30-60 seconds is cheap. The node and guest numbers only change when the collector runs, so `proxbalance_collection_age_seconds` tells you how old they are.

A value ProxBalance does not know is left out. It is never reported as 0, because 0 is a real reading (an idle CPU, no pending recommendations). Values for an offline node are left out too, because they would be from before it went offline.

If the metrics cannot be built at all, the endpoint answers `503` with a body that holds only `proxbalance_up 0`.

## Scrape config

```yaml
scrape_configs:
  - job_name: proxbalance
    metrics_path: /api/metrics
    scrape_interval: 60s
    static_configs:
      - targets: ["<proxbalance-host>:80"]
```

The endpoint has no authentication of its own. If `api_key` is set in `config.json`, every `/api/` path needs the key, this one included; add it to the job:

```yaml
    authorization:
      type: Bearer
      credentials: <api_key>
```

## Metrics

All names start with `proxbalance_`.

| Metric | Type | Labels | Meaning |
|--------|------|--------|---------|
| `up` | gauge | | 1 when the cluster cache was read, 0 when it is missing or unreadable |
| `build_info` | gauge | `version` | Always 1; the running version (as `git describe`) |
| `collection_last_success_timestamp_seconds` | gauge | | Unix time of the last successful collection (`collected_at`) |
| `collection_age_seconds` | gauge | | Seconds since the last successful collection |
| `node_cpu_percent` | gauge | `node` | CPU at collection time |
| `node_cpu_recent_percent` | gauge | `node` | CPU averaged over the last 15 minutes; the value scoring uses |
| `node_memory_percent` | gauge | `node` | Memory used |
| `node_iowait_percent` | gauge | `node` | IO wait at collection time |
| `node_score` | gauge | `node` | Health penalty score (0 is healthiest, higher is worse), computed as the Cluster Health view does |
| `node_suitability_percent` | gauge | `node` | The number the dashboard shows: 100 minus the score, clamped to 0-100 |
| `node_guests_running` | gauge | `node` | Running guests on the node |
| `node_anchored_cpu_percent` | gauge | `node` | CPU taken by guests that cannot move (passthrough, pinned, ignored) |
| `node_online` | gauge | `node` | 1 online, 0 not |
| `node_maintenance` | gauge | `node` | 1 when the node is in ProxBalance maintenance mode |
| `guest_cpu_percent` | gauge | `vmid` | Guest CPU at collection time (running guests only) |
| `guest_memory_bytes` | gauge | `vmid` | Guest memory in use (running guests only) |
| `guest_node_info` | gauge | `vmid`, `name`, `node`, `type` | Always 1; where each running guest lives |
| `automation_enabled` | gauge | | 1 when automated migrations are on |
| `automation_dry_run` | gauge | | 1 when they run in dry-run mode |
| `automation_last_run_timestamp_seconds` | gauge | | Unix time of the last automation run |
| `automation_last_run_status` | gauge | `status` | Always 1; status of the last run (`success`, `no_action`, `partial`, `failed`, `skipped`, `disabled`) |
| `migrations_total` | counter | `result`, `dry_run` | Migrations in ProxBalance's migration history, by result (`completed`, `failed`, `timeout`, ...) |
| `recommendations_pending` | gauge | | Recommendations in the latest recommendation run |

Guest metrics cover running guests only, which keeps the series count near the number of running guests. To label guest series with their name and node, join on `guest_node_info`:

```promql
proxbalance_guest_cpu_percent * on (vmid) group_left (name, node) proxbalance_guest_node_info
```

### Example alerts

```yaml
groups:
  - name: proxbalance
    rules:
      - alert: ProxBalanceCollectionStale
        expr: proxbalance_collection_age_seconds > 3 * 3600
        for: 10m
        annotations:
          summary: "ProxBalance has not collected cluster data for {{ $value | humanizeDuration }}"
      - alert: ProxBalanceAutomationFailed
        expr: proxbalance_automation_last_run_status{status="failed"} == 1
        for: 15m
      - alert: ProxBalanceNodeOffline
        expr: proxbalance_node_online == 0
        for: 5m
```

Set the stale threshold above your collection interval (Settings, default 120 minutes).

## Grafana dashboard

[`docs/grafana/proxbalance-dashboard.json`](grafana/proxbalance-dashboard.json) has panels for node CPU (now and 15-minute), memory, IO wait and score, collection age, automation state and last run, pending recommendations, and migrations over time.

Import it from Grafana's **Dashboards → New → Import**, then pick your Prometheus data source for the `datasource` variable. The `node` variable filters the node panels.
