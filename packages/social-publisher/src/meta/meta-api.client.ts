import { MetaPage, MetaPostResult, PublishPostInput, PublishResult } from '../types';
import { PublishError, TokenExpiredError } from '../errors';

const GRAPH_API = 'https://graph.facebook.com/v19.0';

/**
 * MetaApiClient handles:
 * - Facebook Page post publishing (text, photo, video)
 * - Instagram Business post publishing (single image, carousel, video/reel)
 *
 * Both use the Meta Graph API v19.0.
 * Docs: https://developers.facebook.com/docs/graph-api
 */
export class MetaApiClient {
  // ─── Facebook Pages ──────────────────────────────────────

  /**
   * Publish a text/link post to a Facebook Page.
   * pageAccessToken: the Page's own access token (from /me/accounts)
   * pageId: the Facebook Page ID
   */
  async publishFacebookPost(
    pageId: string,
    pageAccessToken: string,
    content: string,
    options?: { link?: string; scheduledPublishTime?: number },
  ): Promise<PublishResult> {
    const body: Record<string, unknown> = {
      message: content,
      access_token: pageAccessToken,
    };

    if (options?.link) body['link'] = options.link;
    if (options?.scheduledPublishTime) {
      body['scheduled_publish_time'] = options.scheduledPublishTime;
      body['published'] = false;
    }

    const res = await this.post(`/${pageId}/feed`, body);
    const data = res as MetaPostResult;

    return {
      externalPostId: data.id,
      platform: 'FACEBOOK',
      status: options?.scheduledPublishTime ? 'scheduled' : 'published',
      raw: data,
    };
  }

  /**
   * Publish a photo post to a Facebook Page.
   */
  async publishFacebookPhoto(
    pageId: string,
    pageAccessToken: string,
    caption: string,
    photoUrl: string,
  ): Promise<PublishResult> {
    const body = {
      caption,
      url: photoUrl,
      access_token: pageAccessToken,
    };

    const res = await this.post(`/${pageId}/photos`, body) as MetaPostResult;

    return {
      externalPostId: res.id,
      platform: 'FACEBOOK',
      status: 'published',
      raw: res,
    };
  }

  // ─── Instagram Business ──────────────────────────────────

  /**
   * Publish a single-image or single-video post to Instagram Business.
   *
   * Step 1: Create a media container
   * Step 2: Publish the container
   *
   * igUserId: the Instagram Business Account ID
   * igAccessToken: a User Access Token with instagram_content_publish scope
   */
  async publishInstagramPost(
    igUserId: string,
    igAccessToken: string,
    caption: string,
    mediaUrl: string,
    mediaType: 'IMAGE' | 'VIDEO' | 'REELS' = 'IMAGE',
  ): Promise<PublishResult> {
    // Step 1: Create media container
    const containerBody: Record<string, unknown> = {
      caption,
      access_token: igAccessToken,
    };

    if (mediaType === 'IMAGE') {
      containerBody['image_url'] = mediaUrl;
    } else {
      containerBody['video_url'] = mediaUrl;
      containerBody['media_type'] = mediaType;
    }

    const container = await this.post(`/${igUserId}/media`, containerBody) as { id: string };

    // Step 2: Wait a moment then publish (IG requires the container to be processed)
    if (mediaType !== 'IMAGE') {
      await this.pollForContainerReady(container.id, igAccessToken);
    }

    // Step 3: Publish the container
    const publishBody = {
      creation_id: container.id,
      access_token: igAccessToken,
    };

    const result = await this.post(`/${igUserId}/media_publish`, publishBody) as { id: string };

    return {
      externalPostId: result.id,
      platform: 'INSTAGRAM',
      status: 'published',
      url: `https://www.instagram.com/p/${result.id}/`,
      raw: result,
    };
  }

  /**
   * Publish an Instagram Carousel (multiple images).
   */
  async publishInstagramCarousel(
    igUserId: string,
    igAccessToken: string,
    caption: string,
    imageUrls: string[],
  ): Promise<PublishResult> {
    if (imageUrls.length < 2 || imageUrls.length > 10) {
      throw new PublishError('INSTAGRAM', 'Carousel requires 2–10 images');
    }

    // Step 1: Create child containers for each image
    const childIds: string[] = [];
    for (const imageUrl of imageUrls) {
      const child = await this.post(`/${igUserId}/media`, {
        image_url: imageUrl,
        is_carousel_item: true,
        access_token: igAccessToken,
      }) as { id: string };
      childIds.push(child.id);
    }

    // Step 2: Create carousel container
    const carousel = await this.post(`/${igUserId}/media`, {
      media_type: 'CAROUSEL',
      children: childIds.join(','),
      caption,
      access_token: igAccessToken,
    }) as { id: string };

    // Step 3: Publish
    const result = await this.post(`/${igUserId}/media_publish`, {
      creation_id: carousel.id,
      access_token: igAccessToken,
    }) as { id: string };

    return {
      externalPostId: result.id,
      platform: 'INSTAGRAM',
      status: 'published',
      raw: result,
    };
  }

  // ─── Internal ────────────────────────────────────────────

  private async post(path: string, body: Record<string, unknown>): Promise<unknown> {
    const res = await fetch(`${GRAPH_API}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({ error: { message: 'Unknown error' } }))) as {
        error?: { message: string; code?: number; type?: string };
      };
      const msg = err.error?.message ?? 'Meta API error';
      if (res.status === 401 || err.error?.code === 190) {
        throw new TokenExpiredError('FACEBOOK/INSTAGRAM');
      }
      throw new PublishError('FACEBOOK/INSTAGRAM', msg, res.status, err);
    }

    return res.json();
  }

  private async pollForContainerReady(
    containerId: string,
    accessToken: string,
    maxAttempts = 10,
  ): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const url = new URL(`${GRAPH_API}/${containerId}`);
      url.searchParams.set('fields', 'status_code');
      url.searchParams.set('access_token', accessToken);
      const res = await fetch(url.toString());
      const data = (await res.json()) as { status_code?: string };
      if (data.status_code === 'FINISHED') return;
      if (data.status_code === 'ERROR') {
        throw new PublishError('INSTAGRAM', 'Media container processing failed');
      }
    }
    throw new PublishError('INSTAGRAM', 'Media container timed out');
  }

  // ─── Unified publish entry point ─────────────────────────

  async publish(input: PublishPostInput): Promise<PublishResult> {
    const { platform, token, content, mediaUrls } = input;

    if (platform === 'FACEBOOK') {
      if (mediaUrls?.[0]) {
        return this.publishFacebookPhoto(
          token.platformAccountId,
          token.accessToken,
          content,
          mediaUrls[0],
        );
      }
      return this.publishFacebookPost(token.platformAccountId, token.accessToken, content);
    }

    if (platform === 'INSTAGRAM') {
      if (!mediaUrls?.[0]) {
        throw new PublishError('INSTAGRAM', 'Instagram requires at least one media URL');
      }
      if (mediaUrls.length > 1) {
        return this.publishInstagramCarousel(
          token.platformAccountId,
          token.accessToken,
          content,
          mediaUrls,
        );
      }
      return this.publishInstagramPost(
        token.platformAccountId,
        token.accessToken,
        content,
        mediaUrls[0],
      );
    }

    throw new PublishError(platform, `Platform ${platform} not handled by MetaApiClient`);
  }
}
