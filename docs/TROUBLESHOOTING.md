# ProxBalance Troubleshooting Guide

Common issues and solutions for ProxBalance v2.0+.

---

## 🔍 Quick Diagnostics

### Comprehensive Status Check

Run the automated status checker for a complete health report:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <container-id>
```

This checks:
- ✅ Container status and IP
- ✅ All service status (API, Collector, Nginx)
- ✅ Data collection status and cache age
- ✅ API health and endpoints
- ✅ Proxmox API token validation and connectivity
- ✅ Quick action commands

### Service Debugger

For deep service troubleshooting:

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/debug-services.sh)" _ <container-id>
```

This verifies:
- ✅ Python virtual environment
- ✅ Application files
- ✅ Service configurations
- ✅ Manual service starts
- ✅ Import checks
- ✅ Syntax validation

### Manual Health Checks

```bash
# Check all services at once
pct exec <ctid> -- systemctl status proxmox-balance proxmox-collector.timer nginx

# Test API health
curl http://<container-ip>/api/health | jq

# Check cache file exists and is recent
pct exec <ctid> -- ls -lh /opt/proxmox-balance-manager/cluster_cache.json
pct exec <ctid> -- jq '.collected_at' /opt/proxmox-balance-manager/cluster_cache.json

# View recent API logs
pct exec <ctid> -- journalctl -u proxmox-balance -n 50

# View recent collector logs
pct exec <ctid> -- journalctl -u proxmox-collector -n 50
```

### Web UI Settings Panel (v2.0+)

Access the Settings panel in the web interface for debugging tools:

1. Click the **⚙️ Settings** icon in the top-right corner
2. Scroll to **Service Management** section
3. Use these debugging features:
   - **Restart API Service** - Restarts Flask/Gunicorn API server
   - **Restart Collector Service** - Restarts background data collector
   - **Update Proxmox Host** - Change Proxmox API endpoint
   - **Update API Tokens** - Reconfigure authentication credentials

**Settings Panel Features:**
- **Real-time service status** - See if services are running
- **Configuration validation** - Checks config.json syntax
- **API connectivity test** - Validates Proxmox API connection
- **Log viewer** - View recent errors without shell access
- **One-click restarts** - Restart services without SSH/shell

---

## ❌ Installation Issues

### Error: "Container ID already exists"

**Problem:** Container ID is already in use.

**Solution:**
```bash
# Check if container exists
pct status <ctid>

# If you want to remove it
pct stop <ctid>
pct destroy <ctid>

# Re-run installer (will auto-detect next available ID)
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"
```

### Error: "Template not found"

**Problem:** Debian 12 template not available.

**Solution:**
```bash
# Update template list
pveam update

# List available templates
pveam available | grep debian-12

# Download template
pveam download local debian-12-standard_12.2-1_amd64.tar.zst

# Re-run installer
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"
```

### Error: Python dependencies fail to install

**Problem:** Network issues, PyPI repository problems, or missing build dependencies.

**Solution:**
```bash
# Enter container
pct enter <ctid>

# Check internet connectivity
ping -c 3 8.8.8.8
curl -I https://pypi.org

# Update pip to latest version
/opt/proxmox-balance-manager/venv/bin/pip install --upgrade pip

# Reinstall dependencies one by one
/opt/proxmox-balance-manager/venv/bin/pip install flask
/opt/proxmox-balance-manager/venv/bin/pip install flask-cors
/opt/proxmox-balance-manager/venv/bin/pip install gunicorn
/opt/proxmox-balance-manager/venv/bin/pip install proxmoxer
/opt/proxmox-balance-manager/venv/bin/pip install requests

# Verify installations
/opt/proxmox-balance-manager/venv/bin/pip list | grep -E 'Flask|gunicorn|proxmoxer'

# Exit container
exit

# Restart services
pct exec <ctid> -- systemctl restart proxmox-balance
```

**Expected versions:**
- Flask: 3.x
- Flask-CORS: 4.x+
- Gunicorn: 21.x+
- Proxmoxer: 2.x+
- Requests: 2.31+

### Error: API token creation fails

**Problem:** Installer can't create API token automatically.

**Solution:**
```bash
# Create API token manually on Proxmox host
pveum user token add proxbalance@pam proxbalance --privsep=0

# Note the token secret (only shown once!)
# Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Add proper permissions (choose based on your needs)
# IMPORTANT: Both USER and TOKEN need ACL permissions (even with privsep=0)

# Option 1: Minimal (read-only) - for monitoring only
pveum acl modify / --users proxbalance@pam --roles PVEAuditor
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEAuditor

# Option 2: Full (with migrations) - for automated load balancing
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin

# Update config.json via web UI Settings panel
# Or manually edit:
pct exec <ctid> -- nano /opt/proxmox-balance-manager/config.json

# Set these values:
# "proxmox_api_token_id": "proxbalance@pam!proxbalance"
# "proxmox_api_token_secret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"

# Restart collector to apply
pct exec <ctid> -- systemctl restart proxmox-collector
```

### Error: DHCP IP not detected

**Problem:** Container didn't receive IP or detection timeout.

**Solution:**
```bash
# Check container network status
pct exec <ctid> -- ip addr show eth0

# If no IP, check DHCP server
# Then restart container networking
pct exec <ctid> -- systemctl restart networking

# Or reconfigure for static IP
pct set <ctid> -net0 name=eth0,bridge=vmbr0,ip=<your-ip>/24,gw=<gateway>
pct reboot <ctid>
```

---

## 🌐 Web Interface Issues

### Error: "502 Bad Gateway"

**Problem:** Flask API service not running or Gunicorn workers crashed.

