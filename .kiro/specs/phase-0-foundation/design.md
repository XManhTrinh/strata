# Design Document: Phase 0 foundation

## Overview

One Next.js app at the repository root, Supabase alongside it, no workspace tooling. The design
follows `docs/rebuild-plan.md` sections 1 (architecture) and 5 (testing, CI, environments).

## Repository after Phase 0

```
strata/
├── .github/workflows/ci.yml          lint, typecheck, unit, db tests, e2e smoke, type drift
├── .github/workflows/deploy-db.yml   apply migrations to staging (release branch)
├── .kiro/                            steering and specs
├── docs/
├── e2e/smoke.spec.ts
├── sample-data/
├── src/
│   ├── app/
│   │   ├── layout.tsx                ThemeProvider, NextIntlClientProvider, Snackbar host
│   │   ├── page.tsx                  placeholder home
│   │   ├── globals.css               Tailwind v4 + Windmorph styles + @source lines
│   │   ├── loading.tsx / error.tsx / not-found.tsx
│   ├── components/ui/icon.tsx
│   ├── i18n/request.ts               next-intl config (locale "en")
│   ├── lib/
│   │   ├── supabase/{server,client,proxy}.ts, database.types.ts
│   │   ├── snackbar.ts, motion.ts, cn.ts, env.ts (zod-validated env)
│   ├── messages/en.json
│   └── proxy.ts
├── supabase/
│   ├── config.toml
│   ├── migrations/<timestamp>_foundation.sql
│   ├── tests/000_rls_enabled.test.sql
│   └── seed.sql                      empty for now
├── .env.example, .gitignore, .prettierrc, eslint.config.mjs
├── next.config.ts, postcss.config.mjs, tsconfig.json, vitest.config.ts, playwright.config.ts
├── package.json, pnpm-lock.yaml, pnpm-workspace.yaml (build allowlist only)
├── CLAUDE.md, README.md
```

## Key decisions

### Package management

pnpm 12 (as today). `pnpm-workspace.yaml` stays only for the `allowBuilds` list and
`minimumReleaseAgeExclude` for Windmorph releases; there are no workspace packages.
`@windmorph/react-pro` stays a git dependency pinned to a commit of `XManhTrinh/windmorph-pro`.

### Environment variables

`src/lib/env.ts` validates variables with zod at startup and splits public (`NEXT_PUBLIC_*`) from
server-only values:

| Variable                                                           | Scope                                  |
| ------------------------------------------------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public                                 |
| `SUPABASE_SECRET_KEY`                                              | server-only, jobs and admin tasks only |
| `NEXT_PUBLIC_SITE_URL`                                             | public                                 |
| `RESEND_API_KEY`                                                   | server-only (used from Phase 1)        |
| `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`                             | as named                               |

### Supabase clients

- `server.ts`: `createServerClient` from `@supabase/ssr` with Next.js cookies; used in Server
  Components, Server Actions and route handlers.
- `client.ts`: `createBrowserClient`, used only for Realtime and client-side auth flows.
- `proxy.ts` (library) + `src/proxy.ts`: refresh the session cookie and call `getClaims()`;
  unauthenticated access to protected paths redirects to sign-in (protected paths arrive in
  Phase 1).

### First migration

```sql
create extension if not exists ltree with schema extensions;
create extension if not exists pg_cron;
create extension if not exists pgmq;
create extension if not exists pgtap with schema extensions;
create schema if not exists app;            -- permission and helper functions
create function app.set_updated_at() ...    -- trigger: new.updated_at = now()
```

### Tests

- Vitest with `happy-dom` for component logic; `*.test.ts(x)` beside the code.
- Playwright projects `phone` (390×844), `tablet` (834×1194), `desktop` (1440×900);
  `@axe-core/playwright` in the smoke test.
- pgTAP: `000_rls_enabled.test.sql` asserts every `public` table has RLS enabled. It keeps
  passing as tables are added, and fails the moment one is created without RLS.

### CI (`ci.yml`)

1. Checkout, set up pnpm and Node 26 (`.nvmrc`), configure git to use `WINDMORPH_PRO_TOKEN` for the private
   repo, `pnpm install --frozen-lockfile`.
2. `pnpm lint`, `pnpm typecheck`, `pnpm test`.
3. `supabase start` (CLI action), `supabase db reset`, `pnpm db:test`, `pnpm db:types` then
   `git diff --exit-code src/lib/supabase/database.types.ts`.
4. `pnpm build`, `pnpm test:e2e --project=desktop` (smoke).

### Owner actions (cannot be automated here)

- Create the Supabase staging and production projects (Frankfurt) and the Vercel project; add the
  variables.
- Create a fine-grained read-only GitHub token for `windmorph-pro` and add it as
  `WINDMORPH_PRO_TOKEN` in GitHub and Vercel.
- Create the Sentry project with EU data storage.
- Configure Google OAuth credentials in each Supabase project.
