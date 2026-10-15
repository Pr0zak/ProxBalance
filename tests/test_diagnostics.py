"""Diagnostics checks: pass/warn/fail mapping, independence, read-only, no secrets.

The Proxmox client is a fake that answers GET paths from a dict, so every
check runs as it would against proxmoxer without a cluster.
"""

import json
import os
import sqlite3
import sys
import time

import pytest
from flask import Flask

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from proxbalance import diagnostics as D  # noqa: E402

SECRET = 'a1b2c3d4-dead-beef-0000-123456789abc'
PUSH_TOKEN = 'pushover-token-xyz987'


class HTTPError(Exception):
    def __init__(self, status, msg='error'):
        super().__init__(f'{status} {msg}')
        self.status_code = status


class ConnectTimeout(Exception):
    pass


class ReadTimeout(Exception):
    pass


class _Path:
    """proxmoxer-style attribute/call chain resolving to a '/'-joined path."""

    def __init__(self, api, parts):
        self._api, self._parts = api, parts

    def __getattr__(self, name):
        if name.startswith('_'):
            raise AttributeError(name)
        return _Path(self._api, self._parts + [name])

    def __call__(self, *args):
        return _Path(self._api, self._parts + [str(a) for a in args])

    def get(self, **params):
        path = '/'.join(self._parts)
        self._api.calls.append(('GET', path))
        if path not in self._api.routes:
            raise HTTPError(501, f'no fake for {path}')
        value = self._api.routes[path]
        if isinstance(value, BaseException):
            raise value
        if callable(value):
            return value()
        return value

    def _write(self, *a, **k):
        self._api.calls.append(('WRITE', '/'.join(self._parts)))
        raise AssertionError('diagnostics must not write')

    post = put = delete = create = set = _write


class FakePX:
    def __init__(self, routes):
        self.routes = routes
        self.calls = []

    def __getattr__(self, name):
        if name.startswith('_'):
            raise AttributeError(name)
        return _Path(self, [name])


ALL_PRIVS = {'/': {p: 1 for p in (
    'Sys.Audit', 'VM.Audit', 'Datastore.Audit', 'VM.Migrate', 'VM.Config.Options',
    'VM.PowerMgmt', 'Pool.Audit', 'VM.GuestAgent.Audit', 'Sys.Modify')}}


def healthy_routes():
    return {
        'version': {'version': '9.2.1', 'release': '9.2'},
        'nodes': [{'node': 'pve3', 'status': 'online'}, {'node': 'pve4', 'status': 'online'}],
        'nodes/pve3/version': {'version': '9.2.1'},
        'nodes/pve4/version': {'version': '9.2.1'},
        'cluster/status': [
            {'type': 'cluster', 'name': 'lab', 'quorate': 1, 'nodes': 2},
            {'type': 'node', 'name': 'pve3', 'online': 1},
            {'type': 'node', 'name': 'pve4', 'online': 1},
        ],
        'access/permissions': ALL_PRIVS,
        'nodes/pve3/storage': [{'storage': 'local', 'type': 'dir', 'enabled': 1, 'active': 1}],
        'nodes/pve4/storage': [{'storage': 'local', 'type': 'dir', 'enabled': 1, 'active': 1}],
    }


def base_config(**over):
    cfg = {
        'proxmox_host': '10.0.0.3', 'proxmox_port': 8006,
        'proxmox_api_token_id': 'proxbalance@pam!pb', 'proxmox_api_token_secret': SECRET,
        'collection_interval_minutes': 60,
        'updates': {'channel': 'stable'},
        'automated_migrations': {'enabled': False, 'dry_run': True},
        'notifications': {'providers': {'pushover': {'api_token': PUSH_TOKEN}}},
    }
    cfg.update(over)
    return cfg


def healthy_services():
    now = time.strftime('%Y-%m-%dT%H:%M:%S+00:00', time.gmtime())
    t = {'active': True, 'next': now, 'last_trigger': now}
    return {
        'proxmox-balance': {'active_state': 'active', 'timer': None},
        'proxmox-collector': {'result': 'success', 'last_end': now, 'exit_status': '0', 'timer': t},
        'proxmox-balance-recommendations': {'result': 'success', 'timer': t},
        'proxmox-balance-automigrate': {'result': 'success', 'timer': t},
    }