**Solution:**
```bash
# Run the service debugger
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/debug-services.sh)" _ <ctid>

# Check Flask service status
pct exec <ctid> -- systemctl status proxmox-balance

# Check for errors in logs (look for Python tracebacks)
pct exec <ctid> -- journalctl -u proxmox-balance -n 50

# Test Python imports
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -c "import flask; import flask_cors; import proxmoxer; print('OK')"

# Test if app.py has syntax errors
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -m py_compile /opt/proxmox-balance-manager/app.py

# Check if port 5000 is listening
pct exec <ctid> -- netstat -tlnp | grep :5000

# Restart Flask service
pct exec <ctid> -- systemctl restart proxmox-balance

# Verify it's running
pct exec <ctid> -- systemctl is-active proxmox-balance

# Test API directly on port 5000
pct exec <ctid> -- curl -s http://127.0.0.1:5000/api/health | jq
```

**Common causes:**
1. **Missing config.json** - Service won't start without valid configuration
2. **Python syntax errors** - Check app.py for recent changes
3. **Port already in use** - Another process using port 5000
4. **Virtual environment issues** - venv/bin/python3 not found
5. **Missing proxmoxer library** - Required for Proxmox API calls

**Using Web UI Settings to Fix:**
1. Open Settings panel (⚙️ icon)
2. Click "Restart API Service" button
3. Check browser console for error messages (F12)
4. Review logs in Settings panel

### Error: "Connection refused" or page won't load

**Problem:** Nginx not running or misconfigured.

**Solution:**
```bash
# Check nginx status
pct exec <ctid> -- systemctl status nginx

# Test nginx configuration
pct exec <ctid> -- nginx -t

# Check if nginx is listening
pct exec <ctid> -- netstat -tlnp | grep :80

# Check nginx logs
pct exec <ctid> -- tail -f /var/log/nginx/error.log

# Restart nginx
pct exec <ctid> -- systemctl restart nginx

# Verify site is enabled
pct exec <ctid> -- ls -l /etc/nginx/sites-enabled/
```

### Web interface loads but shows no data

**Problem:** No cached data available yet or collector hasn't run.

**Solution:**
```bash
# Check if cache file exists
pct exec <ctid> -- ls -lh /opt/proxmox-balance-manager/cluster_cache.json

# If missing, trigger manual collection
pct exec <ctid> -- systemctl start proxmox-collector.service

# Watch collection progress
pct exec <ctid> -- journalctl -u proxmox-collector -f

# Wait 60-90 seconds, then check cache
pct exec <ctid> -- jq '.collected_at' /opt/proxmox-balance-manager/cluster_cache.json

# If still failing, check collector logs for errors
pct exec <ctid> -- journalctl -u proxmox-collector -n 100
```

**Using Web UI Settings:**
1. Open Settings panel
2. Click "Restart Collector Service"
3. Wait 2 minutes for data collection
4. Refresh the dashboard

### Error: "Service temporarily unavailable"

**Problem:** Cache is empty or being collected.

**Solution:**
```bash
# This is normal on first access - wait 2-5 minutes for initial collection
# Check collection status
pct exec <ctid> -- systemctl status proxmox-collector.service

# View timer status
pct exec <ctid> -- systemctl list-timers proxmox-collector.timer

# Force immediate collection
pct exec <ctid> -- systemctl start proxmox-collector.service
sleep 90
curl http://<container-ip>/api/analyze | jq '.success'
```

---

## 📡 Data Collection Issues

### Error: "No cached data available"

**Problem:** Collector hasn't run successfully yet or cache file doesn't exist.

**Solution:**
```bash
# Check if cache file exists
pct exec <ctid> -- ls -lh /opt/proxmox-balance-manager/cluster_cache.json

# Check collector service status
pct exec <ctid> -- systemctl status proxmox-collector.timer

# Check when collector last ran
pct exec <ctid> -- systemctl list-timers proxmox-collector.timer

# Check collector logs for errors (look for "CONFIGURATION ERROR" or "RUNTIME ERROR")
pct exec <ctid> -- journalctl -u proxmox-collector -n 50

# Run collector manually to see detailed output
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 /opt/proxmox-balance-manager/collector_api.py

# Check config.json is valid
pct exec <ctid> -- jq '.' /opt/proxmox-balance-manager/config.json

# Verify proxmox_host is set correctly (not "CHANGE_ME")
pct exec <ctid> -- jq -r '.proxmox_host' /opt/proxmox-balance-manager/config.json

# Verify API token credentials are set
pct exec <ctid> -- jq -r '.proxmox_api_token_id, .proxmox_api_token_secret' /opt/proxmox-balance-manager/config.json
```

**Configuration errors to check:**
1. `proxmox_host` is set to "CHANGE_ME" (must be real IP/hostname)
2. `proxmox_host` is unreachable or wrong value
3. `proxmox_api_token_id` not set or invalid format
4. `proxmox_api_token_secret` missing or incorrect
5. API token lacks proper permissions

**Using Web UI Settings:**
1. Open Settings panel
2. Review **Proxmox API Configuration** section
3. Update **API Token ID** (format: proxbalance@pam!proxbalance)
4. Update **API Token Secret** (UUID format)
5. Click **Save Settings**
6. Test connection with "Restart Collector Service"

### Error: "API token authentication failed"

**Problem:** API token credentials invalid or insufficient permissions.

**Solution:**
```bash
# Test API token connectivity from container
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 << 'EOF'
from proxmoxer import ProxmoxAPI
proxmox = ProxmoxAPI(
    'YOUR_PROXMOX_HOST',
    user='proxbalance@pam',
    token_name='proxbalance',
    token_value='YOUR_TOKEN_SECRET',
    verify_ssl=False
)
print(proxmox.version.get())
EOF

# If token is invalid, recreate it
pveum user token add proxbalance@pam proxbalance --privsep=0

# Verify token permissions
pveum user token permissions proxbalance@pam!proxbalance

# Should show one of:
# Option 1 (minimal): /  PVEAuditor
# Option 2 (full):    /  PVEVMAdmin

# If missing or incorrect, set permissions:
# IMPORTANT: Set permissions on BOTH user and token
# For read-only monitoring:
pveum acl modify / --users proxbalance@pam --roles PVEAuditor
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEAuditor

# For monitoring + migrations:
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin

# Update config.json with new token
pct exec <ctid> -- nano /opt/proxmox-balance-manager/config.json

# Restart collector
pct exec <ctid> -- systemctl restart proxmox-collector
```

