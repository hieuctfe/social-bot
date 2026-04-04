# Task for BE (Backend Engineer)

## Assignment

Implement PageProfile CRUD API as specified in `specs/page-profile-api.md`

## Context

- Database schema already migrated ✅
- Tables `page_profiles` and `content_archives` exist in DB
- Prisma Client regenerated ✅

## Your Job

Follow the spec exactly:
1. Read `specs/page-profile-api.md`
2. Read `agents/be.md` (your role guidelines)
3. Implement all endpoints in `apps/control-api/src/modules/page-profile/`
4. Follow existing code patterns in `apps/control-api/src/modules/`
5. Test with curl
6. Update Swagger docs

## File Structure

```
apps/control-api/src/modules/page-profile/
├── page-profile.module.ts
├── page-profile.controller.ts
├── page-profile.service.ts
├── dto/
│   ├── create-page-profile.dto.ts
│   └── update-page-profile.dto.ts
└── entities/
    └── page-profile.entity.ts
```

## Reference Existing Modules

Look at these for patterns:
- `apps/control-api/src/modules/content-draft/`
- `apps/control-api/src/modules/social-connection/`

## Don't Forget

- Add to `app.module.ts`
- Use JwtAuthGuard
- Add Swagger decorators
- Handle errors properly
- Log to ActionLog

## When Done

Reply with:
- Curl test commands
- Swagger URL to test
- Any issues encountered

---

**Start implementing now!** 🚀
