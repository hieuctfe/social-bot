import { PrismaClient } from '@prisma/client';
import { defaultLogger } from '@social-bot/observability';
import { generateAIContent } from '../../services/ai-content-generator';
import type { AiJobResult } from '../ai-job.types';

const logger = defaultLogger.child({ handler: 'content-generation' });
const prisma = new PrismaClient();

export interface ContentGenerationPayload {
  pageProfileId: string;
  workspaceId: string;
}

/**
 * Handle content generation for a PageProfile
 * 
 * Flow:
 * 1. Fetch PageProfile from database
 * 2. Generate content based on strategy.type
 * 3. Create ContentDraft
 * 4. Auto-approve if QA is disabled (Phase 4 will add proper QA)
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

    logger.info('PageProfile fetched', {
      pageProfileId,
      niche: pageProfile.niche,
      strategyType: (pageProfile.contentStrategy as any)?.type,
    });

    // 2. Generate content based on strategy type
    let body: string;
    let hashtags: string[];

    const contentStrategy = pageProfile.contentStrategy as any;
    const strategyType = contentStrategy?.type || 'ai-generated';

    switch (strategyType) {
      case 'ai-generated': {
        const result = await generateAIContent({
          id: pageProfile.id,
          name: pageProfile.name,
          niche: pageProfile.niche,
          description: pageProfile.description || undefined,
          contentStrategy: contentStrategy || {},
          aiConfig: (pageProfile.aiConfig as any) || {},
        });
        body = result.body;
        hashtags = result.hashtags;
        break;
      }

      case 'repost':
        // TODO: Phase 5 - RSS repost
        throw new Error('RSS repost not implemented yet (Phase 5)');

      case 'news':
        // TODO: Phase 5 - News scraping
        throw new Error('News scraping not implemented yet (Phase 5)');

      default:
        throw new Error(`Unknown content strategy type: ${strategyType}`);
    }

    logger.info('Content generated', {
      pageProfileId,
      bodyLength: body.length,
      hashtagCount: hashtags.length,
    });

    // 3. Create ContentDraft
    const title = `${pageProfile.name} - ${new Date().toISOString().split('T')[0]}`;
    
    const draft = await prisma.contentDraft.create({
      data: {
        workspaceId,
        createdById: 'system', // TODO: Use proper system user ID or service account
        title,
        body,
        status: 'DRAFT', // Will be auto-approved below if QA disabled
        platformTargets: [], // Will be set during scheduling
        metadata: {
          pageProfileId,
          hashtags,
          generatedBy: 'ai-worker',
          generationModel: (pageProfile.aiConfig as any)?.generationModel || 'claude-3-5-sonnet-20241022',
          strategyType,
        },
      },
    });

    logger.info('ContentDraft created', {
      draftId: draft.id,
      pageProfileId,
      status: draft.status,
    });

    // 4. Handle QA / Auto-approval
    const aiConfig = pageProfile.aiConfig as any;
    const qaEnabled = aiConfig?.qaEnabled ?? false;

    if (!qaEnabled) {
      // Auto-approve if QA is disabled
      await prisma.contentDraft.update({
        where: { id: draft.id },
        data: { status: 'APPROVED' },
      });

      logger.info('ContentDraft auto-approved (QA disabled)', {
        draftId: draft.id,
        pageProfileId,
      });
    } else {
      // TODO: Phase 4 - Queue QA job
      logger.info('QA enabled but not implemented yet - auto-approving', {
        draftId: draft.id,
      });

      await prisma.contentDraft.update({
        where: { id: draft.id },
        data: { status: 'APPROVED' },
      });
    }

    // Update PageProfile stats
    await prisma.pageProfile.update({
      where: { id: pageProfileId },
      data: {
        lastPostAt: new Date(),
        stats: {
          ...(pageProfile.stats as any),
          totalPosts: ((pageProfile.stats as any)?.totalPosts || 0) + 1,
        },
      },
    });

    logger.info('Content generation completed successfully', {
      draftId: draft.id,
      pageProfileId,
    });

    return {
      success: true,
      data: {
        draftId: draft.id,
        pageProfileId,
        body: body.substring(0, 100) + '...', // Return preview
        hashtags,
      },
    };
  } catch (error) {
    logger.error('Content generation failed', {
      pageProfileId,
      workspaceId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    // Update failure stats
    try {
      const profile = await prisma.pageProfile.findUnique({
        where: { id: pageProfileId },
      });

      if (profile) {
        await prisma.pageProfile.update({
          where: { id: pageProfileId },
          data: {
            stats: {
              ...(profile.stats as any),
              failedGenerations: ((profile.stats as any)?.failedGenerations || 0) + 1,
            },
          },
        });
      }
    } catch (statsError) {
      logger.error('Failed to update failure stats', {
        pageProfileId,
        error: statsError instanceof Error ? statsError.message : String(statsError),
      });
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
