# Features

---

## Monitoring

### Dashboard

![Dashboard](images/dashboard-nodes.png)

- Live CPU, memory, IOWait and load metrics for every node, and CPU, memory, disk I/O and network I/O for every guest
- **Headroom** score per node (0 to 100, higher = more room to take guests) with one colour scale everywhere: 50 and above is fine, 30 to 49 amber, under 30 red
- **Needs attention** strip that appears only when there is something to act on: stale collector data, a failed automation run, nodes in maintenance, or a node under 30 headroom
- KPI row with the tightest node's headroom and its largest penalty, nodes online, guests, migrations in flight, suggestions and tagged guests; the cards navigate to the matching view
- Auto-migration banner that says when automation can act next, what it last moved, and which guests it is watching
- Node table with a Condition column (the node's largest penalty, or Offline/Maintenance), local disk usage (shared storage excluded), and an expandable list of each node's top consumers
- Guests tab with combinable Node, Type, State, Rules and Balancer filters, search by name, VMID or tag, and a per-guest "Can ProxBalance move it?" verdict (Suggested, Movable, Manual only, Pinned, HA / CRS, Ignored, Stopped) that names the exact rule holding a guest back
- Data age shown in the header, amber or red when collection falls behind

### Cluster Map

![Cluster map](images/dashboard-map.png)

Five view modes (CPU, Memory, Allocated, Disk I/O, Network), colour by type or by load.

- Node cards print their values: CPU with allocated vCPU over cores, memory used/total, IOWait and committed RAM
- Find bar for guest name, VMID or tag, with quick filters for guests that can't migrate, are ignored, have affinity rules, are HA-managed or have mount points
- Drag a guest onto another node to preview the move: estimated load on every node, and a before/after panel that flags affinity conflicts, overcommit, high CPU or memory, unshared bind mounts, the ignore tag and HA management. The actual migration still goes through the normal confirm dialog. On touch screens a "Move to..." sheet does the same.

**Visual indicators on guests:**
- Cyan marker: container with shared mount points (safe to migrate)
- Orange marker: container with unshared bind mounts (may require manual migration)
- Red marker: VM with pinned or passthrough disks (cannot migrate, excluded from recommendations)

### Charts

![Charts](images/dashboard-charts.png)

- **Cluster health over time** from 1 day to 1 year, as a single cluster line, stacked, or per node
- Migration markers on the timeline; the cursor snaps to a marker on hover and the tooltip lists its migrations
- Click to pin a moment and see every node's headroom, CPU and memory then, the change from a day earlier, and nearby migrations with their reasons; step between migrations with the arrow buttons or the Left/Right keys
- Per-node CPU, memory and IOWait charts from 1 hour to 1 year, with threshold lines, migration markers and min/max bands
- Compare **by node** (one chart per node) or **by metric** (one chart per metric with every node overlaid, ranked chips, and click-to-focus on one node)

### Insights

![Insights](images/insights.png)

A separate page for analysis over time:

- **Node trends** over 24h, 7d, 30d or 90d: direction, average and rate for CPU, memory and IOWait, with sparklines and time-to-threshold for confident fits only
- **Forecasts**: projected threshold crossings, plus the recommendation engine's 48-hour look-ahead that feeds automation
- **Workload rhythm**: hour-of-day heatmap over 30 days in the schedule's time zone, with the hours your migration windows allow and the quietest stretch
- **Migration outcomes**: source-node CPU and memory before each migration versus 5 minutes and 24 hours after, for manual, automated and companion migrations

### Light + Dark Mode

Manual light/dark toggle in the top nav, persisted in the browser. Both modes are fully supported across every page.

---

## Migration

### Suggestions

![Suggestions](images/dashboard-recs.png)

- Penalty-based suggestions in one list, in the order they would run, grouped into waves
- Impact strip with cluster health before and after and the predicted load on every node
- Select a subset (all, from one node, only non-conflicting) and run it or copy the `qm`/`pct` commands
- Run Plan executes moves wave by wave and halts on a failure
- Conflict what-ifs: when moves would overload a target, see the load against the limit, leave moves out of this run, defer one, or send it to the engine's alternative target
- Batch impact is estimated per move, so any subset recomputes with the same math
- Guests that were not recommended are grouped by reason in plain words

### One-Click Migrations

- Execute VM and CT migrations from the suggestion cards, the Guests tab, the guest window or the map preview
- Real-time progress tracking with transfer rates, including multi-disk VMs
- A migration counts as successful only when the Proxmox task ends OK; failures carry the task's error text
- "In flight" list with cancel, and rollback to the original node after a completed move

### Node and Guest Windows

- The node window leads with headroom, load now versus 24h and 7d averages and peak, and a points bar showing what is using headroom
- The guest window lists every possible target with the headroom it would have, the gain versus staying, load after the move and a Best pick, plus an IOWait-exempt toggle

### Penalty-Based Scoring

Nodes are scored using a penalty system rather than hard disqualifications. Each target node receives penalties for high CPU, memory, IOWait, guest density, maintenance mode, storage incompatibility and anti-affinity violations. Headroom is 100 minus the penalty points, so higher is better.

See [Scoring Algorithm](SCORING_ALGORITHM.md) for the full specification.

### Node Maintenance Mode

- Enter maintenance from the node window; the setting is stored on the server and applies in every browser
- The confirmation says exactly what automation will do (live, dry run or off)
- Evacuation plan shows where each guest lands and the projected load on each target, with a "Send all to" option and storage warnings
- The plan sends an explicit action and target per guest, so what executes is what was shown; a guest the chosen node cannot take fails and stays put
- Maintenance nodes are never used as targets, and live automation evacuates them (bypassing tag restrictions)

### Anti-Affinity Rules

Tag-based system to enforce workload separation:

```bash
pvesh set /nodes/pve1/qemu/101/config --tags "exclude_database"
pvesh set /nodes/pve2/qemu/102/config --tags "exclude_database"
```

Guests with matching `exclude_*` tags are penalized when placed on the same node. Violations are flagged in the dashboard.

### Affinity Rules

Tag-based system to keep related workloads together:

```bash
pvesh set /nodes/pve1/qemu/200/config --tags "affinity_webstack"
pvesh set /nodes/pve1/qemu/201/config --tags "affinity_webstack"
```

Guests with matching `affinity_*` tags are kept on the same node. When one member is migrated, companion migrations are automatically generated for the rest of the group. Split groups (members on different nodes) are flagged in the dashboard.

### Storage Compatibility

Pre-migration validation ensures all required storage volumes exist on the target node. Incompatible targets are heavily penalized in scoring. In an evacuation, an explicitly chosen target without the guest's storage is flagged and the guest fails rather than being moved elsewhere.

### Migration History

Paged history (5 to 100 per page) on the Automation page with target headroom, duration, reason and status.

---

## Automation

![Automation](images/automation.png)

### Quick Setup

One status line (state, reason, last run, next check) and three controls: automated migrations on/off, dry run, and sensitivity (Conservative, Balanced, Aggressive).

### Scheduled Migrations

- Configurable check interval
- Migration windows and blackout periods, each with days of week and its own time zone, including overnight windows
- Live schedule status, for example "Migrations allowed now" or "blocked now: blackout ... opens in 3h 30m", matching the rules the backend applies
- Weekly grid of all windows with a "now" line
- Dry-run mode for testing (enabled by default)

### Organised Settings

Tabs for Schedule, Filters, Behavior, History & Logs and Reference. All settings are visible without extra clicks, and one save model stages every edit behind an "N unsaved changes" bar with Discard and Save.

### Safety Features

- Cluster health and quorum verification
- Duplicate migration prevention via Proxmox task API
- Rollback detection to prevent migration loops
- Rate limiting (max migrations per run, max concurrent, cooldown periods)
- Automatic pause after failure
- The API test run is always a dry run: no migrations, no notifications, no recorded observations

### Threshold Sliders

CPU, memory and IOWait thresholds show every online node as a tick at its current value, shade the trigger zone, and list which nodes are over now and which crossed in the last 24 hours.

### Distribution Balancing

Balances guest counts across nodes by migrating small VMs/CTs. Addresses uneven guest distribution that performance metrics alone may not reveal.

### Tag Controls

- `ignore` and `no-auto-migrate` tags exclude guests from automation
- `exclude_*` tags enforce anti-affinity (keep guests apart)
- `affinity_*` tags enforce pro-affinity (keep guests together) with automatic companion migrations
- `auto_migrate_ok` (or `auto-migrate-ok`) opts a guest in when whitelist mode is on
- Tags are bypassed for maintenance evacuations

See [Automated Migrations Guide](AUTOMATION.md) for configuration.

---

## AI Analysis

Optional AI-powered recommendations using:

- **OpenAI** (GPT-4o, GPT-3.5-turbo)
- **Anthropic** (Claude models)
- **Ollama** (Qwen2.5, Llama3.1, Mistral - self-hosted)

Capabilities:
- Multi-dimensional analysis of CPU, memory, load, and historical trends
- Configurable analysis periods (1h, 6h, 24h, 7d, 30d)
- Predictive workload analysis and trend detection
- Natural language reasoning for each recommendation
- Risk assessment and timing suggestions
- Smart filtering to prevent hallucinated node names

See [AI Features](AI_FEATURES.md) for setup.

---

## Notifications

Multi-provider notification system:

- **Pushover** - Push notifications to mobile and desktop
- **Email** - SMTP-based email alerts
- **Telegram** - Bot messages to chats and groups
- **Discord** - Channel webhooks
- **Slack** - Incoming webhooks
- **Custom Webhooks** - HTTP POST with JSON to any URL

Configurable triggers for migration events (start, completion, failure, per-migration results), cluster events (node status, resource thresholds, evacuations) and system events (new suggestions, collector status, available updates).

Each channel shows whether it is ready or skipped (and why) and can be tested on its own; testing all channels reports how many were sent, failed or skipped.

See [Notifications](NOTIFICATIONS.md) for setup.

---

## Settings

![Settings](images/settings.png)

- Sections for Connection, Collection, Notifications, AI and System, each with a live status line (connected nodes, age of the last collection, enabled channels, AI provider, version or available update)
- One save model with an unsaved-changes bar, shared with the Automation page
- Collection presets that fill in the fields, and a dashboard auto-refresh interval
- System tools: view and download service logs inline, restart services, export the cluster snapshot (JSON) and guest list (CSV), and export, import or back up the configuration

---

## Performance

- Pre-compiled React frontend (93% faster page load, LCP from 6.5s to 0.48s)
- In-memory caching with 60-second TTL (85% faster API responses)
- gzip compression (70-80% bandwidth reduction)
- Parallel data collection with configurable workers
- Memoized React components
- Lazy-loaded Chart.js (300KB+ saved on initial load), served locally with a CDN fallback
- Self-hosted React libraries (no CDN dependency)

---

## Security

- API token authentication (no stored passwords)
- Secrets (Proxmox API token, notification credentials, AI keys) are never returned by the API; forms show masked placeholders, and saving a placeholder keeps the stored secret
- Exported configuration contains placeholders instead of secrets; importing it keeps the stored values
- Notification errors are scrubbed so they do not echo configured credentials
- Unprivileged LXC container isolation
- Local network design (no external exposure required)
- Optional SSL/TLS with Let's Encrypt
- Fine-grained Proxmox permissions (PVEAuditor for read-only, PVEVMAdmin for full access); with a read-only token, migration and tag controls are disabled
- Audit trail via migration history and service logs

---

## User Interface

- Single-page React application with four pages: Dashboard, Insights, Automation and Settings
- Deep links for every page and tab (for example `#/dashboard/map`, `#/automation/filters`); reload keeps your place and Back/Forward work
- Works on phones: bottom tab bar, reduced table columns, tap-to-move on the map, dialogs that fit the screen
- Suggestions, Map and Charts can be moved out of the Cluster tabs into their own dashboard sections
- Clear load-error states with Retry, and toast messages for action results
- Keyboard support in charts (Left/Right to step between migrations, Esc to unpin)
- All configuration available from the web UI without SSH

---

[Back to Documentation](README.md)