**Common API token issues:**
1. **Wrong token format** - Must be "user@realm!tokenname" (e.g., proxbalance@pam!proxbalance)
2. **Token expired or revoked** - Recreate token
3. **Insufficient permissions** - Needs PVEAuditor (minimal) or PVEVMAdmin (full) role
4. **SSL certificate issues** - Set `proxmox_verify_ssl: false` in config.json
5. **Firewall blocking** - Ensure port 8006 accessible from container

### Error: "Failed to connect to Proxmox API"

**Problem:** Network connectivity or firewall blocking API access.

**Solution:**
```bash
# Test network connectivity to Proxmox host
pct exec <ctid> -- ping -c 3 <proxmox-host>

# Test if Proxmox API port is accessible
pct exec <ctid> -- curl -k -I https://<proxmox-host>:8006

# Expected: HTTP/2 200 or 401 (means port is accessible)

# Test API endpoint directly
pct exec <ctid> -- curl -k https://<proxmox-host>:8006/api2/json/version

# If connection refused, check firewall on Proxmox host
# Allow port 8006 from container IP
iptables -I INPUT -p tcp --dport 8006 -s <container-ip> -j ACCEPT

# Make firewall rule persistent
apt install iptables-persistent
netfilter-persistent save

# Or add to Proxmox firewall (recommended)
# Datacenter → Firewall → Add Rule
# Direction: in
# Action: ACCEPT
# Protocol: tcp
# Dest. port: 8006
# Source: <container-ip>/32
```

**Proxmox API Connectivity Checklist:**
- ✅ Container can ping Proxmox host
- ✅ Port 8006 is accessible (HTTPS)
- ✅ API token ID format is correct (proxbalance@pam!proxbalance)
- ✅ API token secret is valid UUID
- ✅ Token has correct permissions (PVEAuditor for read-only OR PVEVMAdmin for migrations)
- ✅ Proxmox web interface is accessible
- ✅ No firewall blocking container → Proxmox communication

### Error: "proxmoxer library not installed"

**Problem:** Python proxmoxer package missing or not found in venv.

**Solution:**
```bash
# Check if proxmoxer is installed
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/pip list | grep proxmoxer

# If missing, install it
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/pip install proxmoxer requests

# Verify installation
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -c "from proxmoxer import ProxmoxAPI; print('OK')"

# Restart services
pct exec <ctid> -- systemctl restart proxmox-balance proxmox-collector
```

### Error: Collector works but collection fails

**Problem:** Proxmox API calls failing or data format unexpected.

**Solution:**
```bash
# Test each API endpoint that collector uses
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 << 'EOF'
from proxmoxer import ProxmoxAPI
import json

# Replace with your config values
proxmox = ProxmoxAPI(
    'YOUR_PROXMOX_HOST',
    user='proxbalance@pam',
    token_name='proxbalance',
    token_value='YOUR_TOKEN_SECRET',
    verify_ssl=False
)

# Test cluster resources
print("Testing /cluster/resources...")
resources = proxmox.cluster.resources.get()
print(f"Found {len(resources)} resources")

# Test node RRD data
print("\nTesting node RRD data...")
nodes = [r for r in resources if r['type'] == 'node']
if nodes:
    node_name = nodes[0]['node']
    rrd = proxmox.nodes(node_name).rrddata.get(timeframe='hour')
    print(f"Found {len(rrd)} RRD data points for {node_name}")

# Test guest config
print("\nTesting guest config...")
vms = [r for r in resources if r['type'] == 'qemu']
if vms:
    vm = vms[0]
    config = proxmox.nodes(vm['node']).qemu(vm['vmid']).config.get()
    print(f"Retrieved config for VM {vm['vmid']}")

print("\nAll API tests passed!")
EOF

# Check Proxmox API is responding
curl -k https://<proxmox-host>:8006/api2/json/version | jq

# Verify cluster status (ensure cluster is healthy)
pvecm status

# Check for API rate limiting or timeout issues
pct exec <ctid> -- journalctl -u proxmox-collector -n 200 | grep -i "timeout\|rate"
```

**Specific API errors:**
1. **"401 Unauthorized"** - Token credentials invalid
2. **"403 Forbidden"** - Token lacks required permissions
3. **"500 Internal Server Error"** - Proxmox API issue, check Proxmox logs
4. **"Connection timeout"** - Network latency too high, increase timeout
5. **"SSL certificate verify failed"** - Set `proxmox_verify_ssl: false`

### Error: "Command failed" in collector logs

**Problem:** Specific Proxmox API call failing.

**Solution:**
```bash
# View full collector error
pct exec <ctid> -- journalctl -u proxmox-collector -n 100 --no-pager

# Enable debug mode in collector_api.py (add after imports):
# import logging
# logging.basicConfig(level=logging.DEBUG)

# Run collector with verbose output
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 /opt/proxmox-balance-manager/collector_api.py

# Check Proxmox API access logs
tail -f /var/log/pveproxy/access.log | grep <container-ip>

# Look for 401/403/500 errors indicating auth or permission issues
```

---

## 🔄 Migration Issues

### Migrations not executing

**Problem:** Migration API call failing or command errors.

