import { PrismaClient } from '@prisma/client';
import { defaultLogger } from '@social-bot/observability';
import { generateAIContent } from '../../services/ai-content-generator';
import { runQAChecks } from '../../services/ai-qa-checker';
import type { AiJobResult } from '../ai-job.types';

const logger = defaultLogger.child({ handler: 'content-generation' });
const prisma = new PrismaClient();

export interface ContentGenerationPayload {
  pageProfileId: string;
  workspaceId: string;
}

/**
 * Handle content generation for a PageProfile.
 *
 * Flow:
 * 1. Fetch PageProfile from database
 * 2. Generate content based on strategy.type
 * 3. Run multi-pass QA (if qaEnabled)
 *    - Retry with QA feedback up to maxRetries times
 *    - On final failure: mark draft FAILED, log for Telegram alert
 * 4. On QA pass (or qaEnabled=false): mark draft APPROVED
 *    - Auto-scheduling cron in control-api picks it up within 2 minutes
 * 5. Update PageProfile stats
 */
export async function handleContentGeneration(
  data: ContentGenerationPayload,
): Promise<AiJobResult> {
  const { pageProfileId, workspaceId } = data;

  logger.info('Content generation started', { pageProfileId, workspaceId });

  try {
    // 1. Fetch PageProfile
    const pageProfile = await prisma.pageProfile.findUnique({
      where: { id: pageProfileId },
    });

    if (!pageProfile) {
      throw new Error(`PageProfile ${pageProfileId} not found`);
    }

    if (pageProfile.workspaceId !== workspaceId) {
      throw new Error(
        `PageProfile ${pageProfileId} does not belong to workspace ${workspaceId}`,
      );
    }

    const contentStrategy = pageProfile.contentStrategy as any;
    const aiConfig = pageProfile.aiConfig as any;
    const strategyType: string = contentStrategy?.type || 'ai-generated';

    logger.info('PageProfile fetched', { pageProfileId, niche: pageProfile.niche, strategyType });

    // 2. Generate content based on strategy type
    if (strategyType === 'repost') {
      return await handleRepost(pageProfile, workspaceId, contentStrategy);
    }

    if (strategyType !== 'ai-generated') {
      throw new Error(`Unknown content strategy type: ${strategyType}`);
    }

    // ── AI_GENERATED path ──────────────────────────────────────────────────
    const qaEnabled: boolean = aiConfig?.qaEnabled ?? false;
    const maxRetries: number = aiConfig?.maxRetries ?? 2;
    const style: string = contentStrategy?.style || 'informative';

    // Fetch recent post bodies for originality check
    const recentArchives = await prisma.contentArchive.findMany({
      where: { pageProfileId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { body: true },
    });
    const recentPostBodies = recentArchives.map((a) => a.body);

    let body = '';
    let hashtags: string[] = [];
    let qaAttempts = 0;
    let lastQAFeedback = '';
    let qaResults: any = null;
    let approved = false;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      qaAttempts = attempt + 1;

      // Generate content (pass QA feedback on retries)
      const generated = await generateAIContent({
        id: pageProfile.id,
        name: pageProfile.name,
        niche: pageProfile.niche,
        description: pageProfile.description || undefined,
        contentStrategy: {
          ...contentStrategy,
          qaFeedback: lastQAFeedback || undefined,
        },
        aiConfig: aiConfig || {},
      });

      body = generated.body;
      hashtags = generated.hashtags;

      if (!qaEnabled) {
        approved = true;
        break;
      }

      // Run QA gate
      const qa = await runQAChecks({
        body,
        hashtags,
        niche: pageProfile.niche,
        style,
        recentPostBodies,
      });

      qaResults = {
        quality: qa.quality,
        brandVoice: qa.brandVoice,
        compliance: qa.compliance,
        originality: qa.originality,
      };

      if (qa.overallPass) {
        approved = true;
        break;
      }

      lastQAFeedback = qa.feedback;
      logger.warn('QA failed, will retry', {
        pageProfileId,
        attempt: attempt + 1,
        maxRetries,
        feedback: qa.feedback,
      });
    }

    // 3. Create ContentDraft
    const title = `${pageProfile.name} — ${new Date().toISOString().split('T')[0]}`;

    const draft = await prisma.contentDraft.create({
      data: {
        workspaceId,
        createdById: 'system',
        title,
        body,
        status: approved ? 'APPROVED' : 'FAILED',
        platformTargets: [],
        metadata: {
          pageProfileId,
          hashtags,
          generatedBy: 'ai-original',
          generationModel: aiConfig?.generationModel || 'claude-sonnet-4-6',
          strategyType,
          qaEnabled,
          qaAttempts,
          qaResults: qaResults ?? null,
        },
      },
    });

    if (!approved) {
      // All retries exhausted — log and send alert to n8n → Telegram
      logger.error('CONTENT_QA_FAILED: all retries exhausted', {
        pageProfileId,
        pageProfileName: pageProfile.name,
        draftId: draft.id,
        qaAttempts,
        lastQAResults: qaResults,
      });

      // Fire-and-forget: notify n8n QA failure webhook (→ Telegram alert)
      const webhookUrl = process.env['N8N_QA_FAILURE_WEBHOOK_URL'];
      if (webhookUrl) {
        fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            pageProfileId,
            pageProfileName: pageProfile.name,
            draftId: draft.id,
            qaAttempts,
            qaResults,
          }),
        }).catch((err) => logger.warn('Failed to send QA failure webhook', { error: String(err) }));
      }

      // Update failure stats
      await updateStats(pageProfile, { failedGenerations: 1 });

      return {
        success: false,
        error: `QA failed after ${qaAttempts} attempts`,
        data: { draftId: draft.id, pageProfileId, qaResults },
      };
    }

    logger.info('ContentDraft APPROVED', { draftId: draft.id, pageProfileId, qaAttempts });

    // 4. Update stats
    await updateStats(pageProfile, { totalPosts: 1 });

    return {
      success: true,
      data: {
        draftId: draft.id,
        pageProfileId,
        body: body.substring(0, 100) + '...',
        hashtags,
        qaAttempts,
      },
    };
  } catch (error) {
    logger.error('Content generation failed', {
      pageProfileId,
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
    });

    try {
      const profile = await prisma.pageProfile.findUnique({ where: { id: pageProfileId } });
      if (profile) await updateStats(profile, { failedGenerations: 1 });
    } catch {
      // ignore stats update failure
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// ─── Repost handler ───────────────────────────────────────────────────────────

async function handleRepost(
  pageProfile: any,
  workspaceId: string,
  contentStrategy: any,
): Promise<AiJobResult> {
  const { pageProfileId } = { pageProfileId: pageProfile.id };
  const sourceConnectionId: string | undefined = contentStrategy?.sourceConnectionId;
  const appendText: string = contentStrategy?.appendText || '';

  if (!sourceConnectionId) {
    throw new Error('REPOST strategy requires contentStrategy.sourceConnectionId');
  }

  // Find the source SocialConnection to get the Postiz integrationId
  const sourceConnection = await prisma.socialConnection.findUnique({
    where: { id: sourceConnectionId },
  });

  if (!sourceConnection) {
    throw new Error(`Source SocialConnection ${sourceConnectionId} not found`);
  }

  // Fetch last published post by looking at recent content archives from source
  // We identify source posts by checking if any other PageProfile uses this connection
  const recentSourceArchive = await prisma.contentArchive.findFirst({
    where: {
      contentDraft: {
        workspaceId,
        publishTargets: {
          some: { socialConnectionId: sourceConnectionId },
        },
        status: 'PUBLISHED',
      },
      NOT: {
        // Not already reposted by this pageProfile
        pageProfileId,
      },
    },
    orderBy: { createdAt: 'desc' },
    include: { contentDraft: true },
  });

  if (!recentSourceArchive) {
    logger.info('No new source content to repost', { pageProfileId, sourceConnectionId });
    return {
      success: true,
      data: { pageProfileId, message: 'No new content to repost' },
    };
  }

  // Check if we already reposted this
  const alreadyReposted = await prisma.contentArchive.findFirst({
    where: {
      pageProfileId,
      sourceUrl: recentSourceArchive.contentDraft.id,
    },
  });

  if (alreadyReposted) {
    logger.info('Already reposted this content', {
      pageProfileId,
      sourceArchiveId: recentSourceArchive.id,
    });
    return {
      success: true,
      data: { pageProfileId, message: 'Already reposted this content' },
    };
  }

  // Build repost body
  const sourceBody = recentSourceArchive.body;
  const repostBody = appendText ? `${sourceBody}\n\n${appendText}` : sourceBody;

  // Create ContentDraft (APPROVED immediately — no QA for reposts)
  const title = `Repost — ${pageProfile.name} — ${new Date().toISOString().split('T')[0]}`;

  const draft = await prisma.contentDraft.create({
    data: {
      workspaceId,
      createdById: 'system',
      title,
      body: repostBody,
      status: 'APPROVED',
      platformTargets: [],
      metadata: {
        pageProfileId,
        hashtags: recentSourceArchive.hashtags,
        generatedBy: 'repost',
        strategyType: 'repost',
        sourceUrl: recentSourceArchive.contentDraft.id,
        qaEnabled: false,
      },
    },
  });

  logger.info('Repost ContentDraft created and APPROVED', {
    draftId: draft.id,
    pageProfileId,
    sourceArchiveId: recentSourceArchive.id,
  });

  await updateStats(pageProfile, { totalPosts: 1 });

  return {
    success: true,
    data: {
      draftId: draft.id,
      pageProfileId,
      strategyType: 'repost',
      sourceArchiveId: recentSourceArchive.id,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function updateStats(
  profile: any,
  delta: { totalPosts?: number; failedGenerations?: number },
): Promise<void> {
  const current = (profile.stats as any) || {};
  await prisma.pageProfile.update({
    where: { id: profile.id },
    data: {
      lastPostAt: delta.totalPosts ? new Date() : undefined,
      stats: {
        totalPosts: (current.totalPosts || 0) + (delta.totalPosts || 0),
        avgQualityScore: current.avgQualityScore || 0,
        failedGenerations: (current.failedGenerations || 0) + (delta.failedGenerations || 0),
      },
    },
  });
}
