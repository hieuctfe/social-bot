# MVP Implementation Checklist

**Project:** Content Automation for Social Bot  
**Goal:** 100% autonomous multi-page content farming  
**Timeline:** 6 weeks (can be compressed with automation)

---

## Phase 1: Domain Setup (Week 1)

### Database Schema
- [ ] Add PageProfile model to Prisma schema
- [ ] Add ContentArchive model to Prisma schema
- [ ] Create migration
- [ ] Run migration in dev environment
- [ ] Seed test data (2-3 sample PageProfiles)

### Backend API (control-api)
- [ ] Create PageProfileModule
  - [ ] PageProfileController (REST endpoints)
  - [ ] PageProfileService (business logic)
  - [ ] PageProfileRepository (Prisma queries)
  - [ ] DTOs (CreatePageProfileDto, UpdatePageProfileDto)
- [ ] Endpoints:
  - [ ] POST /workspaces/:id/page-profiles
  - [ ] GET /workspaces/:id/page-profiles
  - [ ] GET /workspaces/:id/page-profiles/:id
  - [ ] PATCH /workspaces/:id/page-profiles/:id
  - [ ] DELETE /workspaces/:id/page-profiles/:id
  - [ ] GET /page-profiles/due-for-content (for n8n)
- [ ] Add unit tests
- [ ] Update Swagger docs

### Frontend UI (dashboard-web)
- [ ] Create PageProfiles page
  - [ ] List view (table with filters)
  - [ ] Create form (modal or separate page)
  - [ ] Edit form
  - [ ] Delete confirmation
- [ ] Add to sidebar navigation
- [ ] TanStack Query hooks:
  - [ ] usePageProfiles (list)
  - [ ] useCreatePageProfile
  - [ ] useUpdatePageProfile
  - [ ] useDeletePageProfile

### Testing
- [ ] Manual test: Create PageProfile via UI
- [ ] Manual test: List, edit, delete
- [ ] API test: Call endpoints directly
- [ ] Verify data in database

**Deliverable:** Can manage PageProfiles in UI ✅

---

## Phase 2: Content Generation (Week 2)

### AI Worker Jobs
- [ ] Create `jobs/content-generation.ts`
  - [ ] Handle 'ai-generated' strategy first
  - [ ] Prompt engineering for different niches
  - [ ] Call LLM API (OpenAI/Claude/Gemini)
  - [ ] Generate hashtags
  - [ ] Generate media description
  - [ ] Create ContentDraft (status: PENDING_QA)
  - [ ] Queue 'content-qa' job
- [ ] Add job to worker registry
- [ ] Add error handling + retry logic

