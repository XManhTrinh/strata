---
inclusion: always
---

# Strata: project structure

```
strata/
├── src/
│   ├── app/
│   │   ├── (marketing)/              landing and legal pages
│   │   ├── (auth)/                   sign-in, sign-up, reset, auth/callback, auth/confirm
│   │   ├── onboarding/               create workspace from a template, accept invite
│   │   ├── w/[workspace]/            everything inside a workspace, by slug
│   │   │   ├── layout.tsx            shell: navigation, top app bar, workspace switcher
│   │   │   ├── page.tsx              role dashboard
│   │   │   └── <module>/             people, org-chart, hierarchy, calendar, time-off,
│   │   │                             approvals, planning, rate-cards, settings
│   │   └── api/                      calendar feed, exports, webhooks
│   ├── features/<module>/
│   │   ├── components/               module UI
│   │   ├── actions.ts                Server Actions ("use server"), zod-validated
│   │   ├── queries.ts                server-side reads
│   │   ├── schemas.ts                zod schemas shared by forms and actions
│   │   └── types.ts
│   ├── components/
│   │   ├── shell/                    adaptive navigation, page header, workspace switcher
│   │   └── ui/                       components Windmorph lacks (DataTable, DataGrid, tree...)
│   ├── lib/                          supabase clients, auth, i18n, permissions, formatting, motion
│   ├── messages/en.json              all UI text
│   └── proxy.ts                      session refresh and verification
├── supabase/
│   ├── migrations/                   the only source of the schema
│   ├── functions/                    Edge Functions
│   ├── tests/                        pgTAP
│   └── seed.sql                      demo personal, team and company workspaces
├── e2e/                              Playwright
├── docs/                             architecture, product decisions, rebuild plan
└── .kiro/                            steering and specs
```

## Conventions

- **Pages stay thin:** load data, check access, render the feature component.
- **Files:** `kebab-case.tsx` for components, `use-<name>.ts` for hooks, `kebab-case.ts` utils.
- **Exports:** named exports only (Next.js route files excepted); barrels only in `components/ui`.
- **Components** stay under ~200 lines; extract sub-components or hooks beyond that.
- **No `any`**; use proper types, generics or `unknown`. Database types come from
  `supabase gen types` (`src/lib/supabase/database.types.ts`, regenerated, never hand-edited).
- **All UI text** comes from `messages/en.json` through `next-intl`; no hard-coded strings.
- **Imports:** `@/*` maps to `src/*`.
- Components in `components/ui` are written as future `@windmorph/react-pro` components:
  Windmorph-style API, tokens only, no Strata imports.
