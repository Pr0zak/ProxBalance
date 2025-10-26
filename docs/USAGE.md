# ProxBalance Usage Guide

Detailed usage instructions and workflows for ProxBalance.

---

## 🗺️ Interactive Cluster Map

The Cluster Map provides a visual representation of your cluster with interactive capabilities.

### View Modes

**1. Usage View (Default)**
- Real-time CPU and memory utilization
- Color-coded health indicators:
  - Green: Healthy (<70% usage)
  - Yellow: Warning (70-85% usage)
  - Red: Critical (>85% usage)
- Running guest count

**2. Allocated View**
- Total allocated CPU cores
- Total allocated memory (GB)
- Helps identify overcommitment
- Capacity planning insights

**3. Disk I/O View**
- Current disk read/write rates
- IOWait percentage
- Storage bottleneck identification
- Performance troubleshooting

**4. Network View**
- Network inbound/outbound rates
- Bandwidth utilization
- Network saturation monitoring
- Traffic analysis

### Interacting with Nodes

**Click any node** to open the Node Details modal:
- Live metrics with sparkline backgrounds
- CPU Usage (blue gradient) - Current percentage with core count
- Memory Usage (purple gradient) - Percentage with GB used/total
- IOWait (orange gradient) - I/O latency monitoring
- Guest Count - Number of running VMs/CTs
- Node Information - Status, Load Average, Uptime
- Maintenance Mode toggle
- Evacuation planning button

### Interacting with Guests

**Visual Indicators on Cluster Map:**

Guests display visual indicators showing important information at a glance:

**Mount Point Indicators (Containers only):**
- **Cyan dot (top-right)**: Container has shared mount points (safe to migrate)
  - Shared storage mounts can be accessed from any node
  - Fully supported by automated migrations
  - Hover to see mount point count
- **Orange dot (top-right)**: Container has unshared bind mounts (requires manual migration)
  - Bind mounts reference specific directories on the current node
  - May require manual configuration before migration
  - Hover to see mount point details

