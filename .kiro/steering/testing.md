---
inclusion: fileMatch
fileMatchPattern: "{e2e/**,supabase/tests/**,**/*.test.ts,**/*.test.tsx}"
---

# Strata: testing

| Level      | Tool                              | Location                       | Covers                                                                                                      |
| ---------- | --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Database   | pgTAP (`supabase test db`)        | `supabase/tests`               | Every RLS policy per role, every RPC including failures, working-day calculation, closure maintenance       |
| Unit       | Vitest                            | next to the code (`*.test.ts`) | Rate-card engine, cost maths, import mapping and change detection, formatting, zod schemas, component logic |
| End to end | Playwright                        | `e2e/`                         | Main journeys at phone (390px), tablet (834px) and desktop (1440px) widths                                  |
| Load       | Seed generator + scripted queries | `supabase/tests/load`          | 100k-member workspace (nightly)                                                                             |

## Rules

- Business rules ported from `main` get tests first, using the old behaviour as the reference,
  then the known bugs listed in the audit are fixed and covered by tests.
- Tests use the local Supabase stack; never a shared or production database.
- No snapshot tests of whole pages; test behaviour.
- Accessibility checks (axe) run in the Playwright suite for every page.

## A module is done when

Migrations, RLS tests, RPC tests, unit tests, screens at all three widths, an end-to-end happy
path, audit logging and English strings are complete, and CI is green.

## Performance targets (DataTable / DataGrid)

First rows visible < 100ms after data arrives; 60 fps scrolling through 100k rows; < 16ms per
keystroke in a grid cell; sort/filter of 100k people (server) < 300ms.
