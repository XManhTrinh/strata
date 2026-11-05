# Implementation Plan: Production launch (Phase 5 task 10)

Requirements and design: `requirements.md` and `design.md` in this folder. This completes Phase 5
task 10 and the production halves of Phase 0 task 9.

Most of this is configuration and operations that need the product owner's accounts (domain
registrar, Resend, Supabase Pro, Vercel, Sentry) and three open decisions in `design.md`. The
steps are ordered so each is verified before the next depends on it; the live cut-over (DNS and
the data move) comes last. No new application code is expected.

## Tasks

- [ ] 0. Settle the open decisions in `design.md` (domain and registrar; staging's future after
      launch; the data-move method), and record them in `docs/product-decisions.md`
  - _Requirements: 1.1, 7.1, 7.2_

- [ ] 1. Domain and DNS (needs the product owner)
  - [ ] 1.1 Register the domain and host its DNS where Vercel and Resend records can be added
    - _Requirements: 1.1_
  - [ ] 1.2 Wire the domain to the production Vercel project; the apex/host resolves over HTTPS
        with a valid certificate (after task 5)
    - _Requirements: 1.2_
  - [ ] 1.3 Set `NEXT_PUBLIC_SITE_URL` to the domain and set the Supabase Auth Site URL and
        redirect allow-list to it
    - _Requirements: 1.3, 1.4_

- [ ] 2. Email through Resend (needs the product owner)
  - [ ] 2.1 Verify the sender domain in Resend (SPF, DKIM, DMARC)
    - _Requirements: 2.1_
  - [ ] 2.2 Set `SMTP_URL` and `EMAIL_FROM` in production Vercel; app email sends with no code
        change
    - _Requirements: 2.2_
  - [ ] 2.3 Configure Supabase Auth custom SMTP on production with the Resend credentials
    - _Requirements: 2.3, 2.4_
  - [ ] 2.4 Verify a sign-up confirmation, password reset, invitation, instant notification and
        daily-summary email each arrive; confirm the fallbacks still work if a send fails
    - _Requirements: 2.5, 2.6_

- [ ] 3. Production Supabase project (needs the product owner)
  - [ ] 3.1 Create `strata-production` in Ireland (`eu-west-1`)
    - _Requirements: 3.1_
  - [ ] 3.2 Point the `deploy-db` `production` environment at it (`SUPABASE_DB_URL`) and apply all
        migrations by an approved manual run; `supabase migration list` matches `main`
    - _Requirements: 3.2, 3.3_
  - [ ] 3.3 Confirm the extensions match staging (`ltree`, `pg_cron`, `pgmq`, `pg_net`)
    - _Requirements: 3.4_
  - [ ] 3.4 Set Vault `app_url` and `jobs_secret`, and `JOBS_SECRET` in production Vercel to match;
        confirm no seed/demo data ran
    - _Requirements: 3.5, 3.6_

- [ ] 4. Point-in-time recovery and backups (needs the product owner)
  - [ ] 4.1 Switch on Supabase Pro daily backups (7-day retention) and the PITR add-on
    - _Requirements: 4.1_
  - [ ] 4.2 Run one restore test and record the date and duration in the runbook's table; verify
        the "Restoring production" steps
    - _Requirements: 4.2, 4.3_

- [ ] 5. Production Vercel project (needs the product owner)
  - [ ] 5.1 Create the production Vercel project building from the repo root, server code in
        Dublin (`dub1`)
    - _Requirements: 5.1_
  - [ ] 5.2 Set the production environment variables (Supabase URL and publishable key,
        `NEXT_PUBLIC_SITE_URL`, `SMTP_URL`, `EMAIL_FROM`, `JOBS_SECRET`, `NEXT_PUBLIC_SENTRY_DSN`,
        build-only Sentry variables if used)
    - _Requirements: 5.2_
  - [ ] 5.3 Provide `WINDMORPH_PRO_TOKEN` so the production build installs the private package;
        confirm preview/staging never use the production database
    - _Requirements: 5.3, 5.4_
  - [ ] 5.4 Confirm Sentry receives a test production error (browser, server, edge) with no
        personal data
    - _Requirements: 5.5_

- [ ] 6. Uptime and monitoring (needs the product owner)
  - [ ] 6.1 Add an external uptime check of `/` and `/sign-in` every minute
    - _Requirements: 6.1_
  - [ ] 6.2 Confirm the scheduled jobs' health is observable (`cron.job_run_details`,
        `net._http_response`)
    - _Requirements: 6.2_

- [ ] 7. Data move from staging to production (the live cut-over; needs decision 0)
  - [ ] 7.1 Take a production backup, then run the agreed move, preserving `auth.users` identities
    - _Requirements: 7.2, 7.3_
  - [ ] 7.2 Verify workspace/member/booking counts match the source; a known user signs in; a
        workspace's org chart, calendar and plan render
    - _Requirements: 7.3_
  - [ ] 7.3 Tell affected users the new address and settle staging's future role
    - _Requirements: 7.4_

- [ ] 8. Launch checklist and documentation
  - [ ] 8.1 Complete the launch checklist (domain/DNS, Resend verified, production Supabase with
        PITR, production Vercel with variables, Sentry wired, uptime check, data move verified,
        operator details in `src/features/docs/pages.ts`)
    - _Requirements: 8.1_
  - [ ] 8.2 Update `docs/runbook.md` and `.kiro/steering/status.md` so the Environments tables name
        production and the "staging is the MVP" framing is replaced
    - _Requirements: 8.2, 8.4_
  - [ ] 8.3 Tick Phase 5 task 10 in `.kiro/specs/phase-5-completion-launch/tasks.md` and the
        production parts of Phase 0 task 9
    - _Requirements: 8.3_
