# ─────────────────────────────────────────────────────────────
# Stage 1: Dependencies (cached layer)
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS deps

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl python3 make g++ \
    && rm -rf /var/lib/apt/lists/* \
    && chown -R node:node /app

USER node

COPY --chown=node:node --chmod=644 package*.json ./
COPY --chown=node:node --chmod=755 prisma ./prisma/

RUN npm ci --production=false

# ─────────────────────────────────────────────────────────────
# Stage 2: Build
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    && chown -R node:node /app

USER node

COPY --chown=node:node --chmod=755 --from=deps /app/node_modules ./node_modules
COPY --chown=node:node --chmod=755 . .

RUN npx prisma generate
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 3: API Server Runtime (non-root)
# ─────────────────────────────────────────────────────────────
FROM node:20-slim AS api

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/* \
    # Create non-root user
    && groupadd --gid 1001 sentra \
    && useradd --uid 1001 --gid sentra --shell /bin/bash --create-home sentra \
    && mkdir -p /tmp && chmod 1777 /tmp \
    && chown -R sentra:sentra /app

# Copy only production artifacts
COPY --chown=sentra:sentra --chmod=644 --from=builder /app/package*.json ./
COPY --chown=sentra:sentra --chmod=755 --from=builder /app/dist ./dist
COPY --chown=sentra:sentra --chmod=755 --from=builder /app/prisma ./prisma
COPY --chown=sentra:sentra --chmod=755 --from=builder /app/node_modules ./node_modules

USER sentra

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/ping', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/src/server.js"]

# ─────────────────────────────────────────────────────────────
# Stage 4: Worker Runtime (separate process)
# ─────────────────────────────────────────────────────────────
FROM api AS worker

USER sentra

ENV WORKER_MODE=true

CMD ["node", "dist/src/worker.js"]
