#!/bin/sh
set -e

echo "[entrypoint] Running database migrations..."
npx prisma migrate deploy --schema=/app/prisma/schema.prisma

echo "[entrypoint] Starting control-api..."
exec node dist/main.js
