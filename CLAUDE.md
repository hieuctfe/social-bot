# Social Bot — Claude Code Guide

## Project Goal

Multi-platform social publishing control plane.
- Social Bot = control dashboard + domain logic + publish orchestration
- Postiz = external publishing engine (handles actual posting to platforms)
- n8n = automation, Telegram triggers, AI orchestration
- ai-worker = background AI jobs (captions, hashtags, action planning)
- Anthropic Claude (Haiku) = inline content generation + QA (via control-api directly)

## Architecture Boundaries

```
apps/
  dashboard-web   → Admin UI only. Talks to control-api. No direct platform calls.
  control-api     → Domain logic, auth, orchestration, audit log, approval flow,
                    content generation crons (ContentAutomationService, ContentSchedulerService).
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
| localhost:5432 | PostgreSQL (`socialbot` DB for control-api, `postiz` DB for Postiz) |
| localhost:6379 | Redis |
| localhost:7233 | Temporal gRPC |

## Build & Run Commands

### Fast local dev (recommended)
```bash
# 1. Start infra only (postgres, redis, postiz, n8n, temporal)
docker compose -f docker-compose.infra.yml up -d

# 2. First time only — push schema and seed
DATABASE_URL="postgresql://socialbot:socialbot@localhost:5432/socialbot" \
  npx prisma db push --schema=apps/control-api/prisma/schema.prisma
DATABASE_URL="postgresql://socialbot:socialbot@localhost:5432/socialbot" \
  npx tsx apps/control-api/prisma/seed.ts

# 3. Run apps locally with hot reload (separate terminals)
# IMPORTANT: source both .env files so local URLs are used (not Docker hostnames)
source .env && source .env.local && pnpm dev:api      # control-api on :4000
pnpm dev:web                                           # dashboard-web on :3000

# Stop infra
docker compose -f docker-compose.infra.yml down
```

### Other
```bash
pnpm install       # Install dependencies
pnpm db:generate   # Regenerate Prisma client after schema changes
pnpm typecheck     # Type check all packages
pnpm build         # Build all packages
```

### ⚠️ Important: local dev env loading
When running `pnpm dev:api` locally, always run it in a shell where `.env` AND `.env.local`
have been sourced. `.env.local` overrides Docker hostnames with `localhost`:
- `DATABASE_URL` → `localhost:5432`
- `REDIS_URL` → `localhost:6379`
- `POSTIZ_API_URL` → `http://localhost:3001/public/v1`

Without this, the API will fail to connect.

## Domain Concepts

| Our Term | Postiz Term | Notes |
|----------|-------------|-------|
| SocialConnection | Integration | Maps Postiz integration ID to our workspace. Synced via `POST /social-connections/sync-from-postiz`. |
| PublishTarget | Post | One publish attempt per social channel |
| ContentDraft | — | Our concept. Goes through automation pipeline or manual approval before scheduling. |
| PageProfile | — | Per-page automation config: niche, strategy, schedule, AI config, linked SocialConnections |
| ContentArchive | — | Immutable record of published content per PageProfile |
| ApprovalRequest | — | Gating mechanism before a draft can be scheduled (manual flow) |
| ActionLog | — | Immutable audit trail for all domain events |
| AutomationRun | Execution | n8n workflow run tracked in our DB |
| AIPolicy | — | Per-workspace AI behavior configuration |

## Automation Pipeline (fully implemented)

The automation pipeline runs entirely inside `control-api` via two NestJS crons:

### ContentAutomationService (`*/5 * * * *`)
- Finds active PageProfiles due for content generation
- **ai-generated strategy**: Calls Anthropic Claude Haiku → content → QA check → `APPROVED` or `FAILED`
- **repost strategy**: Finds latest published source content → creates `APPROVED` draft immediately
- QA: rule-based (length, hashtags) + AI quality score via Anthropic
- Manual trigger: `POST /workspaces/:wsId/automations/page-profiles/:profileId/generate`