**Solution:**
```bash
# Check migration logs in API service
pct exec <ctid> -- journalctl -u proxmox-balance -n 100 | grep -i migrate

# Verify guest exists and is accessible via API
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 << 'EOF'
from proxmoxer import ProxmoxAPI

proxmox = ProxmoxAPI(
    'YOUR_PROXMOX_HOST',
    user='proxbalance@pam',
    token_name='proxbalance',
    token_value='YOUR_TOKEN_SECRET',
    verify_ssl=False
)

# Check VM status
try:
    status = proxmox.nodes('SOURCE_NODE').qemu('VMID').status.current.get()
    print(f"VM status: {status['status']}")
except Exception as e:
    print(f"Error: {e}")
EOF

# Check guest status (must be running for online migration)
pvesh get /nodes/<source-node>/qemu/<vmid>/status/current  # for VMs
pvesh get /nodes/<source-node>/lxc/<vmid>/status/current   # for containers

# Check if guest is locked
pvesh get /nodes/<source-node>/qemu/<vmid>/config | grep lock
pvesh get /nodes/<source-node>/lxc/<vmid>/config | grep lock

# Test migration via API manually
pvesh create /nodes/<source-node>/qemu/<vmid>/migrate --target <target-node> --online 1

# Check Proxmox task log for migration errors
pvesh get /nodes/<source-node>/tasks

# View detailed task log
pvesh get /nodes/<source-node>/tasks/<taskid>/log
```

**Migration execution details (v2.0+):**
- **VMs**: Uses Proxmox API `/nodes/{node}/qemu/{vmid}/migrate` endpoint
- **Containers**: Uses Proxmox API `/nodes/{node}/lxc/{vmid}/migrate` endpoint
- Executed via ProxmoxAPI library (not SSH)
- Migrations are async - API returns task ID
- Migration progress tracked via task API

**Why migrations might fail:**
1. **Guest not running** - VMs need to be running for online migration
2. **Insufficient space on target** - Check disk space
3. **Network issues** - Source and target nodes can't communicate
4. **Shared storage not available** - Storage not accessible on target
5. **Guest is locked** - Another operation in progress
6. **API token missing migration permission** - Check PVEVMAdmin role

**Using Web UI to Debug:**
1. Open browser developer console (F12)
2. Go to Network tab
3. Attempt migration
4. Check API response for error details
5. Look for `/api/migrate` endpoint status

### Error: "VM/CT is locked"

**Problem:** Guest is already being migrated or has a lock.

**Solution:**
```bash
# Check guest status
pvesh get /nodes/<source-node>/lxc/<vmid>/status/current
# or for VMs
pvesh get /nodes/<source-node>/qemu/<vmid>/status/current

# Check for locks
pvesh get /nodes/<source-node>/lxc/<vmid>/config | grep lock
pvesh get /nodes/<source-node>/qemu/<vmid>/config | grep lock

# If locked, check what task is running
pvesh get /nodes/<source-node>/tasks | jq '.[] | select(.id == "<vmid>")'

# If safe to do so, unlock manually (be cautious!)
qm unlock <vmid>    # for VMs
pct unlock <vmid>   # for containers

# Then retry migration via web interface
```

### Migration starts but fails mid-transfer

**Problem:** Network issues, insufficient resources, or storage problems.

**Solution:**
```bash
# Check Proxmox task log for specific error
pvesh get /cluster/tasks | jq '.[] | select(.type == "qmigrate" or .type == "vzmigrate")'

# Get full task log
pvesh get /nodes/<source-node>/tasks/<upid>/log

# Common issues to check:

# 1. Not enough disk space on target
pvesh get /nodes/<target-node>/status | jq '.rootfs'

# 2. Network connectivity problems
ping <target-node>

# 3. Target node offline or degraded
pvecm status

# 4. Storage compatibility
pvesm status

# 5. Check for resource limits
pvesh get /nodes/<target-node>/status | jq '.memory, .cpu'

# 6. Check migration network settings
pvesh get /nodes/<source-node>/qemu/<vmid>/config | grep migration
```

### Batch migrations partially failing

**Problem:** Some migrations in batch succeed, others fail.

**Solution:**
```bash
# Check API logs for batch migration details
pct exec <ctid> -- journalctl -u proxmox-balance -n 200 | grep -A 5 "migrate"

# Each migration in batch is independent
# Check Proxmox tasks for failed migrations
pvesh get /cluster/tasks | jq '.[] | select(.status != "OK")'

# Check if specific guests have locks or issues
pvesh get /nodes/<node>/qemu/<vmid>/config | grep -E 'lock|tags'

# Retry failed migrations individually through web interface
# Or via API:
curl -X POST http://<container-ip>/api/migrate \
  -H "Content-Type: application/json" \
  -d '{
    "vmid": <vmid>,
    "source_node": "<source>",
    "target_node": "<target>",
    "guest_type": "VM"
  }'
```

---

## ⚙️ Configuration Issues

### Settings changes not taking effect

**Problem:** Services not restarted after config change or update_timer.py failed.

**Solution:**
```bash
# Check config file syntax
pct exec <ctid> -- jq '.' /opt/proxmox-balance-manager/config.json

# If using web interface, check API logs for errors
pct exec <ctid> -- journalctl -u proxmox-balance -n 50 | grep -i config

# Manually run update_timer.py to update systemd timer
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 /opt/proxmox-balance-manager/update_timer.py

# Verify timer file was updated with new interval
pct exec <ctid> -- cat /etc/systemd/system/proxmox-collector.timer

# Expected output should show:
# OnUnitActiveSec=<your-interval>min

# Reload systemd daemon
pct exec <ctid> -- systemctl daemon-reload

# Restart services
pct exec <ctid> -- systemctl restart proxmox-balance
pct exec <ctid> -- systemctl restart proxmox-collector.timer

# Verify new interval is active
pct exec <ctid> -- systemctl list-timers proxmox-collector.timer

# Check when next collection will run
pct exec <ctid> -- systemctl status proxmox-collector.timer
```

**Using Web UI Settings (Recommended):**
1. Open Settings panel (⚙️ icon)
2. Make configuration changes
3. Click **Save Settings**
4. Services automatically restart
5. Verify changes took effect by checking dashboard

**What update_timer.py does:**
1. Reads `collection_interval_minutes` from config.json
2. Generates new timer file content
3. Writes to /etc/systemd/system/proxmox-collector.timer
4. Runs `systemctl daemon-reload`
5. Restarts proxmox-collector.timer

