# Installation Guide

---

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Install](#quick-install)
- [Manual Installation](#manual-installation)
- [Post-Installation](#post-installation)
- [Security Hardening](#security-hardening)
- [Verification](#verification)
- [Common Issues](#common-issues)

---

## Prerequisites

### Required

- Proxmox VE 7.0+ (tested on 7.x and 8.x)
- Root access to the Proxmox host
- Network connectivity between the container and all cluster nodes
- API access to Proxmox (the installer creates tokens automatically)

### Resources

| | Minimum | Recommended |
|--|---------|-------------|
| RAM | 2 GB | 4 GB |
| CPU | 2 cores | 2 cores |
| Disk | 8 GB | 16 GB |

### Network

- DHCP or the ability to assign a static IP
- Port 80 for the web interface
- Port 8006 access from the container to all Proxmox nodes

---

## Quick Install

Run on your Proxmox host:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"
```

The installer prompts for container ID, hostname, network configuration, storage, and resource allocation, then handles everything automatically:

1. Downloads the Debian 12 template (if needed)
2. Creates an unprivileged LXC container
3. Installs Python 3, Node.js 20, Nginx, and dependencies
4. Clones the repository and sets up the Python virtual environment
5. Auto-detects cluster nodes
6. Creates a Proxmox API token with proper permissions
7. Builds the frontend (Babel compilation)
8. Configures and starts all systemd services
9. Runs the first data collection

---

## Manual Installation

### 1. Create the container

```bash
CTID=333
STORAGE="local-lvm"

pveam update
pveam download local debian-12-standard_12.2-1_amd64.tar.zst

pct create $CTID local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname ProxBalance \
  --memory 2048 \
  --cores 2 \
  --rootfs ${STORAGE}:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1

pct start $CTID
sleep 10
```

### 2. Install dependencies

```bash
pct enter $CTID

apt-get update && apt-get upgrade -y
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y python3 python3-venv python3-pip nodejs nginx curl jq git

exit
```

### 3. Install ProxBalance

```bash
pct exec $CTID -- bash -c "
cd /opt
git clone https://github.com/Pr0zak/ProxBalance.git proxmox-balance-manager
cd proxmox-balance-manager
python3 -m venv venv
venv/bin/pip install --upgrade pip
venv/bin/pip install flask flask-cors gunicorn proxmoxer requests pytz flask-compress
chmod +x *.py *.sh 2>/dev/null || true
"
```

### 4. Configure

```bash
pct exec $CTID -- bash -c 'cat > /opt/proxmox-balance-manager/config.json <<EOF
{
  "collection_interval_minutes": 60,
  "ui_refresh_interval_minutes": 15,
  "proxmox_host": "YOUR_PROXMOX_HOST_IP",
  "proxmox_port": 8006,
  "proxmox_auth_method": "api_token",
  "proxmox_api_token_id": "proxbalance@pam!proxbalance",
  "proxmox_api_token_secret": "YOUR_TOKEN_SECRET",
  "proxmox_verify_ssl": false
}
EOF'
```

### 5. Create API token

On the Proxmox host:

```bash
pvesh create /access/users/proxbalance@pam/token/proxbalance \
  --comment "ProxBalance monitoring" --privsep 0

# Set permissions (both user and token need ACLs)
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin --propagate 1
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin --propagate 1
```

Copy the token secret into `config.json`.

### 6. Set up services

```bash
pct exec $CTID -- bash -c "
cp /opt/proxmox-balance-manager/systemd/*.service /etc/systemd/system/
cp /opt/proxmox-balance-manager/systemd/*.timer /etc/systemd/system/
cp /opt/proxmox-balance-manager/nginx/proxmox-balance /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/proxmox-balance /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
systemctl daemon-reload
systemctl enable proxmox-balance proxmox-collector.timer nginx
systemctl start proxmox-balance proxmox-collector.timer nginx
"
```

### 7. Verify

```bash
CONTAINER_IP=\$(pct exec $CTID -- hostname -I | awk '{print \$1}')
curl -X POST http://\$CONTAINER_IP/api/refresh
sleep 90
curl http://\$CONTAINER_IP/api/health
```

Open `http://<container-ip>` in your browser.

---

## Post-Installation

### Collection optimization

Configure through the web UI Settings panel under **Collection Optimization**, or use presets:

| Preset | Guests | Interval | Workers |
|--------|--------|----------|---------|
| Small | < 30 | 5 min | 3 |
| Medium | 30-100 | 15 min | 5 |
| Large | 100+ | 30 min | 8 |

### Guest tags

ProxBalance reads tags from VMs and containers via the Proxmox API:

- **`ignore`** - Exclude the guest from migration recommendations
- **`exclude_<group>`** - Anti-affinity: guests sharing the same `exclude_` tag are kept on separate nodes
- **`auto-migrate-ok`** - Whitelist mode opt-in (when enabled in config)

```bash
# Set tags via Proxmox CLI
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore"
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "exclude_database"
```

After changing tags, trigger a refresh: `curl -X POST http://<container-ip>/api/refresh`

### AI recommendations (optional)

1. Open Settings in the web UI
2. Enable AI Recommendations
3. Select a provider (OpenAI, Anthropic, or Ollama)
4. Enter credentials and save

See [AI Features](AI_FEATURES.md) for detailed setup.

### Notification providers (optional)

Configure notification providers in Settings under **Automated Migrations > Notifications**. See [Notifications](NOTIFICATIONS.md) for provider details.

---

## Security Hardening

### Firewall

```bash
pct exec $CTID -- apt-get install -y ufw
pct exec $CTID -- ufw allow from 10.0.0.0/24 to any port 80
pct exec $CTID -- ufw --force enable
```

### SSL/TLS

```bash
pct exec $CTID -- apt-get install -y certbot python3-certbot-nginx
pct exec $CTID -- certbot --nginx -d your-domain.com --non-interactive --agree-tos -m you@example.com
```

---

## Verification

After installation, confirm these are working:

```bash
# Container running
pct status $CTID

# Services active
pct exec $CTID -- systemctl is-active proxmox-balance proxmox-collector.timer nginx

# API responding
curl http://<container-ip>/api/health

# Cache file exists with recent data
pct exec $CTID -- jq '.collected_at' /opt/proxmox-balance-manager/cluster_cache.json
```

Or run the status checker:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ $CTID
```

---

## Common Issues

### Container won't start

```bash
pct config $CTID    # Check configuration
pct start $CTID     # Read error message
free -h && df -h    # Check host resources
```

### API authentication fails

```bash
# Check token exists
pvesh get /access/users/proxbalance@pam/token/proxbalance

# Recreate if needed
pvesh delete /access/users/proxbalance@pam/token/proxbalance
pvesh create /access/users/proxbalance@pam/token/proxbalance --comment "ProxBalance" --privsep 0

# Set permissions on both user and token
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin
```

### 502 Bad Gateway

```bash
pct exec $CTID -- systemctl status proxmox-balance
pct exec $CTID -- journalctl -u proxmox-balance -n 50
pct exec $CTID -- systemctl restart proxmox-balance
```

### No data after installation

```bash
pct exec $CTID -- systemctl start proxmox-collector.service
pct exec $CTID -- journalctl -u proxmox-collector -f
```

For more issues, see [Troubleshooting](TROUBLESHOOTING.md).

---

[Back to Documentation](README.md)
