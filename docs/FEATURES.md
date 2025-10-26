# ProxBalance Features

Complete feature overview for ProxBalance.

---

## 📊 Monitoring & Visualization

### Real-Time Monitoring
- **Live Metrics** - CPU, memory, IOWait, and load metrics across all nodes
- **Sparkline Visualizations** - Live trend graphs on Node Status cards and modals
  - Gradient backgrounds with color-coded metrics (blue=CPU, purple=Memory, orange=IOWait)
  - Enhanced visibility with animated waveform patterns
  - 40-point historical trend visualization
  - Auto-scaling based on current values

### Multi-Timeframe Charts
- View historical data from 1 hour to 1 year
- Automatic resolution optimization based on time range
- Interactive Chart.js powered visualizations
- Export data for external analysis

### Parallel Data Collection
- Configurable collection optimization
- Optimized for small, medium, or large clusters
- Configurable intervals (default: 60 minutes)
- Atomic cache updates prevent corruption

### Interactive Cluster Map
Visual representation with 5 view modes:

1. **CPU Usage View** - Real-time CPU consumption
   - CPU utilization percentage
   - Color-coded health indicators
   - Running guest count

2. **Memory Usage View** - Real-time memory consumption
   - Memory utilization percentage
   - Color-coded health indicators
   - Running guest count

3. **Allocated View** - Provisioned resources
   - Total allocated CPU cores
   - Total allocated memory
   - Capacity planning insights

4. **Disk I/O View** - Storage performance
   - Read/write rates
   - IOWait metrics
   - Storage bottleneck identification

5. **Network View** - Network traffic
   - Inbound/outbound rates
   - Network saturation monitoring
   - Bandwidth utilization

**Interactive Features:**
- Click nodes to view detailed stats with sparkline backgrounds
- Manage maintenance mode directly from node modal
- Click VMs/CTs to view detailed metrics with live sparkline graphs
- Plan evacuation and execute migrations from the map
- Real-time updates without page refresh

**Visual Indicators:**
- **Mount Point Indicators** (Containers only)
  - Cyan dot (top-right): Shared mount points (safe to migrate)
  - Orange dot (top-right): Unshared bind mounts (requires manual migration)
  - Shows mount point count in tooltip
- **Passthrough Disk Indicators** (VMs only)
  - Red dot (top-left): Hardware passthrough disks (cannot migrate)
  - Shows disk count and reason in tooltip
  - Automatically excluded from migration recommendations

### Dark Mode
- Modern interface with automatic theme detection
- Manual light/dark theme toggle
- Optimized readability in both modes
- Persistent theme preference

---

## 🔄 Maintenance & Migration

### Node Maintenance Mode
Mark nodes for maintenance with intelligent evacuation:

**Features:**
- Visual indicators across UI (yellow highlighting on Cluster Map and recommendations)
- Integrates with automated migrations for scheduled evacuations
- Ignores tags and HA status for priority evacuation
- Complete node evacuation with clear maintenance reasoning
- Migration recommendations automatically prioritize maintenance node evacuations

**Workflow:**
1. Mark node for maintenance via Cluster Map
2. Review evacuation plan with storage validation
3. Execute automated evacuation
4. Perform maintenance safely
5. Bring node back online
6. Disable maintenance mode

### Smart Migration Recommendations
Intelligent migration suggestions based on:
- Historical performance data
- Current resource utilization
- Storage compatibility
- Anti-affinity rules
- Tag-based exclusions
- Node health status
- Maintenance mode priority

**Recommendation Details:**
- Confidence score (0-100)
- Detailed reasoning
- Expected impact analysis
- Storage validation results

### AI-Powered Analysis
Optional AI recommendations using:
- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude 3.5 Sonnet, Claude 3 Haiku)
- **Ollama** (Local LLMs - Qwen2.5, Llama3.1, Mistral)

**AI Features:**
- Advanced pattern recognition
- Predictive workload analysis
- Detailed migration reasoning
- Trend-based recommendations
- Smart filtering to prevent hallucinations

See [AI Features Guide](AI_FEATURES.md) for setup instructions.

### One-Click Migrations
Execute migrations directly from web interface:
- **VMs** - Live migration with minimal downtime
- **Containers** - Restart migration (offline)
- Real-time progress tracking
- Detailed task logs
- Error reporting and rollback options