**If update_timer.py fails:**
- Check Python syntax: `python3 -m py_compile update_timer.py`
- Check permissions: Timer file must be writable by root
- Check systemctl path: Should be /usr/bin/systemctl

### Can't change collection interval

**Problem:** Timer file not updating.

**Solution:**
```bash
# Run update script manually
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 /opt/proxmox-balance-manager/update_timer.py

# Check if timer file was updated
pct exec <ctid> -- cat /etc/systemd/system/proxmox-collector.timer

# Reload systemd
pct exec <ctid> -- systemctl daemon-reload

# Restart timer
pct exec <ctid> -- systemctl restart proxmox-collector.timer

# Verify new interval
pct exec <ctid> -- systemctl list-timers proxmox-collector.timer
```

### Configuration file corrupted

**Problem:** Invalid JSON in config.json.

**Solution:**
```bash
# Check for JSON syntax errors
pct exec <ctid> -- jq '.' /opt/proxmox-balance-manager/config.json

# If corrupted, recreate with defaults (v2.0 format)
pct exec <ctid> -- bash -c 'cat > /opt/proxmox-balance-manager/config.json <<EOF
{
  "collection_interval_minutes": 60,
  "ui_refresh_interval_minutes": 15,
  "proxmox_host": "<your-proxmox-host-ip>",
  "proxmox_port": 8006,
  "proxmox_api_token_id": "proxbalance@pam!proxbalance",
  "proxmox_api_token_secret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "proxmox_verify_ssl": false,
  "proxmox_auth_method": "api_token",
  "ai_enabled": false,
  "ai_provider": "none",
  "ai_api_key": "",
  "ai_model": "",
  "ai_base_url": "",
  "ai_analysis_period": "24h"
}
EOF'

# Update with your actual values
pct exec <ctid> -- nano /opt/proxmox-balance-manager/config.json

# Restart services
pct exec <ctid> -- systemctl restart proxmox-balance proxmox-collector.timer
```

---

## 🤖 AI Recommendations Issues

### AI recommendations not appearing

**Problem:** AI features enabled but no recommendations showing.

**Solutions:**
```bash
# 1. Verify AI is enabled in config
pct exec <ctid> -- jq '.ai_enabled' /opt/proxmox-balance-manager/config.json
# Should return: true

# 2. Check AI provider is configured
pct exec <ctid> -- jq '.ai_provider, .ai_api_key' /opt/proxmox-balance-manager/config.json

# 3. Check API logs for AI errors
pct exec <ctid> -- journalctl -u proxmox-balance -n 100 | grep -i "ai\|anthropic\|openai\|ollama"

# 4. Test AI API connectivity manually
# For OpenAI:
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# For Anthropic:
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: YOUR_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'

# For Ollama:
curl http://<ollama-host>:11434/api/version
```

**Using Web UI Settings:**
1. Open Settings panel (⚙️ icon)
2. Scroll to **AI-Enhanced Migration Recommendations**
3. Toggle **Enable AI Recommendations**
4. Select AI provider (OpenAI, Anthropic, or Ollama)
5. Enter API credentials
6. Choose analysis time period (1h, 6h, 24h, 7d)
7. Click **Save Settings**
8. Try generating recommendations again

**Common Causes:**
- Invalid or expired API key
- Network connectivity issues
- Ollama service not running
- Insufficient API credits (OpenAI/Anthropic)
- Model name incorrect or not available
- Missing `requests` library in venv

### Error: "AI API request failed"

**Problem:** AI provider returns errors.

**OpenAI Errors:**
```bash
# Error: 401 Unauthorized
# - Check API key is correct
# - Verify key hasn't been revoked at https://platform.openai.com/api-keys

# Error: 429 Rate Limit Exceeded
# - Reduce analysis frequency
# - Upgrade API plan
# - Wait and retry

# Error: 500 Internal Server Error
# - OpenAI service issue
# - Try again later
# - Switch to different provider temporarily
```

**Anthropic Errors:**
```bash
# Error: 401 authentication_error
# - Check API key format (must start with sk-ant-)
# - Verify key at https://console.anthropic.com/settings/keys

# Error: 429 rate_limit_error
# - Reduce request frequency
# - Check usage limits

# Error: 529 overloaded_error
# - Anthropic service overloaded
# - Retry with exponential backoff
```

**Ollama Errors:**
```bash
# Error: Connection refused
# Ollama service not running

# Check Ollama status
systemctl status ollama  # on Ollama host

# Start Ollama
systemctl start ollama

# Error: Model not found
# Pull the model

ollama pull qwen2.5:7b      # Recommended
ollama pull llama3.1:8b     # Alternative

# List available models
ollama list

# Error: Out of memory
# Model too large for available RAM
# - Use smaller model (qwen2.5:7b instead of :14b)
# - Increase system RAM
# - Use quantized models
```

### Ollama connection issues

**Problem:** Can't connect to Ollama from ProxBalance container.

**Solutions:**
```bash
# 1. Verify Ollama is accessible from container
pct exec <ctid> -- curl http://<ollama-host>:11434/api/version

# 2. Check firewall on Ollama host
ufw status
# If blocking, allow ProxBalance container IP:
ufw allow from <container-ip> to any port 11434

# 3. Verify Ollama is listening on all interfaces
# On Ollama host, check:
ss -tlnp | grep 11434
# Should show 0.0.0.0:11434 or *:11434

# If only listening on 127.0.0.1, configure to listen on all interfaces
# Create/edit /etc/systemd/system/ollama.service.d/override.conf
mkdir -p /etc/systemd/system/ollama.service.d
cat > /etc/systemd/system/ollama.service.d/override.conf <<EOF
[Service]
Environment="OLLAMA_HOST=0.0.0.0:11434"
EOF

systemctl daemon-reload
systemctl restart ollama

# 4. Test model inference
curl http://<ollama-host>:11434/api/generate \
  -d '{"model":"qwen2.5:7b","prompt":"test","stream":false}'
```

