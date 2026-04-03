# Social Bot — Task Status

Status legend: ✅ Done · 🔄 In Progress · ⬜ Todo · 🚫 Blocked · ⚠️ Known Issue

**Last Updated:** 2026-04-03

---

## Phase 0 — Bootstrap (Complete ✅)

- ✅ Monorepo scaffold (pnpm workspaces, tsconfig, packages)
- ✅ `packages/domain` — shared types + enums
- ✅ `packages/config` — Zod env parsing
- ✅ `packages/postiz-client` — Postiz REST API client
- ✅ `packages/observability` — Logger interface + ConsoleLogger
- ✅ `apps/control-api` — NestJS skeleton, Prisma schema, all 16 modules scaffolded
- ✅ `apps/dashboard-web` — Next.js App Router skeleton, sidebar nav, TanStack Query setup
- ✅ `apps/ai-worker` — BullMQ worker with caption + hashtag job handlers
- ✅ Docker multi-stage builds for all 3 apps (pnpm deploy pattern)
- ✅ `docker-compose.dev.yml` — all services with healthchecks
- ✅ Temporal + Elasticsearch setup (required by Postiz)
- ✅ Postiz self-hosted running + accessible at localhost:4200
- ✅ CLAUDE.md, .claude/rules/, agents/, docs/

---

## Phase 1 — Auth & Workspace Foundation (Partially Complete)

- ✅ **[BE]** Basic JWT auth — placeholder with sign-in endpoint
  - POST /auth/sign-in → returns signed JWT
  - JwtAuthGuard wired and working
- ✅ **[BE]** Seed script — creates default org + admin user + workspace on first boot
  - Organization: "Social Bot"
  - Workspace: "Main"
  - Admin user: `admin@socialbot.local`
  - Role binding: OWNER role assigned
- ⬜ **[BE]** Real JWT auth — full register/login with password hashing
- ⬜ **[BE]** Organization + Workspace CRUD
  - Create org, create workspace under org, invite member
  - Full role enforcement: OWNER, ADMIN, EDITOR, VIEWER
- ⬜ **[FE]** Login page + auth flow
  - Store JWT in httpOnly cookie (not localStorage)
  - Redirect to dashboard on success
- ⬜ **[FE]** Workspace switcher in sidebar

---

## Phase 2 — Postiz Integration (Complete ✅)

- ✅ **[OPS]** Generate Postiz API key and configure in `.env`
- ✅ **[BE]** `PostizService` — health check, integration list, schedule post
  - GET /postiz/health
  - GET /postiz/integrations
  - schedulePost() method working
- ✅ **[BE]** Social Connections — full CRUD implementation
  - POST /workspaces/:id/social-connections
  - GET /workspaces/:id/social-connections
  - DELETE /workspaces/:id/social-connections/:id
- ✅ **[FE]** Social Connections page (basic UI created, currently deprioritized)

---

## Phase 3 — Content Draft + Approval Flow (Complete ✅)

- ✅ **[BE]** ContentDraft CRUD — all operations implemented
  - POST /workspaces/:id/content-drafts
  - PATCH /workspaces/:id/content-drafts/:id
  - GET /workspaces/:id/content-drafts (list)
  - GET /workspaces/:id/content-drafts/:id (detail with targets)
  - POST /workspaces/:id/content-drafts/:id/submit-for-approval
- ✅ **[BE]** ApprovalRequest flow — full implementation
  - POST /workspaces/:id/approvals/:id/review (APPROVED/REJECTED)
  - GET /workspaces/:id/approvals/pending
- ✅ **[BE]** Scheduling — complete implementation
  - POST /workspaces/:id/content-drafts/:id/schedule
  - POST /workspaces/:id/content-drafts/:id/quick-schedule (testing helper)
  - Creates PublishTarget per social connection
  - Logs ActionLog entry for audit trail
- ✅ **[FE]** Content Drafts UI (basic pages created, currently deprioritized)
  - Drafts list page
  - New draft form
  - Draft detail page
  - Status badges

---

## Phase 4 — Asset Management (Complete ✅)

- ✅ **[BE]** Asset upload endpoint — POST /workspaces/:id/assets/upload
  - LocalStorageDriver saves to /data/uploads volume
  - Returns asset URL and metadata
- ✅ **[BE]** Asset CRUD — list, get, delete per workspace
  - GET /workspaces/:id/assets (list)
  - DELETE /workspaces/:id/assets/:id
- ✅ **[OPS]** Media serving infrastructure
  - nginx-proxy for reverse proxy on port 4200
  - nginx-uploads for static file serving
  - Volume mount: postiz-data shared between services
  - Upload URLs: http://localhost:4200/uploads/...
- ⬜ **[FE]** Assets page — upload, preview, attach to content drafts

---

## Current Status: Ready for Public Deployment

### ✅ What's Working

