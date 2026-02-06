# Notifications

ProxBalance can send notifications for automated migration events through multiple providers. Notifications are configured within the `automated_migrations.notifications` section of `config.json`, or through the web UI.

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
- [Testing](#testing)

---

## Overview

Notifications are triggered by automated migration events:

- **on_start** - When a migration begins
- **on_complete** - When a migration finishes successfully
- **on_failure** - When a migration fails

Multiple providers can be enabled simultaneously. Each notification includes the VM/CT name, source and target nodes, and the migration reason.

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

| Key | Description |
|-----|-------------|
| `api_token` | Application API token from Pushover |
| `user_key` | Your Pushover user key |
| `priority` | Message priority (-2 to 2). 0 = normal, 1 = high |
| `sound` | Notification sound name |
| `device` | Target specific device (blank = all devices) |

**Setup:**
1. Create an account at [pushover.net](https://pushover.net/)
2. Create an application to get an API token
3. Copy your user key from the dashboard

---

### Email (SMTP)

Sends email notifications through any SMTP server.

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

| Key | Description |
|-----|-------------|
| `smtp_host` | SMTP server hostname (e.g., `smtp.gmail.com`) |
| `smtp_port` | SMTP port (587 for TLS, 465 for SSL, 25 for unencrypted) |
| `smtp_username` | SMTP authentication username |
| `smtp_password` | SMTP authentication password or app password |
| `smtp_tls` | Enable STARTTLS encryption |
| `from_address` | Sender email address |
| `to_addresses` | Array of recipient email addresses |

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

Sends messages to a Telegram chat or group via a bot.

```json
"telegram": {
    "enabled": false,
    "bot_token": "",
    "chat_id": ""
}
```

| Key | Description |
|-----|-------------|
| `bot_token` | Bot token from [@BotFather](https://t.me/BotFather) |
| `chat_id` | Target chat, group, or channel ID |

**Setup:**
1. Message [@BotFather](https://t.me/BotFather) on Telegram and create a new bot
2. Copy the bot token
3. Add the bot to your target chat or group
4. Get the chat ID by messaging the bot and visiting `https://api.telegram.org/bot<token>/getUpdates`

---

### Discord

Sends messages to a Discord channel via webhook.

```json
"discord": {
    "enabled": false,
    "webhook_url": ""
}
```

| Key | Description |
|-----|-------------|
| `webhook_url` | Discord webhook URL |

**Setup:**
1. In your Discord server, go to channel settings
2. Navigate to Integrations > Webhooks
3. Create a new webhook and copy the URL

---

### Slack

Sends messages to a Slack channel via incoming webhook.

```json
"slack": {
    "enabled": false,
    "webhook_url": ""
}
```

| Key | Description |
|-----|-------------|
| `webhook_url` | Slack incoming webhook URL |

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

| Key | Description |
|-----|-------------|
| `url` | Target URL for HTTP POST requests |
| `headers` | Custom HTTP headers as key-value pairs |

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

The webhook payload includes:
- `event` - Event type (`migration_start`, `migration_complete`, `migration_failure`)
- `vmid` - Guest ID
- `name` - Guest name
- `source_node` - Source node
- `target_node` - Target node
- `reason` - Migration reason
- `timestamp` - ISO 8601 timestamp

---

## Testing

Test any configured provider through the web UI or API:

**Web UI:**
1. Open Settings
2. Navigate to the Notifications section
3. Configure a provider
4. Click the test button for that provider

**API:**
```bash
curl -X POST http://<host>/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"provider": "discord"}'
```

---

[Back to Documentation](README.md)
