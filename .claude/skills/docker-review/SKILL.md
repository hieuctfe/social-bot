# Skill: docker-review

## Purpose
Review Dockerfiles and docker-compose files for correctness and portability.

## Checks

### Dockerfile Checks
- [ ] Multi-stage build (deps → builder → runner)
- [ ] Node.js 20+ base image
- [ ] `corepack enable && corepack prepare pnpm@<version> --activate`
- [ ] Non-root user in final stage
- [ ] `--frozen-lockfile` in pnpm install
- [ ] Minimal final image (no dev deps)
- [ ] No secrets in Dockerfile

### Compose Checks
- [ ] All services on same named network
- [ ] Named volumes (not bind mounts) for stateful data
- [ ] `depends_on` with `condition: service_healthy`
- [ ] Healthchecks on postgres and redis
- [ ] env_file: .env (not hardcoded secrets)
- [ ] `restart: unless-stopped` in dev, `restart: always` in prod
- [ ] No S3/MinIO services

### Validation Command
```bash
docker compose -f docker-compose.dev.yml config
```

## Common Issues

- Missing `pnpm-lock.yaml` in COPY context → add `pnpm-lock.yaml*` to COPY
- Prisma not generating → add `prisma generate` to entrypoint or build step
- Upload volume not writable → ensure `RUN mkdir -p /data/uploads && chown` in Dockerfile
