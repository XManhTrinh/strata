# Implementation Plan: Phase 0 foundation

## Overview

Clean the branch, scaffold the app, wire Supabase, add tooling and tests, then CI and
environments. Each task leaves the repository building.

## Tasks

- [ ] 1. Clean the branch
  - [ ] 1.1 Delete `apps/`, `packages/`, `turbo.json`, `render.yaml`, `Dockerfile.api`,
    `Dockerfile.worker`, `docker-compose.yml`, the old root `package.json` scripts and the old
    `supabase/snippets`
    - _Requirements: 1.1, 1.4_
  - [ ] 1.2 Update `.gitignore` (add `next-env.d.ts`, `playwright-report`, `test-results`,
    `supabase/.temp`); keep `sample-data/`
    - _Requirements: 1.2, 1.3_

- [ ] 2. Scaffold the Next.js app at the root
  - [ ] 2.1 Create `package.json`, `tsconfig.json` (strict, `@/*`), `next.config.ts`,
    `postcss.config.mjs`, Tailwind v4 `globals.css`
    - _Requirements: 2.1, 2.2_
  - [ ] 2.2 Add the folder skeleton from `structure.md` and the root `layout.tsx`, `page.tsx`,
    `loading.tsx`, `error.tsx`, `not-found.tsx`
    - _Requirements: 2.3_
  - [ ] 2.3 Add the scripts `dev`, `build`, `start`, `lint`, `typecheck`, `format`, `test`,
    `test:e2e`, `db:test`, `db:types`
    - _Requirements: 2.4_
  - [ ] 2.4 Install each dependency fresh at its latest stable version (`pnpm add <pkg>`, never
    copied versions); trim `pnpm-workspace.yaml` build permissions to installed packages only
    - _Requirements: 2.6, 2.7_

- [ ] 3. Windmorph theme and base UI
  - [ ] 3.1 Install `@windmorph/react` and `@windmorph/react-pro`; import styles with `@source`
    lines in `globals.css`
    - _Requirements: 3.1_
  - [ ] 3.2 `ThemeProvider` with the baseline theme and server-side theme cookie
    - _Requirements: 3.2_
  - [ ] 3.3 `Icon` (Material Symbols), Snackbar host + `useSnackbar`, `lib/motion.ts`, `lib/cn.ts`
    - _Requirements: 3.3, 3.4_
  - [ ] 3.4 Placeholder home page using Windmorph components only
    - _Requirements: 3.5_

- [ ] 4. Translation layer
  - [ ] 4.1 Configure `next-intl` (locale `en`, no URL prefix) and `src/messages/en.json`
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 4.2 Lint rule flagging literal JSX text
    - _Requirements: 4.4_

- [ ] 5. Supabase
  - [ ] 5.1 Write `supabase/config.toml` for Strata
    - _Requirements: 5.1_
  - [ ] 5.2 First migration: extensions, `app` schema, `app.set_updated_at()`
    - _Requirements: 5.2_
  - [ ] 5.3 `db:types` script and committed `database.types.ts`
    - _Requirements: 5.3_
  - [ ] 5.4 Typed server, browser and proxy clients; `src/proxy.ts` with `getClaims()`
    - _Requirements: 5.4, 5.5_
  - [ ] 5.5 `src/lib/env.ts` (zod-validated) and `.env.example`
    - _Requirements: 5.6_

- [ ] 6. Code quality tooling
  - [ ] 6.1 ESLint flat config (Next, TypeScript with `no-explicit-any` as error, `jsx-a11y`) and
    Prettier
    - _Requirements: 6.1, 6.2_
  - [ ] 6.2 `typecheck` script with `tsc --noEmit`
    - _Requirements: 6.3_
  - [ ] 6.3 `knip` config and `pnpm knip` script, failing on unused dependencies, files, exports
    - _Requirements: 6.4_
  - [ ] 6.4 Renovate config with grouped weekly updates (Windmorph packages in their own group)
    - _Requirements: 6.5_

- [ ] 7. Test infrastructure
  - [ ] 7.1 Vitest config and one example unit test
    - _Requirements: 7.1_
  - [ ] 7.2 Playwright config with phone, tablet and desktop projects; smoke test with axe
    - _Requirements: 7.2_
  - [ ] 7.3 pgTAP test asserting RLS on every `public` table
    - _Requirements: 7.3_

- [ ] 8. Continuous integration
  - [ ] 8.1 `.github/workflows/ci.yml` with all checks and the type drift check
    - _Requirements: 8.1, 8.2_
  - [ ] 8.2 Private Windmorph Pro install in CI via `WINDMORPH_PRO_TOKEN`
    - _Requirements: 8.3_
  - [ ] 8.3 `.github/workflows/deploy-db.yml` applying migrations to staging
    - _Requirements: 8.4_

- [ ] 9. Environments and monitoring (needs the product owner's accounts)
  - [ ] 9.1 Supabase staging and production projects in Frankfurt
    - _Requirements: 9.1_
  - [ ] 9.2 Vercel project with server code in Frankfurt and per-environment variables
    - _Requirements: 9.2_
  - [ ] 9.3 Sentry (EU) for browser, server and Edge Functions, with personal data scrubbing
    - _Requirements: 9.3_

- [x] 10. Developer guidance
  - [x] 10.1 New `.kiro/steering` files
    - _Requirements: 10.1_
  - [x] 10.2 `CLAUDE.md`
    - _Requirements: 10.2_
  - [ ] 10.3 `README.md` with local setup
    - _Requirements: 10.3_