**Using Web UI for Ollama Setup:**
1. Settings → AI Provider: **Local LLM (Ollama)**
2. **AI Model**: `qwen2.5:7b` (recommended)
3. **AI Base URL**: `http://<ollama-host>:11434`
4. **Analysis Period**: `24h` (recommended)
5. Save and test with "Get AI Recommendations"

### AI recommendations are irrelevant or poor quality

**Problem:** AI suggests migrations that don't make sense.

**Solutions:**

1. **Adjust analysis time period:**
   - Short period (1h) = only recent trends, may miss patterns
   - Long period (7d) = comprehensive but may include old data
   - Recommended: 24h for most clusters

2. **Ensure sufficient historical data:**
   ```bash
   # Check RRD data availability in cache
   pct exec <ctid> -- jq '.nodes | .[].trend_data | length' /opt/proxmox-balance-manager/cluster_cache.json

   # Should show many data points (varies by period)
   # If low, wait for more data collection cycles
   ```

3. **Try different AI model:**
   - **Cloud (Best)**: claude-3-5-sonnet-20241022, gpt-4o
   - **Cloud (Fast)**: claude-3-haiku-20240307, gpt-3.5-turbo
   - **Local (Best)**: qwen2.5:14b (needs 10GB RAM)
   - **Local (Balanced)**: qwen2.5:7b (needs 5GB RAM)
   - **Local (Fast)**: mistral:7b (needs 5GB RAM)

4. **Review AI reasoning:**
   - AI recommendations include detailed reasoning
   - Read the explanation to understand why migration was suggested
   - May reveal insights about your cluster patterns

### AI recommendations include non-existent nodes

**Problem:** AI hallucinates node names or recommends migrations to nodes that don't exist.

**Solution:**

This should be prevented by the smart filtering feature in v2.0+, but if it occurs:

```bash
# 1. Verify current filtering is working
pct exec <ctid> -- journalctl -u proxmox-balance -n 200 | grep "Filtered out"

# Should show lines like:
# "Filtered out 2 AI recommendations (hallucinated nodes or self-migrations)"

# 2. Check if issue persists after filtering
# View AI recommendations in web UI
# Any with target_node not in your cluster = bug, please report

# 3. Temporarily disable AI
# In Settings, toggle off "Enable AI Recommendations"
# Use traditional recommendations until issue resolved

# 4. Report the issue
# Open GitHub issue with:
# - AI provider and model used
# - Cluster configuration (node names)
# - Example of bad recommendation
# - API logs showing the filtering
```

**Note:** v2.0+ includes validation that:
- Filters recommendations where source == target
- Filters recommendations with target nodes not in cluster
- Prevents self-migrations
- Reports filtering statistics in logs

---

## 🏷️ Tag Issues

### Tags not being recognized

**Problem:** Tag format incorrect, not saved, or cache not refreshed.

**Solution:**
```bash
# Verify tag format on guest
pvesh get /nodes/<node>/qemu/<vmid>/config | grep tags

# Correct format examples:
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore"
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "exclude_group1"
pvesh set /nodes/<node>/qemu/<vmid>/config --tags "ignore;exclude_group1"

# Tags should be lowercase, no spaces in tag names
# Use semicolon OR space to separate multiple tags

# Force data refresh after changing tags
curl -X POST http://<container-ip>/api/refresh

# Wait for collection to complete
sleep 90

# Verify tags in cache (check all three fields)
pct exec <ctid> -- jq '.guests[] | select(.vmid == <vmid>) | .tags' /opt/proxmox-balance-manager/cluster_cache.json

# Expected output:
# {
#   "has_ignore": true,           // true if "ignore" tag present
#   "exclude_groups": [           // array of exclude_* tags
#     "exclude_firewall"
#   ],
#   "all_tags": [                 // all tags as array
#     "ignore",
#     "exclude_firewall"
#   ]
# }
```

**How collector_api.py parses tags:**
1. Reads tags string from guest config via Proxmox API
2. Splits by semicolon (`;`) and space
3. Checks if "ignore" is in list → sets `has_ignore: true`
4. Extracts tags starting with "exclude_" → adds to `exclude_groups` array
5. Stores all tags in `all_tags` array

**Common tag mistakes:**
1. **Capital letters** - Use lowercase: "Ignore" won't work, use "ignore"
2. **Spaces in tag names** - "exclude firewall" won't work, use "exclude_firewall"
3. **Wrong separator** - Use `;` or space, not comma
4. **Typos in exclude prefix** - "exlude_firewall" won't work, must start with "exclude_"
5. **Cache not refreshed** - Always trigger refresh after tag changes

### Affinity violations not detected

**Problem:** Tag names don't match or cache not updated.

**Solution:**
```bash
# Verify both guests have matching exclusion tags
pvesh get /nodes/<node1>/<type>/<vmid1>/config | grep tags
pvesh get /nodes/<node2>/<type>/<vmid2>/config | grep tags

# Example: Both should have "exclude_firewall" (exact match required)
# Tag must be identical on both guests

# Check if violation is shown in web interface
# Navigate to "Tagged Guests & Affinity Rules" section

# Force refresh
curl -X POST http://<container-ip>/api/refresh
sleep 90

# Check cache for violations
pct exec <ctid> -- jq '.guests[] | select(.tags.exclude_groups | length > 0)' /opt/proxmox-balance-manager/cluster_cache.json
```

### Ignore tag not preventing migrations

**Problem:** Tag not properly applied or cache outdated.

**Solution:**
```bash
# Verify ignore tag is set correctly
pvesh get /nodes/<node>/<type>/<vmid>/config | grep tags

# Should show: tags: ignore
# or: tags: ignore;other_tag

# Check if cache recognizes the tag
pct exec <ctid> -- jq '.guests[] | select(.vmid == <vmid>)' /opt/proxmox-balance-manager/cluster_cache.json

# Look for: "has_ignore": true

# If not showing, force cache refresh
pct exec <ctid> -- systemctl start proxmox-collector.service
sleep 90

# Verify in web interface - guest should appear in "Ignored Guests" section
```

