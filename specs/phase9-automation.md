# Spec: Phase 9 — Full Content Automation Pipeline

**Status:** Approved
**Author:** PO
**Date:** 2026-04-04
**ADR Reference:** docs/adr/003-content-automation-architecture.md

---

## Goal

Zero-touch content pipeline. Once configured, the system automatically generates (or reposts) content for every active PageProfile, runs AI quality checks, and schedules approved content to Postiz — with no human intervention required unless QA fails.

---

## Scope

| Sub-Phase | Feature | Owner |
|-----------|---------|-------|
| 9A | PageProfile CRUD | BE ✅ Done |
| 9B | AI content generation | BE ✅ Done |
| 9C | Multi-pass QA gate | BE |
| 9D | Auto-scheduling cron | BE |
| 9E | Repost engine | BE |
| 9F | Google Sheets sync | BE + n8n |

---

## User Stories

### 9C — QA Gate

**As the system**, after generating content for a PageProfile, I want to run a multi-pass AI quality check before the content is approved for scheduling, so bad content never gets published.

**Acceptance Criteria:**
- QA runs 4 checks via Claude API:
  1. **Quality** — grammar, coherence, readability (pass if score ≥ 7/10)
  2. **Brand voice** — matches PageProfile style setting (pass if score ≥ 7/10)
  3. **Platform compliance** — length appropriate, hashtag count reasonable (pass if no violations)
  4. **Originality** — not a near-duplicate of last 5 posts from same page (pass if similarity < 0.8)
- All 4 checks must pass for content to be APPROVED
- If any check fails: regenerate content with QA feedback as context (up to `aiConfig.maxRetries` times, default 2)
- After max retries exhausted: log QA failure, update ContentDraft status to FAILED, emit structured log for Telegram notification
- QA results stored in ContentDraft metadata (scores, pass/fail per check, attempt number)
- If `aiConfig.qaEnabled = false`: skip QA, auto-approve immediately (existing behaviour preserved)

---

### 9D — Auto-Scheduling Cron

**As the system**, after a ContentDraft is APPROVED, I want it to be automatically scheduled to Postiz at the next available time slot defined by its PageProfile's schedule, so no human needs to press "schedule".

**Acceptance Criteria:**
- NestJS cron job runs every 2 minutes in control-api
- Finds all ContentDrafts where: status = APPROVED AND metadata contains pageProfileId
- For each: reads PageProfile.schedule to determine next post time
- Calls PostizService.schedulePost() with the socialConnectionIds from PageProfile
- On success: updates ContentDraft status to SCHEDULED, creates ContentArchive entry, logs ActionLog
- On Postiz error: updates ContentDraft status to FAILED, logs ActionLog with error
- Idempotent: same draft is never scheduled twice

---

### 9E — Repost Engine

**As a page operator**, I want to configure a page with strategy type REPOST so that it automatically reposts content from a source page (another SocialConnection) with an optional delay and text append.

**Acceptance Criteria:**
- PageProfile with `contentStrategy.type = "repost"` is supported
- `contentStrategy.sourceConnectionId` = the Postiz integrationId of the source page
- `contentStrategy.repostDelayMinutes` = delay after source publishes (default: 30 min)
- `contentStrategy.appendText` = optional text appended to reposted content (e.g. "#repost")
- When the content generation job runs for a REPOST page:
  - Fetch last published post from source via Postiz API
  - Skip if already reposted (check by sourceUrl in ContentArchive)
  - Apply appendText transform
  - Create ContentDraft — QA not required for reposts (originality check N/A)
  - Mark as APPROVED immediately → auto-scheduling cron picks it up

---

### 9F — Google Sheets Sync

**As a page operator**, I want to manage my page configurations in a Google Sheet so that non-technical team members can update niches, schedules, and topics without touching the dashboard or code.

**Sheet structure:**

**"Pages" tab:**
| Column | Description |
|--------|-------------|
| page_id | Our PageProfile ID (auto-filled after first sync) |
| page_name | Display name |
| postiz_integration_id | Postiz integration ID for this social account |
| strategy | `AI_GENERATED` or `REPOST` |
| niche | e.g. "tech", "motivation", "food" |
| brand_voice | e.g. "professional", "casual", "funny" |
| topics | Comma-separated topic seeds |
| posting_times | Comma-separated times e.g. "09:00,18:00" |
| timezone | e.g. "Asia/Ho_Chi_Minh" |
| repost_source_id | Postiz integrationId of source (REPOST only) |
| repost_delay_minutes | Default: 30 |
| append_text | Text to append on repost (optional) |
| active | TRUE / FALSE |

**API Endpoint (control-api):**
- `POST /api/v1/automation/sync-page-profiles`
- Body: array of row objects from Google Sheets
- Upserts PageProfiles by postiz_integration_id
- Returns: `{ created: N, updated: N, skipped: N, errors: [] }`
- Auth: uses existing JWT (n8n stores the token)

**n8n Workflow:**
- Trigger: every 5 minutes (Cron node)
- Read Google Sheets "Pages" tab
- Filter rows where active = TRUE
- POST to sync endpoint
- On error: log to n8n execution log

---

## Data: ContentDraft metadata shape (after Phase 9)

```json
{
  "pageProfileId": "cuid",
  "hashtags": ["tech", "ai"],
  "generatedBy": "ai-original",
  "generationModel": "claude-sonnet-4-6",
  "strategyType": "ai-generated",
  "qaEnabled": true,
  "qaAttempts": 1,
  "qaResults": {
    "quality":    { "score": 8.5, "pass": true, "reason": "..." },
    "brandVoice": { "score": 7.2, "pass": true, "reason": "..." },
    "compliance": { "pass": true, "violations": [] },
    "originality":{ "pass": true, "similarity": 0.12 }
  },
  "sourceUrl": null
}
```

---

## Out of Scope (Phase 9)

- Image/video generation (text-only)
- Trending topic fetch (static topics pool only)
- Dashboard UI for GenerationRuns (Phase 10)
- Weekly AI optimization reports (Phase 10)
- Telegram bot interactive commands (Phase 10)

---

## Definition of Done

- [ ] QA gate runs for all `qaEnabled: true` profiles
- [ ] APPROVED drafts auto-schedule within 2 minutes
- [ ] REPOST strategy generates drafts from source page
- [ ] Google Sheets sync upserts PageProfiles correctly
- [ ] ContentArchive entry created for every scheduled draft
- [ ] ActionLog entry created for every state change
- [ ] All services rebuild without TypeScript errors
- [ ] End-to-end test: trigger generation → QA → schedule → visible in Postiz
