# ProxBalance AI-Enhanced Migration Recommendations

## Overview

ProxBalance v2.0 now supports AI-powered migration recommendations using OpenAI (GPT-4), Anthropic Claude, or local LLMs (via Ollama). AI analysis provides more sophisticated recommendations by analyzing multi-dimensional cluster metrics over configurable time periods (1h, 6h, 24h, or 7d), predicting resource constraints, and suggesting optimal migration strategies with smart filtering to prevent hallucinations.

## Features

### AI Providers

ProxBalance supports three AI provider options:

1. **OpenAI** - GPT-4 and other OpenAI models
2. **Anthropic Claude** - Claude 3.5 Sonnet and other Claude models
3. **Local LLM** - Self-hosted models via Ollama (llama2, mistral, etc.)

### Capabilities

AI-enhanced recommendations provide:

- **Configurable time period analysis** - Analyze trends over 1 hour, 6 hours, 24 hours, or 7 days
- **Multi-dimensional analysis** - Analyzes CPU, memory, load, and historical trends simultaneously
- **Predictive insights** - Forecasts potential resource constraints before they occur
- **Workload profiling** - Understands VM resource patterns and behaviors
- **Smart filtering** - Prevents hallucinated node names and self-migrations (v2.0+)
- **Risk assessment** - Scores migration risk and suggests optimal timing
- **Natural language reasoning** - Explains why each migration is recommended
- **Priority ranking** - Categorizes recommendations as high/medium/low priority
- **Web UI integration** - Toggle AI features and configure providers directly in settings

## Configuration

### config.json Structure (v2.0)

```json
{
  "collection_interval_minutes": 60,
  "ui_refresh_interval_minutes": 15,
  "proxmox_host": "10.0.0.3",
  "proxmox_port": 8006,
  "proxmox_api_token_id": "proxbalance@pam!proxbalance",
  "proxmox_api_token_secret": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "ai_enabled": true,
  "ai_provider": "anthropic",
  "ai_api_key": "sk-ant-...",
  "ai_model": "claude-3-5-sonnet-20241022",
  "ai_base_url": "https://api.anthropic.com",
  "ai_analysis_period": "24h"
}
```

**Simplified v2.0 Configuration:**
- Flat structure for easier management
- `ai_analysis_period` options: `1h`, `6h`, `24h`, `7d`
- Configure via web UI Settings panel
- Automatic validation and service restart

### Configuration Options (v2.0)

| Option | Values | Description |
|--------|--------|-------------|
| `ai_enabled` | `true`, `false` | Enable/disable AI recommendations |
| `ai_provider` | `openai`, `anthropic`, `ollama` | Which AI provider to use |
| `ai_api_key` | string | API key for OpenAI or Anthropic |
| `ai_model` | string | Model name (e.g., gpt-4, claude-3-5-sonnet-20241022, llama3.1:8b) |
| `ai_base_url` | string | API base URL (provider-specific or Ollama URL) |
| `ai_analysis_period` | `1h`, `6h`, `24h`, `7d` | Historical data timeframe for analysis |

### Recommended Models

#### Cloud-Based Models

| Provider | Model | Quality | Speed | Cost/Request | Best For |
|----------|-------|---------|-------|--------------|----------|
| **OpenAI** | gpt-4o | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$0.02 | Best overall accuracy |
| **OpenAI** | gpt-4-turbo | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$0.01 | Balanced performance |
| **OpenAI** | gpt-3.5-turbo | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ~$0.002 | Fast and affordable |
| **Anthropic** | claude-3-5-sonnet-20241022 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~$0.015 | Excellent reasoning |
| **Anthropic** | claude-3-haiku-20240307 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ~$0.0003 | Fast and cheap |

#### Local Models (Ollama)

  | Model | Quality | Speed | RAM Required | JSON Accuracy | Reasoning Quality |
  |-------|---------|-------|--------------|---------------|-------------------|
  | **Qwen2.5:14b** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ~10GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
  | **Qwen2.5:7b** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~5GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
  | **Llama3.1:8b** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ~6GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
  | **Llama3.1:70b** | ⭐⭐⭐⭐⭐ | ⭐ | ~45GB | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
  | **Mistral:7b** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ~5GB | ⭐⭐⭐⭐ | ⭐⭐⭐ |
  | **DeepSeek-Coder:6.7b** | ⭐⭐⭐⭐ | ⭐⭐⭐ | ~5GB | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |

**Recommendations:**
- **Best Overall (Local)**: Qwen2.5:14b - Excellent JSON accuracy and reasoning
- **Best Budget (Local)**: Qwen2.5:7b - Great balance of performance and resources
- **Best Speed (Local)**: Mistral:7b - Very fast, lightweight
- **Best Accuracy (Local)**: Llama3.1:70b - Requires significant hardware
- **Best for ProxBalance**: Qwen2.5:7b or Llama3.1:8b - Reliable JSON output

