import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { defaultLogger } from '@social-bot/observability';
import {
  AI_JOB_QUEUE,
  AiJobData,
  AiJobResult,
  GenerateCaptionPayload,
  SuggestHashtagsPayload,
} from './jobs/ai-job.types';
import { handleGenerateCaption } from './jobs/handlers/generate-caption.handler';
import { handleSuggestHashtags } from './jobs/handlers/suggest-hashtags.handler';
import {
  handleContentGeneration,
  type ContentGenerationPayload,
} from './jobs/handlers/content-generation.handler';

const logger = defaultLogger.child({ service: 'worker-runner' });

export class WorkerRunner {
  private aiWorker: Worker | null = null;
  private contentGenWorker: Worker | null = null;
  private redis: Redis | null = null;

  async start() {
    const redisUrl = process.env['REDIS_URL'] ?? 'redis://redis:6379';
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

    // AI Jobs Worker (captions, hashtags, etc.)
    this.aiWorker = new Worker<AiJobData, AiJobResult>(
      AI_JOB_QUEUE,
      async (job) => {
        logger.info('Processing AI job', { jobId: job.id, name: job.name });

        switch (job.name) {
          case 'generate-caption':
            return handleGenerateCaption(job.data as GenerateCaptionPayload);
          case 'suggest-hashtags':
            return handleSuggestHashtags(job.data as SuggestHashtagsPayload);
          default:
            logger.warn('Unknown AI job type', { name: job.name });
            return { success: false, error: `Unknown job type: ${job.name}` };
        }
      },
      {
        connection: this.redis,
        concurrency: 3,
      },
    );

    this.aiWorker.on('completed', (job) => {
      logger.info('AI job completed', { jobId: job.id });
    });

    this.aiWorker.on('failed', (job, err) => {
      logger.error('AI job failed', { jobId: job?.id, error: String(err) });
    });

    logger.info('AI Worker running', { queue: AI_JOB_QUEUE });

    // Content Generation Worker
    this.contentGenWorker = new Worker<ContentGenerationPayload, AiJobResult>(
      'content-generation',
      async (job) => {
        logger.info('Processing content generation job', {
          jobId: job.id,
          name: job.name,
        });

        return handleContentGeneration(job.data);
      },
      {
        connection: this.redis,
        concurrency: 2,
      },
    );

    this.contentGenWorker.on('completed', (job) => {
      logger.info('Content generation job completed', { jobId: job.id });
    });

    this.contentGenWorker.on('failed', (job, err) => {
      logger.error('Content generation job failed', {
        jobId: job?.id,
        error: String(err),
      });
    });

    logger.info('Content Generation Worker running', { queue: 'content-generation' });
  }

  async stop() {
    await this.aiWorker?.close();
    await this.contentGenWorker?.close();
    await this.redis?.quit();
  }
}
