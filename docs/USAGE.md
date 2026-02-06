# Usage Guide

---

## Cluster Map

The cluster map provides a visual representation of your cluster with five view modes: CPU Usage, Memory Usage, Allocated Resources, Disk I/O, and Network.

### Node interaction

Click any node to open the detail modal:

- Live metrics with sparkline backgrounds (CPU, memory, IOWait)
- Guest count and node status
- Load average and uptime
- Maintenance mode toggle
- Evacuation planning button

### Guest interaction

Click any VM or CT on the map to view:

- CPU and memory usage with historical sparkline graphs
- Disk I/O and network I/O
- Current node, status, and applied tags
- Mount point details (containers) or passthrough disk details (VMs)
- Migration button

### Visual indicators

Guests display colored dots indicating migration constraints:

- **Cyan dot** (top-right, containers): Shared mount points, safe to migrate
- **Orange dot** (top-right, containers): Unshared bind mounts, may require manual migration
- **Red dot** (top-left, VMs): Passthrough disks, cannot be migrated

---

## Node Maintenance

1. Click the target node in the cluster map
2. Click "Enable Maintenance Mode" -- the node gets highlighted in yellow
3. Click "Plan Evacuation" to review the list of guests, target assignments, and storage compatibility
4. Click "Execute Evacuation" to migrate all guests
5. Perform maintenance on the node
6. Click the node again and "Disable Maintenance Mode" to return it to the pool

Maintenance mode excludes the node from migration targets and gives priority to evacuating its guests (bypassing tag restrictions).

---

## Manual Migration

### Single guest

1. Click a VM/CT on the cluster map, or find it in the recommendations list
2. Click "Migrate"
3. Select a target node from the dropdown (only compatible nodes shown)
4. Confirm the migration
5. Monitor progress in the Recent Auto-Migrations section (auto-refreshes every 10 seconds)

### Batch migration

From the recommendations section, click "Execute All Recommended" to migrate all recommended guests sequentially.

### Containers with mount points

- **Shared storage mounts** (cyan indicator): Safe to migrate. The target node reconnects to the same shared storage.
- **Unshared bind mounts** (orange indicator): Require manual data migration or mount point setup on the target before migration.

### VMs with passthrough disks

VMs with passthrough disks (red indicator) are excluded from migration recommendations. These require manual intervention: shut down the VM, move or reconfigure the disk on the target node, and start the VM there.

---

## Tagging

### Tag types

| Tag | Effect |
|-----|--------|
| `ignore` | Excluded from automated migration recommendations |
| `exclude_<group>` | Anti-affinity: guests with the same tag are kept on different nodes |
| `auto-migrate-ok` | Whitelist mode: only tagged guests are auto-migrated (when enabled) |

### Applying tags

**Via Proxmox CLI:**
```bash
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore"
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "exclude_database"
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore;exclude_prod"
```

**Via Proxmox web UI:**
Navigate to the VM/CT > Options > Tags.

**Tag rules:**
- Lowercase only (`ignore`, not `Ignore`)
- No spaces in tag names (use underscores)
- Separate multiple tags with semicolons or spaces
- Anti-affinity tags must start with `exclude_`
- Exact match required (`exclude_db` and `exclude_database` are different groups)

After changing tags, trigger a refresh:
```bash
curl -X POST http://<container-ip>/api/refresh
```

---

## AI Recommendations

### Setup

1. Open Settings (gear icon, top right)
2. Enable AI Recommendations
3. Select a provider:
   - **OpenAI**: API key from platform.openai.com
   - **Anthropic**: API key from console.anthropic.com (starts with `sk-ant-`)
   - **Ollama**: Base URL of your Ollama instance (e.g., `http://server:11434`)
4. Choose a model and analysis time period (1h, 6h, 24h, or 7d)
5. Save Settings

### Generating recommendations

Click "Get AI Recommendations" in the dashboard. The AI analyzes cluster metrics over the selected time period and returns recommendations with:

- Priority level (high/medium/low)
- Natural language reasoning
- Risk score (0.0 to 1.0)
- Estimated impact
- Suggested timing

AI recommendations appear separately from standard penalty-based recommendations. Both can be used together.

See [AI Features](AI_FEATURES.md) for provider details and model selection.

---

## Automated Migrations

### Enabling

1. Navigate to the Automated Migrations section on the dashboard
2. Click "Configure"
3. Toggle "Enable Automated Migrations"
4. Choose a schedule preset (Conservative, Balanced, or Aggressive) or configure manually
5. Start with dry-run mode enabled to test behavior
6. Save configuration

### Monitoring

The automation dashboard shows:

- **Status card**: Active/disabled state, next check countdown, dry-run indicator
- **Statistics**: 24-hour and 7-day migration counts, success rate
- **Decisions**: Pre-migration visibility showing all candidates with reasons
- **In-progress tracking**: Live migration progress with percentage, transfer rate, and elapsed time
- **Recent migrations**: Completed migrations with duration, confidence, and status
- **Activity log**: Why guests were skipped (cooldown, low confidence, tags, affinity)
- **History chart**: 7-day bar chart of successful, failed, and skipped migrations
- **CSV export**: Download migration history for analysis

### Command-line monitoring

```bash
# Follow automation logs
pct exec <ctid> -- journalctl -u proxmox-balance-automigrate.service -f

# View recent migrations
pct exec <ctid> -- journalctl -u proxmox-balance-automigrate.service -n 100

# Search for a specific guest
pct exec <ctid> -- journalctl -u proxmox-balance-automigrate.service | grep "VM 120"
```

See [Automated Migrations Guide](AUTOMATION.md) for full configuration details.

---

## Settings

Access via the gear icon in the top-right corner of the dashboard.

### Sections

- **Collection Optimization**: Cluster size presets, parallel workers, intervals
- **Recommendation Thresholds**: CPU, memory, and IOWait trigger levels
- **AI Configuration**: Provider, model, API key, analysis period
- **Proxmox API**: Host, port, token credentials, SSL
- **Service Management**: Restart API/collector services, view status
- **System Updates**: Version info, check for updates, branch switching
- **Penalty Scoring**: Customize time period weights and penalty values
- **Configuration Export/Import**: Backup and restore settings

---

## Diagnostics

### Status checker

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <container-id>
```

### Service debugger

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/debug-services.sh)" _ <container-id>
```

### Manual checks

```bash
pct exec <ctid> -- systemctl status proxmox-balance proxmox-collector.timer nginx
curl http://<container-ip>/api/health
pct exec <ctid> -- journalctl -u proxmox-balance -n 50
```

For detailed troubleshooting, see [Troubleshooting](TROUBLESHOOTING.md).

---

[Back to Documentation](README.md)