## API Usage

### Get AI Recommendations

**Endpoint:** `POST /api/ai-recommendations`

**Request:**
```bash
curl -X POST http://<container-ip>/api/ai-recommendations \
  -H "Content-Type: application/json" \
  -d '{
    "cpu_threshold": 60,
    "mem_threshold": 70
  }'
```

**Response:**
```json
{
  "success": true,
  "analysis": "Cluster is well-balanced. Node pve1 showing elevated CPU usage (75%) with upward trend.",
  "recommendations": [
    {
      "vmid": 100,
      "name": "web-server-01",
      "source_node": "pve1",
      "target_node": "pve2",
      "type": "VM",
      "priority": "high",
      "reasoning": "pve1 CPU trending toward 80% in next 2 hours based on RRD data. web-server-01 is CPU-intensive (avg 45%). pve2 has compatible resources and low CPU usage (25%).",
      "risk_score": 0.15,
      "estimated_impact": "Reduces pve1 CPU to ~65%, improves cluster balance by 12%",
      "best_time": "now"
    }
  ],
  "predicted_issues": [
    {
      "node": "pve1",
      "metric": "cpu",
      "prediction": "Will exceed 80% in next 2 hours",
      "confidence": 0.85
    }
  ]
}
```

### Update AI Configuration

**Endpoint:** `POST /api/config`

**Request:**
```bash
curl -X POST http://<container-ip>/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "ai_provider": "anthropic",
    "ai_recommendations_enabled": true,
    "ai_config": {
      "anthropic": {
        "api_key": "sk-ant-your-key-here",
        "model": "claude-3-5-sonnet-20241022"
      }
    }
  }'
```

## Setting Up AI Providers (v2.0)

### Via Web Interface (Recommended)

1. Click ⚙️ **Settings** icon (top-right corner)
2. Scroll to **AI-Enhanced Migration Recommendations**
3. Toggle **Enable AI Recommendations**
4. Select your AI provider and enter credentials
5. Choose analysis time period (1h, 6h, 24h, or 7d)
6. Click **Save Settings**

### Via Command Line

#### OpenAI Setup

```bash
# 1. Get API key from https://platform.openai.com/api-keys

# 2. Update config via API
curl -X POST http://<container-ip>/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "ai_enabled": true,
    "ai_provider": "openai",
    "ai_api_key": "sk-...",
    "ai_model": "gpt-4",
    "ai_base_url": "https://api.openai.com",
    "ai_analysis_period": "24h"
  }'
```

#### Anthropic Claude Setup

```bash
# 1. Get API key from https://console.anthropic.com/settings/keys

# 2. Update config via API
curl -X POST http://<container-ip>/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "ai_enabled": true,
    "ai_provider": "anthropic",
    "ai_api_key": "sk-ant-...",
    "ai_model": "claude-3-5-sonnet-20241022",
    "ai_base_url": "https://api.anthropic.com",
    "ai_analysis_period": "24h"
  }'
```

#### Ollama Setup (Local LLM)

```bash
# 1. Install Ollama on a server (can be same as ProxBalance or separate)
curl -fsSL https://ollama.com/install.sh | sh

# 2. Pull a recommended model
ollama pull qwen2.5:7b       # Best overall - reliable JSON, great reasoning
ollama pull qwen2.5:14b      # Better quality, needs 10GB RAM
ollama pull llama3.1:8b      # Good alternative, 6GB RAM
ollama pull mistral:7b       # Fastest, lowest RAM (5GB)

# 3. Verify Ollama is accessible
curl http://<ollama-host>:11434/api/version

# 4. Test the model
ollama run qwen2.5:7b "Analyze this cluster: 3 nodes, node1 at 80% CPU"

# 5. Configure ProxBalance via web UI or API
curl -X POST http://<container-ip>/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "ai_enabled": true,
    "ai_provider": "ollama",
    "ai_base_url": "http://<ollama-host>:11434",
    "ai_model": "qwen2.5:7b",
    "ai_analysis_period": "24h"
  }'
```

**Hardware Requirements by Model:**
- **5-6GB RAM**: qwen2.5:7b, llama3.1:8b, mistral:7b, deepseek-coder:6.7b
- **10GB RAM**: qwen2.5:14b
- **45GB+ RAM**: llama3.1:70b (for production clusters with high accuracy needs)

**GPU Acceleration (Optional but Recommended):**
- NVIDIA GPU with CUDA significantly speeds up inference
- Without GPU: ~5-15 seconds per recommendation
- With GPU: ~1-3 seconds per recommendation

## AI Analysis Process

### Data Collected

The AI receives comprehensive cluster metrics:

- **Node metrics**: CPU%, memory%, load, core count, status
- **Historical RRD data**: Configurable timeframe (1h/6h/24h/7d) trends for each node
- **Trend analysis**: Time-series data points showing resource usage over selected period
- **Guest information**: VMID, name, type, resource usage, tags
- **Anti-affinity rules**: Exclusion groups and constraints
- **Cluster summary**: Total nodes, guests, resource distribution

