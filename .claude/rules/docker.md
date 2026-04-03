# Docker Rules

## Compose

- Dev: `docker compose -f docker-compose.dev.yml up`
- Prod: `docker compose -f docker-compose.dev.yml -f docker-compose.prod.yml up -d`
- Always use named networks (`social-bot-net`)
- Always use named volumes (not bind mounts) for persistent data
- Validate before running: `docker compose -f docker-compose.dev.yml config`

## Volumes

| Volume | Service | Purpose |
|--------|---------|---------|
| `postgres-data` | postgres | Database persistence |
| `uploads-data` | control-api | Local file uploads |
| `n8n-data` | n8n | n8n workflows and credentials |
| `postiz-data` | postiz | Postiz media uploads |

## No S3

- Do NOT add MinIO, LocalStack, or any S3-compatible service
- Uploads are local filesystem only in this phase
- Storage abstraction is in control-api/src/modules/storage/

## Env Vars

- All secrets via `.env` file → `env_file: .env` in compose
- No hardcoded secrets in Dockerfiles or compose files
- Service names must match what env vars expect (e.g., `postgres`, `redis`, `postiz`, `n8n`)
