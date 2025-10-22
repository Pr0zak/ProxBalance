# ProxBalance
<div align="center">

<img src="assets/logo_v2.svg" alt="ProxBalance Logo" width="200"/>

<br/>
<br/>

![ProxBalance Logo](https://img.shields.io/badge/ProxBalance-Cluster_Optimization-1e40af?style=for-the-badge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg?style=for-the-badge)](https://www.python.org/downloads/)
[![Proxmox](https://img.shields.io/badge/Proxmox-VE_7%2B-orange.svg?style=for-the-badge)](https://www.proxmox.com/)

**Intelligent cluster monitoring and VM/CT migration for Proxmox VE**

[Quick Start](#-quick-start) • [Features](#-features) • [Documentation](docs/README.md)

</div>

---

## 🎯 What is ProxBalance?

ProxBalance is a web-based cluster analyzer and migration manager for Proxmox VE. Monitor your cluster in real-time, get intelligent migration recommendations, and optimize resource distribution across your nodes.

<div align="center">
<img src="docs/images/pb_showcase.gif" alt="ProxBalance in Action" width="800"/>
</div>

---

## ✨ Features

### Monitoring & Visualization
- **Real-Time Monitoring** - CPU, memory, IOWait, and load metrics across all nodes
  - **Sparkline Visualizations** - Live trend graphs on Node Status cards and modals
  - Gradient backgrounds with color-coded metrics (blue=CPU, purple=Memory, orange=IOWait)
  - Enhanced visibility with animated waveform patterns
- **Multi-Timeframe Charts** - View historical data from 1 hour to 1 year with automatic resolution optimization
- **Parallel Data Collection** - Configurable collection optimization for small, medium, or large clusters
- **Interactive Cluster Map** - Visual representation with 4 view modes (Usage, Allocated, Disk I/O, Network)
  - Click nodes to view detailed stats with sparkline backgrounds and manage maintenance mode
  - Click VMs/CTs to view detailed metrics with live sparkline graphs
  - Plan evacuation and execute migrations directly from the map
  - Real-time resource usage visualization
- **Dark Mode** - Modern interface with light/dark theme support

### Maintenance & Migration
- **Node Maintenance Mode** - Mark nodes for maintenance with automatic evacuation recommendations
  - Visual indicators across UI (yellow highlighting on Cluster Map and recommendations)
  - Integrates with automated migrations system for scheduled evacuations
  - Ignores tags and HA status for priority evacuation
  - Complete node evacuation with clear maintenance reasoning
  - Migration recommendations automatically prioritize maintenance node evacuations
- **Smart Recommendations** - Intelligent migration suggestions based on historical data
- **AI-Powered Analysis** - Optional AI recommendations using OpenAI, Anthropic, or Ollama
- **One-Click Migrations** - Execute migrations directly from the web interface

### Automated Migrations (Experimental)
- **Scheduled Automation** - Automatic load balancing based on configurable rules
  - Dry-run mode for testing (enabled by default)
  - Configurable check intervals and safety thresholds
  - Migration windows and blackout periods
  - Container restart support for non-live migrations
  - Maintenance mode integration - automatically evacuates nodes in maintenance
- **Safety Features** - Multiple safeguards for automated operations
  - Min confidence score requirements
  - Max migrations per run limits
  - Cluster health checks and quorum requirements
  - Cooldown periods between migrations
- **Tag-Based Controls** - Fine-grained control over automation
  - Respect ignore tags and anti-affinity rules
  - Optional whitelist mode (auto-migrate-ok tag)
  - Tags bypassed for maintenance evacuations (priority override)

### Advanced Features
- **Anti-Affinity Rules** - Tag-based system to enforce workload separation
- **Performance Optimizations** - Enterprise-grade performance enhancements
  - **Flask Compression** - 70-80% bandwidth reduction with gzip compression
  - **In-Memory Caching** - 85% faster API responses with 60-second TTL cache
  - **Memoized Components** - 65% faster modal rendering with React useMemo
  - **Lazy Loading** - Chart.js loaded on-demand (300KB+ saved on initial load)
  - Overall improvement: 60-70% faster performance across the board
- **Performance Monitoring** - Real-time collection metrics and optimization settings
- **Collapsible UI** - Customizable dashboard with collapsible sections

---

## 🚀 Quick Start

### Installation (5 minutes)

Run this command on your Proxmox host:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"
```

The installer will:
1. Auto-detect your cluster nodes
2. Create an unprivileged LXC container
3. Install and configure ProxBalance
4. Create API tokens with proper permissions
5. Start all services

### Access

Once installed, open `http://<container-ip>` in your browser.

---

## 📊 Screenshots

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="docs/images/dashboard-0.png" alt="Dashboard" width="400"/>
        <br/>
        <b>Dashboard Overview</b>
      </td>
      <td align="center" width="50%">
        <img src="docs/images/clustermap.png" alt="Cluster Map" width="400"/>
        <br/>
        <b>Interactive Cluster Map</b>
      </td>
    </tr>
    <tr>
      <td align="center" width="50%">
        <img src="docs/images/nodestatus.png" alt="Node Status" width="400"/>
        <br/>
        <b>Detailed Node Metrics</b>
      </td>
      <td align="center" width="50%">
        <img src="docs/images/ai_recomendation.png" alt="AI Recommendations" width="400"/>
        <br/>
        <b>AI-Powered Recommendations</b>
      </td>
    </tr>
  </table>
</div>

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **[Installation Guide](docs/INSTALL.md)** | Detailed installation and configuration |
| **[AI Features](docs/AI_FEATURES.md)** | AI-powered recommendations setup |
| **[Troubleshooting](docs/TROUBLESHOOTING.md)** | Common issues and solutions |
| **[Contributing](docs/CONTRIBUTING.md)** | How to contribute |

➡️ **[Complete Documentation](docs/README.md)**

---

## 🔧 Basic Usage

### Node Details & Maintenance

Click any node in the Cluster Map to access detailed information and management:

**Node Details Modal Features:**
- **Live Metrics with Sparklines** - Gradient backgrounds with animated trend graphs
  - CPU Usage (blue gradient) - Current percentage with core count
  - Memory Usage (purple gradient) - Percentage with GB used/total
  - IOWait (orange gradient) - I/O latency monitoring
  - Guest Count - Number of running VMs/CTs
- **Node Information** - Status, Load Average, Uptime
- **Maintenance Mode Toggle** - Enable/disable maintenance directly from modal
- **Evacuation Planning** - Plan and execute node evacuation

**Node Maintenance Workflow:**
1. **Click a node** in the Cluster Map to open details modal
2. **Toggle Maintenance Mode** to mark node for updates
3. **Plan Evacuation** - Review migration plan with storage validation
4. **Execute Evacuation** - Migrate all VMs/CTs to healthy nodes
5. **Perform Maintenance** - Node excluded from load balancing and recommendations
6. **Disable Maintenance Mode** when complete

**Features:**
- Pre-migration storage validation prevents compatibility errors
- Automatic target node selection based on available resources
- Real-time evacuation progress tracking with loading animations
- Visual indicators: yellow borders and badges on Cluster Map and recommendations
- Integrates with automated migrations for scheduled evacuations
- Priority evacuation: bypasses tags and HA status to ensure complete evacuation

### VM/CT Details & Migration

View detailed metrics and migrate guests directly from the Cluster Map:

1. **Click any VM/CT** on the Cluster Map
2. **View Detailed Metrics** with live sparkline visualizations:
   - CPU usage with historical trend graph
   - Memory usage with historical trend graph
   - Disk I/O (read/write) with activity graphs
   - Network I/O (in/out) with traffic graphs
   - Current node location and status
   - Applied tags and configuration
3. **Click Migrate** to move the guest to another node
4. **Select Target Node** from available online nodes
5. **Execute Migration** - Live migration for VMs, restart migration for CTs

**Sparkline Features:**
- 40-point historical trend visualization
- Color-coded by metric type (blue=CPU, purple=Memory, green=Disk Read, orange=Disk Write, cyan=Network In, pink=Network Out)
- Semi-transparent background graphs with metric values in foreground
- Smooth sine-wave patterns with realistic variation
- Auto-scaling based on current values

### Automated Migrations

Configure and enable automated load balancing:

1. **Navigate to Automated Migrations** - Click "Configure" button on the dashboard widget
2. **Enable Automation** - Toggle the main switch (keep dry-run enabled for testing)
3. **Configure Safety Rules**:
   - Set minimum confidence score (default: 75)
   - Set max migrations per run (default: 3)
   - Set CPU/memory thresholds
   - Enable/disable tag respecting
4. **Test the System** - Click "Test Now" to run in dry-run mode
5. **Review Results** - Check test output and migration history
6. **Go Live** - Disable dry-run mode when ready (requires confirmation)

**Important Notes:**
- Dry-run mode is enabled by default for safety
- Automation is disabled by default and must be explicitly enabled
- System runs on a configurable interval (default: 5 minutes via systemd timer)
- Nodes in maintenance mode are automatically evacuated
- All migrations are logged in migration history

**Advanced Configuration:**
Edit `/opt/proxmox-balance-manager/config.json` for:
- Migration windows (time-based scheduling)
- Blackout periods (prevent migrations during specific times)
- Cooldown periods between migrations
- Whitelist mode (require auto-migrate-ok tag)

### Tagging Guests

**Ignore automatic migration:**
```bash
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore"
```

**Anti-affinity (keep separated):**
```bash
pvesh set /nodes/<node1>/qemu/<vmid1>/config --tags "exclude_database"
pvesh set /nodes/<node2>/qemu/<vmid2>/config --tags "exclude_database"
```

**Allow auto-migration (whitelist mode):**
```bash
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "auto-migrate-ok"
```

### Health Check

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <container-id>
```

---

## 🛠️ System Requirements

- **Proxmox VE**: 7.0 or higher
- **Resources**: 2GB RAM, 2 CPU cores, 8GB disk (minimum)
- **Network**: Connectivity to all cluster nodes
- **Access**: Root access to Proxmox host

---

## 🔒 Security

- API token authentication (no passwords stored)
- Unprivileged LXC container
- Local network design
- Optional SSL/TLS support

---

## 💬 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Pr0zak/ProxBalance/issues)
- 💡 **Feature Requests**: [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions)
- 📖 **Documentation**: [docs/README.md](docs/README.md)

---

## ⭐ Show Your Support

If ProxBalance helps manage your cluster:
- ⭐ Star this repository
- 📢 Share with the homelab community
- 🐛 Report bugs and suggest features

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

<div align="center">

**Made with ❤️ for the Proxmox community**

[Documentation](docs/README.md) • [Installation](docs/INSTALL.md) • [GitHub](https://github.com/Pr0zak/ProxBalance)

</div>
