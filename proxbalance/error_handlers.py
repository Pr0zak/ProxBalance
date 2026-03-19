"""
ProxBalance Centralized Error Handling

Provides Flask error handlers, a route decorator for automatic exception
handling, and helper functions for consistent JSON response formatting.

Usage:
    # In app.py:
    from proxbalance.error_handlers import register_error_handlers
    register_error_handlers(app)

    # In route handlers (optional decorator):
    from proxbalance.error_handlers import api_route

    @bp.route('/api/something')
    @api_route
    def get_something():
        result = do_work()
        return api_success(result)
"""

import sys
import traceback
import functools
from flask import jsonify, request


def api_success(data=None, **kwargs):
    """Build a successful JSON response.

    Args:
        data: Optional data payload.
        **kwargs: Additional fields to include in the response.

    Returns:
        Flask JSON response with success=True.
    """
    response = {"success": True}
    if data is not None:
        response["data"] = data
    response.update(kwargs)
    return jsonify(response)


def api_error(message, status_code=500, **kwargs):
    """Build an error JSON response.

    Args:
        message: Error description string.
        status_code: HTTP status code (default 500).
        **kwargs: Additional fields to include in the response.

    Returns:
        Tuple of (Flask JSON response, status_code).
    """
    response = {"success": False, "error": str(message)}
    response.update(kwargs)
    return jsonify(response), status_code


def api_route(f):
    """Decorator that wraps a route handler with automatic exception handling.

    Catches unhandled exceptions and returns a standardized JSON error
    response. Inner try/except blocks in the handler are preserved.

    Usage:
        @bp.route('/api/something')
        @api_route
        def get_something():
            return api_success(data={"key": "value"})
    """
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except Exception as e:
            print(f"[{request.method} {request.path}] Unhandled error: {e}", file=sys.stderr)
            traceback.print_exc(file=sys.stderr)
            return api_error(str(e), 500)
    return decorated


def register_error_handlers(app):
    """Register Flask-level error handlers for common HTTP errors.

    These catch errors that occur outside of route handlers (404 for missing
    routes, 405 for wrong methods, etc.) and return consistent JSON responses.

    Args:
        app: Flask application instance.
    """
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            "success": False,
            "error": f"Not found: {request.path}"
        }), 404

    @app.errorhandler(405)
    def method_not_allowed(error):
        return jsonify({
            "success": False,
            "error": f"Method {request.method} not allowed for {request.path}"
        }), 405

    @app.errorhandler(500)
    def internal_error(error):
        print(f"Internal server error: {error}", file=sys.stderr)
        traceback.print_exc(file=sys.stderr)
        return jsonify({
            "success": False,
            "error": "Internal server error"
        }), 500
