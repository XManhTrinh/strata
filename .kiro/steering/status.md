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
- **Docs corrected on 2026-11-05** to match the code. A review by Kiro found the stack docs
  listing libraries that were never installed, plus a few wrong paths. `docs/architecture/0001-tech-stack.md`
  (see its "As built" note), `tech.md`, `ui-material.md`, `structure.md`, `testing.md`,
  `database.md`, `README.md` and `docs/rebuild-plan.md` (1.1, 1.2, layout) now describe what is
  built. Unused libraries are listed as "add when needed". If a doc and the code disagree, check
  the code, then fix the doc.

## Open decision for the product owner: exports

`docs/product-decisions.md` (section 13, Reports and exports) promises, for v1, export from every table
(people, leave, capacity, rate cards) to CSV or Excel, and Phase 2 requirement 11 says the same.
What is built is CSV only, from two places: the people directory
(`src/app/w/[workspace]/people/export/route.ts`) and plan totals
(`src/app/w/[workspace]/planning/totals/export/route.ts`), both through `src/lib/csv.ts`. Leave
and rate cards have no export, and nothing exports to Excel. The spec tasks for these were
ticked anyway.

There are two options. Either build the rest (Excel through `exceljs` beside CSV, plus leave and
rate-card exports, within each table's export permission), or change the decision to CSV for v1
and Excel later. Ask the product owner first, record the answer in `docs/product-decisions.md`,
then add the work as a task in `.kiro/specs/phase-5-completion-launch/tasks.md`. Claude Code's
recommendation is to build it before the MVP: v1 promises it, the export path already exists,
and finance teams will ask for Excel.

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
point-in-time recovery and a production Vercel project; moving the MVP's data there. The spec for
this is written: `.kiro/specs/production-launch/` (requirements, design, tasks). It is almost all
configuration and operations needing the product owner's accounts, and it carries three open
decisions (the domain, staging's future after launch, and the data-move method) to settle before
the matching tasks start.

Everything under "Later" in `docs/rebuild-plan.md` section 4 stays out until v1 launches.

## Known loose ends

- Lint passes with 7 warnings: `_`-prefixed variables left from destructuring,
  `window.location.assign` in `people-directory.tsx`, and a React Compiler note on
  `data-grid.tsx`. None is an error.
- `parseSorts` in `src/features/people/directory-params.ts` still accepts the old `desc=1`
  directory links from before multi-column sort. Remove it once old links no longer matter.
- **The nightly load checks fail on CI but pass locally** (nightly red since 2026-10-31). Measured
  on 2026-11-05: a full local `pnpm db:load` (14-CPU / 24 GB Mac) passed **all 34 checks** with
  margin (re-run `pnpm db:load` to reproduce). The queries are not
  slow; the targets are simply too tight for GitHub's shared `ubuntu-latest` runner (2–4 vCPU).
  The checks closest to their target even locally, and so the first to tip over on CI, are plan
  totals by a custom field (2537 ms / 3000), the team-and-below plan grid first page
  (279 ms / 300) and the whole-workspace calendar week (231 ms / 300). EXPLAIN was not needed: no
  check regressed. Decision still open (product owner): either set per-environment targets (looser
  on CI) in `supabase/load/checks.sql`, or run the nightly on a larger runner. The Docker Hub
  `toomanyrequests` noise affects Supabase startup, not query timing. Until this is decided the
  nightly stays red; it is a target/runner mismatch, not a product bug.
