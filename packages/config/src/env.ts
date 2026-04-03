import { z } from 'zod';

const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

export const apiEnvSchema = baseEnvSchema.extend({
  CONTROL_API_PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().default('redis://redis:6379'),
  JWT_SECRET: z.string().min(16),
  JWT_EXPIRES_IN: z.string().default('7d'),
  SESSION_SECRET: z.string().min(16),

  // Storage
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  UPLOAD_ROOT: z.string().default('/data/uploads'),
  PUBLIC_MEDIA_URL: z.string().default('http://localhost:4000/media'),

  // Postiz
  POSTIZ_API_URL: z.string().url(),
  POSTIZ_API_KEY: z.string().min(1),

  // n8n
  N8N_WEBHOOK_URL: z.string().optional(),
  CONTROL_API_WEBHOOK_SECRET: z.string().optional(),

  // AI (placeholder)
  AI_PROVIDER: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const workerEnvSchema = baseEnvSchema.extend({
  AI_WORKER_PORT: z.coerce.number().default(4001),
  REDIS_URL: z.string().default('redis://redis:6379'),
  DATABASE_URL: z.string().min(1),
  AI_PROVIDER: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
});

export const webEnvSchema = baseEnvSchema.extend({
  NEXT_PUBLIC_API_URL: z.string().default('http://localhost:4000'),
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WorkerEnv = z.infer<typeof workerEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;

export function parseEnv<T extends z.ZodTypeAny>(schema: T): z.infer<T> {
  const result = schema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, msgs]) => `  ${key}: ${(msgs as string[]).join(', ')}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${messages}`);
  }
  return result.data as z.infer<T>;
}
