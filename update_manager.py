#!/usr/bin/env python3
"""
Update Manager for ProxBalance

Version detection, update checks per channel (stable, beta, dev) and
service restarts. Updates are performed by release_updater.py.
"""

import json
import os
import subprocess
import threading
import time
from typing import Dict, List, Optional, Tuple

import release_updater


# Services that ProxBalance manages
VALID_SERVICES = frozenset(['proxmox-balance', 'proxmox-collector'])

SYSTEMCTL_CMD = '/usr/bin/systemctl'


class GitError(Exception):
    """Raised when a git operation fails."""


class GitManager:
    """Encapsulates all git operations with consistent error handling."""

    def __init__(self, repo_path: str, git_cmd: str = '/usr/bin/git'):
        self.repo_path = repo_path
        self.git_cmd = git_cmd

    def _run(self, args: List[str], timeout: int = 10) -> subprocess.CompletedProcess:
        """Run a git command and return the result."""
        return subprocess.run(
            [self.git_cmd] + args,
            cwd=self.repo_path,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

    def _run_or_raise(self, args: List[str], timeout: int = 10, error_msg: str = '') -> subprocess.CompletedProcess:
        """Run a git command; raise GitError on failure."""
        result = self._run(args, timeout=timeout)
        if result.returncode != 0:
            detail = result.stderr.strip() or result.stdout.strip()
            raise GitError(f"{error_msg}: {detail}" if error_msg else detail)
        return result

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    def current_commit(self) -> str:
        result = self._run(['rev-parse', 'HEAD'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else 'unknown'

    def current_branch(self) -> str:
        result = self._run(['rev-parse', '--abbrev-ref', 'HEAD'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else 'unknown'

    def latest_tag(self) -> Optional[str]:
        result = self._run(['describe', '--tags', '--abbrev=0'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else None

    def describe(self) -> str:
        result = self._run(['describe', '--tags', '--always'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else 'unknown'

    def last_commit_date(self) -> str:
        result = self._run(['log', '-1', '--format=%cd', '--date=short'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else 'unknown'

    def tag_commit(self, tag: str) -> Optional[str]:
        # ^{commit} dereferences annotated tags (which are objects in their own
        # right) to the underlying commit. Lightweight tags resolve the same
        # way, so this is safe for either form. Without ^{commit}, annotated
        # tags resolve to the tag-object hash, never matching HEAD's commit.
        result = self._run(['rev-parse', f'{tag}^{{commit}}'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else None

    def is_on_release(self, commit: str, tag: Optional[str]) -> bool:
        if not tag:
            return False
        tag_hash = self.tag_commit(tag)
        return tag_hash == commit

    def remote_commit(self, branch: str) -> Optional[str]:
        result = self._run(['rev-parse', f'origin/{branch}'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else None

    def commits_behind(self, branch: str) -> int:
        result = self._run(['rev-list', '--count', f'HEAD..origin/{branch}'], timeout=5)
        if result.returncode == 0:
            try:
                return int(result.stdout.strip())
            except ValueError:
                pass
        return 0

    def changelog(self, branch: str) -> List[Dict[str, str]]:
        result = self._run(
            ['log', '--oneline', '--no-decorate', f'HEAD..origin/{branch}'],
            timeout=5,
        )
        entries: List[Dict[str, str]] = []
        if result.returncode != 0:
            return entries
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
            parts = line.split(' ', 1)
            if len(parts) == 2:
                entries.append({'commit': parts[0], 'message': parts[1]})
        return entries

    # ------------------------------------------------------------------
    # Mutations
    # ------------------------------------------------------------------

    def fetch(self, tags: bool = True, prune: bool = False) -> None:
        args = ['fetch']
        if tags:
            args.append('--tags')
        if prune:
            args.append('--prune')
        args.append('origin')
        self._run_or_raise(args, timeout=30, error_msg='Git fetch failed')



class ServiceManager:
    """Manages systemd service restarts for ProxBalance."""

    @staticmethod
    def restart(service: str, timeout: int = 15) -> Tuple[bool, str]:
        """Restart a service. Returns (success, message)."""
        try:
            result = subprocess.run(
                [SYSTEMCTL_CMD, 'restart', f'{service}.service' if '.' not in service else service],
                capture_output=True, text=True, timeout=timeout,
            )
            if result.returncode == 0:
                return True, f'Restarted {service}'
            error = result.stderr.strip() or 'unknown error'
            return False, f'Failed to restart {service}: {error}'
        except subprocess.TimeoutExpired:
            return False, f'{service} restart timed out after {timeout}s'

    @staticmethod
    def restart_deferred(service: str, delay: float = 2.0) -> None:
        """Schedule a service restart in a background thread (for self-restart)."""
        def _do_restart():
            time.sleep(delay)
            subprocess.Popen(
                [SYSTEMCTL_CMD, 'restart', service],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
            )
        thread = threading.Thread(target=_do_restart, daemon=True)
        thread.start()

    @staticmethod
    def is_active(service: str) -> bool:
        try:
            result = subprocess.run(
                [SYSTEMCTL_CMD, 'is-active', f'{service}.service'],
                capture_output=True, text=True, timeout=5,
            )
            return result.stdout.strip() == 'active'
        except Exception:
            return False


class UpdateManager:
    """Version detection, update checks per channel, and service restarts.

    Updates themselves run in release_updater's runner, outside the API
    process, so they survive the API restart and can roll back.
    """

    def __init__(self, repo_path: str, git_cmd: str = '/usr/bin/git'):
        self.repo_path = repo_path
        self.git = GitManager(repo_path, git_cmd)
        self.services = ServiceManager()

    # ------------------------------------------------------------------
    # Version info
    # ------------------------------------------------------------------

    def get_version_info(self) -> Dict:
        """Get current version and branch information."""
        try:
            commit = self.git.current_commit()
            branch = self.git.current_branch()
            tag = self.git.latest_tag()
            git_describe = self.git.describe()
            commit_date = self.git.last_commit_date()
            on_release = self.git.is_on_release(commit, tag)

            return {
                'version': git_describe,
                'commit': commit[:8],
                'branch': branch,
                'latest_tag': tag,
                'on_release': on_release,
                'last_commit_date': commit_date,
            }
        except Exception as e:
            print(f'Error getting version info: {e}')
            return {
                'version': 'unknown',
                'commit': 'unknown',
                'branch': 'unknown',
                'latest_tag': None,
                'on_release': False,
            }

    # ------------------------------------------------------------------
    # Update check
    # ------------------------------------------------------------------

    def check_for_updates(self, config: Dict = None, force: bool = False) -> Dict:
        """Check whether an update is available on the configured channel.

        The stable and beta channels compare the install against published
        GitHub releases (cached, see release_updater.get_releases). A release
        only exists once the release pipeline has passed the tests, so these
        channels never offer untested commits. The dev channel follows the
        checked-out branch, as installs did before channels existed.

        Args:
            config: Application config. Supplies ``updates.channel`` and is used
                to send an "update available" notification once per version.
            force: Bypass the release cache (the "Check now" button).
        """
        try:
            channel = release_updater.normalize_channel(
                ((config or {}).get('updates') or {}).get('channel'))
            version_info = self.get_version_info()

            if channel == 'dev':
                try:
                    self.git.fetch()
                except GitError:
                    pass  # Non-fatal: we can still compare with whatever we have
                result = self._check_branch_update(version_info)
            else:
                result = self._check_release_channel(version_info, channel, force)
            result['channel'] = channel

            if result.get('update_available') and config:
                self._notify_update_once(config, result)

            return result
        except Exception as e:
            print(f'Error checking for updates: {e}')
            return {'error': str(e), 'update_available': False}

    def _check_release_channel(self, version_info: Dict, channel: str, force: bool) -> Dict:
        data = release_updater.get_releases(self.repo_path, force=force)
        latest = release_updater.summarize_release(
            release_updater.select_latest_release(data.get('releases', []), channel))
        current = version_info['latest_tag'] if version_info['on_release'] else version_info['version']
        result = {
            'update_available': False,
            'current_version': current,
            'latest_version': latest['tag'] if latest else None,
            'update_type': 'release',
            'branch': version_info['branch'],
            'release': latest,
            'error': data.get('error'),
        }
        if not latest:
            return result
        if version_info['on_release']:
            result['update_available'] = release_updater.is_newer(latest['tag'], version_info['latest_tag'])
        else:
            # Following a branch or a commit between releases: offer the
            # tested release, even when it is older than this commit.
            result['update_available'] = True
            result['update_type'] = 'switch_to_release'
        return result

    def _notify_update_once(self, config: Dict, result: Dict) -> None:
        """Send the update-available notification once per new version.

        The check runs on every dashboard load, so without this every page
        view would send another notification.
        """
        latest = result.get('latest_version') or '?'
        marker = os.path.join(self.repo_path, '.update_notified.json')
        try:
            with open(marker) as f:
                if json.load(f).get('version') == latest:
                    return
        except (OSError, ValueError):
            pass
        try:
            from notifications import send_notification
            send_notification(config, 'update_available', {
                'current_version': result.get('current_version', '?'),
                'latest_version': latest,
                'commits_behind': result.get('commits_behind', 0),
            })
            with open(marker, 'w') as f:
                json.dump({'version': latest}, f)
        except Exception:
            pass  # Non-fatal

    def _check_branch_update(self, version_info: Dict) -> Dict:
        branch = version_info['branch']
        if not branch or branch == 'HEAD':
            return self._no_update_response(version_info)

        local_commit = version_info['commit']
        remote = self.git.remote_commit(branch)
        if not remote:
            return self._no_update_response(version_info)

        remote_short = remote[:8]
        update_available = remote_short != local_commit
        behind = self.git.commits_behind(branch)
        cl = self.git.changelog(branch) if update_available else []

        return {
            'update_available': update_available,
            'current_version': f'{branch}@{local_commit}',
            'latest_version': f'{branch}@{remote_short}',
            'update_type': 'branch',
            'branch': branch,
            'commits_behind': behind,
            'changelog': cl,
        }

    @staticmethod
    def _no_update_response(version_info: Dict) -> Dict:
        return {
            'update_available': False,
            'current_version': version_info['version'],
            'latest_version': version_info['version'],
            'update_type': 'unknown',
            'branch': version_info['branch'],
        }

    # ------------------------------------------------------------------
    # Perform update
    # ------------------------------------------------------------------

    def perform_update(self, config: Dict = None) -> Dict:
        """Start an update to the newest version on the configured channel.

        The work happens in release_updater's runner, in its own systemd unit,
        so it survives the API restart and can roll back. Poll
        ``update_status()`` for progress.
        """
        check = self.check_for_updates(config=config, force=True)
        if check.get('error') and not check.get('latest_version'):
            return {'success': False, 'error': check['error']}
        if not check.get('update_available'):
            return {'success': True, 'started': False, 'message': 'Already up to date'}

        if check.get('channel') == 'dev':
            target = {'branch': check.get('branch')}
        else:
            target = {'tag': check['latest_version']}
        result = release_updater.start_update(target, self.repo_path)
        if result.get('success'):
            result.update(started=True, target=target.get('tag') or target.get('branch'))
        return result

    def update_status(self) -> Dict:
        """Return the progress or result of the last update run."""
        return release_updater.read_status(self.repo_path)

    # ------------------------------------------------------------------
    # Service restart (public API)
    # ------------------------------------------------------------------

    def restart_service(self, service: str) -> Dict:
        """Restart a ProxBalance service by name."""
        if service not in VALID_SERVICES:
            return {
                'success': False,
                'error': f"Invalid service. Must be one of: {', '.join(sorted(VALID_SERVICES))}",
            }

        if service == 'proxmox-balance':
            # Can't restart self synchronously; defer it
            self.services.restart_deferred('proxmox-balance.service', delay=2.0)
            return {
                'success': True,
                'message': 'Service restart initiated. The service will restart in 2 seconds.',
                'status': 'restarting',
            }

        ok, msg = self.services.restart(service, timeout=30)
        if not ok:
            return {'success': False, 'error': msg}

        is_running = self.services.is_active(service)
        return {
            'success': True,
            'message': f'Service {service} restarted successfully',
            'status': 'active' if is_running else 'inactive',
        }
