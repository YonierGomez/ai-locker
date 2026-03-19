<div align="center">

<img src="https://raw.githubusercontent.com/YonierGomez/promptly/main/docs/logo.png" alt="Promptly Logo" width="80" height="80" />

# ✦ Promptly

**AI Prompts Manager** — A beautiful, self-hosted web app to manage your AI prompts, skills, steering configurations, MCP server setups, and shell commands.

Built with Apple's **Liquid Glass** design aesthetic (iOS 18 inspired).

[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://hub.docker.com)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://postgresql.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

[🚀 Quick Start](#-quick-start) · [🐳 Docker](#-docker-deployment) · [✨ Features](#-features) · [📡 API](#-api-reference) · [🤝 Contributing](#-contributing)

---

### ☕ Support this project

If Promptly saves you time, consider supporting its development:

[![GitHub Sponsors](https://img.shields.io/badge/Sponsor-%E2%9D%A4-ea4aaa?logo=github-sponsors)](https://github.com/sponsors/YonierGomez)
[![Buy Me a Coffee](https://img.shields.io/badge/Buy%20Me%20a%20Coffee-FFDD00?logo=buy-me-a-coffee&logoColor=black)](https://buymeacoffee.com/yoniergomez)

</div>

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📝 **Prompts** | Store AI prompt templates with categories, models, temperature, max tokens, and Markdown editor |
| ⚡ **Skills** | Reusable AI skill definitions with trigger phrases and active/inactive toggle |
| 🧭 **Steering** | Behavioral guidance & system instructions with scope (global/project/session) and priority |
| 🔌 **MCP Configs** | Model Context Protocol server configurations with syntax-highlighted JSON editor |
| 💻 **Commands** | Shell command library with shell/platform/category, copy-to-clipboard, and usage tracking |
| 📊 **Dashboard** | Analytics with activity heatmap, usage charts, model distribution, and favorites library |
| 🔍 **Smart Search** | Full-text search, category filters, favorites filter across all sections |
| 🗂️ **Detail View** | Read-only detail modal for every item — maximizable to full screen |
| 📝 **Markdown Editor** | Edit / Split / Preview modes with live rendering and syntax highlighting |
| 📈 **Token Counter** | Real-time token estimation for all content, color-coded by size |
| 🏷️ **Tags & Categories** | Custom tags and categories with color picker |
| 🗑️ **Trash** | Soft delete with 5-day auto-purge and one-click restore |
| ☁️ **S3 Backup & Sync** | AWS S3 / Cloudflare R2 / Backblaze B2 / MinIO — backup, restore, and auto-sync scheduling |
| 📱 **Responsive** | Full mobile support — works on any screen size |
| 🐳 **Docker Ready** | Single container with PostgreSQL, multi-stage build |
| 🎨 **Liquid Glass UI** | Apple iOS 18-inspired glassmorphism with spring animations |

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/YonierGomez/promptly.git
cd promptly

# Start with Docker Compose
docker compose up -d

# Open in browser
open http://localhost:3001
```

### Option 2: Development

```bash
# Install all dependencies
npm run install:all

# Start both backend and frontend
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

---

## 🐳 Docker Deployment

### Basic deployment

```bash
docker compose up -d
```

App will be available at **http://localhost:3001**

### Custom port

```bash
PORT=8080 docker compose up -d
```

### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `NODE_ENV` | `production` | Environment |
| `DATABASE_URL` | — | PostgreSQL connection string |
| `DB_PATH` | `/data/prompts.db` | SQLite path (if not using PostgreSQL) |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL (CORS) |

### Docker commands

```bash
# Start
docker compose up -d

# Stop
docker compose down

# View logs
docker compose logs -f

# Rebuild after updates
docker compose up -d --build

# Backup database (PostgreSQL)
docker exec promptly_postgres pg_dump -U promptly promptly > backup-$(date +%Y%m%d).sql
```

---

## 📁 Project Structure

```
promptly/
├── backend/                 # Express.js API
│   ├── config/
│   │   └── database.js      # PostgreSQL / SQLite setup
│   ├── routes/
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

## ☁️ S3 Backup & Sync

Supports **AWS S3**, **Cloudflare R2**, **Backblaze B2**, and **MinIO**:

- **Save S3 Config** — saves connection + auto-sync settings in one click
- **Test Connection** — validates credentials before saving
- **Backup Now** — immediately uploads a timestamped snapshot
- **Browse Backups** — list and restore from any previous backup
- **Auto-sync** — scheduled backups with configurable interval:
  `15m · 30m · 1h · 2h · 3h · 6h · 9h · 12h · 1d · 2d`
- Prefix path is auto-normalized (adds trailing `/` if missing)
- All sections included: Prompts, Skills, Steering, MCP, Commands, Tags, Categories

---

## 🤖 Supported AI Models (March 2026)

Promptly ships with an up-to-date model list from all major providers:

- **OpenAI**: GPT-5.4, GPT-4.1, o4-mini, o3, o1
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
