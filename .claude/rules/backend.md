# Backend Rules (control-api)

## Always

- Use NestJS module pattern: Module → Service → Controller → DTO
- Use `PrismaService` for all DB access
- Use `JwtAuthGuard` on all controllers
- Add `@ApiTags`, `@ApiBearerAuth`, `@ApiOperation` to all controllers
- Log every state-changing action via `ActionLogService`
- Route all Postiz calls through `PostizService`
- Use `class-validator` DTOs for all request bodies
- Use `NotFoundException`, `ConflictException` etc. from `@nestjs/common`

## Never

- Never call Postiz API directly (bypass PostizService)
- Never store platform OAuth tokens — Postiz owns that
- Never use raw `fetch` for internal service calls
- Never use `any` in TypeScript (warn on it, fail on usage in DTOs)
- Never skip ActionLog for publish-related actions
- Never add S3/MinIO dependencies

## Prisma

- Run `pnpm db:generate` after schema changes
- Run `pnpm db:migrate` to apply migrations
- Never use `$queryRaw` except for health checks
- Use `include` sparingly — prefer lean queries

## Folder Structure

```
src/
  prisma/           → PrismaModule, PrismaService
  modules/
    <feature>/
      <feature>.module.ts
      <feature>.service.ts
      <feature>.controller.ts
      dto/
        create-<feature>.dto.ts
        update-<feature>.dto.ts (if needed)
```
