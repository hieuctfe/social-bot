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

const logger = defaultLogger.child({ service: 'worker-runner' });

export class WorkerRunner {
  private worker: Worker | null = null;
  private redis: Redis | null = null;

  async start() {
    const redisUrl = process.env['REDIS_URL'] ?? 'redis://redis:6379';
    this.redis = new Redis(redisUrl, { maxRetriesPerRequest: null });

    this.worker = new Worker<AiJobData, AiJobResult>(
      AI_JOB_QUEUE,
      async (job) => {
        logger.info('Processing job', { jobId: job.id, name: job.name });

        switch (job.name) {
          case 'generate-caption':
            return handleGenerateCaption(job.data as GenerateCaptionPayload);
          case 'suggest-hashtags':
            return handleSuggestHashtags(job.data as SuggestHashtagsPayload);
          default:
            logger.warn('Unknown job type', { name: job.name });
            return { success: false, error: `Unknown job type: ${job.name}` };
        }
      },
      {
        connection: this.redis,
        concurrency: 3,
      },
    );

    this.worker.on('completed', (job) => {
      logger.info('Job completed', { jobId: job.id });
    });

    this.worker.on('failed', (job, err) => {
      logger.error('Job failed', { jobId: job?.id, error: String(err) });
    });

    logger.info('Worker running', { queue: AI_JOB_QUEUE });
  }

  async stop() {
    await this.worker?.close();
    await this.redis?.quit();
  }
}