---

## 📊 Performance Issues

### High CPU usage in container

**Problem:** Collection intervals too frequent for cluster size or stuck processes.

**Solution:**
```bash
# Check current intervals
pct exec <ctid> -- jq '.collection_interval_minutes, .ui_refresh_interval_minutes' /opt/proxmox-balance-manager/config.json

# Monitor CPU usage in real-time
pct exec <ctid> -- top -b -n 1 | head -20

# Check for stuck or zombie processes
pct exec <ctid> -- ps aux | grep -E 'python|gunicorn'

# Look for multiple collector processes (should only be 1 when running)
pct exec <ctid> -- ps aux | grep collector_api.py

# Check Gunicorn worker count (default is 4)
pct exec <ctid> -- ps aux | grep gunicorn | wc -l

# For large clusters (100+ guests), increase intervals via web UI:
# Settings → Collection Interval → 120 minutes
# Settings → UI Refresh → 60 minutes

# Or via command line:
pct exec <ctid> -- bash -c 'cat > /tmp/update_config.py <<EOF
import json
with open("/opt/proxmox-balance-manager/config.json", "r+") as f:
    config = json.load(f)
    config["collection_interval_minutes"] = 120
    config["ui_refresh_interval_minutes"] = 60
    f.seek(0)
    json.dump(config, f, indent=2)
    f.truncate()
EOF
/opt/proxmox-balance-manager/venv/bin/python3 /tmp/update_config.py'

# Restart services
pct exec <ctid> -- systemctl restart proxmox-balance proxmox-collector.timer

# Check if collector is hanging (timeout issue)
pct exec <ctid> -- journalctl -u proxmox-collector -n 100 | grep -i timeout

# Check how long collections are taking
pct exec <ctid> -- journalctl -u proxmox-collector -n 50 | grep -E "Starting|complete"
```

**Expected CPU usage:**
- **Idle**: <5% CPU, ~200MB RAM
- **During collection**: 10-20% CPU spike for 30-90 seconds
- **API requests**: <5% CPU per request
- **Gunicorn workers**: 4 processes, each <50MB RAM

**If CPU consistently high:**
1. **Increase collection interval** - Reduce frequency of data gathering
2. **Reduce Gunicorn workers** - Edit proxmox-balance.service, change `-w 4` to `-w 2`
3. **Check for infinite loops** - Look for collector_api.py running continuously
4. **Optimize cluster size** - Larger clusters need longer intervals

### High memory usage

**Problem:** Large cluster generating big cache file.

**Solution:**
```bash
# Check cache file size
pct exec <ctid> -- ls -lh /opt/proxmox-balance-manager/cluster_cache.json

# Check container memory usage
pct exec <ctid> -- free -h

# For very large clusters (200+ guests):
# Increase container memory allocation
pct set <ctid> -memory 4096

# Or reduce data collection frequency via web UI Settings
# Collection Interval → 240 minutes
```

### Slow web interface

**Problem:** UI refresh interval too aggressive or large cluster.

**Solution:**
```bash
# Increase UI refresh interval via Settings panel
# Or manually:
pct exec <ctid> -- bash -c 'jq ".ui_refresh_interval_minutes = 30" /opt/proxmox-balance-manager/config.json > /tmp/config.json && mv /tmp/config.json /opt/proxmox-balance-manager/config.json'

# For very large clusters:
# Backend: 120-240 minutes
# UI: 60-120 minutes

# Check if cache is too large
pct exec <ctid> -- du -h /opt/proxmox-balance-manager/cluster_cache.json

# Clear browser cache
# Hard refresh: Ctrl+F5 or Cmd+Shift+R
```

### Collection takes too long

**Problem:** Many nodes, large cluster, or slow Proxmox API responses.

**Solution:**
```bash
# Check collection time in logs (look for start and complete timestamps)
pct exec <ctid> -- journalctl -u proxmox-collector -n 20 | grep -E 'Starting|complete'

# Example output:
# Jan 15 10:00:00 Starting cluster data collection...
# Jan 15 10:01:30 Data collection complete. Cache updated.
# (90 seconds is normal for large clusters)

# Test Proxmox API latency
time curl -k https://<proxmox-host>:8006/api2/json/cluster/resources

# Test RRD data retrieval time (slowest operation)
time curl -k "https://<proxmox-host>:8006/api2/json/nodes/<node>/rrddata?timeframe=day"

# Check network latency from container to host
pct exec <ctid> -- ping -c 10 <proxmox-host>

# If API is slow, increase collection interval
# Settings → Collection Interval → 120 or 240 minutes

# Monitor a live collection
pct exec <ctid> -- systemctl start proxmox-collector.service && \
pct exec <ctid> -- journalctl -u proxmox-collector -f
```

**Collection time breakdown (API-based):**
1. **Connect to Proxmox API** - 1-2 seconds
2. **Get cluster resources** - 2-5 seconds (all VMs/CTs)
3. **Get RRD data per node** - 3-10 seconds per node (historical metrics)
4. **Get guest configs** - 0.5-1 second per guest (for tags)
5. **Write cache file** - <1 second (atomic rename)

**Expected collection times:**
- **Small cluster (1-20 guests, 2-3 nodes)**: 20-40 seconds
- **Medium cluster (21-50 guests, 3-4 nodes)**: 40-90 seconds
- **Large cluster (50-100 guests, 4+ nodes)**: 90-180 seconds
- **Very large (100+ guests, 5+ nodes)**: 180-300 seconds

**If collection takes >5 minutes:**
1. Check if Proxmox API is slow (test with curl)
2. Check network latency and bandwidth
3. Consider running collector less frequently
4. Check Proxmox host CPU/memory usage

---

## 🔐 Permission Issues

### Error: "Permission denied"

**Problem:** Container or file permissions incorrect.

