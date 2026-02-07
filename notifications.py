#!/usr/bin/env python3
"""
ProxBalance Notification System

Multi-provider notification system supporting Pushover, Email (SMTP),
Telegram, Discord, Slack, and generic Webhooks.
"""

import json
import logging
import smtplib
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Base class
# ---------------------------------------------------------------------------

class NotificationProvider(ABC):
    """Abstract base class for notification providers."""

    @abstractmethod
    def send(self, title: str, message: str, priority: str = "normal") -> bool:
        """
        Send a notification.

        Args:
            title: Short title / subject
            message: Body text
            priority: "low", "normal", "high", "emergency"

        Returns:
            True if sent successfully
        """
        pass

    @abstractmethod
    def validate_config(self) -> tuple:
        """
        Validate provider configuration.

        Returns:
            (is_valid: bool, error_message: str)
        """
        pass


# ---------------------------------------------------------------------------
# Pushover
# ---------------------------------------------------------------------------

class PushoverProvider(NotificationProvider):
    """Pushover notification provider (https://pushover.net)."""

    API_URL = "https://api.pushover.net/1/messages.json"

    PRIORITY_MAP = {
        "low": -1,
        "normal": 0,
        "high": 1,
        "emergency": 2,
    }

    def __init__(self, config: Dict[str, Any]):
        self.api_token = config.get("api_token", "")
        self.user_key = config.get("user_key", "")
        self.priority = config.get("priority", 0)
        self.sound = config.get("sound", "pushover")
        self.device = config.get("device", "")

    def send(self, title: str, message: str, priority: str = "normal") -> bool:
        numeric_priority = self.PRIORITY_MAP.get(priority, self.priority)

        payload = {
            "token": self.api_token,
            "user": self.user_key,
            "title": title,
            "message": message,
            "priority": numeric_priority,
            "sound": self.sound,
        }

        if self.device:
            payload["device"] = self.device

        # Emergency priority requires retry/expire params
        if numeric_priority == 2:
            payload["retry"] = 60
            payload["expire"] = 3600

        resp = requests.post(self.API_URL, data=payload, timeout=10)
        resp.raise_for_status()
        return True

    def validate_config(self) -> tuple:
        if not self.api_token:
            return False, "Pushover API token is required"
        if not self.user_key:
            return False, "Pushover user key is required"
        return True, ""


# ---------------------------------------------------------------------------
# Email (SMTP)
# ---------------------------------------------------------------------------

class EmailProvider(NotificationProvider):
    """Email notification provider via SMTP."""

    def __init__(self, config: Dict[str, Any]):
        self.smtp_host = config.get("smtp_host", "")
        self.smtp_port = int(config.get("smtp_port", 587))
        self.smtp_username = config.get("smtp_username", "")
        self.smtp_password = config.get("smtp_password", "")
        self.smtp_tls = config.get("smtp_tls", True)
        self.from_address = config.get("from_address", "")
        self.to_addresses = config.get("to_addresses", [])
        if isinstance(self.to_addresses, str):
            self.to_addresses = [a.strip() for a in self.to_addresses.split(",") if a.strip()]

    def send(self, title: str, message: str, priority: str = "normal") -> bool:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"[ProxBalance] {title}"
        msg["From"] = self.from_address
        msg["To"] = ", ".join(self.to_addresses)

        if priority == "high" or priority == "emergency":
            msg["X-Priority"] = "1"

        # Plain text body
        msg.attach(MIMEText(message, "plain"))

        # Simple HTML body
        html_message = message.replace("\n", "<br>")
        html = f"""<html><body>
<h2 style="color:#2563eb;">ProxBalance - {title}</h2>
<div style="font-family:monospace;white-space:pre-wrap;">{html_message}</div>
<hr><p style="color:#888;font-size:12px;">Sent by ProxBalance Notification System</p>
</body></html>"""
        msg.attach(MIMEText(html, "html"))

        if self.smtp_tls:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15)
            server.starttls()
        else:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15)

        if self.smtp_username and self.smtp_password:
            server.login(self.smtp_username, self.smtp_password)

        server.sendmail(self.from_address, self.to_addresses, msg.as_string())
        server.quit()
        return True

    def validate_config(self) -> tuple:
        if not self.smtp_host:
            return False, "SMTP host is required"
        if not self.from_address:
            return False, "From address is required"
        if not self.to_addresses:
            return False, "At least one recipient address is required"
        return True, ""


