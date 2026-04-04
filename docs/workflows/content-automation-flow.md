# Content Automation Workflow

## MVP Automation Flow (Simplified)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         n8n WORKFLOW                                 │
│                  (Cron: Every hour at :00)                           │
└────────┬────────────────────────────────────────────────────────────┘
         │
         ↓
    ┌────────────────────────────────────────┐
    │  1. Check which PageProfiles need      │
    │     content (based on schedule)        │
    │     GET /page-profiles/due-for-content │
    └────────┬───────────────────────────────┘
             │
             ↓ For each PageProfile
    ┌────────────────────────────────────────┐
    │  2. Trigger content generation         │
    │     POST /page-profiles/:id/generate   │
    │     → Queues BullMQ job                │
    └────────┬───────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────────┐
│               AI-WORKER: Generate Content                   │
│                                                            │
│  3. Based on PageProfile.contentStrategy.type:             │
│                                                            │
│     ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │
│     │ RSS Repost  │  │ News Scrape │  │ AI Original  │   │
│     └──────┬──────┘  └──────┬──────┘  └──────┬───────┘   │
│            │                │                │           │
│            └────────────────┴────────────────┘           │
│                           ↓                              │
│            Generate: body + hashtags + media description │
│                           ↓                              │
│            Create ContentDraft (status: PENDING_QA)      │
│                           ↓                              │
│            Queue 'content-qa' job                        │
└────────────────────────┬───────────────────────────────────┘
                         │
                         ↓
┌────────────────────────────────────────────────────────────┐
│            AI-WORKER: Agentic Quality Check                 │
│                                                            │
│  4. Multi-Agent QA:                                        │
│                                                            │
│     ┌──────────────┐   ┌──────────────┐                   │
│     │ Agent 1:     │   │ Agent 2:     │                   │
│     │ Grammar      │   │ Niche        │                   │
│     │ & Spelling   │   │ Relevance    │                   │
│     └──────┬───────┘   └──────┬───────┘                   │
│            │                  │                           │
│     ┌──────▼──────┐   ┌──────▼───────┐                   │
│     │ Agent 3:    │   │ Agent 4:     │                   │
│     │ Engagement  │   │ Brand Safety │                   │
│     │ Potential   │   │              │                   │
│     └──────┬──────┘   └──────┬───────┘                   │
│            │                  │                           │
│            └────────┬─────────┘                           │
│                     ↓                                     │
│          Aggregate Score (0-100)                          │
│                     │                                     │
│         ┌───────────┴───────────┐                         │
│         │                       │                         │
│     Score ≥ minQualityScore   Score < minQualityScore    │
│         │                       │                         │
│         ↓ PASS                  ↓ FAIL                    │
│   Status: APPROVED         Retry generation               │
│         │                  (max 3 attempts)               │
│         │                       │                         │
│         │              ┌────────┴────────┐                │
│         │              │                 │                │
│         │         Retry < 3         Retry = 3             │
│         │              │                 │                │
│         │              ↓                 ↓                │
│         │     Regenerate with     Alert human             │
│         │     QA feedback         (Telegram)              │
│         │              │                                  │
│         │              └─> (back to step 3)               │
│         │                                                 │
│         └─> Create ContentArchive (save QA results)       │
│                     ↓                                     │
│            Auto-trigger scheduling                        │
└────────────────────────┬──────────────────────────────────┘
                         │
                         ↓
    ┌────────────────────────────────────────┐
    │  5. Calculate optimal post time        │
    │     based on PageProfile.schedule      │
    │     POST /content-drafts/:id/schedule  │
    └────────┬───────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────┐
    │  6. Call Postiz API                    │
    │     (via postiz-client package)        │
    │     - Create post per platform         │
    │     - Set scheduled time               │
    │     - Attach media if needed           │
    └────────┬───────────────────────────────┘
             │
             ↓
┌────────────────────────────────────────────────────────┐
│                  POSTIZ ENGINE                          │
│                                                        │
│  7. Temporal schedules job                             │
│     → Posts to platforms at scheduled time:            │
│                                                        │
│     ┌──────────────┐  ┌──────────────┐  ┌──────────┐ │
│     │  Facebook    │  │  Instagram   │  │  TikTok  │ │
│     └──────────────┘  └──────────────┘  └──────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## Performance Tracking (Separate n8n Workflow)

```
┌─────────────────────────────────────────────────────────┐
│                 n8n WORKFLOW                             │
│              (Cron: Daily at 23:00)                      │
└────────┬────────────────────────────────────────────────┘
         │
         ↓
    ┌────────────────────────────────────────┐
    │  1. Get content published in last 24h  │
    │     GET /content-archives/recent       │
    └────────┬───────────────────────────────┘
             │
             ↓ For each ContentArchive
    ┌────────────────────────────────────────┐
    │  2. Fetch stats from Postiz            │
    │     GET /postiz/posts/:id/stats        │
    │     (likes, shares, comments, reach)   │
    └────────┬───────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────┐
    │  3. Update ContentArchive.performance  │
    │     PATCH /content-archives/:id        │
    └────────┬───────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────┐
    │  4. Calculate PageProfile stats        │
    │     - Average engagement               │
    │     - Best performing content type     │
    │     - Optimal posting times            │
    └────────┬───────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────┐
    │  5. If engagement drops:               │
    │     → Adjust PageProfile.schedule      │
    │     → Notify via Telegram              │
    └────────────────────────────────────────┘
```

