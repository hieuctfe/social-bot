# ai-worker

Background AI job worker for Social Bot.

## Responsibilities

- Process AI jobs from the `ai-jobs` BullMQ queue
- Generate captions, hashtags, translations, and other content transforms
- Future: action planning for Telegram-triggered AI workflows

## Job Types

| Job Name | Handler | Status |
|----------|---------|--------|
| `generate-caption` | `generate-caption.handler.ts` | Placeholder |
| `suggest-hashtags` | `suggest-hashtags.handler.ts` | Placeholder |

## Adding a New Job Type

1. Add the payload type to `src/jobs/ai-job.types.ts`
2. Create a handler in `src/jobs/handlers/`
3. Register the handler in `src/worker-runner.ts`

## Environment Variables

```
REDIS_URL=redis://redis:6379
AI_PROVIDER=openai          # openai | anthropic
OPENAI_API_KEY=...
ANTHROPIC_API_KEY=...
```
