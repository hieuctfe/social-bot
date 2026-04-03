# Postiz — Publishing Core

Postiz is the external publishing engine. Social Bot delegates all actual
posting to social platforms through Postiz.

## Local Access

After running `docker compose -f docker-compose.dev.yml up`, Postiz is at:
- URL: http://localhost:4200

## Integration

1. Log into Postiz at http://localhost:4200
2. Connect your social accounts (Instagram, Facebook, TikTok, etc.)
3. Create an API key in Postiz settings
4. Set `POSTIZ_API_KEY` in your `.env`
5. Set `POSTIZ_API_URL=http://postiz:3000/api` (internal Docker network URL)

## Important Boundaries

- Social Bot does NOT store OAuth tokens for social platforms
- Social Bot does NOT call Meta/TikTok/Twitter APIs directly
- All publishing MUST go through `packages/postiz-client` → Postiz API
- "Integration" in Postiz = "SocialConnection" in Social Bot's domain

## API Reference

Postiz API docs: https://docs.postiz.com/api-reference

## TODO

- [ ] Confirm Postiz Public API endpoints for scheduling
- [ ] Verify media upload flow
- [ ] Implement status sync webhook from Postiz back to control-api
