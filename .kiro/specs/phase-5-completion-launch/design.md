# Design Document (outline): Phase 5 completion and launch

- **Dashboards** are Server Components built from SQL views (headcount, FTE, cost, away today,
  pending approvals); charts use `@visx` with Windmorph tokens.
- **GDPR export** and **erasure** run as jobs (`docs/rebuild-plan.md` 1.2); erasure replaces
  personal fields with "Former employee" placeholders and deletes compensation and free-text
  notes, keeping aggregate history intact. Retention rules run nightly from `pg_cron`.
- **Load tests** use the seed generator from Phase 2 and run nightly in CI.
- **Security review** checklist: RLS on every table (pgTAP 000), every RPC re-checks permissions,
  no service key in user paths, secrets only in server env, dependency audit clean.
- **Notification emails** (draft from Phase 3, not yet approved): `notifications` gains
  `emailed_at`, `email_attempts` and `email_error`; `app.claim_notification_emails` and
  `app.mark_notification_emails` (job role only) claim a due batch and record the result, retrying
  up to 5 times. Instant emails wait about 2 minutes and are skipped if already read in the app;
  the daily summary goes at 08:00 in the person's time zone with what is still unread.
  Invitations keep their own email. `app.remind_pending_approvals()` runs nightly and notifies an
  approver once (`booking_approvals.reminded_at`) when a request has waited over 2 working days.
  pg_cron calls `/api/jobs/notification-emails` every minute through `pg_net` with a secret; the
  route sends with React Email and does nothing where no email provider is set.

Full design is written when the phase starts.
