# Implementation Plan: Phase 0 foundation

## Overview

Clean the branch, scaffold the app, wire Supabase, add tooling and tests, then CI and
environments. Each task leaves the repository building.

## Tasks

- [x] 1. Clean the branch
  - [x] 1.1 Delete `apps/`, `packages/`, `turbo.json`, `render.yaml`, `Dockerfile.api`,
        `Dockerfile.worker`, `docker-compose.yml`, the old root `package.json` and lockfile, and
        the old `supabase/snippets`
    - _Requirements: 1.1, 1.4_
  - [x] 1.2 Update `.gitignore` (add `next-env.d.ts`, `playwright-report`, `test-results`,
        `supabase/.temp`); keep `sample-data/`
    - _Requirements: 1.2, 1.3_

- [x] 2. Scaffold the Next.js app at the root
  - [x] 2.1 Create `package.json`, `tsconfig.json` (strict, `@/*`), `next.config.ts`,
        `postcss.config.mjs`, Tailwind v4 `globals.css`
    - _Requirements: 2.1, 2.2_
  - [x] 2.2 Add the root `layout.tsx`, `page.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`
    - _Requirements: 2.3_
  - [x] 2.3 Add the scripts `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `knip`,
        `test`, `test:e2e`, `db:test`, `db:types`
    - _Requirements: 2.4_
  - [x] 2.4 Install each dependency fresh at its latest stable version; Node 24 LTS (`.nvmrc`, the newest Vercel offers),
        pnpm 12.16.1 (`packageManager`), TypeScript 7 for type checking with TypeScript 6 for
        tools that need its API; build permissions only for installed packages
    - _Requirements: 2.6, 2.7_

- [x] 3. Windmorph theme and base UI
  - [x] 3.1 Install `@windmorph/react` and `@windmorph/react-pro`; import styles with `@source`
        lines in `globals.css`
    - _Requirements: 3.1_
  - [x] 3.2 `ThemeProvider` with the baseline theme and server-side theme cookie; Roboto Flex
    - _Requirements: 3.2_
  - [x] 3.3 `Icon` (Material Symbols Rounded)
    - _Requirements: 3.3_
  - [ ] 3.4 Snackbar host + `useSnackbar` and the motion helper, with the Phase 1 shell
    - _Requirements: 3.4_
  - [x] 3.5 Placeholder home page using Windmorph components only
    - _Requirements: 3.5_

- [x] 4. Translation layer
  - [x] 4.1 Configure `next-intl` (locale `en`, no URL prefix, typed messages) and
        `src/messages/en.json`
    - _Requirements: 4.1, 4.2, 4.3_
  - [x] 4.2 `react/jsx-no-literals` flags literal JSX text
    - _Requirements: 4.4_

- [x] 5. Supabase
  - [x] 5.1 Write `supabase/config.toml` for Strata
    - _Requirements: 5.1_
  - [x] 5.2 First migration: extensions, `app` schema, `app.set_updated_at()`
    - _Requirements: 5.2_
  - [x] 5.3 Run `pnpm db:types` against the local stack and commit the generated file
    - _Requirements: 5.3_
  - [x] 5.4 Typed proxy client; `src/proxy.ts` with `getClaims()` (server and browser clients
        arrive with their first use in Phase 1)
    - _Requirements: 5.4, 5.5_
  - [x] 5.5 `src/lib/env.ts` (zod-validated, checked on first use) and `.env.example`
    - _Requirements: 5.6_

- [x] 6. Code quality tooling
  - [x] 6.1 ESLint flat config (Next, TypeScript with `no-explicit-any` as error, full `jsx-a11y`
        recommended set) and Prettier
    - _Requirements: 6.1, 6.2_
  - [x] 6.2 `typecheck` with TypeScript 7 (`tsc --noEmit`)
    - _Requirements: 6.3_
  - [x] 6.3 `knip` config and script
    - _Requirements: 6.4_
  - [x] 6.4 Renovate config with grouped weekly updates and the TypeScript / Node types pins
    - _Requirements: 6.5_

- [x] 7. Test infrastructure
  - [x] 7.1 Vitest config and the `env` unit tests
    - _Requirements: 7.1_
  - [x] 7.2 Playwright config with phone, tablet and desktop projects; smoke tests with axe
    - _Requirements: 7.2_
  - [x] 7.3 pgTAP tests: RLS on every `public` table; new tables get RLS automatically and no
        API-role privileges; new functions are not executable by default
    - _Requirements: 7.3_

- [x] 8. Continuous integration
  - [x] 8.1 `.github/workflows/ci.yml` with all checks and the type drift check
    - _Requirements: 8.1, 8.2_
  - [x] 8.2 Private Windmorph Pro install in CI via `WINDMORPH_PRO_TOKEN`
    - _Requirements: 8.3_
  - [x] 8.3 `.github/workflows/deploy-db.yml`: staging on merge to `main`, production by approved
        manual run
    - _Requirements: 8.4_

- [ ] 9. Environments and monitoring (needs the product owner's accounts)
  - [x] 9.1 Supabase `strata-staging` in Ireland (`eu-west-1`); migrations deploy to it through
        `deploy-db` with a session pooler connection string (`SUPABASE_DB_URL`). `strata-production`
        is created later, before launch
    - _Requirements: 9.1_
  - [x] 9.2 Vercel project `strata-web` (staging, `https://strata-web-xi.vercel.app`) builds from the
        repository root with server code in Dublin (`dub1`) and staging variables for Production and
        Preview. The production Vercel project is created later
    - _Requirements: 9.2_
  - [ ] 9.3 Sentry (EU) for browser, server and Edge Functions, with personal data scrubbing
        (wired once the Sentry project exists)
    - _Requirements: 9.3_

- [x] 10. Developer guidance
  - [x] 10.1 New `.kiro/steering` files
    - _Requirements: 10.1_
  - [x] 10.2 `CLAUDE.md`
    - _Requirements: 10.2_
  - [x] 10.3 `README.md` with local setup
    - _Requirements: 10.3_
