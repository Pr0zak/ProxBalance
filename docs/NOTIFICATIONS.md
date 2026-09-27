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
- [Credentials and the Web UI](#credentials-and-the-web-ui)
- [Testing](#testing)
- [API Endpoints](#api-endpoints)
- [Troubleshooting](#troubleshooting)

---

## Overview

Notifications are sent by the background services: the automation runner, the data collector, the recommendation generator, node evacuations and the update checker. Each event type has its own `on_<event>` switch; see [Event Types](#event-types). Manual migrations started from the dashboard do not send notifications.

Multiple providers can be enabled simultaneously. If one provider fails to send, others will still deliver. Automation notifications include a `[DRY RUN]` tag in the title when dry-run mode is active. A forced dry run from `POST /api/automigrate/test` sends no notifications at all.

An enabled provider whose required fields are missing (for example Email without an SMTP host) is skipped, and the reason is shown in the Settings page and in test results.

---

## Global Settings

```json
"automated_migrations": {
    "notifications": {
        "enabled": false,
        "on_start": true,
        "on_complete": true,
        "on_failure": true,
        "on_action": true,
        "on_action_success": true,
        "on_action_failure": true,
        "on_node_status": true,
        "on_resource_threshold": false,
        "on_recommendations": false,
        "on_recommendations_urgent": true,
        "on_recommendations_cleared": false,
        "on_capacity_warning": true,
        "on_evacuation": true,
        "on_collector_status": false,
        "on_update_available": true,
        "providers": { ... }
    }
}
```

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `enabled` | boolean | `false` | Master on/off switch for all notifications |
| `on_start` | boolean | `true` | An automation run begins |
| `on_complete` | boolean | `true` | An automation run finishes |
| `on_failure` | boolean | `true` | Pre-flight safety checks fail and the run is aborted |
| `on_action` | boolean | `true` | Each migration performed by automation |
| `on_action_success` | boolean | `true` | With `on_action`: include successful migrations |
| `on_action_failure` | boolean | `true` | With `on_action`: include failed migrations |
| `on_node_status` | boolean | `true` | A node goes offline or comes back online |
| `on_resource_threshold` | boolean | `false` | A node exceeds the safety CPU or memory limit |
| `on_recommendations` | boolean | `false` | New migration recommendations were generated |
| `on_recommendations_urgent` | boolean | `true` | Recommendations with high urgency |
| `on_recommendations_cleared` | boolean | `false` | Recommendations dropped to zero |
| `on_capacity_warning` | boolean | `true` | Cluster health fell below 50 |
| `on_evacuation` | boolean | `true` | A node evacuation starts, completes or fails |
| `on_collector_status` | boolean | `false` | Data collection completed or failed |
| `on_update_available` | boolean | `true` | A ProxBalance update is available |

A missing key behaves like its default. Set `enabled` to `true` and configure at least one provider to receive notifications.

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

> **Note:** Custom headers can only be configured via `config.json` directly; the web UI does not expose this field. Header values are treated as secrets: they are shown as `***` by the API and kept when the placeholder is saved back.

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

| Event | Sent by | Title | Priority |
|-------|---------|-------|----------|
| `start` | Automation run | `Migration Run Started` | normal |
| `complete` | Automation run | `Migration Run Completed` | high if any failed, else normal |
| `failure` | Automation run | `Migration Safety Check Failed` | high |
| `action` | Automation run, per migration | `Migration Completed: VM 100` / `Migration Failed: VM 100` | normal / high |
| `node_status` | Collector | `Node Offline: pve1` / `Node Back Online: pve1` | emergency / normal |
| `resource_threshold` | Collector | `Resource Alert: pve1 CPU at 91.2%` | high above 110% of the limit, else normal |
| `recommendations` | Recommendation generator | `New Migration Recommendations` | normal |
| `recommendations_urgent` | Recommendation generator | `Urgent Migration Recommendations` | high |
| `recommendations_cleared` | Recommendation generator | `Cluster Balanced - No Migrations Needed` | low |
| `capacity_warning` | Recommendation generator | `Cluster Capacity Warning` | high |
| `evacuation` | Node evacuation | `Evacuation Started/Completed/Failed: pve1` | high / high if any failed, else normal / emergency |
| `collector_status` | Collector | `Data Collection Completed` / `Data Collection Failed` | low / high |
| `update_available` | Update check | `Update Available: <version>` | normal |

`resource_threshold` uses `safety_checks.max_node_cpu_percent` and `max_node_memory_percent` as its limits. `capacity_warning` is sent when there are recommendations and cluster health is below 50/100. `recommendations_cleared` is sent when the previous cycle had recommendations and the current one has none.

The automation events are described in more detail below.

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

Events set priority automatically; see the table in [Event Types](#event-types).

---

## Credentials and the Web UI

Provider credentials (`api_token`, `user_key`, `bot_token`, `webhook_url`, `smtp_password`, `password`, the generic webhook `url` and every `headers` value) are never returned by the API. `GET /api/config` and `GET /api/automigrate/config` show them as `***`. When the Settings page saves a form with a field still at `***`, the stored value is kept, so saving other settings never wipes a credential. To change a credential, type the new value; clearing the field saves it empty.

The same applies to configuration export and import: an exported file contains `***` in place of each credential, and importing it back restores the stored values.

---

## Testing

Tests always use the **saved** settings. Test every enabled channel at once, or one channel on its own.

**Web UI:**
1. Open Settings > Notifications (`#/settings/notifications`)
2. Enable notifications, configure at least one provider, and save
3. Each channel row shows its state (for example "SMTP host is required · skipped", "Test sent · 11:24 PM" or "Failed: <error>") and has its own **Test** button
4. **Test all enabled channels** tests them together and shows a summary such as "1 sent, 1 failed, 1 skipped"

The test buttons are disabled while notification edits are unsaved.

**API:**
```bash
# All enabled channels
curl -X POST http://<host>/api/notifications/test

# One channel
curl -X POST http://<host>/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "email"}'
```

**Response:**
```json
{
    "success": false,
    "results": {
        "pushover": { "success": true },
        "discord": { "success": false, "error": "404 Client Error: Not Found for url: ***" }
    },
    "skipped": {
        "email": "SMTP host is required"
    },
    "message": "1 sent, 1 failed, 1 skipped"
}
```

- `results` is keyed by channel name (`pushover`, `email`, `telegram`, `discord`, `slack`, `webhook`).
- `skipped` lists enabled channels that were not tested because required fields are missing, with the reason.
- `success` is `true` only when at least one channel was tested, none was skipped, and every test succeeded.
- Error messages and skip reasons are scrubbed: configured credentials and webhook URLs are replaced by `***`.

---

## API Endpoints

### POST /api/notifications/test

Send a test notification to every enabled channel, or to one with `{"provider": "<name>"}`.

**Responses:**

| Status | Condition |
|--------|-----------|
| 200 | Test ran (check `results` and `skipped` for per-channel status) |
| 400 | Notifications not enabled, no channel enabled, unknown channel name, or the requested channel is not enabled in the saved settings |
| 500 | Server error |

### GET /api/notifications/providers

Get the list of available providers, the default configuration, and whether each enabled channel in the saved config is ready or skipped.

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
    },
    "channels": {
        "pushover": { "ready": true },
        "email": { "ready": false, "reason": "SMTP host is required" }
    }
}
```

---

## Troubleshooting

**Notifications not sending:**
- Verify the master `enabled` flag is `true` under `automated_migrations.notifications`
- Check that at least one provider has its own `enabled` flag set to `true`, and that it is not listed as skipped (Settings > Notifications, or `GET /api/notifications/providers`)
- Ensure the relevant event toggle (for example `on_start`, `on_action`, `on_node_status`) is enabled
- Manual migrations do not send notifications, and `POST /api/automigrate/test` runs are silent
- A test uses the saved settings: save pending edits before testing

**Provider-specific issues:**
- **Pushover:** Verify both `api_token` and `user_key` are correct
- **Email:** Check SMTP credentials; Gmail requires an App Password when 2FA is enabled
- **Telegram:** Ensure the bot has been added to the target chat and the `chat_id` is correct
- **Discord / Slack:** Verify the webhook URL has not been revoked or regenerated
- **Webhook:** Check that the target URL is reachable and accepts POST requests

**Checking logs:**

Notification errors are logged by the service that sent the event:
```bash
journalctl -u proxmox-balance-automigrate -n 50        # automation events
journalctl -u proxmox-collector -n 50                  # node status, resource, collector events
journalctl -u proxmox-balance-recommendations -n 50    # recommendation events
journalctl -u proxmox-balance -n 50                    # evacuation and update events
```

Look for `Failed to send ... notification via ...` messages.

---

[Back to Documentation](README.md)