**Migration Validation:**
- Storage compatibility checks
- Target node resource availability
- Guest lock status verification
- Network connectivity validation

---

## 🤖 Automated Migrations (Experimental)

Scheduled automation with comprehensive safety features.

### Automation Features
- **Dry-Run Mode** - Test migrations without execution (enabled by default)
- **Scheduled Checks** - Configurable interval via systemd timer (default: 5 minutes)
- **Safety Thresholds** - CPU/memory limits, confidence scores
- **Migration Windows** - Time-based scheduling (e.g., off-hours only)
- **Blackout Periods** - Prevent migrations during specific times
- **Container Restart Support** - For non-live CT migrations
- **Maintenance Mode Integration** - Automatically evacuates maintenance nodes

### Real-Time Tracking & Monitoring
- **In-Progress Migration Tracking** - Live display of currently running migrations
  - Shows VM/CT name, ID, and source node
  - Displays start time and elapsed time (e.g., "2m 34s")
  - **Progress tracking for both VMs and CTs**
    - VM migrations: Shows percentage, transferred/total GiB, and transfer speed
    - CT migrations: Shows percentage (from disk size), transferred GiB, and transfer speed
    - Multi-disk support with aggregate progress for VMs
  - Blue pulsing border with animated spinner
  - Queries Proxmox cluster tasks API for real-time status
  - Auto-refreshes every 10 seconds
- Real-time migration task polling with accurate completion status
- Live error reporting in Recent Auto-Migrations UI
- Migration log viewer with terminal-style display
- Download logs directly from the UI
- Shows VM/CT ID alongside names for easy identification
- **Target Node Scores** - Displays migration suitability scores
  - Shown in Migration Recommendations UI
  - Included in automation logs and Recent Auto-Migrations
  - Lower score = better target node
  - Exported in CSV downloads

### Storage Compatibility Checks
Intelligent validation before migration:
- Automatically verifies target nodes have all required storage volumes
- Filters out incompatible targets from recommendations
- Prevents migration failures due to missing storage
- Works with both VMs (QEMU) and Containers (LXC)
- Logs storage incompatibilities for debugging

### Safety Features
Multiple safeguards for automated operations:
- **Duplicate Migration Prevention** - Prevents concurrent migrations
  - Queries Proxmox cluster tasks API before starting migrations
  - Skips VMs that already have active migrations
  - Prevents lock conflicts across automation runs
  - Logs clear messages when migrations are skipped
- **Min Confidence Score** - Only execute high-confidence migrations
- **Max Migrations Per Run** - Rate limiting (default: 3)
- **Cluster Health Checks** - Verify quorum and node status
- **Cooldown Periods** - Time between migrations per guest
- **Tag Respecting** - Honor ignore/exclude tags
- **Validation Before Execution** - Pre-flight checks
- **Penalty-Based Scoring** - No hard disqualifications, flexible targeting

### Tag-Based Controls
Fine-grained control over automation:
- **Ignore Tag** - `ignore` - Exclude from all automated migrations
- **Anti-Affinity Rules** - `exclude_<group>` - Enforce workload separation
- **Whitelist Mode** - `auto-migrate-ok` - Opt-in for migrations only
- **Tags Bypassed for Maintenance** - Priority evacuation override

See [Automation Guide](AUTOMATION.md) for detailed configuration.

---

## 🏷️ Advanced Features

### Anti-Affinity Rules
Tag-based system to enforce workload separation:

**Use Cases:**
- Keep database replicas on separate nodes
- Separate firewalls from services they protect
- Distribute redundant services
- Prevent single points of failure

**Implementation:**
```bash
# Both VMs get the same exclude tag
pvesh set /nodes/pve1/qemu/101/config --tags "exclude_database"
pvesh set /nodes/pve2/qemu/102/config --tags "exclude_database"
# ProxBalance will flag if they end up on the same node
```

**Violation Detection:**
- Real-time monitoring
- Dashboard warnings
- Migration recommendation adjustments
- Maintenance mode override (for evacuations)

### Performance Optimizations
Enterprise-grade performance enhancements:

1. **Pre-Compiled Frontend** - 93% faster page load (NEW)
   - Babel CLI pre-compilation eliminates browser JSX transpilation
   - LCP improved from 6.5s to 0.48s (13.5x faster)
   - Removes 3MB babel.min.js from production bundle
   - Local React libraries eliminate CDN latency
   - Automated build process during installation and updates

