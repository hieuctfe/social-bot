import { Injectable, OnModuleInit } from '@nestjs/common';
import { PostizClient } from '@social-bot/postiz-client';
import type { PostizSchedulePostInput } from '@social-bot/postiz-client';

/**
 * PostizService is the ONLY place in control-api that speaks to Postiz.
 * All publish paths must go through this service.
 */
@Injectable()
export class PostizService implements OnModuleInit {
  private client!: PostizClient;

  onModuleInit() {
    this.client = new PostizClient({
      apiUrl: process.env['POSTIZ_API_URL'] ?? '',
      apiKey: process.env['POSTIZ_API_KEY'] ?? '',
    });
  }

  async listIntegrations() {
    return this.client.listIntegrations();
  }

  async schedulePost(input: PostizSchedulePostInput) {
    return this.client.schedulePost(input);
  }

  async getPost(postId: string) {
    return this.client.getPost(postId);
  }

  async uploadMedia(buffer: Buffer, filename: string, mimeType: string) {
    return this.client.uploadMedia(buffer, filename, mimeType);
  }
}
