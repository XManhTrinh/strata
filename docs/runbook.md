# Runbook

How Strata runs in staging and production, and what to do when something goes wrong. For now
there is no production: staging is the MVP people use, so the production steps below apply to
staging until a production project exists.

## Environments

| Environment | Web                            | Database                      | Email   |
| ----------- | ------------------------------ | ----------------------------- | ------- |
| Local       | `pnpm dev` (port 3000)         | `supabase start` (Docker)     | Mailpit |
| Staging     | Vercel preview/staging, `dub1` | Supabase project, `eu-west-1` | Resend  |
| Production  | Not yet (staging is the MVP)   | Later                         | Resend  |

## Deploying

- **App:** Vercel builds every push; `main` deploys to production once the domain is set up.
- **Database:** `.github/workflows/deploy-db.yml` applies migrations to staging when they land on
  `main`; production runs only by hand (Actions → Deploy database migrations → production), and
  the production environment asks for approval. It shows the pending migrations and does a dry run
  first.
- Migrations are forward only. To undo one, write a new migration.

## Configuration

App (Vercel environment variables):

| Variable                               | What                                                    |
| -------------------------------------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | The Supabase project URL                                |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Its publishable key (never the secret key)              |
| `NEXT_PUBLIC_SITE_URL`                 | The app's public URL, used in emails                    |
| `SMTP_URL`, `EMAIL_FROM`               | Resend's SMTP URL and the sender; without them no email |
| `JOBS_SECRET`                          | Shared with the database's scheduler (below)            |
| `NEXT_PUBLIC_SENTRY_DSN`               | Error monitoring; leave empty to switch it off          |
| `SENTRY_AUTH_TOKEN`                    | Build only: uploads source maps to Sentry (optional)    |
| `SENTRY_ORG`, `SENTRY_PROJECT`         | Build only, with the token: where source maps go        |

Database (Supabase → Vault): `app_url` (the app's URL) and `jobs_secret` (same value as
`JOBS_SECRET`). Without them the scheduler skips calling the app; nothing else breaks.

```sql
select vault.create_secret('https://app.example.com', 'app_url');
select vault.create_secret('<long random value>', 'jobs_secret');
-- To change one later:
select vault.update_secret((select id from vault.secrets where name = 'jobs_secret'), '<new value>');
```

Rotating the jobs secret: set the new value in Vault and in Vercel, then redeploy. Calls in
between fail with 404 and the next minute's call catches up; nothing is lost.

## Scheduled jobs (pg_cron, UTC)

| Job                         | When      | What                                                    |
| --------------------------- | --------- | ------------------------------------------------------- |
| `notification-emails`       | every min | Asks the app to send due notification emails            |
| `deactivate-leavers`        | 00:20     | Marks people past their last day inactive               |
| `rebuild-reporting-closure` | 00:15     | Applies future-dated manager changes                    |
| `settle-allowances`         | 00:30     | Accrual and carry-over                                  |
| `apply-retention`           | 01:40     | Each workspace's retention rules                        |
| `remind-approvals`          | 06:00     | Reminds approvers about requests waiting 2 working days |

Checking them:

```sql
-- Recent runs and failures.
select j.jobname, d.status, d.return_message, d.start_time
from cron.job_run_details d join cron.job j using (jobid)
order by d.start_time desc limit 50;

-- The app's answers to the email job (last hour).
select status_code, content, error_msg, created from net._http_response
where created > now() - interval '1 hour' order by created desc;

-- Emails failing or waiting.
select email_attempts, email_error, count(*) from public.notifications
where emailed_at is null and email_attempts > 0 group by 1, 2;
```

## Monitoring

- **Errors:** Sentry (EU data storage) for server, edge and browser errors once
  `NEXT_PUBLIC_SENTRY_DSN` is set. No session replay; no personal data is sent by default.
  Browser events go through the app (`/monitoring`), so ad blockers and the CSP don't drop them.
- **Uptime:** an external check of `/` and `/sign-in` every minute (set up with the domain).
- **Database:** Supabase → Reports and Advisors (security and performance); look weekly.
- **Load:** the nightly workflow runs `pnpm db:load` (100k people) and fails on slow queries.

## Backups and recovery

- Supabase Pro takes a daily backup, kept 7 days. Production also needs the **point-in-time
  recovery** add-on (switched on at launch): restore to any second within the last 7 days.
- Staging keeps daily backups only.
- Restoring replaces the whole database. For one workspace's mistake, prefer the app's own
  undo (imports) or the audit log, which shows each change's before and after values.
- **Test a restore every quarter:** restore production's PITR into a new project, run
  `supabase migration list` against it, sign in, check a workspace, then delete the project.
  Note the date and how long it took below.

| Date | Restored to | Time taken | Notes |
| ---- | ----------- | ---------- | ----- |

### Restoring production

1. Decide the time to restore to (from the audit log or Sentry, just before the problem).
2. Tell workspace owners the app will be unavailable; the restore takes the database offline.
3. Supabase → Database → Backups → Point in time → choose the time → Restore. It takes minutes
   to hours depending on size; the project is unavailable meanwhile.
4. Check: `supabase migration list` matches `main`; sign in; open a workspace; check the cron
   jobs ran (`cron.job_run_details`).
5. Take the app out of maintenance. Tell affected workspace owners what was lost (changes after
   the restore point).

## Incidents

1. **Assess:** what is broken, since when, who is affected (Sentry, Vercel logs, Supabase logs).
2. **Contain:** roll back the app in Vercel (Deployments → Promote a previous one); a bad
   migration needs a new migration, or a restore.
3. **Personal data breach:** if personal data may have been exposed, write down what, whose and
   when. Tell affected organizations (they are the controllers) without undue delay, so they can
   meet GDPR's 72-hour notice to their authority; for our own account data, notify ANSPDCP within
   72 hours ourselves.
4. **After:** a short write-up (what happened, why, what changes) in `docs/incidents/`.

## Requests from people and organizations

- **Export or erasure** of someone's data: the organization does it in Strata (People → person
  → Actions). People can download their own data and delete their account from Account.
- **An organization leaving:** the owner exports what they need, then deletes the workspace;
  backups roll over within 7 days.
- **Sub-processor change:** update `/legal/sub-processors` and email workspace owners 30 days
  before it takes effect.
