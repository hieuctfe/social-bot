import {
  PostizClientConfig,
  PostizCreatePostResponseSchema,
  PostizIntegration,
  PostizIntegrationSchema,
  PostizPost,
  PostizPostSchema,
  PostizSchedulePostInput,
  PostizUploadMediaResult,
  PostizUploadMediaResultSchema,
} from './types';
import { PostizAuthError, PostizError, PostizNotFoundError } from './errors';

export class PostizClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly maxRetries: number;
  private readonly timeoutMs: number;

  constructor(config: PostizClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.maxRetries = config.maxRetries ?? 3;
    this.timeoutMs = config.timeoutMs ?? 30_000;
  }

  // ─── Factory ──────────────────────────────────────────────

  static fromEnv(): PostizClient {
    const apiUrl = process.env['POSTIZ_API_URL'];
    const apiKey = process.env['POSTIZ_API_KEY'];
    if (!apiUrl || !apiKey) {
      throw new Error('POSTIZ_API_URL and POSTIZ_API_KEY must be set');
    }
    return new PostizClient({ apiUrl, apiKey });
  }

  // ─── Integrations (Postiz term for social channel connections) ─

  async listIntegrations(): Promise<PostizIntegration[]> {
    const data = await this.request<unknown[]>('GET', '/integrations');
    return data.map((item) => PostizIntegrationSchema.parse(item));
  }

  async getIntegration(integrationId: string): Promise<PostizIntegration> {
    const data = await this.request<unknown>('GET', `/integrations/${integrationId}`);
    return PostizIntegrationSchema.parse(data);
  }

  // ─── Posts / Scheduling ───────────────────────────────────

  async schedulePost(input: PostizSchedulePostInput): Promise<PostizPost> {
    // Transform our input format to Postiz API format
    const postizPayload = {
      type: input.scheduledAt ? 'schedule' : 'now',
      date: input.scheduledAt || new Date().toISOString(),
      shortLink: false,
      tags: [],
      posts: input.integrationIds.map((integrationId) => ({
        integration: {
          id: integrationId,
        },
        value: [
          {
            content: input.content,
            image: input.mediaIds?.map((id) => ({ id, path: '' })) || [],
          },
        ],
        settings: input.settings || {},
      })),
    };

    const data = await this.request<unknown>('POST', '/posts', postizPayload);

    // Postiz returns an array of {postId, integration} for each post created
    if (!Array.isArray(data) || data.length === 0) {
      throw new PostizError('Postiz returned invalid response', 500, 'Expected array of posts');
    }

    // Parse the first response item
    const firstPost = PostizCreatePostResponseSchema.parse(data[0]);

    // Convert to PostizPost format for backwards compatibility
    // Status is unknown at this point - would need a follow-up GET to retrieve
    return {
      id: firstPost.postId,
      status: 'scheduled', // Assume scheduled for now
      scheduledAt: input.scheduledAt,
      publishedAt: undefined,
      content: input.content,
    };
  }

  async getPost(postId: string): Promise<PostizPost> {
    const data = await this.request<unknown>('GET', `/posts/${postId}`);
    return PostizPostSchema.parse(data);
  }

  async cancelPost(postId: string): Promise<void> {
    await this.request('DELETE', `/posts/${postId}`);
  }

  // ─── Media ────────────────────────────────────────────────

  async uploadMedia(
    fileBuffer: Buffer,
    filename: string,
    mimeType: string,
  ): Promise<PostizUploadMediaResult> {
    // FormData-based upload
    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: mimeType });
    formData.append('file', blob, filename);

    const response = await this.fetchWithRetry(`${this.apiUrl}/media`, {
      method: 'POST',
      headers: {
        Authorization: this.apiKey,
      },
      body: formData,
    });

    const data = (await response.json()) as unknown;
    return PostizUploadMediaResultSchema.parse(data);
  }

  // ─── Analytics (placeholder) ─────────────────────────────

  async getPostAnalytics(postId: string): Promise<Record<string, unknown>> {
    // TODO: implement when Postiz analytics endpoint is confirmed
    const data = await this.request<Record<string, unknown>>('GET', `/posts/${postId}/analytics`);
    return data;
  }

  // ─── Internal ────────────────────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: this.apiKey,
    };

    const response = await this.fetchWithRetry(`${this.apiUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    return response.json() as Promise<T>;
  }

  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    attempt = 1,
  ): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, { ...options, signal: controller.signal });

      if (response.status === 401) throw new PostizAuthError();
      if (response.status === 404) throw new PostizNotFoundError(url);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        if (attempt < this.maxRetries && response.status >= 500) {
          await this.sleep(attempt * 500);
          return this.fetchWithRetry(url, options, attempt + 1);
        }
        throw new PostizError(`Postiz API error ${response.status}`, response.status, body);
      }

      return response;
    } finally {
      clearTimeout(timer);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
