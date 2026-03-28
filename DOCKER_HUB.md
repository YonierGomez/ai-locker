# AI Locker

A beautiful, self-hosted web app to manage your AI prompts, skills, steering configurations, MCP server setups, and shell commands. Includes built-in **AI Chat** to generate library items from natural language.

Built with a true-black glassmorphism design and multi-provider AI support (OpenAI, Anthropic, Google Gemini, Amazon Bedrock, OpenRouter).

🔗 **[GitHub](https://github.com/YonierGomez/ai-locker)** · **[Live Demo](https://yoniergomez.github.io/ai-locker)**

---

## Quick Start

### SQLite (simplest — no external DB)

```bash
docker run -d \
  --name ai-locker \
  -p 9090:3001 \
  -v ai_locker_data:/data \
  --restart unless-stopped \
  yoniergomez/ai-locker:latest
```

Open **http://localhost:9090**

---

### Docker Compose + PostgreSQL (recommended)

```bash
curl -O https://raw.githubusercontent.com/YonierGomez/ai-locker/main/compose.yaml
docker compose up -d
```

Open **http://localhost:9090**

<details>
<summary>compose.yaml</summary>

```yaml
services:
  app:
    image: yoniergomez/ai-locker:latest
    container_name: ai-locker
    ports:
      - "9090:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      DB_HOST: postgres-db
      DB_PORT: 5432
      DB_NAME: promptly
      DB_USER: promptly
      DB_PASSWORD: secret
      DB_TYPE: postgres
    volumes:
      - ai_locker_data:/data
    restart: unless-stopped
    depends_on:
      postgres-db:
        condition: service_healthy

  postgres-db:
    image: postgres:alpine
    container_name: ai-locker-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: promptly
      POSTGRES_USER: promptly
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U promptly -d promptly"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  ai_locker_data:
  postgres_data:
```

</details>

---

### External PostgreSQL (connection string)

```bash
docker run -d \
  --name ai-locker \
  -p 9090:3001 \
  -v ai_locker_data:/data \
  -e DATABASE_URL=postgresql://user:pass@host:5432/dbname \
  --restart unless-stopped \
  yoniergomez/ai-locker:latest
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Internal server port |
| `NODE_ENV` | `production` | Environment |
| `DATABASE_URL` | — | Full PostgreSQL or MySQL connection string |
| `DB_HOST` | — | DB hostname (triggers Postgres/MySQL mode) |
| `DB_PORT` | `5432` | DB port |
| `DB_NAME` | — | Database name |
| `DB_USER` | — | Database user |
| `DB_PASSWORD` | — | Database password |
| `DB_TYPE` | `postgres` | `postgres` or `mysql` |
| `DB_PATH` | `/data/prompts.db` | SQLite path (used when no DB vars set) |

> If none of the DB vars are set, the app uses **SQLite** automatically at `/data/prompts.db`.

---

## Supported Architectures

`amd64` · `arm64` · `armv7`

---

## Features

- 📝 **Prompts** — templates with categories, models, temperature, token limits
- ⚡ **Skills** — reusable AI behavior definitions with trigger phrases
- 🧭 **Steering** — system instructions with scope and priority
- 🔌 **MCP Configs** — Model Context Protocol server configurations
- 💻 **Commands** — shell command library with usage tracking
- 🤖 **AI Chat** — multi-provider (OpenAI, Anthropic, Gemini, Bedrock, OpenRouter)
- 📊 **Dashboard** — activity heatmap, usage charts, model distribution
- ☁️ **S3 Backup** — AWS S3 / Cloudflare R2 / Backblaze B2 / MinIO
- 📝 **Notes** — Post-it Wall, Board, Grid, Timeline and List views
- 🗑️ **Trash** — soft delete with auto-purge and restore

---

## Useful Commands

```bash
# View logs
docker compose logs -f

# Update to latest
docker compose pull && docker compose up -d

# Backup SQLite
docker cp ai-locker:/data/prompts.db ./backup-$(date +%Y%m%d).db

# Backup PostgreSQL
docker exec ai-locker-postgres pg_dump -U promptly promptly > backup-$(date +%Y%m%d).sql
```

---

## Links

- 📦 [GitHub Repository](https://github.com/YonierGomez/ai-locker)
- 🐛 [Issues](https://github.com/YonierGomez/ai-locker/issues)
- ❤️ [Sponsor](https://github.com/sponsors/YonierGomez)