@pytest.fixture
def files(tmp_path):
    cache = tmp_path / 'cluster_cache.json'
    cache.write_text(json.dumps({
        'collected_at': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
        'nodes': {'pve3': {}, 'pve4': {}}, 'guests': {'100': {}}, 'collection_errors': [],
    }))
    db = tmp_path / 'proxbalance.db'
    conn = sqlite3.connect(db)
    conn.execute('CREATE TABLE t (x)')
    conn.commit()
    conn.close()
    return {'cache': str(cache), 'db': str(db), 'repo': str(tmp_path), 'base': str(tmp_path)}


def make_ctx(files, routes=None, config=None, services=None):
    px = FakePX(routes if routes is not None else healthy_routes())
    svc = services if services is not None else healthy_services()
    ctx = D.DiagContext(config or base_config(), client_factory=lambda timeout=None: px,
                        services_reader=(svc if callable(svc) else (lambda: svc)), paths=files)
    return ctx, px


def by_id(results):
    return {r['id']: r for r in results}


# ---------------------------------------------------------------------------
# Whole run
# ---------------------------------------------------------------------------

def test_healthy_cluster_all_pass(files):
    ctx, px = make_ctx(files)
    out = D.run_diagnostics(base_config(), ctx=ctx)
    bad = [r for r in out['results'] if r['status'] != 'pass']
    assert bad == []
    ids = {r['id'] for r in out['results']}
    assert {'api_host', 'node:pve3', 'node:pve4', 'quorum', 'permissions', 'storage:pve3', 'storage:pve4',
            'collector', 'timers', 'database', 'cache', 'updates'} <= ids
    assert out['summary']['pass'] == len(out['results'])
    assert not any(c[0] == 'WRITE' for c in px.calls)
    assert all(c[0] == 'GET' for c in px.calls)


def test_crashing_check_does_not_break_others(files):
    ctx, _ = make_ctx(files)

    def boom(_ctx):
        raise RuntimeError('kaboom')

    checks = [('boom', 'Proxmox', 'Boom', boom)] + D.CHECKS
    out = D.run_diagnostics(base_config(), ctx=ctx, checks=checks)
    r = by_id(out['results'])
    assert r['boom']['status'] == 'fail'
    assert 'kaboom' in r['boom']['fact']
    assert r['quorum']['status'] == 'pass'
    assert r['database']['status'] == 'pass'


def test_slow_check_reported_unfinished(files):
    ctx, _ = make_ctx(files)

    def slow(_ctx):
        time.sleep(2)
        return []

    checks = [('slow', 'Proxmox', 'Slow', slow), D.CHECKS[2]]
    out = D.run_diagnostics(base_config(), ctx=ctx, checks=checks, deadline_s=0.3)
    r = by_id(out['results'])
    assert r['slow']['status'] == 'fail' and 'Did not finish' in r['slow']['fact']
    assert r['quorum']['status'] == 'pass'


def test_api_down_fails_proxmox_lines_only(files):
    def factory(timeout=None):
        raise ConnectTimeout('Connection to 10.0.0.3 timed out. (connect timeout=3)')

    ctx = D.DiagContext(base_config(), client_factory=factory,
                        services_reader=healthy_services, paths=files)
    out = D.run_diagnostics(base_config(), ctx=ctx)
    r = by_id(out['results'])
    for cid in ('api_host', 'nodes', 'quorum', 'permissions', 'storage'):
        assert r[cid]['status'] == 'fail', cid
    assert 'no answer' in r['api_host']['fact']
    for cid in ('database', 'cache', 'timers'):
        assert r[cid]['status'] == 'pass', cid


def test_secrets_never_in_output(files):
    routes = healthy_routes()
    routes['cluster/status'] = HTTPError(500, f'bad token {SECRET}')
    routes['version'] = HTTPError(401, f'authentication failure for {SECRET}')
    ctx, _ = make_ctx(files, routes=routes)
    out = D.run_diagnostics(base_config(), ctx=ctx)
    text = json.dumps(out)
    assert SECRET not in text
    assert PUSH_TOKEN not in text
    assert '***' in text
    assert by_id(out['results'])['api_host']['status'] == 'fail'


