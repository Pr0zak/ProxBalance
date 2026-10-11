"""
Classify failures from Proxmox API calls into a small set of kinds.

The collector, the migration code and the routes all catch broad
``Exception`` around proxmoxer calls. Before this module their logs said
only "Failed to fetch X: <message>", which made a dead node, a slow node,
a revoked token and a broken storage backend look alike. ``classify_pve_error``
maps an exception to one of:

``network``          The TCP connection could not be made or was dropped:
                     connection refused, host/network unreachable, reset,
                     DNS failure.
``connect_timeout``  No TCP connection within the connect timeout. The
                     request was never sent.
``read_timeout``     Connected and sent the request, but no answer within the
                     read timeout. For a write the server may still apply it.
``auth``             HTTP 401/403 (bad, expired or under-privileged token).
``application``      Any other HTTP error that came with a response. The API
                     host is alive; the request failed inside Proxmox.
``unknown``          Anything else.

HTTP responses are checked FIRST. A 500 whose body mentions ``ECONNREFUSED``
(for example a broken NFS or PBS storage backend behind
``/nodes/{node}/storage``) is an ``application`` failure on a live host, not a
dead host, and must not be treated as one.

This module is pure: it imports nothing from proxmoxer or requests, so it
works on wrapped exceptions, on fakes in tests and when those libraries are
missing.
"""

import errno
import re
import socket
from typing import Optional

NETWORK = "network"
CONNECT_TIMEOUT = "connect_timeout"
READ_TIMEOUT = "read_timeout"
AUTH = "auth"
APPLICATION = "application"
UNKNOWN = "unknown"

ERROR_KINDS = (NETWORK, CONNECT_TIMEOUT, READ_TIMEOUT, AUTH, APPLICATION, UNKNOWN)

# Kinds where an idempotent read is worth one more attempt.
TRANSIENT_KINDS = frozenset({NETWORK, CONNECT_TIMEOUT, READ_TIMEOUT})

_NETWORK_ERRNOS = {
    errno.ECONNREFUSED,
    errno.ECONNRESET,
    errno.ECONNABORTED,
    errno.EHOSTUNREACH,
    errno.ENETUNREACH,
    errno.EHOSTDOWN,
    errno.ENETDOWN,
    errno.EPIPE,
}

# "500 Internal Server Error: ..." as produced by proxmoxer's ResourceException,
# possibly wrapped in "Failed to fetch X: ...".
_HTTP_STATUS_IN_TEXT = re.compile(r"(?:^|:\s)([1-5]\d{2}) [A-Za-z][^:]*:")

_CONNECT_TIMEOUT_TEXT = ("connecttimeout", "connection to", "timed out. (connect timeout")
_READ_TIMEOUT_TEXT = ("read timed out", "readtimeout", "read timeout")
_NETWORK_TEXT = (
    "connection refused",
    "econnrefused",
    "no route to host",
    "network is unreachable",
    "host is unreachable",
    "connection reset",
    "connection aborted",
    "remote end closed connection",
    "remotedisconnected",
    "name or service not known",
    "temporary failure in name resolution",
    "nodename nor servname",
    "failed to resolve",
    "name resolution",
    "max retries exceeded",
    "broken pipe",
)


def _http_status(exc: BaseException) -> Optional[int]:
    """Return the HTTP status carried by an exception, if any.

    Handles proxmoxer's ``ResourceException`` (``status_code``) and
    requests' ``HTTPError`` (``response.status_code``).
    """
    status = getattr(exc, "status_code", None)
    if isinstance(status, int):
        return status
    response = getattr(exc, "response", None)
    status = getattr(response, "status_code", None) if response is not None else None
    if isinstance(status, int):
        return status
    return None


