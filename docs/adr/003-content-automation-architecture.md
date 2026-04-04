# ADR-003: Content Automation Architecture

## Status
**Proposed** — 2026-04-04

## Context

We need to automate content creation and publishing for multiple social media pages (different niches) with zero manual intervention. The system must:

1. Manage multiple PageProfiles (tech, cooking, travel, finance, etc.)
2. Generate content from multiple sources (RSS repost, news scraping, AI original)
3. Quality check content with agentic AI (multi-agent QA, auto-retry if fail)
4. Store all content for tracking and analytics
5. Publish to multiple platforms (Facebook, Instagram, TikTok) via Postiz
6. Run 100% autonomously

### Existing System
- **Postiz**: Handles actual publishing to social platforms (owns OAuth tokens, API integrations)
- **n8n**: Workflow orchestration, scheduling, Telegram triggers
- **control-api**: Domain logic, approval flow, audit logging
- **ai-worker**: Background AI jobs via BullMQ

### Problem
Current system supports manual content creation → approval → scheduling. We need to ADD automation layer WITHOUT duplicating Postiz (publishing) or n8n (workflow execution).

## Decision

### Principle: Build the MISSING pieces, leverage what exists

**What we BUILD:**
1. **PageProfile Management** — new domain concept
2. **Content Generation Logic** — RSS, news, AI text generation
3. **Agentic QA System** — multi-agent quality validation
4. **Content Archive** — performance tracking + export

**What we LEVERAGE:**
- **Postiz** — all platform publishing (we just call its API)
- **n8n** — workflow orchestration (we provide AI job endpoints)
- **ai-worker** — execute AI jobs via BullMQ queues

---

## Architecture

### 1. New Domain Concept: PageProfile

```typescript
// packages/domain/src/types.ts
interface PageProfile {
  id: string;
  workspaceId: string;
  
  // Identity
  name: string;              // "Tech News Daily"
  niche: string;             // "tech", "cooking", "travel"
  description?: string;
  
  // Content Strategy
  contentStrategy: {
    type: 'repost' | 'news' | 'ai-generated' | 'mixed';
    sources?: string[];      // RSS feed URLs for repost
    keywords?: string[];     // For news scraping
    topics?: string[];       // For AI generation
    style: 'professional' | 'funny' | 'educational' | 'viral';
  };
  
  // Platform Connections (references existing SocialConnection)
  socialConnectionIds: string[];  // Links to existing SocialConnection table
  
  // Posting Schedule
  schedule: {
    frequency: number;       // Posts per day (1, 2, 3...)
    times: string[];         // ["09:00", "15:00", "21:00"]
    timezone: string;        // "Asia/Saigon"
  };
  
  // AI Configuration
  aiConfig: {
    generationModel: string; // "gpt-4", "claude-sonnet-4.5"
    qaEnabled: boolean;
    minQualityScore: number; // 0-100
    maxRetries: number;
  };
  
  // State
  status: 'active' | 'paused' | 'archived';
  lastPostAt?: Date;
  
  // Stats
  stats: {
    totalPosts: number;
    avgQualityScore: number;
    failedGenerations: number;
  };
  
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. Content Generation Pipeline

```
┌─────────────────────────────────────────────────────────┐
│                    n8n Workflow                          │
│  Trigger: Cron (check every hour)                       │
└───────────┬─────────────────────────────────────────────┘
            │
            ↓
┌───────────────────────────────────────────────────────────┐
│  GET /api/v1/page-profiles/due-for-content                │
│  Returns: PageProfiles that need new content              │
└───────────┬───────────────────────────────────────────────┘
            │
            ↓ For each PageProfile
┌───────────────────────────────────────────────────────────┐
│  POST /api/v1/page-profiles/:id/generate-content          │
│  → Queues BullMQ job: 'content-generation'                │
└───────────┬───────────────────────────────────────────────┘
            │
            ↓
┌───────────────────────────────────────────────────────────┐
│           ai-worker: ContentGenerationJob                 │
│                                                           │
│  1. Fetch content based on strategy:                      │
│     - repost → fetch RSS, pick best article               │
│     - news → scrape news sites, summarize                 │
│     - ai-generated → call LLM with prompt                 │
│                                                           │
│  2. Generate hashtags                                     │
│  3. Generate image description (for platforms needing it) │
│                                                           │
│  4. Create ContentDraft (status: PENDING_QA)              │
└───────────┬───────────────────────────────────────────────┘
            │
            ↓
┌───────────────────────────────────────────────────────────┐
│           ai-worker: ContentQAJob                         │
│                                                           │
│  Agentic Multi-Agent QA:                                  │
│  - Agent 1: Grammar & spelling check                      │
│  - Agent 2: Niche relevance validator                     │
│  - Agent 3: Engagement potential scorer                   │
│  - Agent 4: Brand safety checker                          │
│                                                           │
│  Aggregate score → pass/fail decision                     │
│                                                           │
│  If PASS:                                                 │
│    → ContentDraft status = APPROVED                       │
│    → Trigger scheduling                                   │
│                                                           │
│  If FAIL (score < minQualityScore):                       │
│    → Retry generation (max 3 times)                       │
│    → Use QA feedback to improve next attempt              │
│    → If all retries fail → alert human                    │
└───────────┬───────────────────────────────────────────────┘
            │
            ↓ (If APPROVED)
