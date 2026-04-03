# ─── Stage 1: deps ───────────────────────────────────────────
FROM node:20-alpine AS deps
RUN corepack enable && corepack prepare pnpm@9.1.4 --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
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
COPY --from=deps /app/packages ./packages
COPY --from=deps /app/apps/dashboard-web ./apps/dashboard-web
COPY . .

RUN pnpm --filter dashboard-web build

# ─── Stage 3: runner ─────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/dashboard-web/.next/standalone ./
COPY --from=builder /app/apps/dashboard-web/.next/static ./apps/dashboard-web/.next/static
COPY --from=builder /app/apps/dashboard-web/public ./apps/dashboard-web/public

USER nextjs
EXPOSE 3000
ENV PORT 3000

CMD ["node", "apps/dashboard-web/server.js"]
