"""Tests for the app-wide CSRF check (proxbalance/csrf.py, issue #109)."""

import os
import sys

import pytest
from flask import Flask, jsonify

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from proxbalance.csrf import register_csrf_protection  # noqa: E402

BLOCKED = {"success": False, "error": True, "message": "Cross-site request blocked"}


@pytest.fixture
def cfg():
    return {}


@pytest.fixture
def client(cfg):
    app = Flask(__name__)
    register_csrf_protection(app, lambda: cfg)

    @app.route('/api/thing', methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
    def thing():
        return jsonify({"success": True})

    @app.route('/api/health', methods=['GET', 'POST'])
    def health():
        return jsonify({"status": "ok"})

    @app.route('/not-api', methods=['POST'])
    def not_api():
        return jsonify({"success": True})

    return app.test_client()


def _post(client, headers=None, base_url='http://10.0.0.211', path='/api/thing', method='post'):
    return getattr(client, method)(path, json={}, headers=headers or {}, base_url=base_url)


# --- Sec-Fetch-Site ---------------------------------------------------------

def test_cross_site_fetch_site_blocked(client):
    r = _post(client, {'Sec-Fetch-Site': 'cross-site', 'Origin': 'https://evil.example'})
    assert r.status_code == 403
    assert r.get_json() == BLOCKED


def test_same_site_fetch_site_blocked(client):
    r = _post(client, {'Sec-Fetch-Site': 'same-site', 'Origin': 'http://10.0.0.211:8080'})
    assert r.status_code == 403


def test_same_origin_fetch_site_passes(client):
    r = _post(client, {'Sec-Fetch-Site': 'same-origin', 'Origin': 'http://10.0.0.211'})
    assert r.status_code == 200


def test_none_fetch_site_passes(client):
    assert _post(client, {'Sec-Fetch-Site': 'none'}).status_code == 200


def test_fetch_site_wins_over_origin(client):
    # A same-origin label is trusted even if Origin looks odd (e.g. "null").
    r = _post(client, {'Sec-Fetch-Site': 'same-origin', 'Origin': 'null'})
    assert r.status_code == 200


@pytest.mark.parametrize('method', ['put', 'patch', 'delete'])
def test_other_mutating_methods_blocked(client, method):
    r = _post(client, {'Sec-Fetch-Site': 'cross-site'}, method=method)
    assert r.status_code == 403


# --- Origin fallback (no Sec-Fetch-Site) ------------------------------------

def test_mismatched_origin_blocked(client):
    r = _post(client, {'Origin': 'https://evil.example'})
    assert r.status_code == 403
    assert r.get_json() == BLOCKED


def test_null_origin_blocked(client):
    assert _post(client, {'Origin': 'null'}).status_code == 403


def test_matching_origin_direct_lan_passes(client):
    assert _post(client, {'Origin': 'http://10.0.0.211'}).status_code == 200


def test_matching_origin_explicit_default_port_passes(client):
    assert _post(client, {'Origin': 'http://10.0.0.211:80'}).status_code == 200


def test_different_port_blocked(client):
    assert _post(client, {'Origin': 'http://10.0.0.211:8080'}).status_code == 403


def test_matching_origin_non_default_port_passes(client):
    r = _post(client, {'Origin': 'http://localhost:5001'}, base_url='http://localhost:5001')
    assert r.status_code == 200


def test_origin_behind_tls_proxy_passes(client):
    # NPM terminates TLS and sets X-Forwarded-Proto; nginx keeps Host.
    r = _post(client, {'Origin': 'https://proxbalance.zynack.net', 'X-Forwarded-Proto': 'https'},
              base_url='http://proxbalance.zynack.net')
    assert r.status_code == 200


def test_https_origin_without_forwarded_proto_blocked(client):
    r = _post(client, {'Origin': 'https://proxbalance.zynack.net'},
              base_url='http://proxbalance.zynack.net')
    assert r.status_code == 403


def test_forwarded_host_passes(client):
    r = _post(client, {'Origin': 'https://pb.example.com', 'X-Forwarded-Proto': 'https',
                       'X-Forwarded-Host': 'pb.example.com'},
              base_url='http://127.0.0.1:5000')
    assert r.status_code == 200


def test_origin_in_cors_origins_passes(client, cfg):
    cfg['cors_origins'] = ['https://dash.example.com']
    assert _post(client, {'Origin': 'https://dash.example.com'}).status_code == 200
    assert _post(client, {'Origin': 'https://other.example.com'}).status_code == 403


def test_cors_origins_wildcard_passes(client, cfg):
    cfg['cors_origins'] = '*'
    assert _post(client, {'Origin': 'https://anything.example'}).status_code == 200


# --- Non-browser clients, exemptions, switches ------------------------------

def test_no_browser_headers_passes(client):
    assert _post(client).status_code == 200


def test_get_unaffected(client):
    r = client.get('/api/thing', headers={'Sec-Fetch-Site': 'cross-site',
                                          'Origin': 'https://evil.example'})
    assert r.status_code == 200


def test_health_exempt(client):
    r = _post(client, {'Sec-Fetch-Site': 'cross-site'}, path='/api/health')
    assert r.status_code == 200


def test_non_api_path_unaffected(client):
    r = _post(client, {'Sec-Fetch-Site': 'cross-site'}, path='/not-api')
    assert r.status_code == 200


def test_switch_off_passes(client, cfg):
    cfg['csrf_protection'] = False
    assert _post(client, {'Sec-Fetch-Site': 'cross-site'}).status_code == 200


def test_config_error_keeps_protection_on(client, cfg):
    cfg.update({'error': True, 'message': 'broken', 'csrf_protection': False})
    assert _post(client, {'Sec-Fetch-Site': 'cross-site'}).status_code == 403


def test_valid_api_key_skips_check(client, cfg):
    cfg['api_key'] = 's3cret'
    headers = {'Sec-Fetch-Site': 'cross-site', 'X-API-Key': 's3cret'}
    assert _post(client, headers).status_code == 200
    headers = {'Sec-Fetch-Site': 'cross-site', 'Authorization': 'Bearer s3cret'}
    assert _post(client, headers).status_code == 200


def test_wrong_api_key_does_not_skip(client, cfg):
    cfg['api_key'] = 's3cret'
    r = _post(client, {'Sec-Fetch-Site': 'cross-site', 'X-API-Key': 'nope'})
    assert r.status_code == 403


def test_api_key_header_without_configured_key_does_not_skip(client):
    r = _post(client, {'Sec-Fetch-Site': 'cross-site', 'X-API-Key': ''})
    assert r.status_code == 403