**Solution:**
```bash
# Check if container is unprivileged (recommended)
pct config <ctid> | grep unprivileged

# Check file permissions in container
pct exec <ctid> -- ls -la /opt/proxmox-balance-manager/

# Fix permissions if needed
pct exec <ctid> -- chown -R root:root /opt/proxmox-balance-manager/
pct exec <ctid> -- chmod +x /opt/proxmox-balance-manager/*.py
pct exec <ctid> -- chmod +x /opt/proxmox-balance-manager/*.sh
```

### Error: Can't write to cache file

**Problem:** Filesystem permissions or disk full.

**Solution:**
```bash
# Check disk space
pct exec <ctid> -- df -h

# Check if directory is writable
pct exec <ctid> -- test -w /opt/proxmox-balance-manager && echo "Writable" || echo "Not writable"

# Check for file locks
pct exec <ctid> -- lsof /opt/proxmox-balance-manager/cluster_cache.json

# Fix ownership if needed
pct exec <ctid> -- chown root:root /opt/proxmox-balance-manager/cluster_cache.json
pct exec <ctid> -- chmod 644 /opt/proxmox-balance-manager/cluster_cache.json
```

### Error: "API token lacks permissions"

**Problem:** Proxmox API token missing required roles.

**Solution:**
```bash
# Check current token permissions
pveum user token permissions proxbalance@pam!proxbalance

# Should show one of:
# Option 1 (read-only):  path: /  roles: PVEAuditor
# Option 2 (full):       path: /  roles: PVEVMAdmin

# If missing or incorrect, add required permissions:
# IMPORTANT: Set permissions on BOTH user and token (even with privsep=0)
# For read-only monitoring:
pveum acl modify / --users proxbalance@pam --roles PVEAuditor
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEAuditor

# For monitoring + migrations:
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin

# Verify permissions were added
pveum user token permissions proxbalance@pam!proxbalance
pveum acl list | grep proxbalance

# Test API access
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -c "
from proxmoxer import ProxmoxAPI
proxmox = ProxmoxAPI(
    'YOUR_HOST',
    user='proxbalance@pam',
    token_name='proxbalance',
    token_value='YOUR_SECRET',
    verify_ssl=False
)
print(proxmox.cluster.resources.get())
"

# Restart collector to apply
pct exec <ctid> -- systemctl restart proxmox-collector
```

---

## 🧹 Clean Reinstall

If all else fails, perform a clean reinstall:

```bash
# 1. Backup configuration (optional)
pct exec <ctid> -- cp /opt/proxmox-balance-manager/config.json ~/config.backup.json

# 2. Stop container
pct stop <ctid>

# 3. Destroy container
pct destroy <ctid>

# 4. Re-run installer
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"

# 5. Wait for initial collection
sleep 180

# 6. Run status check
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <new-ctid>

# 7. If you backed up config, restore AI settings via web UI
```

---

## 📝 Gathering Logs for Support

If you need to open an issue, gather comprehensive logs:

```bash
# Run status checker and save output
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <ctid> > status-report.txt 2>&1

# Create log bundle
pct exec <ctid> -- bash -c "
journalctl -u proxmox-balance -n 200 > /tmp/api.log
journalctl -u proxmox-collector -n 200 > /tmp/collector.log
journalctl -u nginx -n 100 > /tmp/nginx-service.log 2>/dev/null || true
cat /var/log/nginx/error.log > /tmp/nginx-error.log 2>/dev/null || true
jq '.' /opt/proxmox-balance-manager/config.json > /tmp/config.log 2>/dev/null || true
tar -czf /tmp/proxbalance-logs.tar.gz /tmp/*.log 2>/dev/null
"

# Copy to Proxmox host
pct pull <ctid> /tmp/proxbalance-logs.tar.gz ./proxbalance-logs.tar.gz

# Include in your issue:
# - Proxmox VE version: pveversion
# - Container config: pct config <ctid>
# - ProxBalance version from CHANGELOG.md
# - Status report: status-report.txt
# - Log bundle: proxbalance-logs.tar.gz
```

---

## 🆘 Still Having Issues?

### Before Opening an Issue

1. ✅ Run the status checker script
2. ✅ Run the debug services script
3. ✅ Check this troubleshooting guide thoroughly
4. ✅ Search existing issues on GitHub
5. ✅ Gather logs using the section above

### Where to Get Help

- 🐛 [Open an Issue](https://github.com/Pr0zak/ProxBalance/issues) with logs and details
- 💬 [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions) for questions
- 📖 [Main Documentation](https://github.com/Pr0zak/ProxBalance) for guides
- 🔧 [Installation Guide](INSTALL.md) for setup help

---

## 💡 Common Fixes Summary

| Issue | Quick Fix | Command |
|-------|-----------|---------|
| 502 Bad Gateway | Restart Flask API | `pct exec <ctid> -- systemctl restart proxmox-balance` |
| No data showing | Run collector manually | `pct exec <ctid> -- systemctl start proxmox-collector.service` |
| API connection fails | Check API token | `pveum user token permissions proxbalance@pam!proxbalance` |
| Settings not saving | Use web UI Settings | Open Settings panel (⚙️) → Save Settings |
| Migrations failing | Check Proxmox tasks | `pvesh get /cluster/tasks` |
| High CPU usage | Increase intervals | Settings → Collection Interval → 120 min |
| Tags not working | Force cache refresh | `curl -X POST http://<container-ip>/api/refresh` |
| Cache file missing | Check config.json | `pct exec <ctid> -- jq -r '.proxmox_host' /opt/proxmox-balance-manager/config.json` |
| Services won't start | Check Python syntax | `pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -m py_compile /opt/proxmox-balance-manager/app.py` |
| Unknown container IP | Use status checker | `bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <ctid>` |
| Invalid config.json | Validate JSON syntax | `pct exec <ctid> -- jq '.' /opt/proxmox-balance-manager/config.json` |
| AI not working | Check provider settings | Settings → AI Configuration → Verify API key |

---

[⬆ Back to README](../README.md)
