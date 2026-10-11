#!/usr/bin/env python3
"""
Release-based updater for ProxBalance.

Installs move between published GitHub releases instead of following a
branch. A release only exists once the release pipeline
(.github/workflows/release.yml) has run the test suite and built the web
bundle, so "update available" always means "a tested build is available".

The module has two halves:

* Pure helpers used by the API to answer "is there an update?": version
  parsing and comparison, choosing the newest release for a channel, and a
  small file cache in front of the GitHub releases API.

* An update runner, started as ``release_updater.py apply ...``. The API
  launches it as its own transient systemd unit (``proxbalance-update``), so
  it keeps running while it restarts the API it was started from. It backs
  up the database, config and current web files, checks out the release,
  installs the prebuilt web bundle (verified against the release's
  SHA256SUMS) or builds it locally if the download fails, updates Python
  dependencies, restarts the services and waits for the API to report
  healthy. If any step after the checkout fails, it rolls back to the
  version it started from and restores the previous web files. Progress is
  written to ``update_status.json`` for the UI to poll.

Channels:
    stable  Published releases, excluding pre-releases (default).
    beta    Published releases, including pre-releases.
    dev     Follow the checked-out branch (for development and staging).
"""

import argparse
import hashlib
import json
import os
import re
import shutil
import sqlite3
import subprocess
import sys
import tarfile
import tempfile
import time
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from urllib.error import URLError
from urllib.request import Request, urlopen

REPO_DIR = os.environ.get(
    'PROXBALANCE_DIR', os.path.dirname(os.path.abspath(__file__)))
WEBROOT = os.environ.get('PROXBALANCE_WEBROOT', '/var/www/html')

CHANNELS = ('stable', 'beta', 'dev')
DEFAULT_CHANNEL = 'stable'
DEFAULT_REPO_SLUG = 'Pr0zak/ProxBalance'

WEB_ASSET_TEMPLATE = 'proxbalance-web-{tag}.tar.gz'
CHECKSUMS_ASSET = 'SHA256SUMS'

STATUS_FILE = 'update_status.json'
RELEASE_CACHE_FILE = '.release_cache.json'
BACKUP_SUBDIR = os.path.join('backups', 'updates')
BACKUPS_KEPT = 3

RELEASE_CACHE_TTL = 1800          # seconds; GitHub allows 60 unauthenticated calls/hour
GITHUB_TIMEOUT = 10               # seconds per API call
DOWNLOAD_TIMEOUT = 60             # seconds for the web bundle
HEALTH_URL = 'http://127.0.0.1:5000/api/health'
HEALTH_WAIT = 90                  # seconds to wait for the API after a restart
MIN_FREE_BYTES = 200 * 1024 * 1024

UPDATE_UNIT = 'proxbalance-update'
SYSTEMCTL = '/usr/bin/systemctl'
SYSTEMD_RUN = '/usr/bin/systemd-run'
GIT = '/usr/bin/git'

# Web files that are backed up before an update and restored on rollback.
WEB_FILES = (
    'index.html',
    'manifest.json',
    'sw.js',
    'assets/js/app.js',
    'assets/css/tailwind.css',
)
# Built files shipped in the release's web bundle.
BUNDLE_FILES = ('assets/js/app.js', 'assets/css/tailwind.css')

_SEMVER_RE = re.compile(r'^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?$')
_TAG_RE = re.compile(r'^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$')
_BRANCH_RE = re.compile(r'^[a-zA-Z0-9._/\-]+$')


# ----------------------------------------------------------------------
# Versions and release selection (pure)
# ----------------------------------------------------------------------

