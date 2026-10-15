# Contributing

---

## Ways to Contribute

- **Report bugs** -- Help identify and fix issues
- **Suggest features** -- Share ideas for improvements
- **Improve documentation** -- Make it easier for others to use ProxBalance
- **Submit code** -- Fix bugs or implement new features
- **Test** -- Try ProxBalance in different environments

---

## Reporting Bugs

Before submitting, check [existing issues](https://github.com/Pr0zak/ProxBalance/issues) and the [Troubleshooting guide](TROUBLESHOOTING.md).

Include:
- Proxmox VE version
- ProxBalance version (from CHANGELOG.md or System page)
- Steps to reproduce
- Expected vs actual behavior
- Relevant logs (`journalctl -u proxmox-balance -n 50`)

[Submit Bug Report](https://github.com/Pr0zak/ProxBalance/issues/new?labels=bug)

---

## Suggesting Features

[Submit Feature Request](https://github.com/Pr0zak/ProxBalance/issues/new?labels=enhancement)

---

## Contributing Code

### Setup

```bash
git clone https://github.com/YOUR-USERNAME/ProxBalance.git
cd ProxBalance
git checkout -b feature/your-feature

python3 -m venv venv
source venv/bin/activate
pip install flask flask-cors gunicorn proxmoxer requests pytz flask-compress
```

### Code style

- **Python**: PEP 8. Format with `black *.py`, lint with `flake8 *.py`.
- **JavaScript/React**: 2-space indentation, semicolons.
- **Bash**: 2-space indentation, quote variables.

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(api): add webhook support for migration events
fix(collector): handle missing API token gracefully
docs(readme): add troubleshooting section
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Testing

```bash
python3 -m py_compile app.py
python3 -m py_compile collector_api.py
```

For end-to-end testing, use the [Docker development setup](DOCKER_DEV.md).

### Submitting a Pull Request

1. Push your branch to your fork
2. Open a pull request against `main`
3. Include a description of the changes and any related issues
4. Ensure the PR focuses on a single feature or fix

---

## Testing

Help test ProxBalance in different environments:
- Proxmox VE 8.x and 9.x
- Clusters of various sizes (2-10+ nodes)
- Different network configurations
- Migration scenarios with shared and local storage

Share results in [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions).

---

## Demo Cluster and Screenshots

`tools/demo/` runs ProxBalance against a made-up cluster instead of a real one. A small fake Proxmox API (`fake_pve.py`) serves five nodes (orion, lyra, vega, draco, cygnus) and 41 guests on `127.0.0.1:8006`. `seed.py` writes 90 days of history from the same load model, so charts, outcomes, the change log and automation runs agree with the live values. The scenario includes a busy node, a node whose memory grows, a NAS with high IO wait, a failed disk, broken and holding placement rules, HA rules, guests that can't move (passthrough disks, host folder mounts, a shared media mount), guests tagged `ignore`, `io_exempt` and `auto_migrate_ok`, and a move waiting for approval. All names are invented, so screenshots need no blurring.

Use it on a test install, never on the one that manages your cluster:

```bash
bash tools/demo/pb-demo.sh on      # moves config.json and the data aside, starts the demo
bash tools/demo/pb-demo.sh status
bash tools/demo/pb-demo.sh reset   # fresh history
bash tools/demo/pb-demo.sh off     # restores config.json and the data
```

`on` writes a demo `config.json` with a placeholder token and every notification provider disabled. Automation runs in semi-automatic mode with dry run off. Approved moves run against the fake API only. The script refuses to run on a host not named `proxbalance-staging` unless `PB_DEMO_ANY_HOST=1` is set.

To refresh the images in `docs/images/` from a running demo:

```bash
npm install puppeteer   # once; node_modules is gitignored
PB_URL=http://<demo-host>/ node tools/screenshots.js
PB_URL=http://<demo-host>/ SHOTS=dashboard,wall node tools/screenshots.js   # a subset
```

---

## Community Guidelines

- Be respectful and constructive
- Focus on technical merit
- Welcome newcomers
- No harassment or spam

---

[Back to Documentation](README.md)
