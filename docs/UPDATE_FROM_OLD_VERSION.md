# Updating ProxBalance

---

## Method 1: Web UI (Recommended)

1. Open the ProxBalance web interface
2. Click **System** in the navigation
3. Click **Update ProxBalance**

The update runs automatically. If you see "Build failed with exit code -15" warnings, these are cosmetic and the update still completes successfully.

---

## Method 2: Command Line (from Proxmox host)

```bash
CTID=<container-id>

pct exec $CTID -- bash -c '
cd /opt/proxmox-balance-manager &&
git fetch origin main &&
git pull origin main &&
bash post_update.sh &&
systemctl restart proxmox-balance
'
```

Verify:
```bash
pct exec $CTID -- bash -c 'cd /opt/proxmox-balance-manager && git log --oneline -1'
```

---

## Method 3: Direct SSH

```bash
ssh root@<proxbalance-server>
cd /opt/proxmox-balance-manager
git fetch origin main
git pull origin main
bash post_update.sh
systemctl restart proxmox-balance
```

---

## Branches

- **main** -- Stable releases (recommended for production)
- **dev** -- Latest features and fixes (may be less stable)

To switch branches:
```bash
cd /opt/proxmox-balance-manager
git fetch origin
git checkout main
git pull origin main
bash post_update.sh
systemctl restart proxmox-balance
```

---

## Troubleshooting

### Services not restarting

```bash
systemctl restart proxmox-balance
systemctl restart proxmox-collector.timer
systemctl restart nginx
```

### Web interface not loading

```bash
systemctl status proxmox-balance
systemctl status nginx
journalctl -u proxmox-balance -n 50
```

### Verify installation

```bash
cd /opt/proxmox-balance-manager && git log --oneline -1
systemctl is-active proxmox-balance nginx proxmox-collector.timer
curl -s http://localhost/ | grep -q "ProxBalance" && echo "Web UI working"
```

---

## Support

- [GitHub Issues](https://github.com/Pr0zak/ProxBalance/issues)
- [Documentation](https://github.com/Pr0zak/ProxBalance)

---

[Back to Documentation](README.md)