**Passthrough Disk Indicators (VMs only):**
- **Red dot (top-left)**: VM has hardware passthrough disks (cannot migrate)
  - Direct device access (/dev/disk/by-id/*, /dev/sd*)
  - Physically bound to the current node's hardware
  - Automatically excluded from migration recommendations
  - Hover to see disk count and reason

**Click any VM/CT** on the map to view detailed information:
- Detailed metrics with live sparkline visualizations
- CPU usage with historical trend graph (blue)
- Memory usage with historical trend graph (purple)
- Disk I/O (read/write) stacked display
- Network I/O (in/out) stacked display
- Current node location and status
- Applied tags and configuration
- Mount point details (if present) - collapsible section
- Passthrough disk details (if present) - collapsible section
- Migration button

---

## 🔧 Node Maintenance Workflow

### Step-by-Step Process

**1. Mark Node for Maintenance**
- Click the target node in the Cluster Map
- Click "Enable Maintenance Mode" button
- Node is visually highlighted in yellow
- Node appears in "Nodes in Maintenance" section

**2. Plan Evacuation**
- Click "Plan Evacuation" button
- Review list of guests to migrate
- Check target node assignments
- Verify storage compatibility
- Review any warnings

**3. Execute Evacuation**
- Click "Execute Evacuation" button
- Confirm the action
- Monitor progress in real-time
- Watch loading animations
- Wait for completion

**4. Perform Maintenance**
- Update packages, reboot, hardware changes, etc.
- Node is excluded from recommendations
- Guests won't be migrated back automatically
- Take your time - no rush

**5. Return Node to Service**
- Click the node again
- Click "Disable Maintenance Mode"
- Node returns to normal pool
- Available for migrations again

### Maintenance Mode Features

**Visual Indicators:**
- Yellow border on Cluster Map
- Yellow badge with "Maintenance" label
- Listed in "Nodes in Maintenance" section
- Highlighted in recommendations

**Automatic Behaviors:**
- Excluded from migration targets
- Priority evacuation in automated migrations
- Tags and HA status bypassed for evacuation
- All guests migrated away before maintenance

**Safety Features:**
- Pre-migration storage validation
- Automatic target node selection
- Resource availability checks
- Prevents overloading target nodes

---

## 🚀 Manual Migration Workflow

### Migrating a Single Guest

**1. Select Guest**
- Click VM/CT on Cluster Map, OR
- Find guest in recommendations list, OR
- Use search/filter in guest list

**2. Click Migrate Button**
- Opens migration modal
- Shows current node
- Lists available target nodes

**3. Select Target Node**
- Choose from dropdown of online nodes
- Only compatible nodes shown
- Storage validated automatically

**4. Confirm Migration**
- Review migration details
- Click "Confirm Migration" button
- Migration starts immediately

**5. Monitor Progress**
- Task ID displayed
- Progress tracked in Recent Auto-Migrations
- Auto-refreshes every 10 seconds
- Shows completion or errors

### Migrating Containers with Mount Points

**Understanding Mount Point Types:**

Containers may have mount points that affect migration capability:

**Shared Storage Mounts (Cyan indicator):**
- Storage volumes accessible from multiple nodes (e.g., NFS, Ceph, ZFS over network)
- **Safe to migrate** - ProxBalance will migrate these containers automatically
- Target node will reconnect to the same shared storage
- No manual intervention required

**Unshared Bind Mounts (Orange indicator):**
- Bind mounts pointing to specific directories on the host node
- Example: `mp0: /mnt/storage/appdata,mp=/data`
- **Requires manual migration** - Data must be copied or storage reconfigured
- ProxBalance may flag these containers depending on configuration
- Consider creating equivalent mount points on target node before migration

**Best Practice:**
- Use shared storage for portable containers
- Document bind mount dependencies
- Plan manual migrations during maintenance windows
- Verify mount point availability on target nodes

### Migrating VMs with Passthrough Disks

**Hardware Passthrough Detection:**

VMs with passthrough disks (red indicator) cannot be migrated because they directly access host hardware:

**Passthrough Disk Types:**
- `/dev/disk/by-id/wwn-*` - Direct SATA/SAS disk access
- `/dev/sd*` - Block device passthrough
- Used for maximum I/O performance or specific hardware requirements

**Automatic Exclusion:**
- ProxBalance automatically detects passthrough disks
- These VMs are excluded from migration recommendations
- Red indicator (top-left) shows on Cluster Map
- Click VM to see passthrough disk details

**Manual Migration Workaround:**
1. Shutdown VM on source node
2. Physically move disk to target node (or reconfigure storage)
3. Update VM configuration to point to new device path
4. Start VM on target node

**Recommendation:** Use shared storage (local-lvm with replication, Ceph, NFS) instead of passthrough when possible to maintain migration flexibility.

### Batch Migrations

**From Recommendations:**
1. Review migration recommendations
2. Click "Execute All Recommended" button
3. Confirm batch migration
4. Migrations execute sequentially
5. Monitor in Recent Auto-Migrations card

**From Evacuation Plan:**
1. Enable node maintenance mode
2. Click "Plan Evacuation"
3. Review evacuation plan
4. Click "Execute Evacuation"
5. All guests migrate automatically

---

## 🏷️ Tagging System

### Tag Types

**1. Ignore Tag** - Exclude from automated migrations
```bash
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore"
```
- Guest never auto-migrated
- Can still be migrated manually
- Appears in "Ignored Guests" section
- Bypassed during maintenance evacuations

**2. Exclude Tags** - Anti-affinity groups
```bash
pvesh set /nodes/pve1/qemu/101/config --tags "exclude_database"
pvesh set /nodes/pve2/qemu/102/config --tags "exclude_database"
```
- Guests with matching `exclude_*` tags should be separated
- ProxBalance flags violations if on same node
- Prevents single points of failure
- Bypassed during maintenance evacuations

**3. Auto-Migrate-OK Tag** - Whitelist mode
```bash
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "auto-migrate-ok"
```
- Used when whitelist mode enabled in config
- Only tagged guests are auto-migrated
- More conservative automation approach

### Managing Tags

**Via Proxmox CLI:**
```bash
# Add single tag
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore"

# Add multiple tags (semicolon separated)
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore;exclude_prod"

# View current tags
pvesh get /nodes/<node>/qemu/<vmid>/config | grep tags

# Remove tags (set to empty)
pvesh set /nodes/<node>/qemu/<vmid>/config --tags ""
```

**Via Proxmox Web UI:**
1. Navigate to VM/CT
2. Click "Options"
3. Edit "Tags" field
4. Use semicolons to separate multiple tags
5. Click "OK" to save

**Refresh Cache After Tagging:**
After adding/changing tags, trigger a data refresh:
- Via UI: Click refresh button on dashboard
- Via API: `curl -X POST http://<container-ip>/api/refresh`
- Wait 90 seconds for collection to complete

### Tag Best Practices

**Naming Conventions:**
- Use lowercase only: `ignore` not `Ignore`
- No spaces in tag names: `exclude_database` not `exclude database`
- Use underscores for multi-word tags: `exclude_prod_firewall`
- Prefix anti-affinity tags with `exclude_`

**Common Patterns:**
```bash
# Critical infrastructure - never auto-migrate
--tags "ignore"

# Separate firewalls
--tags "exclude_firewall"

# Separate database replicas
--tags "exclude_database;production"

# Test VMs - allow auto-migration
--tags "auto-migrate-ok;test"
```

---

## 🤖 Automated Migrations

### Initial Setup

**1. Navigate to Configuration**
- Click "Configure" button in Automated Migrations widget
- Opens full configuration panel

**2. Review Safety Settings**
- **Dry Run Mode**: Enabled by default (test mode)
- **Minimum Confidence Score**: 75 (adjust based on comfort level)
- **Max Migrations Per Run**: 3 (rate limiting)
- **CPU/Memory Thresholds**: Trigger levels for auto-migration

**3. Configure Tag Behavior**
- **Respect Tags**: Enabled by default (honor ignore/exclude tags)
- **Whitelist Mode**: Disabled by default (opt-in vs opt-out)

**4. Test the System**
- Click "Test Now" button
- Reviews logs in terminal-style display
- Check test output for recommendations
- Verify no unwanted migrations

**5. Enable Automation (When Ready)**
- Toggle main "Enable Automation" switch
- Disable "Dry Run Mode" (requires confirmation)
- System starts running on schedule
- Check interval: default 5 minutes

### Safety Features

**Duplicate Migration Prevention:**
- Automatically checks Proxmox cluster tasks before starting migrations
- Queries `/api2/json/cluster/tasks` endpoint for running migrations
- Skips VMs that already have active migrations
- Prevents lock conflicts from concurrent automation runs
- Logs clear messages: "VM X already has a migration in progress, skipping"
- Works across separate automation runs (5-minute intervals)

**Migration Conflict Detection:**
- Each automation run checks for in-progress migrations
- VMs with active migrations are automatically excluded
- Prevents "can't lock file" errors
- Ensures only one migration per VM at a time

### Monitoring Automation

**Migrations In Progress:**
- Real-time display of currently running migrations
- Shows VM/CT name and ID
- Displays source node (target determined during migration)
- Start time in local timezone
- **Elapsed time** - Live countdown (e.g., "2m 34s")
- Auto-refreshes every 10 seconds
- Blue pulsing border with animated spinner
- Appears above Recent Auto-Migrations when active

**Recent Auto-Migrations Card:**
- Auto-refreshes every 10 seconds
- Shows last 10 completed migrations
- Displays VM/CT ID and name
- Shows source → target nodes with **target node score**
- Confidence score and reason
- Status (success/failed)
- Migration duration

**Migration Log Viewer:**
- Terminal-style display in configuration panel
- Click "Refresh" to load latest 500 lines
- Click "Download" to save logs
- Shows detailed execution logs
- Timestamps and error details

**Command Line Monitoring:**
```bash
# Follow logs in real-time
pct exec <container-id> -- journalctl -u proxmox-balance-automigrate.service -f

# View recent migrations
pct exec <container-id> -- journalctl -u proxmox-balance-automigrate.service -n 100

# Search for specific guest
pct exec <container-id> -- journalctl -u proxmox-balance-automigrate.service | grep "VM 120"
```

### Advanced Configuration

**Edit config.json directly for advanced features:**
```bash
pct exec <container-id> -- nano /opt/proxmox-balance-manager/config.json
```

**Advanced Settings:**
- `migration_windows`: Time-based scheduling
  ```json
  "migration_windows": [
    {"start": "22:00", "end": "06:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}
  ]
  ```
- `blackout_periods`: Prevent migrations during specific times
  ```json
  "blackout_periods": [
    {"start": "09:00", "end": "17:00", "days": ["Mon", "Tue", "Wed", "Thu", "Fri"]}
  ]
  ```
- `cooldown_period_minutes`: Time between migrations per guest (default: 60)
- `cluster_health_checks`: Enable/disable quorum validation (default: true)

**After editing config.json:**
```bash
# Restart services to apply changes
pct exec <container-id> -- systemctl restart proxmox-balance
pct exec <container-id> -- systemctl restart proxmox-collector.timer
```

---

## 🤖 AI-Powered Recommendations

### Enabling AI Features

**1. Navigate to Settings**
- Click ⚙️ Settings icon in top-right corner
- Scroll to "AI-Enhanced Migration Recommendations"

**2. Enable AI**
- Toggle "Enable AI Recommendations"
- Select AI provider:
  - **OpenAI**: Requires API key from platform.openai.com
  - **Anthropic**: Requires API key from console.anthropic.com
  - **Ollama**: Requires local Ollama installation

**3. Configure Provider**

**For OpenAI:**
- Model: `gpt-4o` (best) or `gpt-3.5-turbo` (fast)
- API Key: Your OpenAI API key
- Base URL: Leave default (https://api.openai.com/v1)

**For Anthropic:**
- Model: `claude-3-5-sonnet-20241022` (best) or `claude-3-haiku-20240307` (fast)
- API Key: Your Anthropic API key (starts with sk-ant-)
- Base URL: Leave default (https://api.anthropic.com/v1)

**For Ollama:**
- Model: `qwen2.5:7b` (recommended) or `llama3.1:8b`
- Base URL: `http://<ollama-host>:11434`
- Pull model first: `ollama pull qwen2.5:7b`

**4. Set Analysis Period**
- **1 hour**: Recent trends only
- **6 hours**: Short-term patterns
- **24 hours**: Recommended for most clusters
- **7 days**: Long-term analysis

**5. Save Settings**
- Click "Save Settings" button
- Services restart automatically
- Test with "Get AI Recommendations"

### Using AI Recommendations

**1. Generate Recommendations**
- Click "Get AI Recommendations" button
- AI analyzes cluster data
- Takes 10-30 seconds depending on provider

**2. Review AI Analysis**
- Detailed reasoning for each recommendation
- Considers historical trends
- Identifies patterns and bottlenecks
- Provides confidence scoring

**3. Execute Recommendations**
- Same process as standard recommendations
- Click individual migrate buttons, OR
- Use "Execute All Recommended" for batch

**4. Compare with Standard Recommendations**
- AI recommendations shown separately
- Standard recommendations still available
- Use both for best insights

### AI Best Practices

**Choosing Analysis Period:**
- **1h**: Fast, but may miss patterns (use for urgent situations)
- **6h**: Good balance for active clusters
- **24h**: Best for most use cases (recommended)
- **7d**: Comprehensive, but may include outdated data

**Model Selection:**
- **Cloud Models** (OpenAI, Anthropic): Best quality, API costs apply
- **Local Models** (Ollama): Free, privacy-focused, requires local resources
- **Faster Models**: Lower quality but quicker responses
- **Larger Models**: Better insights but slower and more expensive

**Cost Considerations:**
- OpenAI GPT-4: ~$0.01-0.03 per analysis
- Anthropic Claude: ~$0.01-0.05 per analysis
- Ollama: Free (local compute only)

See [AI Features Guide](AI_FEATURES.md) for detailed setup and troubleshooting.

---

## 📊 Dashboard Widgets

### Node Status Cards
- Real-time metrics for each node
- Sparkline trend visualizations
- Color-coded health indicators
- Click to view detailed modal
- Maintenance mode indicators

### Recent Auto-Migrations
- Last 10 automated migrations
- Auto-refreshes every 10 seconds
- Status, duration, confidence
- Source → target nodes with **target node scores**
- Target score shows migration suitability (lower = better)
- Error reporting
- CSV export includes scores

### Tagged Guests & Affinity Rules
- Ignored guests list
- Anti-affinity groups
- Violation warnings
- Tag management shortcuts

### Migration Recommendations
- Standard algorithm recommendations
- AI recommendations (if enabled)
- Confidence scores with **target node scores**
- Target scores show suitability (lower = better target)
- Penalty-based scoring system
- One-click execution
- Detailed reasoning

### Migration History
- 7-day migration timeline chart
- Success/failure tracking
- Export data options

### Automated Migrations Status
- Current automation state
- Next run countdown
- Recent test results
- Quick configuration access

---

## ⚙️ Settings Management

Access via ⚙️ icon in top-right corner.

### General Settings
- **Collection Interval**: How often to gather metrics (default: 60 minutes)
- **UI Refresh Interval**: Dashboard auto-refresh (default: 15 minutes)
- Adjust based on cluster size and performance needs

### Proxmox API Configuration
- **Proxmox Host**: IP or hostname of Proxmox host
- **API Token ID**: Format `user@realm!tokenname`
- **API Token Secret**: UUID from token creation
- **Verify SSL**: Enable for production (disable for self-signed certs)

### AI Configuration
- Enable/disable AI features
- Select AI provider
- Configure API credentials
- Set analysis time period

### Service Management
- **Restart API Service**: Restart Flask/Gunicorn
- **Restart Collector Service**: Restart data collection
- View service status
- One-click troubleshooting

### Configuration Validation
- Automatic JSON syntax checking
- API connectivity testing
- Permission verification
- Error reporting

---

## 🔍 Troubleshooting

For detailed troubleshooting, see [Troubleshooting Guide](TROUBLESHOOTING.md).

**Quick Diagnostics:**
```bash
# Comprehensive status check
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <container-id>

# Service debugger
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/debug-services.sh)" _ <container-id>
```

**Common Issues:**
- **502 Bad Gateway**: Restart API service via Settings
- **No data showing**: Wait 2 minutes for initial collection
- **Migrations failing**: Check storage compatibility in logs
- **Tags not working**: Force cache refresh after tag changes

---

## 💡 Tips & Tricks

### Performance Optimization
- **Large Clusters (100+ guests)**: Increase collection interval to 120+ minutes
- **Slow Networks**: Increase timeouts in config.json
- **High CPU Usage**: Reduce Gunicorn workers or increase intervals

### Migration Strategy
- **Test First**: Use dry-run mode before enabling automation
- **Start Conservative**: High confidence scores (80+), low migration limits (1-2)
- **Gradual Rollout**: Monitor for a week before going fully automated
- **Tag Strategically**: Use tags for critical workloads

### Monitoring Best Practices
- Review Recent Auto-Migrations daily
- Check migration logs weekly
- Validate anti-affinity rules monthly
- Update tags as infrastructure changes

### Maintenance Planning
- Use maintenance mode for planned updates
- Schedule evacuations during off-hours
- Monitor evacuation progress actively
- Document maintenance procedures

---

[⬆ Back to Documentation](README.md)
