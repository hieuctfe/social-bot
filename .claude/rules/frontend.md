# Frontend Rules (dashboard-web)

## Always

- Use Next.js App Router (not Pages Router)
- Use TanStack Query for all server state
- Use `apiClient` from `src/lib/api-client.ts` for API calls
- Use feature hooks from `src/features/<feature>/hooks.ts`
- Use `cn()` from `src/lib/utils.ts` for className merging
- Use `PageHeader` component for all page headers
- Keep pages thin — logic in hooks, UI in components

## Never

- Never call APIs directly from page components
- Never store JWT in localStorage (use httpOnly cookies when auth is implemented)
- Never import from other app directories (only from `packages/*`)
- Never add `use client` to layout components unless necessary

## Folder Structure

```
src/
  app/
    (dashboard)/    → Route group for authenticated layout
      <page>/
        page.tsx
  components/
    layout/         → Sidebar, Topbar
    ui/             → Generic UI primitives
    <feature>/      → Feature-specific components
  features/
    <feature>/
      hooks.ts      → TanStack Query hooks
      types.ts      → Local types (if not in @social-bot/domain)
  lib/
    api-client.ts
    utils.ts
```
