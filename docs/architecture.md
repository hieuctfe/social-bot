# Architecture — Social Bot

## System Overview

Social Bot is a multi-platform social publishing control plane. It does **not** post to social platforms directly. Instead it orchestrates Postiz (the posting engine) and tracks all activity in its own domain.

```
Browser
  │
  ├─► localhost:3000  dashboard-web  (Next.js 14 App Router)
  │         │
  │         └─► localhost:4000  control-api  (NestJS + Prisma + PostgreSQL)
  │                   │
  │                   ├─► localhost:3001  Postiz API  (via postiz-client package only)
  │                   └─► api.anthropic.com  (content generation + QA via @anthropic-ai/sdk)
  │
  ├─► localhost:4200  Postiz UI  (self-hosted social channel management)
  │
  └─► localhost:5678  n8n  (automation, Telegram triggers, AI orchestration)

Background (inside control-api):
  ContentAutomationService  (@Cron every 5 min — generates content per PageProfile)
  ContentSchedulerService   (@Cron every 2 min — schedules APPROVED drafts to Postiz)
```

## Service Map

| Service | Image / Stack | Host Port | Purpose |
|---------|--------------|-----------|---------|
| dashboard-web | Next.js 14, App Router | 3000 | Admin UI — talks only to control-api |
| control-api | NestJS 10, Prisma, PostgreSQL | 4000 | Domain logic, auth, automation crons, audit log |
| ai-worker | Node + BullMQ | — | Background AI jobs (no HTTP API) — currently unused by automation pipeline |
| postgres | postgres:16-alpine | 5432 | Two databases: `socialbot` (control-api) and `postiz` (Postiz) |
| redis | redis:7-alpine | 6379 | BullMQ queues |
| postiz | ghcr.io/gitroomhq/postiz-app | 4200 (UI), 3001 (API) | Publishing engine — owns social OAuth tokens |
| n8n | n8nio/n8n | 5678 | Workflow automation + Telegram webhook receiver |
| temporal | temporalio/auto-setup:1.28.1 | 7233 | Job scheduler required by Postiz |
| temporal-postgresql | postgres:16-alpine | — | Dedicated DB for Temporal (internal only) |
| temporal-elasticsearch | elasticsearch:7.17.27 | — | Temporal visibility store (internal only) |

## Monorepo Structure

```
social-bot/
├── apps/
│   ├── control-api/        NestJS application
│   │   ├── prisma/         Schema (schema.prisma) + seed.ts
│   │   └── src/
│   │       └── modules/
│   │           ├── auth/                     Email+password auth, JWT signing
│   │           ├── automation/               ContentAutomationService (5-min cron)
│   │           │   └── content-automation.service.ts
│   │           ├── page-profile/             PageProfile CRUD + ContentSchedulerService (2-min cron)
│   │           │   └── content-scheduler.service.ts
│   │           ├── social-connection/        SocialConnection CRUD + sync-from-postiz
│   │           ├── content-draft/            ContentDraft CRUD + approve/schedule
│   │           ├── postiz/                   PostizService (ONLY place that calls postiz-client)
│   │           └── ...
│   ├── dashboard-web/      Next.js application
│   │   └── src/
│   │       ├── app/
│   │       │   ├── login/                    Login page (email+password)
│   │       │   └── (dashboard)/              Route group — requires auth cookie
│   │       │       ├── page-profiles/        PageProfile list + generate-now
│   │       │       ├── content-drafts/       Draft list + detail + retry
│   │       │       └── social-connections/   Sync from Postiz + list
│   │       ├── middleware.ts                 Route protection (redirects to /login)
│   │       └── lib/
│   │           ├── auth.ts                   Cookie helpers: getToken/setToken/clearToken
│   │           ├── api-client.ts             Auto-reads sb_token cookie; 401 → redirect login
│   │           └── demo-config.ts            WORKSPACE_ID constant only
│   └── ai-worker/          BullMQ worker (not used by main automation pipeline)
├── packages/
│   ├── domain/             Shared TS types + enums (no runtime deps)
│   ├── config/             Zod env schemas (apiEnvSchema, workerEnvSchema, webEnvSchema)
│   ├── postiz-client/      ONLY allowed caller of Postiz REST API
│   │   └── src/client.ts   Auth: Authorization: <key> (no Bearer prefix)
│   ├── observability/      Logger interface + ConsoleLogger
│   ├── telegram-client/    Placeholder for Telegram Bot API wrapper
│   └── ui/                 Shared React UI primitives
├── infra/docker/           Multi-stage Dockerfiles per app
├── docker-compose.infra.yml  Infra-only compose (postgres, redis, postiz, n8n, temporal)
├── docker-compose.dev.yml    Full stack compose (includes control-api, ai-worker, dashboard-web)
├── .env                    Main env vars (Docker hostnames: postgres, redis, postiz)
├── .env.local              Local dev overrides (localhost URLs for control-api running outside Docker)
├── .env.local-services     Local service credentials (Postiz, n8n login)
└── CLAUDE.md
```

