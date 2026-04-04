# n8n Automation Workflows - Social Bot

## Overview

3 main workflows for 100% autonomous operation:

1. **Daily Content Generation** - Creates posts automatically
2. **Performance Tracking** - Monitors engagement
3. **Weekly Optimization** - Improves strategy based on data

---

## Workflow 1: Daily Content Generation

**Trigger:** Cron - Every hour at :00

**Purpose:** Check which PageProfiles need content and generate it

### Flow Diagram:

```
┌──────────────────────────────────────────────┐
│ Cron Trigger (every hour at :00)             │
└────────────┬─────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ HTTP Request                                   │
│ GET /api/v1/page-profiles/due-for-content     │
│ → Returns PageProfiles that need content now  │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Split Into Batches (max 5 at a time)          │
└────────────┬───────────────────────────────────┘
             ↓
     ┌───────┴───────┐
     │ For Each Page │
     └───────┬───────┘
             ↓
┌────────────────────────────────────────────────┐
│ HTTP Request                                   │
│ POST /page-profiles/:id/generate-content      │
│ → Queues AI generation job                    │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Wait 30 seconds (for AI to process)           │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Check ContentDraft created                     │
│ GET /content-drafts?pageProfileId=:id          │
└────────────┬───────────────────────────────────┘
             ↓
      ┌──────┴──────┐
      │ If Success  │
      └──────┬──────┘
             ↓
┌────────────────────────────────────────────────┐
│ Log Success                                    │
│ → Update PageProfile.lastPostAt                │
└────────────────────────────────────────────────┘
```

### n8n Workflow JSON (Import Ready):

```json
{
  "name": "Daily Content Generation",
  "nodes": [
    {
      "type": "n8n-nodes-base.cron",
      "name": "Every Hour",
      "parameters": {
        "triggerTimes": {
          "item": [
            {
              "mode": "everyHour"
            }
          ]
        }
      },
      "position": [250, 300]
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Get Due PageProfiles",
      "parameters": {
        "url": "http://control-api:4000/api/v1/page-profiles/due-for-content",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth",
        "options": {}
      },
      "position": [450, 300]
    },
    {
      "type": "n8n-nodes-base.splitInBatches",
      "name": "Batch Processor",
      "parameters": {
        "batchSize": 5
      },
      "position": [650, 300]
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "name": "Trigger Generation",
      "parameters": {
        "url": "=http://control-api:4000/api/v1/workspaces/{{$json.workspaceId}}/page-profiles/{{$json.id}}/generate-content",
        "method": "POST",
        "authentication": "predefinedCredentialType",
        "nodeCredentialType": "httpHeaderAuth"
      },
      "position": [850, 300]
    },
    {
      "type": "n8n-nodes-base.wait",
      "name": "Wait for Processing",
      "parameters": {
        "amount": 30,
        "unit": "seconds"
      },
      "position": [1050, 300]
    }
  ],
  "connections": {
    "Every Hour": {
      "main": [
        [
          {
            "node": "Get Due PageProfiles",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Get Due PageProfiles": {
      "main": [
        [
          {
            "node": "Batch Processor",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Batch Processor": {
      "main": [
        [
          {
            "node": "Trigger Generation",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Trigger Generation": {
      "main": [
        [
          {
            "node": "Wait for Processing",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  }
}
```

---

## Workflow 2: Performance Tracking

**Trigger:** Cron - Daily at 23:00

**Purpose:** Fetch engagement stats from Postiz and update database

### Flow Diagram:

```
┌──────────────────────────────────────────────┐
│ Cron Trigger (daily 23:00)                   │
└────────────┬─────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Get Published Content (last 24h)              │
│ GET /content-archives/recent                   │
└────────────┬───────────────────────────────────┘
             ↓
     ┌───────┴────────┐
     │ For Each Post  │
     └───────┬────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Fetch Stats from Postiz                       │
│ GET /postiz/posts/:id/stats                   │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Update ContentArchive                          │
│ PATCH /content-archives/:id                    │
│ { performance: { likes, shares, comments } }   │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Calculate PageProfile Stats                   │
│ → Average engagement                           │
│ → Best content type                            │
│ → Engagement trend                             │
└────────────┬───────────────────────────────────┘
             ↓
      ┌──────┴──────┐
      │ If Trend ↓  │
      └──────┬──────┘
             ↓
┌────────────────────────────────────────────────┐
│ Send Telegram Alert                           │
│ "⚠️ Engagement down 20% for Tech News Daily"  │
└────────────────────────────────────────────────┘
```