┌───────────────────────────────────────────────────────────┐
│  POST /api/v1/content-drafts/:id/schedule                 │
│  → Calls PostizClient.schedulePost()                      │
│  → Creates PublishTarget per platform                     │
│  → Logs ActionLog                                         │
└───────────┬───────────────────────────────────────────────┘
            │
            ↓
┌───────────────────────────────────────────────────────────┐
│                   Postiz Engine                           │
│  Handles actual posting to Facebook/Instagram/TikTok      │
└───────────────────────────────────────────────────────────┘
```

### 3. Content Archive for Analytics

```typescript
// New Prisma model
model ContentArchive {
  id              String   @id @default(cuid())
  pageProfileId   String
  contentDraftId  String   @unique
  
  // Content snapshot
  body            String   @db.Text
  hashtags        String[]
  mediaUrls       String[]
  
  // Generation metadata
  generatedBy     String   // 'rss-repost', 'news-scraper', 'ai-original'
  sourceUrl       String?
  generationModel String?  // 'gpt-4', 'claude-sonnet-4.5'
  
  // QA metadata
  qaScore         Float
  qaAttempts      Int      @default(1)
  qaAgentResults  Json     // Individual agent scores + feedback
  
  // Publishing metadata
  publishedAt     DateTime?
  platforms       String[] // ['facebook', 'instagram']
  
  // Performance (fetched later from Postiz)
  performance     Json?    // { likes, shares, comments, reach }
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  pageProfile     PageProfile  @relation(fields: [pageProfileId], references: [id])
  contentDraft    ContentDraft @relation(fields: [contentDraftId], references: [id])
  
  @@index([pageProfileId, createdAt])
}
```

### 4. Integration Points

#### With Postiz (via postiz-client)
```typescript
// packages/postiz-client/src/PostizClient.ts
class PostizClient {
  async schedulePost(params: {
    integrationIds: string[];  // Platform connection IDs from Postiz
    content: string;
    mediaUrls?: string[];
    scheduledTime: Date;
  }): Promise<PostizPostResponse>;
  
  async getPostStats(postId: string): Promise<PostStats>;
}

// We NEVER call Postiz API directly — always via postiz-client
```

#### With n8n (workflow orchestration)
```typescript
// n8n workflows call our API:
// 1. Daily Content Generation Workflow
//    Cron: 06:00 daily
//    → GET /page-profiles/due-for-content
//    → For each: POST /page-profiles/:id/generate-content

// 2. Performance Tracking Workflow
//    Cron: 23:00 daily
//    → GET /content-archives/published-today
//    → For each: fetch stats from Postiz
//    → Update ContentArchive.performance

// 3. Weekly Optimization Workflow
//    Cron: Sunday 20:00
//    → GET /page-profiles/analytics
//    → Analyze performance patterns
//    → Suggest schedule/strategy adjustments
```

#### With ai-worker (BullMQ jobs)
```typescript
// New job types in ai-worker
enum JobType {
  // Existing
  GENERATE_CAPTION = 'generate-caption',
  GENERATE_HASHTAGS = 'generate-hashtags',
  
  // NEW
  CONTENT_GENERATION = 'content-generation',
  CONTENT_QA = 'content-qa',
  RSS_FETCH = 'rss-fetch',
  NEWS_SCRAPE = 'news-scrape',
}

