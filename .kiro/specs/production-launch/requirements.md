# Requirements Document: Production launch (Phase 5 task 10)

## Introduction

Staging has been the MVP that people use (decided 2026-11-02). This spec covers the move from
"staging is the MVP" to a real production environment: a domain, email through Resend for both the
app and Supabase Auth, a dedicated `strata-production` Supabase project with point-in-time
recovery, a production Vercel project, and moving the MVP's data across. It completes Phase 5
task 10 and the production halves of Phase 0 task 9 (the production Supabase and Vercel projects),
which were deliberately deferred.

Most steps need the product owner's accounts and external decisions (domain registrar, Resend,
Supabase Pro, DNS). Those are called out so the code work and the operations work stay separate.

Sources:

- `.kiro/steering/status.md` ("After that (Phase 5, task 10, and Phase 0, task 9)")
- `docs/product-decisions.md` sections 1 (Hosting, Environments), 15 (Notifications / email)
- `docs/rebuild-plan.md` sections 4 (Phase 5, Later) and 6
- `docs/runbook.md` (deploying, configuration, scheduled jobs, backups and recovery)
- `.kiro/specs/phase-0-foundation/tasks.md` task 9 (the staging halves are done; production is here)

Out of scope: everything under "Later" in `docs/rebuild-plan.md` section 4 (workspace merge,
billing, SSO, connectors, and so on). The open export decision (status.md) is tracked separately
and is not part of this spec.

## Requirements

### 1. Domain

**User story:** As the operator, I want Strata on a custom domain, so the product has a stable,
professional address that email and uptime checks can rely on.

#### Acceptance criteria

1. WHEN the domain is chosen and registered THEN its DNS SHALL be managed where Vercel and Resend
   records can be added (A/CNAME for the app, and the sender records in requirement 2).
2. WHEN the production Vercel project is attached to the domain THEN the apex and `www` (or the
   chosen host) SHALL resolve to it over HTTPS with a valid certificate.
3. WHEN the domain is live THEN `NEXT_PUBLIC_SITE_URL` in production SHALL be the domain, and the
   Supabase Auth "Site URL" and redirect allow-list SHALL use it (not the `vercel.app` address).
4. WHEN the domain is live THEN links in emails and the calendar feed SHALL use the domain.

### 2. Email through Resend (app and Auth)

**User story:** As a user, I want sign-up confirmations, password resets, invitations and
notification emails to arrive, so I can use the features that were held back while no email
provider was set.

#### Acceptance criteria

1. WHEN the sender domain is verified in Resend (SPF, DKIM, and DMARC as Resend requires) THEN
   `SMTP_URL` and `EMAIL_FROM` SHALL be set in the production Vercel project.
2. WHEN `SMTP_URL` and `EMAIL_FROM` are set THEN the app's own emails (invitations and
   notification emails via React Email) SHALL send through Resend, with no code change (the
   `src/lib/email/send.ts` path already reads these variables).
3. WHEN Supabase Auth's custom SMTP is configured with the Resend credentials THEN confirmations
   and password resets SHALL send through Resend.
4. WHEN email is live THEN email sign-up and password reset SHALL be available again (the
   Google-only fallback used while no provider was set no longer applies), per product
   decision 15.
5. WHEN email is live THEN a test SHALL confirm: a sign-up confirmation, a password reset, an
   invitation email, an instant notification email and a daily-summary email each arrive.
6. IF email delivery fails THEN the existing fallbacks SHALL remain: invitations show a copyable
   link, notifications stay in the app, and the `notifications` retry columns record the error
   (per the Phase 5 design).

### 3. Production Supabase project

**User story:** As the operator, I want a dedicated production database separate from staging, so
real customer data is isolated, backed up, and recoverable.

#### Acceptance criteria

1. WHEN `strata-production` is created THEN it SHALL be in Ireland (`eu-west-1`), matching the
   data region recorded on every workspace (product decision 1, Hosting).
2. WHEN the project exists THEN the `deploy-db` workflow's `production` environment SHALL hold its
   session pooler connection string in `SUPABASE_DB_URL`, and a manual approved run SHALL apply
   all migrations to it (per `docs/runbook.md`).
3. WHEN migrations are applied THEN `supabase migration list` against production SHALL match
   `main`.
4. WHEN the project is in use THEN the required extensions (`ltree`, `pg_cron`, `pgmq`, `pg_net`
   as used by the jobs path) SHALL be enabled, matching staging.
