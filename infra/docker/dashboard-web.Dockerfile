# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc* ./
COPY packages/domain/package.json ./packages/domain/
COPY packages/config/package.json ./packages/config/
COPY packages/ui/package.json ./packages/ui/
COPY apps/dashboard-web/package.json ./apps/dashboard-web/

RUN pnpm install --frozen-lockfile

# ─── Stage 2: builder ────────────────────────────────────────
FROM node:20-alpine AS builder
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN pnpm --filter @social-bot/domain build
RUN pnpm --filter @social-bot/config build
RUN pnpm --filter @social-bot/ui build
RUN pnpm --filter dashboard-web build

# Deploy creates standalone with flat(ter) node_modules (includes next)
RUN pnpm --filter dashboard-web deploy --prod /app/standalone

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

# Copy flat node_modules (includes next + all prod deps)
COPY --from=builder /app/standalone .

# Copy the built Next.js output
COPY --from=builder /app/apps/dashboard-web/.next ./apps/dashboard-web/.next
COPY --from=builder /app/apps/dashboard-web/public ./apps/dashboard-web/public

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node_modules/.bin/next", "start", "--port", "3000"]
