# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/config/package.json ./packages/config/
COPY packages/observability/package.json ./packages/observability/
COPY apps/ai-worker/package.json ./apps/ai-worker/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm --filter @social-bot/domain build
RUN pnpm --filter @social-bot/config build
RUN pnpm --filter @social-bot/observability build
RUN pnpm --filter ai-worker build

# Deploy creates standalone with flat(ter) node_modules
RUN pnpm --filter ai-worker deploy --prod /app/standalone

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app

ENV NODE_ENV production

# Copy standalone (flat node_modules)
COPY --from=builder /app/standalone .

# dist/ may be git-ignored during deploy — copy explicitly
COPY --from=builder /app/apps/ai-worker/dist ./dist

# Copy built workspace packages
COPY --from=builder /app/packages/domain/dist ./node_modules/@social-bot/domain/dist
COPY --from=builder /app/packages/config/dist ./node_modules/@social-bot/config/dist
COPY --from=builder /app/packages/observability/dist ./node_modules/@social-bot/observability/dist

RUN addgroup --system --gid 1001 nodejs \
    && adduser --system --uid 1001 worker \
    && chown -R worker:nodejs /app

USER worker

CMD ["node", "dist/main.js"]