def test_no_token_configured(files):
    cfg = base_config(proxmox_api_token_secret='')
    ctx, px = make_ctx(files, config=cfg)
    out = D.run_diagnostics(cfg, ctx=ctx)
    r = by_id(out['results'])
    assert r['api_host']['status'] == 'fail' and 'No Proxmox API token' in r['api_host']['fact']
    assert px.calls == []


def test_config_error_is_reported(files):
    ctx, _ = make_ctx(files)
    out = D.run_diagnostics({'error': True, 'message': 'bad json'}, ctx=ctx)
    assert by_id(out['results'])['config']['status'] == 'fail'


# ---------------------------------------------------------------------------
# API / nodes
# ---------------------------------------------------------------------------

def test_api_slow_warns(files, monkeypatch):
    ctx, _ = make_ctx(files)
    monkeypatch.setattr(D, 'SLOW_API_MS', -1)
    assert D.check_api_host(ctx)[0]['status'] == 'warn'


def test_api_auth_failure(files):
    routes = healthy_routes()
    routes['version'] = HTTPError(401, 'authentication failure')
    ctx, _ = make_ctx(files, routes=routes)
    r = D.check_api_host(ctx)[0]
    assert r['status'] == 'fail' and 'rejected' in r['fact']


def test_node_offline_and_unanswering(files):
    routes = healthy_routes()
    routes['nodes'] = [{'node': 'pve3', 'status': 'online'}, {'node': 'pve4', 'status': 'online'},
                       {'node': 'pve5', 'status': 'offline'}]
    routes['nodes/pve4/version'] = ReadTimeout('Read timed out')
    ctx, _ = make_ctx(files, routes=routes)
    r = by_id(D.check_nodes(ctx))
    assert r['node:pve3']['status'] == 'pass'
    assert r['node:pve4']['status'] == 'fail' and 'no reply' in r['node:pve4']['fact']
    assert r['node:pve5']['status'] == 'fail' and 'offline' in r['node:pve5']['fact']


# ---------------------------------------------------------------------------
# Quorum
# ---------------------------------------------------------------------------

@pytest.mark.parametrize('status,expected,phrase', [
    ([{'type': 'cluster', 'quorate': 1}, {'type': 'node', 'name': 'a', 'online': 1}], 'pass', 'Quorate'),
    ([{'type': 'cluster', 'quorate': 1}, {'type': 'node', 'name': 'a', 'online': 1},
      {'type': 'node', 'name': 'b', 'online': 0}], 'warn', 'b'),
    ([{'type': 'cluster', 'quorate': 0}, {'type': 'node', 'name': 'a', 'online': 1}], 'fail', 'lost quorum'),
    ([{'type': 'node', 'name': 'a', 'online': 1}], 'pass', 'Single node'),
])
def test_quorum_mapping(files, status, expected, phrase):
    routes = healthy_routes()
    routes['cluster/status'] = status
    ctx, _ = make_ctx(files, routes=routes)
    r = D.check_quorum(ctx)[0]
    assert r['status'] == expected
    assert phrase in r['fact']


# ---------------------------------------------------------------------------
# Permissions
# ---------------------------------------------------------------------------

def _without(*privs):
    return {'/': {p: 1 for p in ALL_PRIVS['/'] if p not in privs}}


def test_permissions_all_held():
    assert D.evaluate_permissions(ALL_PRIVS, automation_live=False)['status'] == 'pass'


def test_permissions_missing_migrate_warns_then_fails_when_automation_live():
    perms = _without('VM.Migrate')
    r = D.evaluate_permissions(perms, automation_live=False)
    assert r['status'] == 'warn'
    assert 'VM.Migrate' in r['fact'] and "automation can't move guests" in r['fact']
    assert D.evaluate_permissions(perms, automation_live=True)['status'] == 'fail'


def test_permissions_missing_core_fails():
    r = D.evaluate_permissions(_without('VM.Audit'), automation_live=False)
    assert r['status'] == 'fail' and 'VM.Audit' in r['fact']


def test_permissions_optional_missing_warns():
    r = D.evaluate_permissions(_without('Sys.Modify'), automation_live=False)
    assert r['status'] == 'warn' and 'Sys.Modify' in r['fact']


