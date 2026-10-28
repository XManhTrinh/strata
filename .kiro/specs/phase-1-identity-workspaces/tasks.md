# Implementation Plan: Phase 1 identity and workspaces

## Overview

Database first (tables, functions, policies, tests), then auth flows, onboarding, shell,
settings, and notifications. Every migration lands with its pgTAP tests.

## Tasks

- [ ] 1. Platform catalogue
  - [ ] 1.1 Migration: `features`, `feature_dependencies`, `permissions`, `subscription_plans`,
        `subscription_plan_features`, seeded with the v1 catalogue and the Free plan
    - _Requirements: 7.1, 9.1, 9.5_
  - [ ] 1.2 pgTAP: catalogue is read-only for users
    - _Requirements: 8.1_

- [ ] 2. Profiles
  - [ ] 2.1 Migration: `profiles` with RLS and the `auth.users` insert trigger
    - _Requirements: 2.1_
  - [ ] 2.2 pgTAP: a user sees and edits only their own profile
    - _Requirements: 2.2, 8.1_

- [ ] 3. Workspaces, members and roles
  - [ ] 3.1 Migration: `workspaces`, `workspace_features`, `members`, `roles`,
        `role_permissions`, `member_roles`, `member_role_units`, `org_units`, `org_unit_closure`,
        `reporting_closure`, `member_last_workspace`, `platform_admins`
    - _Requirements: 3.2, 6.1, 7.2, 8.6_
  - [ ] 3.2 Permission functions `app.current_member`, `app.is_owner`, `app.feature_on`,
        `app.reach`, `app.can`
    - _Requirements: 8.2, 8.5, 7.4, 7.5, 7.6_
  - [ ] 3.3 RLS policies for every table above
    - _Requirements: 8.1, 8.3, 8.4_
  - [ ] 3.4 RPC `create_workspace` with template features, system roles and root org unit
    - _Requirements: 3.1, 3.3_
  - [ ] 3.5 RPCs `assign_role`, `remove_role`, `transfer_ownership`, `set_member_status`
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 7.7_
  - [ ] 3.6 RPC `set_feature` with dependency and plan rules
    - _Requirements: 9.2, 9.3, 9.4, 9.6_
  - [ ] 3.7 pgTAP: cross-workspace isolation, owner invariants, grant-only-what-you-hold,
        feature rules, `own` and `workspace` reach
    - _Requirements: 6.5, 7.7, 8.3, 8.4, 8.5, 9.2–9.6_

- [ ] 4. Invitations
  - [ ] 4.1 Migration: `invitations` with RLS; RPC `accept_invitation`
    - _Requirements: 5.1, 5.3, 5.4, 5.6_
  - [ ] 4.2 pgTAP: expiry, revocation, reuse, linking to existing member
    - _Requirements: 5.4, 5.6_

- [ ] 5. Audit log
  - [ ] 5.1 Migration: `audit_log` (append-only) and audit triggers
    - _Requirements: 10.1, 10.2_
  - [ ] 5.2 pgTAP: entries written; no updates or deletes possible
    - _Requirements: 10.1, 10.2_

- [ ] 6. Notifications
  - [ ] 6.1 Migration: `notifications`, `notification_preferences`, email queue trigger,
        Realtime publication
    - _Requirements: 11.1, 11.2, 11.3_
  - [ ] 6.2 Edge Function: email worker (Resend + React Email templates) and daily digest schedule
    - _Requirements: 11.2, 11.3, 11.5_
  - [ ] 6.3 pgTAP: users see only their own notifications
    - _Requirements: 11.1_

- [ ] 7. Auth flows
  - [ ] 7.1 Sign-up, sign-in (email, Google), reset password, callback and confirm routes
    - _Requirements: 1.1, 1.2, 1.3_
  - [ ] 7.2 Proxy protection of `/w/*`, `/onboarding`, `/account/*` with return-to
    - _Requirements: 1.4, 1.5_

- [ ] 8. Onboarding and switching
  - [ ] 8.1 Onboarding: template picker and workspace details form calling `create_workspace`
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [ ] 8.2 Invitation accept page
    - _Requirements: 5.3, 5.6_
  - [ ] 8.3 `/w/[workspace]` layout resolving the member, last-workspace redirect, not-found for
        non-members
    - _Requirements: 4.1, 4.3, 4.4_

- [ ] 9. Shell
  - [ ] 9.1 Adaptive navigation (bar / rail / expanded rail), page header, skip link, route
        announcer
    - _Requirements: 12.1, 12.3, 12.5_
  - [ ] 9.2 Workspace switcher and user menu (profile, theme, sign out)
    - _Requirements: 4.2, 12.4_
  - [ ] 9.3 Server-computed permission map hiding unavailable modules
    - _Requirements: 12.2_
  - [ ] 9.4 Notification bell with live list and mark-as-read
    - _Requirements: 11.1, 11.4_

- [ ] 10. Settings
  - [ ] 10.1 General settings
    - _Requirements: 13.1, 3.5_
  - [ ] 10.2 Members and invitations (invite, resend, revoke, roles, deactivate, ownership)
    - _Requirements: 5.1, 5.2, 5.5, 6.1–6.6, 13.1_
  - [ ] 10.3 Roles editor (permissions × reach, specific units picker, duplicate, archive)
    - _Requirements: 7.2–7.4, 7.6, 13.1_
  - [ ] 10.4 Features page with dependency confirmations
    - _Requirements: 9.2, 9.3, 9.6, 13.1_
  - [ ] 10.5 Audit log browser with filters
    - _Requirements: 10.3, 13.1_
  - [ ] 10.6 Personal profile (avatar upload) and notification preferences
    - _Requirements: 2.2, 2.3, 11.3, 13.2_
  - [ ] 10.7 Phone behaviour: "open on a larger screen" for admin settings
    - _Requirements: 13.3_

- [ ] 11. End-to-end
  - [ ] 11.1 Playwright: sign-up → onboarding → invite → accept → role-limited navigation, at
        three widths, with axe checks
    - _Requirements: 1, 3, 5, 12_