2. **Flask Compression** - 70-80% bandwidth reduction
   - gzip compression for API responses
   - Reduces network overhead
   - Faster page loads

3. **In-Memory Caching** - 85% faster API responses
   - 60-second TTL cache
   - Reduces disk I/O
   - Improves responsiveness

4. **Memoized Components** - 65% faster modal rendering
   - React useMemo optimization
   - Prevents unnecessary re-renders
   - Smoother UI interactions

5. **Lazy Loading** - 300KB+ saved on initial load
   - Chart.js loaded on-demand
   - Faster initial page load
   - Reduced memory footprint

**Overall Improvement:** 90%+ faster performance with sub-second page loads

### Performance Monitoring
Real-time collection metrics and optimization settings:
- Collection duration tracking
- API response time monitoring
- Cache hit/miss statistics
- Worker process health
- Memory usage tracking

### Collapsible UI
Customizable dashboard with collapsible sections:
- Minimize unused widgets
- Maximize screen real estate
- Persistent state across sessions
- Responsive mobile-friendly design

---

## 🔒 Security Features

### API Token Authentication
- No passwords stored in configuration
- Secure token-based authentication
- Token permissions managed via Proxmox ACL
- Support for read-only (PVEAuditor) and full access (PVEVMAdmin)

### Unprivileged LXC Container
- Runs in unprivileged container for isolation
- No host file system access
- Limited attack surface
- Containerized security boundary

### Local Network Design
- Designed for local network operation
- No external internet exposure required
- Optional SSL/TLS support
- Private API communication

### Audit Trail
- Migration history tracking
- Detailed operation logs
- Task ID reference for Proxmox correlation
- Error reporting and debugging

---

## 🎨 User Experience

### Modern Web Interface
- Single-page React application
- Responsive design (desktop, tablet, mobile)
- Real-time updates via REST API
- Dark mode support
- Intuitive navigation

### Data Visualization
- Color-coded health indicators
- Interactive charts and graphs
- Sparkline trend visualizations
- Progress indicators
- Status badges

### Accessibility
- Keyboard navigation support
- Clear visual hierarchy
- Descriptive labels and tooltips
- Error message clarity
- Loading state indicators

---

## 📈 Cluster Insights

### Resource Analysis
- CPU utilization trends
- Memory pressure identification
- Storage performance metrics
- Network bandwidth usage
- Load distribution analysis

### Capacity Planning
- Resource allocation tracking
- Growth trend analysis
- Overcommit ratios
- Node capacity forecasting
- Guest distribution insights

### Health Monitoring
- Node status tracking
- Guest state monitoring
- Service availability
- Quorum status
- Cluster health indicators

---

## 🔧 Configuration & Customization

### Flexible Configuration
- Web-based settings management
- JSON configuration file
- Environment-based settings
- Runtime configuration updates
- Validation and error checking

### Integration Options
- Proxmox API integration
- RESTful API for external tools
- Webhook support (future)
- Export data in JSON format
- Custom AI model support

### Extensibility
- Modular architecture
- Plugin-ready design
- Custom migration logic (future)
- Third-party AI providers
- Open-source extensibility

---

## 📊 Supported Metrics

### Node Metrics
- CPU usage percentage
- CPU core count
- Memory usage (GB and %)
- IOWait percentage
- Load average (1m, 5m, 15m)
- Uptime
- Guest count
- Disk I/O rates
- Network I/O rates

### Guest Metrics
- CPU usage percentage
- Memory usage (GB and %)
- Disk read/write rates
- Network in/out rates
- Status (running, stopped, etc.)
- Node location
- Tags and configuration
- Storage assignments

### Historical Data
- Hourly data points
- Daily aggregates
- Weekly trends
- Monthly summaries
- Yearly overviews
- Custom time ranges

---

## 🚀 Future Features (Roadmap)

Planned enhancements:
- Storage balancing recommendations
- HA group optimization
- Backup integration
- Cost analysis
- Power consumption tracking
- Advanced scheduling rules
- Webhook notifications
- Multi-cluster support

See [GitHub Issues](https://github.com/Pr0zak/ProxBalance/issues) for feature requests and discussions.

---

[⬆ Back to Documentation](README.md)
