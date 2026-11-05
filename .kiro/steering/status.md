---
inclusion: always
---

# Strata: where things stand and what is next

Last updated 2026-11-05. Update this file when a task in `.kiro/specs/*/tasks.md` is ticked or
the next step changes.

## Repository

- **One branch: `main`.** The `rebuild` branch was merged into `main` and deleted on 2026-11-05.
  For larger changes, branch from `main` and merge back.
- **The old NestJS/Prisma system** is at the `pre-rebuild` git tag (`git show pre-rebuild:<path>`, commit `79127e9` from 2026-10-28), as
  reference material only: port business rules from it, never copy files.
- **Pushing to `main` deploys.** `.github/workflows/deploy-db.yml` applies new
  `supabase/migrations` to staging. Production is a manual, approved run of the same workflow
  (there is no production project yet).
- **CI** (`.github/workflows/ci.yml`) runs on pushes to `main` and on pull requests: lint,
  typecheck, `knip`, unit, pgTAP, end-to-end smoke, type drift. **Nightly**
  (`.github/workflows/nightly.yml`) runs the 100k load checks and the DataTable benchmark
  (`e2e/perf/data-table.spec.ts`).

## Environments

| Environment | App                                                           | Database                               |
| ----------- | ------------------------------------------------------------- | -------------------------------------- |
| Local       | `pnpm dev` (http://localhost:3000)                            | `supabase start` (Docker)              |
| Staging     | Vercel `strata-web`, https://strata-web-xi.vercel.app, `dub1` | Supabase `strata-staging`, `eu-west-1` |
| Production  | Not yet: staging is the MVP                                   | Not yet                                |

How to run and operate it, including the secrets and variables, is in `docs/runbook.md`.

## Done

- **Phase 0, foundation:** all tasks except 9 (production environments come later).
- **Phase 1, identity and workspaces:** complete.
- **Phase 2, organization and people:** complete, including `DataTable` and `DataGrid`
  (`.kiro/specs/data-table-and-grid`). Since then the tables have gained sorting by several
  columns, pinned columns and column filters shown as chips (migration
  `20261102160521_directory_sort_and_filters.sql`, deployed to staging).
- **Phase 3, time:** complete.
- **Phase 4, planning:** complete.
- **Phase 5, completion and launch:** tasks 1–8 complete (dashboards, personal data export and
  erase, retention, notification emails, help and legal pages, accessibility audit, security
  review, monitoring and backups). Task 9 is partly done: join links, copyable invitation links
  and Google-only sign-up.
- **Cleanup on 2026-11-05:** the Phase 2 spike prototype was removed. The DataTable demo and its
  test data moved to `src/features/dev-demos`.

## Next: MVP on staging (Phase 5, task 9)

Most of these steps need the product owner's accounts. Each one is set up as described in
`docs/runbook.md`.

1. **Google sign-in on staging:** create a Google OAuth client, then turn on the Google provider
   in the `strata-staging` Supabase Auth settings, with the staging URL in the redirect list.
2. **Jobs secret on staging:** set `JOBS_SECRET` in Vercel, and set `jobs_secret` and `app_url`
   in the staging database's Vault. Until then the scheduled jobs don't call the app.
3. **Sentry on staging:** set `NEXT_PUBLIC_SENTRY_DSN` (and optionally the source map variables)
   in Vercel. Sentry stays off until then.
4. **Operator details:** fill in the company name, country and contact email in
   `src/features/docs/pages.ts`. This is code work once the product owner gives the values.
5. **Legal review** of the privacy notice, terms and DPA. This is outside the code; apply any
   changes it asks for in `src/features/docs/pages.ts`.

When all five are done, tick task 9 in `.kiro/specs/phase-5-completion-launch/tasks.md`.

## After that (Phase 5, task 10, and Phase 0, task 9)

A domain; Resend for app and Auth email; a `strata-production` Supabase project with
point-in-time recovery and a production Vercel project; moving the MVP's data there. Write a
spec for this in `.kiro/specs/` before starting it.

Everything under "Later" in `docs/rebuild-plan.md` section 4 stays out until v1 launches.

## Known loose ends

- Lint passes with 7 warnings: `_`-prefixed variables left from destructuring,
  `window.location.assign` in `people-directory.tsx`, and a React Compiler note on
  `data-grid.tsx`. None is an error.
- `parseSorts` in `src/features/people/directory-params.ts` still accepts the old `desc=1`
  directory links from before multi-column sort. Remove it once old links no longer matter.
- **The nightly load checks have never passed** (every run since 2026-10-31). The 100k data loads,
  but almost every check misses its target on the GitHub runner: the directory, the calendar
  week, plan totals, the plan grid and applying rate cards. Because so many checks miss, the
  runner is more likely too small for targets measured locally than one query having slowed.
  Investigate before launch: compare against a local run (`docs/runbook.md`) and either fix the
  slow queries or set targets per environment. The logs also show Docker Hub rate limits
  (`toomanyrequests`) while Supabase starts.
