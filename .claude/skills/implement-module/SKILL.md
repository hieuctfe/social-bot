# Skill: implement-module

## Purpose
Implement a new NestJS module in apps/control-api.

## Steps

1. Create `src/modules/<module-name>/` directory
2. Create the following files:
   - `<name>.module.ts` — `@Module` decorator, imports, providers, exports
   - `<name>.service.ts` — business logic, Prisma calls
   - `<name>.controller.ts` — REST endpoints, guards, Swagger decorators
   - `dto/create-<name>.dto.ts` — class-validator DTO
3. Register the module in `src/app.module.ts`
4. If publish-related, inject `ActionLogService` and log every state change
5. If Postiz-related, inject `PostizService` (not raw fetch)

## Rules

- Use `@UseGuards(JwtAuthGuard)` on all controllers
- Use `@ApiBearerAuth()` and `@ApiTags(...)` on all controllers
- DTOs must use class-validator decorators
- Services must use `PrismaService`, never raw SQL
- Every publish action → ActionLog entry
- Every Postiz call → through PostizService

## Checklist

- [ ] Module file created
- [ ] Service file created
- [ ] Controller file created
- [ ] DTO file(s) created
- [ ] Registered in AppModule
- [ ] ActionLog calls added for state-changing actions
- [ ] Swagger decorators present
