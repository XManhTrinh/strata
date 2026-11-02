# Implementation Plan: Phase 5 completion and launch

Design and decisions: `design.md` (approved 2026-11-02). Resend and the domain come last.

## Tasks

- [x] 1. Role dashboards on Home: `home_summary` with the cards the caller may see (balances,
      upcoming time off, requests waiting; who's away and approvals for managers; headcount,
      starters and leavers, FTE and cost from the live plan for finance and admins)
- [x] 2. Personal data: "Export and erase personal data" permission; export (self from Account,
      anyone with the permission); erase in one step with `member_erasures`; delete my account
- [x] 3. Retention: `data_retention` per workspace with defaults, settings screen, nightly job
- [ ] 4. Notification emails against Mailpit: instant and daily summary per preference, approval
      reminders, the every-minute job with a secret (sends once an email provider is set)
- [ ] 5. Help for each module and legal pages (privacy, terms, DPA, sub-processors)
- [ ] 6. Accessibility audit of every screen at three widths; fixes
- [ ] 7. Security review of every policy and RPC; dependency audit
- [ ] 8. Monitoring (Sentry, off until a DSN is set), backups and point-in-time recovery, runbook
- [ ] 9. Domain, Resend (app and Auth email), production project, launch checklist