### Backend API (control-api)
- [ ] Endpoint: POST /page-profiles/:id/generate-content
  - [ ] Validate PageProfile exists
  - [ ] Check schedule (don't generate if not due)
  - [ ] Queue BullMQ job: 'content-generation'
  - [ ] Return job ID
- [ ] Update PageProfile.lastPostAt after generation

### LLM Integration
- [ ] Add LLM client utility
  - [ ] Support OpenAI
  - [ ] Support Claude (Anthropic)
  - [ ] Support Gemini (Google)
- [ ] Environment variables for API keys
- [ ] Rate limiting + error handling

### Testing
- [ ] Create test PageProfile (niche: "tech")
- [ ] Manual trigger: POST /page-profiles/:id/generate-content
- [ ] Verify:
  - [ ] BullMQ job queued
  - [ ] ContentDraft created
  - [ ] Content quality looks good
  - [ ] Hashtags generated

**Deliverable:** Can generate AI content for a PageProfile ✅

---

## Phase 3: Agentic QA System (Week 3)

### QA Job Implementation
- [ ] Create `jobs/content-qa.ts`
  - [ ] Agent 1: Grammar & spelling check
  - [ ] Agent 2: Niche relevance validator
  - [ ] Agent 3: Engagement potential scorer
  - [ ] Agent 4: Brand safety checker
  - [ ] Aggregate scores (weighted average)
  - [ ] Decision: PASS (≥ minQualityScore) or FAIL
- [ ] Handle PASS:
  - [ ] Update ContentDraft status → APPROVED
  - [ ] Create ContentArchive entry
  - [ ] Trigger auto-scheduling
- [ ] Handle FAIL:
  - [ ] Increment retry counter
  - [ ] If retries < maxRetries:
    - [ ] Re-queue content-generation with feedback
  - [ ] If retries = maxRetries:
    - [ ] Alert human (Telegram notification)
    - [ ] Mark ContentDraft as FAILED

### Backend API
- [ ] Endpoint: GET /content-drafts/:id/qa-status
  - [ ] Return QA results
  - [ ] Return agent scores
  - [ ] Return suggestions

### ContentArchive Schema
- [ ] Add fields:
  - [ ] qaScore (Float)
  - [ ] qaAttempts (Int)
  - [ ] qaAgentResults (Json)
  - [ ] generatedBy (String)

### Testing
- [ ] Test with good content → should PASS
- [ ] Test with bad content → should FAIL → retry
- [ ] Test retry limit → should alert
- [ ] Verify ContentArchive data

**Deliverable:** Content quality-checked before publishing ✅

---

## Phase 4: Auto-Scheduling (Week 4)

### Scheduling Logic
- [ ] Create `services/scheduling.service.ts`
  - [ ] calculateOptimalPostTime()
    - [ ] Based on PageProfile.schedule
    - [ ] Avoid duplicate times
    - [ ] Respect timezone
  - [ ] autoScheduleApprovedContent()
    - [ ] Get approved ContentDraft
    - [ ] Calculate post time
    - [ ] Call existing /content-drafts/:id/schedule endpoint

### Backend Integration
- [ ] Hook into QA job:
  - [ ] When status → APPROVED
  - [ ] Auto-call scheduling service
- [ ] Update ContentArchive:
  - [ ] Link to PublishTarget
  - [ ] Save scheduled time

### Postiz Integration
- [ ] Verify postiz-client working
- [ ] Test schedulePost() with real PageProfile
- [ ] Verify post appears in Postiz UI

### End-to-End Testing
- [ ] Full flow:
  1. Create PageProfile
  2. Trigger generation
  3. Wait for QA
  4. Verify auto-scheduled
  5. Check Postiz
  6. Wait for publish time
  7. Verify post on platform

**Deliverable:** Full automation working end-to-end ✅

---

## Phase 5: Additional Content Sources (Week 5)

### RSS Repost
- [ ] Create `jobs/rss-fetch.ts`
  - [ ] Parse RSS feeds (use `rss-parser` library)
  - [ ] Filter by keywords/niche
  - [ ] Score relevance (LLM or keyword matching)
  - [ ] Pick best article
- [ ] Create `services/content-adapter.service.ts`
  - [ ] Rewrite article for target audience
  - [ ] Adapt to PageProfile.style
  - [ ] Add attribution
  - [ ] Generate hashtags
- [ ] Update content-generation job to handle 'repost' type

### News Scraping
- [ ] Create `jobs/news-scrape.ts`
  - [ ] Use web search API (Google/Bing)
  - [ ] Filter by keywords from PageProfile
  - [ ] Fetch top 3-5 articles
  - [ ] Summarize each article
  - [ ] Combine into single post
- [ ] Update content-generation job to handle 'news' type

### Content Strategy Update
- [ ] Support 'mixed' strategy:
  - [ ] Randomly select type per generation
  - [ ] Ratio: 40% AI, 40% repost, 20% news
- [ ] Add to PageProfile form in UI

### Testing
- [ ] Test RSS repost with real feed
- [ ] Test news scraping with real keywords
- [ ] Test mixed strategy
- [ ] Verify content quality across all types

**Deliverable:** Can generate from 3 different sources ✅

---

## Phase 6: n8n Integration (Week 6)

### n8n Workflows

#### Workflow 1: Daily Content Generation
- [ ] Create workflow in n8n:
  - [ ] Trigger: Cron (every hour at :00)
  - [ ] HTTP Request: GET /page-profiles/due-for-content
  - [ ] Loop: For each PageProfile
    - [ ] HTTP Request: POST /page-profiles/:id/generate-content
  - [ ] Error handling: Telegram notification
- [ ] Test workflow manually
- [ ] Enable workflow

#### Workflow 2: Performance Tracking
- [ ] Create workflow in n8n:
  - [ ] Trigger: Cron (daily at 23:00)
  - [ ] HTTP Request: GET /content-archives/recent
  - [ ] Loop: For each ContentArchive
    - [ ] HTTP Request: GET /postiz/posts/:id/stats
    - [ ] HTTP Request: PATCH /content-archives/:id (update performance)
  - [ ] Calculate stats per PageProfile
  - [ ] Send daily report to Telegram
- [ ] Test workflow
- [ ] Enable workflow

#### Workflow 3: Weekly Optimization
- [ ] Create workflow in n8n:
  - [ ] Trigger: Cron (Sunday at 20:00)
  - [ ] HTTP Request: GET /page-profiles/:id/analytics
  - [ ] AI Agent: Analyze performance
  - [ ] Generate suggestions:
    - [ ] Best content type
    - [ ] Optimal posting times
    - [ ] Strategy adjustments
  - [ ] Send report to Telegram
  - [ ] Optional: Auto-update PageProfile based on insights
- [ ] Test workflow
- [ ] Enable workflow

### Backend Endpoints for n8n
- [ ] GET /page-profiles/due-for-content
  - [ ] Return PageProfiles that need content now
  - [ ] Based on schedule + lastPostAt
- [ ] GET /content-archives/recent
  - [ ] Return published content from last 24h
- [ ] GET /page-profiles/:id/analytics
  - [ ] Weekly performance summary
  - [ ] Best/worst performing posts
  - [ ] Engagement trends

### Monitoring & Alerts
- [ ] Setup Telegram bot for notifications
- [ ] Alert types:
  - [ ] QA failures (all retries failed)
  - [ ] Generation errors
  - [ ] Scheduling failures
  - [ ] Daily summary
  - [ ] Weekly report

### Testing
- [ ] Run all workflows manually
- [ ] Verify 24h autonomous operation
- [ ] Check error handling (kill services, watch recovery)
- [ ] Verify Telegram notifications

**Deliverable:** Fully autonomous 24/7 operation ✅

---

## Optional Enhancements (Post-MVP)

### Image Generation
- [ ] Integrate Nano Banana Pro (Gemini 3 Pro Image)
- [ ] Generate images for Instagram posts
- [ ] Save to ContentArchive.mediaUrls

### Video Generation
- [ ] Integrate Veo 3.1 API
- [ ] Generate short videos for TikTok
- [ ] Handle video processing queue

### Excel Export
- [ ] Endpoint: GET /page-profiles/:id/export
- [ ] Generate Excel file:
  - [ ] All content for page
  - [ ] Performance metrics
  - [ ] QA scores
- [ ] Download via UI

### Advanced Analytics Dashboard
- [ ] Charts: Engagement over time
- [ ] Best/worst posts
- [ ] Content type comparison
- [ ] A/B testing results

### Human-in-the-Loop
- [ ] UI to review failed QA content
- [ ] Manual approve/reject
- [ ] Edit before scheduling

---

## Automation Tools I Can Use

**Instead of asking you to do manual work, I can:**

### 1. Code Generation
✅ Generate Prisma schema  
✅ Generate NestJS modules (controller, service, DTOs)  
✅ Generate React components  
✅ Write unit tests

### 2. Running Commands
✅ `pnpm install` new dependencies  
✅ `pnpm db:generate` after schema changes  
✅ `pnpm db:migrate` to update database  
✅ `docker compose up -d --build` to rebuild services  
✅ `git commit` to save progress

### 3. Testing
✅ Test API endpoints with `curl`  
✅ Check Docker logs  
✅ Verify database records  
✅ Run unit tests

### 4. Documentation
✅ Update TASKS.md with progress  
✅ Write API docs  
✅ Create README for new packages

---

## What I Need From You

**Only when absolutely necessary:**

1. **API Keys** (if not in .env):
   - OpenAI API key (for content generation)
   - Gemini API key (for QA agents)
   - Telegram bot token (for notifications)

2. **Design Decisions**:
   - Approve/reject architecture choices
   - Niche-specific prompt tuning
   - Quality threshold adjustments

3. **Testing Real Platforms**:
   - Connect social accounts to Postiz (I can't do OAuth)
   - Verify posts appear on Facebook/Instagram
   - Check real engagement data

4. **Final Approval**:
   - Before deploying to production
   - Before enabling autonomous workflows

---

## Progress Tracking

I'll update this checklist as I implement. Format:
- [ ] Todo
- [🔄] In progress
- [✅] Done
- [❌] Blocked (needs your help)

**Current Status:** Ready to start Phase 1 🚀

---

## Next Immediate Steps

**What I'll do now (if you approve):**

1. ✅ Read existing Prisma schema
2. ✅ Generate PageProfile + ContentArchive models
3. ✅ Create migration
4. ✅ Generate NestJS module boilerplate
5. ✅ Test with curl
6. ✅ Commit changes

**Estimated time:** 15-20 minutes (automated)

**Ready to start?** 🎯