# ---------------------------------------------------------------------------
# Telegram
# ---------------------------------------------------------------------------

class TelegramProvider(NotificationProvider):
    """Telegram Bot notification provider."""

    API_URL = "https://api.telegram.org/bot{token}/sendMessage"

    def __init__(self, config: Dict[str, Any]):
        self.bot_token = config.get("bot_token", "")
        self.chat_id = config.get("chat_id", "")

    def send(self, title: str, message: str, priority: str = "normal") -> bool:
        url = self.API_URL.format(token=self.bot_token)

        priority_emoji = {"low": "", "normal": "", "high": "\u26a0\ufe0f ", "emergency": "\U0001f6a8 "}
        prefix = priority_emoji.get(priority, "")

        text = f"*{prefix}{self._escape_md(title)}*\n\n{self._escape_md(message)}"

        payload = {
            "chat_id": self.chat_id,
            "text": text,
            "parse_mode": "MarkdownV2",
            "disable_web_page_preview": True,
        }

        resp = requests.post(url, json=payload, timeout=10)
        resp.raise_for_status()
        return True

    @staticmethod
    def _escape_md(text: str) -> str:
        """Escape special characters for Telegram MarkdownV2."""
        special = r"\_*[]()~`>#+-=|{}.!"
        for ch in special:
            text = text.replace(ch, f"\\{ch}")
        return text

    def validate_config(self) -> tuple:
        if not self.bot_token:
            return False, "Telegram bot token is required"
        if not self.chat_id:
            return False, "Telegram chat ID is required"
        return True, ""


# ---------------------------------------------------------------------------
# Discord
# ---------------------------------------------------------------------------

class DiscordProvider(NotificationProvider):
    """Discord webhook notification provider."""

    def __init__(self, config: Dict[str, Any]):
        self.webhook_url = config.get("webhook_url", "")

    def send(self, title: str, message: str, priority: str = "normal") -> bool:
        color_map = {
            "low": 0x6B7280,       # gray
            "normal": 0x2563EB,    # blue
            "high": 0xF59E0B,      # amber
            "emergency": 0xEF4444, # red
        }

        payload = {
            "embeds": [{
                "title": title,
                "description": message[:4096],
                "color": color_map.get(priority, 0x2563EB),
                "footer": {"text": "ProxBalance"},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }]
        }

        resp = requests.post(self.webhook_url, json=payload, timeout=10)
        resp.raise_for_status()
        return True

    def validate_config(self) -> tuple:
        if not self.webhook_url:
            return False, "Discord webhook URL is required"
        return True, ""


# ---------------------------------------------------------------------------
# Slack
# ---------------------------------------------------------------------------

class SlackProvider(NotificationProvider):
    """Slack incoming webhook notification provider."""

    def __init__(self, config: Dict[str, Any]):
        self.webhook_url = config.get("webhook_url", "")

    def send(self, title: str, message: str, priority: str = "normal") -> bool:
        color_map = {
            "low": "#6B7280",
            "normal": "#2563EB",
            "high": "#F59E0B",
            "emergency": "#EF4444",
        }

        payload = {
            "attachments": [{
                "color": color_map.get(priority, "#2563EB"),
                "title": title,
                "text": message,
                "footer": "ProxBalance",
                "ts": int(datetime.now(timezone.utc).timestamp()),
            }]
        }

        resp = requests.post(self.webhook_url, json=payload, timeout=10)
        resp.raise_for_status()
        return True

    def validate_config(self) -> tuple:
        if not self.webhook_url:
            return False, "Slack webhook URL is required"
        return True, ""


# ---------------------------------------------------------------------------
# Generic Webhook
# ---------------------------------------------------------------------------

class WebhookProvider(NotificationProvider):
    """Generic webhook notification provider (HTTP POST with JSON)."""

    def __init__(self, config: Dict[str, Any]):
        self.url = config.get("url", "")
        self.headers = config.get("headers", {})

    def send(self, title: str, message: str, priority: str = "normal") -> bool:
        payload = {
            "title": title,
            "message": message,
            "priority": priority,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "source": "ProxBalance",
        }

        headers = {"Content-Type": "application/json"}
        headers.update(self.headers)

        resp = requests.post(self.url, json=payload, headers=headers, timeout=10)
        resp.raise_for_status()
        return True

    def validate_config(self) -> tuple:
        if not self.url:
            return False, "Webhook URL is required"
        return True, ""


