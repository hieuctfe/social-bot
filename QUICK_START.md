# Social Bot - Quick Start Guide

## Current Status ✅

**Publishing Infrastructure:** COMPLETE
**API Endpoints:** WORKING
**Postiz Integration:** CONFIGURED

**Missing:** OAuth credentials to connect social accounts

---

## Issue: "Invalid app ID" when connecting Facebook

This is **normal for self-hosted Postiz**. You need to provide your own OAuth app credentials.

---

## Solution: 3 Steps to Connect Facebook

### Step 1: Create Facebook App (10 min)

1. Go to https://developers.facebook.com/
2. Click **My Apps** → **Create App**
3. Choose: **Other** → **Business**
4. App Name: "Social Bot Dev"
5. Copy your **App ID** and **App Secret**

### Step 2: Configure OAuth Redirect

1. In your Facebook App, go to **Facebook Login** → **Settings**
2. Add **Valid OAuth Redirect URIs:**
   ```
   http://localhost:3001/integrations/social/facebook/connect/callback
   ```
3. Save Changes

### Step 3: Add Credentials to Social Bot

Edit `.env` file:

```bash
FACEBOOK_APP_ID=your-app-id-here
FACEBOOK_APP_SECRET=your-app-secret-here
INSTAGRAM_APP_ID=your-app-id-here
INSTAGRAM_APP_SECRET=your-app-secret-here
```

Restart Postiz:

```bash
docker compose -f docker-compose.dev.yml restart postiz
```

### Step 4: Connect Facebook in Postiz

1. Open http://localhost:4200
2. Click **Add Channel** → **Facebook**
3. Log in with Facebook
4. Select your Facebook Page
5. Done! ✅

---

## Full OAuth Setup Guide

See: **`docs/POSTIZ_OAUTH_SETUP.md`**

This guide covers:
- Facebook & Instagram
- TikTok
- LinkedIn
- Twitter/X
- YouTube

---

## Testing the Complete Flow (After OAuth Setup)

Once you've connected at least one social account:

```bash
# See full testing guide
cat docs/TESTING_PUBLISH_FLOW.md
```

**Or run the quick test:**

```bash
# 1. Get JWT token
JWT_TOKEN=$(curl -s -X POST http://localhost:4000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@socialbot.local"}' | jq -r '.accessToken')

# 2. Get workspace ID
WORKSPACE_ID=$(curl -s http://localhost:4000/api/v1/workspaces \
  -H "Authorization: Bearer $JWT_TOKEN" | jq -r '.[0].id')

# 3. List Postiz integrations
curl -s http://localhost:4000/api/v1/postiz/integrations \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

# 4. Create social connection (use integration ID from step 3)
curl -s -X POST http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/social-connections \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "FACEBOOK",
    "postizIntegrationId": "YOUR_INTEGRATION_ID_FROM_STEP_3",
    "displayName": "My Facebook Page"
  }' | jq

# 5. Create content draft
DRAFT_ID=$(curl -s -X POST http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/content-drafts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post",
    "body": "Hello from Social Bot! 🚀",
    "platformTargets": ["FACEBOOK"]
  }' | jq -r '.id')

# 6. Quick-schedule (auto-approve + schedule)
curl -s -X POST \
  http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/content-drafts/$DRAFT_ID/quick-schedule \
  -H "Authorization: Bearer $JWT_TOKEN" | jq

# 7. Check Postiz UI - your post is scheduled!
echo "Check http://localhost:4200 for your post"
```

---

## Architecture Overview

```
User → Social Bot API → Postiz → Facebook/Instagram/TikTok

Social Bot (our code):
  - Content draft management
  - Approval workflow
  - Asset uploads
  - Audit logging
  - API gateway

Postiz (self-hosted):
  - OAuth with social platforms
  - Post scheduling
  - Multi-platform publishing
  - Post status tracking
```

---

## All Documentation

| Document | Purpose |
|----------|---------|
| `QUICK_START.md` | This file - getting started |
| `docs/POSTIZ_OAUTH_SETUP.md` | Complete OAuth setup guide for all platforms |
| `docs/TESTING_PUBLISH_FLOW.md` | How to test the complete publishing flow |
| `docs/IMPLEMENTATION_COMPLETE.md` | Technical implementation details |
| `docs/MCP_SETUP_COMPLETE.md` | Initial MCP infrastructure setup |
| `TASKS.md` | Project roadmap and remaining tasks |
| `CLAUDE.md` | Project guidelines and architecture rules |

---

## Swagger API Documentation

**Control API:** http://localhost:4000/api/v1/docs

All endpoints documented with request/response examples.

---

## Common Issues

### "Invalid app ID"
→ Need to create Facebook App and add credentials to `.env`
→ See: `docs/POSTIZ_OAUTH_SETUP.md`

### "Redirect URI mismatch"
→ Add redirect URI in Facebook App settings:
→ `http://localhost:3001/integrations/social/facebook/connect/callback`

### Can't connect Instagram
→ Need Instagram Business account
→ Connect to Facebook Page first
→ Use same credentials as Facebook

### Postiz shows empty integrations
→ Haven't connected any accounts yet
→ Follow OAuth setup guide first

---

## Next Steps

1. **Connect social accounts** (10-15 min)
   - Follow `docs/POSTIZ_OAUTH_SETUP.md`
   - Start with Facebook (easiest)

2. **Test the flow** (5 min)
   - Create draft
   - Quick-schedule
   - Verify in Postiz UI

3. **Build dashboard UI** (optional, 4-6 hours)
   - React pages for drafts
   - Approval queue
   - Publish monitoring

---

## Need Help?

- **Facebook App Setup:** https://developers.facebook.com/docs/development/create-an-app
- **Postiz Docs:** https://docs.postiz.com/
- **Issues:** Check `docs/POSTIZ_OAUTH_SETUP.md` troubleshooting section

---

## Summary

✅ **Infrastructure:** Complete and running
✅ **API:** All endpoints working
✅ **Database:** Seeded with test data
✅ **Postiz:** Integrated and configured

⚠️ **Action Required:** Set up OAuth credentials to connect social accounts

**Estimated time:** 10-15 minutes for Facebook

After that, you're ready to publish! 🚀
