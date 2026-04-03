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
  │                   └─► localhost:3001  Postiz API  (via postiz-client package only)
  │
  ├─► localhost:4200  Postiz UI  (self-hosted social channel management)
  │
  └─► localhost:5678  n8n  (automation, Telegram triggers, AI orchestration)

Background:
  ai-worker  (BullMQ consumers — captions, hashtags, AI planning)
  temporal   (Postiz job scheduler — port 7233)
```

## Service Map

| Service | Image / Stack | Host Port | Purpose |
|---------|--------------|-----------|---------|
| dashboard-web | Next.js 14, App Router | 3000 | Admin UI — talks only to control-api |
| control-api | NestJS 10, Prisma, PostgreSQL | 4000 | Domain logic, auth, approval flow, audit log |
| ai-worker | Node + BullMQ | — | Background AI jobs (no HTTP API) |
| postgres | postgres:16-alpine | 5432 | App database (socialbot DB) |
| redis | redis:7-alpine | 6379 | BullMQ queues + Bull board |
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
│   │   ├── prisma/         Schema + migrations
│   │   ├── src/
│   │   │   ├── modules/    Feature modules (one folder per domain concept)
│   │   │   └── main.ts
│   │   └── entrypoint.sh   prisma migrate deploy → node dist/main.js
│   ├── dashboard-web/      Next.js application
│   │   └── src/
│   │       ├── app/        App Router pages
│   │       ├── components/ Layout + UI + feature components
│   │       ├── features/   TanStack Query hooks per domain concept
│   │       └── lib/        api-client.ts, utils.ts
│   └── ai-worker/          BullMQ worker
│       └── src/
│           ├── jobs/        Job type definitions + handlers
│           └── worker-runner.ts
├── packages/
│   ├── domain/             Shared TS types + enums (no runtime deps)
│   ├── config/             Zod env schemas (apiEnvSchema, workerEnvSchema, webEnvSchema)
│   ├── postiz-client/      ONLY allowed caller of Postiz REST API
│   ├── observability/      Logger interface + ConsoleLogger
│   ├── telegram-client/    Placeholder for Telegram Bot API wrapper
│   └── ui/                 Shared React UI primitives
├── infra/
│   ├── docker/             Multi-stage Dockerfiles per app
│   └── temporal/dynamicconfig/  Temporal dynamic config (development-sql.yaml)
├── agents/                 Agent persona files (sa.md, po.md, be.md, fe.md)
├── docs/                   Architecture + ADR documents (this folder)
├── specs/                  PO feature specs (written before dev work)
├── docker-compose.dev.yml
└── CLAUDE.md
```

## Data Flow: Publishing a Post

```
1. User creates ContentDraft in dashboard-web
2. dashboard-web → POST /api/v1/content-drafts  (control-api)
3. control-api creates ContentDraft in DB (status: DRAFT)
4. User submits for approval → ApprovalRequest created
5. Approver approves → ContentDraft status → APPROVED
6. User schedules → control-api calls PostizService
7. PostizService (via postiz-client) → POST /posts (Postiz API)
8. Postiz schedules via Temporal → posts to social platform
9. control-api creates ActionLog entry for every state change
```

## Key Architectural Decisions

### Why Postiz?
Postiz is a free, self-hosted publishing engine that manages OAuth tokens and platform-specific API quirks for Facebook, Instagram, TikTok, LinkedIn, Twitter, etc. We never hold social OAuth tokens — Postiz owns them.

### Why Temporal?
Postiz requires Temporal for reliable job scheduling and workflow execution. Temporal needs Elasticsearch when used with Postiz because Postiz registers more than 3 Text-type search attributes, which exceeds the SQL visibility limit.

### Why BullMQ for ai-worker?
BullMQ (Redis-backed) is already available and well-supported in the NestJS ecosystem. ai-worker handles fire-and-forget AI jobs (caption generation, hashtag suggestions) that don't need Temporal's workflow guarantees.

### Why local filesystem for storage?
No S3/MinIO in this phase. Uploads go to `/data/uploads` (Docker volume `uploads-data`) served by control-api. This keeps infrastructure minimal and avoids cloud provider lock-in at MVP stage.

## Environment Variables (key ones)

| Variable | Used By | Purpose |
|----------|---------|---------|
| `DATABASE_URL` | control-api, ai-worker | App PostgreSQL connection |
| `REDIS_URL` | control-api, ai-worker | BullMQ queue connection |
| `JWT_SECRET` | control-api, postiz | Auth token signing |
| `POSTIZ_API_KEY` | postiz-client | API key from Postiz admin UI |
| `POSTIZ_BASE_URL` | postiz-client | Internal Postiz API URL (http://postiz:3000) |
| `NEXT_PUBLIC_BACKEND_URL` | postiz (frontend) | Browser-reachable Postiz backend URL |
| `NEXT_PUBLIC_API_URL` | dashboard-web | Browser-reachable control-api URL |
| `TEMPORAL_ADDRESS` | postiz | Temporal gRPC address (temporal:7233) |
