"""
ProxBalance CSRF protection

One app-wide ``before_request`` check that blocks state-changing API
requests (POST, PUT, PATCH, DELETE under ``/api/``) sent by a browser on
behalf of another site. It needs no token and no frontend change: the
app's own UI calls the API with same-origin ``fetch()``, which browsers
label ``Sec-Fetch-Site: same-origin``.

Decision order for a mutating ``/api/`` request:

1. ``csrf_protection`` is false in config.json -> allowed.
2. ``/api/health`` -> allowed (exempt).
3. A valid ``api_key`` is sent as a header -> allowed. A page on another
   site cannot attach a custom header to a cross-site request without a
   CORS preflight, which the CORS policy refuses, so header auth cannot
   be forged by a victim's browser.
4. ``Sec-Fetch-Site`` present -> ``same-origin`` and ``none`` (typed URL,
   bookmark) are allowed; ``same-site`` and ``cross-site`` get 403.
5. Otherwise ``Origin`` present -> it must equal the origin the client
   used to reach the app, or be listed in ``cors_origins``; else 403.
6. Neither header (curl, scripts, the systemd services, the MCP server)
   -> allowed. These cannot come from a victim's browser, because every
   current browser sends at least one of the two on a cross-site POST.

The request's own origin is rebuilt from what the client saw. Behind a
reverse proxy that is ``X-Forwarded-Proto`` / ``X-Forwarded-Host`` when
present (Nginx Proxy Manager sets ``X-Forwarded-Proto``, and the bundled
nginx passes it through along with ``Host``), and the plain scheme and
``Host`` header otherwise. Trusting those headers is safe here: a
cross-site page cannot set them without a preflight either.
"""

import hmac
from typing import Callable, Dict, Iterable, List, Optional, Set, Tuple
from urllib.parse import urlsplit

from flask import Flask, jsonify, request

PROTECTED_METHODS = frozenset({'POST', 'PUT', 'PATCH', 'DELETE'})
EXEMPT_PATHS = frozenset({'/api/health'})
ALLOWED_FETCH_SITES = frozenset({'same-origin', 'none'})
BLOCK_MESSAGE = 'Cross-site request blocked'

_DEFAULT_PORTS = {'http': 80, 'https': 443}


def provided_api_key() -> str:
    """Return the API key sent with the current request, or ''.

    Accepts ``X-API-Key: <key>`` or ``Authorization: Bearer <key>``.
    """
    provided = request.headers.get('X-API-Key', '')
    if not provided:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            provided = auth_header[7:]
    return provided


def api_key_matches(api_key: str) -> bool:
    """True when ``api_key`` is set and the request carries exactly it."""
    provided = provided_api_key()
    return bool(api_key) and bool(provided) and hmac.compare_digest(provided, api_key)


def _first(value: Optional[str]) -> str:
    """First entry of a comma-separated forwarded header, stripped."""
    if not value:
        return ''
    return value.split(',')[0].strip()


def _normalize(scheme: str, netloc: str) -> Optional[Tuple[str, str, int]]:
    """Normalize ``scheme`` + ``host[:port]`` to (scheme, host, port).

    Lower-cases scheme and host and fills in the default port, so that
    ``https://Host`` and ``https://host:443`` compare equal. Returns None
    for anything that cannot be parsed.
    """
    scheme = (scheme or '').lower()
    if not scheme or not netloc:
        return None
    try:
        parts = urlsplit(f'{scheme}://{netloc}')
        host = (parts.hostname or '').lower()
        port = parts.port
    except ValueError:
        return None
    if not host:
        return None
    if port is None:
        port = _DEFAULT_PORTS.get(scheme)
    if port is None:
        return None
    return scheme, host, port


def _parse_origin(origin: str) -> Optional[Tuple[str, str, int]]:
    """Parse an ``Origin`` header value (``scheme://host[:port]``)."""
    try:
        parts = urlsplit(origin.strip())
    except ValueError:
        return None
    return _normalize(parts.scheme, parts.netloc)


def request_origins() -> Set[Tuple[str, str, int]]:
    """The origins the client may have used to reach this request.

    Combines the forwarded and direct scheme with the forwarded and
    direct host, so the check works both through a TLS-terminating
    reverse proxy and when the app is opened directly on the LAN.
    """
    schemes = {request.scheme}
    fwd_proto = _first(request.headers.get('X-Forwarded-Proto'))
    if fwd_proto:
        schemes.add(fwd_proto)
    hosts = set()
    if request.host:
        hosts.add(request.host)
    fwd_host = _first(request.headers.get('X-Forwarded-Host'))
    if fwd_host:
        hosts.add(fwd_host)
    result = set()
    for scheme in schemes:
        for host in hosts:
            norm = _normalize(scheme, host)
            if norm:
                result.add(norm)
    return result


def _configured_origins(cors_origins) -> Tuple[bool, List[Tuple[str, str, int]]]:
    """Return (allow_any, parsed origins) from the ``cors_origins`` setting."""
    if isinstance(cors_origins, str):
        cors_origins = [cors_origins]
    if not isinstance(cors_origins, Iterable):
        return False, []
    allow_any = False
    parsed = []
    for entry in cors_origins:
        if not isinstance(entry, str):
            continue
        if entry.strip() == '*':
            allow_any = True
            continue
        norm = _parse_origin(entry)
        if norm:
            parsed.append(norm)
    return allow_any, parsed


def origin_allowed(origin: str, cors_origins=None) -> bool:
    """True when ``origin`` is the request's own origin or a configured one."""
    parsed = _parse_origin(origin)
    if parsed is None:
        # Includes the opaque "null" origin (sandboxed frames, some redirects).
        return False
    if parsed in request_origins():
        return True
    allow_any, allowed = _configured_origins(cors_origins or [])
    return allow_any or parsed in allowed


def _blocked():
    return jsonify({"success": False, "error": True, "message": BLOCK_MESSAGE}), 403


def check_csrf(cfg: Dict):
    """Run the CSRF check for the current request.

    Args:
        cfg: The loaded config.json (a dict with ``error`` on load failure,
            in which case the defaults apply: protection on, no api_key,
            no extra origins).

    Returns:
        None to let the request through, or a 403 JSON response.
    """
    if request.method not in PROTECTED_METHODS:
        return None
    if not request.path.startswith('/api/') or request.path in EXEMPT_PATHS:
        return None
    if cfg.get('error'):
        cfg = {}
    if cfg.get('csrf_protection', True) is False:
        return None
    if api_key_matches(cfg.get('api_key', '') or ''):
        return None

    fetch_site = request.headers.get('Sec-Fetch-Site')
    if fetch_site is not None:
        if fetch_site.strip().lower() in ALLOWED_FETCH_SITES:
            return None
        return _blocked()

    origin = request.headers.get('Origin')
    if origin is not None:
        if origin_allowed(origin, cfg.get('cors_origins', [])):
            return None
        return _blocked()

    return None


def register_csrf_protection(app: Flask, config_loader: Callable[[], Dict]) -> None:
    """Install the CSRF check as a ``before_request`` hook on ``app``.

    Args:
        app: The Flask application.
        config_loader: Callable returning the current config dict; called
            only for mutating ``/api/`` requests so settings changes apply
            without a restart.
    """
    @app.before_request
    def _csrf_guard():
        if request.method not in PROTECTED_METHODS or not request.path.startswith('/api/'):
            return None
        return check_csrf(config_loader())
