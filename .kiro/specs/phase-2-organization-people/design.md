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

## Load results (100,000 people)

`pnpm db:load` seeds a local workspace (`supabase/load/seed.sql`: 100,002 people, a 5-level tree
of 1,156 units, about 500,000 reporting lines, earlier job records for a fifth of people, pay and
custom field values, and viewers with narrower reaches) in about 40 seconds, then runs
`supabase/load/checks.sql`: each check as a real user through the app's functions and policies, the
median of five runs after a warm-up. Measured on 2026-10-30 on a laptop (OrbStack):

| Check                                         | First run  | After fixes | Target  |
| --------------------------------------------- | ---------- | ----------- | ------- |
| Directory, first page (whole workspace)       | 589ms      | 168ms       | 300ms   |
| Directory, division filter (~20k)             | 649ms      | 74ms        | 300ms   |
| Directory, page 1,000                         | 1,002ms    | 240ms       | 300ms   |
| Export page of 5,000                          | 1,136ms    | 181ms       | 2,000ms |
| Org chart from a tribe lead                   | 2,593ms    | 105ms       | 300ms   |
| Unit headcount                                | 402ms      | 53ms        | 300ms   |
| Directory, reports reach (~20k)               | 278ms      | 97ms        | 300ms   |
| Directory, team and below (~800)              | 311ms      | 57ms        | 300ms   |
| Org chart, team and below                     | 2,797ms    | 60ms        | 300ms   |
| Directory, granted unit (~4k)                 | 372ms      | 63ms        | 300ms   |
| Import: stage 100k rows                       | 40.6s      | 0.5s        | 30s     |
| Import: preview 100k rows                     | over 8 min | 4.9s        | 30s     |
| Import: apply one chunk of 1,000 changed rows | 136ms      | 161ms       | 10s     |

What fixed them (migration `import_at_scale`):

- **Plan per call.** The directory, org chart and visibility functions take very different paths
  depending on their arguments; PL/pgSQL's cached generic plan kept every path open after five
  calls (up to 20 times slower). They now use `plan_cache_mode = force_custom_plan`.
- **Visibility from what is held.** `app.visible_members` starts from the caller's reports and the
  job records in their units (unit index) instead of checking every person.
- **One pass, not one lookup per row.** The directory reads everyone's current job in one pass;
  the org chart counts direct reports once; the import preview finds duplicate keys with a window
  function and builds everyone's current values in one query (`app.member_snapshots`).
- **Staging per batch.** `import_stage_rows` checks permission and status once per batch of up to
  5,000 rows; direct inserts into `import_rows` are closed.
