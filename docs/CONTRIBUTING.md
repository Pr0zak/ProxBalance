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
- Proxmox VE 7.x and 8.x
- Clusters of various sizes (2-10+ nodes)
- Different network configurations
- Migration scenarios with shared and local storage

Share results in [GitHub Discussions](https://github.com/Pr0zak/ProxBalance/discussions).

---

## Community Guidelines

- Be respectful and constructive
- Focus on technical merit
- Welcome newcomers
- No harassment or spam

---

[Back to Documentation](README.md)
