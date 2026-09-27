"""
Secret handling for config endpoints.

GET endpoints must never return credentials, so secret fields are replaced by
a placeholder. The UI then sends that placeholder back unchanged when the user
didn't edit the field; POST handlers must restore the stored value instead of
saving the placeholder over the real secret.
"""

import copy
from typing import Any, Dict

SECRET_PLACEHOLDER = '***'

# Root-level config fields that hold credentials
SECRET_ROOT_FIELDS = frozenset({
    'proxmox_api_token_secret',
    'proxmox_password',
})

# Fields inside ai_config.<provider>
SECRET_AI_FIELDS = frozenset({
    'api_key',
})

# Fields inside notifications.providers.<provider>
SECRET_NOTIFICATION_FIELDS = frozenset({
    'api_token',
    'user_key',
    'bot_token',
    'webhook_url',
    'smtp_password',
    'password',
})


def _redact_fields(section: Dict, fields: frozenset) -> Dict:
    out = dict(section)
    for field in fields:
        if out.get(field):
            out[field] = SECRET_PLACEHOLDER
    return out


def _redact_providers(providers: Dict, fields: frozenset) -> Dict:
    return {
        name: _redact_fields(cfg, fields) if isinstance(cfg, dict) else cfg
        for name, cfg in providers.items()
    }


def redact_notifications(notifications: Any) -> Any:
    """Return a copy of a notifications block with provider secrets hidden."""
    if not isinstance(notifications, dict):
        return notifications
    out = dict(notifications)
    if isinstance(out.get('providers'), dict):
        out['providers'] = _redact_providers(out['providers'], SECRET_NOTIFICATION_FIELDS)
    return out


def redact_automation_config(auto_config: Dict) -> Dict:
    """Return a copy of config['automated_migrations'] safe to send to clients."""
    out = dict(auto_config or {})
    if 'notifications' in out:
        out['notifications'] = redact_notifications(out['notifications'])
    return out


def redact_config(config: Dict) -> Dict:
    """Return a copy of the full config with every known secret hidden.

    Notifications live under automated_migrations; a legacy root-level
    notifications block is redacted too.
    """
    out = _redact_fields(config, SECRET_ROOT_FIELDS)
    if isinstance(out.get('ai_config'), dict):
        out['ai_config'] = _redact_providers(out['ai_config'], SECRET_AI_FIELDS)
    if 'notifications' in out:
        out['notifications'] = redact_notifications(out['notifications'])
    if isinstance(out.get('automated_migrations'), dict):
        out['automated_migrations'] = redact_automation_config(out['automated_migrations'])
    return out


def restore_placeholders(incoming: Any, existing: Any) -> Any:
    """Replace placeholder values in an update with the stored values.

    Walks ``incoming`` recursively; wherever a value equals the placeholder and
    ``existing`` has a value at the same path, the stored value is used. A
    placeholder with nothing stored behind it becomes an empty string so it is
    never persisted literally.

    Args:
        incoming: The update payload (not modified).
        existing: The currently stored config at the same level.

    Returns:
        A new payload safe to merge into the stored config.
    """
    if isinstance(incoming, dict):
        base = existing if isinstance(existing, dict) else {}
        return {k: restore_placeholders(v, base.get(k)) for k, v in incoming.items()}
    if incoming == SECRET_PLACEHOLDER:
        return existing if isinstance(existing, str) and existing else ''
    return copy.deepcopy(incoming)