## Data Flow: Automated Content Pipeline

```
[PageProfile is ACTIVE + due for content (matches schedule ±5min)]
                          │
          ContentAutomationService (@Cron */5 * * * *)
                          │
          ┌───────────────┴───────────────┐
          │ strategy=ai-generated         │ strategy=repost
          │                               │
          ▼                               ▼
   Anthropic Claude Haiku        Find latest published
   generates content              content from source page
          │                               │
          ▼                               │
   QA check:                             │
   - Length/hashtag rules                │
   - Jaccard similarity                  │
   - AI quality score ≥ 70              │
          │                               │
   Pass?  │  YES                         │
          ▼                               ▼
   ContentDraft (APPROVED) ◄─────────────┘
          │
          │ FAIL (after maxRetries)
          ▼
   ContentDraft (FAILED)
   + QA failure webhook → n8n → Telegram alert

          ↓ (APPROVED drafts only)

   ContentSchedulerService (@Cron */2 * * * *)
          │
          ▼
   PostizService.schedulePost()
   → Postiz API → social platform
          │
          ▼
   ContentDraft (SCHEDULED) + PublishTarget + ContentArchive
```

## Data Flow: Manual Draft Flow

```
1. User creates ContentDraft in dashboard-web
2. dashboard-web → POST /api/v1/workspaces/:wsId/content-drafts  (control-api)
3. control-api creates ContentDraft in DB (status: DRAFT)
4. User submits for approval → ApprovalRequest created (status: PENDING_APPROVAL)
5. Approver approves → ContentDraft status → APPROVED
6. ContentSchedulerService picks it up within 2 minutes
   OR user clicks "Schedule Now" → POST /content-drafts/:id/schedule
7. PostizService → Postiz API → social platform
8. control-api creates ActionLog entry for every state change
```

## Database Schema — Key Models

### Member (control-api `socialbot` DB)
```
id, email, passwordHash (bcrypt), displayName, organizationId, userId
```
- `passwordHash` is nullable; set via seed (`admin1234` default or `ADMIN_PASSWORD` env)
- Fixed seed IDs: `MEMBER_ID = cmnigh39x000411frapbpiyhk`

### PageProfile
```
id, workspaceId, name, niche, description
contentStrategy: { type: 'ai-generated'|'repost', style, topics, sourceConnectionId, appendText }
schedule: { times: ['09:00','18:00'], timezone, frequency }
aiConfig: { generationModel, qaEnabled, minQualityScore, maxRetries }
socialConnectionIds: string[]   ← must be populated for scheduling to work
status: ACTIVE | PAUSED | ARCHIVED
lastPostAt, stats: { totalPosts, failedGenerations }
```

### ContentDraft
```
id, workspaceId, body, status
metadata: {
  pageProfileId,       ← set by automation; triggers auto-scheduling
  qaScore, qaAttempts, qaResults,
  scheduleError,       ← reason if scheduling to Postiz failed
  qaError,             ← reason if QA check failed
  generationModel, hashtags, postizPostId
}
scheduledAt, publishedAt
```

Status values: `DRAFT` → `PENDING_APPROVAL` → `APPROVED` → `SCHEDULED` → `PUBLISHED` | `FAILED` | `REJECTED`

