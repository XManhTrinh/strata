# Design Document: Production launch (Phase 5 task 10)

Built from `requirements.md` in this folder and the launch notes in `.kiro/steering/status.md`
("After that"), `docs/runbook.md`, and `docs/product-decisions.md` (sections 1 and 15). Where this
design and those documents disagree, those documents win and this design is corrected.

This is almost entirely **configuration and operations**, not application code. The app already
reads every variable it needs from the environment (`src/lib/env.ts`, `src/lib/env.server.ts`),
sends email over SMTP from a scheduled job, and deploys through existing workflows. Launch is the
act of pointing those at real production infrastructure and moving the data across. No new feature
code is expected; if a change is needed, it is a bug the launch uncovered, fixed with a test.

## What already exists (so launch adds no code)

- **Email** sends over SMTP through `src/lib/email/send.ts` (`@react-email/render` + `nodemailer`),
  reading `SMTP_URL` and `EMAIL_FROM`. With neither set, sending is skipped and the in-app and
  copyable-link fallbacks apply. Setting the two variables turns real email on with no code change.
- **Notification emails** are driven by `pg_cron` calling `/api/jobs/notification-emails` every
  minute with the shared `JOBS_SECRET` (checked against Vault `jobs_secret`; the app's URL is Vault
  `app_url`). The route claims a due batch, renders and sends, and records the result on
  `notifications` (`emailed_at`, `email_attempts`, `email_error`). This path is built and tested
  against Mailpit; production only needs the secrets and a real SMTP provider.
- **Deploys** go through `.github/workflows/deploy-db.yml` (migrations) and the Vercel projects.
  The `production` GitHub environment and a production Vercel project are the missing pieces.
- **Monitoring** is wired for Sentry (EU) and stays off until `NEXT_PUBLIC_SENTRY_DSN` is set.

## Approach

Launch runs in a safe order so each step can be verified before the next depends on it, and so the
live cut-over (DNS and the data move) comes last.

### 1. Domain and DNS

Register the domain and host its DNS where both Vercel's records and Resend's sender records can
live. The domain is not wired into the app until the production Vercel project and Resend are ready,
so DNS changes are additive and low-risk until the final cut-over.

### 2. Resend (app and Auth email)

- Verify the sender domain in Resend (SPF, DKIM, DMARC as Resend requires).
- App email: set `SMTP_URL` (Resend's SMTP URL) and `EMAIL_FROM` in the production Vercel project.
  No code change; `send.ts` begins sending.
- Auth email: configure Supabase Auth custom SMTP on the production project with the Resend
  credentials, so confirmations and password resets send through Resend.
- With email live, email sign-up and password reset are available again; the Google-only fallback
  (used while no provider was set) no longer applies. The fallbacks remain as safety nets if a
  send fails (copyable invitation links, in-app notifications, the retry columns).

### 3. Production Supabase project (`strata-production`)

- Create it in Ireland (`eu-west-1`), matching every workspace's recorded data region.
- Point the `deploy-db` workflow's `production` environment at it (`SUPABASE_DB_URL` = its session
  pooler connection string), then run the workflow manually with approval to apply all migrations.
- Confirm `supabase migration list` matches `main` and the extensions match staging
  (`ltree`, `pg_cron`, `pgmq`, and `pg_net` for the jobs calls).
- Set Vault `app_url` and `jobs_secret`, and `JOBS_SECRET` in production Vercel to the same value,
  so the scheduled jobs reach the app. Never run `seed.sql` against production.

### 4. Point-in-time recovery and backups

Switch on Supabase Pro daily backups (7-day retention) and the PITR add-on. Run one restore test
(restore into a throwaway project, `supabase migration list`, sign in, check a workspace, delete
the project) and record the date and duration in the runbook's table. Verify the runbook's
"Restoring production" steps against the real project.

### 5. Production Vercel project

- Create a production Vercel project building from the repo root, server code in Dublin (`dub1`).
- Set its environment variables: `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (never the secret key), `NEXT_PUBLIC_SITE_URL` (the
  domain), `SMTP_URL`, `EMAIL_FROM`, `JOBS_SECRET`, `NEXT_PUBLIC_SENTRY_DSN` (plus the build-only
  Sentry source-map variables if used), and `WINDMORPH_PRO_TOKEN` for the private package install.
- Set the Supabase Auth Site URL and redirect allow-list to the domain.
- Keep preview and staging deploys off the production database.

### 6. Uptime and monitoring

Add an external uptime check of `/` and `/sign-in` every minute. Confirm Sentry receives a test
production error (browser, server, edge) with no personal data. The scheduled jobs' health stays
observable through `cron.job_run_details` and `net._http_response` as the runbook describes.

### 7. Data move from staging to production

This is the one step with real risk and an open decision (see below).

- Decide with the product owner exactly what moves (which workspaces and users; whether any
  staging-only test data is excluded) and the method (a Supabase dump/restore of the relevant
  data, preserving `auth.users` identities so sign-in keeps working).
- Take a production backup first, run the move, then verify: workspace/member/booking counts match
  the source; a known user signs in; a workspace's org chart, calendar and plan render.
- Tell affected users the new address, and settle staging's future role (kept as a non-production
  environment, or retired).

### 8. Launch checklist and documentation

A single checklist covers domain/DNS, Resend verified, production Supabase with PITR, production
Vercel with variables, Sentry wired, uptime check, data move verified, and the operator details in
`src/features/docs/pages.ts`. On completion, update `docs/runbook.md` and
`.kiro/steering/status.md` so the Environments tables name production and the "staging is the MVP"
framing is gone, then tick Phase 5 task 10 and the production parts of Phase 0 task 9.

## Open decisions (for the product owner)

1. **The domain itself** (name and registrar).
2. **Staging's future after launch:** kept as a non-production environment with non-production
   data, or retired. This changes whether the data move copies out of staging or promotes it.
3. **The data-move method:** full project promotion vs. a selective dump/restore, depending on
   decision 2 and how much staging data is real vs. test.

These are recorded here and should be settled (and written into `docs/product-decisions.md`) before
the corresponding tasks start. This design makes no assumption about them.

## Testing and verification

Launch is verified by observation, not unit tests (there is no new app logic):

- Email: a sign-up confirmation, password reset, invitation, instant notification and daily
  summary each arrive through Resend.
- Database: `supabase migration list` matches `main`; a scheduled job run appears in
  `cron.job_run_details`; `/api/jobs/notification-emails` returns success in `net._http_response`.
- App: production resolves over HTTPS on the domain; sign-in works; a moved workspace renders its
  org chart, calendar and plan.
- Recovery: one PITR restore test completed and recorded.

If any step uncovers an application bug, it is fixed on `main` with a test, following the normal
module-done rules in `.kiro/steering/testing.md`.