// ai-worker/src/jobs/content-generation.ts
export async function handleContentGeneration(job: Job) {
  const { pageProfileId, strategy } = job.data;
  
  let content: string;
  
  switch (strategy.type) {
    case 'repost':
      content = await fetchAndAdaptRSS(strategy.sources);
      break;
    case 'news':
      content = await scrapeAndSummarizeNews(strategy.keywords);
      break;
    case 'ai-generated':
      content = await generateOriginalContent(strategy.topics);
      break;
  }
  
  // Queue QA job
  await qaQueue.add('content-qa', {
    contentDraftId: draft.id,
    pageProfileId,
    minScore: aiConfig.minQualityScore
  });
}
```

---

## MVP Implementation Plan

### Phase 1: Domain Setup (Week 1)
**Goal:** Add PageProfile concept without breaking existing system

**Tasks:**
1. ✅ Create Prisma schema for PageProfile + ContentArchive
2. ✅ Run migration
3. ✅ Add CRUD endpoints in control-api:
   - POST /workspaces/:id/page-profiles
   - GET /workspaces/:id/page-profiles
   - PATCH /workspaces/:id/page-profiles/:id
   - DELETE /workspaces/:id/page-profiles/:id
4. ✅ Add basic UI in dashboard-web (list + create form)

**Deliverable:** Can create and manage PageProfiles via UI

---

### Phase 2: Content Generation (Week 2)
**Goal:** Generate content from ONE source (AI-generated) first

**Tasks:**
1. ✅ Add BullMQ job: `content-generation`
2. ✅ Implement AI text generation handler:
   - Use OpenAI/Claude API
   - Prompt engineering for different niches
3. ✅ API endpoint: POST /page-profiles/:id/generate-content
   - Queues BullMQ job
   - Creates ContentDraft with status PENDING_QA
4. ✅ Test: Manually trigger generation → verify ContentDraft created

**Deliverable:** Can trigger content generation for a PageProfile

---

### Phase 3: Agentic QA System (Week 3)
**Goal:** Quality check content before publishing

**Tasks:**
1. ✅ Add BullMQ job: `content-qa`
2. ✅ Implement multi-agent QA:
   - Grammar checker (via LLM)
   - Niche relevance validator (via LLM)
   - Engagement scorer (via LLM)
   - Aggregate scores
3. ✅ Handle pass/fail:
   - PASS → status = APPROVED → auto-schedule
   - FAIL → retry generation (up to maxRetries)
4. ✅ Save QA results to ContentArchive

**Deliverable:** Content passes QA before scheduling

---

### Phase 4: Auto-Scheduling (Week 4)
**Goal:** Approved content auto-publishes

**Tasks:**
1. ✅ When ContentDraft status = APPROVED:
   - Auto-call /content-drafts/:id/schedule
   - Calculate optimal post time based on PageProfile.schedule
2. ✅ Create ContentArchive entry
3. ✅ Link to PublishTarget
4. ✅ Test end-to-end: generate → QA → schedule → Postiz → publish

**Deliverable:** Full automation flow working for AI-generated content

---

### Phase 5: Additional Content Sources (Week 5)
**Goal:** Add RSS repost + news scraping

**Tasks:**
1. ✅ Add BullMQ job: `rss-fetch`
   - Parse RSS feeds
   - Filter by relevance
   - Adapt content style
2. ✅ Add BullMQ job: `news-scrape`
   - Use web search API
   - Summarize articles
   - Rewrite for target audience
3. ✅ Update content-generation job to handle all 3 types

**Deliverable:** Can generate from RSS, news, or AI

---

### Phase 6: n8n Integration (Week 6)
**Goal:** Fully autonomous operation

**Tasks:**
1. ✅ Create n8n workflow: Daily Content Generation
   - Cron trigger
   - Call /page-profiles/due-for-content
   - For each: trigger generation
2. ✅ Create n8n workflow: Performance Tracking
   - Fetch stats from Postiz
   - Update ContentArchive
3. ✅ Create n8n workflow: Weekly Optimization
   - Analyze performance
   - Suggest adjustments

**Deliverable:** Zero manual intervention, runs 24/7

---

## Consequences

### Positive
- ✅ **Clear separation of concerns**: We handle content, Postiz handles publishing
- ✅ **Leverages existing infra**: n8n for orchestration, BullMQ for async jobs
- ✅ **Scalable**: Add new PageProfiles without code changes
- ✅ **Quality control**: Agentic QA prevents bad content
- ✅ **Data ownership**: All content archived for analytics
- ✅ **Multi-platform**: Works for Facebook, Instagram, TikTok via Postiz

### Negative
- ⚠️ **LLM costs**: Multiple AI calls per content (generation + QA agents)
- ⚠️ **Complexity**: Multi-step pipeline (generate → QA → retry → schedule)
- ⚠️ **Rate limits**: Need to handle API rate limits gracefully
- ⚠️ **QA accuracy**: AI quality checking is not perfect, may need tuning

### Mitigations
- **Cost**: Start with cheaper models (GPT-4o-mini, Claude Haiku) for non-critical parts
- **Complexity**: Keep each job simple, log everything for debugging
- **Rate limits**: Implement exponential backoff, queue throttling
- **QA accuracy**: Track QA decisions, allow human override, tune thresholds

---

## Open Questions

1. **Image generation**: Do we auto-generate images for Instagram/TikTok?
   - Proposal: Use existing Nano Banana Pro (Gemini) or DALL-E API
   - Add to content-generation job

2. **Video generation**: TikTok needs video, do we auto-create?
   - Proposal: Phase 2 feature, use Veo 3.1 API when available
   - For MVP: TikTok disabled or use static image slideshows

3. **Content calendar**: Should we preview upcoming posts?
   - Proposal: Add GET /page-profiles/:id/calendar endpoint
   - Show scheduled + pending content

4. **Human intervention**: What if all QA retries fail?
   - Proposal: Create notification via n8n → Telegram
   - Human can manually review ContentDraft

---

## Next Steps

1. ✅ **GET APPROVAL** from Bum on this architecture
2. ⬜ Implement Phase 1 (Domain Setup)
3. ⬜ Test with 1 PageProfile end-to-end
4. ⬜ Scale to multiple PageProfiles
5. ⬜ Add RSS + news sources
6. ⬜ Full n8n automation

---

## References

- [Postiz API Docs](https://docs.postiz.com/)
- [BullMQ Docs](https://docs.bullmq.io/)
- [n8n Workflow Examples](https://docs.n8n.io/)
- Existing: `docs/architecture.md`, `CLAUDE.md`, `TASKS.md`
