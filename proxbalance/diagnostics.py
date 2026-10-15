"""
On-demand health checks for the Settings -> Diagnostics view.

``run_diagnostics()`` runs every check in parallel with short timeouts and
returns one result per line::

    {"id": "api_host", "group": "Proxmox", "name": "Proxmox API",
     "status": "pass" | "warn" | "fail" | "skip",
     "fact": "One plain sentence", "details": {...raw values...},
     "duration_ms": 12}

Rules every check follows:

* **Read-only.** Only GET calls to Proxmox, ``systemctl show``/``list-timers``
  and file reads. Nothing here writes a file, starts a unit or sends a
  notification (the update check reads the release cache instead of
  calling ``check_for_updates``, which can refresh it and notify).
* **Independent.** A check that raises becomes a ``fail`` line of its own;
  the others still run. A check that is still running at the deadline is
  reported as ``fail`` ("did not finish").
* **No secrets.** Every string in the output is scrubbed of the configured
  secret values (token secret, passwords, API keys, webhook URLs).

SSH is not checked: ProxBalance talks to Proxmox only through the API.
"""

import json
import os
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor, wait
from datetime import datetime, timezone
from typing import Any, Callable, Dict, Iterable, List, Optional, Tuple

from proxbalance.pve_errors import AUTH, CONNECT_TIMEOUT, NETWORK, READ_TIMEOUT, classify_pve_error

PASS, WARN, FAIL, SKIP = 'pass', 'warn', 'fail', 'skip'

# (connect, read) seconds for diagnostic Proxmox calls. Short on purpose:
# a diagnostic that hangs is the problem it should be reporting.
DIAG_TIMEOUT: Tuple[float, float] = (3, 6)
# Storage listing waits on every storage backend of a node.
DIAG_STORAGE_TIMEOUT: Tuple[float, float] = (3, 9)
# Whole run; checks still running after this are reported as unfinished.
OVERALL_DEADLINE_S = 14
SLOW_API_MS = 1500

# ---------------------------------------------------------------------------
# Privileges ProxBalance needs, derived from the Proxmox calls in the code.
# scope: the ACL path whose propagated grant covers every object the calls
# touch. A grant only on deeper paths (one VM, one pool) counts as partial.
# level: core (monitoring breaks), migrate, optional (one feature).
# ---------------------------------------------------------------------------
REQUIRED_PRIVILEGES: List[Dict[str, Any]] = [
    {'privs': ['Sys.Audit'], 'scope': '/', 'level': 'core',
     'used_for': 'read node status, cluster status, HA and CRS settings, backup coverage and tasks',
     'impact': 'collection and the dashboard can\'t read the cluster'},
    {'privs': ['VM.Audit'], 'scope': '/vms', 'level': 'core',
     'used_for': 'read guest config, status and metrics',
     'impact': 'guests are invisible to scoring and suggestions'},
    {'privs': ['Datastore.Audit'], 'scope': '/storage', 'level': 'core',
     'used_for': 'list each node\'s storages',
     'impact': 'storage checks before a migration can\'t run'},
    {'privs': ['VM.Migrate'], 'scope': '/vms', 'level': 'migrate',
     'used_for': 'migrate guests (manual, evacuation and automation)',
     'impact': 'automation can\'t move guests'},
    {'privs': ['VM.Config.Options'], 'scope': '/vms', 'level': 'optional',
     'used_for': 'edit guest tags from the UI',
     'impact': 'tags can\'t be changed from ProxBalance'},
    {'privs': ['VM.PowerMgmt'], 'scope': '/vms', 'level': 'optional',
     'used_for': 'stop guests during an evacuation when asked to',
     'impact': 'evacuation can\'t stop guests'},
    {'privs': ['Pool.Audit'], 'scope': '/pool', 'level': 'optional',
     'used_for': 'read resource pools',
     'impact': 'pool membership isn\'t shown'},
    {'privs': ['VM.GuestAgent.Audit', 'VM.Monitor'], 'scope': '/vms', 'level': 'optional',
     'used_for': 'read QEMU guest agent info',
     'impact': 'guest agent status isn\'t shown'},
    {'privs': ['Sys.Modify'], 'scope': '/', 'level': 'optional',
     'used_for': 'change Proxmox CRS settings from the dashboard and stop other users\' tasks',
     'impact': 'CRS settings are read-only here'},
]


