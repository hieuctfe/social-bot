import { z } from 'zod';

// ─── Supported platforms ─────────────────────────────────────

export type SupportedPlatform = 'FACEBOOK' | 'INSTAGRAM' | 'TIKTOK';

// ─── OAuth token stored per social connection ────────────────

export interface PlatformToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  /** Platform-native account/page ID (e.g. FB Page ID, IG User ID, TikTok open_id) */
  platformAccountId: string;
  /** Extra metadata: page name, picture, etc. */
  meta?: Record<string, unknown>;
}

// ─── Publish input ───────────────────────────────────────────

export const PublishPostInputSchema = z.object({
  platform: z.enum(['FACEBOOK', 'INSTAGRAM', 'TIKTOK']),
  token: z.object({
    accessToken: z.string(),
    platformAccountId: z.string(),
  }),
  content: z.string().min(1),
  /** ISO 8601 — if omitted, publish immediately */
  scheduledAt: z.string().optional(),
  mediaUrls: z.array(z.string().url()).optional(),
  /** Platform-specific overrides */
  options: z.record(z.unknown()).optional(),
});

export type PublishPostInput = z.infer<typeof PublishPostInputSchema>;

export interface PublishResult {
  externalPostId: string;
  platform: SupportedPlatform;
  status: 'published' | 'scheduled' | 'failed';
  publishedAt?: string;
  url?: string;
  raw?: unknown;
}

// ─── OAuth types ─────────────────────────────────────────────

export interface OAuthUrlParams {
  clientId: string;
  redirectUri: string;
  state: string;
  scopes: string[];
}

export interface OAuthTokenExchangeResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

// ─── Meta-specific ───────────────────────────────────────────

export interface MetaPage {
  id: string;
  name: string;
  access_token: string;
  category?: string;
  picture?: { data: { url: string } };
}

export interface MetaIgUser {
  id: string;
  name: string;
  username: string;
  profile_picture_url?: string;
}

export interface MetaPostResult {
  id: string;
  post_id?: string;
}

// ─── TikTok-specific ─────────────────────────────────────────

export interface TikTokCreatorInfo {
  open_id: string;
  union_id: string;
  avatar_url?: string;
  display_name?: string;
}

export interface TikTokPublishResult {
  publish_id: string;
}
