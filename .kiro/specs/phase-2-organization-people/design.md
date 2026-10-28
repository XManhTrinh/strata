# Design Document (outline): Phase 2 organization and people

The table design is `docs/rebuild-plan.md` section 2.2; screens are in section 3 (People,
Org chart, Hierarchy, Import). Business rules to port from `main` (and re-test) are the CSV import
rules in `apps/api/src/people/company-people.service.ts`, generalized:

- Org path columns build the unit tree using the workspace's levels (no fixed level names).
- Grade maps to a career level; missing positions are created and their level range widened.
- A person in several teams at import gets an even FTE split (handed to Phase 4 as the initial
  allocation of the live scenario).
- Line managers are matched by person key, email or a chosen field, always within the workspace.

Known bugs from the audit that the design removes: two user-ID spaces, global manager uniqueness,
missing tenant filters, imported units without paths, in-process imports lost on restart.

Full design is written when the phase starts.
