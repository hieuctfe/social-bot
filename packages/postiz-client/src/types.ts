import { z } from 'zod';

// ─── Postiz API response shapes ─────────────────────────────
// These match Postiz Public API. Keep Postiz terminology here;
// normalize to our domain types in the control-api service layer.

export const PostizIntegrationSchema = z.object({
  id: z.string(),
  name: z.string(),
  identifier: z.string(),
  picture: z.string().optional(),
  disabled: z.boolean(),
  inBetweenSteps: z.boolean().optional(),
  refreshNeeded: z.boolean().optional(),
});

export type PostizIntegration = z.infer<typeof PostizIntegrationSchema>;

export const PostizSchedulePostInputSchema = z.object({
  /** The Postiz integration IDs (channels) to post to */
  integrationIds: z.array(z.string()),
  /** Post content */
  content: z.string(),
  /** ISO 8601 date string */
  scheduledAt: z.string(),
  /** Optional media asset IDs from Postiz */
  mediaIds: z.array(z.string()).optional(),
  /** Additional platform-specific settings */
  settings: z.record(z.unknown()).optional(),
});

export type PostizSchedulePostInput = z.infer<typeof PostizSchedulePostInputSchema>;

// Response from POST /posts (create/schedule)
export const PostizCreatePostResponseSchema = z.object({
  postId: z.string(),
  integration: z.string(),
});

export type PostizCreatePostResponse = z.infer<typeof PostizCreatePostResponseSchema>;

// Response from GET /posts/:id (get post details)
export const PostizPostSchema = z.object({
  id: z.string(),
  status: z.string(),
  scheduledAt: z.string().optional(),
  publishedAt: z.string().optional(),
  content: z.string().optional(),
});

export type PostizPost = z.infer<typeof PostizPostSchema>;

export const PostizUploadMediaResultSchema = z.object({
  id: z.string(),
  path: z.string(),
  url: z.string().optional(),
});

export type PostizUploadMediaResult = z.infer<typeof PostizUploadMediaResultSchema>;

export interface PostizClientConfig {
  apiUrl: string;
  apiKey: string;
  /** Max retry attempts on transient errors. Default: 3 */
  maxRetries?: number;
  /** Timeout in ms. Default: 30000 */
  timeoutMs?: number;
}