### Analysis Performed

1. **Resource utilization patterns** - Identifies over/under-utilized nodes
2. **Trend analysis** - Detects increasing/decreasing resource usage over selected timeframe
3. **Workload characterization** - Classifies VMs by resource profiles
4. **Constraint checking** - Respects ignore tags and anti-affinity rules
5. **Optimization planning** - Suggests migrations to improve balance
6. **Smart filtering (v2.0+)** - Validates recommendations against actual cluster nodes
7. **Self-migration prevention** - Filters out recommendations where source == target
8. **Hallucination detection** - Removes recommendations with non-existent nodes
9. **Risk assessment** - Evaluates potential migration impacts
10. **Timing recommendation** - Suggests optimal execution windows based on trend analysis

### Response Format

Each recommendation includes:

- **Target migration** - Source/target nodes and guest details
- **Priority level** - high/medium/low based on urgency
- **Reasoning** - Natural language explanation
- **Risk score** - 0.0 (no risk) to 1.0 (high risk)
- **Estimated impact** - Expected improvement
- **Best timing** - When to execute (now, off-hours, etc.)

## Best Practices

### Model Selection

**Cloud-Based (Best for production):**
- **OpenAI gpt-4o**: Best overall accuracy, ~$0.02/request
- **Anthropic claude-3-5-sonnet**: Excellent reasoning, ~$0.015/request
- **OpenAI gpt-3.5-turbo**: Fast and cheap, ~$0.002/request

**Local (Best for homelab/cost-sensitive):**
- **Qwen2.5:7b**: Best balance - excellent JSON accuracy, good reasoning, only 5GB RAM
- **Qwen2.5:14b**: Higher quality, needs 10GB RAM
- **Llama3.1:8b**: Solid alternative with good performance
- **Mistral:7b**: Fastest, lowest resource usage

**Selection Criteria:**
- **Need 100% uptime?** → Use cloud (OpenAI/Anthropic)
- **Want zero cost?** → Use local (Qwen2.5 recommended)
- **Have GPU?** → Local models run 3-5x faster
- **Small clusters (<20 guests)?** → Mistral:7b or gpt-3.5-turbo
- **Large clusters (50+ guests)?** → Qwen2.5:14b or claude-3-5-sonnet

### API Key Security

- Store API keys in config.json (not committed to git)
- Use environment variables for production deployments
- Rotate keys periodically
- Monitor API usage and costs

### Performance Considerations

- AI analysis adds 5-30 seconds to recommendation requests
- Cache AI recommendations for frequently accessed data
- Consider running AI analysis on schedule vs on-demand
- Local LLMs are slower but have no API costs

### Cost Management

- OpenAI GPT-4: ~$0.01-0.03 per request
- Anthropic Claude: ~$0.003-0.015 per request
- Local LLMs: Free (but requires compute resources)

## Troubleshooting

### AI Provider Not Working

```bash
# Test OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer sk-your-key"

# Test Anthropic
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: sk-ant-your-key" \
  -H "anthropic-version: 2023-06-01"

# Test Ollama
curl http://localhost:11434/api/tags
```

### Check Logs

```bash
# View API logs for AI errors
pct exec <ctid> -- journalctl -u proxmox-balance -n 100 | grep -i "ai"

# Test AI endpoint manually
curl -X POST http://<container-ip>/api/ai-recommendations | jq
```

### Common Issues

1. **API key invalid** - Check key format and permissions
2. **Model not found** - Verify model name is correct
3. **Timeout errors** - AI analysis can take 10-30 seconds
4. **JSON parse errors** - Check AI response format
5. **No cached data** - Collector must run before AI analysis

## Implementation Details

### Files

- `ai_provider.py` - AI provider abstraction layer
  - `AIProvider` - Base abstract class
  - `OpenAIProvider` - OpenAI implementation
  - `AnthropicProvider` - Anthropic Claude implementation
  - `LocalLLMProvider` - Ollama implementation
  - `AIProviderFactory` - Provider factory

- `app.py` - Flask API
  - `/api/ai-recommendations` - AI recommendation endpoint
  - `/api/config` - Updated with AI settings support

- `config.example.json` - Configuration template with AI settings

### Dependencies

Add to requirements.txt:
```
requests>=2.31.0
```

No additional dependencies required - uses standard HTTP APIs.

## Future Enhancements

- **Scheduled AI analysis** - Run AI recommendations periodically
- **Learning from feedback** - Track accepted/rejected recommendations
- **Custom prompts** - Allow users to customize AI analysis prompts
- **Multi-model ensemble** - Combine multiple AI providers
- **Cost tracking** - Monitor API usage and costs
- **Recommendation history** - Store and analyze past recommendations

---

[⬆ Back to README](../README.md)
