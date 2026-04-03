# Skill: bootstrap-repo

## Purpose
Bootstrap or re-scaffold a new app or package in the social-bot monorepo.

## Steps

1. Identify the target: `apps/<name>` or `packages/<name>`
2. Create `package.json` with correct name (`control-api`, `@social-bot/domain`, etc.)
3. Create `tsconfig.json` extending `../../tsconfig.base.json`
4. Create `src/index.ts` or `src/main.ts` as appropriate
5. Add the package to `pnpm-workspace.yaml` (already covered by glob)
6. Run `pnpm install` from repo root
7. Verify with `pnpm --filter <name> typecheck`

## Rules

- Package names: apps use plain names (`control-api`), packages use scoped names (`@social-bot/domain`)
- TypeScript strict mode always
- No direct social platform SDKs
- No S3/MinIO dependencies

## Example Prompts

> "Bootstrap a new package called @social-bot/analytics"
> "Add a new app called reporting-api"
