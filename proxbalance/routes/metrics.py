"""
Prometheus metrics endpoint.

``GET /api/metrics`` returns the Prometheus text exposition format built from
data ProxBalance already holds (cluster cache, config, SQLite). It never calls
the Proxmox API. It deliberately does not use ``@api_route``: the body is plain
text, not the JSON envelope, and a failure returns a minimal ``proxbalance_up 0``
body with status 503 instead of a JSON error.
"""

import os
import sys
import threading
import time
from typing import Optional

from flask import Blueprint, Response, current_app

from proxbalance.config_manager import BASE_PATH, load_config
from proxbalance.prometheus import (
    CONTENT_TYPE, build_snapshot, format_metrics, unavailable_body,
)

metrics_bp = Blueprint("metrics", __name__)

# get_version_info() shells out to git several times; scrapes come every
# 15-60 s, so remember the answer for a few minutes.
_VERSION_TTL_SECONDS = 300
_version_lock = threading.Lock()
_version_cache = {"value": None, "at": 0.0}


def _version() -> Optional[str]:
    """Return the running version string, cached for ``_VERSION_TTL_SECONDS``."""
    with _version_lock:
        now = time.monotonic()
        if _version_cache["value"] is not None and now - _version_cache["at"] < _VERSION_TTL_SECONDS:
            return _version_cache["value"]
        manager = current_app.config.get("update_manager")
        if manager is None:
            return None
        try:
            value = manager.get_version_info().get("version")
        except Exception as e:
            print(f"metrics: version unavailable: {e}", file=sys.stderr)
            return None
        if not value or value == "unknown":
            return None
        _version_cache["value"] = value
        _version_cache["at"] = now
        return value


@metrics_bp.route("/api/metrics", methods=["GET"])
def prometheus_metrics() -> Response:
    """Serve ProxBalance metrics in Prometheus text exposition format 0.0.4."""
    try:
        cache_manager = current_app.config.get("cache_manager")
        cache = cache_manager.get() if cache_manager is not None else None
        snapshot = build_snapshot(
            cache=cache,
            config=load_config(),
            version=_version(),
            recommendations_file=os.path.join(BASE_PATH, "recommendations_cache.json"),
        )
        return Response(format_metrics(snapshot), status=200, content_type=CONTENT_TYPE)
    except Exception as e:
        print(f"metrics: scrape failed: {e}", file=sys.stderr)
        return Response(unavailable_body("metrics unavailable"), status=503,
                        content_type=CONTENT_TYPE)
