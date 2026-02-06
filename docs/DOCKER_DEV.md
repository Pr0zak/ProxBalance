# Docker Development

Local development environment for testing ProxBalance changes.

---

## Prerequisites

- Docker Desktop (Windows/Mac) or Docker + Docker Compose (Linux)
- Git

---

## Quick Start

```bash
docker-compose -f docker-compose.dev.yml up --build
```

Access the application at `http://localhost:5000`.

Stop with:
```bash
docker-compose -f docker-compose.dev.yml down
```

---

## Development Workflow

### Volume mounts

The Docker setup mounts source files, so changes are reflected without rebuilding:

- `app.py` -- Flask API (restart container after changes)
- `index.html` -- Web UI (refresh browser)
- `ai_provider.py` -- AI provider logic
- `config.json` -- Configuration

### Restart after Python changes

```bash
docker-compose -f docker-compose.dev.yml restart
```

### View logs

```bash
docker-compose -f docker-compose.dev.yml logs -f
```

### Test API endpoints

```bash
curl http://localhost:5000/api/health
curl http://localhost:5000/api/config
```

---

## Test Data

Create mock cluster data:

```bash
mkdir -p dev-cache
cat > dev-cache/cluster_cache.json << 'EOF'
{
  "collected_at": "2025-01-16T12:00:00",
  "nodes": [
    {"name": "pve1", "cpu_percent": 45.5, "mem_percent": 62.3, "load_1": 2.5, "status": "online"},
    {"name": "pve2", "cpu_percent": 35.2, "mem_percent": 55.1, "load_1": 1.8, "status": "online"}
  ],
  "guests": []
}
EOF
```

---

## Test Configuration

```bash
cat > config.json << 'EOF'
{
  "collection_interval_minutes": 60,
  "ui_refresh_interval_minutes": 15,
  "proxmox_host": "localhost",
  "ai_provider": "none",
  "ai_recommendations_enabled": false
}
EOF
```

---

## Testing AI Model Selection

```bash
# Anthropic models (static list, no API key needed)
curl -X POST http://localhost:5000/api/ai-models \
  -H "Content-Type: application/json" \
  -d '{"provider": "anthropic"}'

# OpenAI models (requires API key)
curl -X POST http://localhost:5000/api/ai-models \
  -H "Content-Type: application/json" \
  -d '{"provider": "openai", "api_key": "sk-..."}'

# Ollama models (requires Ollama running)
curl -X POST http://localhost:5000/api/ai-models \
  -H "Content-Type: application/json" \
  -d '{"provider": "local", "base_url": "http://host.docker.internal:11434"}'
```

---

## Troubleshooting

### Container won't start

```bash
docker-compose -f docker-compose.dev.yml logs
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up --build
```

### Port already in use

Change the port mapping in `docker-compose.dev.yml`:
```yaml
ports:
  - "5001:5000"
```

### Permission issues (Linux)

```bash
sudo chown -R $USER:$USER dev-cache/
```

---

## Clean Up

```bash
docker-compose -f docker-compose.dev.yml down -v
rm -rf dev-cache/
```

---

[Back to Documentation](README.md)
