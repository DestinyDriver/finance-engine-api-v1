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

# Security: don't run as root
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy built artifacts
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/.bin/prisma ./node_modules/.bin/prisma
COPY --chown=nodejs:nodejs . .

# Create logs directory
RUN mkdir -p logs && chown -R nodejs:nodejs logs

# Switch to non-root user
USER nodejs

EXPOSE 3000

# Run migrations then start
CMD ["sh", "-c", "npx prisma migrate deploy && node src/server.js"]
