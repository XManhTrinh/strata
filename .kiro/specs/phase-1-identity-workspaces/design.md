# Design Document: Phase 1 identity and workspaces

## Overview

Tables from `docs/rebuild-plan.md` section 2.1, the permission functions from section 2.5, and
the Shell, Auth, Onboarding and Settings screens from section 3.

## Data model (Phase 1 tables)

```
profiles(id → auth.users, full_name, avatar_path, locale, time_zone, last_workspace_id)
subscription_plans(key, name)                 seeded: free
subscription_plan_features(plan_key, feature_key)
features(key, name, is_core)                  seeded
feature_dependencies(feature_key, requires_key)
permissions(key, feature_key, name)           seeded, e.g. people.view, time.approve
workspaces(id, name, slug unique, kind, template, data_region, country, time_zone, currency,
           fiscal_year_start_month, week_start, plan_key, settings jsonb)
workspace_features(workspace_id, feature_key, enabled)
members(id, workspace_id, user_id → auth.users null, person_key, full_name, email citext,
        country, time_zone, status, is_owner)
        unique (workspace_id, user_id), unique (workspace_id, email)
invitations(id, workspace_id, email citext, role_id, member_id null, token_hash, expires_at,
            invited_by, accepted_at, revoked_at)
roles(id, workspace_id, name, is_system, system_key, archived_at)
role_permissions(role_id, permission_key, reach)
member_roles(id, workspace_id, member_id, role_id, assigned_by)
org_units(id, workspace_id, parent_id, name, path ltree)        root only in Phase 1
audit_log(id, workspace_id, actor_user_id, action, table_name, row_id, before, after, at)
        index (workspace_id, at desc)
notifications(id, user_id, workspace_id null, category, payload jsonb, read_at, created_at)
notification_preferences(user_id, category, email boolean, digest boolean)
platform_admins(user_id)
```

`citext` (case-insensitive text) is enabled for email columns. `workspaces.slug` is checked against
a reserved list. `member_role_units` is created in Phase 2 with the `units` reach.

`reach` is an enum: `own`, `reports`, `team`, `team_and_below`, `units`, `workspace`, ordered by
width for "widest reach" comparisons (with `units` handled as a set).

## Permission functions

```sql
app.current_member(ws uuid) returns uuid          -- active member id of auth.uid() in ws
app.is_owner(ws uuid) returns boolean
app.feature_on(ws uuid, feature text) returns boolean   -- plan allows and enabled
app.reach(ws uuid, permission text) returns app.reach_grant
                                                  -- widest reach + unit ids, owner = workspace
app.can(ws uuid, permission text, target uuid) returns boolean
  -- own: target = current member
  -- workspace: target is a member of ws
  -- reports, team, team_and_below, units: refused in Phase 1; built in Phase 2 with
  --   org_unit_closure and reporting_closure (and member_role_units for units)
```

All are `stable`, `security definer`, `set search_path = ''`. Policies call them with
`(select auth.uid())` patterns so they are evaluated once per statement where possible.

## RPCs (transactional)

| RPC                                                                           | Does                                                                                                  |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `create_workspace(name, kind, template, settings)`                            | Workspace, Owner member, system roles, template features (+ dependencies), root org unit, audit entry |
| `accept_invitation(token)`                                                    | Validates token, links or creates the member, assigns the role, marks used, notifies inviter          |
| `set_feature(ws, feature, enabled, confirm_dependants)`                       | Applies dependency rules and plan limits                                                              |
| `assign_role(ws, member, role, unit_ids)` / `remove_role(...)`                | Enforces "grant only what you hold"                                                                   |
| `transfer_ownership(ws, to_member)` / `set_member_status(ws, member, status)` | Enforces "at least one active owner"                                                                  |

Simple single-row changes (rename workspace, edit role name, mark notification read) go through
RLS-protected updates from Server Actions.

## Triggers

- `on auth.users insert` → create `profiles` row.
- Audit triggers on `members`, `roles`, `role_permissions`, `member_roles`, `invitations`,
  `workspace_features`, `workspaces`.
- `notifications insert` → enqueue an email job in `pgmq` when preferences allow.

## Email

An Edge Function consumes the email queue and sends through Resend with React Email templates
(invite, role changed, ownership changed, daily digest). The digest runs from `pg_cron` each
morning in each user's time zone.

## Screens

| Route                                                                        | Screen                                             |
| ---------------------------------------------------------------------------- | -------------------------------------------------- |
| `/sign-in`, `/sign-up`, `/reset-password`, `/auth/callback`, `/auth/confirm` | Auth                                               |
| `/onboarding`                                                                | Template picker and workspace details              |
| `/invite/[token]`                                                            | Accept invitation                                  |
| `/w/[workspace]`                                                             | Placeholder dashboard (real dashboards in Phase 5) |
| `/w/[workspace]/settings/{general,members,invitations,roles,features,audit}` | Workspace settings                                 |
| `/account/{profile,notifications}`                                           | Personal settings                                  |

The Shell lives in `src/components/shell` and reads the member's effective permissions once per
request on the server (`app.reach` for each view permission), passing a plain map to the client
for hiding navigation items.

## Testing

- pgTAP: isolation between two workspaces for every table; each RPC's rules and refusals; owner
  invariants; feature dependency rules; audit log append-only; `own` and `workspace` reach.
- Vitest: zod schemas, permission map helpers.
- Playwright: sign-up → onboarding → invite → accept in a second browser → role-limited
  navigation, at phone, tablet and desktop widths.