def parse_version(tag: Optional[str]) -> Optional[Tuple]:
    """Parse a release tag such as ``v2.15.0`` or ``v2.16.0-rc.1``.

    Args:
        tag: The tag name, with or without a leading ``v``.

    Returns:
        A sortable key, or None if the tag is not a semantic version. A final
        release sorts above its own pre-releases (``v2.16.0`` > ``v2.16.0-rc.2``),
        and numeric pre-release parts compare as numbers (``rc.10`` > ``rc.9``).
    """
    if not tag:
        return None
    match = _SEMVER_RE.match(tag.strip())
    if not match:
        return None
    major, minor, patch, pre = match.groups()
    if pre is None:
        pre_key: Tuple = (1,)
    else:
        parts = []
        for part in pre.split('.'):
            parts.append((0, int(part), '') if part.isdigit() else (1, 0, part))
        pre_key = (0, tuple(parts))
    return (int(major), int(minor), int(patch), pre_key)


def is_prerelease_tag(tag: str) -> bool:
    """Return True for tags with a pre-release suffix (``v2.16.0-rc.1``)."""
    match = _SEMVER_RE.match(tag or '')
    return bool(match and match.group(4))


def is_newer(candidate: Optional[str], current: Optional[str]) -> bool:
    """Return True if ``candidate`` is a strictly newer version than ``current``.

    An unparseable ``current`` (e.g. a branch build) counts as older than any
    valid candidate; an unparseable candidate is never newer.
    """
    cand = parse_version(candidate)
    if cand is None:
        return False
    cur = parse_version(current)
    if cur is None:
        return True
    return cand > cur


def select_latest_release(releases: List[Dict[str, Any]],
                          channel: str) -> Optional[Dict[str, Any]]:
    """Pick the newest installable release for a channel.

    Drafts and tags that aren't semantic versions are ignored. The stable
    channel also ignores pre-releases, whether GitHub marks them as such or
    the tag carries a suffix.

    Args:
        releases: Release objects as returned by the GitHub releases API.
        channel: ``stable`` or ``beta``.

    Returns:
        The newest matching release object, or None.
    """
    best = None
    best_key = None
    for rel in releases or []:
        if rel.get('draft'):
            continue
        tag = rel.get('tag_name') or ''
        key = parse_version(tag)
        if key is None:
            continue
        if channel == 'stable' and (rel.get('prerelease') or is_prerelease_tag(tag)):
            continue
        if best_key is None or key > best_key:
            best, best_key = rel, key
    return best


