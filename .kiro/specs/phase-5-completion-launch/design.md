# Design Document: Phase 5 completion and launch

Approved 2026-11-02 (decisions: `docs/product-decisions.md` sections 12, 13 and 15).

- **Dashboards** are Server Components over one RPC, `home_summary(workspace)`, which returns
  only the cards the caller may see; numbers and simple bars in Windmorph tokens, no chart library.
- **GDPR export** is one RPC returning everything about a person as JSON (self, or the
  `people.personal_data` permission). **Erasure** is one transaction (`erase_member`): name to
  "Former employee", email, key, pay, custom values, notes, comments and photo removed, the
  person's values scrubbed from the audit log, history kept anonymised, and a row in
  `member_erasures` (who, when, why; no personal data). **Delete my account** removes the auth
  user (members keep their history without the link). **Retention** (`data_retention`, one row
  per workspace) runs nightly from `pg_cron`.
- **Load tests** use the seed generator from Phase 2 and run nightly in CI.
- **Security review** checklist: RLS on every table (pgTAP 000), every RPC re-checks permissions,
  no service key in user paths, secrets only in server env, dependency audit clean.
- **Notification emails** (moved from Phase 3, approved): `notifications` gains
  `emailed_at`, `email_attempts`, `email_error` and `email_claimed_at` (a 10-minute lease);
  `claim_notification_emails` and `mark_notification_emails` claim a due batch and record the
  result, retrying up to 5 times and never sending anything over 3 days old. They take the jobs
  secret (checked against Vault), so the app calls them without the service key. Instant emails wait about 2 minutes and are skipped if already read in the app;
  the daily summary goes at 08:00 in the person's time zone with what is still unread.
  Invitations keep their own email. `app.remind_pending_approvals()` runs nightly and notifies an
  approver once (`booking_approvals.reminded_at`) when a request has waited over 2 working days.
  pg_cron calls `/api/jobs/notification-emails` every minute through `pg_net` with the secret
  (Vault `app_url` and `jobs_secret`; `JOBS_SECRET` in the app); the route sends with React Email and does nothing where no email provider is set.

- **Accessibility audit (2026-11-02):** axe (WCAG 2.2 AA) on every screen at 390, 834 and
  1440 px, with the demo data (10k people) and with a new workspace. Found and fixed: the
  calendar's "+N more" link and the org chart's reports button were under 24 px; seven audited
  tables had no name in the audit log. `e2e/accessibility.spec.ts` now sweeps every screen at
  each width in CI, and pgTAP `035` keeps the audit log's table names in step with the
  triggers. Known: on the pannable org chart a card can sit under the zoom buttons until it is
  moved; dialogs are checked in each feature's own e2e. A manual screen reader pass (VoiceOver,
  NVDA) is still worth doing before launch.

Full design is written when the phase starts.
