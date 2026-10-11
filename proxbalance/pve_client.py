"""
Building and calling the Proxmox API client safely.

Three concerns live here so every caller gets them the same way:

* **Timeouts.** proxmoxer's https backend passes ``timeout`` straight to
  ``requests`` for every call (and for the password-auth ticket request).
  Its default is a single 5 s value used for both the connect and the read
  phase. We pass a ``(connect, read)`` tuple instead: connecting to a live
  node takes milliseconds, so a short connect timeout spots a dead host
  quickly, while reads get their own budget. Known slow reads (RRD bulk,
  storage status, which waits on every storage backend of the node) use a
  separate client built with ``PVE_SLOW_READ_TIMEOUT``. Writes that start
  tasks (migrate) get ``PVE_WRITE_TIMEOUT``: a timed-out write is ambiguous
  (see below), so it is worth waiting longer for the answer.

* **Bad numbers in JSON.** Proxmox is written in Perl and can emit bare
  ``NaN``, ``Infinity`` and ``-Infinity`` (e.g. RRD values or ratios with a
  zero denominator). Python's ``json`` accepts them as ``float('nan')`` /
  ``float('inf')``, which then poison averages and comparisons, and
  ``flask.jsonify`` / ``json.dump`` write them back out as invalid JSON that
  browsers refuse to parse. We replace proxmoxer's serializer on the client so
  those values become ``None`` as they are parsed. Doing it at the client
  boundary (rather than when writing ``cluster_cache.json``) also covers the
  routes that return live Proxmox data directly (task status, storage, guest
  location) and the math the collector does before the cache is written.

* **Never replaying writes.** ``retry_read`` retries only idempotent reads.
  ``submit_migration`` sends a migrate POST exactly once: Proxmox keeps
  working on a request after the client stops waiting for it, so a resend
  after a timeout can start a second migration of the same guest. When the
  answer is lost, it looks for the task the first request started instead.
"""

import json
import logging
import math
import time
from typing import Any, Callable, Dict, Optional, Tuple, TypeVar, Union

from proxbalance.pve_errors import (
    NETWORK,
    READ_TIMEOUT,
    classify_pve_error,
    describe_pve_error,
    is_transient,
)

logger = logging.getLogger(__name__)

T = TypeVar("T")

Timeout = Union[float, Tuple[float, float]]

# (connect, read) in seconds, as accepted by requests.
PVE_CONNECT_TIMEOUT = 5
PVE_READ_TIMEOUT: Tuple[float, float] = (PVE_CONNECT_TIMEOUT, 8)
PVE_SLOW_READ_TIMEOUT: Tuple[float, float] = (PVE_CONNECT_TIMEOUT, 30)
PVE_WRITE_TIMEOUT: Tuple[float, float] = (PVE_CONNECT_TIMEOUT, 30)

# Proxmox task types for guest migration (qemu, lxc).
_MIGRATE_TASK_TYPES = {"VM": "qmigrate", "CT": "vzmigrate"}
# How far back, relative to our submit time, a found task may have started.
# Covers clock skew between this host and the node.
_TASK_LOOKUP_SKEW_SECONDS = 120
# Network failures that happen before the request is sent.
_NEVER_SENT_TEXT = (
    "connection refused",
    "econnrefused",
    "name or service not known",
    "name resolution",
    "failed to resolve",
    "no route to host",
    "network is unreachable",
    "host is unreachable",
)


class MigrationOutcomeUnknown(Exception):
    """A migrate POST was sent but its answer was lost.

    The migration may or may not be running. Callers must not resubmit; the
    operator (or the next automation run, after a fresh collection) should
    look at the Proxmox task log and the guest's current node.
    """


# ---------------------------------------------------------------------------
# JSON sanitising
# ---------------------------------------------------------------------------

def _finite_or_none(value: float) -> Optional[float]:
    return value if math.isfinite(value) else None


def _parse_constant(_name: str) -> None:
    # Called by json for the bare tokens NaN, Infinity and -Infinity.
    return None


def _parse_float(text: str) -> Optional[float]:
    # Literals like 1e999 overflow to inf without going through parse_constant.
    return _finite_or_none(float(text))


def loads_pve_json(text: str) -> Any:
    """Parse JSON from Proxmox, turning NaN/Infinity/-Infinity into None.

    Args:
        text: The JSON document.

    Returns:
        The parsed object with every non-finite number replaced by None.
    """
    return json.loads(text, parse_constant=_parse_constant, parse_float=_parse_float)