def summarize_release(rel: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
    """Reduce a GitHub release object to what the UI and the runner need."""
    if not rel:
        return None
    tag = rel.get('tag_name')
    assets = {a.get('name'): a.get('browser_download_url') for a in rel.get('assets') or []}
    web_name = WEB_ASSET_TEMPLATE.format(tag=tag)
    return {
        'tag': tag,
        'name': rel.get('name') or tag,
        'url': rel.get('html_url'),
        'published_at': rel.get('published_at'),
        'prerelease': bool(rel.get('prerelease')),
        'notes': (rel.get('body') or '')[:20000],
        'web_asset_url': assets.get(web_name),
        'checksums_url': assets.get(CHECKSUMS_ASSET),
        'prebuilt': web_name in assets and CHECKSUMS_ASSET in assets,
    }


def normalize_channel(value: Any) -> str:
    """Return a valid channel name, falling back to the default."""
    return value if value in CHANNELS else DEFAULT_CHANNEL


def parse_checksums(text: str) -> Dict[str, str]:
    """Parse ``sha256sum`` output into ``{filename: hexdigest}``."""
    sums = {}
    for line in (text or '').splitlines():
        parts = line.strip().split()
        if len(parts) == 2 and re.fullmatch(r'[0-9a-fA-F]{64}', parts[0]):
            sums[parts[1].lstrip('*')] = parts[0].lower()
    return sums


# ----------------------------------------------------------------------
# GitHub releases API with a file cache
# ----------------------------------------------------------------------

def repo_slug(repo_dir: str = REPO_DIR) -> str:
    """Return ``owner/name`` of the origin remote, so forks check their own releases."""
    try:
        url = subprocess.run(
            [GIT, '-C', repo_dir, 'remote', 'get-url', 'origin'],
            capture_output=True, text=True, timeout=5,
        ).stdout.strip()
    except Exception:
        return DEFAULT_REPO_SLUG
    match = re.search(r'github\.com[:/]([^/]+)/([^/]+?)(?:\.git)?/?$', url)
    return f'{match.group(1)}/{match.group(2)}' if match else DEFAULT_REPO_SLUG


def _http_get(url: str, timeout: int, accept: str = 'application/vnd.github+json') -> bytes:
    req = Request(url, headers={'Accept': accept, 'User-Agent': 'ProxBalance-updater'})
    with urlopen(req, timeout=timeout) as resp:
        return resp.read()


def fetch_releases(slug: str) -> List[Dict[str, Any]]:
    """Fetch the most recent releases (one page) from GitHub."""
    data = _http_get(f'https://api.github.com/repos/{slug}/releases?per_page=30', GITHUB_TIMEOUT)
    releases = json.loads(data.decode('utf-8'))
    if not isinstance(releases, list):
        raise ValueError('Unexpected response from the GitHub releases API')
    return releases


def get_releases(repo_dir: str = REPO_DIR, force: bool = False) -> Dict[str, Any]:
    """Return releases from the cache, refreshing it when stale or forced.

    Returns:
        ``{'releases': [...], 'fetched_at': epoch, 'error': str|None}``. On a
        failed refresh the previous cached list is returned with the error, so
        a GitHub outage doesn't make an available update disappear.
    """
    cache_path = os.path.join(repo_dir, RELEASE_CACHE_FILE)
    cached = {'releases': [], 'fetched_at': 0, 'error': None}
    try:
        with open(cache_path) as f:
            cached.update(json.load(f))
    except (OSError, ValueError):
        pass
    if not force and time.time() - cached.get('fetched_at', 0) < RELEASE_CACHE_TTL:
        return cached
    try:
        releases = fetch_releases(repo_slug(repo_dir))
        cached = {'releases': releases, 'fetched_at': time.time(), 'error': None}
        _write_json(cache_path, cached)
    except (URLError, OSError, ValueError) as e:
        cached['error'] = f'Could not reach GitHub: {e}'
    return cached


# ----------------------------------------------------------------------
# Status file
# ----------------------------------------------------------------------

def _write_json(path: str, data: Dict[str, Any]) -> None:
    tmp = f'{path}.tmp'
    with open(tmp, 'w') as f:
        json.dump(data, f, indent=2)
    os.replace(tmp, path)


def _now() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def read_status(repo_dir: str = REPO_DIR) -> Dict[str, Any]:
    """Return the last update run's status, or ``{'state': 'idle'}``."""
    try:
        with open(os.path.join(repo_dir, STATUS_FILE)) as f:
            status = json.load(f)
    except (OSError, ValueError):
        return {'state': 'idle'}
    if status.get('state') == 'running' and not _runner_alive(status):
        status['state'] = 'failed'
        status['error'] = 'The update process stopped without finishing. Check: journalctl -u proxbalance-update'
    return status


def _runner_alive(status: Dict[str, Any]) -> bool:
    pid = status.get('pid')
    if not pid:
        return False
    try:
        os.kill(int(pid), 0)
        return True
    except (OSError, ValueError):
        return False


class StatusWriter:
    """Records the runner's progress in ``update_status.json``."""

    def __init__(self, repo_dir: str, target: str, source: str) -> None:
        self.path = os.path.join(repo_dir, STATUS_FILE)
        self.data: Dict[str, Any] = {
            'state': 'running', 'pid': os.getpid(), 'target': target,
            'from': source, 'started_at': _now(), 'finished_at': None,
            'steps': [], 'error': None, 'backup': None,
        }
        self._save()

    def _save(self) -> None:
        _write_json(self.path, self.data)

    def step(self, name: str, ok: bool = True, detail: str = '') -> None:
        """Append a finished step and print it to the unit's journal."""
        self.data['steps'].append({'name': name, 'ok': ok, 'detail': detail, 'at': _now()})
        print(f"[{'ok' if ok else 'FAIL'}] {name}{': ' + detail if detail else ''}", flush=True)
        self._save()

    def finish(self, state: str, error: Optional[str] = None) -> None:
        self.data.update(state=state, error=error, finished_at=_now(), pid=None)
        self._save()


# ----------------------------------------------------------------------
# Starting the runner from the API
# ----------------------------------------------------------------------

def start_update(target: Dict[str, str], repo_dir: str = REPO_DIR) -> Dict[str, Any]:
    """Launch the update runner in its own transient systemd unit.

    The API restarts itself during an update, which would kill a thread or
    child process started inside it. A transient unit belongs to systemd, so
    it survives that restart and can roll back if the new version fails.

    Args:
        target: ``{'tag': 'v2.16.0'}`` for a release or ``{'branch': 'main'}``
            for the dev channel.

    Returns:
        ``{'success': True}`` or ``{'success': False, 'error': ...}``.
    """
    if read_status(repo_dir).get('state') == 'running':
        return {'success': False, 'error': 'An update is already running'}
    args = [sys.executable, os.path.join(repo_dir, 'release_updater.py'), 'apply']
    if target.get('tag'):
        if not _TAG_RE.match(target['tag']):
            return {'success': False, 'error': f"Invalid release tag: {target['tag']}"}
        args += ['--tag', target['tag']]
    elif target.get('branch'):
        if not _BRANCH_RE.match(target['branch']) or target['branch'].startswith('-'):
            return {'success': False, 'error': f"Invalid branch name: {target['branch']}"}
        args += ['--branch', target['branch']]
    else:
        return {'success': False, 'error': 'No update target given'}

    if os.path.exists(SYSTEMD_RUN):
        cmd = [SYSTEMD_RUN, f'--unit={UPDATE_UNIT}', '--collect', '--quiet',
               f'--description=ProxBalance update to {target.get("tag") or target.get("branch")}',
               f'--working-directory={repo_dir}', '--'] + args
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        if result.returncode != 0:
            return {'success': False, 'error': (result.stderr or result.stdout).strip()
                    or 'systemd-run failed'}
    else:
        # Development machines without systemd: detach from the API process.
        subprocess.Popen(args, cwd=repo_dir, start_new_session=True,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return {'success': True}


# ----------------------------------------------------------------------
# The runner
# ----------------------------------------------------------------------

class UpdateFailed(Exception):
    """A runner step failed; the message is shown to the user."""


class Runner:
    """Performs one update with backup, verification and rollback."""

    def __init__(self, repo_dir: str, tag: Optional[str], branch: Optional[str]) -> None:
        self.repo = repo_dir
        self.tag = tag
        self.branch = branch
        self.prev_branch = self._git('rev-parse', '--abbrev-ref', 'HEAD').strip()
        self.prev_commit = self._git('rev-parse', 'HEAD').strip()
        self.prev_label = self._describe()
        self.status = StatusWriter(repo_dir, tag or f'{branch} (latest)', self.prev_label)
        self.backup_dir: Optional[str] = None
        self.checked_out = False

    # -- helpers -------------------------------------------------------

    def _git(self, *args: str, timeout: int = 60) -> str:
        result = subprocess.run([GIT, '-C', self.repo] + list(args),
                                capture_output=True, text=True, timeout=timeout)
        if result.returncode != 0:
            raise UpdateFailed(f"git {' '.join(args)} failed: {(result.stderr or result.stdout).strip()}")
        return result.stdout

    def _describe(self) -> str:
        try:
            return self._git('describe', '--tags', '--always').strip()
        except UpdateFailed:
            return self.prev_commit[:8]

    def _run(self, cmd: List[str], timeout: int, env: Optional[Dict[str, str]] = None) -> str:
        result = subprocess.run(cmd, cwd=self.repo, capture_output=True, text=True,
                                timeout=timeout, env={**os.environ, **(env or {})})
        output = (result.stdout + result.stderr).strip()
        if result.returncode != 0:
            tail = '\n'.join(output.splitlines()[-15:])
            raise UpdateFailed(f"{os.path.basename(cmd[0])} {' '.join(cmd[1:2])} failed:\n{tail}")
        return output

    # -- steps ---------------------------------------------------------

    def preflight(self) -> None:
        free = shutil.disk_usage(self.repo).free
        if free < MIN_FREE_BYTES:
            raise UpdateFailed(f'Only {free // (1024 * 1024)} MB free; need at least '
                               f'{MIN_FREE_BYTES // (1024 * 1024)} MB')
        self._git('fetch', '--tags', '--force', 'origin', timeout=120)
        if self.tag:
            self._git('rev-parse', '--verify', f'refs/tags/{self.tag}^{{commit}}')
        else:
            self._git('rev-parse', '--verify', f'refs/remotes/origin/{self.branch}')
        self.status.step('Checked disk space and fetched the release', detail=f'{free // (1024 * 1024)} MB free')

    def backup(self) -> None:
        stamp = datetime.now().strftime('%Y%m%d-%H%M%S')
        target = re.sub(r'[^0-9A-Za-z._-]', '_', self.tag or self.branch or 'update')
        self.backup_dir = os.path.join(self.repo, BACKUP_SUBDIR, f'{stamp}-{target}')
        os.makedirs(os.path.join(self.backup_dir, 'web'), exist_ok=True)

        db = os.path.join(self.repo, 'proxbalance.db')
        if os.path.exists(db):
            # The online backup API gives a consistent copy while the
            # collector or API may still be writing (WAL mode).
            src = sqlite3.connect(db)
            dst = sqlite3.connect(os.path.join(self.backup_dir, 'proxbalance.db'))
            with dst:
                src.backup(dst)
            src.close()
            dst.close()
        cfg = os.path.join(self.repo, 'config.json')
        if os.path.exists(cfg):
            shutil.copy2(cfg, os.path.join(self.backup_dir, 'config.json'))
        for rel in WEB_FILES:
            src_path = os.path.join(WEBROOT, rel)
            if os.path.exists(src_path):
                dest = os.path.join(self.backup_dir, 'web', rel)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.copy2(src_path, dest)
        _write_json(os.path.join(self.backup_dir, 'source.json'),
                    {'branch': self.prev_branch, 'commit': self.prev_commit, 'version': self.prev_label})
        self._prune_backups()
        self.status.data['backup'] = self.backup_dir
        self.status.step('Backed up the database, config and web files', detail=self.backup_dir)

    def _prune_backups(self) -> None:
        root = os.path.join(self.repo, BACKUP_SUBDIR)
        entries = sorted(e for e in os.listdir(root) if os.path.isdir(os.path.join(root, e)))
        for old in entries[:-BACKUPS_KEPT]:
            shutil.rmtree(os.path.join(root, old), ignore_errors=True)

    def checkout(self) -> None:
        # Tracked files edited in place on the install would block the
        # checkout; keep them in a stash rather than discarding them.
        if self._git('status', '--porcelain', '--untracked-files=no').strip():
            self._git('stash', 'push', '-m', f'proxbalance-update {_now()}')
            self.status.step('Stashed local changes to tracked files', detail='git stash list')
        self.checked_out = True
        if self.tag:
            self._git('checkout', '--detach', f'refs/tags/{self.tag}')
            self.status.step(f'Checked out {self.tag}')
        else:
            self._git('checkout', self.branch)
            self._git('reset', '--hard', f'origin/{self.branch}')
            self.status.step(f'Moved {self.branch} to the latest commit',
                             detail=self._git('rev-parse', '--short', 'HEAD').strip())

    def install_web(self, release: Optional[Dict[str, Any]]) -> None:
        prebuilt = False
        if release and release.get('prebuilt'):
            try:
                self._install_bundle(release)
                prebuilt = True
                self.status.step('Installed the tested web bundle from the release',
                                 detail='checksum verified')
            except (UpdateFailed, URLError, OSError, tarfile.TarError) as e:
                self.status.step('Could not use the release web bundle; building locally',
                                 ok=True, detail=str(e))
        env = {'PROXBALANCE_PREBUILT': '1'} if prebuilt else {}
        self._run(['/bin/bash', os.path.join(self.repo, 'post_update.sh')], timeout=600, env=env)
        self.status.step('Deployed the web interface and service files')

    def _install_bundle(self, release: Dict[str, Any]) -> None:
        name = WEB_ASSET_TEMPLATE.format(tag=release['tag'])
        sums = parse_checksums(_http_get(release['checksums_url'], GITHUB_TIMEOUT,
                                         accept='application/octet-stream').decode('utf-8', 'replace'))
        expected = sums.get(name)
        if not expected:
            raise UpdateFailed(f'{name} is not listed in SHA256SUMS')
        data = _http_get(release['web_asset_url'], DOWNLOAD_TIMEOUT, accept='application/octet-stream')
        actual = hashlib.sha256(data).hexdigest()
        if actual != expected:
            raise UpdateFailed(f'Checksum mismatch for {name}')
        with tempfile.TemporaryDirectory() as tmp:
            archive = os.path.join(tmp, name)
            with open(archive, 'wb') as f:
                f.write(data)
            with tarfile.open(archive, 'r:gz') as tar:
                members = {m.name: m for m in tar.getmembers()}
                for rel in BUNDLE_FILES:
                    member = members.get(rel)
                    if member is None or not member.isfile():
                        raise UpdateFailed(f'{rel} missing from {name}')
                    src = tar.extractfile(member)
                    dest = os.path.join(self.repo, rel)
                    os.makedirs(os.path.dirname(dest), exist_ok=True)
                    with open(dest, 'wb') as out:
                        shutil.copyfileobj(src, out)

    def install_python_deps(self) -> None:
        pip = os.path.join(self.repo, 'venv', 'bin', 'pip')
        if not os.path.exists(pip):
            pip = '/usr/bin/pip3'
        self._run([pip, 'install', '-q', '--disable-pip-version-check', '-r',
                   os.path.join(self.repo, 'requirements.txt')], timeout=300)
        self.status.step('Updated Python dependencies')

    def restart_and_verify(self) -> None:
        for timer in ('proxmox-collector.timer', 'proxmox-balance-automigrate.timer',
                      'proxmox-balance-recommendations.timer'):
            subprocess.run([SYSTEMCTL, 'restart', timer], capture_output=True, timeout=30)
        subprocess.run([SYSTEMCTL, 'restart', 'proxmox-balance'], capture_output=True, timeout=60)
        if not wait_for_health():
            raise UpdateFailed(f'The API did not report healthy within {HEALTH_WAIT} seconds')
        self.status.step('Restarted services; the API reports healthy')

    def rollback(self) -> bool:
        """Return to the version the run started from. Returns True on success."""
        try:
            self._git('checkout', '--force', self.prev_branch if self.prev_branch != 'HEAD'
                      else self.prev_commit)
            if self.prev_branch != 'HEAD':
                self._git('reset', '--hard', self.prev_commit)
            restored = self._restore_web_into_repo()
            env = {'PROXBALANCE_PREBUILT': '1'} if restored else {}
            self._run(['/bin/bash', os.path.join(self.repo, 'post_update.sh')], timeout=600, env=env)
            pip = os.path.join(self.repo, 'venv', 'bin', 'pip')
            if os.path.exists(pip):
                self._run([pip, 'install', '-q', '--disable-pip-version-check', '-r',
                           os.path.join(self.repo, 'requirements.txt')], timeout=300)
            subprocess.run([SYSTEMCTL, 'restart', 'proxmox-balance'], capture_output=True, timeout=60)
            healthy = wait_for_health()
            self.status.step(f'Rolled back to {self.prev_label}', ok=healthy,
                             detail='API healthy' if healthy else 'API still not healthy')
            return healthy
        except (UpdateFailed, OSError, subprocess.SubprocessError) as e:
            self.status.step('Rollback failed', ok=False, detail=str(e))
            return False

    def _restore_web_into_repo(self) -> bool:
        """Copy the backed-up built files into the repo so no rebuild is needed."""
        if not self.backup_dir:
            return False
        copied = 0
        for rel in BUNDLE_FILES:
            src = os.path.join(self.backup_dir, 'web', rel)
            if os.path.exists(src):
                shutil.copy2(src, os.path.join(self.repo, rel))
                copied += 1
        return copied == len(BUNDLE_FILES)

    # -- orchestration -------------------------------------------------

    def run(self, release: Optional[Dict[str, Any]]) -> int:
        try:
            self.preflight()
            self.backup()
            self.checkout()
            self.install_web(release)
            self.install_python_deps()
            self.restart_and_verify()
        except (UpdateFailed, OSError, subprocess.SubprocessError, sqlite3.Error) as e:
            message = str(e)
            self.status.step('Update failed', ok=False, detail=message)
            if self.checked_out:
                rolled_back = self.rollback()
                self.status.finish('rolled_back' if rolled_back else 'failed', message)
            else:
                self.status.finish('failed', message)
            return 1
        self.status.finish('succeeded')
        return 0


def wait_for_health(timeout: int = HEALTH_WAIT) -> bool:
    """Poll the API's health endpoint until it answers healthy or time runs out."""
    deadline = time.time() + timeout
    time.sleep(3)
    while time.time() < deadline:
        try:
            with urlopen(HEALTH_URL, timeout=5) as resp:
                if resp.status == 200 and json.loads(resp.read().decode()).get('status') == 'healthy':
                    return True
        except (URLError, OSError, ValueError):
            pass
        time.sleep(3)
    return False


def _release_for_tag(tag: str, repo_dir: str) -> Optional[Dict[str, Any]]:
    """Find the summarized release for a tag, refreshing the cache if needed."""
    for force in (False, True):
        data = get_releases(repo_dir, force=force)
        for rel in data.get('releases', []):
            if rel.get('tag_name') == tag and not rel.get('draft'):
                return summarize_release(rel)
    return None


def main(argv: Optional[List[str]] = None) -> int:
    parser = argparse.ArgumentParser(description='ProxBalance release updater')
    sub = parser.add_subparsers(dest='command', required=True)

    check = sub.add_parser('check', help='Show the newest release for a channel')
    check.add_argument('--channel', default=DEFAULT_CHANNEL, choices=('stable', 'beta'))
    check.add_argument('--force', action='store_true', help='Bypass the release cache')

    apply = sub.add_parser('apply', help='Update to a release or the latest branch commit')
    group = apply.add_mutually_exclusive_group(required=True)
    group.add_argument('--tag', help='Release tag, e.g. v2.16.0')
    group.add_argument('--latest', choices=('stable', 'beta'), help='Newest release on a channel')
    group.add_argument('--branch', help='Branch to follow (dev channel)')

    sub.add_parser('status', help='Print the last update run')

    args = parser.parse_args(argv)

    if args.command == 'status':
        print(json.dumps(read_status(REPO_DIR), indent=2))
        return 0

    if args.command == 'check':
        data = get_releases(REPO_DIR, force=args.force)
        latest = summarize_release(select_latest_release(data.get('releases', []), args.channel))
        print(json.dumps({'latest': latest, 'error': data.get('error')}, indent=2))
        return 0

    tag, release = args.tag, None
    if args.latest:
        data = get_releases(REPO_DIR, force=True)
        release = summarize_release(select_latest_release(data.get('releases', []), args.latest))
        if not release:
            print(f"No {args.latest} release found. {data.get('error') or ''}".strip(), file=sys.stderr)
            return 1
        tag = release['tag']
    elif tag:
        if not _TAG_RE.match(tag):
            print(f'Invalid release tag: {tag}', file=sys.stderr)
            return 2
        release = _release_for_tag(tag, REPO_DIR)
    elif not _BRANCH_RE.match(args.branch) or args.branch.startswith('-'):
        print(f'Invalid branch name: {args.branch}', file=sys.stderr)
        return 2

    runner = Runner(REPO_DIR, tag, args.branch)
    return runner.run(release)


if __name__ == '__main__':
    sys.exit(main())
