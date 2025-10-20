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

- **Real-Time Monitoring** - CPU, memory, IOWait, and load metrics across all nodes
- **Cluster Map** - Visual representation with 4 view modes (Usage, Allocated, Disk I/O, Network)
- **Smart Recommendations** - Intelligent migration suggestions based on historical data
- **AI-Powered Analysis** - Optional AI recommendations using OpenAI, Anthropic, or Ollama
- **Anti-Affinity Rules** - Tag-based system to enforce workload separation
- **One-Click Migrations** - Execute migrations directly from the web interface
- **Historical Trending** - 24-hour performance graphs with configurable periods
- **Dark Mode** - Modern interface with light/dark theme support

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
