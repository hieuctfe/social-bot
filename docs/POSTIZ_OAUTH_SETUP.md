# Postiz OAuth Setup Guide

**Problem:** "Invalid app ID" error when trying to connect Facebook/Instagram/TikTok in Postiz UI

**Solution:** Configure OAuth app credentials for each social platform

---

## Why This Is Required

Postiz is self-hosted, which means **you need to provide your own OAuth app credentials** for each social platform. This is different from the hosted version of Postiz where they provide the credentials.

Each social platform requires:
- **App ID** (or Client ID)
- **App Secret** (or Client Secret)
- **Redirect URI** (callback URL after OAuth)

---

## Quick Start: Facebook Setup

### Step 1: Create Facebook App

1. Go to **Facebook Developers**: https://developers.facebook.com/
2. Click **My Apps** → **Create App**
3. Select use case: **Other** → **Business** → **Next**
4. App details:
   - **App Name:** "Social Bot Local Dev" (or your choice)
   - **App Contact Email:** your email
   - Click **Create App**
5. On the dashboard, find your **App ID** and **App Secret**

### Step 2: Configure Facebook Login Product

1. In your app dashboard, click **Add Product**
2. Find **Facebook Login** → Click **Set Up**
3. Select **Web** platform
4. **Site URL:** `http://localhost:4200`
5. Save and continue

### Step 3: Configure OAuth Redirect URIs

1. Go to **Facebook Login** → **Settings**
2. **Valid OAuth Redirect URIs:**
   ```
   http://localhost:3001/integrations/social/facebook/connect/callback
   http://localhost:4200/integrations/social/facebook/connect/callback
   ```
3. Save Changes

### Step 4: Add Required Permissions

1. Go to **App Settings** → **Basic**
2. Scroll to **App Domains**
3. Add: `localhost`
4. Save

### Step 5: Make App Live (Development Mode)

For local testing, you can keep the app in **Development Mode**.
- Development mode allows you and your Facebook account to test
- To add other testers: **Roles** → **Add Testers**

---

## Step 6: Add Credentials to Postiz

### Option A: Environment Variables in docker-compose.yml

Edit `docker-compose.dev.yml`:

```yaml
postiz:
  image: ghcr.io/gitroomhq/postiz-app:latest
  environment:
    # ... existing vars ...

    # Facebook
    FACEBOOK_APP_ID: "YOUR_FACEBOOK_APP_ID"
    FACEBOOK_APP_SECRET: "YOUR_FACEBOOK_APP_SECRET"

    # Instagram (uses same Facebook app)
    INSTAGRAM_APP_ID: "YOUR_FACEBOOK_APP_ID"
    INSTAGRAM_APP_SECRET: "YOUR_FACEBOOK_APP_SECRET"
```

### Option B: Using .env File (Recommended)

Add to your `.env` file:

```bash
# ─── Postiz OAuth Credentials ───────────────────────────
# Facebook & Instagram (use same Facebook App)
FACEBOOK_APP_ID=your-facebook-app-id-here
FACEBOOK_APP_SECRET=your-facebook-app-secret-here
INSTAGRAM_APP_ID=your-facebook-app-id-here
INSTAGRAM_APP_SECRET=your-facebook-app-secret-here

# TikTok
TIKTOK_CLIENT_KEY=your-tiktok-client-key-here
TIKTOK_CLIENT_SECRET=your-tiktok-client-secret-here

# LinkedIn
LINKEDIN_CLIENT_ID=your-linkedin-client-id-here
LINKEDIN_CLIENT_SECRET=your-linkedin-client-secret-here

# Twitter/X
TWITTER_CLIENT_ID=your-twitter-client-id-here
TWITTER_CLIENT_SECRET=your-twitter-client-secret-here

# YouTube
YOUTUBE_CLIENT_ID=your-youtube-client-id-here
YOUTUBE_CLIENT_SECRET=your-youtube-client-secret-here
```

Then update docker-compose.yml to use env vars:

```yaml
postiz:
  environment:
    # Facebook
    FACEBOOK_APP_ID: ${FACEBOOK_APP_ID}
    FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET}
    # Instagram (same as Facebook)
    INSTAGRAM_APP_ID: ${INSTAGRAM_APP_ID}
    INSTAGRAM_APP_SECRET: ${INSTAGRAM_APP_SECRET}
    # Add others as needed
```

### Step 7: Restart Postiz

```bash
docker compose -f docker-compose.dev.yml down postiz
docker compose -f docker-compose.dev.yml up -d postiz
```

Wait 10-15 seconds for Postiz to fully start.

### Step 8: Test Facebook Connection

1. Open Postiz UI: http://localhost:4200
2. Click **Add Channel**
3. Select **Facebook**
4. You should now see the Facebook OAuth login page
5. Log in with your Facebook account
6. Select a Facebook Page to connect
7. Done! ✅

---

## Setting Up Other Platforms

### Instagram (Business Account Required)

**Prerequisites:**
- Instagram Business or Creator account
- Connected to a Facebook Page

**Setup:**
1. Use the **same Facebook App** you created above
2. In Facebook App → **Products** → Add **Instagram Basic Display**
3. Configure redirect URIs:
   ```
   http://localhost:3001/integrations/social/instagram/connect/callback
   ```
4. Use same `FACEBOOK_APP_ID` and `FACEBOOK_APP_SECRET` as Instagram credentials
5. Connect via Postiz → will ask you to select Instagram account linked to your Facebook Page

---

### TikTok

1. Go to **TikTok Developers**: https://developers.tiktok.com/
2. Create an app
3. Add **Login Kit** product
4. Configure redirect URI:
   ```
   http://localhost:3001/integrations/social/tiktok/connect/callback
   ```
