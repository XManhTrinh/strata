---
inclusion: fileMatch
fileMatchPattern: "supabase/**"
---

# Strata: database (Supabase Postgres)

The table design is in `docs/rebuild-plan.md` section 2. Follow it; change it there first if a
change is needed.

## Migrations

- `supabase/migrations` is the **only** source of the schema. Create files with
  `supabase migration new <name>`; never edit a migration that has reached staging.
- Never change a hosted database by hand or run `supabase db push` from a laptop; migrations
  reach staging (automatically, on merge to `main`) and production (manual run, with approval)
  only through `.github/workflows/deploy-db.yml`.
- Regenerate types (`supabase gen types typescript --local`) after every migration and commit them.
- Seed data (`supabase/seed.sql`) is demo data only and never runs in production.

## Table rules

- snake_case names. Every tenant table has `id uuid primary key default gen_random_uuid()`,
  `workspace_id uuid not null references workspaces`, `created_at`, `updated_at` (trigger).
- **No uniqueness across workspaces**; unique constraints include `workspace_id`.
- Every foreign key is declared, with an index. Every user reference points to `auth.users(id)`
  or to `members(id)`; there is one user ID (`auth.users.id`).
- Money columns always have a `currency` column beside them. Numeric money uses `numeric`.
- Archive (`archived_at`) instead of deleting reference data; people become `inactive`.
- **Effective-dated** tables use `valid_from date not null`, `valid_to date` (null = open) and an
  exclusion constraint preventing overlaps.
- Balances are ledgers: rows of changes, the balance is their sum.
- Sensitive tables (compensation, roles, approvals, settings) have audit triggers.

## Security

- **RLS enabled on every table**, with policies for select/insert/update/delete as needed.
- **Nothing is exposed by default:** new tables, sequences and functions in `public` have no
  privileges for `anon` or `authenticated`. Each migration grants exactly what it needs (e.g.
  `grant select, insert on public.members to authenticated;`, `grant execute on function
public.create_workspace(...) to authenticated;`) next to its policies. `anon` gets nothing unless
  a feature is genuinely public.
- An event trigger enables RLS on every new `public` table as a safety net; still write
  `alter table ... enable row level security` in each migration.
- Policies use the permission functions only: `current_member(ws)`, `feature_on(ws, feature)`,
  `reach(ws, permission)`, `can(ws, permission, target_member)`. Do not re-implement checks.
- Functions: `security definer` only when required, always `set search_path = ''` and fully
  qualified names; `stable` where possible. Wrap `auth.uid()` as `(select auth.uid())` in policies.
- Multi-step changes are RPCs that check permissions themselves and run in one transaction.
- The service key bypasses RLS: only jobs/Edge Functions may use it, and they must filter by
  workspace explicitly.

## Performance

Designed for workspaces of 100k members: index every `workspace_id` + lookup column; reach checks
use closure tables (`reporting_closure`, `org_unit_closure`) and `ltree`, never a recursive walk
per row; paginate on the server.

## Tests

Every policy and RPC has pgTAP tests in `supabase/tests`, signing in as: owner, admin, HR with
"specific units", line manager, team lead, member, and a user from another workspace. Test the
refusals as well as the allowed cases.