# ---------------------------------------------------------------------------
# Provider registry
# ---------------------------------------------------------------------------

PROVIDER_REGISTRY: Dict[str, type] = {
    "pushover": PushoverProvider,
    "email": EmailProvider,
    "telegram": TelegramProvider,
    "discord": DiscordProvider,
    "slack": SlackProvider,
    "webhook": WebhookProvider,
}


# ---------------------------------------------------------------------------
# NotificationManager
# ---------------------------------------------------------------------------

class NotificationManager:
    """
    Manages all configured notification providers and dispatches messages.

    Usage:
        manager = NotificationManager(config)
        manager.notify("start", {
            "migration_count": 3,
            "dry_run": False,
            "window": "Nightly Window"
        })
    """

    def __init__(self, config: Dict[str, Any]):
        """
        Initialize from the full application config.

        Supports both the new multi-provider config format and the legacy
        webhook-only format for backward compatibility.
        """
        self.notifications_config = config.get("automated_migrations", {}).get("notifications", {})
        self.enabled = self.notifications_config.get("enabled", False)
        self.providers: List[NotificationProvider] = []

        if not self.enabled:
            return

        providers_config = self.notifications_config.get("providers", {})

        if providers_config:
            # New multi-provider config
            for provider_name, provider_conf in providers_config.items():
                if not provider_conf.get("enabled", False):
                    continue
                provider_cls = PROVIDER_REGISTRY.get(provider_name)
                if provider_cls is None:
                    logger.warning(f"Unknown notification provider: {provider_name}")
                    continue
                valid, err = provider_cls(provider_conf).validate_config()
                if valid:
                    self.providers.append(provider_cls(provider_conf))
                else:
                    logger.warning(f"Notification provider '{provider_name}' has invalid config: {err}")
        else:
            # Legacy webhook-only config (backward compat)
            webhook_url = self.notifications_config.get("webhook_url", "")
            if webhook_url:
                self.providers.append(WebhookProvider({"url": webhook_url}))

    def should_notify(self, event_type: str) -> bool:
        """Check whether notifications should fire for this event type."""
        if not self.enabled or not self.providers:
            return False
        return self.notifications_config.get(f"on_{event_type}", True)

    def notify(self, event_type: str, data: Dict[str, Any]):
        """
        Send notification for a migration event.

        Args:
            event_type: "start", "complete", or "failure"
            data: Event-specific data dict
        """
        if not self.should_notify(event_type):
            return

        title, message, priority = self._format_event(event_type, data)

        for provider in self.providers:
            try:
                provider.send(title, message, priority)
                logger.info(f"Sent {event_type} notification via {provider.__class__.__name__}")
            except Exception as e:
                logger.error(f"Failed to send {event_type} notification via {provider.__class__.__name__}: {e}")

    def test(self) -> Dict[str, Any]:
        """
        Send a test notification to all enabled providers.

        Returns:
            Dict with per-provider results.
        """
        results = {}
        title = "ProxBalance Test Notification"
        message = "This is a test notification from ProxBalance. If you see this, your notification provider is configured correctly."

        for provider in self.providers:
            name = provider.__class__.__name__.replace("Provider", "").lower()
            try:
                provider.send(title, message, "normal")
                results[name] = {"success": True}
            except Exception as e:
                results[name] = {"success": False, "error": str(e)}

        return results

    @staticmethod
    def _format_event(event_type: str, data: Dict[str, Any]) -> tuple:
        """
        Format an event into (title, message, priority).

        Returns:
            (title, message, priority)
        """
        dry_run_tag = " [DRY RUN]" if data.get("dry_run") else ""

        if event_type == "start":
            title = f"Migration Run Started{dry_run_tag}"
            lines = [
                f"Migrations planned: {data.get('migration_count', '?')}",
                f"Window: {data.get('window', 'N/A')}",
            ]
            if data.get("dry_run"):
                lines.append("Mode: Dry run (no actual migrations)")
            message = "\n".join(lines)
            priority = "normal"

        elif event_type == "complete":
            total = data.get("total", 0)
            successful = data.get("successful", 0)
            failed = data.get("failed", 0)

            title = f"Migration Run Completed{dry_run_tag}"
            lines = [
                f"Total attempted: {total}",
                f"Successful: {successful}",
                f"Failed: {failed}",
            ]
            if data.get("dry_run"):
                lines.append("Mode: Dry run (no actual migrations)")

            message = "\n".join(lines)
            priority = "high" if failed > 0 else "normal"

        elif event_type == "action":
            vmid = data.get("vmid", "?")
            name = data.get("name", f"VM-{vmid}")
            guest_type = data.get("type", "VM")
            source = data.get("source_node", "?")
            target = data.get("target_node", "?")
            reason = data.get("reason", "")
            status = data.get("status", "started")

            if status == "success":
                title = f"Migration Completed: {guest_type} {vmid}{dry_run_tag}"
                lines = [
                    f"Guest: {name} ({guest_type} {vmid})",
                    f"From: {source} → To: {target}",
                ]
                duration = data.get("duration", 0)
                if duration:
                    lines.append(f"Duration: {duration}s")
                if reason:
                    lines.append(f"Reason: {reason}")
                if data.get("dry_run"):
                    lines.append("Mode: Dry run (no actual migration)")
                message = "\n".join(lines)
                priority = "normal"
            elif status == "failed":
                title = f"Migration Failed: {guest_type} {vmid}{dry_run_tag}"
                lines = [
                    f"Guest: {name} ({guest_type} {vmid})",
                    f"From: {source} → To: {target}",
                ]
                error = data.get("error", "Unknown error")
                lines.append(f"Error: {error}")
                if reason:
                    lines.append(f"Reason: {reason}")
                message = "\n".join(lines)
                priority = "high"
            else:
                title = f"Migration Started: {guest_type} {vmid}{dry_run_tag}"
                lines = [
                    f"Guest: {name} ({guest_type} {vmid})",
                    f"From: {source} → To: {target}",
                ]
                if reason:
                    lines.append(f"Reason: {reason}")
                if data.get("dry_run"):
                    lines.append("Mode: Dry run (no actual migration)")
                message = "\n".join(lines)
                priority = "normal"

        elif event_type == "failure":
            title = f"Migration Safety Check Failed{dry_run_tag}"
            message = f"Reason: {data.get('reason', 'Unknown')}"
            priority = "high"

        else:
            title = f"ProxBalance Event: {event_type}"
            message = json.dumps(data, indent=2)
            priority = "normal"

        return title, message, priority


