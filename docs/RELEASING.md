# Releasing and updating

ProxBalance installs update to **published releases**, not to whatever is on
`main`. A release only exists once the release pipeline has tested and built
the tagged commit, so "update available" always means a tested build.

## Update channels

Each install picks a channel in the update window (click the version number in
the top bar) or in `config.json` under `updates.channel`:

| Channel | Gets | Use for |
|---|---|---|
| `stable` (default) | Published releases, no pre-releases | Production |
| `beta` | Releases and pre-releases (`vX.Y.Z-rc.N`) | Trying a release candidate |
| `dev` | Every commit on the checked-out branch | Development and staging |

Fresh installs check out the newest stable release and use the stable channel.
Installing with `PROXBALANCE_BRANCH=<branch>` checks out that branch and uses the
dev channel instead.

An install on the stable channel that is still following a branch (every
install from before channels existed) is offered "switch to release vX.Y.Z".
After that it only moves between releases.

## How an update runs

The in-app **Update** button and `update.sh` on the Proxmox host both run
`release_updater.py apply`. The API starts it as its own transient systemd
unit, `proxbalance-update`, so it keeps running while it restarts the API. It:

1. Checks free disk space and fetches the release tag.
2. Backs up `proxbalance.db` (SQLite online backup), `config.json` and the
   current web files to `backups/updates/<time>-<version>/`. The newest 3
   backups are kept.
3. Checks out the release tag (or, on the dev channel, moves the branch to the
   latest commit). Local edits to tracked files are stashed, not discarded.
4. Downloads the release's web bundle, verifies it against the release's
   `SHA256SUMS` and installs it, so the container doesn't need Node. If the
   download or the checksum fails, it builds the bundle locally instead.
5. Runs `post_update.sh` (web root, systemd units, timers) and updates Python
   dependencies.
6. Restarts the services and waits up to 90 seconds for `/api/health`.

If any step after the checkout fails, it goes back to the version it started
from, restores the previous web files and restarts. The database backup is not
restored automatically; it stays in the backup folder.

Progress is written to `update_status.json` and shown live in the update
window. From the container: `venv/bin/python3 release_updater.py status`, and
`journalctl -u proxbalance-update` for the full log.

## Cutting a release

1. Make sure `main` holds what you want to release and CI is green on it.
2. Write the release notes to `docs/releases/vX.Y.Z.md`, commit and push to
   `main`. (Without a notes file, GitHub generates notes from the commits.)
3. Create an annotated tag whose message is the release title, and push it:

   ```bash
   git tag -a v2.16.0 -m "v2.16.0 — Release-based updates"
   git push origin v2.16.0
   ```

4. The **Release** workflow (`.github/workflows/release.yml`) then:
   - runs the full CI workflow on the tagged commit,
   - refuses a stable tag that isn't on `main`,
   - builds the web bundle with the pinned esbuild and Tailwind versions,
   - packages `proxbalance-web-vX.Y.Z.tar.gz` and `SHA256SUMS`,
   - publishes the GitHub release with those files and the notes.

   If any check fails, no release is published and no install is offered the
   tag. Fix the problem, delete the tag (`git push --delete origin vX.Y.Z`,
   `git tag -d vX.Y.Z`) and tag again.

5. Watch it with `gh run watch` or on the repository's Actions tab.

### Pre-releases

Tag `vX.Y.Z-rc.N` (or `-beta.N`) from any branch. The workflow publishes it as a
pre-release, which only installs on the beta channel see. Use this to try a
release on a staging install before tagging the final version from `main`.

### Releases published before the pipeline

Run the Release workflow by hand (Actions → Release → Run workflow) with the
existing tag. It runs the tests, builds the bundle and attaches it to the
existing release without changing its notes.

## CI

`.github/workflows/ci.yml` runs on every push and pull request:

- flake8 for syntax errors and undefined names,
- `pytest tests/` (including the script-style scoring checks),
- `bash -n` on the shell scripts,
- the web bundle build with pinned esbuild and Tailwind versions,
- the JavaScript schedule tests.
