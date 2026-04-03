# Social Bot — Claude Code Guide

## Project Goal

Multi-platform social publishing control plane.
- Social Bot = control dashboard + domain logic + publish orchestration
- Postiz = external publishing engine (handles actual posting to platforms)
- n8n = automation, Telegram triggers, AI orchestration
- ai-worker = background AI jobs (captions, hashtags, action planning)

## Architecture Boundaries

```
apps/
  dashboard-web   → Admin UI only. Talks to control-api. No direct platform calls.
  control-api     → Domain logic, auth, orchestration, audit log, approval flow.
  ai-worker       → Background AI jobs via BullMQ. No HTTP API.

packages/
  domain          → Shared TypeScript types/enums. No runtime dependencies.
  config          → Zod env parsing. Shared across apps.
  postiz-client   → ONLY package allowed to call Postiz API.
  telegram-client → Placeholder for Telegram Bot API wrapper.
  observability   → Logger interface + ConsoleLogger.
  ui              → Shared React UI components (currently minimal).
```

## Hard Rules

1. ALL publish requests MUST go through `packages/postiz-client`. Never call Postiz API directly from other code.
2. NO direct social platform SDK calls (Meta, TikTok, Twitter, etc.) anywhere in this repo.
3. NO S3, MinIO, or cloud object storage in this phase. Local filesystem only.
4. Every publish action MUST create an `ActionLog` entry.
5. SA must approve architecture decisions (ADRs) before implementation begins.
6. PO specs in `specs/` before dev work begins on any feature.
7. Agents stay in their domain — no cross-boundary edits.

## Tech Standards

- TypeScript everywhere. Strict mode.
- pnpm for package management.
- NestJS (control-api), Next.js App Router (dashboard-web), BullMQ (ai-worker).
- Prisma for all database access in control-api.
- TanStack Query for server state in dashboard-web.
- Feature-based folder structure in both apps.
- Zod for env var parsing (via packages/config).
- DTOs + class-validator for all API inputs.
- Swagger/OpenAPI auto-generated from NestJS decorators.

## Service URLs (local dev)

| URL | Service |
|-----|---------|
| http://localhost:3000 | Dashboard Web (our UI) |
| http://localhost:4000/api/v1/docs | Control API + Swagger |
| http://localhost:4200 | Postiz UI |
| http://localhost:3001 | Postiz API (internal) |
| http://localhost:5678 | n8n |
| localhost:5432 | PostgreSQL |
| localhost:6379 | Redis |
| localhost:7233 | Temporal gRPC |

## Build & Run Commands

```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate

# Run migrations (requires DB running)
pnpm db:migrate

# Dev: run all services via Docker
docker compose -f docker-compose.dev.yml up -d

# Rebuild a single service after code changes
docker compose -f docker-compose.dev.yml up -d --build control-api

# View logs
docker compose -f docker-compose.dev.yml logs -f control-api

# Type check all packages
pnpm typecheck

# Build all packages
pnpm build

# Validate Docker Compose config
docker compose -f docker-compose.dev.yml config
```

## Domain Concepts

| Our Term | Postiz Term | Notes |
|----------|-------------|-------|
| SocialConnection | Integration | Maps Postiz integration ID to our workspace |
| PublishTarget | Post | One publish attempt per social channel |
| ContentDraft | — | Our concept. Goes through approval before scheduling. |
| ApprovalRequest | — | Gating mechanism before a draft can be scheduled |
| ActionLog | — | Immutable audit trail for all domain events |
| AutomationRun | Execution | n8n workflow run tracked in our DB |
| AIPolicy | — | Per-workspace AI behavior configuration |

## Infrastructure Notes

- Temporal requires **Elasticsearch** (temporal-elasticsearch service) — Postiz registers more than 3 Text search attributes, which exceeds SQL visibility limits. Do not remove Elasticsearch from docker-compose.
- Postiz needs **two env vars** for frontend↔backend communication:
  - `BACKEND_INTERNAL_URL` = container-to-container (http://postiz:3000)
  - `NEXT_PUBLIC_BACKEND_URL` = browser-reachable (http://localhost:3001)
- Prisma must be in `dependencies` (not devDependencies) in control-api/package.json for Docker builds.
- All Dockerfiles use `pnpm deploy --prod` (not COPY node_modules) to handle pnpm virtual store correctly.

## Reference Documents

- `docs/architecture.md` — full system architecture, data flow, ADR decisions
- `docs/infra-setup.md` — first-time setup, port reference, troubleshooting
- `TASKS.md` — phased task list with status tracking

## Non-Goals for MVP

- Full production auth (OAuth2, magic links) — placeholder only
- Direct social platform API calls
- S3 / object storage
- Full Telegram bot implementation
- Analytics dashboards
- Multi-tenancy billing

## Team Roster

| Role | File | Load Command |
|------|------|-------------|
| SA (Solution Architect) | `agents/sa.md` | `claude --load agents/sa.md` |
| PO (Product Owner) | `agents/po.md` | `claude --load agents/po.md` |
| BE (Backend Engineer) | `agents/be.md` | `claude --load agents/be.md` |
| FE (Frontend Engineer) | `agents/fe.md` | `claude --load agents/fe.md` |

## Working Style

- SA first — architecture decisions and ADRs before design work begins.
- PO next — specs in `specs/` before any dev work begins.
- API contract — BE defines the interface; FE consumes it. No guessing.
- No cross-boundary edits — each agent stays in their domain.
- Shared types — go in `packages/domain/src/types.ts`.
- Do not ask for confirmation on obvious decisions. Make strong choices and keep moving.
- Prefer feature folders over flat files.
- Keep modules small and explicit.