def _kind_from_type(exc: BaseException) -> Optional[str]:
    """Classify by exception type and errno. Returns None when undecided."""
    names = {cls.__name__ for cls in type(exc).__mro__}

    if "AuthenticationError" in names:
        return AUTH
    # requests: ConnectTimeout subclasses both ConnectionError and Timeout,
    # so it has to be checked before either.
    if "ConnectTimeout" in names or "ConnectTimeoutError" in names:
        return CONNECT_TIMEOUT
    if "ReadTimeout" in names or "ReadTimeoutError" in names:
        return READ_TIMEOUT
    if isinstance(exc, socket.gaierror):
        return NETWORK
    if isinstance(exc, (ConnectionRefusedError, ConnectionResetError,
                        ConnectionAbortedError, BrokenPipeError)):
        return NETWORK
    if isinstance(exc, OSError) and getattr(exc, "errno", None) in _NETWORK_ERRNOS:
        return NETWORK
    if isinstance(exc, TimeoutError):
        # A bare socket timeout after connecting; a connect-phase timeout
        # arrives as ConnectTimeout from requests.
        return CONNECT_TIMEOUT if "connect" in str(exc).lower() else READ_TIMEOUT
    if "ConnectionError" in names or "NewConnectionError" in names:
        # requests/urllib3 connection failures. The message tells a read
        # timeout raised while streaming the body apart from a real network
        # failure.
        return _kind_from_text(str(exc)) or NETWORK
    if "Timeout" in names:
        return READ_TIMEOUT
    return None


def _kind_from_text(text: str) -> Optional[str]:
    """Classify by message text, for exceptions re-wrapped as plain Exception."""
    lowered = text.lower()
    match = _HTTP_STATUS_IN_TEXT.search(text)
    if match:
        status = int(match.group(1))
        return AUTH if status in (401, 403) else APPLICATION
    if any(token in lowered for token in _READ_TIMEOUT_TEXT):
        return READ_TIMEOUT
    if any(token in lowered for token in _CONNECT_TIMEOUT_TEXT) and "timed out" in lowered:
        return CONNECT_TIMEOUT
    if any(token in lowered for token in _NETWORK_TEXT):
        return NETWORK
    return None


def _chain(exc: BaseException):
    """Yield the exception and its causes/contexts, outermost first."""
    seen = set()
    current: Optional[BaseException] = exc
    while current is not None and id(current) not in seen:
        seen.add(id(current))
        yield current
        current = current.__cause__ or current.__context__


def classify_pve_error(exc: BaseException) -> str:
    """Classify an exception raised by a Proxmox API call.

    Args:
        exc: The exception, possibly wrapped (``raise X from e`` or a plain
            ``Exception(f"...: {e}")``).

    Returns:
        One of ``ERROR_KINDS``.
    """
    chain = list(_chain(exc))

    # 1. An HTTP response anywhere in the chain wins: the host answered.
    for item in chain:
        status = _http_status(item)
        if status is not None:
            return AUTH if status in (401, 403) else APPLICATION

    # 2. Exception types (requests/urllib3/socket), outermost first.
    for item in chain:
        kind = _kind_from_type(item)
        if kind is not None:
            return kind

    # 3. Message text, for exceptions flattened into a string.
    for item in chain:
        kind = _kind_from_text(str(item))
        if kind is not None:
            return kind

    return UNKNOWN


def describe_pve_error(exc: BaseException) -> str:
    """Return ``"<kind>: <message>"`` for log lines.

    Args:
        exc: The exception to describe.

    Returns:
        A one-line string such as ``"read_timeout: HTTPSConnectionPool(...)"``.
    """
    return f"{classify_pve_error(exc)}: {exc}"


def is_transient(exc: BaseException) -> bool:
    """True when a failed idempotent read is worth retrying.

    Args:
        exc: The exception from the failed read.

    Returns:
        True for network failures and timeouts, and for HTTP 5xx responses;
        False for auth failures, other 4xx responses and unknown errors.
    """
    kind = classify_pve_error(exc)
    if kind in TRANSIENT_KINDS:
        return True
    if kind == APPLICATION:
        for item in _chain(exc):
            status = _http_status(item)
            if status is not None:
                return status >= 500
        match = _HTTP_STATUS_IN_TEXT.search(str(exc))
        return bool(match and int(match.group(1)) >= 500)
    return False