### ContentSchedulerService (`*/2 * * * *`)
- Finds ContentDrafts with `status=APPROVED` that have a `pageProfileId` in metadata
- Calls PostizService to schedule the post
- Creates `PublishTarget` + `ContentArchive` records
- Updates draft to `SCHEDULED` with `scheduledAt` timestamp

### ContentDraft status flow
```
Generate Now (API trigger)
  → AI generates content
  → QA score ≥ 70?  YES → APPROVED  NO (after max retries) → FAILED
                          ↓
              ContentSchedulerService (every 2 min)
                          ↓
              Postiz.schedulePost()  → SCHEDULED
                                     → FAILED (if Postiz error)
```

## Auth

Email + password auth (bcryptjs). **NOT** magic links or OAuth.

- Login: `POST /api/v1/auth/sign-in` → `{ accessToken }`
- Token stored in `sb_token` cookie (7-day expiry, SameSite=Strict)
- Middleware at `apps/dashboard-web/src/middleware.ts` redirects unauthenticated users to `/login`
- Default credentials: `admin@socialbot.local` / `admin1234`
- Change password: update `ADMIN_PASSWORD` env var and re-run seed
- `Member.passwordHash` field (nullable) stores bcrypt hash

## Seeded Data (fixed IDs — never change)

```
ORG_ID    = cmnigh39t000011fr89eaez8x
WORKSPACE_ID = cmnigh39v000211fr0uvwigx5   ← used in WORKSPACE_ID constant in dashboard-web
MEMBER_ID = cmnigh39x000411frapbpiyhk
```

These IDs are hardcoded in `apps/control-api/prisma/seed.ts` and `apps/dashboard-web/src/lib/demo-config.ts`.
The seed is idempotent — safe to re-run.

## Postiz Integration

### Databases
- control-api uses `socialbot` database
- **Postiz uses its own `postiz` database** — this is critical. Do NOT let Postiz share the `socialbot` DB.
- Configured in `docker-compose.infra.yml`: `DATABASE_URL: ...@postgres:5432/postiz`

### API Key
- Postiz API key lives in `Organization.apiKey` in the `postiz` database
- Get it: `docker exec social-bot-postgres-1 psql -U socialbot -d postiz -c 'SELECT name, "apiKey" FROM "Organization";'`
- Auth header format: `Authorization: <key>` (no `Bearer` prefix)
- Set in `.env`: `POSTIZ_API_KEY=<key>`

### Connecting Social Accounts
1. Connect in Postiz UI: http://localhost:4200
2. Import to Social Bot: Dashboard → Social Connections → **Sync from Postiz**
3. Assign to PageProfile: include the SocialConnection ID in `socialConnectionIds`

## Infrastructure Notes

- Temporal requires **Elasticsearch** (temporal-elasticsearch service) — Postiz registers more than 3 Text search attributes, which exceeds SQL visibility limits. Do not remove Elasticsearch from docker-compose.
- Postiz needs **two env vars** for frontend↔backend communication:
  - `BACKEND_INTERNAL_URL` = container-to-container (http://postiz:3000)
  - `NEXT_PUBLIC_BACKEND_URL` = browser-reachable (http://localhost:3001)
- Prisma must be in `dependencies` (not devDependencies) in control-api/package.json for Docker builds.
- All Dockerfiles use `pnpm deploy --prod` (not COPY node_modules) to handle pnpm virtual store correctly.
- **Use `prisma db push` not `prisma migrate deploy`** for local schema changes — migration history can get out of sync.

## Reference Documents

- `docs/architecture.md` — full system architecture, data flow, ADR decisions
- `docs/infra-setup.md` — first-time setup, port reference, troubleshooting
- `TASKS.md` — phased task list with status tracking

## Implemented Features (as of this session)

- ✅ Auth: email + password login, cookie-based JWT, route protection
- ✅ PageProfiles: create, list, pause/activate, manual trigger
- ✅ Automation: content generation (AI), QA check, scheduling to Postiz
- ✅ Social Connections: sync from Postiz, display, remove
- ✅ Content Drafts: list with status filter, detail with retry/reschedule actions
- ✅ Postiz DB isolation: control-api and Postiz use separate databases

## Non-Goals for MVP

- OAuth2 / magic links / SSO
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
