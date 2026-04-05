import { config } from 'dotenv';
// Load .env.local first (local overrides), then .env
config({ path: '.env.local' });
config({ path: '.env' });

import { WorkerRunner } from './worker-runner';
import { defaultLogger } from '@social-bot/observability';

const logger = defaultLogger.child({ service: 'ai-worker' });

async function main() {
  logger.info('Starting ai-worker');
  const runner = new WorkerRunner();
  await runner.start();

  process.on('SIGTERM', async () => {
    logger.info('SIGTERM received — shutting down');
    await runner.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.info('SIGINT received — shutting down');
    await runner.stop();
    process.exit(0);
  });
}

main().catch((err) => {
  logger.error('Fatal error in ai-worker', { error: String(err) });
  process.exit(1);
});
