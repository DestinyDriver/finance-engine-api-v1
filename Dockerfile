# ─── Stage 1: Dependencies ─────────────────────────────────────────────────────
FROM node:20-slim AS deps
WORKDIR /app

# Install only production deps first for layer caching
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ─── Stage 2: Build / Prisma Generate ──────────────────────────────────────────
FROM node:20-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci && npm cache clean --force

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

# ─── Stage 3: Production Image ─────────────────────────────────────────────────
FROM node:20-slim AS production
WORKDIR /app

# Install OpenSSL for Prisma
RUN apt-get update -y && apt-get install -y openssl

# Use the built-in non-root node user from the official image

# Copy built artifacts
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=node:node /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=node:node /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --chown=node:node . .

# Create logs directory
RUN mkdir -p logs && chown -R node:node logs

# Switch to non-root user
USER node

EXPOSE 3000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