def test_permissions_any_of_and_scope():
    perms = _without('VM.GuestAgent.Audit', 'VM.Migrate')
    perms['/'] = dict(perms['/'], **{'VM.Monitor': 1})
    perms['/vms'] = {'VM.Migrate': 1}
    assert D.evaluate_permissions(perms, automation_live=True)['status'] == 'pass'


def test_permissions_partial_path_counts_as_missing():
    perms = _without('VM.Migrate')
    perms['/vms/100'] = {'VM.Migrate': 1}
    r = D.evaluate_permissions(perms, automation_live=False)
    assert r['status'] == 'warn' and 'some paths only' in r['fact']
    row = next(x for x in r['details']['privileges'] if x['privilege'] == 'VM.Migrate')
    assert row['state'] == 'partial' and row['only_on'] == ['/vms/100']


def test_permissions_check_uses_automation_config(files):
    routes = healthy_routes()
    routes['access/permissions'] = _without('VM.Migrate')
    cfg = base_config(automated_migrations={'enabled': True, 'dry_run': False})
    ctx, _ = make_ctx(files, routes=routes, config=cfg)
    r = D.check_permissions(ctx)[0]
    assert r['status'] == 'fail'
    assert r['details']['token_id'] == 'proxbalance@pam!pb'


def test_required_privileges_cover_code_calls():
    names = {p for r in D.REQUIRED_PRIVILEGES for p in r['privs']}
    assert {'Sys.Audit', 'VM.Audit', 'Datastore.Audit', 'VM.Migrate'} <= names


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

def test_storage_inactive_warns_disabled_ignored(files):
    routes = healthy_routes()
    routes['nodes/pve3/storage'] = [
        {'storage': 'local', 'enabled': 1, 'active': 1},
        {'storage': 'nas', 'enabled': 1, 'active': 0},
        {'storage': 'old', 'enabled': 0, 'active': 0},
    ]
    routes['nodes/pve4/storage'] = [{'storage': 'local', 'enabled': 1, 'active': 1},
                                    {'storage': 'old', 'enabled': 0, 'active': 0}]
    ctx, _ = make_ctx(files, routes=routes)
    r = by_id(D.check_storage(ctx))
    assert r['storage:pve3']['status'] == 'warn' and 'nas' in r['storage:pve3']['fact']
    assert r['storage:pve4']['status'] == 'pass' and 'disabled: old' in r['storage:pve4']['fact']


def test_storage_timeout_fails_that_node_only(files):
    routes = healthy_routes()
    routes['nodes/pve4/storage'] = ReadTimeout('Read timed out')
    ctx, _ = make_ctx(files, routes=routes)
    r = by_id(D.check_storage(ctx))
    assert r['storage:pve3']['status'] == 'pass'
    assert r['storage:pve4']['status'] == 'fail' and 'hanging' in r['storage:pve4']['fact']


def test_storage_skips_offline_nodes(files):
    routes = healthy_routes()
    routes['nodes'] = [{'node': 'pve3', 'status': 'online'}, {'node': 'pve4', 'status': 'offline'}]
    ctx, _ = make_ctx(files, routes=routes)
    assert [r['id'] for r in D.check_storage(ctx)] == ['storage:pve3']


# ---------------------------------------------------------------------------
# ProxBalance checks
# ---------------------------------------------------------------------------

def test_collector_failed_run(files):
    svc = healthy_services()
    svc['proxmox-collector'] = dict(svc['proxmox-collector'], result='failed', exit_status='1')
    ctx, _ = make_ctx(files, services=svc)
    r = D.check_collector(ctx)[0]
    assert r['status'] == 'fail' and 'failed' in r['fact']


def test_collector_errors_warn(files):
    with open(files['cache']) as f:
        cache = json.load(f)
    cache['collection_errors'] = [{'node': 'pve5', 'call': 'RRD data (day)', 'kind': 'read_timeout'}]
    with open(files['cache'], 'w') as f:
        json.dump(cache, f)
    ctx, _ = make_ctx(files)
    r = D.check_collector(ctx)[0]
    assert r['status'] == 'warn' and 'pve5' in r['fact']