def sanitize_floats(obj: Any) -> Any:
    """Return ``obj`` with every non-finite float (nan, inf, -inf) set to None.

    Args:
        obj: A JSON-like structure of dicts, lists, tuples and scalars.

    Returns:
        A structure of the same shape. Containers are copied only when a value
        inside them changes.
    """
    if isinstance(obj, float):
        return _finite_or_none(obj)
    if isinstance(obj, dict):
        return {key: sanitize_floats(value) for key, value in obj.items()}
    if isinstance(obj, (list, tuple)):
        return type(obj)(sanitize_floats(value) for value in obj)
    return obj


def _make_serializer_class() -> Optional[type]:
    """Build a subclass of proxmoxer's JsonSerializer that sanitises numbers."""
    try:
        from proxmoxer.backends.https import JsonSerializer
    except ImportError:  # proxmoxer missing or layout changed
        return None

    class SanitizingJsonSerializer(JsonSerializer):
        """proxmoxer serializer that maps NaN/Infinity to None while parsing."""

        def loads(self, response):
            try:
                return loads_pve_json(response.content.decode("utf-8"))["data"]
            except (UnicodeDecodeError, ValueError):
                return {"errors": response.content}

        def loads_errors(self, response):
            try:
                return loads_pve_json(response.text).get("errors")
            except (UnicodeDecodeError, ValueError):
                return {"errors": response.content}

    return SanitizingJsonSerializer


def install_sanitizing_serializer(client: Any) -> bool:
    """Swap a ProxmoxAPI client's JSON serializer for the sanitising one.

    Every resource proxmoxer derives from the client (``client.nodes(n)...``)
    copies the client's ``_store``, so replacing it once covers all calls.

    Args:
        client: A ``proxmoxer.ProxmoxAPI`` instance.

    Returns:
        True when installed; False when the client does not look like the
        proxmoxer https backend (it then keeps proxmoxer's own parsing).
    """
    store = getattr(client, "_store", None)
    serializer_cls = _make_serializer_class()
    if not isinstance(store, dict) or "serializer" not in store or serializer_cls is None:
        logger.warning("Proxmox client: cannot install NaN-safe JSON parsing; using proxmoxer default")
        return False
    store["serializer"] = serializer_cls()
    return True


# ---------------------------------------------------------------------------
# Client construction
# ---------------------------------------------------------------------------

def build_proxmox_client(
    host: str,
    *,
    port: int = 8006,
    verify_ssl: bool = False,
    token_id: Optional[str] = None,
    token_secret: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
    timeout: Optional[Timeout] = None,
    **kwargs: Any,
) -> Any:
    """Create a ProxmoxAPI client with explicit timeouts and NaN-safe parsing.

    Args:
        host: Proxmox host name or IP.
        port: API port.
        verify_ssl: Verify the TLS certificate.
        token_id: API token id, ``user@realm!tokenname``. Takes precedence
            over username/password.
        token_secret: API token secret.
        username: User for password auth.
        password: Password for password auth.
        timeout: ``(connect, read)`` tuple or a single number of seconds.
            Defaults to ``PVE_READ_TIMEOUT``.
        **kwargs: Passed through to ``ProxmoxAPI``.

    Returns:
        A ``proxmoxer.ProxmoxAPI`` instance.

    Raises:
        ValueError: If no usable credentials are given.
    """
    from proxmoxer import ProxmoxAPI

    if timeout is None:
        timeout = PVE_READ_TIMEOUT

    if token_id and token_secret:
        if "!" not in token_id:
            raise ValueError(f"Invalid token ID format: {token_id}. Expected format: user@realm!tokenname")
        user, token_name = token_id.split("!", 1)
        client = ProxmoxAPI(
            host,
            user=user,
            token_name=token_name,
            token_value=token_secret,
            port=port,
            verify_ssl=verify_ssl,
            timeout=timeout,
            **kwargs,
        )
    elif username and password:
        client = ProxmoxAPI(
            host,
            user=username,
            password=password,
            port=port,
            verify_ssl=verify_ssl,
            timeout=timeout,
            **kwargs,
        )
    else:
        raise ValueError("No Proxmox credentials configured (API token or username/password).")

    install_sanitizing_serializer(client)
    return client


# ---------------------------------------------------------------------------
# Retrying reads, never writes
# ---------------------------------------------------------------------------

