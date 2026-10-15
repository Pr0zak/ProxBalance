# Updating ProxBalance

Installs update to published releases. A release is published only after CI has tested it and built its web bundle. See [Releasing and updating](RELEASING.md) for channels and how an update runs.

---

## Method 1: Web UI (Recommended)

1. Click the version number in the top bar, on any page.
2. Read the release notes and, if you want, change the channel (stable, beta or dev).
3. Click **Update**.

The update runs in its own systemd unit (`proxbalance-update`) and shows each step live: backup of the database, settings and web files, checkout of the release, the tested web bundle (checksum-verified), dependencies, restart and health check. If ProxBalance doesn't come back healthy, it goes back to the previous version on its own. Each update is also written to the change log (Automation → History & Logs → Change log).

---

## Method 2: From the Proxmox host

```bash
bash update.sh <container-id>        # asks before updating
bash update.sh <container-id> -y     # no question
```

`update.sh` uses the same updater as the web UI. It shows the release notes for the newest release on the install's channel and asks before updating.

---

## Method 3: Inside the container

```bash
cd /opt/proxmox-balance-manager
venv/bin/python3 release_updater.py check --channel stable   # newest release on a channel
venv/bin/python3 release_updater.py apply --latest stable    # update to it
venv/bin/python3 release_updater.py apply --tag v2.20.0      # update to one release
venv/bin/python3 release_updater.py status                   # result of the last update
journalctl -u proxbalance-update                             # full log of the last update
```

### Installs from before v2.16.0

These have no `release_updater.py`. Update them once by pulling `main`, then use the methods above:

```bash
cd /opt/proxmox-balance-manager
git fetch origin main
git pull origin main
bash post_update.sh
systemctl restart proxmox-balance
```

After that, the update window offers "switch to release vX.Y.Z", which moves the install onto the stable channel.

---

## Update channels

Installs update to published releases (the stable channel) by default. To follow a branch for development or testing, set the channel to `dev` in the update window and check the branch out once:

```bash
cd /opt/proxmox-balance-manager
git fetch origin
git checkout <branch>
bash post_update.sh
systemctl restart proxmox-balance
```

To try a fix before it is released, use the beta channel; fixes are published as pre-releases (`vX.Y.Z-rc.N`).

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
cd /opt/proxmox-balance-manager && git describe --tags
systemctl is-active proxmox-balance nginx proxmox-collector.timer
curl -s http://localhost/ | grep -q "ProxBalance" && echo "Web UI working"
```

See also "An in-app update failed or didn't update the UI" in [Troubleshooting](TROUBLESHOOTING.md#an-in-app-update-failed-or-didnt-update-the-ui).

---

## Support

- [GitHub Issues](https://github.com/Pr0zak/ProxBalance/issues)
- [Documentation](https://github.com/Pr0zak/ProxBalance)

---

[Back to Documentation](README.md)
