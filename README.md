<div align="center">

<img src="https://raw.githubusercontent.com/YonierGomez/ai-locker/main/docs/icon.svg" alt="AI Locker Logo" width="120" height="120" style="border-radius:28px;" />

# ✦ AI Locker

<img src="https://raw.githubusercontent.com/YonierGomez/ai-locker/main/docs/promptly.png" alt="AI Locker — AI Prompts Manager" width="100%" style="max-width:900px;border-radius:12px;" />

**AI Prompts Manager** — A beautiful, self-hosted web app to manage your AI prompts, skills, steering configurations, MCP server setups, and shell commands. **Includes built-in AI Chat** to generate prompts, skills, steering rules, MCP configs, and commands from natural language.

Built with a true-black glassmorphism design and multi-provider AI support.

[![Docker](https://img.shields.io/badge/Docker-yoniergomez%2Fai--locker-2496ED?logo=docker&logoColor=white)](https://hub.docker.com/r/yoniergomez/ai-locker)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🚀 Quick Start](#-quick-start) · [🐳 Docker](#-docker-deployment) · [✨ Features](#-features) · [📡 API](#-api-reference) · [🤝 Contributing](#-contributing)

---

### ☕ Support this project

If AI Locker saves you time, consider supporting its development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors)](https://github.com/sponsors/YonierGomez)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/yoniergomez)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🤖 **AI Chat** | Built-in chat to generate prompts, skills, steering, MCP configs, and commands from natural language. Supports **OpenAI**, **Anthropic**, **Google Gemini**, **Amazon Bedrock**, and **OpenRouter**. Persistent history, latest models (GPT-5.4, Claude 4.6, Gemini 3.1). |
| 📝 **Prompts** | Store AI prompt templates with categories, models, temperature, max tokens, and Markdown editor |
| ⚡ **Skills** | Reusable AI skill definitions with trigger phrases and active/inactive toggle |
| 🧭 **Steering** | Behavioral guidance & system instructions with scope (global/project/session) and priority |
| 🔌 **MCP Configs** | Model Context Protocol server configurations with syntax-highlighted JSON editor |
| 💻 **Commands** | Shell command library with shell/platform/category, copy-to-clipboard, and usage tracking |
| 📊 **Dashboard** | Analytics with activity heatmap, usage charts, model distribution, and favorites library |
| 🔍 **Smart Search** | Command palette (⌘K) for instant search across all sections. Full-text search, category filters, favorites filter. |
| 🗂️ **Detail View** | Read-only detail modal for every item — maximizable to full screen |
| 📝 **Markdown Editor** | Edit / Split / Preview modes with live rendering and syntax highlighting |
| 📈 **Token Counter** | Real-time token estimation for all content, color-coded by size |
| 🏷️ **Tags & Categories** | Custom tags and categories with color picker |
| 🗑️ **Trash** | Soft delete with 5-day auto-purge and one-click restore |
| ☁️ **S3 Backup & Sync** | AWS S3 / Cloudflare R2 / Backblaze B2 / MinIO — backup, restore, and auto-sync scheduling |
| 📱 **Responsive** | Full mobile support — works on any screen size |
| 🐳 **Docker Ready** | Single container with PostgreSQL, multi-stage build |
| 🎨 **Glassmorphism UI** | True-black theme (#0a0a0a), blur, transparency and gradients with spring animations |

---

## 🐳 Deploy with Docker

No local dependencies needed — just Docker. The official image is published on Docker Hub as **`yoniergomez/ai-locker`** and supports `amd64`, `arm64`, and `armv7`.

### Option A: Docker Compose (recommended)

No clone required. Includes PostgreSQL, persistent volumes, and automatic restarts.

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/YonierGomez/ai-locker/main/compose.yaml

# Start (pulls the image automatically from Docker Hub)
docker compose up -d
```

Open **http://localhost:9090** and you're done.

<details>
<summary><strong>compose.yaml</strong></summary>

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
      DB_NAME: ai-locker
      DB_USER: ai-locker
      DB_PASSWORD: secret
      DB_TYPE: postgres
      # Alternatively, use a connection string:
      # DATABASE_URL: postgresql://ai-locker:secret@postgres-db:5432/ai-locker
    volumes:
      - ai_locker_data:/data
    restart: unless-stopped
    depends_on:
      postgres-db:
        condition: service_healthy

  postgres-db:
    image: postgres:alpine
    container_name: ai-locker_postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: ai-locker
      POSTGRES_USER: ai-locker
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ai-locker -d ai-locker"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  ai_locker_data:
  postgres_data:
```

</details>

---

### Option B: Docker Compose — SQLite (no database service)

Minimal compose file — single container with built-in SQLite. No PostgreSQL required.

```bash
# Download the compose file
curl -O https://raw.githubusercontent.com/YonierGomez/ai-locker/main/compose.yaml

# Start
docker compose up -d
```

<details>
<summary><strong>compose.yaml (SQLite variant)</strong></summary>

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
      DB_PATH: /data/ai-locker.db
    volumes:
      - ai_locker_data:/data
    restart: unless-stopped

volumes:
  ai_locker_data:
```

</details>

Open **http://localhost:9090**.

---

### Option C: Docker run — SQLite

Single container with built-in SQLite. No extra services required.

```bash
docker run -d \
  --name ai-locker \
  -p 3001:3001 \
  -v ai_locker_data:/data \
  --restart unless-stopped \
  yoniergomez/ai-locker:latest
```

Open **http://localhost:3001**.

---

### Option D: Docker run — External PostgreSQL

Point to your own PostgreSQL instance via a connection string.

```bash
docker run -d \
  --name ai-locker \
  -p 3001:3001 \
  -v ai_locker_data:/data \
  -e DATABASE_URL=postgresql://user:pass@host:5432/ai-locker \
  --restart unless-stopped \
  yoniergomez/ai-locker:latest
```

---

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port (container-internal) |
| `NODE_ENV` | `production` | Environment |
| `DATABASE_URL` | — | Full PostgreSQL/MySQL connection string |
| `DB_HOST` / `DB_PORT` / `DB_NAME` / `DB_USER` / `DB_PASSWORD` / `DB_TYPE` | — | Individual DB vars (alternative to `DATABASE_URL`) |
| `DB_PATH` | `/data/prompts.db` | SQLite path (used when no DB vars are set) |

### Useful commands

```bash
# View logs
docker compose logs -f

# Stop
docker compose down

# Update to the latest image
docker compose pull && docker compose up -d

# Build from source instead of using the official image
git clone https://github.com/YonierGomez/ai-locker.git && cd ai-locker
# Edit compose.yaml: replace `image:` with `build: .`, then:
docker compose up -d --build

# Backup PostgreSQL
docker exec ai-locker_postgres pg_dump -U ai-locker ai-locker > backup-$(date +%Y%m%d).sql

# Backup SQLite (docker run mode)
docker cp ai-locker:/data/prompts.db ./backup-$(date +%Y%m%d).db

# Custom port
PORT=8080 docker compose up -d
```

---

## 🛠️ Development

Only needed if you want to modify the source code.

```bash
npm run install:all   # install all dependencies
npm run dev           # start backend + frontend in watch mode
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

##  Project Structure

```
ai-locker/
├── backend/                 # Express.js API
│   ├── config/
│   │   └── database.js      # PostgreSQL / SQLite setup
│   ├── routes/
│   │   ├── ai.js            # AI Chat (multi-provider: OpenAI, Anthropic, Gemini, Bedrock, OpenRouter)
│   │   ├── prompts.js       # Prompts CRUD
│   │   ├── skills.js        # Skills CRUD
│   │   ├── steering.js      # Steering CRUD
│   │   ├── mcp.js           # MCP Configs CRUD
│   │   ├── commands.js      # Commands CRUD
│   │   ├── tags.js          # Tags management
│   │   ├── categories.js    # Categories management
│   │   ├── backup.js        # S3 backup/restore (export + import)
│   │   ├── trash.js         # Soft delete / trash
│   │   └── settings.js      # App settings + stats
│   └── server.js            # Entry point + auto-sync cron
├── frontend/                # React + Vite
│   └── src/
│       ├── components/      # Shared UI components
│       │   ├── CommandPalette.jsx  # ⌘K search
│       │   ├── Sidebar.jsx
│       │   ├── Topbar.jsx
│       │   ├── ItemCard.jsx
│       │   ├── DetailModal.jsx  # Full read-only detail view
│       │   ├── Modal.jsx        # Create/edit modal (maximizable)
│       │   ├── MarkdownEditor.jsx
│       │   ├── ModelSelector.jsx
│       │   ├── CategorySelector.jsx
│       │   └── TagsSelector.jsx
│       ├── pages/
│       │   ├── AiSessionPage.jsx   # AI Chat
│       │   ├── DashboardPage.jsx
│       │   ├── PromptsPage.jsx
│       │   ├── SkillsPage.jsx
│       │   ├── SteeringPage.jsx
│       │   ├── McpPage.jsx
│       │   ├── CommandsPage.jsx
│       │   ├── TrashPage.jsx
│       │   └── SettingsPage.jsx
│       └── utils/
│           ├── api.js       # API client
│           ├── models.js    # AI models list
│           └── tokens.js    # Token estimation
├── docs/
│   └── index.html           # Landing page
├── Dockerfile               # Multi-stage build
├── compose.yaml             # Docker Compose (app + PostgreSQL)
└── README.md
```

---

## 🗂️ Detail View

Every item in the library has a **full-screen detail view** accessible by clicking on any card:

- Read-only view of all metadata (model, tokens, temperature, created/updated dates, tags)
- **Markdown rendering** for prompts, skills, and steering content
- **Syntax-highlighted JSON** for MCP configurations (transparent background, just colors)
- **Maximize button** — expand the view to fill the entire screen
- Action buttons: Copy · Edit · Delete · Toggle Favorite
- Edit also opens maximized if the detail view was maximized

---

## 💻 Commands

A dedicated library for shell commands:

- Supports shells: `bash`, `zsh`, `sh`, `fish`, `powershell`, `cmd`, `python`, `ruby`, `node`
- Platform filter: `all`, `macOS`, `Linux`, `Windows`
- Copy to clipboard with a single click, usage counter
- Category organization, favorites, search
- Included in S3 backups and JSON exports

---

## ☁️ Backup & Restore

Your library is always safe. AI Locker supports full backup and restore through S3-compatible storage and local JSON files.

### S3 / Cloud storage

Compatible with **AWS S3**, **Cloudflare R2**, **Backblaze B2**, and **MinIO** — any S3-compatible provider works.

| Action | Description |
|--------|-------------|
| **Test Connection** | Validates credentials and bucket access before saving |
| **Save S3 Config** | Saves connection settings and auto-sync preferences in one click |
| **Backup Now** | Immediately uploads a timestamped snapshot + updates `latest.json` |
| **Browse Backups** | Lists all backups in your bucket with date and size |
| **Restore** | One-click restore from any listed snapshot — choose merge or full replace |
| **Auto-sync** | Scheduled automatic backups — toggle on and it starts immediately, no restart needed |

**Auto-sync intervals:** `15m · 30m · 1h · 2h · 3h · 6h · 9h · 12h · 1d · 2d`

### What gets backed up

Every section is included in every backup:

- ✅ Prompts
- ✅ Skills
- ✅ Steering
- ✅ MCP Configs
- ✅ Commands
- ✅ Tags
- ✅ Categories

### JSON export & import

No cloud storage? No problem. Export a full JSON snapshot at any time and import it to migrate between instances.

```bash
# Export via API
curl http://localhost:3001/api/backup/export/json -o backup.json

# Import via API
curl -X POST http://localhost:3001/api/backup/import/json \
  -H "Content-Type: application/json" \
  -d @backup.json
```

> **Tip:** The prefix path is auto-normalized — if you enter `my-backups` without a trailing `/`, AI Locker adds it automatically so S3 keys are always correct.

---

## 🤖 AI Chat

AI Locker includes a built-in **AI Chat** that generates library items from natural language. Describe what you need and the AI creates prompts, skills, steering rules, MCP configs, or shell commands — ready to save to your library.

### Multi-provider support

| Provider | Models |
|----------|--------|
| **OpenAI** | GPT-5.4, GPT-4.1, o3, o1 |
| **Anthropic** | Claude Opus 4.6, Sonnet 4.6, Haiku 4.5 |
| **Google Gemini** | Gemini 3.1 Pro, Gemini 3 Flash, Gemini 2.5 Pro/Flash |
| **Amazon Bedrock** | Claude 4.6, Nova 2 (via AWS IAM) |
| **OpenRouter** | All providers in one API key |

Configure your preferred provider and API key in **Settings → AI Integration**. Chat history persists in your browser and can be cleared anytime.

---

## 🤖 Supported AI Models (March 2026)

AI Locker ships with an up-to-date model list from all major providers:

- **OpenAI**: GPT-5.4, GPT-4.1, o3, o1
- **Anthropic**: Claude Opus 4.6, Sonnet 4.6, Haiku 4.5, Claude 3.7 Sonnet
- **Google**: Gemini 3.1 Pro, Gemini 3 Flash, Gemini 2.5 Pro/Flash
- **Meta**: Llama 4 Maverick, Llama 4 Scout, Llama 3.3 70B
- **xAI**: Grok 3 Beta, Grok 3 Mini Beta
- **DeepSeek**: V3 (Mar 2026), R1
- **Mistral**: Small 3.1, Large 2411, Codestral
- **NVIDIA**: Nemotron 3 Super, Nemotron Ultra 253B
- **ByteDance**: Seed 2.0 Lite
- **MiniMax**: M2.7
- **Microsoft**: Phi-4, Phi-4 Mini
- **Amazon**: Nova Pro, Nova Lite, Nova Micro
- And more...

You can also type any custom model ID directly in the model selector.

---

## 📡 API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/prompts` | List prompts |
| `POST` | `/api/prompts` | Create prompt |
| `PUT` | `/api/prompts/:id` | Update prompt |
| `DELETE` | `/api/prompts/:id` | Move to trash |
| `PATCH` | `/api/prompts/:id/favorite` | Toggle favorite |
| `GET` | `/api/skills` | List skills |
| `GET` | `/api/steering` | List steering |
| `GET` | `/api/mcp` | List MCP configs |
| `GET` | `/api/mcp/export/active` | Export active configs as JSON |
| `GET` | `/api/commands` | List commands |
| `POST` | `/api/commands` | Create command |
| `PUT` | `/api/commands/:id` | Update command |
| `DELETE` | `/api/commands/:id` | Move to trash |
| `PATCH` | `/api/commands/:id/favorite` | Toggle favorite |
| `PATCH` | `/api/commands/:id/use` | Increment use count |
| `GET` | `/api/trash` | List trashed items |
| `PATCH` | `/api/trash/:type/:id/restore` | Restore item |
| `DELETE` | `/api/trash/:type/:id` | Permanently delete |
| `DELETE` | `/api/trash` | Empty trash |
| `GET` | `/api/backup/export/json` | Export all data as JSON |
| `POST` | `/api/backup/import/json` | Import JSON backup |
| `POST` | `/api/backup/s3/upload` | Backup to S3 |
| `GET` | `/api/backup/s3/list` | List S3 backups |
| `POST` | `/api/backup/s3/restore` | Restore from S3 |
| `POST` | `/api/backup/s3/test` | Test S3 connection |
| `GET` | `/api/backup/s3/status` | S3 configuration status |
| `GET` | `/api/ai/config` | Get AI config (provider, model, configured) |
| `POST` | `/api/ai/generate` | Generate chat response (multi-provider) |
| `POST` | `/api/ai/save` | Save AI-generated item to library |
| `GET` | `/api/settings` | Get all settings |
| `PUT` | `/api/settings` | Update settings |
| `GET` | `/api/settings/stats` | Get statistics & analytics |
| `GET` | `/api/health` | Health check |

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ☕ Support

If this project helps you, please consider supporting its development:

<div align="center">

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor%20on%20GitHub-%E2%9D%A4-ea4aaa?style=for-the-badge&logo=github-sponsors)](https://github.com/sponsors/YonierGomez)

[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?style=for-the-badge&logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/yoniergomez)

</div>

---

## 📄 License

MIT © [Yonier Gomez](https://github.com/YonierGomez)