**Backend (Control API):**
- All domain models and database schema deployed
- Full CRUD for ContentDrafts, SocialConnections, Assets, Approvals
- Postiz integration working (health check, integration list, scheduling)
- Action logging and audit trail
- Asset upload and storage
- JWT authentication (placeholder)

**Infrastructure:**
- All services running and healthy (PostgreSQL, Redis, Temporal, Postiz, n8n)
- Docker Compose with health checks
- Nginx reverse proxy for upload routing
- Temporal + Elasticsearch for Postiz workflows
- Local storage for media uploads

**Postiz:**
- Self-hosted instance running on port 4200
- OAuth configuration for Facebook/Instagram/TikTok
- Media upload and storage working
- Text-only posts successfully publishing to social platforms

### ⚠️ Known Issues

**Facebook Media Posts Require Public URL:**
- **Issue:** Facebook cannot access `localhost:4200/uploads/...` URLs to download media
- **Impact:** Posts with images/videos fail with `bad_body` error; text-only posts work fine
- **Root Cause:** Facebook Graph API requires publicly accessible URLs
- **Solution Required:** Deploy to server with public domain OR use ngrok tunnel
- **Documentation:** See `docs/DEPLOYMENT.md` for ngrok setup instructions

### 🔄 In Progress

- **[OPS]** Deployment to public server (blocked on user acquiring server)

### ⬜ Remaining Work

**Frontend (Dashboard):**
- Content Drafts UI (basic version exists, needs polish)
- Social Connections UI (basic version exists)
- Assets management UI
- Approval queue UI
- Publish monitoring dashboard

**Auth Hardening:**
- Real registration/login flow
- Password hashing with bcrypt
- Workspace management UI

**Production Hardening:**
- Rate limiting
- Input sanitization audit
- Structured logging (replace ConsoleLogger)
- Automated backups
- Monitoring and alerting

---

## Phase 5 — AI Worker Integration

- ⬜ **[BE]** Job dispatch endpoints
  - POST /ai/generate-caption — enqueues GenerateCaption job, returns jobId
  - POST /ai/suggest-hashtags — enqueues SuggestHashtags job, returns jobId
  - GET /ai/jobs/:id — poll job status + result
- ⬜ **[AI]** Connect real LLM — wire `generate-caption.handler.ts` to Anthropic/OpenAI SDK
  - Add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to config schema
- ⬜ **[FE]** "Generate caption" button on ContentDraft form — polls for result

---

## Phase 6 — n8n Automation

- ⬜ **[OPS]** Set up n8n at http://localhost:5678 — configure PostgreSQL persistence
- ⬜ **[BE]** Webhook receiver endpoint — POST /webhooks/n8n (validates n8n signature)
- ⬜ **[n8n]** Telegram trigger workflow — receives Telegram message → creates ContentDraft via control-api
- ⬜ **[n8n]** Approval notification workflow — sends Telegram message when draft needs approval
- ⬜ **[BE]** AutomationRun tracking — log every n8n execution in our DB

---

## Phase 7 — Publish Monitoring

- ⬜ **[BE]** Publish status sync — poll Postiz for PublishTarget status updates (webhook or cron)
  - Update PublishTarget.status (SCHEDULED → PUBLISHED / FAILED)
  - Create ActionLog on status change
- ⬜ **[FE]** Publish Queue page — list all PublishTargets with live status
- ⬜ **[FE]** Dashboard overview — counts by status (drafts, pending approval, scheduled, published)

---

## Phase 8 — Production Hardening

- ⬜ **[OPS]** `docker-compose.prod.yml` overrides — resource limits, log drivers, restart policies
- ⬜ **[OPS]** Nginx reverse proxy — single entrypoint, SSL termination
- ⬜ **[BE]** Rate limiting on control-api (NestJS ThrottlerModule)
- ⬜ **[BE]** Input sanitization audit — ensure no XSS/injection vectors
- ⬜ **[OPS]** Automated DB backup script for postgres volume
- ⬜ **[OPS]** Health check endpoints for all services (already on control-api, verify others)
- ⬜ **[OPS]** Structured logging — replace ConsoleLogger with JSON logger (pino or winston)

---

## Deferred / Post-MVP

- ⬜ Real OAuth2 social login for dashboard-web (magic links or Google SSO)
- ⬜ Full Telegram bot implementation (packages/telegram-client)
- ⬜ Analytics dashboards (post performance, engagement)
- ⬜ Multi-tenancy billing
- ⬜ S3/cloud storage migration (swap LocalStorageDriver for S3Driver)
- ⬜ Temporal UI (temporalio/ui) for workflow visibility

---

## Next Immediate Action

**Phase 1 — Auth** is the logical next step. Nothing else can be built properly without it.

Start with:
1. SA reviews and approves auth approach (JWT + bcrypt, no OAuth for MVP)
2. PO writes `specs/auth.md` (register, login, workspace context)
3. BE implements auth module in control-api
4. FE implements login page