---

## Weekly Optimization (Separate n8n Workflow)

```
┌─────────────────────────────────────────────────────────┐
│                 n8n WORKFLOW                             │
│            (Cron: Sunday at 20:00)                       │
└────────┬────────────────────────────────────────────────┘
         │
         ↓
    ┌────────────────────────────────────────┐
    │  1. Analyze past week performance      │
    │     GET /page-profiles/:id/analytics   │
    │     (engagement trends, best content)  │
    └────────┬───────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────┐
    │  2. AI Optimization Agent:             │
    │     - Identify patterns                │
    │     - Suggest schedule adjustments     │
    │     - Recommend content strategy tweak │
    └────────┬───────────────────────────────┘
             │
             ↓
    ┌────────────────────────────────────────┐
    │  3. Generate weekly report             │
    │     → Send to Telegram                 │
    │                                        │
    │     Example:                           │
    │     "Tech News Daily:                  │
    │      - 21 posts, avg score 87/100      │
    │      - Best: AI-generated (92% eng)    │
    │      - Worst: RSS repost (65% eng)     │
    │      - Suggestion: Increase AI ratio"  │
    └────────────────────────────────────────┘
```

---

## What Each Component Does

### We Build (New Code)
| Component | Responsibility |
|-----------|---------------|
| **PageProfile CRUD** | Manage page configs (niche, strategy, schedule) |
| **Content Generation Jobs** | RSS fetch, news scrape, AI text generation |
| **Agentic QA Jobs** | Multi-agent quality validation |
| **ContentArchive** | Store all generated content + performance |
| **Auto-Scheduling Logic** | Calculate optimal post times |

### We Leverage (Existing)
| Component | Responsibility |
|-----------|---------------|
| **Postiz** | Platform publishing (Facebook, Instagram, TikTok) |
| **n8n** | Workflow orchestration, cron triggers |
| **ai-worker** | Execute async AI jobs via BullMQ |
| **control-api** | Domain logic, approval flow, audit log |

### We Integrate (APIs)
| Integration | Method |
|-------------|--------|
| **Postiz API** | Via `packages/postiz-client` (schedulePost, getStats) |
| **n8n Webhooks** | n8n calls our REST API endpoints |
| **BullMQ** | Queue jobs from control-api → ai-worker processes |
| **LLM APIs** | OpenAI/Claude/Gemini for content generation + QA |

---

## MVP Milestones

### ✅ Milestone 1: Domain Setup (Week 1)
- PageProfile CRUD working
- Can create page via UI

### ✅ Milestone 2: Manual Generation (Week 2)
- Can trigger content generation manually
- AI generates text based on niche

### ✅ Milestone 3: QA Working (Week 3)
- Content gets quality checked
- Bad content rejected, retries work

### ✅ Milestone 4: Auto-Publishing (Week 4)
- Approved content auto-schedules
- Publishes via Postiz

### ✅ Milestone 5: Multi-Source (Week 5)
- RSS repost working
- News scraping working

### ✅ Milestone 6: Full Automation (Week 6)
- n8n workflows deployed
- Zero manual intervention
- 24/7 autonomous operation

---

## Example: Full Flow for One Post

**PageProfile:**
```json
{
  "name": "Tech News Daily",
  "niche": "tech",
  "contentStrategy": {
    "type": "ai-generated",
    "topics": ["AI", "startups", "productivity"],
    "style": "professional"
  },
  "schedule": {
    "frequency": 2,
    "times": ["09:00", "18:00"],
    "timezone": "Asia/Saigon"
  },
  "aiConfig": {
    "generationModel": "gpt-4o-mini",
    "qaEnabled": true,
    "minQualityScore": 75,
    "maxRetries": 3
  }
}
```

**Timeline:**
```
08:00 - n8n cron checks → Tech News Daily needs content (next post at 09:00)
08:01 - Triggers generation job
08:02 - AI generates post about "Claude 3.5 Sonnet release"
08:03 - QA agents check:
        - Grammar: 95/100
        - Niche: 90/100
        - Engagement: 85/100
        - Safety: 100/100
        → Aggregate: 92/100 (PASS)
08:04 - Auto-schedules for 09:00
08:05 - Postiz receives schedule request
09:00 - Postiz publishes to Facebook + Instagram
23:00 - Performance tracking fetches stats:
        - Likes: 234
        - Shares: 12
        - Comments: 8
        → Updates ContentArchive
```

---

## Cost Estimate (Per Page, Per Day)

**AI Costs:**
- Content generation: $0.01 per post (GPT-4o-mini)
- QA (4 agents): $0.02 per post
- Weekly optimization: $0.05 per page

**Total per page:**
- 2 posts/day × $0.03 = $0.06/day
- $1.80/month per page

**For 10 pages:**
- $18/month AI costs
- Plus Postiz/hosting: ~$0 (self-hosted)

**ROI:**
If 1 page generates $50/month from affiliate → $500/month revenue
Cost: $18/month
Profit: $482/month (96% margin)
