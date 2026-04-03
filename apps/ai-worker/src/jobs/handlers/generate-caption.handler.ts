import { defaultLogger } from '@social-bot/observability';
import type { GenerateCaptionPayload, AiJobResult } from '../ai-job.types';

const logger = defaultLogger.child({ handler: 'generate-caption' });

/**
 * TODO: Implement with OpenAI / Anthropic SDK when AI_PROVIDER is configured.
 * This is a placeholder handler that logs and returns a stub.
 */
export async function handleGenerateCaption(data: GenerateCaptionPayload): Promise<AiJobResult> {
  logger.info('generate-caption handler called', { workspaceId: data.workspaceId });

  // TODO: Call AI provider API
  // const caption = await openai.chat.completions.create({ ... });

  return {
    success: true,
    data: {
      caption: '[AI-generated caption placeholder]',
      contentDraftId: data.contentDraftId,
    },
  };
}
