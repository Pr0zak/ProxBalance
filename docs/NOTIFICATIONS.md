# Notifications

ProxBalance can send notifications for automated migration events through multiple providers. Notifications are configured within the `automated_migrations.notifications` section of `config.json`, or through the Settings page in the web UI.

---

## Table of Contents

- [Overview](#overview)
- [Global Settings](#global-settings)
- [Providers](#providers)
  - [Pushover](#pushover)
  - [Email (SMTP)](#email-smtp)
  - [Telegram](#telegram)
  - [Discord](#discord)
  - [Slack](#slack)
  - [Webhook](#webhook)
- [Event Types](#event-types)
- [Priority System](#priority-system)
- [Testing](#testing)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Overview

Notifications are triggered during **automated migration runs** (not manual migrations). Three event types are supported:

- **on_start** — When a migration run begins (before any migrations execute)
- **on_complete** — When a migration run finishes (reports success/failure counts)
- **on_failure** — When pre-flight safety checks fail and the run is aborted

Multiple providers can be enabled simultaneously. If one provider fails to send, others will still deliver. Notifications include a `[DRY RUN]` tag in the title when dry-run mode is active.

---

## Global Settings

```json
"automated_migrations": {
    "notifications": {
        "enabled": false,
        "on_start": true,
        "on_complete": true,
        "on_failure": true,
        "providers": { ... }
    }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `false` | Master on/off switch for all notifications |
| `on_start` | boolean | `true` | Send notification when a migration run begins |
| `on_complete` | boolean | `true` | Send notification when a migration run completes |
| `on_failure` | boolean | `true` | Send notification when safety checks fail |

Set `enabled` to `true` and configure at least one provider to receive notifications.

---

## Providers

### Pushover

Sends push notifications to iOS, Android, and desktop devices via [Pushover](https://pushover.net/).

```json
"pushover": {
    "enabled": false,
    "api_token": "",
    "user_key": "",
    "priority": 0,
    "sound": "pushover",
    "device": ""
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `false` | Enable this provider |
| `api_token` | string | | Application API token from Pushover |
| `user_key` | string | | Your Pushover user key |
| `priority` | integer | `0` | Default priority: `-1` (low), `0` (normal), `1` (high), `2` (emergency) |
| `sound` | string | `"pushover"` | Notification sound name (e.g., `pushover`, `bell`, `cash`, `incoming`) |
| `device` | string | | Target specific device (blank = all devices) |

> **Note:** Emergency priority (`2`) automatically adds retry (60s) and expiration (3600s) parameters as required by Pushover's API. Event-level priority (e.g., "high" for failures) overrides the configured default.

**Setup:**
1. Create an account at [pushover.net](https://pushover.net/)
2. Create an application to get an API token
3. Copy your user key from the dashboard

---

### Email (SMTP)

Sends email notifications through any SMTP server. Emails include both plain text and HTML formatted versions.

```json
"email": {
    "enabled": false,
    "smtp_host": "",
    "smtp_port": 587,
    "smtp_username": "",
    "smtp_password": "",
    "smtp_tls": true,
    "from_address": "",
    "to_addresses": []
}
```

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `enabled` | boolean | `false` | Enable this provider |
| `smtp_host` | string | | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `smtp_port` | integer | `587` | SMTP port (`587` for TLS, `465` for SSL, `25` for unencrypted) |
| `smtp_username` | string | | SMTP authentication username |
| `smtp_password` | string | | SMTP authentication password or app password |
| `smtp_tls` | boolean | `true` | Enable STARTTLS encryption |
| `from_address` | string | | Sender email address |
| `to_addresses` | array | `[]` | Recipient email addresses |

Email subjects are prefixed with `[ProxBalance]`. High and emergency priority messages set the `X-Priority: 1` header.

**Example with Gmail:**
```json
"email": {
    "enabled": true,
    "smtp_host": "smtp.gmail.com",
    "smtp_port": 587,
    "smtp_username": "you@gmail.com",
    "smtp_password": "your-app-password",
    "smtp_tls": true,
    "from_address": "you@gmail.com",
    "to_addresses": ["admin@example.com"]
}
```

Gmail requires an [App Password](https://support.google.com/accounts/answer/185833) when 2FA is enabled.

---

### Telegram

Sends messages to a Telegram chat or group via a bot. Messages use MarkdownV2 formatting.

```json
"telegram": {
    "enabled": false,
    "bot_token": "",
    "chat_id": ""
}
```

| Key | Type | Description |
|-----|------|-------------|
| `enabled` | boolean | Enable this provider |
| `bot_token` | string | Bot token from [@BotFather](https://t.me/BotFather) |
| `chat_id` | string | Target chat, group, or channel ID |

High priority messages are prefixed with ⚠️ and emergency messages with 🚨.

**Setup:**
1. Message [@BotFather](https://t.me/BotFather) on Telegram and create a new bot
2. Copy the bot token
3. Add the bot to your target chat or group
4. Get the chat ID by messaging the bot and visiting `https://api.telegram.org/bot<token>/getUpdates`

---

### Discord

Sends embedded messages to a Discord channel via webhook. Messages are color-coded by priority.

```json
"discord": {
    "enabled": false,
    "webhook_url": ""
}
```

| Key | Type | Description |
|-----|------|-------------|
| `enabled` | boolean | Enable this provider |
| `webhook_url` | string | Discord webhook URL |

**Priority colors:** gray (low), blue (normal), amber (high), red (emergency).

**Setup:**
1. In your Discord server, go to channel settings
2. Navigate to Integrations > Webhooks
3. Create a new webhook and copy the URL

---

### Slack

Sends messages to a Slack channel via incoming webhook. Messages are color-coded by priority using attachments.

```json
"slack": {
    "enabled": false,
    "webhook_url": ""
}
```

| Key | Type | Description |
|-----|------|-------------|
| `enabled` | boolean | Enable this provider |
| `webhook_url` | string | Slack incoming webhook URL |

**Priority colors:** gray (low), blue (normal), amber (high), red (emergency).

**Setup:**
1. Go to your Slack workspace settings
2. Navigate to Apps > Incoming Webhooks
3. Create a new webhook for the target channel and copy the URL

---

### Webhook

Sends HTTP POST requests with JSON payloads to any URL. Use this to integrate with custom systems, monitoring tools, or automation platforms.

```json
"webhook": {
    "enabled": false,
    "url": "",
    "headers": {}
}
```

| Key | Type | Description |
|-----|------|-------------|
| `enabled` | boolean | Enable this provider |
| `url` | string | Target URL for HTTP POST requests |
| `headers` | object | Custom HTTP headers as key-value pairs |

> **Note:** Custom headers can only be configured via `config.json` directly; the web UI does not expose this field.

**Example with custom headers:**
```json
"webhook": {
    "enabled": true,
    "url": "https://hooks.example.com/proxbalance",
    "headers": {
        "Authorization": "Bearer your-token",
        "X-Source": "proxbalance"
    }
}
```

**Payload format:**

All webhook requests send a JSON body with this structure:

```json
{
    "title": "Migration Run Started",
    "message": "Migrations planned: 3\nWindow: Nightly Window",
    "priority": "normal",
    "timestamp": "2025-01-15T23:45:30.123456+00:00",
    "source": "ProxBalance"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Short summary of the event (includes `[DRY RUN]` tag when applicable) |
| `message` | string | Detailed event information |
| `priority` | string | `"low"`, `"normal"`, `"high"`, or `"emergency"` |
| `timestamp` | string | ISO 8601 timestamp in UTC |
| `source` | string | Always `"ProxBalance"` |

---

## Event Types

### Start Event

Sent before migrations begin executing.

| Field | Description |
|-------|-------------|
| Title | `Migration Run Started` (or `Migration Run Started [DRY RUN]`) |
| Priority | `normal` |

**Message contents:**
- Number of migrations planned
- Active migration window name
- Mode indicator (when dry run is active)

### Complete Event

Sent after all migrations in a run have finished.

| Field | Description |
|-------|-------------|
| Title | `Migration Run Completed` (or `Migration Run Completed [DRY RUN]`) |
| Priority | `high` if any migrations failed, `normal` if all succeeded |

**Message contents:**
- Total migrations attempted
- Number of successful migrations
- Number of failed migrations
- Mode indicator (when dry run is active)

### Failure Event

Sent when pre-flight safety checks fail and the migration run is aborted.

| Field | Description |
|-------|-------------|
| Title | `Migration Safety Check Failed` (or `Migration Safety Check Failed [DRY RUN]`) |
| Priority | `high` |

**Message contents:**
- Reason for the safety check failure (e.g., cluster not quorate, node resources exceeded)

---

## Priority System

All providers support four priority levels. Each provider renders priority differently:

| Priority | Pushover | Email | Telegram | Discord / Slack |
|----------|----------|-------|----------|----------------|
| `low` | -1 (quiet) | Standard | No prefix | Gray |
| `normal` | 0 (default) | Standard | No prefix | Blue |
| `high` | 1 (high) | X-Priority: 1 | ⚠️ prefix | Amber |
| `emergency` | 2 (retry until ack) | X-Priority: 1 | 🚨 prefix | Red |

Events set priority automatically: start events use `normal`, complete events use `high` if any migration failed (otherwise `normal`), and failure events always use `high`.

---

## Testing

Test all configured providers through the web UI or API. The test sends a message to **all enabled providers** simultaneously and reports per-provider results.

**Web UI:**
1. Open Settings
2. Scroll to the Notifications section
3. Enable notifications and configure at least one provider
4. Click **Send Test Notification**

**API:**
```bash
curl -X POST http://<host>/api/notifications/test
```

**Response:**
```json
{
    "success": true,
    "results": {
        "pushover": { "success": true },
        "email": { "success": true },
        "discord": { "success": false, "error": "Invalid webhook URL" }
    },
    "message": "Test notifications sent successfully"
}
```

The `success` field is `true` only when all providers succeed. Individual provider results are reported in the `results` object.

---

## API Endpoints

### POST /api/notifications/test

Send a test notification to all enabled providers.

**Responses:**

| Status | Condition |
|--------|-----------|
| 200 | Test sent (check `results` for per-provider status) |
| 400 | Notifications not enabled, or no providers configured |
| 500 | Server error |

### GET /api/notifications/providers

Get the list of available notification providers and their default configuration schema.

**Response:**
```json
{
    "success": true,
    "providers": ["pushover", "email", "telegram", "discord", "slack", "webhook"],
    "defaults": {
        "enabled": false,
        "on_start": true,
        "on_complete": true,
        "on_failure": true,
        "providers": { ... }
    }
}
```

---

## Troubleshooting

**Notifications not sending:**
- Verify the master `enabled` flag is `true` under `automated_migrations.notifications`
- Check that at least one provider has its own `enabled` flag set to `true`
- Ensure the relevant event toggle (`on_start`, `on_complete`, `on_failure`) is enabled
- Notifications only fire during automated migration runs, not manual migrations

**Provider-specific issues:**
- **Pushover:** Verify both `api_token` and `user_key` are correct
- **Email:** Check SMTP credentials; Gmail requires an App Password when 2FA is enabled
- **Telegram:** Ensure the bot has been added to the target chat and the `chat_id` is correct
- **Discord / Slack:** Verify the webhook URL has not been revoked or regenerated
- **Webhook:** Check that the target URL is reachable and accepts POST requests

**Checking logs:**

Notification errors are logged to the application log:
```bash
journalctl -u proxmox-balance-automigrate -n 50
```

Look for `Failed to send ... notification via ...` messages.

---

[Back to Documentation](README.md)
