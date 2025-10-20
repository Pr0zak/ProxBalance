# ProxBalance Installation Guide

Complete step-by-step installation instructions for ProxBalance.

---

## 📋 Table of Contents

- [Prerequisites](#-prerequisites)
- [Quick Install (Recommended)](#-quick-install-recommended)
- [What the Installer Does](#-what-the-installer-does)
- [Manual Installation](#-manual-installation)
- [Post-Installation](#-post-installation)
- [Verification](#-verification)
- [Troubleshooting](#-troubleshooting)

---

## 📋 Prerequisites

Before installing ProxBalance, ensure you have:

### Required
- **Proxmox VE 7.0+** (tested on 7.x and 8.x)
- **Root access** to Proxmox host
- **Network connectivity** between container and all nodes
- **API access** to Proxmox (installer automatically creates API tokens)

### Resource Requirements

**Minimum:**
- 2GB RAM
- 2 CPU cores
- 8GB disk space
- 1 available container ID

**Recommended:**
- 4GB RAM
- 2 CPU cores
- 16GB disk space

### Network Requirements
- Container needs network access to all Proxmox nodes
- DHCP server (recommended) or ability to configure static IP
- Port 80 available for web interface
- Port 8006 (Proxmox API) access from container to all nodes

---

## 🚀 Quick Install (Recommended)

### One-Command Installation

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"
```

**That's it!** The enhanced installer v2.0 handles everything automatically with:
- 🎨 Beautiful visual interface with colors and animations
- ⚡ Real-time progress tracking with spinning status indicators
- 📊 Detailed installation steps showing exactly what's happening
- ✅ Smart validation and comprehensive error checking

### Installation Time
- **Small clusters** (1-4 nodes): ~3-5 minutes
- **Large clusters** (5+ nodes): ~5-10 minutes
- **First data collection**: Additional 2-5 minutes

### What You'll Be Asked

The installer is interactive and will prompt you for:

1. **Container ID** 
   - Option 1: Automatic (next available ID) - **Recommended**
   - Option 2: Manual (specify custom ID)

2. **Hostname**
   - Default: `ProxBalance`
   - Can customize if desired

3. **Network Configuration**
   - Option 1: DHCP (Automatic) - **Recommended**
   - Option 2: Static IP (manual configuration)

4. **Storage Location**
   - Select from available Proxmox storage
   - Shows storage type for each option

5. **Template Selection**
   - Auto-detects if Debian 12 template exists
   - Downloads automatically if missing
   - Default: debian-12-standard_12.2-1_amd64

6. **Resources**
   - Memory: Default 2048MB (recommended)
   - CPU Cores: Default 2 (recommended)
   - Disk: Default 8GB (recommended)

7. **Confirmation**
   - Review all settings before proceeding

---

## 🔧 What the Installer Does

The automated installer performs these steps:

### Phase 1: Pre-Installation (30 seconds)
1. ✅ Validates you're running on Proxmox VE (checks for `pct` command)
2. ✅ Checks for root privileges (EUID must be 0)
3. ✅ Detects next available container ID (starting from 100, auto-increments)
4. ✅ Gathers your configuration preferences (interactive prompts)

### Phase 2: Container Creation (1-2 minutes)
1. ✅ Downloads Debian 12 template (if not present)
2. ✅ Creates unprivileged LXC container
3. ✅ Configures with your specified resources
4. ✅ Sets up networking (DHCP or static)
5. ✅ Starts the container
6. ✅ Detects container IP address

### Phase 3: Dependency Installation (1-2 minutes)
1. ✅ Updates package repositories with progress spinner
2. ✅ Installs Python 3, venv, and pip with real-time progress
3. ✅ Installs Nginx web server with progress indicator
4. ✅ Installs utilities (curl, jq, git) with detailed feedback
5. ✅ System packages installed:
   - Python 3 (3.8+ from Debian 12)
   - python3-venv (virtual environment)
   - python3-pip (package manager)
   - Nginx web server (reverse proxy)
   - curl (API testing)
   - jq (JSON parsing)
   - git (repository cloning)
6. ✅ Cleans up package cache (reduces container size)

### Phase 4: ProxBalance Installation (1 minute)
1. ✅ Clones ProxBalance repository from GitHub to /opt/proxmox-balance-manager
2. ✅ Creates Python virtual environment (venv/)
3. ✅ Installs Python dependencies via pip:
   - Flask 3.x (web framework for REST API)
   - Flask-CORS (cross-origin resource sharing for API)
   - Gunicorn (production WSGI HTTP server)
4. ✅ Sets file permissions (chmod +x for *.py and *.sh scripts)

### Phase 5: Configuration (1 minute)
1. ✅ Auto-detects cluster nodes using 4 methods (in order):
   - Method 1: Parses `/etc/pve/corosync.conf` for node names
   - Method 2: Scans `/etc/pve/nodes/` directory listing
   - Method 3: Tries `pvecm status` command output
   - Method 4: Queries `pvesh get /nodes` API endpoint
2. ✅ Creates config.json with detected settings:
   - `collection_interval_minutes`: 60 (default)
   - `ui_refresh_interval_minutes`: 15 (default)
   - `proxmox_host`: Auto-detected primary node IP/hostname
3. ✅ Sets up systemd services (copies to /etc/systemd/system/):
   - proxmox-balance.service (Flask API with Gunicorn)
   - proxmox-collector.service (data collection script)
   - proxmox-collector.timer (OnBootSec=1min, OnUnitActiveSec=60min)
4. ✅ Configures Nginx as reverse proxy:
   - Copies proxmox-balance to /etc/nginx/sites-available/
   - Creates symlink in sites-enabled/
   - Removes default site
   - Proxies port 80 → 127.0.0.1:5000
5. ✅ Enables services to start on boot (systemctl enable)

### Phase 6: API Authentication Setup (1-2 minutes)
1. ✅ Creates Proxmox API token (proxbalance@pam!proxbalance)
   - Uses pvesh to create token with full privileges
   - Sets privilege separation to 0 for Administrator access
   - Generates unique secret automatically
2. ✅ **Saves API token to configuration**
   - Stores token ID and secret in config.json
   - Securely transfers to container
   - Removes temporary token file after transfer
3. ✅ Tests API connectivity from container
   - Verifies token authentication works
   - Tests basic API call (/api2/json/version)
   - Confirms cluster access
4. ✅ Reports API token creation success with token ID

### Phase 7: Service Startup (30 seconds)
1. ✅ Starts Flask API service
2. ✅ Starts data collector timer
3. ✅ Starts Nginx web server
4. ✅ Verifies all services are running

### Phase 8: Initial Data Collection (2-5 minutes)
1. ✅ Triggers first cluster data collection with progress monitoring
2. ✅ Shows detailed progress with animation and status updates
3. ✅ Waits for collection to complete (up to 60 seconds per attempt)
4. ✅ Retries up to 3 times if collection fails or times out
5. ✅ Monitors both service status and cache file creation
6. ✅ Data collection process:
   - Connects to Proxmox API using token authentication
   - Collects cluster resources via API
   - Gathers RRD data (1-hour to 7-day timeframe configurable) for each node
   - Fetches guest configurations and tags
   - Writes to cluster_cache.json with atomic rename
   - Takes 30-90 seconds depending on cluster size
7. ✅ Displays success confirmation or detailed error messages

### Phase 9: Completion
1. ✅ Displays access information
2. ✅ Shows useful management commands
3. ✅ Provides quick action examples

---

## 📦 Manual Installation Steps

For advanced users who want full control over the installation process.

### Step 1: Download Debian Template

```bash
# Update template list
pveam update

# List available Debian 12 templates
pveam available | grep debian-12

# Download Debian 12 template
pveam download local debian-12-standard_12.2-1_amd64.tar.zst

# Verify download
pveam list local | grep debian-12
```

### Step 2: Create Container

```bash
# Set variables (customize as needed)
CTID=333
IP_ADDRESS="10.0.0.131/24"  # or "dhcp"
GATEWAY="10.0.0.1"
HOSTNAME="ProxBalance"
STORAGE="local-lvm"

# Create container with DHCP
pct create $CTID local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname $HOSTNAME \
  --memory 2048 \
  --cores 2 \
  --rootfs ${STORAGE}:8 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1

# OR create container with static IP
pct create $CTID local:vztmpl/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname $HOSTNAME \
  --memory 2048 \
  --cores 2 \
  --rootfs ${STORAGE}:8 \
  --net0 name=eth0,bridge=vmbr0,ip=$IP_ADDRESS,gw=$GATEWAY \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1

# Start container
pct start $CTID

# Wait for boot
sleep 10
```

### Step 3: Install Dependencies

```bash
# Enter container
pct enter $CTID

# Update system
apt-get update
apt-get upgrade -y

# Install required packages
apt-get install -y \
  python3 \
  python3-venv \
  python3-pip \
  nginx \
  curl \
  jq \
  git

# Exit container
exit
```

### Step 4: Install ProxBalance

```bash
# Install from GitHub
pct exec $CTID -- bash -c "
cd /opt
git clone https://github.com/Pr0zak/ProxBalance.git proxmox-balance-manager
cd proxmox-balance-manager

# Create Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
pip install --upgrade pip
pip install flask flask-cors gunicorn

# Deactivate venv
deactivate

# Set permissions for Python scripts and shell scripts
chmod +x /opt/proxmox-balance-manager/*.py 2>/dev/null || true
chmod +x /opt/proxmox-balance-manager/*.sh 2>/dev/null || true
"
```

**What this installs:**
- Flask API server (app.py) - 8 REST endpoints
- Data collector (collector.py) - RRD analysis and caching
- Settings manager (manage_settings.sh) - CLI configuration tool
- Timer updater (update_timer.py) - Dynamic systemd timer management
- Status checker (check-status.sh) - Comprehensive diagnostics
- Service debugger (debug-services.sh) - Troubleshooting tool

### Step 5: Configure Application

```bash
# Create configuration file
pct exec $CTID -- bash -c 'cat > /opt/proxmox-balance-manager/config.json <<EOF
{
  "collection_interval_minutes": 60,
  "ui_refresh_interval_minutes": 15,
  "proxmox_host": "YOUR_PROXMOX_HOST_IP"
}
EOF'

# Replace YOUR_PROXMOX_HOST_IP with your actual Proxmox host IP
# Example: "10.0.0.1" or hostname like "pve1"
```

**Configuration Options:**
- `collection_interval_minutes` (5-240): How often to collect cluster data
- `ui_refresh_interval_minutes` (5-120): How often UI auto-refreshes
- `proxmox_host`: Primary Proxmox node IP or hostname for API connections
- `proxmox_api_token_id`: API token ID (format: user@realm!tokenname)
- `proxmox_api_token_secret`: API token secret

**Note:** The automated installer auto-detects `proxmox_host` and creates API tokens automatically. Manual installation requires you to create a token and configure these values.

### Step 6: Setup System Services

```bash
# Copy systemd service files
pct exec $CTID -- bash -c "
cp /opt/proxmox-balance-manager/systemd/proxmox-balance.service /etc/systemd/system/
cp /opt/proxmox-balance-manager/systemd/proxmox-collector.service /etc/systemd/system/
cp /opt/proxmox-balance-manager/systemd/proxmox-collector.timer /etc/systemd/system/

# Reload systemd
systemctl daemon-reload

# Enable services to start on boot
systemctl enable proxmox-balance.service
systemctl enable proxmox-collector.timer
systemctl enable nginx.service
"
```

**Service Descriptions:**

1. **proxmox-balance.service**
   - Runs Flask API via Gunicorn on port 5000
   - 4 worker processes (adjust based on load)
   - Serves 8 REST API endpoints
   - Reads from cluster_cache.json

2. **proxmox-collector.service**
   - Runs collector_api.py script
   - Collects data via Proxmox API
   - Uses pvesh commands for cluster data
   - Writes to cluster_cache.json atomically

3. **proxmox-collector.timer**
   - Triggers collector.service periodically
   - OnBootSec=1min (runs 1 min after boot)
   - OnUnitActiveSec=60min (runs every 60 min by default)
   - Dynamically updated by update_timer.py when interval changes

### Step 7: Configure Nginx

```bash
# Setup web server
pct exec $CTID -- bash -c "
# Copy web interface (React single-page app)
cp /opt/proxmox-balance-manager/index.html /var/www/html/

# Copy Nginx configuration
cp /opt/proxmox-balance-manager/nginx/proxmox-balance /etc/nginx/sites-available/

# Enable site (create symlink)
ln -sf /etc/nginx/sites-available/proxmox-balance /etc/nginx/sites-enabled/

# Remove default Nginx site
rm -f /etc/nginx/sites-enabled/default

# Test configuration syntax
nginx -t

# Restart Nginx to apply changes
systemctl restart nginx
"
```

**Nginx Configuration Details:**
- Listens on port 80 (HTTP)
- Serves static files from /var/www/html/ (index.html)
- Proxies /api/* requests to http://127.0.0.1:5000 (Flask backend)
- Sets proper headers for API requests
- Client max body size: 10M (for configuration updates)
- Access log: /var/log/nginx/access.log
- Error log: /var/log/nginx/error.log

### Step 8: Setup API Authentication

```bash
# Create Proxmox API token (run on Proxmox host)
TOKEN_USER="proxbalance@pam"
TOKEN_NAME="proxbalance"

# Create the API token
pvesh create /access/users/${TOKEN_USER}/token/${TOKEN_NAME} \
  --comment "ProxBalance automated monitoring" \
  --privsep 0

# The output will show:
# {
#    "full-tokenid" : "proxbalance@pam!proxbalance",
#    "value" : "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# }

# Save the token secret - you'll need it for config.json
TOKEN_SECRET="<paste-secret-from-output>"

# IMPORTANT: Set ACL permissions on BOTH user and token (even with privsep=0)
# Choose based on your needs:

# Option 1: Minimal permissions (read-only monitoring)
pveum acl modify / --users proxbalance@pam --roles PVEAuditor --propagate 1
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEAuditor --propagate 1

# Option 2: Full permissions (monitoring + migrations)
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin --propagate 1
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin --propagate 1

# Verify permissions were set
pveum acl list | grep proxbalance

# Update config.json in container
pct exec $CTID -- bash -c "cat > /opt/proxmox-balance-manager/config.json <<EOF
{
  \"collection_interval_minutes\": 60,
  \"ui_refresh_interval_minutes\": 15,
  \"proxmox_host\": \"<your-proxmox-host>\",
  \"proxmox_port\": 8006,
  \"proxmox_auth_method\": \"api_token\",
  \"proxmox_api_token_id\": \"proxbalance@pam!proxbalance\",
  \"proxmox_api_token_secret\": \"${TOKEN_SECRET}\",
  \"proxmox_verify_ssl\": false
}
EOF"

# Test API connectivity from container
pct exec $CTID -- python3 -c "
from proxmoxer import ProxmoxAPI
proxmox = ProxmoxAPI(
    '<your-proxmox-host>',
    user='proxbalance@pam',
    token_name='proxbalance',
    token_value='${TOKEN_SECRET}',
    port=8006,
    verify_ssl=False
)
print('API Token Test:', proxmox.version.get())
"
```

**API Token Details:**
- Token ID: proxbalance@pam!proxbalance (user@realm!tokenname format)
- Privileges: Administrator access (privsep=0)
- No expiration: Token remains valid until manually deleted
- Secure: Token secret is separate from user password
- Revocable: Can be deleted without affecting user account

**Permission Requirements:**
- **Both user AND token need ACL permissions** - Even with privsep=0, Proxmox requires ACLs on both the user account and the token
- **PVEAuditor** - Minimal role for read-only monitoring (VM.Audit, Sys.Audit, Datastore.Audit)
- **PVEVMAdmin** - Full role for monitoring + migrations (includes VM.Migrate, VM.Allocate, VM.Console)

**Why API Tokens?**
- More secure than password authentication
- Faster than SSH (5-10x performance improvement)
- Fine-grained permission control
- Easy to rotate and revoke
- No SSH key management needed

### Step 9: Start Services

```bash
# Start all services
pct exec $CTID -- systemctl start proxmox-balance.service
pct exec $CTID -- systemctl start proxmox-collector.timer
pct exec $CTID -- systemctl start nginx.service

# Check status
pct exec $CTID -- systemctl status proxmox-balance.service
pct exec $CTID -- systemctl status proxmox-collector.timer
pct exec $CTID -- systemctl status nginx.service
```

### Step 10: Initial Data Collection

```bash
# Get container IP
CONTAINER_IP=$(pct exec $CTID -- hostname -I | awk '{print $1}')
echo "Container IP: $CONTAINER_IP"

# Trigger first collection
curl -X POST http://$CONTAINER_IP/api/refresh

# Wait for collection to complete (60-90 seconds)
echo "Waiting for data collection..."
sleep 90

# Verify data was collected
curl http://$CONTAINER_IP/api/analyze | jq '.success'

# Should return: true
```

### Step 11: Access Web Interface

Open your browser and navigate to:
```
http://<container-ip>
```

You should see the ProxBalance dashboard!

---

## 🔧 Post-Installation Configuration

### 1. Verify Installation

Run the status checker:

```bash
# Download and run status checker
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ $CTID
```

This comprehensive check verifies:
- ✅ Container status and networking
- ✅ All service status
- ✅ Data collection status
- ✅ API health
- ✅ API token connectivity test

### 2. Configure Collection Intervals

#### Via Web Interface (Recommended)
1. Click the ⚙️ **Settings** icon in the top right
2. Adjust **Backend Collection Interval** (5-240 minutes)
   - Small clusters (1-20 guests): 30-60 min
   - Medium clusters (21-50 guests): 60-120 min
   - Large clusters (50+ guests): 120-240 min
3. Adjust **UI Refresh Interval** (5-120 minutes)
   - Should be ≤ backend interval
   - Typical: 15-60 minutes
4. Click **Save Settings**
5. Services restart automatically

**What happens when you save:**
1. API validates the new values (range checks)
2. Updates config.json
3. Runs update_timer.py to modify systemd timer
4. Executes systemctl daemon-reload
5. Restarts proxmox-collector.timer with new interval
6. No manual service restart needed!

#### Via Command Line

```bash
# Show current settings
pct exec $CTID -- /opt/proxmox-balance-manager/manage_settings.sh show

# Set backend collection to 60 minutes
pct exec $CTID -- /opt/proxmox-balance-manager/manage_settings.sh set-backend 60

# Set UI refresh to 15 minutes
pct exec $CTID -- /opt/proxmox-balance-manager/manage_settings.sh set-ui 15

# Set both at once
pct exec $CTID -- /opt/proxmox-balance-manager/manage_settings.sh set-both 45
```

### 3. Configure Guest Tags

ProxBalance respects two types of tags on VMs and containers:

#### Ignore Tag - Prevent Migration
```bash
# For VMs
pvesh set /nodes/<node-name>/qemu/<vmid>/config --tags "ignore"

# For Containers
pvesh set /nodes/<node-name>/lxc/<vmid>/config --tags "ignore"
```

**How it works:**
- Collector.py reads tags via pvesh get config
- parse_tags() function extracts "ignore" keyword
- Sets `has_ignore: true` in cache
- Recommendation engine skips guests with has_ignore=true
- Guests with ignore tag won't appear in migration recommendations

#### Anti-Affinity Tags - Keep Workloads Separated
```bash
# Example: Firewall VMs that must be on different nodes
pvesh set /nodes/pve1/qemu/100/config --tags "exclude_firewall"
pvesh set /nodes/pve2/qemu/101/config --tags "exclude_firewall"

# Example: Database servers
pvesh set /nodes/pve1/qemu/200/config --tags "exclude_database"
pvesh set /nodes/pve3/qemu/201/config --tags "exclude_database"

# Combine multiple tags (semicolon or space separated)
pvesh set /nodes/pve1/qemu/300/config --tags "ignore;exclude_critical"
```

**How anti-affinity works:**
- Tags starting with `exclude_` are extracted into `exclude_groups` array
- Before recommending migration, checks if target node has any guest with same exclusion tag
- If conflict detected, skips that migration recommendation
- Prevents guests with same `exclude_*` tag from being on same node

After adding tags, trigger a data refresh:
```bash
curl -X POST http://<container-ip>/api/refresh
```

**Tag Format Rules:**
- Case-sensitive (use lowercase for consistency)
- No spaces in tag names
- Multiple tags separated by semicolon (`;`) or space
- `exclude_` prefix required for anti-affinity groups
- Exact match required (exclude_db ≠ exclude_database)

### 4. Configure AI Recommendations (Optional)

ProxBalance v2.0 supports optional AI-powered migration recommendations.

#### Enable AI Features

1. Click ⚙️ **Settings** icon (top-right corner)
2. Scroll to **AI-Enhanced Migration Recommendations**
3. Toggle **Enable AI Recommendations**
4. Select your **AI Provider**:
   - **OpenAI** (GPT-4) - Requires API key from https://platform.openai.com/api-keys
   - **Anthropic** (Claude) - Requires API key from https://console.anthropic.com/settings/keys
   - **Ollama** (Local LLM) - Self-hosted, no API key needed
5. Enter required credentials based on provider
6. Select **Analysis Time Period**:
   - 1 hour - Fast, recent trends only
   - 6 hours - Balanced view
   - 24 hours - Full day pattern (recommended)
   - 7 days - Long-term trends
7. Click **Save Settings**

#### Setting Up Ollama (Local LLM)

For cost-free AI recommendations using a self-hosted LLM:

```bash
# On a server with GPU (recommended) or powerful CPU:

# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a model (choose based on your hardware)
ollama pull llama3.1:8b     # Smaller, faster (requires ~8GB RAM)
ollama pull llama3.1:70b    # Larger, more accurate (requires 48GB+ RAM)
ollama pull mistral:7b      # Alternative lightweight model

# Verify Ollama is running
curl http://localhost:11434/api/version

# In ProxBalance settings:
# - AI Provider: Ollama
# - Base URL: http://<ollama-server-ip>:11434
# - Model: llama3.1:8b (or your chosen model)
```

**Benefits of AI Recommendations:**
- Analyzes historical usage patterns over your selected timeframe
- Considers workload characteristics and node capabilities
- Provides detailed reasoning for each recommendation
- Helps identify optimal migration timing
- Prevents migrations during peak usage periods

### 5. Adjust Thresholds

In the web interface:
- Use **CPU Threshold** slider (40-90%)
  - Default: 60%
  - Lower = more aggressive rebalancing
  - Higher = less frequent migrations
- Use **Memory Threshold** slider (50-95%)
  - Default: 70%
  - Adjust based on your workload patterns
- CPU/Memory threshold lines appear on node charts as you adjust
- Recommendations update automatically as you adjust

### 6. Test a Migration

Before using in production, test with a non-critical guest:

1. Navigate to **Migration Recommendations** section
2. If recommendations appear, click **Execute** on one
3. Monitor progress in Proxmox web interface
4. Verify guest continues running after migration
5. Check ProxBalance logs: `pct exec $CTID -- journalctl -u proxmox-balance -f`

---

## 🔒 Security Hardening (Optional)

### 1. Implement Firewall Rules

Restrict access to the web interface:

```bash
# Install UFW
pct exec $CTID -- apt-get install -y ufw

# Allow web interface only from your network
pct exec $CTID -- ufw allow from 10.0.0.0/24 to any port 80

# Enable firewall
pct exec $CTID -- ufw --force enable

# Check status
pct exec $CTID -- ufw status
```

### 2. Setup SSL/TLS with Let's Encrypt

If exposing externally with a domain name:

```bash
# Install Certbot
pct exec $CTID -- apt-get install -y certbot python3-certbot-nginx

# Obtain certificate (requires public domain)
pct exec $CTID -- certbot --nginx -d your-domain.com --non-interactive --agree-tos -m your-email@example.com

# Nginx will be automatically configured for HTTPS
# Certificate auto-renews via systemd timer

# Verify auto-renewal
pct exec $CTID -- systemctl list-timers | grep certbot
```

### 3. Enable Automatic Updates (Optional)

```bash
# Install unattended-upgrades
pct exec $CTID -- apt-get install -y unattended-upgrades

# Configure for security updates only
pct exec $CTID -- dpkg-reconfigure -plow unattended-upgrades
```

---

## ✅ Verification Checklist

After installation, verify everything is working:

### Container & Services
- [ ] Container is running: `pct status $CTID`
- [ ] Container has IP address (DHCP or static)
- [ ] Web interface loads: `http://<container-ip>`
- [ ] API responds: `curl http://<container-ip>/api/health`
- [ ] API service is active: `pct exec $CTID -- systemctl is-active proxmox-balance`
- [ ] Collector timer is active: `pct exec $CTID -- systemctl is-active proxmox-collector.timer`
- [ ] Nginx is active: `pct exec $CTID -- systemctl is-active nginx`

### Data Collection
- [ ] Cache file exists: `pct exec $CTID -- ls /opt/proxmox-balance-manager/cluster_cache.json`
- [ ] Cache has recent data: `pct exec $CTID -- jq '.collected_at' /opt/proxmox-balance-manager/cluster_cache.json`
- [ ] All nodes appear in dashboard
- [ ] Guest counts are correct
- [ ] CPU/Memory metrics are showing

### API Connectivity
- [ ] API token is configured in config.json
- [ ] Test: `pct exec $CTID -- python3 -c "from proxmoxer import ProxmoxAPI; print('OK')"`
- [ ] Container can reach Proxmox API (port 8006)
- [ ] API calls work from collector

### Functionality
- [ ] Tags are recognized (if configured)
- [ ] Recommendations are generated (if cluster is imbalanced)
- [ ] Can adjust CPU/Memory thresholds
- [ ] Settings can be changed and persist
- [ ] Test migration works (optional, use non-critical guest)

### Boot Persistence
- [ ] Container set to start on boot: `pct config $CTID | grep onboot`
- [ ] Services enabled: `pct exec $CTID -- systemctl is-enabled proxmox-balance proxmox-collector.timer nginx`
- [ ] Reboot test: `pct reboot $CTID && sleep 30 && curl http://<container-ip>/api/health`

---

## 🐛 Common Installation Issues

### Issue: Container won't start

**Symptoms:** `pct start $CTID` fails or container shows as stopped

**Solutions:**
```bash
# Check container configuration
pct config $CTID

# Check for errors
pct start $CTID
# Read error message

# Common fixes:
# - Wrong storage specified
# - Insufficient resources on host
# - Network configuration error

# Check host resources
free -h
df -h

# Try starting in debug mode
pct start $CTID --debug
```

### Issue: API authentication fails

**Symptoms:** Data collection fails, API errors in logs

**Solutions:**
```bash
# Verify API token configuration
pct exec $CTID -- cat /opt/proxmox-balance-manager/config.json | jq '.proxmox_api_token_id, .proxmox_api_token_secret'

# Check if token exists in Proxmox
pvesh get /access/users/proxbalance@pam/token/proxbalance

# Recreate token if needed
pvesh delete /access/users/proxbalance@pam/token/proxbalance
pvesh create /access/users/proxbalance@pam/token/proxbalance --comment "ProxBalance" --privsep 0

# Update config.json with new token secret
# (Edit the config file with the new token values)

# Test API connectivity
pct exec $CTID -- python3 -c "
from proxmoxer import ProxmoxAPI
proxmox = ProxmoxAPI(
    '<proxmox-host>',
    user='proxbalance@pam',
    token_name='proxbalance',
    token_value='<token-secret>',
    port=8006,
    verify_ssl=False
)
print('API Version:', proxmox.version.get())
"
```

### Issue: Python dependencies fail to install

**Symptoms:** `pip install` commands fail

**Solutions:**
```bash
# Check internet connectivity from container
pct exec $CTID -- ping -c 3 8.8.8.8
pct exec $CTID -- curl -I https://pypi.org

# Update pip
pct exec $CTID -- /opt/proxmox-balance-manager/venv/bin/pip install --upgrade pip

# Try installing one package at a time
pct exec $CTID -- /opt/proxmox-balance-manager/venv/bin/pip install flask
pct exec $CTID -- /opt/proxmox-balance-manager/venv/bin/pip install flask-cors
pct exec $CTID -- /opt/proxmox-balance-manager/venv/bin/pip install gunicorn

# If still failing, check Python version
pct exec $CTID -- python3 --version
# Should be 3.8 or higher
```

### Issue: Nginx returns 502 Bad Gateway

**Symptoms:** Web interface shows 502 error

**Solutions:**
```bash
# Check if Flask is running
pct exec $CTID -- systemctl status proxmox-balance

# If not running, check logs
pct exec $CTID -- journalctl -u proxmox-balance -n 50

# Common causes:
# 1. Python syntax error in app.py
pct exec $CTID -- /opt/proxmox-balance-manager/venv/bin/python3 -m py_compile /opt/proxmox-balance-manager/app.py

# 2. Missing Python packages
pct exec $CTID -- /opt/proxmox-balance-manager/venv/bin/python3 -c "import flask, flask_cors; print('OK')"

# 3. Wrong port in Nginx config
pct exec $CTID -- grep proxy_pass /etc/nginx/sites-available/proxmox-balance
# Should show: proxy_pass http://127.0.0.1:5000;

# Restart Flask service
pct exec $CTID -- systemctl restart proxmox-balance
```

### Issue: DHCP IP not detected

**Symptoms:** Installer can't determine container IP

**Solutions:**
```bash
# Check if container has IP
pct exec $CTID -- ip addr show eth0

# If no IP, check DHCP server
# Look for DHCP offers in container logs
pct exec $CTID -- journalctl -n 50 | grep -i dhcp

# Manually restart networking
pct exec $CTID -- systemctl restart networking

# Or configure static IP instead
pct set $CTID -net0 name=eth0,bridge=vmbr0,ip=10.0.0.131/24,gw=10.0.0.1
pct reboot $CTID
```

### Issue: Nodes not auto-detected

**Symptoms:** Installer asks for manual node entry

**Solutions:**
```bash
# Test detection methods manually

# Method 1: corosync.conf
grep -oP '(?<=name: ).*' /etc/pve/corosync.conf

# Method 2: /etc/pve/nodes/
ls /etc/pve/nodes/

# Method 3: pvecm
pvecm status

# Method 4: pvesh
pvesh get /nodes --output-format json | jq -r '.[].node'

# If all fail, manually enter your node hostnames when prompted
```

---

## 📚 Next Steps

After successful installation:

1. **Read the Usage Guide** - [Main README](../README.md#-usage)
2. **Configure Tagging Rules** - [Tagging Documentation](../README.md#tagging-guests)
3. **Review API Documentation** - [API.md](API.md)
4. **Setup Backup Strategy** - [Backup Instructions](../README.md#-backup-instructions)
5. **Join Community Discussions** - [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions)

---

## 🆘 Need Help?

- **Run Diagnostics**: `bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ $CTID`
- **Check Troubleshooting Guide**: [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
- **Open an Issue**: [GitHub Issues](https://github.com/Pr0zak/ProxBalance/issues)
- **Ask Questions**: [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions)

---

[⬆ Back to README](../README.md)