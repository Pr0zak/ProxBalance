# AI Features

ProxBalance optionally integrates with AI providers to generate migration recommendations based on cluster metrics and historical trends.

---

## Table of Contents

- [Overview](#overview)
- [Providers](#providers)
  - [OpenAI](#openai)
  - [Anthropic](#anthropic)
  - [Ollama (Local)](#ollama-local)
- [Configuration](#configuration)
- [Analysis Periods](#analysis-periods)
- [How It Works](#how-it-works)
- [Model Selection](#model-selection)
- [Troubleshooting](#troubleshooting)

---

## Overview

AI recommendations complement the standard penalty-based scoring system. While the penalty system evaluates current metrics and thresholds, the AI analyzes historical trends, predicts workload patterns, and provides natural language reasoning.

AI features are optional and disabled by default. No data is sent externally unless you configure a cloud provider (OpenAI or Anthropic). Using Ollama keeps all data local.

---

## Providers

### OpenAI

**Setup:**
1. Get an API key from [platform.openai.com](https://platform.openai.com/api-keys)
2. In ProxBalance Settings, set:
   - AI Provider: **OpenAI**
   - API Key: your key
   - Model: `gpt-4o` (recommended) or `gpt-3.5-turbo` (faster, cheaper)
3. Save Settings

**Cost:** Approximately $0.01-0.03 per analysis depending on cluster size and model.

### Anthropic

**Setup:**
1. Get an API key from [console.anthropic.com](https://console.anthropic.com/settings/keys)
2. In ProxBalance Settings, set:
   - AI Provider: **Anthropic**
   - API Key: your key (starts with `sk-ant-`)
   - Model: `claude-sonnet-4-5-20250929` (recommended) or `claude-3-haiku-20240307` (faster)
3. Save Settings

**Cost:** Approximately $0.01-0.05 per analysis depending on cluster size and model.

### Ollama (Local)

Self-hosted AI using [Ollama](https://ollama.ai). All data stays on your network.

**Setup:**

1. Install Ollama on a machine accessible from the ProxBalance container:
   ```bash
   curl -fsSL https://ollama.ai/install.sh | sh
   ```

2. Pull a model:
   ```bash
   ollama pull qwen2.5:7b
   ```

3. Ensure Ollama listens on all interfaces (not just localhost):
   ```bash
   mkdir -p /etc/systemd/system/ollama.service.d
   cat > /etc/systemd/system/ollama.service.d/override.conf <<EOF
   [Service]
   Environment="OLLAMA_HOST=0.0.0.0:11434"
   EOF
   systemctl daemon-reload
   systemctl restart ollama
   ```

4. In ProxBalance Settings, set:
   - AI Provider: **Local LLM (Ollama)**
   - Base URL: `http://<ollama-host>:11434`
   - Model: `qwen2.5:7b`
5. Save Settings

**Cost:** Free (local compute only). Requires 5-16 GB RAM depending on model.

---

## Configuration

All AI settings can be managed through the web UI Settings panel.

| Setting | Description |
|---------|-------------|
| AI Provider | `none`, `openai`, `anthropic`, `local` |
| Enable AI Recommendations | Master toggle |
| API Key | Required for OpenAI and Anthropic |
| Model | Model name (or select from dropdown) |
| Base URL | Required for Ollama (default: `http://localhost:11434`) |
| Analysis Period | Time range for historical analysis |

See [Configuration Reference](CONFIGURATION.md) for the JSON structure.

---

## Analysis Periods

| Period | Use Case |
|--------|----------|
| 1 hour | Urgent situations, recent spikes |
| 6 hours | Short-term workload patterns |
| 24 hours | Recommended for most clusters |
| 7 days | Long-term trend analysis |

Longer periods provide more context but include older data that may not reflect current conditions. 24 hours is the default and works well for most clusters.

---

## How It Works

1. ProxBalance gathers current metrics and historical RRD data for all nodes
2. The data is formatted into a structured prompt describing the cluster state
3. The AI provider analyzes the data and returns recommendations in a structured format
4. ProxBalance validates the response:
   - Filters recommendations where source == target
   - Removes recommendations referencing nodes not in the cluster (hallucination filtering)
   - Validates guest IDs exist
5. Valid recommendations are displayed alongside standard recommendations

### Response format

Each AI recommendation includes:
- **vmid/name**: Guest to migrate
- **source_node / target_node**: Migration path
- **priority**: high, medium, or low
- **reasoning**: Natural language explanation
- **risk_score**: 0.0 (safe) to 1.0 (risky)
- **estimated_impact**: Expected outcome
- **best_time**: Suggested timing

---

## Model Selection

### Cloud models

| Provider | Model | Quality | Speed | Cost |
|----------|-------|---------|-------|------|
| OpenAI | gpt-4o | Best | Moderate | Higher |
| OpenAI | gpt-3.5-turbo | Good | Fast | Lower |
| Anthropic | claude-sonnet-4-5-20250929 | Best | Moderate | Higher |
| Anthropic | claude-3-haiku-20240307 | Good | Fast | Lower |

### Local models (Ollama)

| Model | Quality | RAM Required |
|-------|---------|-------------|
| qwen2.5:14b | Best | 10 GB |
| qwen2.5:7b | Good (recommended) | 5 GB |
| llama3.1:8b | Good | 5 GB |
| mistral:7b | Good | 5 GB |

The web UI includes a "Refresh Models" button to fetch available models from the configured provider.

---

## Troubleshooting

### No recommendations appear

1. Verify AI is enabled: Settings > AI Provider is not "None"
2. Check API key is valid (test with the provider's own tool)
3. Check container can reach the provider:
   ```bash
   # OpenAI
   pct exec <ctid> -- curl -s https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY" | head -20

   # Anthropic
   pct exec <ctid> -- curl -s https://api.anthropic.com/v1/messages \
     -H "x-api-key: YOUR_KEY" -H "anthropic-version: 2023-06-01" \
     -H "content-type: application/json" \
     -d '{"model":"claude-3-haiku-20240307","max_tokens":10,"messages":[{"role":"user","content":"test"}]}'

   # Ollama
   pct exec <ctid> -- curl http://<ollama-host>:11434/api/version
   ```

### Ollama connection refused

Ollama may only listen on localhost by default. See the [Ollama setup section](#ollama-local) for configuring it to listen on all interfaces. Also check firewall rules between the ProxBalance container and the Ollama host.

### Recommendations reference wrong nodes

ProxBalance filters out AI recommendations that reference nodes not in the cluster. If this happens frequently, the AI model may be hallucinating. Try:
- Using a larger or more capable model
- Reducing the analysis period to simplify input
- Checking logs for "Filtered out" messages

### Rate limits or quota errors

Cloud providers may return 429 (rate limit) or quota errors. Reduce the frequency of AI recommendation requests or upgrade your API plan.

---

[Back to Documentation](README.md)
