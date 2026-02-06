# Troubleshooting

---

## Quick Diagnostics

### Status checker

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <container-id>
```

Checks container status, services, data collection, API health, and Proxmox connectivity.

### Service debugger

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/debug-services.sh)" _ <container-id>
```

Verifies the Python environment, application files, service configurations, and import checks.

### Manual checks

```bash
pct exec <ctid> -- systemctl status proxmox-balance proxmox-collector.timer nginx
curl http://<container-ip>/api/health
pct exec <ctid> -- jq '.collected_at' /opt/proxmox-balance-manager/cluster_cache.json
pct exec <ctid> -- journalctl -u proxmox-balance -n 50
```

### Web UI Settings panel

The Settings panel provides service management without SSH:
- Restart API and collector services
- View service status
- Test API connectivity
- View logs
- Update Proxmox host and API tokens

---

## Common Fixes

| Issue | Fix |
|-------|-----|
| 502 Bad Gateway | `pct exec <ctid> -- systemctl restart proxmox-balance` |
| No data showing | `pct exec <ctid> -- systemctl start proxmox-collector.service` |
| API connection fails | Verify token: `pveum user token permissions proxbalance@pam!proxbalance` |
| Settings not saving | Use web UI Settings > Save Settings |
| Migrations failing | Check Proxmox tasks: `pvesh get /cluster/tasks` |
| Tags not working | Trigger refresh: `curl -X POST http://<container-ip>/api/refresh` |
| Services won't start | Check syntax: `pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -m py_compile /opt/proxmox-balance-manager/app.py` |
| Invalid config.json | Validate: `pct exec <ctid> -- jq '.' /opt/proxmox-balance-manager/config.json` |

---

## Installation Issues

### Container ID already exists

```bash
pct status <ctid>
pct stop <ctid> && pct destroy <ctid>
# Re-run installer (auto-detects next available ID)
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"
```

### Template not found

```bash
pveam update
pveam available | grep debian-12
pveam download local debian-12-standard_12.2-1_amd64.tar.zst
```

### Python dependencies fail to install

```bash
pct enter <ctid>
ping -c 3 8.8.8.8
/opt/proxmox-balance-manager/venv/bin/pip install --upgrade pip
/opt/proxmox-balance-manager/venv/bin/pip install -r /opt/proxmox-balance-manager/requirements.txt
exit
pct exec <ctid> -- systemctl restart proxmox-balance
```

### API token creation fails

Create manually on the Proxmox host:

```bash
pveum user token add proxbalance@pam proxbalance --privsep=0
# Save the token secret (only shown once)

# Set permissions on both user and token
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin
```

Update credentials in the web UI Settings or directly in `config.json`.

### API token secret lost

Token secrets cannot be retrieved after creation. Delete and recreate:

```bash
pveum user token remove proxbalance@pam proxbalance
pveum user token add proxbalance@pam proxbalance --privsep=0
pveum acl modify / --users proxbalance@pam --roles PVEVMAdmin
pveum acl modify / --tokens proxbalance@pam!proxbalance --roles PVEVMAdmin
```

Update the secret in ProxBalance Settings and restart the collector.

### DHCP IP not detected

```bash
pct exec <ctid> -- ip addr show eth0
pct exec <ctid> -- systemctl restart networking
# Or set a static IP:
pct set <ctid> -net0 name=eth0,bridge=vmbr0,ip=<ip>/24,gw=<gateway>
pct reboot <ctid>
```

---

## Web Interface Issues

### 502 Bad Gateway

The Flask API service is not running or crashed.

```bash
pct exec <ctid> -- systemctl status proxmox-balance
pct exec <ctid> -- journalctl -u proxmox-balance -n 50
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -c "import flask; import flask_cors; import proxmoxer; print('OK')"
pct exec <ctid> -- systemctl restart proxmox-balance
```

Common causes: missing `config.json`, Python syntax errors, port 5000 in use, virtual environment broken.

### Connection refused / page won't load

```bash
pct exec <ctid> -- systemctl status nginx
pct exec <ctid> -- nginx -t
pct exec <ctid> -- systemctl restart nginx
```

### No data displayed

```bash
pct exec <ctid> -- ls -lh /opt/proxmox-balance-manager/cluster_cache.json
pct exec <ctid> -- systemctl start proxmox-collector.service
pct exec <ctid> -- journalctl -u proxmox-collector -f
```

Wait for the collector to complete (typically 30-90 seconds), then refresh the dashboard.

---

## Data Collection Issues

### No cached data available

```bash
pct exec <ctid> -- jq -r '.proxmox_host' /opt/proxmox-balance-manager/config.json
pct exec <ctid> -- jq -r '.proxmox_api_token_id' /opt/proxmox-balance-manager/config.json
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 /opt/proxmox-balance-manager/collector_api.py
```

Common causes: `proxmox_host` not set, wrong token ID format, missing token secret, token lacks permissions.

### API token authentication failed

```bash
# Test connectivity from the container
pct exec <ctid> -- /opt/proxmox-balance-manager/venv/bin/python3 -c "
from proxmoxer import ProxmoxAPI
p = ProxmoxAPI('YOUR_HOST', user='proxbalance@pam', token_name='proxbalance', token_value='YOUR_SECRET', verify_ssl=False)
print(p.version.get())
"
```

