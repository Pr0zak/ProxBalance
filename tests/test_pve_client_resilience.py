"""Proxmox API client hardening: NaN-safe parsing, error kinds, timeouts,
reads retried, migrate POSTs never retried. No cluster needed: the
proxmoxer client is real, its HTTP session is replaced by a fake."""

import errno
import json
import math
import socket

import pytest
import requests
from proxmoxer.core import AuthenticationError, ResourceException

from proxbalance import pve_client, pve_errors
from proxbalance.pve_client import (
    PVE_READ_TIMEOUT,
    PVE_SLOW_READ_TIMEOUT,
    MigrationOutcomeUnknown,
    build_proxmox_client,
    loads_pve_json,
    retry_read,
    sanitize_floats,
    submit_migration,
)
from proxbalance.pve_errors import classify_pve_error, is_transient


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------

class FakeResponse:
    def __init__(self, status_code=200, body=b'{"data": null}', reason="OK"):
        self.status_code = status_code
        self.content = body if isinstance(body, bytes) else body.encode()
        self.text = self.content.decode()
        self.reason = reason


class FakeTransport:
    """Stands in for requests.Session.request on a real proxmoxer client."""

    def __init__(self, handler):
        self.handler = handler
        self.calls = []

    def __call__(self, method, url, data=None, params=None, **kwargs):
        self.calls.append((method, url, dict(data or {}), dict(params or {})))
        return self.handler(method, url, data, params)

    def count(self, method, suffix=""):
        return sum(1 for m, u, _, _ in self.calls if m == method and u.endswith(suffix))


def make_client(handler, timeout=None):
    client = build_proxmox_client(
        "pve-test.invalid", token_id="root@pam!test", token_secret="secret", timeout=timeout,
    )
    transport = FakeTransport(handler)
    client._store["session"].request = transport
    return client, transport


def http_error(status, text="boom"):
    return ResourceException(status, "Status", text)


# ---------------------------------------------------------------------------
# NaN / Infinity
# ---------------------------------------------------------------------------

def test_loads_pve_json_maps_nan_and_infinity_to_none():
    parsed = loads_pve_json('{"a": NaN, "b": Infinity, "c": -Infinity, "d": 1.5, "e": 1e999, "f": [NaN, 2]}')
    assert parsed == {"a": None, "b": None, "c": None, "d": 1.5, "e": None, "f": [None, 2]}


def test_sanitize_floats_walks_nested_structures():
    data = {"x": float("nan"), "y": [float("inf"), {"z": -float("inf")}], "ok": 3, "s": "NaN"}
    assert sanitize_floats(data) == {"x": None, "y": [None, {"z": None}], "ok": 3, "s": "NaN"}


def test_client_responses_are_sanitised_and_json_safe():
    body = b'{"data": [{"node": "lyra", "cpu": NaN, "mem": Infinity, "maxmem": -Infinity, "uptime": 5}]}'
    client, _ = make_client(lambda *a: FakeResponse(body=body))
    result = client.cluster.resources.get()
    assert result == [{"node": "lyra", "cpu": None, "mem": None, "maxmem": None, "uptime": 5}]
    # Strict JSON (what browsers accept) must be able to encode it.
    json.dumps(result, allow_nan=False)


def test_error_bodies_are_parsed_with_the_same_serializer():
    client, _ = make_client(lambda *a: FakeResponse(400, b'{"errors": {"x": NaN}}', reason="Bad"))
    with pytest.raises(ResourceException) as info:
        client.nodes("lyra").status.get()
    assert info.value.errors == {"x": None}


def test_collector_tolerates_none_numbers_from_sanitised_json():
    import collector_api

    collector = object.__new__(collector_api.ProxmoxAPICollector)
    summary = collector._summarize_guest_rrd([{"cpu": None, "mem": None, "maxmem": None},
                                              {"cpu": 0.5, "mem": 1, "maxmem": 2}])
    assert summary["cpu"]["avg"] == 50.0
    assert not any(isinstance(v, float) and math.isnan(v) for v in summary["cpu"].values())


# ---------------------------------------------------------------------------
# Timeouts
# ---------------------------------------------------------------------------

def test_default_timeout_is_connect_read_tuple():
    client, _ = make_client(lambda *a: FakeResponse())
    assert client._store["session"].auth.timeout == PVE_READ_TIMEOUT
    assert PVE_READ_TIMEOUT == (5, 8)


def test_explicit_timeout_is_kept():
    client, _ = make_client(lambda *a: FakeResponse(), timeout=PVE_SLOW_READ_TIMEOUT)
    assert client._store["session"].auth.timeout == (5, 30)
    legacy, _ = make_client(lambda *a: FakeResponse(), timeout=30)
    assert legacy._store["session"].auth.timeout == 30


