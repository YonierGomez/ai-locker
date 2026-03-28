# ── Stage 1: Build frontend ──────────────────────────────────
FROM node:alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# ── Stage 2: Production image ─────────────────────────────────
FROM node:alpine AS production

# Install wget for healthcheck
RUN apk add --no-cache wget

WORKDIR /app

# Install backend dependencies
COPY backend/package.json ./
RUN npm install --omit=dev

# Copy backend source
COPY backend/ ./

# Copy built frontend
COPY --from=frontend-builder /app/frontend/build ./frontend/build

# Create data directory
RUN mkdir -p /data && chown -R node:node /data /app

# Use non-root user
USER node

EXPOSE 3001

ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/prompts.db

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3001/api/health || exit 1

CMD ["node", "server.js"]