---

## Workflow 3: Weekly Optimization

**Trigger:** Cron - Sunday at 20:00

**Purpose:** Analyze performance and optimize posting strategy

### Flow Diagram:

```
┌──────────────────────────────────────────────┐
│ Cron Trigger (Sunday 20:00)                  │
└────────────┬─────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Get All Active PageProfiles                   │
│ GET /page-profiles?status=active              │
└────────────┬───────────────────────────────────┘
             ↓
     ┌───────┴────────┐
     │ For Each Page  │
     └───────┬────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Get Week Performance Data                     │
│ GET /page-profiles/:id/analytics?days=7       │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ AI Analysis (via OpenAI)                      │
│ Analyze:                                       │
│ - Best performing content type                 │
│ - Optimal posting times                        │
│ - Hashtag effectiveness                        │
│ - Engagement patterns                          │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Generate Recommendations                       │
│ "Increase AI-generated ratio to 60%"          │
│ "Best time: 09:00 & 18:00"                    │
│ "Drop hashtag #startup (low engagement)"      │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Update PageProfile (auto-optimize)            │
│ PATCH /page-profiles/:id                      │
│ { schedule: {...}, contentStrategy: {...} }   │
└────────────┬───────────────────────────────────┘
             ↓
┌────────────────────────────────────────────────┐
│ Send Weekly Report (Telegram)                 │
│ 📊 Weekly Report - Tech News Daily            │
│ • 14 posts, avg score 87/100                  │
│ • Best: AI-generated (92% engagement)         │
│ • Optimization: Schedule adjusted             │
└────────────────────────────────────────────────┘
```

---

## Setup Instructions

### 1. Access n8n

```
http://localhost:5678
Email: hieuctfe@gmail.com
Password: Alo12345
```

### 2. Import Workflows

1. Go to Workflows → Import from File
2. Import all 3 workflows from `docs/workflows/n8n/` folder
3. Set credentials for:
   - HTTP Header Auth (JWT token from control-api)
   - Telegram Bot (for notifications)

### 3. Configure Credentials

**HTTP Auth:**
- Header Name: `Authorization`
- Header Value: `Bearer YOUR_JWT_TOKEN`

**Get JWT:**
```bash
curl -X POST http://localhost:4000/api/v1/auth/sign-in \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@socialbot.local"}' \
  | jq -r '.accessToken'
```

### 4. Activate Workflows

- Enable "Daily Content Generation"
- Enable "Performance Tracking"
- Enable "Weekly Optimization"

---

## Testing

### Test Workflow 1 (Manual Trigger):

1. Create a test PageProfile
2. Manually execute "Daily Content Generation"
3. Check logs:
   - Should call `/due-for-content`
   - Should trigger generation
   - Should create ContentDraft

### Test Workflow 2:

1. Publish a test post via Postiz
2. Manually run "Performance Tracking"
3. Verify ContentArchive updated with stats

### Test Workflow 3:

1. Wait 1 week OR fake analytics data
2. Run "Weekly Optimization"
3. Check Telegram for report
4. Verify PageProfile updated

---

## Monitoring

**Check workflow runs:**
```
n8n UI → Executions
```

**View logs:**
```bash
docker compose -f docker-compose.dev.yml logs n8n -f
```

**Success indicators:**
- Daily: 20-50 executions/day (depends on PageProfile count)
- Performance: 1 execution/day
- Weekly: 1 execution/week

---

## Troubleshooting

**No content generated:**
- Check PageProfile.schedule matches current time
- Verify PageProfile.status = ACTIVE
- Check ai-worker logs

**Stats not updating:**
- Verify Postiz API key valid
- Check postiz-client package working
- Check post ID mapping

**Optimization not working:**
- Verify OpenAI API key
- Check analytics endpoint returns data
- Review AI prompt in workflow

---

## Next Steps

1. ✅ Import workflows to n8n
2. ✅ Set credentials
3. ✅ Test each workflow manually
4. ✅ Enable all workflows
5. ✅ Monitor for 24h
6. ✅ Review first weekly report

**Ready to import!** 🚀
