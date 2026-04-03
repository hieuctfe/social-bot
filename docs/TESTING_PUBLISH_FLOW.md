# Testing the Complete Publish Flow

This guide will walk you through posting content to Facebook, Instagram, or TikTok using the Social Bot API.

---

## Prerequisites

1. **Postiz is running** at http://localhost:4200
2. **Control API is running** at http://localhost:4000
3. **You have connected at least one social account** in Postiz UI

---

## Step 0: Connect Social Accounts (One-Time Setup)

1. Open Postiz UI: http://localhost:4200
2. Navigate to **Channels** or **Integrations**
3. Click **Add Channel** and connect:
   - Facebook Page
   - Instagram Business Account
   - TikTok
   - (or any other supported platform)
4. Complete the OAuth flow for each platform
5. Note the **Integration IDs** (you'll need these)

---

## Step 1: Get JWT Token

```bash
# Sign in to get access token
curl -X POST http://localhost:4000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@socialbot.local"}' \
  | jq -r '.accessToken'
```

**Save this token** as `JWT_TOKEN` for subsequent requests.

---

## Step 2: Get Workspace ID

```bash
# Get workspaces (returns Main workspace)
curl http://localhost:4000/api/v1/workspaces \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq
```

**Save the workspace ID** as `WORKSPACE_ID` (e.g., `cmnigh39v000211fr0uvwigx5`).

---

## Step 3: Get Postiz Integration IDs

```bash
# List all connected social accounts in Postiz
curl http://localhost:4000/api/v1/postiz/integrations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq
```

You'll get something like:
```json
{
  "count": 2,
  "integrations": [
    {
      "id": "abc123",
      "name": "My Facebook Page",
      "identifier": "facebook",
      "picture": "https://...",
      "disabled": false
    },
    {
      "id": "xyz789",
      "name": "My Instagram",
      "identifier": "instagram",
      "picture": "https://...",
      "disabled": false
    }
  ]
}
```

**Note the integration IDs** for the platforms you want to post to.

---

## Step 4: Create Social Connections

Link Postiz integrations to your workspace:

```bash
# Create Facebook connection
curl -X POST http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/social-connections \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "FACEBOOK",
    "postizIntegrationId": "abc123",
    "displayName": "My Facebook Page"
  }'

# Create Instagram connection
curl -X POST http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/social-connections \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "INSTAGRAM",
    "postizIntegrationId": "xyz789",
    "displayName": "My Instagram Account"
  }'
```

**Save the social connection IDs** returned.

---

## Step 5: Create a Content Draft

```bash
# Create a new draft
DRAFT_RESPONSE=$(curl -X POST http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/content-drafts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Post from Social Bot",
    "body": "Hello from Social Bot! This is a test post. 🚀 #SocialBot #Testing",
    "platformTargets": ["FACEBOOK", "INSTAGRAM"]
  }')

echo $DRAFT_RESPONSE | jq

# Extract draft ID
DRAFT_ID=$(echo $DRAFT_RESPONSE | jq -r '.id')
echo "Draft ID: $DRAFT_ID"
```

---

## Step 6: Quick Schedule (Auto-Approve + Schedule)

```bash
# Quick schedule - bypasses approval flow for testing
curl -X POST http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/content-drafts/$DRAFT_ID/quick-schedule \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq
```

**Expected Response:**
```json
{
  "id": "...",
  "workspaceId": "...",
  "createdById": "...",
  "title": "Test Post from Social Bot",
  "body": "Hello from Social Bot! This is a test post. 🚀 #SocialBot #Testing",
  "status": "SCHEDULED",
  "platformTargets": ["FACEBOOK", "INSTAGRAM"],
  "scheduledAt": "2026-04-03T05:45:00.000Z",
  "publishedAt": null,
  "metadata": {},
  "createdAt": "2026-04-03T05:40:00.000Z",
  "updatedAt": "2026-04-03T05:45:00.000Z"
}
```

---

## Step 7: Verify Post in Postiz

1. Open Postiz UI: http://localhost:4200
2. Navigate to **Posts** or **Calendar**
3. You should see your post scheduled
4. Postiz will publish it at the scheduled time (or immediately if no scheduledAt was provided)

---

## Alternative: Full Approval Flow

If you want to test the complete approval workflow:

```bash
# 1. Create draft (same as Step 5)
DRAFT_ID="..."

# 2. Submit for approval
APPROVAL_RESPONSE=$(curl -X POST \
  http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/content-drafts/$DRAFT_ID/submit-for-approval \
  -H "Authorization: Bearer $JWT_TOKEN")

APPROVAL_ID=$(echo $APPROVAL_RESPONSE | jq -r '.approvalRequests[0].id')

# 3. List pending approvals
curl http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/approvals/pending \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq

# 4. Approve the request
curl -X POST http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/approvals/$APPROVAL_ID/review \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "APPROVED",
    "notes": "Looks good!"
  }' | jq

# 5. Schedule the approved draft
curl -X POST \
  http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/content-drafts/$DRAFT_ID/schedule \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq
```

---

## Complete Shell Script

Save this as `test-publish.sh`:

```bash
#!/bin/bash
set -e

# Configuration
API_URL="http://localhost:4000/api/v1"
ADMIN_EMAIL="admin@socialbot.local"

echo "🔐 Step 1: Getting JWT token..."
JWT_TOKEN=$(curl -s -X POST $API_URL/auth/sign-in \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\"}" \
  | jq -r '.accessToken')

echo "Token: $JWT_TOKEN"

echo "\n📁 Step 2: Getting workspace..."
WORKSPACE_ID=$(curl -s $API_URL/workspaces \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq -r '.[0].id')

echo "Workspace ID: $WORKSPACE_ID"

echo "\n🔗 Step 3: Listing Postiz integrations..."
curl -s $API_URL/postiz/integrations \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq

echo "\n📝 Step 4: Creating content draft..."
DRAFT_RESPONSE=$(curl -s -X POST $API_URL/workspaces/$WORKSPACE_ID/content-drafts \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Automated Test Post",
    "body": "This post was created by the Social Bot test script! 🤖 #Automation #Testing",
    "platformTargets": ["FACEBOOK", "INSTAGRAM"]
  }')

DRAFT_ID=$(echo $DRAFT_RESPONSE | jq -r '.id')
echo "Draft created: $DRAFT_ID"

echo "\n🚀 Step 5: Quick-scheduling draft..."
curl -s -X POST $API_URL/workspaces/$WORKSPACE_ID/content-drafts/$DRAFT_ID/quick-schedule \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq

echo "\n✅ Done! Check Postiz UI at http://localhost:4200"
```

Make it executable:
```bash
chmod +x test-publish.sh
./test-publish.sh
```

---

## Troubleshooting

### Error: "No active social connections found"

**Solution:** Create social connections first (Step 4).

```bash
# List existing connections
curl http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/social-connections \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq
```

### Error: "Cannot schedule draft with status DRAFT"

**Solution:** Use the `/quick-schedule` endpoint instead of `/schedule`.

### Post not appearing in Postiz

**Possible causes:**
1. Social connection not properly linked
2. Postiz integration disabled or refresh needed
3. Check Postiz logs: `docker compose -f docker-compose.dev.yml logs postiz --tail=50`

### Check Postiz Post Status

```bash
# Get draft details (includes PublishTarget records)
curl http://localhost:4000/api/v1/workspaces/$WORKSPACE_ID/content-drafts/$DRAFT_ID \
  -H "Authorization: Bearer $JWT_TOKEN" \
  | jq '.publishTargets'
```

---

## API Swagger Documentation

Full API documentation available at:
- **Swagger UI:** http://localhost:4000/api/v1/docs
- **OpenAPI JSON:** http://localhost:4000/api/v1/docs-json

---

## Next Steps

- **Add media assets:** Use `/workspaces/{wsId}/assets/upload` to upload images/videos
- **Schedule for later:** Include `"scheduledAt": "2026-04-04T12:00:00Z"` in the draft
- **Monitor publish status:** Check `PublishTarget` records for real-time status
- **Build frontend UI:** Create React pages for drafts, approvals, and publishing queue

The complete publishing infrastructure is now operational! 🎉
