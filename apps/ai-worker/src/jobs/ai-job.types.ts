export const AI_JOB_QUEUE = 'ai-jobs';

export interface GenerateCaptionPayload {
  workspaceId: string;
  contentDraftId: string;
  prompt?: string;
  platform?: string;
}

export interface SuggestHashtagsPayload {
  workspaceId: string;
  contentDraftId: string;
  content: string;
  platform?: string;
}

export type AiJobData = GenerateCaptionPayload | SuggestHashtagsPayload;

export interface AiJobResult {
  success: boolean;
  data?: unknown;
  error?: string;
}
