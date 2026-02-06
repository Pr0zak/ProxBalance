#!/usr/bin/env python3
"""
Update Manager for ProxBalance

Handles version detection, update checking, system updates, branch switching,
and service management. Extracted from app.py for maintainability.
"""

import os
import re
import subprocess
import shutil
import threading
import time
from typing import Dict, List, Optional, Tuple


# Valid branch name pattern: alphanumeric, hyphens, underscores, slashes, dots
_BRANCH_NAME_RE = re.compile(r'^[a-zA-Z0-9._/\-]+$')

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

    def current_commit_short(self) -> str:
        result = self._run(['rev-parse', '--short', 'HEAD'], timeout=5)
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
        result = self._run(['rev-parse', tag], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else None

    def is_on_release(self, commit: str, tag: Optional[str]) -> bool:
        if not tag:
            return False
        tag_hash = self.tag_commit(tag)
        return tag_hash == commit

    def tags_sorted(self) -> List[str]:
        result = self._run(['tag', '-l', '--sort=-v:refname'], timeout=5)
        if result.returncode != 0:
            return []
        return [t.strip() for t in result.stdout.strip().split('\n') if t.strip()]

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

    def remote_branches(self) -> List[str]:
        """Return list of remote branch names (without origin/ prefix)."""
        result = self._run(['branch', '-r', '--format=%(refname:short)'], timeout=5)
        if result.returncode != 0:
            return []
        branches = []
        for line in result.stdout.strip().split('\n'):
            if line and not line.endswith('/HEAD'):
                branches.append(line.replace('origin/', '', 1))
        return branches

    def branch_last_commit_message(self, branch: str) -> str:
        result = self._run(['log', '-1', '--format=%s', f'origin/{branch}'], timeout=5)
        return result.stdout.strip() if result.returncode == 0 else ''

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

    def stash(self, include_untracked: bool = True) -> bool:
        """Stash local changes. Returns True if changes were stashed."""
        args = ['stash']
        if include_untracked:
            args.append('--include-untracked')
        result = self._run(args, timeout=10)
        if result.returncode != 0:
            return False
        return 'No local changes to save' not in result.stdout

    def checkout(self, ref: str) -> None:
        self._run_or_raise(['checkout', ref], timeout=10, error_msg=f'Failed to checkout {ref}')

    def pull_ff_only(self, branch: str) -> subprocess.CompletedProcess:
        """Attempt fast-forward-only pull. Returns the result (may fail for diverged branches)."""
        return self._run(['pull', '--ff-only', 'origin', branch], timeout=30)

    def pull(self, branch: str) -> None:
        self._run_or_raise(['pull', 'origin', branch], timeout=30, error_msg='Git pull failed')

    def reset_hard(self, ref: str) -> None:
        self._run_or_raise(['reset', '--hard', ref], timeout=10, error_msg='Git reset failed')


def validate_branch_name(name: str) -> bool:
    """Validate a branch name against safe patterns and known remote branches."""
    if not name or len(name) > 200:
        return False
    if not _BRANCH_NAME_RE.match(name):
        return False
    # Block shell meta-characters and path traversal
    if '..' in name or name.startswith('-'):
        return False
    return True


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
    """Orchestrates version detection, update checking, and system updates."""

    def __init__(self, repo_path: str, git_cmd: str = '/usr/bin/git'):
        self.repo_path = repo_path
        self.git = GitManager(repo_path, git_cmd)
        self.services = ServiceManager()

    # ------------------------------------------------------------------
    # Pip path resolution
    # ------------------------------------------------------------------

    @property
    def _pip_cmd(self) -> str:
        """Resolve the correct pip command based on environment."""
        venv_pip = os.path.join(self.repo_path, 'venv', 'bin', 'pip')
        if os.path.exists(venv_pip):
            return venv_pip
        return '/usr/bin/pip3'

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

    def check_for_updates(self) -> Dict:
        """Check if updates are available based on release/branch status."""
        try:
            version_info = self.get_version_info()

            # Fetch latest from remote
            try:
                self.git.fetch()
            except GitError:
                pass  # Non-fatal: we can still compare with whatever we have

            if version_info['on_release']:
                return self._check_release_update(version_info)
            else:
                return self._check_branch_update(version_info)
        except Exception as e:
            print(f'Error checking for updates: {e}')
            return {'error': str(e), 'update_available': False}

    def _check_release_update(self, version_info: Dict) -> Dict:
        tags = self.git.tags_sorted()
        if tags and version_info['latest_tag']:
            newest_tag = tags[0]
            return {
                'update_available': newest_tag != version_info['latest_tag'],
                'current_version': version_info['latest_tag'],
                'latest_version': newest_tag,
                'update_type': 'release',
                'branch': None,
            }
        return self._no_update_response(version_info)

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

    def perform_update(self) -> Dict:
        """Update ProxBalance to latest version (release or branch commit)."""
        log: List[str] = []
        try:
            version_info = self.get_version_info()

            # Fetch latest
            log.append('Fetching latest changes from GitHub...')
            self.git.fetch()

            if version_info['on_release']:
                self._update_release(version_info, log)
            else:
                self._update_branch(version_info, log)

            # Common post-update steps
            log.append('Code updated successfully')
            self._run_build(log)
            self._update_dependencies(log)
            self._restart_services(log)

            new_commit = self.git.current_commit_short()
            log.append(f'Update complete! Now at commit: {new_commit}')

            return {
                'success': True,
                'message': 'Update completed successfully',
                'log': log,
                'updated': True,
                'new_commit': new_commit,
            }
        except Exception as e:
            import traceback
            print(f'Update error: {e}', flush=True)
            traceback.print_exc()
            return {'success': False, 'error': str(e), 'log': log}

    def _update_release(self, version_info: Dict, log: List[str]) -> None:
        log.append('On release version - checking for newer releases...')
        tags = self.git.tags_sorted()
        if not tags:
            log.append('No release tags found')
            return

        newest_tag = tags[0]
        current_tag = version_info['latest_tag']

        if newest_tag == current_tag:
            log.append(f'Already on latest release: {current_tag}')
            return

        log.append(f'Updating from {current_tag} to {newest_tag}...')
        self.git.checkout(newest_tag)
        log.append(f'Checked out release {newest_tag}')

    def _update_branch(self, version_info: Dict, log: List[str]) -> None:
        branch = version_info['branch']
        if not branch or branch == 'HEAD':
            raise Exception('Not on a named branch, cannot update')

        log.append(f"On branch '{branch}' - checking for new commits...")

        commits_to_pull = self.git.commits_behind(branch)
        if commits_to_pull == 0:
            log.append(f'Already up to date on branch {branch}')
            return

        log.append(f'Pulling {commits_to_pull} new commit(s) from branch: {branch}')

        # Stash local changes before pulling
        if self.git.stash(include_untracked=True):
            log.append('Stashed local changes (including build artifacts)')

        # Try fast-forward first
        result = self.git.pull_ff_only(branch)
        if result.returncode != 0:
            stderr = result.stderr or ''
            divergent_markers = [
                'divergent branches',
                'Need to specify how to reconcile',
                'Not possible to fast-forward',
            ]
            if any(marker in stderr for marker in divergent_markers):
                log.append('Detected divergent branches - resetting to remote...')
                self.git.reset_hard(f'origin/{branch}')
                log.append('Reset to match remote branch')
            else:
                raise Exception(f'Git pull failed: {stderr}')

        log.append(f'Updated to latest commit on {branch}')

    # ------------------------------------------------------------------
    # Build
    # ------------------------------------------------------------------

    def _run_build(self, log: List[str]) -> None:
        """Run post_update.sh to build and deploy the web interface."""
        log.append('Building and updating web interface...')

        post_update_script = os.path.join(self.repo_path, 'post_update.sh')
        if not os.path.exists(post_update_script):
            # Fallback: copy index.html directly
            log.append(f'post_update.sh not found at {post_update_script}')
            self._fallback_deploy(log)
            return

        try:
            result = subprocess.run(
                ['/bin/bash', post_update_script],
                cwd=self.repo_path,
                capture_output=True,
                text=True,
                timeout=300,  # 5 minute timeout
            )

            if result.stdout:
                for line in result.stdout.strip().split('\n'):
                    if line.strip():
                        log.append(line)
            if result.stderr:
                for line in result.stderr.strip().split('\n'):
                    if line.strip():
                        log.append(f'[stderr] {line}')

            if result.returncode == 0:
                log.append('Web interface built and updated')
            else:
                log.append(f'Build failed with exit code {result.returncode}')
                log.append('See stderr output above for details')

        except subprocess.TimeoutExpired:
            log.append('Frontend build timed out after 5 minutes')
        except Exception as e:
            import traceback
            log.append(f'Failed to update web interface: {e}')
            for line in traceback.format_exc().split('\n'):
                if line.strip():
                    log.append(f'  {line}')

    def _fallback_deploy(self, log: List[str]) -> None:
        """Deploy web files without the build script."""
        src = os.path.join(self.repo_path, 'index.html')
        dst = '/var/www/html/index.html'
        if os.path.exists(src):
            shutil.copy2(src, dst)
            log.append('Web interface updated (legacy mode)')
        else:
            log.append('index.html not found - skipping web deploy')

    # ------------------------------------------------------------------
    # Dependencies
    # ------------------------------------------------------------------

    def _update_dependencies(self, log: List[str]) -> None:
        """Install/upgrade Python dependencies."""
        log.append('Updating Python dependencies...')
        pip = self._pip_cmd
        requirements = os.path.join(self.repo_path, 'requirements.txt')

        if os.path.exists(requirements):
            cmd = [pip, 'install', '-q', '--upgrade', '-r', requirements]
        else:
            cmd = [pip, 'install', '-q', '--upgrade',
                   'flask', 'flask-cors', 'gunicorn', 'requests', 'proxmoxer']

        try:
            result = subprocess.run(cmd, cwd=self.repo_path, capture_output=True, text=True, timeout=120)
            if result.returncode == 0:
                log.append('Dependencies updated')
            else:
                log.append(f'Dependency update had issues: {result.stderr}')
        except subprocess.TimeoutExpired:
            log.append('Dependency install timed out')
        except Exception as e:
            log.append(f'Dependency update failed: {e}')

    # ------------------------------------------------------------------
    # Service restarts
    # ------------------------------------------------------------------

    def _restart_services(self, log: List[str]) -> None:
        """Restart collector timer and schedule API restart."""
        log.append('Restarting ProxBalance services...')

        # Restart collector timer
        ok, msg = self.services.restart('proxmox-collector.timer', timeout=15)
        log.append(f'{"" if ok else ""} {msg}')

        # Defer API service restart so the response can be sent first
        log.append('API service will restart automatically in 2 seconds...')
        try:
            self.services.restart_deferred('proxmox-balance', delay=2.0)
        except Exception as e:
            log.append(f'Failed to schedule API restart: {e}')
            log.append('Please manually restart: systemctl restart proxmox-balance')

    # ------------------------------------------------------------------
    # Branch switching
    # ------------------------------------------------------------------

    def list_branches(self) -> Dict:
        """List all available git branches."""
        try:
            self.git.fetch(tags=False, prune=True)
        except GitError:
            pass  # Non-fatal

        current = self.git.current_branch()
        remote_names = self.git.remote_branches()

        branches = []
        for name in remote_names:
            branches.append({
                'name': name,
                'current': name == current,
                'last_commit': self.git.branch_last_commit_message(name),
            })

        return {'success': True, 'branches': branches}

    def switch_branch(self, target_branch: str) -> Dict:
        """Switch to a different git branch with full build pipeline."""
        log: List[str] = []

        try:
            # Validate branch name
            if not target_branch:
                return {'success': False, 'error': 'Branch name is required', 'log': log}

            if not validate_branch_name(target_branch):
                return {'success': False, 'error': 'Invalid branch name', 'log': log}

            current = self.git.current_branch()
            if current == target_branch:
                return {'success': False, 'error': f'Already on branch {target_branch}', 'log': log}

            # Verify target exists on remote
            try:
                self.git.fetch(tags=False)
            except GitError as e:
                raise Exception(f'Failed to fetch: {e}')

            remote_branches = self.git.remote_branches()
            if target_branch not in remote_branches:
                return {
                    'success': False,
                    'error': f'Branch "{target_branch}" not found on remote',
                    'log': log,
                }

            log.append(f'Switching from {current} to {target_branch}...')

            # Stash local changes
            if self.git.stash():
                log.append('Stashed local changes')

            # Checkout and pull
            log.append(f'Checking out branch {target_branch}...')
            self.git.checkout(target_branch)

            log.append(f'Pulling latest changes for {target_branch}...')
            self.git.pull(target_branch)

            log.append(f'Switched to branch {target_branch}')

            # Run the full build pipeline (same as update)
            self._run_build(log)
            self._update_dependencies(log)

            # Restart services
            log.append('Restarting ProxBalance services...')

            ok, msg = self.services.restart('proxmox-collector.timer', timeout=15)
            log.append(f'{"" if ok else ""} {msg}')

            # Defer API restart
            self.services.restart_deferred('proxmox-balance', delay=2.0)
            log.append('API service will restart automatically in 2 seconds...')

            log.append(f'Branch switch complete! Now on {target_branch}')

            return {
                'success': True,
                'message': f'Successfully switched to branch {target_branch}',
                'log': log,
                'new_branch': target_branch,
            }

        except Exception as e:
            import traceback
            print(f'Branch switch error: {e}', flush=True)
            traceback.print_exc()
            return {'success': False, 'error': str(e), 'log': log}

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