def test_session_has_no_transport_level_retries():
    client = build_proxmox_client("pve-test.invalid", token_id="root@pam!t", token_secret="s")
    adapter = client._store["session"].get_adapter("https://pve-test.invalid:8006/")
    assert adapter.max_retries.total == 0


def test_get_proxmox_client_uses_hardened_builder():
    from proxbalance.config_manager import get_proxmox_client

    client = get_proxmox_client({
        "proxmox_host": "pve-test.invalid",
        "proxmox_api_token_id": "root@pam!t",
        "proxmox_api_token_secret": "s",
    })
    assert client._store["session"].auth.timeout == PVE_READ_TIMEOUT
    assert type(client._store["serializer"]).__name__ == "SanitizingJsonSerializer"


# ---------------------------------------------------------------------------
# Error classification
# ---------------------------------------------------------------------------

@pytest.mark.parametrize("exc, kind", [
    (requests.exceptions.ConnectionError(
        "HTTPSConnectionPool(host='192.168.1.3', port=8006): Max retries exceeded with url: /api2/json/version "
        "(Caused by NewConnectionError('<urllib3.connection.HTTPSConnection object>: Failed to establish a new "
        "connection: [Errno 111] Connection refused'))"), "network"),
    (ConnectionRefusedError(errno.ECONNREFUSED, "Connection refused"), "network"),
    (ConnectionResetError(errno.ECONNRESET, "Connection reset by peer"), "network"),
    (OSError(errno.EHOSTUNREACH, "No route to host"), "network"),
    (socket.gaierror(-2, "Name or service not known"), "network"),
    (requests.exceptions.ConnectTimeout("Connection to 192.168.1.3 timed out. (connect timeout=5)"), "connect_timeout"),
    (requests.exceptions.ReadTimeout("HTTPSConnectionPool(host='192.168.1.3', port=8006): Read timed out. (read timeout=8)"),
     "read_timeout"),
    (requests.exceptions.ConnectionError("HTTPSConnectionPool(...): Read timed out."), "read_timeout"),
    (http_error(401, "authentication failure"), "auth"),
    (http_error(403, "Permission check failed"), "auth"),
    (AuthenticationError("Couldn't authenticate user"), "auth"),
    (http_error(500, "storage 'pbs' is not online"), "application"),
    (http_error(595, "Errors during connection establishment"), "application"),
    (ValueError("something else"), "unknown"),
])
def test_classification(exc, kind):
    assert classify_pve_error(exc) == kind


def test_http_500_mentioning_econnrefused_is_application_not_network():
    exc = http_error(500, "mount error: ECONNREFUSED (Connection refused) on nfs storage 'Images'")
    assert classify_pve_error(exc) == "application"
    # Also when the collector re-wraps it as a plain message.
    wrapped = Exception(f"Failed to fetch storage: {exc}")
    assert classify_pve_error(wrapped) == "application"


def test_wrapped_exceptions_are_classified_through_the_chain():
    try:
        try:
            raise requests.exceptions.ReadTimeout("Read timed out.")
        except Exception as inner:
            raise Exception("Failed to fetch cluster resources") from inner
    except Exception as outer:
        assert classify_pve_error(outer) == "read_timeout"


def test_is_transient():
    assert is_transient(requests.exceptions.ReadTimeout("x"))
    assert is_transient(http_error(503, "busy"))
    assert not is_transient(http_error(400, "bad parameter"))
    assert not is_transient(http_error(401, "no"))


# ---------------------------------------------------------------------------
# Reads are retried, writes are not
# ---------------------------------------------------------------------------

def test_get_retry_recovers_from_a_transient_failure():
    calls = []

    def read():
        calls.append(1)
        if len(calls) == 1:
            raise requests.exceptions.ReadTimeout("Read timed out.")
        return [{"type": "cluster", "quorate": 1}]

    assert retry_read(read, what="cluster status", sleep=lambda s: None) == [{"type": "cluster", "quorate": 1}]
    assert len(calls) == 2


def test_get_retry_does_not_repeat_auth_failures():
    calls = []

    def read():
        calls.append(1)
        raise http_error(401, "authentication failure")

    with pytest.raises(ResourceException):
        retry_read(read, what="cluster status", sleep=lambda s: None)
    assert len(calls) == 1


