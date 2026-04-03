import { defaultLogger } from '@social-bot/observability';
import type { SuggestHashtagsPayload, AiJobResult } from '../ai-job.types';

const logger = defaultLogger.child({ handler: 'suggest-hashtags' });

/**
 * TODO: Implement with OpenAI / Anthropic SDK when AI_PROVIDER is configured.
 */
export async function handleSuggestHashtags(data: SuggestHashtagsPayload): Promise<AiJobResult> {
  logger.info('suggest-hashtags handler called', { workspaceId: data.workspaceId });

  return {
    success: true,
    data: {
      hashtags: ['#socialmedia', '#content', '#marketing'],
      contentDraftId: data.contentDraftId,
    },
  };
}
