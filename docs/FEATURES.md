# Features

Every feature, with where to find it in the UI. For step-by-step use, see the [Usage Guide](USAGE.md).

---

## Monitoring

### Dashboard

![Top of the dashboard](images/dashboard.png)

- CPU, memory, IOWait and load for every node, and CPU, memory, disk I/O and network I/O for every guest
- **Headroom** score per node (0 to 100, higher = more room to take guests) with one colour scale everywhere: 50 and above is fine, 30 to 49 amber, under 30 red
- **Needs attention** strip that appears only when there is something to act on: stale collector data, a failed automation run, nodes in maintenance, or a node under 30 headroom
- KPI row with the tightest node's headroom and its largest penalty, nodes online, guests, migrations in flight, suggestions and tagged guests; each card opens the matching view
- Automation status: when automation can act next, what the last check did, the last real move, which guests it is watching, and a strip of the last 24 hours of checks labelled by day (Yesterday, Today). In semi-automatic mode it links to the moves waiting for approval
- Data age in the header, amber or red when collection falls behind

### Nodes table

![Nodes tab](images/dashboard-nodes.png)

- Condition column (the node's largest penalty, or Offline / Maintenance), local disk use (shared storage left out), and an expandable list of each node's top consumers
- **Node roles**: a node that current suggestions move guests off carries **Giving** (up arrow), one they move guests onto carries **Receiving** (down arrow), each with the number of guests. A node that is both shows the net direction; the tooltip has both counts and the guest names. Nodes in maintenance carry **Maintenance** (wrench). A one-line legend under the table lists the roles present
- A red "⚠ SMART" marker next to a node with a disk that failed SMART

### Guests tab

![Guests tab](images/dashboard-guests.png)

Combinable Node, Type, State, Rules and Balancer filters, search by name, VMID or tag, and a per-guest "Can ProxBalance move it?" verdict (Suggested, Movable, Manual only, Pinned, HA / CRS, Ignored, Stopped) that names the rule holding a guest back.

### Cluster Map

![Cluster map with planned moves](images/dashboard-map.png)

- Five view modes (CPU, Memory, Allocated, Disk I/O, Network), coloured by type or by load
- Node cards print their values: CPU with allocated vCPU over cores, memory used/total, IOWait and committed RAM; node roles appear here too
- **Planned moves**: each current suggestion is drawn as a dashed arrow from source to target node, one arrow per node pair, with the number of guests in the middle. Hover or tap the number for the guest names. Moves waiting for approval are dotted blue. The **Plan** button hides or shows the arrows (on by default)
- Find bar for guest name, VMID or tag, with quick filters for guests that can't migrate, are ignored, have affinity rules, are HA-managed or have mount points
- Drag a guest onto another node to preview the move: estimated load on every node, and a before/after panel that flags affinity conflicts, overcommit, high CPU or memory, unshared bind mounts, the ignore tag and HA management. The migration still goes through the normal confirm dialog. On touch screens a "Move to..." sheet does the same

**Markers on guests:**
- Cyan: container with shared mount points (safe to migrate)
- Orange: container with unshared bind mounts (may need manual migration)
- Red: pinned guest, with passthrough disks or PCI/USB passthrough (cannot migrate, left out of suggestions)

### Charts

![Charts tab](images/dashboard-charts.png)

- **Cluster health over time** from 1 day to 1 year, as a single cluster line, stacked, or per node, with migration markers. Click to pin a moment and see every node's headroom, CPU and memory then; step between migrations with the arrow buttons or the Left/Right keys
- **One chart** (the default): every node on a shared time axis for one metric (CPU, Memory or IO wait), with the recommendation threshold as a dashed line. Click a node name to show or hide its line; click a line to highlight that node and show only its migration markers. With **Min/Max** on, the highlighted node gets its min/max band. A line under the chart gives the spread right now and names the average in use. A node that was offline shows a gap
- **Per node**: one CPU / memory / IOWait chart per node, from 1 hour to 1 year, with threshold lines, migration markers and min/max bands. The choice between the two layouts is remembered

### Node panel

![Node side panel](images/node-panel.png)

Opened by clicking a node anywhere in the UI:

- Headroom, load now versus the 24 h and 7 d averages and the peak, and a points bar showing what is using headroom
- **Why N?**: each penalty with the reading behind it, for example "CPU peak this week 82% (over 80%) +10"
- The node's role, if it has one, and which guests move where
- **IO pressure** under IOWait (Proxmox VE 9): the share of time tasks waited on disk
- **Disk health**: one line such as "Disks: 6, all passed SMART". A disk that fails SMART, reports unknown health, or has 20% of its life left or less gets its own line. Data comes from the Proxmox disk list on each collection (needs `Sys.Audit`)
- **If this node fails**: one line from the node-failure simulation, linking to Insights
- Maintenance and evacuation buttons

### Quick search

![Quick search](images/quick-search.png)

Press **Ctrl+K** (Cmd+K on a Mac) or **/** (outside a text field), or use the search button in the top bar, to jump to any guest, node or page. Choosing a guest or node opens its side panel. It works from the keyboard alone and on phones.

### Wall-monitor mode

![Wall mode](images/wall.png)

The full-screen button in the top bar (large screens), or the address `#/wall`, opens a view for a monitor on the wall: the summary row, the Cluster Map, CPU per node and automation status with the last 24 hours of checks. It fills the screen at 1080p and 1440p without scrolling, keeps the screen awake where the browser allows, and has no menus or panels. Press Esc, leave full screen, or use the Exit button that appears when you move the mouse. On a phone it is a normal scrolling page.

---

## Insights

![Insights](images/insights.png)

A separate page for analysis over time:

- **Node trends** over 24 h, 7 d, 30 d or 90 d: direction, average and rate for CPU, memory and IOWait, with sparklines and time-to-threshold for confident fits that cross within the forecast horizon
- **Forecasts**: a trend is projected at most twice as far ahead as the history it was fitted on (30 days at most). Each node metric that is past its limit and still rising, or that reaches its limit within the horizon, gets one chart with the history, a dashed trend line, a marker at now and a dashed line at the limit, and one headline, for example "lyra memory is past its 70% limit and reaches 100% in about 10 days" or "cygnus memory reaches 80% in about 12 days". Medium-confidence fits say "rough estimate", and the fit details are behind **Details**. At most three charts show, soonest first, with **Show all** for the rest. Rises that stay under the limit for the whole horizon get one line each, and weak fits that would cross are named but not projected. When nothing below its limit reaches it, the card is one line. The recommendation engine's 48-hour look-ahead that feeds automation is listed separately. The IO wait forecast uses the configured IO wait threshold
- **Workload rhythm**: hour-of-day heatmap over 30 days in the schedule's time zone, with the hours your migration windows allow and the quietest stretch
- **What if a node fails?**: pick a node and see where its running guests would restart (largest first, onto the survivor with the most free memory, up to 95%, respecting anti-affinity tags and Proxmox HA rules), which can't restart elsewhere (passthrough hardware, host bind mounts, node-local disks) and which don't fit, with each survivor's memory before and after. Every node carries a chip: can fail, tight (a survivor ends above 85%), can't restart, or left out. The **Unplanned failure** toggle treats guests on node-local disks as unable to restart
- **Rolling update plan**: see [below](#rolling-update-plan)
- **Right-sizing**: guests whose vCPUs or memory don't match their last 7 days of use, biggest savings first. Totals count VMs only ("VMs could free 9 vCPUs and 14 GB"); containers sit in a collapsed "Containers (limits only)" group, because their cores and memory are limits the host doesn't reserve. Needs 3 days of history; VM memory only with the guest agent
- **Migration outcomes**: source-node CPU and memory before each migration versus 5 minutes and 24 hours after, for manual, automated and companion migrations

### Rolling update plan

![Rolling update plan](images/rolling-update.png)

A card on Insights, after "What if a node fails?", that plans updating or rebooting the nodes one at a time. It only plans: it never migrates, updates or reboots anything.

- **Quorum**: votes present, votes needed, and whether any single node can go down. Two-node clusters and QDevices are flagged
- **Order**: nodes with the fewest guests to move go first; the node running ProxBalance goes last
- **Each step**: where each running guest would go (respecting storage, memory up to 95%, hard placement rules and HA rules), which guests must shut down (passed-through hardware or node-local bind mounts), target memory after the moves, and how much node-local disk data would be copied. A node already updated in the plan is used as a target for later steps
- **Start maintenance on <node>** opens that node's panel and the normal maintenance flow

---

## Migration

### Suggestions

![Suggestions](images/dashboard-recs.png)

- Penalty-based suggestions in one list, in the order they would run, grouped into waves
- Each card: the guest and one status chip ("Ready · will run next check", "Waiting 2/3 runs", "Blocked: inflow cap", "Blocked: HA rule", "Blocked: storage full" and others), before → after bars for the source and target node, and one reason. **Details** has confidence, risk, how many automation runs have seen it, warnings and the migrate command
- Impact strip with cluster health before and after and the predicted load on every node
- Select a subset (all, from one node, only non-conflicting) and run it or copy the `qm`/`pct` commands. Run Plan executes moves wave by wave and stops on a failure
- Conflict what-ifs: when moves would overload a target, see the load against the limit, leave moves out of this run, defer one, or send it to the engine's alternative target
- Guests that were not recommended are grouped by reason

### One-click migrations

- Start VM and CT migrations from the suggestion cards, the Guests tab, the guest panel or the map preview
- Progress with transfer rates, including multi-disk VMs
- A migration counts as successful only when the Proxmox task ends OK; failures carry the task's error text
- "In flight" list with cancel, and rollback to the original node after a completed move

### Checks before every move

- **Storage**: every storage the guest uses must exist on the target. For disks on node-local storage, the target's use after the copy is shown (for example "local-lvm on orion: 72% → 88%"). A move that wouldn't fit is blocked; above 90% it is marked "Storage nearly full"
- **Proxmox HA rules** (Proxmox VE 9) and HA groups (Proxmox VE 8): no move onto a node running a negative-affinity peer or excluded by a strict node-affinity rule
- **Placement rules**: see below

### Placement rules

![Guest rules](images/placement-rules.png)

Rules come from guest tags and, optionally, Proxmox pools (`rules.pool_rules`):

| Rule | Tag | Kind |
|------|-----|------|
| Anti-affinity | `exclude_<group>` | Hard: a node that already runs a member is never a target |
| Affinity | `affinity_<group>` | Soft: a move that splits the group adds `affinity_soft_penalty` (default 15) to the target's score but is allowed |
| Required affinity | `affinity_req_<group>` on at least one member | Hard: the group moves together through companion migrations |

**Automation → Filters → Guest Rules** lists every rule as Hard or Soft and whether it holds now. When a hard rule is broken, **Enforce now** shows the moves that would fix it and asks before running them (dry run is respected). Soft rules are never enforced. See [Automation](AUTOMATION.md#placement-rules-list-and-enforce-now).

### Penalty-based scoring

Each target node gets penalties for high CPU, memory, IOWait, sustained IO pressure, guest density, maintenance mode, storage incompatibility, anti-affinity violations and splitting a soft affinity group. Headroom is 100 minus the penalty points, so higher is better. See [Scoring Algorithm](SCORING_ALGORITHM.md).

### Node maintenance mode

- Enter maintenance from the node panel; the setting is stored on the server and applies in every browser
- The confirmation says what automation will do (live, dry run or off)
- The evacuation plan shows where each guest lands and the projected load on each target, with a "Send all to" option and storage warnings
- The plan sends an explicit action and target per guest, so what runs is what was shown; a guest the chosen node cannot take fails and stays put
- Maintenance nodes are never used as targets, and live automation evacuates them (bypassing tag restrictions)

---

## Automation

![Automation](images/automation.png)

### Quick Setup

One status line (state, reason, last run, next check) and the controls: automation on/off, dry run, mode (Automatic or Semi-automatic) and sensitivity (Conservative, Balanced, Aggressive).

### Semi-automatic mode

![Waiting for approval](images/approvals.png)

In semi-automatic mode, automation moves guests on its own only for maintenance evacuations and for moves off a node over its CPU (85%) or memory (90%) safety limit. Every other move goes to the **Waiting for approval** list in Quick Setup, with **Approve** and **Dismiss**. Approving runs the move through the same checks as Run Now, checked again at that moment. Entries expire after `approval_ttl_hours` (default 24) or when the suggestion goes away. With dry run on nothing moves and Approve is disabled. See [Automation](AUTOMATION.md#semi-automatic-mode).

### Scheduled migrations

- Configurable check interval
- Migration windows and blackout periods, each with days of week and its own time zone, including overnight windows
- Live schedule status, for example "Migrations allowed now" or "blocked now: blackout ... opens in 3h 30m", using the same rules as the backend
- Weekly grid of all windows with a "now" line
- Dry run, on by default

### Safety

- Cluster health and quorum checks
- Target CPU and memory limits
- Duplicate migration prevention through the Proxmox task API
- Rollback and cycle detection to prevent migration loops
- Limits: max migrations per run, max concurrent, cooldown per guest, and max moves into one node per run
- Observation gating: a suggestion must appear in several runs in a row before automation acts on it
- Automation pauses after a failure
- The API test run is always a dry run: no migrations, no notifications, no recorded observations

### Change log

![Change log](images/change-log.png)

**Automation → History & Logs → Change log** lists what changed and who or what changed it, newest first:

- Migrations: manual moves, batches, rollbacks, evacuations, Enforce now, and automation's own moves and failures
- Approvals: queued moves approved or dismissed
- Settings: automation on/off, dry run, mode, maintenance on/off, and any other setting saved. Only the names of changed settings are recorded, never their values
- Tags added or removed, alert silences, Run Now, service restarts
- Updates started, finished, failed or rolled back

Each line shows the time, the source (a person, automation or the system) and one sentence. Filter by source or type; tap a line for details. Entries are kept for 180 days. Past automatic migrations are imported from the migration history on first use.

### Other automation features

- Threshold sliders for CPU, memory and IOWait that show every online node as a tick at its current value
- Distribution balancing for even guest counts across nodes
- Tag controls: `ignore` and `no-auto-migrate` exclude guests; `auto_migrate_ok` opts a guest in when whitelist mode is on; tags are bypassed for maintenance evacuations
- Paged migration history (5 to 100 per page) with target headroom, duration, reason and status

See the [Automated Migrations Guide](AUTOMATION.md) for configuration.

---

## Notifications

Providers: Pushover, Email (SMTP), Telegram, Discord, Slack and webhooks (HTTP POST with JSON).

- Event switches for migration events (start, completion, failure, per-migration results, waiting for approval), cluster events (node status, resource thresholds, evacuations) and system events (new suggestions, collector status, available updates)
- **Alerts fire once**: a threshold alert is sent when the limit is crossed and resolves only after 3 checks in a row at least 5 points on the good side. "New migration recommendations" is sent once while suggestions exist. An exact repeat of any other notification within 2 minutes is dropped
- **Settings → Notifications** lists active alerts. Each can be silenced for 1 h, 8 h, 24 h or until it resolves, on its own or for its whole type
- Each channel shows whether it is ready or skipped (and why) and can be tested on its own

See [Notifications](NOTIFICATIONS.md).

---

## Settings

![Settings](images/settings.png)

- Sections for Connection, Collection, Notifications, AI, System and Diagnostics, each with a live status line
- One save model with an unsaved-changes bar, shared with the Automation page
- System tools: view and download service logs, restart services, export the cluster snapshot (JSON) and guest list (CSV), and export, import or back up the configuration
- Updates: click the version number in the top bar to see the release notes, pick a channel (stable, beta, dev) and update. The updater backs up the database, settings and web files, installs the tested web bundle, and rolls back if the new version doesn't come up healthy. See [Releasing and updating](RELEASING.md)

### Diagnostics

![Diagnostics](images/diagnostics.png)

**Settings → Diagnostics** runs read-only checks and shows one line each: Proxmox API reachability and latency, each node, cluster quorum, token permissions (naming what is lost without each one), storage state per node, the collector, timers, the database, cache age and updates. Details are behind each line. **Copy as text** builds a report with secrets removed. **Run again** repeats the checks.

---

## AI analysis (optional)

AI review of suggestions with OpenAI, Anthropic or Ollama (local). It analyses CPU, memory, load and trends over a chosen period (1 h to 30 d) and returns recommendations with reasoning, a risk score and suggested timing. Node names the model invents are filtered out. See [AI Features](AI_FEATURES.md).

---

## Monitoring integrations

- Prometheus endpoint at `/api/metrics` with node, guest, collection and automation metrics, and a Grafana dashboard in `docs/grafana/`. See [Prometheus Metrics](PROMETHEUS.md)
- REST API for every action in the UI. See [API Reference](API.md)

---

## Security

- API token authentication (no stored passwords)
- Secrets (Proxmox API token, notification credentials, AI keys) are never returned by the API; forms show masked placeholders, and saving a placeholder keeps the stored secret
- Exported configuration contains placeholders instead of secrets; importing it keeps the stored values
- Notification errors are scrubbed so they do not echo configured credentials
- Cross-site POST, PUT, PATCH and DELETE requests are blocked (`csrf_protection`)
- Optional `api_key` required on every `/api/` call except `/api/health`
- Unprivileged LXC container
- Proxmox permissions: PVEAuditor for read-only, PVEVMAdmin for migrations; with a read-only token, migration and tag controls are disabled
- The change log records who or what made each change

---

## User interface

- Single-page React app with four pages: Dashboard, Insights, Automation and Settings
- Deep links for every page and tab (for example `#/dashboard/map`, `#/automation/filters`); reload keeps your place and Back/Forward work
- Suggestions, Map and Charts can be moved out of the Cluster tabs into their own dashboard sections
- Load errors show a Retry button; action results appear as short messages
- Light and dark modes, remembered per browser
- Pre-built frontend bundle, in-memory API cache (60 s), gzip, and parallel data collection
- All configuration is available from the web UI

### Phones

![ProxBalance on a phone](images/mobile.png)

- Bottom tab bar with the data age
- Cluster tabs scroll sideways; tables show fewer columns
- Tap-to-move sheet on the map instead of drag and drop
- On the Charts tab only the metric control stays above the chart; layout, period and overlays are behind **Options**
- Dialogs fit the screen; buttons and links are at least 40 px tall

---

[Back to Documentation](README.md)
