# n8n — Workflow Automation

n8n is used for Telegram-triggered workflows and future AI orchestration.

## Local Access

After running `docker compose -f docker-compose.dev.yml up`, n8n is available at:
- URL: http://localhost:5678
- User: `admin` (set in `N8N_BASIC_AUTH_USER`)
- Password: set in `N8N_BASIC_AUTH_PASSWORD`

## Planned Workflows

| Workflow | Trigger | Status |
|----------|---------|--------|
| Telegram → Approve Post | Telegram message | TODO |
| Telegram → Create Draft | Telegram message | TODO |
| Postiz Callback → Update Status | Webhook | TODO |
| AI Action Planner | Schedule / Webhook | TODO |

## Webhook Integration

The control-api exposes a webhook endpoint at:
```
POST /api/v1/webhooks/n8n
Header: x-webhook-secret: <CONTROL_API_WEBHOOK_SECRET>
```

## Importing Workflows

Place workflow JSON exports in this directory.
Import via the n8n UI: Settings → Workflows → Import from file.

## TODO

- [ ] Create Telegram approval workflow JSON
- [ ] Create Postiz status sync workflow JSON
- [ ] Set up environment credentials in n8n for Telegram bot token
- [ ] Set up webhook credential in n8n pointing to control-api