def test_collector_overdue_warns(files):
    svc = healthy_services()
    svc['proxmox-collector']['last_end'] = '2020-01-01T00:00:00+00:00'
    ctx, _ = make_ctx(files, services=svc)
    assert D.check_collector(ctx)[0]['status'] == 'warn'


def test_timer_not_armed_fails(files):
    svc = healthy_services()
    svc['proxmox-balance-automigrate']['timer'] = {'active': False}
    ctx, _ = make_ctx(files, services=svc)
    r = D.check_timers(ctx)[0]
    assert r['status'] == 'fail' and "automation won't run" in r['fact']


def test_timers_unreadable_fails(files):
    def broken():
        raise RuntimeError('systemctl is not available here')
    ctx, _ = make_ctx(files, services=broken)
    assert D.check_timers(ctx)[0]['status'] == 'fail'


def test_database_missing_and_corrupt(files, tmp_path):
    ctx, _ = make_ctx(dict(files, db=str(tmp_path / 'nope.db')))
    assert D.check_database(ctx)[0]['status'] == 'fail'
    bad = tmp_path / 'bad.db'
    bad.write_bytes(b'not a database at all' * 100)
    ctx, _ = make_ctx(dict(files, db=str(bad)))
    assert D.check_database(ctx)[0]['status'] == 'fail'


def test_database_is_opened_read_only(files):
    before = os.path.getmtime(files['db'])
    ctx, _ = make_ctx(files)
    assert D.check_database(ctx)[0]['status'] == 'pass'
    assert os.path.getmtime(files['db']) == before
    assert not os.path.exists(files['db'] + '-wal')


def test_cache_missing_and_stale(files, tmp_path):
    ctx, _ = make_ctx(dict(files, cache=str(tmp_path / 'none.json')))
    assert D.check_cache(ctx)[0]['status'] == 'fail'
    with open(files['cache'], 'w') as f:
        json.dump({'collected_at': '2020-01-01T00:00:00Z'}, f)
    ctx, _ = make_ctx(files)
    assert D.check_cache(ctx)[0]['status'] == 'warn'


def test_updates_mapping(files):
    repo = files['repo']
    ctx, _ = make_ctx(files)
    assert D.check_updates(ctx)[0]['status'] == 'pass'
    with open(os.path.join(repo, '.release_cache.json'), 'w') as f:
        json.dump({'releases': [], 'fetched_at': time.time(), 'error': 'Could not reach GitHub: timeout'}, f)
    r = D.check_updates(ctx)[0]
    assert r['status'] == 'warn' and 'GitHub' in r['fact']
    with open(os.path.join(repo, 'update_status.json'), 'w') as f:
        json.dump({'state': 'rolled_back', 'error': 'health check failed'}, f)
    r = D.check_updates(ctx)[0]
    assert r['status'] == 'warn' and 'rolled back' in r['fact']


def test_updates_check_is_read_only(files):
    before = sorted(os.listdir(files['repo']))
    ctx, _ = make_ctx(files)
    D.check_updates(ctx)
    assert sorted(os.listdir(files['repo'])) == before


# ---------------------------------------------------------------------------
# Scrubbing + route
# ---------------------------------------------------------------------------

def test_secret_values_and_scrub():
    secrets = D.secret_values(base_config())
    assert SECRET in secrets and PUSH_TOKEN in secrets
    assert D.scrub({'a': [f'x{SECRET}y']}, secrets) == {'a': ['x***y']}


def test_route_returns_200_and_scrubs(monkeypatch, files):
    from proxbalance.routes import diagnostics as route

    monkeypatch.setattr(route, 'load_config', lambda: base_config())

    def fake_run(config, ctx=None):
        assert isinstance(ctx, D.DiagContext)
        res = [D._result('x', 'Proxmox', 'X', 'fail', f'leaked {SECRET}')]
        return D.scrub({'success': True, 'results': res}, D.secret_values(config))

    monkeypatch.setattr(route, 'run_diagnostics', fake_run)
    app = Flask(__name__)
    app.register_blueprint(route.diagnostics_bp)
    r = app.test_client().get('/api/diagnostics')
    assert r.status_code == 200
    assert SECRET not in r.get_data(as_text=True)