5. Get **Client Key** and **Client Secret**
6. Add to `.env`:
   ```
   TIKTOK_CLIENT_KEY=your-client-key
   TIKTOK_CLIENT_SECRET=your-client-secret
   ```

---

### LinkedIn

1. Go to **LinkedIn Developers**: https://www.linkedin.com/developers/
2. Create an app
3. Add **Sign In with LinkedIn** product
4. Configure redirect URI:
   ```
   http://localhost:3001/integrations/social/linkedin/connect/callback
   ```
5. Get **Client ID** and **Client Secret**
6. Add to `.env`:
   ```
   LINKEDIN_CLIENT_ID=your-client-id
   LINKEDIN_CLIENT_SECRET=your-client-secret
   ```

---

### Twitter/X

1. Go to **Twitter Developer Portal**: https://developer.twitter.com/
2. Create a project and app (requires Twitter Developer Account - may need to apply)
3. Enable **OAuth 2.0**
4. Configure redirect URI:
   ```
   http://localhost:3001/integrations/social/twitter/connect/callback
   ```
5. Get **Client ID** and **Client Secret**
6. Add to `.env`:
   ```
   TWITTER_CLIENT_ID=your-client-id
   TWITTER_CLIENT_SECRET=your-client-secret
   ```

---

### YouTube

1. Go to **Google Cloud Console**: https://console.cloud.google.com/
2. Create a new project
3. Enable **YouTube Data API v3**
4. Create OAuth 2.0 credentials (Web application)
5. Configure redirect URIs:
   ```
   http://localhost:3001/integrations/social/youtube/connect/callback
   ```
6. Get **Client ID** and **Client Secret**
7. Add to `.env`:
   ```
   YOUTUBE_CLIENT_ID=your-client-id
   YOUTUBE_CLIENT_SECRET=your-client-secret
   ```

---

## Complete Environment Variables Reference

Here's the complete list of Postiz OAuth environment variables:

```bash
# Facebook & Instagram (same app)
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=

# TikTok
TIKTOK_CLIENT_KEY=
TIKTOK_CLIENT_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Twitter/X
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=

# YouTube
YOUTUBE_CLIENT_ID=
YOUTUBE_CLIENT_SECRET=

# Pinterest
PINTEREST_CLIENT_ID=
PINTEREST_CLIENT_SECRET=

# Threads (Meta)
THREADS_APP_ID=
THREADS_APP_SECRET=

# Reddit
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=

# Mastodon (self-hosted, no OAuth app needed)
# Configure per-instance
```

---

## Troubleshooting

### "Invalid app ID" Error

**Cause:** No OAuth credentials configured for that platform

**Solution:**
1. Create app in platform's developer portal
2. Add credentials to `.env`
3. Update `docker-compose.dev.yml` to pass env vars
4. Restart Postiz: `docker compose -f docker-compose.dev.yml restart postiz`

---

### "Redirect URI mismatch" Error

**Cause:** OAuth redirect URI not whitelisted in app settings

**Solution:**
1. Go to your app settings in the platform's developer portal
2. Add the redirect URI:
   ```
   http://localhost:3001/integrations/social/{platform}/connect/callback
   ```
3. Save and try again

---

### Facebook App in Development Mode

**Limitation:** Only you and added testers can connect accounts

**To go live:**
1. Complete Facebook App Review process
2. Add required permissions (pages_manage_posts, instagram_basic, etc.)
3. Submit for review
4. **For local development:** Stay in dev mode, it works fine!

---

### Can't Connect Instagram

**Common issues:**
1. **Not a Business Account** → Convert to Business/Creator in Instagram app
2. **Not connected to Facebook Page** → Link in Instagram settings
3. **Wrong credentials** → Use same FACEBOOK_APP_ID as INSTAGRAM_APP_ID

---

## Testing Without Real OAuth Apps (Development)

If you just want to test the **Social Bot API flow** without actually posting to real social platforms:

1. Create a **mock social connection** directly in the database:
   ```bash
   # Connect to database
   docker exec -it social-bot-postgres-1 psql -U socialbot -d socialbot

   # Insert mock connection
   INSERT INTO social_connections (
     id, workspace_id, provider, postiz_integration_id,
     display_name, status, created_at, updated_at
   ) VALUES (
     gen_random_uuid(),
     'YOUR_WORKSPACE_ID',
     'FACEBOOK',
     'mock-integration-123',
     'Mock Facebook Page',
     'ACTIVE',
     NOW(),
     NOW()
   );
   ```

2. **Limitation:** This will fail when actually trying to schedule to Postiz (since the integration doesn't exist in Postiz)

3. **Best for:** Testing the Social Bot API endpoints without OAuth setup

---

## Quick Summary

**Minimum setup to test Facebook:**
1. Create Facebook App at https://developers.facebook.com/
2. Get App ID + App Secret
3. Add to `.env`:
   ```
   FACEBOOK_APP_ID=123456789
   FACEBOOK_APP_SECRET=abcdef123456
   ```
4. Update docker-compose.yml to pass these vars
5. Restart Postiz
6. Connect Facebook Page in Postiz UI

**Time required:** 10-15 minutes

**Cost:** FREE (all developer accounts are free)

---

## Need Help?

- **Postiz Docs:** https://docs.postiz.com/providers
- **Facebook App Setup:** https://developers.facebook.com/docs/development/create-an-app
- **Common Issues:** https://github.com/gitroomhq/postiz-app/issues

---

## Next Steps

Once you've connected at least one social account:
1. Get the integration ID via `GET /api/v1/postiz/integrations`
2. Create a SocialConnection via our API
3. Create a ContentDraft and schedule it
4. See your post appear on Facebook! 🎉

**Full testing guide:** `docs/TESTING_PUBLISH_FLOW.md`
