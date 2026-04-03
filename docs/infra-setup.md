# Infrastructure Setup Guide

## Prerequisites

- Docker Desktop (Mac/Windows) or Docker Engine + Compose v2 (Linux)
- Node.js 20+
- pnpm 9.x (`npm i -g pnpm@9`)

## First-time Setup

```bash
# 1. Clone and install
pnpm install

# 2. Copy env file
cp .env.example .env
# Edit .env — fill in JWT_SECRET at minimum

# 3. Start all services
docker compose -f docker-compose.dev.yml up -d

# 4. Check everything is healthy
docker compose -f docker-compose.dev.yml ps
```

### Startup Order

Docker Compose handles dependency ordering automatically via `depends_on` + healthchecks. The services come up in this order:

```
postgres, redis
  → temporal-postgresql, temporal-elasticsearch
    → temporal
      → control-api, ai-worker, n8n, postiz
        → dashboard-web
```

Temporal takes ~60s to initialize on first boot (schema creation + Elasticsearch index setup). Postiz waits for Temporal to be healthy before starting.

## Postiz Initial Configuration

After first boot:

1. Open **http://localhost:4200**
2. Register an admin account (first registration becomes admin)
3. Go to **Settings → API Keys → Generate**
4. Copy the key and set in `.env`:
   ```
   POSTIZ_API_KEY=your-key-here
   POSTIZ_BASE_URL=http://postiz:3000
   ```
5. Restart control-api to pick up the new key:
   ```bash
   docker compose -f docker-compose.dev.yml restart control-api
   ```
6. In Postiz, connect your social channels:
   - Facebook / Instagram → requires Meta App (Graph API v19)
   - TikTok → requires TikTok Developer App (Content Posting API v2)
   - Add your app credentials in Postiz **Settings → Integrations**

## Port Reference

| URL | Service | Notes |
|-----|---------|-------|
| http://localhost:3000 | Dashboard Web | Our admin UI |
| http://localhost:4000 | Control API | Swagger docs at `/api/v1/docs` |
| http://localhost:4200 | Postiz UI | Social channel management + scheduling |
| http://localhost:3001 | Postiz API | Used internally by Postiz frontend |
| http://localhost:5678 | n8n | Workflow automation |
| localhost:5432 | PostgreSQL | App DB (`socialbot` database) |
| localhost:6379 | Redis | Queue + cache |
| localhost:7233 | Temporal | gRPC (internal use only) |

## Common Commands

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Stop all services
docker compose -f docker-compose.dev.yml down

# View logs for a service
docker compose -f docker-compose.dev.yml logs -f control-api

# Restart a single service
docker compose -f docker-compose.dev.yml restart control-api

# Rebuild after code changes
docker compose -f docker-compose.dev.yml up -d --build control-api

# Run DB migration locally (requires postgres running)
pnpm --filter control-api db:migrate

# Generate Prisma client after schema change
pnpm --filter control-api db:generate

# Open Prisma Studio (DB GUI)
pnpm --filter control-api db:studio

# Type check all packages
pnpm typecheck

# Build all packages
pnpm build
```

## Troubleshooting

### Postiz fails with `ECONNREFUSED ::1:7233`
Temporal is not running or not yet healthy. Check:
```bash
docker compose -f docker-compose.dev.yml ps temporal
docker compose -f docker-compose.dev.yml logs temporal | tail -20
```

### Postiz login shows `/auth/undefined/auth/login`
`NEXT_PUBLIC_BACKEND_URL` is not set in the Postiz container environment. Verify the compose file has:
```yaml
NEXT_PUBLIC_BACKEND_URL: http://localhost:3001
```
Then recreate the container: `docker compose -f docker-compose.dev.yml up -d --force-recreate postiz`

### control-api `Cannot find module '@nestjs/core'`
The Docker image has a stale build. Rebuild:
```bash
docker compose -f docker-compose.dev.yml up -d --build control-api
```

### Temporal fails with `cannot have more than 3 search attribute of type Text`
Temporal is using SQL-only visibility without Elasticsearch. Postiz requires the ES visibility store. The `docker-compose.dev.yml` should include `temporal-elasticsearch` service with `ENABLE_ES=true` on the temporal service. If the temporal-data volume has old schema, wipe it:
```bash
docker compose -f docker-compose.dev.yml stop temporal postiz
docker compose -f docker-compose.dev.yml rm -f temporal postiz
docker volume rm social-bot_temporal-data 2>/dev/null || true
docker compose -f docker-compose.dev.yml up -d
```

### Prisma client not initialized in Docker
Ensure `prisma` is in `dependencies` (not `devDependencies`) in `apps/control-api/package.json`, and that the Dockerfile runs `prisma generate` inside `/app/standalone` in the builder stage.
