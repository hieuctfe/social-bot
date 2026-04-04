# Phase 3: Content Generation Implementation

## Goal
Implement AI-powered content generation for PageProfiles

## Context
- Phase 1 complete: PageProfile API working ✅
- Database seeded with test workspace
- Need: Content generation job that creates ContentDrafts

---

## Tasks

### 1. Create Content Generation Job (ai-worker)

**File:** `apps/ai-worker/src/jobs/content-generation.ts`

**Job handler:**
```typescript
interface ContentGenerationJobData {
  pageProfileId: string;
  workspaceId: string;
}

async function handleContentGeneration(job: Job<ContentGenerationJobData>) {
  const { pageProfileId, workspaceId } = job.data;
  
  // 1. Fetch PageProfile from database
  const pageProfile = await prisma.pageProfile.findUnique({
    where: { id: pageProfileId }
  });
  
  // 2. Generate content based on strategy.type
  let content: string;
  let hashtags: string[];
  
  switch (pageProfile.contentStrategy.type) {
    case 'ai-generated':
      const result = await generateAIContent(pageProfile);
      content = result.body;
      hashtags = result.hashtags;
      break;
    
    case 'repost':
      // TODO: Phase 5
      throw new Error('RSS repost not implemented yet');
      
    case 'news':
      // TODO: Phase 5
      throw new Error('News scraping not implemented yet');
      
    default:
      throw new Error(`Unknown strategy: ${pageProfile.contentStrategy.type}`);
  }
  
  // 3. Create ContentDraft
  const draft = await prisma.contentDraft.create({
    data: {
      workspaceId,
      createdById: 'system', // TODO: proper user ID
      title: `${pageProfile.name} - ${new Date().toISOString()}`,
      body: content,
      status: 'PENDING_QA', // Will be QA'd in Phase 4
      platformTargets: [], // Will be set during scheduling
      metadata: {
        pageProfileId,
        hashtags,
        generatedBy: 'ai-worker',
        generationModel: pageProfile.aiConfig.generationModel
      }
    }
  });
  
  // 4. Queue QA job (Phase 4 - for now just auto-approve)
  if (pageProfile.aiConfig.qaEnabled) {
    // TODO: Queue content-qa job
    // For now: auto-approve
    await prisma.contentDraft.update({
      where: { id: draft.id },
      data: { status: 'APPROVED' }
    });
  }
  
  return { draftId: draft.id };
}
```

---

### 2. AI Content Generator Service

**File:** `apps/ai-worker/src/services/ai-content-generator.ts`

**Use OpenAI/Claude API:**

```typescript
import Anthropic from '@anthropic-ai/sdk';

interface GenerateContentResult {
  body: string;
  hashtags: string[];
}

async function generateAIContent(pageProfile: PageProfile): Promise<GenerateContentResult> {
  const { contentStrategy, aiConfig, niche } = pageProfile;
  
  // Build prompt
  const prompt = `
You are a ${contentStrategy.style} content creator for ${niche} niche.

Topics: ${contentStrategy.topics?.join(', ')}

Generate a social media post that:
1. Is engaging and matches the ${contentStrategy.style} style
2. Is 150-300 words
3. Includes a strong hook in the first sentence
4. Is relevant to the ${niche} audience

Return ONLY a JSON object with this structure:
{
  "body": "the post content",
  "hashtags": ["hashtag1", "hashtag2", ...]
}
`;

  // Call LLM
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });
  
  const response = await anthropic.messages.create({
    model: aiConfig.generationModel || 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });
  
  // Parse response
  const content = response.content[0];
  if (content.type !== 'text') throw new Error('Unexpected response type');
  
  const result = JSON.parse(content.text);
  
  return {
    body: result.body,
    hashtags: result.hashtags
  };
}
```

---

### 3. API Endpoint to Trigger Generation

**File:** `apps/control-api/src/modules/page-profile/page-profile.controller.ts`

**Add endpoint:**

```typescript
@Post('workspaces/:workspaceId/page-profiles/:id/generate-content')
@ApiOperation({ summary: 'Trigger content generation for a PageProfile' })
async generateContent(
  @Param('workspaceId') workspaceId: string,
  @Param('id') id: string,
) {
  return this.pageProfileService.triggerContentGeneration(workspaceId, id);
}
```

**Service method:**

```typescript
async triggerContentGeneration(workspaceId: string, id: string) {
  const pageProfile = await this.findOne(workspaceId, id);
  
  // Queue BullMQ job
  await this.contentGenerationQueue.add('generate-content', {
    pageProfileId: id,
    workspaceId
  });
  
  return { message: 'Content generation queued', pageProfileId: id };
}
```

---

### 4. Setup BullMQ Queue

**File:** `apps/ai-worker/src/queues/content-generation.queue.ts`

```typescript
import Bull from 'bull';
import { handleContentGeneration } from '../jobs/content-generation';

const contentGenerationQueue = new Bull('content-generation', {
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379')
  }
});

contentGenerationQueue.process(async (job) => {
  return handleContentGeneration(job);
});

export { contentGenerationQueue };
```

---

## MVP Scope (Phase 3)

**Implement ONLY:**
- ✅ AI-generated content (OpenAI/Claude)
- ✅ Basic content generation job
- ✅ API endpoint to trigger
- ✅ Auto-approve (skip QA for now)

**Skip for now (Phase 5):**
- ❌ RSS repost
- ❌ News scraping
- ❌ Agentic QA (Phase 4)

---

## Testing

**Test flow:**

1. Create PageProfile via API (already works)
2. Trigger generation:
   ```bash
   curl -X POST "http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/page-profiles/$PROFILE_ID/generate-content"
   ```
3. Check BullMQ queue
4. Verify ContentDraft created:
   ```sql
   SELECT id, title, body, status FROM content_drafts;
   ```

---

## Environment Variables Needed

Add to `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
# OR
OPENAI_API_KEY=sk-...
```

---

## Success Criteria

- [ ] Can trigger content generation via API
- [ ] BullMQ job processes successfully
- [ ] LLM generates content
- [ ] ContentDraft created in database
- [ ] Content body is relevant to niche
- [ ] Hashtags generated

---

## Deliverables

1. `apps/ai-worker/src/jobs/content-generation.ts`
2. `apps/ai-worker/src/services/ai-content-generator.ts`
3. Updated `PageProfileController` with generate endpoint
4. Updated `PageProfileService` with queue integration
5. Test results showing successful generation

---

**Estimated time:** 30-45 minutes

Ready for coding agent to implement! 🚀