def retry_read(
    read: Callable[[], T],
    *,
    what: str,
    attempts: int = 2,
    delay: float = 2.0,
    sleep: Optional[Callable[[float], None]] = None,
) -> T:
    """Call an idempotent Proxmox read, retrying transient failures.

    Only pass GETs here. Writes (POST/PUT/DELETE) must never go through a
    retry: Proxmox keeps applying a request after the client gave up waiting,
    so a retried write can be applied twice.

    Args:
        read: Zero-argument callable performing one GET.
        what: Short description for log lines (``"cluster status"``).
        attempts: Total attempts, including the first.
        delay: Seconds to wait between attempts.
        sleep: Sleep function (injectable for tests); defaults to time.sleep.

    Returns:
        Whatever ``read`` returns.

    Raises:
        The last exception when every attempt failed, or immediately for
        non-transient failures (auth, 4xx).
    """
    for attempt in range(1, attempts + 1):
        try:
            return read()
        except Exception as exc:
            final = attempt >= attempts or not is_transient(exc)
            logger.warning(
                "Proxmox read failed (%s, attempt %d/%d): %s",
                what, attempt, attempts, describe_pve_error(exc),
            )
            if final:
                raise
            (sleep or time.sleep)(delay)
    raise AssertionError("unreachable")  # pragma: no cover


def _find_started_migration(
    proxmox: Any, source: str, vmid: Union[int, str], guest_type: str, submitted_at: float,
) -> Optional[str]:
    """Look for the migrate task a lost POST may have started. GET only.

    Returns:
        The task's UPID, or None when none is found or the lookup failed.
    """
    task_type = _MIGRATE_TASK_TYPES.get(guest_type, "qmigrate")
    try:
        tasks = proxmox.nodes(source).tasks.get(
            vmid=vmid, typefilter=task_type, source="all", limit=20,
        ) or []
    except Exception as exc:
        logger.warning("Could not read task list on %s to confirm migration of %s: %s",
                       source, vmid, describe_pve_error(exc))
        return None

    earliest = submitted_at - _TASK_LOOKUP_SKEW_SECONDS
    candidates = [
        task for task in tasks
        if str(task.get("id", vmid)) == str(vmid)
        and task.get("type", task_type) == task_type
        and (task.get("starttime") or 0) >= earliest
        and task.get("upid")
    ]
    if not candidates:
        return None
    newest = max(candidates, key=lambda task: task.get("starttime") or 0)
    return newest["upid"]


def submit_migration(
    proxmox: Any,
    source: str,
    vmid: Union[int, str],
    guest_type: str,
    params: Dict[str, Any],
    *,
    clock: Callable[[], float] = time.time,
) -> str:
    """Send one migrate POST and return the task UPID. Never retries.

    A migrate POST is not idempotent. If the client stops waiting (read
    timeout, dropped connection) Proxmox may already have queued the task and
    will carry on with it, so resending would start a second migration of the
    same guest. Instead, when the answer is lost, this reads the source
    node's task list (a GET) for a migrate task of this guest started around
    now and returns its UPID. If none can be found the outcome is reported as
    unknown and the caller must not resubmit.

    Args:
        proxmox: ProxmoxAPI client (ideally built with ``PVE_WRITE_TIMEOUT``).
        source: Node the guest is on.
        vmid: Guest id.
        guest_type: ``"VM"`` (qemu) or ``"CT"`` (lxc).
        params: POST body, e.g. ``{"target": "pve4", "online": 1}``.
        clock: Time source (injectable for tests).

    Returns:
        The UPID of the migration task.

    Raises:
        MigrationOutcomeUnknown: The request may have been applied but no task
            could be confirmed.
        Exception: The original error when the request certainly did not
            start a migration (connect timeout, refused connection, auth or
            an HTTP error from Proxmox).
    """
    guest = proxmox.nodes(source).qemu(vmid) if guest_type == "VM" else proxmox.nodes(source).lxc(vmid)
    submitted_at = clock()
    try:
        # Deliberately a single call, outside any retry loop.
        return guest.migrate.post(**params)
    except Exception as exc:
        kind = classify_pve_error(exc)
        message = str(exc).lower()
        never_sent = kind == NETWORK and any(token in message for token in _NEVER_SENT_TEXT)
        if kind not in (READ_TIMEOUT, NETWORK) or never_sent:
            # Rejected by Proxmox (auth, HTTP error), or the connection was
            # never made (connect timeout, refused, DNS): nothing started.
            raise
        # The request may have reached Proxmox. Find out; do not resend.
        upid = _find_started_migration(proxmox, source, vmid, guest_type, submitted_at)
        if upid:
            logger.warning(
                "Migrate POST for %s %s lost its answer (%s) but Proxmox started task %s; not resending",
                guest_type, vmid, kind, upid,
            )
            return upid
        raise MigrationOutcomeUnknown(
            f"Migration request for {guest_type} {vmid} on {source} got no answer ({describe_pve_error(exc)}) "
            f"and no matching task was found. It was NOT resent: check the Proxmox task log and the "
            f"guest's current node before trying again."
        ) from exc