### SocialConnection
```
id, workspaceId, provider (FACEBOOK|INSTAGRAM|TIKTOK|TWITTER|LINKEDIN|YOUTUBE)
postizIntegrationId  ← Postiz integration UUID
displayName, avatarUrl, status (ACTIVE|INACTIVE), lastSyncAt
```
Populated via `POST /workspaces/:wsId/social-connections/sync-from-postiz`

## Auth

- `POST /api/v1/auth/sign-in` body: `{ email, password }` → `{ accessToken }`
- JWT payload: `{ sub: memberId, email, organizationId }`
- Token stored in `sb_token` cookie on dashboard-web (7-day, SameSite=Strict)
- `apps/dashboard-web/src/middleware.ts` enforces auth on all non-`/login` routes
- Default login: `admin@socialbot.local` / `admin1234`

## Postiz Integration Details

### Two Databases
```
socialbot DB:  control-api tables (snake_case: members, page_profiles, content_drafts, ...)
postiz DB:     Postiz tables     (PascalCase: "User", "Organization", "Integration", ...)
```
Never let these share a database — `prisma db push --accept-data-loss` will drop the other app's tables.

### API Auth
Postiz public API uses raw API key in `Authorization` header — **no `Bearer` prefix**:
```
Authorization: <api_key>
```
The `PostizClient` already does this correctly.

### Getting Postiz API Key
```bash
docker exec social-bot-postgres-1 psql -U socialbot -d postiz \
  -c 'SELECT o.name, o."apiKey", u.email FROM "Organization" o JOIN "UserOrganization" uo ON uo."organizationId"=o.id JOIN "User" u ON u.id=uo."userId";'
```

## Environment Variables (key ones)

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | control-api, ai-worker | App PostgreSQL — `socialbot` DB |
| `REDIS_URL` | control-api, ai-worker | BullMQ queue connection |
| `JWT_SECRET` | control-api | Auth token signing |
| `POSTIZ_API_URL` | postiz-client | `http://postiz:3000/public/v1` (Docker) or `http://localhost:3001/public/v1` (local) |
| `POSTIZ_API_KEY` | postiz-client | API key from Postiz `Organization.apiKey` |
| `ANTHROPIC_API_KEY` | control-api | Used by ContentAutomationService for generation + QA |
| `NEXT_PUBLIC_BACKEND_URL` | postiz (frontend) | Browser-reachable Postiz backend URL |
| `NEXT_PUBLIC_API_URL` | dashboard-web | Browser-reachable control-api URL |
| `TEMPORAL_ADDRESS` | postiz | Temporal gRPC address (temporal:7233) |
| `N8N_QA_FAILURE_WEBHOOK_URL` | control-api | n8n webhook for QA failure Telegram alerts |
| `ADMIN_PASSWORD` | seed.ts | Override default `admin1234` admin password |

## Key Architectural Decisions

### Why inline crons instead of BullMQ queues for automation?
The original design used `bull@4` (control-api) + `bullmq@5` (ai-worker) cross-service queues. These use incompatible Redis key formats — jobs were silently never consumed. The fix was to collapse the entire automation pipeline into control-api using NestJS `@Cron`, eliminating cross-service dependencies entirely.

### Why Postiz?
Postiz is a free, self-hosted publishing engine that manages OAuth tokens and platform-specific API quirks for Facebook, Instagram, TikTok, LinkedIn, Twitter, etc. We never hold social OAuth tokens — Postiz owns them.

### Why Temporal?
Postiz requires Temporal for reliable job scheduling and workflow execution. Temporal needs Elasticsearch when used with Postiz because Postiz registers more than 3 Text-type search attributes, which exceeds the SQL visibility limit.

### Why local filesystem for storage?
No S3/MinIO in this phase. Uploads go to `/data/uploads` (Docker volume `uploads-data`) served by control-api. This keeps infrastructure minimal and avoids cloud provider lock-in at MVP stage.

### Why `prisma db push` instead of `prisma migrate`?
The local dev `_prisma_migrations` table accumulated stale entries that caused `migrate deploy` to report "no pending migrations" while tables were actually missing. `db push` syncs schema state directly and is reliable for the single-developer dev environment.