Verify permissions exist on both the user and the token:
```bash
pveum acl list | grep proxbalance
```

Token ID format must be `user@realm!tokenname` (e.g., `proxbalance@pam!proxbalance`).

### Failed to connect to Proxmox API

```bash
pct exec <ctid> -- ping -c 3 <proxmox-host>
pct exec <ctid> -- curl -k -I https://<proxmox-host>:8006
```

If connection refused, check firewall on the Proxmox host allows port 8006 from the container IP.

---

## Migration Issues

### Migrations not executing

```bash
pct exec <ctid> -- journalctl -u proxmox-balance -n 100 | grep -i migrate
```

Check the browser developer console (F12 > Network) for API error responses on `/api/migrate`.

Ensure the API token has PVEVMAdmin permissions (PVEAuditor is read-only).

### VM/CT is locked

```bash
pvesh get /nodes/<node>/qemu/<vmid>/config | grep lock
# If safe to unlock:
qm unlock <vmid>    # VMs
pct unlock <vmid>   # Containers
```

### Migration fails mid-transfer

```bash
pvesh get /cluster/tasks | jq '.[] | select(.type == "qmigrate" or .type == "vzmigrate")'
```

Common causes: insufficient disk space on target, network problems between nodes, target node offline, storage not available on target.

---

## Configuration Issues

### Settings changes not taking effect

```bash
pct exec <ctid> -- systemctl daemon-reload
pct exec <ctid> -- systemctl restart proxmox-balance
pct exec <ctid> -- systemctl restart proxmox-collector.timer
```

The web UI Settings panel handles restarts automatically when you click Save.

### Config file corrupted

```bash
pct exec <ctid> -- jq '.' /opt/proxmox-balance-manager/config.json
```

If the JSON is invalid, restore from backup or recreate with minimum settings:
```json
{
  "collection_interval_minutes": 60,
  "ui_refresh_interval_minutes": 15,
  "proxmox_host": "YOUR_HOST",
  "proxmox_port": 8006,
  "proxmox_api_token_id": "proxbalance@pam!proxbalance",
  "proxmox_api_token_secret": "YOUR_SECRET",
  "proxmox_verify_ssl": false,
  "proxmox_auth_method": "api_token"
}
```

---

## AI Issues

### AI recommendations not appearing

1. Check AI is enabled: `pct exec <ctid> -- jq '.ai_provider, .ai_recommendations_enabled' /opt/proxmox-balance-manager/config.json`
2. Check API logs: `pct exec <ctid> -- journalctl -u proxmox-balance -n 100 | grep -i "ai\|anthropic\|openai\|ollama"`
3. Test provider connectivity (see [AI Features](AI_FEATURES.md#troubleshooting))

### Ollama connection issues

Ensure Ollama listens on all interfaces, not just localhost. See [AI Features - Ollama setup](AI_FEATURES.md#ollama-local).

---

## Tag Issues

### Tags not recognized

- Tags must be lowercase (`ignore`, not `Ignore`)
- No spaces in tag names (use underscores)
- Separate multiple tags with semicolons or spaces
- Anti-affinity tags must start with `exclude_`
- After changing tags, trigger a refresh: `curl -X POST http://<container-ip>/api/refresh`

### Anti-affinity violations not detected

Both guests must have the exact same `exclude_*` tag. Verify:
```bash
pvesh get /nodes/<node>/qemu/<vmid>/config | grep tags
```

---

## Performance Issues

### High CPU usage

```bash
pct exec <ctid> -- top -b -n 1 | head -20
```

Increase collection and UI refresh intervals for large clusters. Expected: <5% idle, 10-20% during collection.

### Slow web interface

Increase UI refresh interval. For large clusters (100+ guests), use 60-120 minute intervals. Clear browser cache with Ctrl+F5.

### Collection takes too long

Expected times: 20-40s (small), 40-90s (medium), 90-180s (large), 180-300s (very large). If exceeding 5 minutes, check Proxmox API responsiveness and network latency.

---

## Permission Issues

### Permission denied

```bash
pct exec <ctid> -- chown -R root:root /opt/proxmox-balance-manager/
pct exec <ctid> -- chmod +x /opt/proxmox-balance-manager/*.py
```

### Can't write cache file

```bash
pct exec <ctid> -- df -h
pct exec <ctid> -- test -w /opt/proxmox-balance-manager && echo "Writable" || echo "Not writable"
```

---

## Clean Reinstall

If all else fails:

```bash
pct exec <ctid> -- cp /opt/proxmox-balance-manager/config.json ~/config.backup.json
pct stop <ctid> && pct destroy <ctid>
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/install.sh)"
```

---

## Gathering Logs for Support

```bash
bash -c "$(wget -qLO - https://raw.githubusercontent.com/Pr0zak/ProxBalance/main/check-status.sh)" _ <ctid> > status-report.txt 2>&1
```

When opening an issue, include:
- Proxmox VE version (`pveversion`)
- Container config (`pct config <ctid>`)
- Status report output
- Relevant service logs

---

## Support

- [GitHub Issues](https://github.com/Pr0zak/ProxBalance/issues)
- [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions)
- [Installation Guide](INSTALL.md)

---

[Back to Documentation](README.md)
