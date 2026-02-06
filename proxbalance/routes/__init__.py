"""
Flask Blueprint route modules for the ProxBalance API.

All blueprints are registered with no url_prefix since routes
already include their full paths (e.g. /api/config).
"""


def register_blueprints(app):
    """Register all route blueprints with the Flask app."""
    from proxbalance.routes.analysis import analysis_bp
    from proxbalance.routes.recommendations import recommendations_bp
    from proxbalance.routes.migrations import migrations_bp
    from proxbalance.routes.evacuation import evacuation_bp
    from proxbalance.routes.config import config_bp
    from proxbalance.routes.penalty import penalty_bp
    from proxbalance.routes.system import system_bp
    from proxbalance.routes.guests import guests_bp
    from proxbalance.routes.automation import automation_bp
    from proxbalance.routes.notifications import notifications_bp

    app.register_blueprint(analysis_bp)
    app.register_blueprint(recommendations_bp)
    app.register_blueprint(migrations_bp)
    app.register_blueprint(evacuation_bp)
    app.register_blueprint(config_bp)
    app.register_blueprint(penalty_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(guests_bp)
    app.register_blueprint(automation_bp)
    app.register_blueprint(notifications_bp)