5. WHEN the project is configured THEN the Vault secrets `app_url` and `jobs_secret` SHALL be set,
   and `JOBS_SECRET` in production Vercel SHALL match `jobs_secret`, so the scheduled jobs can
   call the app (per `docs/runbook.md`).
6. WHEN the project is configured THEN seed/demo data SHALL NOT run against it (`seed.sql` is demo
   data only).

### 4. Point-in-time recovery and backups

**User story:** As the operator, I want production backed up with point-in-time recovery, so a
mistake or incident can be undone to a precise moment.

#### Acceptance criteria

1. WHEN production launches THEN Supabase Pro daily backups (kept 7 days) and the point-in-time
   recovery add-on SHALL be switched on (per `docs/runbook.md`, Backups and recovery).
2. WHEN PITR is on THEN a restore test SHALL be performed once: restore into a new project, run
   `supabase migration list`, sign in, check a workspace, then delete the project; record the
   date and time taken in the runbook's table.
3. WHEN the restore procedure is confirmed THEN the runbook's "Restoring production" steps SHALL
   be verified accurate against the real project.

### 5. Production Vercel project

**User story:** As the operator, I want a separate production Vercel project, so production
deploys and environment variables are isolated from staging and its previews.

#### Acceptance criteria

1. WHEN the production Vercel project is created THEN it SHALL build from the repository root with
   server code in Dublin (`dub1`), matching staging.
2. WHEN the project is configured THEN it SHALL carry the production environment variables:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (never the secret key),
   `NEXT_PUBLIC_SITE_URL`, `SMTP_URL`, `EMAIL_FROM`, `JOBS_SECRET`, and `NEXT_PUBLIC_SENTRY_DSN`
   (plus the build-only Sentry source-map variables if used), per `docs/runbook.md`.
3. WHEN the `WINDMORPH_PRO_TOKEN` is present THEN the production build SHALL install the private
   `@windmorph/react-pro` package, as staging and CI do.
4. WHEN production and staging both exist THEN preview and staging deploys SHALL NOT use the
   production database (product decision 1, Environments).
5. WHEN Sentry is wired THEN production browser, server and edge errors SHALL report to the EU
   Sentry project, with no session replay and no personal data by default (per `docs/runbook.md`,
   Monitoring).

### 6. Uptime and monitoring

**User story:** As the operator, I want to be told when production is down, so I can respond
before customers report it.

#### Acceptance criteria

1. WHEN production is live THEN an external uptime check SHALL probe `/` and `/sign-in` every
   minute (per `docs/runbook.md`, Monitoring).
2. WHEN the scheduled jobs run THEN their success/failure SHALL be observable
   (`cron.job_run_details`, `net._http_response`), as documented in the runbook.

### 7. Data move from staging to production

**User story:** As the operator, I want the MVP's real data moved from staging to production, so
existing users keep their workspaces, people, leave history and plans.

#### Acceptance criteria

1. BEFORE the move THEN the exact data to carry SHALL be decided with the product owner (which
   workspaces and users; whether any staging-only test data is excluded), recorded in
   `docs/product-decisions.md` or a migration note.
2. WHEN the move is planned THEN the method SHALL be chosen and written down (e.g. a Supabase
   database dump/restore of the relevant data, or a point-in-time export), with the
   `auth.users` identities preserved so sign-in keeps working.
3. WHEN the move runs THEN it SHALL run against production with a backup taken first, and SHALL be
   verified: counts of workspaces, members and bookings match the source; a known user can sign
   in; a workspace's org chart, calendar and plan render.
4. WHEN the move is complete THEN affected users SHALL be told the new address, and the staging
   environment's role SHALL be clarified (kept as staging with non-production data, or retired),
   per product decision 1.

### 8. Launch checklist and documentation

**User story:** As the operator, I want a single launch checklist and up-to-date operational docs,
so launch is repeatable and nothing is missed.

#### Acceptance criteria

1. WHEN launch is prepared THEN a checklist SHALL exist covering: domain and DNS, Resend verified,
   production Supabase with PITR, production Vercel with variables, Sentry wired, uptime check,
   data move verified, and the legal pages' operator details filled in.
2. WHEN production exists THEN `docs/runbook.md` and `.kiro/steering/status.md` SHALL be updated so
   the Environments tables name production (not "Not yet"), and the "staging is the MVP" framing is
   replaced.
3. WHEN launch is done THEN task 10 in `.kiro/specs/phase-5-completion-launch/tasks.md` and the
   production parts of Phase 0 task 9 SHALL be ticked.
4. IF a doc and the code or the real environment disagree while doing this work THEN the code/
   environment SHALL win and the doc SHALL be corrected (the project rule).
