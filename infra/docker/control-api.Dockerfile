# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/config/package.json ./packages/config/
COPY packages/postiz-client/package.json ./packages/postiz-client/
COPY packages/observability/package.json ./packages/observability/
COPY apps/control-api/package.json ./apps/control-api/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client before building (required for TypeScript types)
RUN node_modules/.bin/prisma generate --schema=apps/control-api/prisma/schema.prisma

# Build workspace packages first, then the app
RUN pnpm --filter @social-bot/domain build
RUN pnpm --filter @social-bot/config build
RUN pnpm --filter @social-bot/postiz-client build
RUN pnpm --filter @social-bot/observability build
RUN pnpm --filter control-api build

# Deploy creates standalone with flat(ter) node_modules
# prisma is in prod deps so it's included in the standalone
RUN pnpm --filter control-api deploy --prod /app/standalone

# Copy prisma schema into the standalone for generate
RUN cp -r apps/control-api/prisma /app/standalone/prisma

# Generate Prisma client inside the standalone (runs as root → no permission issues)
RUN cd /app/standalone && node_modules/.bin/prisma generate

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
# openssl is required by Prisma engine binaries
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV production

# Copy standalone (includes flat node_modules + pre-generated Prisma client)
COPY --from=builder /app/standalone .

# dist/ may be git-ignored and excluded from deploy — copy explicitly
COPY --from=builder /app/apps/control-api/dist ./dist
# prisma schema is already in ./prisma from deploy, but be explicit
COPY --from=builder /app/apps/control-api/prisma ./prisma
COPY --from=builder /app/apps/control-api/entrypoint.sh ./entrypoint.sh

# Copy built workspace packages into the standalone node_modules
COPY --from=builder /app/packages/domain/dist ./node_modules/@social-bot/domain/dist
COPY --from=builder /app/packages/config/dist ./node_modules/@social-bot/config/dist
COPY --from=builder /app/packages/postiz-client/dist ./node_modules/@social-bot/postiz-client/dist
COPY --from=builder /app/packages/observability/dist ./node_modules/@social-bot/observability/dist

# Create upload dir and set ownership on everything in one layer
RUN mkdir -p /data/uploads \
    && addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 apiuser \
    && chown -R apiuser:nodejs /app \
    && chown -R apiuser:nodejs /data/uploads \
    && chmod +x /app/entrypoint.sh

USER apiuser
EXPOSE 4000

# entrypoint: prisma migrate deploy → node dist/main.js
CMD ["/bin/sh", "/app/entrypoint.sh"]
