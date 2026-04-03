# Deployment Guide

This guide covers deploying Social Bot to a new computer or server.

---

## Prerequisites

- Docker Desktop (Mac/Windows) or Docker Engine + Compose v2 (Linux)
- Node.js 20+
- pnpm 9.x (`npm i -g pnpm@9`)
- **ngrok** or public domain (required for Facebook/Instagram media uploads)

---

## Step 1: Clone and Install

```bash
# Clone repository
git clone <your-repo-url> social-bot
cd social-bot

# Install dependencies
pnpm install

# Generate Prisma client
pnpm db:generate
```

---

## Step 2: Environment Configuration

```bash
# Copy example env file
cp .env.example .env
```

Edit `.env` and configure:

### Required Variables

```bash
# ─── JWT & Security ───────────────────────────
JWT_SECRET=<generate-random-secret-here>

# ─── Database ────────────────────────────────
POSTGRES_USER=socialbot
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=socialbot
DATABASE_URL=postgresql://socialbot:<password>@localhost:5432/socialbot

# ─── Redis ───────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Postiz ─────────────────────────────────
# After first setup, get API key from Postiz UI
POSTIZ_API_KEY=<will-set-after-first-boot>
POSTIZ_BASE_URL=http://postiz:3000

# ─── Postiz OAuth Apps (See POSTIZ_OAUTH_SETUP.md) ──
FACEBOOK_APP_ID=<your-facebook-app-id>
FACEBOOK_APP_SECRET=<your-facebook-app-secret>
INSTAGRAM_APP_ID=<your-facebook-app-id>
INSTAGRAM_APP_SECRET=<your-facebook-app-secret>
```

---

## Step 3: Start Services

```bash
# Start all services
docker compose -f docker-compose.dev.yml up -d

# Wait ~60 seconds for Temporal to initialize
# Watch logs
docker compose -f docker-compose.dev.yml logs -f
```

Verify all services are healthy:
```bash
docker compose -f docker-compose.dev.yml ps
```

All services should show status `Up` and `healthy`.

---

## Step 4: Initialize Database

```bash
# Run migrations
DATABASE_URL=postgresql://socialbot:socialbot@localhost:5432/socialbot pnpm db:migrate

# Seed database with default data
DATABASE_URL=postgresql://socialbot:socialbot@localhost:5432/socialbot pnpm db:seed
```

This creates:
- Organization: "Social Bot"
- Workspace: "Main"
- Admin user: `admin@socialbot.local`

---

## Step 5: Configure Postiz

### 5.1 Generate Postiz API Key

1. Open **http://localhost:4200**
2. Register first account (becomes admin)
3. Go to **Settings → API Keys**
4. Click **Generate API Key**
5. Copy the key
6. Update `.env`:
   ```bash
   POSTIZ_API_KEY=<your-generated-key>
   ```
7. Restart control-api:
   ```bash
   docker compose -f docker-compose.dev.yml restart control-api
   ```

### 5.2 Connect Social Channels

Follow the guide in `docs/POSTIZ_OAUTH_SETUP.md` to:
1. Create Facebook/Instagram/TikTok OAuth apps
2. Add app credentials to `.env`
3. Restart Postiz
4. Connect social accounts in Postiz UI

---

## Step 6: Setup ngrok (Required for Facebook Media Posts)

Facebook cannot access `localhost` URLs to download media. You need either:
- **ngrok tunnel** (easiest for testing)
- **Public domain** (for production)

### Option A: ngrok Setup

1. Install ngrok:
   ```bash
   # Mac
   brew install ngrok

   # Or download from https://ngrok.com/download
   ```

2. Sign up at https://ngrok.com and get auth token

3. Configure ngrok:
   ```bash
   ngrok config add-authtoken <your-token>
   ```

4. Start ngrok tunnel:
   ```bash
   ngrok http 4200
   ```

5. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.app`)

6. Update `.env` with ngrok URL:
   ```bash
   MAIN_URL=https://abc123.ngrok-free.app
   FRONTEND_URL=https://abc123.ngrok-free.app
   NEXT_PUBLIC_BACKEND_URL=https://abc123.ngrok-free.app/api
   NEXT_PUBLIC_UPLOAD_STATIC_DIRECTORY=https://abc123.ngrok-free.app
   ```

7. Rebuild and restart Postiz (required for NEXT_PUBLIC_ vars):
   ```bash
   docker compose -f docker-compose.dev.yml up -d --build postiz
   ```

8. Update Facebook App redirect URIs to include ngrok URL:
   - `https://abc123.ngrok-free.app/integrations/social/facebook/connect/callback`

### Option B: Public Domain Setup

If you have a public server with a domain:

1. Configure reverse proxy (nginx/caddy) to handle SSL
2. Point domain to server IP
3. Update `.env` with your domain
4. Restart services

---

## Step 7: Test the Setup

```bash
# Get JWT token
TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@socialbot.local"}' \
  | jq -r '.accessToken')

# Get workspace ID
WORKSPACE_ID=$(curl -s http://localhost:4000/api/v1/workspaces \
  -H "Authorization: Bearer $TOKEN" \
  | jq -r '.[0].id')

# Test Postiz connectivity
curl http://localhost:4000/api/v1/postiz/health \
  -H "Authorization: Bearer $TOKEN"

# Should return: {"status": "connected"}
```

---

## Accessing Services

| URL | Service | Credentials |
|-----|---------|-------------|
| http://localhost:3000 | Dashboard Web | JWT token from API |
| http://localhost:4000/api/v1/docs | Control API (Swagger) | - |
| http://localhost:4200 | Postiz UI | Register on first access |
| http://localhost:5678 | n8n | Default: admin/changeme |

---

## Data Migration

If migrating from another installation:

### Export Data

```bash
# Export PostgreSQL database
docker exec social-bot-postgres-1 pg_dump -U socialbot socialbot > backup.sql

# Export uploads volume
docker run --rm -v social-bot_uploads-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads.tar.gz -C /data .
```

### Import Data

```bash
# Import database
cat backup.sql | docker exec -i social-bot-postgres-1 psql -U socialbot socialbot

# Import uploads
docker run --rm -v social-bot_uploads-data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/uploads.tar.gz -C /data
```

---

## Production Checklist

Before deploying to production:

- [ ] Use strong passwords in `.env`
- [ ] Configure SSL/TLS (reverse proxy)
- [ ] Set up automated database backups
- [ ] Configure proper logging (not just console)
- [ ] Set up monitoring (health checks, alerts)
- [ ] Review and remove `/quick-schedule` endpoint
- [ ] Implement proper OAuth for dashboard login
- [ ] Configure CORS properly
- [ ] Set up rate limiting
- [ ] Review all environment variables
- [ ] Test disaster recovery process
- [ ] Document runbook for ops team

---

## Troubleshooting

### Services won't start

Check logs:
```bash
docker compose -f docker-compose.dev.yml logs <service-name>
```

### Postiz can't connect to Temporal

Temporal takes ~60s on first boot. Wait for it to be healthy:
```bash
docker compose -f docker-compose.dev.yml ps temporal
```

### Facebook media uploads fail

You need ngrok or public domain. Localhost URLs cannot be accessed by Facebook's servers.

### Port conflicts

Check if ports are already in use:
```bash
lsof -i :3000  # Dashboard
lsof -i :4000  # API
lsof -i :4200  # Postiz
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
```

---

## Updating

```bash
# Pull latest code
git pull

# Install new dependencies
pnpm install

# Regenerate Prisma client if schema changed
pnpm db:generate

# Run new migrations
DATABASE_URL=postgresql://socialbot:socialbot@localhost:5432/socialbot pnpm db:migrate

# Rebuild and restart services
docker compose -f docker-compose.dev.yml up -d --build
```

---

## Support

- Architecture: `docs/architecture.md`
- Infrastructure: `docs/infra-setup.md`
- OAuth Setup: `docs/POSTIZ_OAUTH_SETUP.md`
- Facebook Issues: `docs/FACEBOOK_PERMISSIONS_FIX.md`