# ---------------------------------------------------------------------------
# Module-level helper (drop-in replacement for automigrate.py)
# ---------------------------------------------------------------------------

def send_notification(config: Dict[str, Any], event_type: str, data: Dict[str, Any]):
    """
    Send notification for a migration event.

    Drop-in replacement for the old send_notification() in automigrate.py.
    Supports both legacy webhook config and new multi-provider config.

    Args:
        config: Full application configuration dict
        event_type: "start", "complete", or "failure"
        data: Event-specific data
    """
    try:
        manager = NotificationManager(config)
        manager.notify(event_type, data)
    except Exception as e:
        logger.error(f"Failed to send notification: {e}")


def get_default_notifications_config() -> Dict[str, Any]:
    """Return the default notifications configuration block."""
    return {
        "enabled": False,
        "on_start": True,
        "on_complete": True,
        "on_failure": True,
        "on_action": True,
        "providers": {
            "pushover": {
                "enabled": False,
                "api_token": "",
                "user_key": "",
                "priority": 0,
                "sound": "pushover",
                "device": ""
            },
            "email": {
                "enabled": False,
                "smtp_host": "",
                "smtp_port": 587,
                "smtp_username": "",
                "smtp_password": "",
                "smtp_tls": True,
                "from_address": "",
                "to_addresses": []
            },
            "telegram": {
                "enabled": False,
                "bot_token": "",
                "chat_id": ""
            },
            "discord": {
                "enabled": False,
                "webhook_url": ""
            },
            "slack": {
                "enabled": False,
                "webhook_url": ""
            },
            "webhook": {
                "enabled": False,
                "url": "",
                "headers": {}
            }
        }
    }
