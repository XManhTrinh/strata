# Design Document (outline): Phase 5 completion and launch

- **Dashboards** are Server Components built from SQL views (headcount, FTE, cost, away today,
  pending approvals); charts use `@visx` with Windmorph tokens.
- **GDPR export** and **erasure** run as jobs (`docs/rebuild-plan.md` 1.2); erasure replaces
  personal fields with "Former employee" placeholders and deletes compensation and free-text
  notes, keeping aggregate history intact. Retention rules run nightly from `pg_cron`.
- **Load tests** use the seed generator from Phase 2 and run nightly in CI.
- **Security review** checklist: RLS on every table (pgTAP 000), every RPC re-checks permissions,
  no service key in user paths, secrets only in server env, dependency audit clean.

Full design is written when the phase starts.
