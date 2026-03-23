---
name: app-rename
description: "Use when: renaming the app, changing the app name, updating app title, el nombre de la app sale mal, sigue mostrando el nombre viejo, cómo cambiar el nombre de la app"
---

# App Rename — AI Locker

Guía completa para renombrar la app en todos los lugares donde aparece.

## Archivos frontend (src/)

| Archivo | Qué cambiar |
|---------|-------------|
| `frontend/index.html` | `<title>`, og:title, og:description, twitter:title |
| `frontend/src/components/Sidebar.jsx` | Fallback `\|\| 'AI Locker'` |
| `frontend/src/components/Topbar.jsx` | Fallback `\|\| 'AI Locker'` |
| `frontend/src/pages/DashboardPage.jsx` | Texto "Welcome to..." |
| `frontend/src/pages/SettingsPage.jsx` | Referencias visuales |

## Rebuild obligatorio

```bash
cd frontend && npm run build
```

Verificar también `frontend/build/index.html` — puede quedar stale tras el build.

## Base de datos SQLite — ⚠️ Hay DOS archivos

El backend usa `backend/.env` con `DB_PATH=./data/prompts.db` (ruta relativa desde `backend/`), lo que apunta a **`backend/data/prompts.db`**, NO al del root.

```bash
# El que realmente usa el backend en local:
sqlite3 backend/data/prompts.db "UPDATE settings SET value = 'AI Locker' WHERE key = 'app_name';"

# El del root (actualizar también por consistencia):
sqlite3 data/prompts.db "UPDATE settings SET value = 'AI Locker' WHERE key = 'app_name';"
```

> `onConflict('key').ignore()` en `database.js` solo aplica para DBs nuevas — no actualiza registros existentes.

## Backend

- `backend/routes/ai.js` — system prompt y header `X-Title`
- `backend/server.js` — log de startup (`console.log`)
- `backend/config/database.js` — valor por defecto del seed

## Docker (si aplica)

Los contenedores pueden tener su propia DB con el nombre anterior.
`docker compose down` puede no funcionar si los contenedores se iniciaron de forma independiente:

```bash
docker stop <nombre> && docker rm <nombre>
```

## Convención de nombre

| Contexto | Formato |
|----------|---------|
| UI / marca | `AI Locker` (con espacio) |
| Código, slugs, dominios | `ailocker` o `ai-locker` |
