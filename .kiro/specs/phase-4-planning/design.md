# Design Document (outline): Phase 4 planning

The table design is `docs/rebuild-plan.md` section 2.4. Rules to port from `main` (and re-test)
are `apps/api/src/rate-cards/rate-card-engine.ts` and `apps/api/src/capacity/capacity.service.ts`,
generalized:

- Cards are evaluated by ascending priority; the first non-default card whose conditions all match
  wins, otherwise the first default card. A non-default card with no conditions never matches.
- Operators: equals, not equals, starts with, starts with any (comma list), ends with, contains,
  in (comma list); values trimmed and compared case-insensitively.
- Monthly cost for a period = day rate × working days of the rate valid for that period.
- Cost of an allocation = FTE × the person's cost snapshot for that period; employment types with
  the annual-salary cost method use salary ÷ 12 unless a rate card matches.
- Totals roll up through `org_unit_closure`.

The engine is a pure TypeScript module (`src/features/planning/rate-card-engine.ts`) with full
unit tests; the apply job calls it and writes `cost_snapshots` through an RPC in batches.

Known gaps from the audit that the design removes: no authorization, unchecked foreign IDs in
bulk upserts, demo seed endpoints in production, no engine tests.

Full design is written when the phase starts.