def test_collector_cluster_status_retries_the_get(monkeypatch):
    import collector_api

    monkeypatch.setattr(pve_client.time, "sleep", lambda s: None)
    state = {"n": 0}

    def handler(method, url, data, params):
        state["n"] += 1
        if state["n"] == 1:
            raise requests.exceptions.ReadTimeout("Read timed out.")
        return FakeResponse(body=b'{"data": [{"type": "cluster", "quorate": 1}]}')

    client, transport = make_client(handler)
    collector = object.__new__(collector_api.ProxmoxAPICollector)
    collector.proxmox = client
    collector.collection_errors = []
    assert collector.get_cluster_status() == [{"type": "cluster", "quorate": 1}]
    assert transport.count("GET", "/cluster/status") == 2


def test_collector_records_error_kind(monkeypatch):
    import collector_api

    monkeypatch.setattr(pve_client.time, "sleep", lambda s: None)

    def handler(method, url, data, params):
        return FakeResponse(500, b'{"errors": null}', reason="ECONNREFUSED talking to PBS")

    client, _ = make_client(handler)
    collector = object.__new__(collector_api.ProxmoxAPICollector)
    collector.proxmox_slow = client
    collector.collection_errors = []
    assert collector.get_storage_status("rigel") == []
    assert collector.collection_errors[0]["kind"] == "application"
    assert collector.collection_errors[0]["node"] == "rigel"


def _migrate_handler(post_exc, tasks):
    def handler(method, url, data, params):
        if method == "POST":
            raise post_exc
        if url.endswith("/tasks"):
            return FakeResponse(body=json.dumps({"data": tasks}))
        return FakeResponse()
    return handler


def test_migrate_post_is_sent_once_on_read_timeout_and_reports_unknown():
    client, transport = make_client(_migrate_handler(requests.exceptions.ReadTimeout("Read timed out."), []))
    with pytest.raises(MigrationOutcomeUnknown) as info:
        submit_migration(client, "lyra", 101, "VM", {"target": "orion", "online": 1}, clock=lambda: 1000.0)
    assert transport.count("POST") == 1
    assert "NOT resent" in str(info.value)
    # It looked up the task list instead (a GET) for this guest's migrate tasks.
    method, url, _, params = transport.calls[-1]
    assert method == "GET" and url.endswith("/nodes/lyra/tasks")
    assert params["vmid"] == 101 and params["typefilter"] == "qmigrate"


def test_migrate_post_timeout_recovers_task_started_by_the_lost_request():
    upid = "UPID:lyra:000A:0001:00000400:vzmigrate:105:root@pam!test:"
    tasks = [
        {"upid": "UPID:old", "id": "105", "type": "vzmigrate", "starttime": 10},
        {"upid": upid, "id": "105", "type": "vzmigrate", "starttime": 1001},
    ]
    client, transport = make_client(_migrate_handler(requests.exceptions.ReadTimeout("Read timed out."), tasks))
    assert submit_migration(client, "lyra", 105, "CT", {"target": "orion", "restart": 1},
                            clock=lambda: 1000.0) == upid
    assert transport.count("POST") == 1


@pytest.mark.parametrize("exc", [
    requests.exceptions.ConnectTimeout("Connection to lyra timed out. (connect timeout=5)"),
    requests.exceptions.ConnectionError("Failed to establish a new connection: [Errno 111] Connection refused"),
    http_error(500, "migration aborted"),
])
def test_migrate_post_failures_that_started_nothing_are_raised_unchanged(exc):
    client, transport = make_client(_migrate_handler(exc, []))
    with pytest.raises(type(exc)):
        submit_migration(client, "lyra", 101, "VM", {"target": "orion"})
    assert transport.count("POST") == 1
    assert transport.count("GET") == 0


def test_execute_migration_reports_unknown_outcome_without_resending(monkeypatch):
    from proxbalance import migrations

    monkeypatch.setattr(migrations, "trigger_collection", lambda: None)
    client, transport = make_client(_migrate_handler(requests.exceptions.ReadTimeout("Read timed out."), []))
    result, status = migrations.execute_migration(client, 101, "orion", "lyra", "VM")
    assert status == 504
    assert result["success"] is False and result["outcome_unknown"] is True
    assert transport.count("POST") == 1


def test_batch_migration_never_resends(monkeypatch):
    from proxbalance import migrations

    monkeypatch.setattr(migrations, "trigger_collection", lambda: None)
    client, transport = make_client(_migrate_handler(requests.exceptions.ReadTimeout("Read timed out."), []))
    result, _ = migrations.execute_batch_migration(client, [
        {"vmid": 101, "target_node": "orion", "source_node": "lyra", "type": "VM"},
    ])
    assert result["succeeded"] == 0
    assert result["results"][0]["outcome_unknown"] is True
    assert transport.count("POST") == 1


def test_error_kinds_constant_is_complete():
    assert set(pve_errors.ERROR_KINDS) == {
        "network", "connect_timeout", "read_timeout", "auth", "application", "unknown",
    }