# ---------------------------------------------------------------------------
# Result helpers
# ---------------------------------------------------------------------------

def _result(cid: str, group: str, name: str, status: str, fact: str,
            details: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    return {'id': cid, 'group': group, 'name': name, 'status': status,
            'fact': fact, 'details': details or {}}


def _error_fact(exc: BaseException) -> str:
    """Plain words for a failed Proxmox call."""
    kind = classify_pve_error(exc)
    return {
        NETWORK: 'can\'t connect (refused or unreachable)',
        CONNECT_TIMEOUT: 'no answer to the connection attempt',
        READ_TIMEOUT: 'connected, but no reply in time',
        AUTH: 'the token was rejected (401/403)',
    }.get(kind, 'the request failed')


def _err_details(exc: BaseException) -> Dict[str, Any]:
    return {'error_kind': classify_pve_error(exc), 'error': str(exc)[:300]}


def _age_s(ts: Optional[str]) -> Optional[float]:
    """Seconds since an ISO-8601 timestamp (naive means UTC)."""
    if not ts:
        return None
    try:
        dt = datetime.fromisoformat(str(ts).replace('Z', '+00:00'))
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return max(0.0, (datetime.now(timezone.utc) - dt).total_seconds())


def _fmt_age(seconds: Optional[float]) -> str:
    if seconds is None:
        return 'unknown'
    if seconds < 90:
        return f'{int(seconds)} s ago'
    if seconds < 5400:
        return f'{int(seconds // 60)} min ago'
    if seconds < 172800:
        return f'{seconds / 3600:.1f} h ago'
    return f'{seconds / 86400:.1f} days ago'


def _fmt_bytes(n: int) -> str:
    size = float(n)
    for unit in ('B', 'KB', 'MB', 'GB'):
        if size < 1024 or unit == 'GB':
            return f'{size:.0f} {unit}' if unit == 'B' else f'{size:.1f} {unit}'
        size /= 1024
    return f'{size:.1f} GB'


def _timed(fn: Callable[[], Any]) -> Tuple[Any, float]:
    t0 = time.monotonic()
    out = fn()
    return out, round((time.monotonic() - t0) * 1000, 1)


# ---------------------------------------------------------------------------
# Secret scrubbing
# ---------------------------------------------------------------------------

def secret_values(config: Dict[str, Any]) -> List[str]:
    """Every configured secret value: the leaves redact_config() replaces."""
    from proxbalance.secret_fields import redact_config, SECRET_PLACEHOLDER

    found: List[str] = []

    def walk(orig: Any, red: Any) -> None:
        if isinstance(orig, dict) and isinstance(red, dict):
            for k, v in orig.items():
                walk(v, red.get(k))
        elif isinstance(orig, str) and orig and red == SECRET_PLACEHOLDER and orig != SECRET_PLACEHOLDER:
            found.append(orig)

    try:
        walk(config, redact_config(config))
    except Exception:
        pass
    # Longest first so a secret containing another is replaced whole.
    return sorted({s for s in found if len(s) >= 4}, key=len, reverse=True)


def scrub(obj: Any, secrets: Iterable[str]) -> Any:
    """Replace secret values in every string of a JSON-like structure."""
    secrets = list(secrets)
    if not secrets:
        return obj
    if isinstance(obj, str):
        for s in secrets:
            if s in obj:
                obj = obj.replace(s, '***')
        return obj
    if isinstance(obj, dict):
        return {scrub(k, secrets): scrub(v, secrets) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [scrub(v, secrets) for v in obj]
    return obj


# ---------------------------------------------------------------------------
# Context: what every check may read
# ---------------------------------------------------------------------------

class DiagContext:
    """Config plus factories, so tests can swap the Proxmox client and files."""

    def __init__(self, config: Dict[str, Any], client_factory: Optional[Callable[..., Any]] = None,
                 services_reader: Optional[Callable[[], Dict[str, Any]]] = None,
                 paths: Optional[Dict[str, str]] = None, update_manager: Any = None) -> None:
        from proxbalance.constants import BASE_PATH, CACHE_FILE, DB_FILE, GIT_REPO_PATH
        self.config = config or {}
        self._client_factory = client_factory or self._default_client
        self._services_reader = services_reader
        self.paths = {'cache': CACHE_FILE, 'db': DB_FILE, 'repo': GIT_REPO_PATH, 'base': BASE_PATH}
        self.paths.update(paths or {})
        self.update_manager = update_manager

    def _default_client(self, timeout: Tuple[float, float] = DIAG_TIMEOUT) -> Any:
        from proxbalance.pve_client import build_proxmox_client
        c = self.config
        token_id, token_secret = c.get('proxmox_api_token_id'), c.get('proxmox_api_token_secret')
        use_password = c.get('proxmox_auth_method') == 'password' or not (token_id and token_secret)
        return build_proxmox_client(
            c.get('proxmox_host', 'localhost'),
            port=c.get('proxmox_port', 8006),
            verify_ssl=c.get('proxmox_verify_ssl', False),
            token_id=None if use_password else token_id,
            token_secret=None if use_password else token_secret,
            username=c.get('proxmox_username') if use_password else None,
            password=c.get('proxmox_password') if use_password else None,
            timeout=timeout,
        )

    def client(self, timeout: Tuple[float, float] = DIAG_TIMEOUT) -> Any:
        return self._client_factory(timeout=timeout)

    def services(self) -> Dict[str, Any]:
        if self._services_reader is None:
            from proxbalance.routes.system import services_snapshot
            self._services_reader = services_snapshot
        return self._services_reader()

    def credentials_configured(self) -> bool:
        c = self.config
        if c.get('proxmox_api_token_id') and c.get('proxmox_api_token_secret'):
            return True
        return bool(c.get('proxmox_username') and c.get('proxmox_password'))


def _no_credentials(cid: str, name: str) -> Dict[str, Any]:
    return _result(cid, 'Proxmox', name, FAIL, 'No Proxmox API token is configured (Settings → Connection)')


def _node_list(px: Any) -> List[Dict[str, Any]]:
    return sorted(px.nodes.get() or [], key=lambda n: str(n.get('node')))


# ---------------------------------------------------------------------------
# Proxmox checks
# ---------------------------------------------------------------------------

def check_api_host(ctx: DiagContext) -> List[Dict[str, Any]]:
    """The configured API host answers, and how fast."""
    host = ctx.config.get('proxmox_host', 'localhost')
    port = ctx.config.get('proxmox_port', 8006)
    name = f'Proxmox API ({host})'
    if not ctx.credentials_configured():
        return [_no_credentials('api_host', name)]
    try:
        version, ms = _timed(lambda: ctx.client().version.get())
    except Exception as e:  # noqa: BLE001 — every failure is a result
        return [_result('api_host', 'Proxmox', name, FAIL,
                        f'{host}:{port} — {_error_fact(e)}', {'host': host, 'port': port, **_err_details(e)})]
    ver = (version or {}).get('version', '?')
    details = {'host': host, 'port': port, 'latency_ms': ms, 'pve_version': ver,
               'release': (version or {}).get('release')}
    if ms > SLOW_API_MS:
        return [_result('api_host', 'Proxmox', name, WARN,
                        f'Reachable but slow: {ms:.0f} ms (Proxmox VE {ver})', details)]
    return [_result('api_host', 'Proxmox', name, PASS, f'Reachable in {ms:.0f} ms (Proxmox VE {ver})', details)]


def check_nodes(ctx: DiagContext) -> List[Dict[str, Any]]:
    """Each cluster node answers through the API (one line per node)."""
    if not ctx.credentials_configured():
        return [_no_credentials('nodes', 'Nodes')]
    try:
        px = ctx.client()
        nodes = _node_list(px)
    except Exception as e:  # noqa: BLE001
        return [_result('nodes', 'Proxmox', 'Nodes', FAIL, f'Can\'t list nodes — {_error_fact(e)}', _err_details(e))]
    if not nodes:
        return [_result('nodes', 'Proxmox', 'Nodes', WARN, 'The API returned no nodes')]

    def probe(n: Dict[str, Any]) -> Dict[str, Any]:
        name = str(n.get('node'))
        cid, label = f'node:{name}', f'Node {name}'
        if n.get('status') != 'online':
            return _result(cid, 'Proxmox', label, FAIL, f'{name} is {n.get("status") or "offline"} in the cluster',
                           {'status': n.get('status')})
        try:
            _, ms = _timed(lambda: px.nodes(name).version.get())
        except Exception as e:  # noqa: BLE001
            return _result(cid, 'Proxmox', label, FAIL, f'{name} is online but its API didn\'t answer — {_error_fact(e)}',
                           _err_details(e))
        d = {'status': 'online', 'latency_ms': ms}
        if ms > SLOW_API_MS:
            return _result(cid, 'Proxmox', label, WARN, f'Answers slowly: {ms:.0f} ms', d)
        return _result(cid, 'Proxmox', label, PASS, f'Online, answers in {ms:.0f} ms', d)

    with ThreadPoolExecutor(max_workers=min(8, len(nodes))) as pool:
        return list(pool.map(probe, nodes))


def check_quorum(ctx: DiagContext) -> List[Dict[str, Any]]:
    """GET /cluster/status: quorate, and which members are offline."""
    if not ctx.credentials_configured():
        return [_no_credentials('quorum', 'Cluster quorum')]
    try:
        status = ctx.client().cluster.status.get() or []
    except Exception as e:  # noqa: BLE001
        return [_result('quorum', 'Proxmox', 'Cluster quorum', FAIL,
                        f'Can\'t read cluster status — {_error_fact(e)}', _err_details(e))]
    cluster = next((s for s in status if s.get('type') == 'cluster'), None)
    members = [s for s in status if s.get('type') == 'node']
    offline = sorted(str(m.get('name')) for m in members if not m.get('online'))
    details = {'cluster': (cluster or {}).get('name'), 'quorate': (cluster or {}).get('quorate'),
               'members': len(members), 'offline': offline,
               'version': (cluster or {}).get('version')}
    if cluster is None:
        return [_result('quorum', 'Proxmox', 'Cluster quorum', PASS,
                        'Single node, not in a cluster — no quorum needed', details)]
    if not cluster.get('quorate'):
        return [_result('quorum', 'Proxmox', 'Cluster quorum', FAIL,
                        'Cluster has lost quorum — Proxmox blocks migrations and config changes', details)]
    if offline:
        return [_result('quorum', 'Proxmox', 'Cluster quorum', WARN,
                        f'Quorate, but {len(offline)} of {len(members)} nodes offline: {", ".join(offline)}', details)]
    return [_result('quorum', 'Proxmox', 'Cluster quorum', PASS,
                    f'Quorate, all {len(members)} nodes online', details)]


def _priv_holdings(perms: Dict[str, Dict[str, Any]], priv: str, scope: str) -> Tuple[bool, List[str]]:
    """(held across the whole scope, deeper paths where it is held)."""
    full = any(priv in (perms.get(p) or {}) for p in ('/', scope))
    partial = sorted(p for p, privs in perms.items()
                     if p not in ('/', scope) and priv in (privs or {}))
    return full, partial


def evaluate_permissions(perms: Dict[str, Dict[str, Any]], automation_live: bool) -> Dict[str, Any]:
    """Compare effective token privileges with REQUIRED_PRIVILEGES.

    Args:
        perms: ``GET /access/permissions`` data: {path: {privilege: propagate}}.
        automation_live: Automation is enabled and not in dry-run.

    Returns:
        A diagnostic result for the permissions line.
    """
    rows, missing_core, missing_migrate, missing_opt, partial_only = [], [], [], [], []
    for req in REQUIRED_PRIVILEGES:
        label = ' or '.join(req['privs'])
        full, partial = False, []
        for priv in req['privs']:
            f, p = _priv_holdings(perms, priv, req['scope'])
            full = full or f
            partial.extend(p)
        state = 'held' if full else ('partial' if partial else 'missing')
        rows.append({'privilege': label, 'scope': req['scope'], 'level': req['level'],
                     'state': state, 'used_for': req['used_for'],
                     **({'only_on': sorted(set(partial))[:10]} if state == 'partial' else {})})
        if state == 'held':
            continue
        if state == 'partial':
            partial_only.append(req)
        if req['level'] == 'core':
            missing_core.append(req)
        elif req['level'] == 'migrate':
            missing_migrate.append(req)
        else:
            missing_opt.append(req)

    details = {'privileges': rows}

    def says(reqs: List[Dict[str, Any]]) -> str:
        parts = []
        for r in reqs:
            how = ' on some paths only' if r in partial_only else ''
            parts.append(f'{" or ".join(r["privs"])}{how} — {r["impact"]}')
        return '; '.join(parts)

    name = 'Token permissions'
    if missing_core:
        return _result('permissions', 'Proxmox', name, FAIL, f'Token lacks {says(missing_core)}', details)
    if missing_migrate:
        status = FAIL if automation_live else WARN
        return _result('permissions', 'Proxmox', name, status, f'Token lacks {says(missing_migrate)}', details)
    if missing_opt:
        return _result('permissions', 'Proxmox', name, WARN, f'Token lacks {says(missing_opt)}', details)
    return _result('permissions', 'Proxmox', name, PASS,
                   f'Token has all {len(REQUIRED_PRIVILEGES)} privileges ProxBalance uses', details)


def check_permissions(ctx: DiagContext) -> List[Dict[str, Any]]:
    """Effective privileges of the configured token (GET /access/permissions)."""
    if not ctx.credentials_configured():
        return [_no_credentials('permissions', 'Token permissions')]
    try:
        perms = ctx.client().access.permissions.get() or {}
    except Exception as e:  # noqa: BLE001
        return [_result('permissions', 'Proxmox', 'Token permissions', FAIL,
                        f'Can\'t read the token\'s permissions — {_error_fact(e)}', _err_details(e))]
    am = ctx.config.get('automated_migrations') or {}
    res = evaluate_permissions(perms if isinstance(perms, dict) else {},
                               bool(am.get('enabled')) and not am.get('dry_run', True))
    res['details']['token_id'] = ctx.config.get('proxmox_api_token_id') or ctx.config.get('proxmox_username')
    return [res]


def check_storage(ctx: DiagContext) -> List[Dict[str, Any]]:
    """Each online node's storages are enabled and active (one line per node)."""
    if not ctx.credentials_configured():
        return [_no_credentials('storage', 'Storage')]
    try:
        px = ctx.client(timeout=DIAG_STORAGE_TIMEOUT)
        nodes = [n for n in _node_list(px) if n.get('status') == 'online']
    except Exception as e:  # noqa: BLE001
        return [_result('storage', 'Proxmox', 'Storage', FAIL, f'Can\'t list nodes — {_error_fact(e)}', _err_details(e))]
    if not nodes:
        return [_result('storage', 'Proxmox', 'Storage', WARN, 'No online nodes to check storage on')]

    def probe(n: Dict[str, Any]) -> Dict[str, Any]:
        name = str(n.get('node'))
        cid, label = f'storage:{name}', f'Storage on {name}'
        try:
            stores = px.nodes(name).storage.get() or []
        except Exception as e:  # noqa: BLE001
            fact = _error_fact(e)
            if classify_pve_error(e) == READ_TIMEOUT:
                fact += ' — a storage backend may be hanging'
            return _result(cid, 'Proxmox', label, FAIL, f'Can\'t list storages — {fact}', _err_details(e))
        rows = [{'storage': s.get('storage'), 'type': s.get('type'),
                 'enabled': bool(s.get('enabled', 1)), 'active': bool(s.get('active')),
                 'shared': bool(s.get('shared'))} for s in stores]
        inactive = sorted(r['storage'] for r in rows if r['enabled'] and not r['active'])
        disabled = sorted(r['storage'] for r in rows if not r['enabled'])
        d = {'storages': rows}
        tail = f' ({len(disabled)} disabled: {", ".join(disabled)})' if disabled else ''
        if inactive:
            return _result(cid, 'Proxmox', label, WARN,
                           f'{len(inactive)} enabled but not active: {", ".join(inactive)}{tail}', d)
        active = sum(1 for r in rows if r['enabled'])
        return _result(cid, 'Proxmox', label, PASS, f'All {active} enabled storages active{tail}', d)

    with ThreadPoolExecutor(max_workers=min(8, len(nodes))) as pool:
        return list(pool.map(probe, nodes))


# ---------------------------------------------------------------------------
# ProxBalance checks
# ---------------------------------------------------------------------------

def _read_cache(ctx: DiagContext) -> Optional[Dict[str, Any]]:
    try:
        with open(ctx.paths['cache']) as f:
            return json.load(f)
    except (OSError, ValueError):
        return None


def check_collector(ctx: DiagContext) -> List[Dict[str, Any]]:
    """Last collector run (systemd) and the errors it recorded in the cache."""
    name = 'Collector'
    interval = ctx.config.get('collection_interval_minutes') or 60
    svc: Dict[str, Any] = {}
    svc_error = None
    try:
        svc = (ctx.services() or {}).get('proxmox-collector') or {}
    except Exception as e:  # noqa: BLE001
        svc_error = str(e)[:200]
    cache = _read_cache(ctx) or {}
    errors = cache.get('collection_errors') or []
    last_end = svc.get('last_end') or cache.get('collected_at')
    age = _age_s(last_end)
    details = {'interval_minutes': interval, 'last_run_end': last_end, 'last_result': svc.get('result'),
               'exit_status': svc.get('exit_status'), 'collection_errors': errors[:20]}
    if svc_error:
        details['systemd_error'] = svc_error
    if svc.get('result') == 'failed':
        return [_result('collector', 'ProxBalance', name, FAIL,
                        f'Last run failed (exit {svc.get("exit_status") or "?"}, {_fmt_age(age)}) — '
                        'see journalctl -u proxmox-collector', details)]
    if age is None:
        return [_result('collector', 'ProxBalance', name, FAIL, 'Has never completed a run', details)]
    if errors:
        first = errors[0]
        where = f' on {first.get("node")}' if first.get('node') else ''
        return [_result('collector', 'ProxBalance', name, WARN,
                        f'Last run {_fmt_age(age)} had {len(errors)} failed call(s), e.g. '
                        f'{first.get("call")}{where} ({first.get("kind")})', details)]
    if age > (interval * 2 + 10) * 60:
        return [_result('collector', 'ProxBalance', name, WARN,
                        f'Last run {_fmt_age(age)}, overdue (runs every {interval} min)', details)]
    running = ' (running now)' if svc.get('result') == 'running' else ''
    return [_result('collector', 'ProxBalance', name, PASS, f'Last run {_fmt_age(age)}, no errors{running}', details)]


def check_timers(ctx: DiagContext) -> List[Dict[str, Any]]:
    """The collector, recommendation and automigrate timers are armed."""
    name = 'Background timers'
    try:
        services = ctx.services() or {}
    except Exception as e:  # noqa: BLE001
        return [_result('timers', 'ProxBalance', name, FAIL, f'Can\'t read systemd state: {str(e)[:120]}')]
    labels = {'proxmox-collector': 'collector', 'proxmox-balance-recommendations': 'recommendations',
              'proxmox-balance-automigrate': 'automation'}
    rows, unarmed = {}, []
    for unit, label in labels.items():
        t = (services.get(unit) or {}).get('timer') or {}
        rows[unit] = {'active': bool(t.get('active')), 'next': t.get('next'), 'last_trigger': t.get('last_trigger')}
        if not t.get('active'):
            unarmed.append(label)
    api = (services.get('proxmox-balance') or {}).get('active_state')
    details = {'timers': rows, 'api_service': api}
    if unarmed:
        impact = {'collector': 'data goes stale', 'recommendations': 'suggestions stop updating',
                  'automation': 'automation won\'t run'}
        fact = '; '.join(f'{u} timer not armed — {impact[u]}' for u in unarmed)
        return [_result('timers', 'ProxBalance', name, FAIL, fact[0].upper() + fact[1:], details)]
    return [_result('timers', 'ProxBalance', name, PASS, f'All {len(labels)} timers armed', details)]


def check_database(ctx: DiagContext) -> List[Dict[str, Any]]:
    """SQLite file size, and that it opens read-only."""
    name = 'Database'
    path = ctx.paths['db']
    if not os.path.exists(path):
        return [_result('database', 'ProxBalance', name, FAIL, 'Database file not found', {'path': path})]
    sizes = {suffix or 'db': os.path.getsize(path + suffix)
             for suffix in ('', '-wal', '-shm') if os.path.exists(path + suffix)}
    total = sum(sizes.values())
    details = {'path': path, 'bytes': sizes, 'total_bytes': total}
    try:
        conn = sqlite3.connect(f'file:{path}?mode=ro', uri=True, timeout=2)
        try:
            tables = conn.execute("SELECT count(*) FROM sqlite_master WHERE type='table'").fetchone()[0]
        finally:
            conn.close()
        details['tables'] = tables
    except sqlite3.Error as e:
        details['error'] = str(e)[:200]
        return [_result('database', 'ProxBalance', name, FAIL, f'Can\'t open the database: {str(e)[:120]}', details)]
    if total > 2 * 1024 ** 3:
        return [_result('database', 'ProxBalance', name, WARN,
                        f'{_fmt_bytes(total)} — large; history compression may not be running', details)]
    return [_result('database', 'ProxBalance', name, PASS, f'{_fmt_bytes(total)}, {tables} tables', details)]


def check_cache(ctx: DiagContext) -> List[Dict[str, Any]]:
    """Age of cluster_cache.json, which every page reads."""
    name = 'Cluster data cache'
    path = ctx.paths['cache']
    if not os.path.exists(path):
        return [_result('cache', 'ProxBalance', name, FAIL, 'No cluster data yet — the collector hasn\'t written it',
                        {'path': path})]
    cache = _read_cache(ctx)
    if cache is None:
        return [_result('cache', 'ProxBalance', name, FAIL, 'Cache file is unreadable or not valid JSON',
                        {'path': path})]
    interval = ctx.config.get('collection_interval_minutes') or 60
    collected = cache.get('collected_at')
    age = _age_s(collected)
    if age is None:
        age = max(0.0, time.time() - os.path.getmtime(path))
    details = {'path': path, 'collected_at': collected, 'age_seconds': round(age),
               'bytes': os.path.getsize(path), 'nodes': len(cache.get('nodes') or {}),
               'guests': len(cache.get('guests') or {})}
    if age > (interval * 2 + 10) * 60:
        return [_result('cache', 'ProxBalance', name, WARN,
                        f'Data is from {_fmt_age(age)} — older than two collection runs', details)]
    return [_result('cache', 'ProxBalance', name, PASS,
                    f'Collected {_fmt_age(age)}: {details["nodes"]} nodes, {details["guests"]} guests', details)]


def check_updates(ctx: DiagContext) -> List[Dict[str, Any]]:
    """Update channel, the last release check's error and the last update run.

    Reads the release cache and status file only, so it never contacts
    GitHub or sends an "update available" notification.
    """
    import release_updater

    name = 'Updates'
    channel = release_updater.normalize_channel(((ctx.config.get('updates') or {}).get('channel')))
    repo = ctx.paths['repo']
    details: Dict[str, Any] = {'channel': channel}
    try:
        with open(os.path.join(repo, release_updater.RELEASE_CACHE_FILE)) as f:
            rc = json.load(f)
        details['release_check_age_seconds'] = round(time.time() - rc.get('fetched_at', 0)) if rc.get('fetched_at') else None
        details['release_check_error'] = rc.get('error')
        details['releases_known'] = len(rc.get('releases') or [])
    except (OSError, ValueError):
        details['release_check_error'] = None
        details['release_check_age_seconds'] = None
    try:
        st = release_updater.read_status(repo)
    except Exception as e:  # noqa: BLE001
        st = {'state': 'unknown', 'error': str(e)[:200]}
    details['last_update'] = {k: st.get(k) for k in ('state', 'error', 'version', 'finished_at', 'started_at')
                              if st.get(k) is not None}
    if ctx.update_manager is not None:
        try:
            vi = ctx.update_manager.get_version_info()
            details['version'] = vi.get('version')
            details['branch'] = vi.get('branch')
        except Exception:  # noqa: BLE001
            pass
    ver = f'{details["version"]}, ' if details.get('version') else ''
    if st.get('state') in ('failed', 'rolled_back'):
        why = f': {st.get("error")}' if st.get('error') else ''
        word = 'failed' if st.get('state') == 'failed' else 'was rolled back'
        return [_result('updates', 'ProxBalance', name, WARN, f'Last update {word}{why}'[:220], details)]
    if details.get('release_check_error') and channel != 'dev':
        return [_result('updates', 'ProxBalance', name, WARN,
                        f'{ver}{channel} channel — last release check failed: {details["release_check_error"]}'[:220],
                        details)]
    return [_result('updates', 'ProxBalance', name, PASS, f'{ver}{channel} channel, no update errors', details)]


CHECKS: List[Tuple[str, str, str, Callable[[DiagContext], List[Dict[str, Any]]]]] = [
    ('api_host', 'Proxmox', 'Proxmox API', check_api_host),
    ('nodes', 'Proxmox', 'Nodes', check_nodes),
    ('quorum', 'Proxmox', 'Cluster quorum', check_quorum),
    ('permissions', 'Proxmox', 'Token permissions', check_permissions),
    ('storage', 'Proxmox', 'Storage', check_storage),
    ('collector', 'ProxBalance', 'Collector', check_collector),
    ('timers', 'ProxBalance', 'Background timers', check_timers),
    ('database', 'ProxBalance', 'Database', check_database),
    ('cache', 'ProxBalance', 'Cluster data cache', check_cache),
    ('updates', 'ProxBalance', 'Updates', check_updates),
]


def _run_one(fn: Callable[[DiagContext], List[Dict[str, Any]]], ctx: DiagContext,
             cid: str, group: str, name: str) -> List[Dict[str, Any]]:
    t0 = time.monotonic()
    try:
        out = fn(ctx) or []
    except Exception as e:  # noqa: BLE001 — a crashing check is one failed line
        out = [_result(cid, group, name, FAIL, f'Check crashed: {type(e).__name__}: {str(e)[:150]}')]
    ms = round((time.monotonic() - t0) * 1000)
    for r in out:
        r.setdefault('duration_ms', ms)
    return out


def run_diagnostics(config: Dict[str, Any], ctx: Optional[DiagContext] = None,
                    checks: Optional[list] = None, deadline_s: float = OVERALL_DEADLINE_S) -> Dict[str, Any]:
    """Run every check in parallel and return the scrubbed results.

    Never raises.

    Args:
        config: Loaded config (may be an error dict from load_config()).
        ctx: Check context; built from config when omitted.
        checks: Override CHECKS (tests).
        deadline_s: Seconds to wait for all checks.

    Returns:
        ``{"success": True, "ran_at", "duration_ms", "summary": {pass, warn, fail, skip},
        "results": [...]}``
    """
    started = time.monotonic()
    config = config if isinstance(config, dict) else {}
    checks = checks if checks is not None else CHECKS
    results: List[Dict[str, Any]] = []
    try:
        if config.get('error'):
            results.append(_result('config', 'ProxBalance', 'Configuration', FAIL,
                                   f'config.json could not be loaded: {config.get("message") or "unknown error"}'))
        ctx = ctx or DiagContext(config)
        pool = ThreadPoolExecutor(max_workers=len(checks) or 1, thread_name_prefix='diag')
        futures = {pool.submit(_run_one, fn, ctx, cid, group, name): (cid, group, name)
                   for cid, group, name, fn in checks}
        done, _ = wait(futures, timeout=deadline_s)
        for fut, (cid, group, name) in futures.items():
            if fut in done:
                try:
                    results.extend(fut.result())
                except Exception as e:  # noqa: BLE001
                    results.append(_result(cid, group, name, FAIL, f'Check crashed: {str(e)[:150]}'))
            else:
                results.append(_result(cid, group, name, FAIL,
                                       f'Did not finish within {deadline_s:.0f} s', {'timed_out': True}))
        pool.shutdown(wait=False, cancel_futures=True)
    except Exception as e:  # noqa: BLE001
        results.append(_result('diagnostics', 'ProxBalance', 'Diagnostics', FAIL,
                               f'Diagnostics failed to run: {str(e)[:150]}'))
    summary = {s: sum(1 for r in results if r.get('status') == s) for s in (PASS, WARN, FAIL, SKIP)}
    out = {
        'success': True,
        'ran_at': datetime.now(timezone.utc).isoformat(),
        'duration_ms': round((time.monotonic() - started) * 1000),
        'summary': summary,
        'required_privileges': [{'privilege': ' or '.join(r['privs']), 'scope': r['scope'],
                                 'level': r['level'], 'used_for': r['used_for']} for r in REQUIRED_PRIVILEGES],
        'results': results,
    }
    return scrub(out, secret_values(config))
