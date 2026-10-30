# Requirements Document

## Introduction

Phase 1 delivers sign-in, workspaces, members, invitations, roles and permissions, features and
plans, the audit log, notifications, the adaptive app shell and the settings pages for these.
At the end, anyone can create a workspace from a template and invite people with the right access.

Sources: `docs/product-decisions.md` (sections 1, 2, 5, 6, 13 and Notifications),
`docs/rebuild-plan.md` (sections 2.1, 2.5, 3).

## Glossary

- **User**: a person with a Supabase Auth account (`auth.users`).
- **Profile**: a User's name, avatar, locale and time zone (`profiles`).
- **Workspace**: a tenant of kind `personal`, `team` or `company`.
- **Template**: the starting configuration chosen when creating a Workspace.
- **Member**: a person inside a Workspace (`members`); may or may not be linked to a User.
- **Owner**: a Member with `is_owner`; has every permission in the Workspace.
- **Feature**: a switchable module (e.g. `people`, `time`, `planning`) from the platform catalogue.
- **Plan**: a subscription plan deciding which Features a Workspace may enable.
- **Permission**: an action within a Feature (e.g. `people.view`, `time.approve`).
- **Reach**: whose data a Permission covers: `own`, `reports`, `team`, `team_and_below`,
  `units`, `workspace`.
- **Role**: a named set of (Permission, Reach) pairs in a Workspace.
- **Invitation**: an email invite to join a Workspace with a Role.
- **Audit_Log**: append-only record of sensitive changes.
- **Shell**: the app frame: navigation, page header, workspace switcher, user menu.

## Requirements

### Requirement 1: Sign up, sign in and recovery

**User Story:** As a visitor, I want to create an account and sign in with email or Google.

#### Acceptance Criteria

1. THE system SHALL let a visitor sign up with email and password (minimum 8 characters) and
   SHALL require email confirmation before first sign-in.
2. THE system SHALL let a visitor sign in with email and password or with Google.
3. WHEN a User requests a password reset, THE system SHALL email a reset link and SHALL let the
   User set a new password from it.
4. WHEN a signed-out visitor opens a page inside a Workspace, THE system SHALL redirect to sign-in
   and return to that page afterwards.
5. THE system SHALL verify the session on the server for every protected request.
6. THE auth design SHALL allow adding SSO per Workspace later without changing user identity.

### Requirement 2: Profile

**User Story:** As a User, I want my name, photo, language and time zone kept in one place.

#### Acceptance Criteria

1. WHEN a User account is created, THE system SHALL create its Profile in the same transaction.
2. THE system SHALL let a User edit their name, avatar (Supabase Storage), locale and time zone.
3. THE Profile time zone SHALL default to the browser's time zone at sign-up.

### Requirement 3: Create a workspace from a template

**User Story:** As a User, I want to create a workspace for myself, my team or my company.

#### Acceptance Criteria

1. THE system SHALL offer the templates Personal, Team and Company, each enabling its default
   Features (Personal: time; Team: people, time; Company: people, org chart, time, planning,
   rate cards).
2. WHEN a User creates a Workspace, THE system SHALL record its name, unique slug, kind, template,
   data region, country, time zone, currency, fiscal year start month, week start and Plan, with
   defaults from the User's locale and country.
3. WHEN a Workspace is created, THE system SHALL make the creator its Owner Member, seed the system
   Roles, enable the template's Features, and create the root org unit of its hierarchy.
4. WHEN a signed-in User belongs to no Workspace, THE system SHALL send them to onboarding.
5. THE slug SHALL be unique across the platform and editable by the Owner, and SHALL NOT be one of
   the reserved names the app uses (e.g. `admin`, `api`, `app`, `auth`, `settings`, `w`,
   `onboarding`, `account`, `invite`).
6. Any Workspace, including a personal one, SHALL be able to invite people; the kind only sets the
   starting configuration.

### Requirement 4: Switch between workspaces

**User Story:** As a User in several workspaces, I want to move between them quickly.

#### Acceptance Criteria

1. THE URL of every page inside a Workspace SHALL start with `/w/{slug}`.
2. THE Shell SHALL show a workspace switcher listing the User's Workspaces and a "Create
   workspace" action.
3. WHEN a User signs in, THE system SHALL open the Workspace they used last.
4. IF a User opens a Workspace they are not an active Member of, THEN THE system SHALL show a
   not-found page without revealing whether the Workspace exists.

### Requirement 5: Invitations

**User Story:** As an admin, I want to invite people by email with a role.

#### Acceptance Criteria

1. THE system SHALL let a Member with `workspace.invite` invite one or more emails with a Role.
2. THE system SHALL email each invitee a link that expires after 7 days.
3. WHEN an invitee opens the link, THE system SHALL let them sign in or sign up and then join the
   Workspace with the invited Role.
4. WHEN an Invitation's email matches an existing unlinked Member, THE system SHALL link that
   Member to the User instead of creating a new Member.
5. Email addresses SHALL be compared case-insensitively everywhere (members, invitations).
6. THE system SHALL let admins resend and revoke pending Invitations.
7. IF an Invitation is expired, revoked or already used, THEN THE system SHALL refuse it with a
   clear message.

### Requirement 6: Members

**User Story:** As an admin, I want to see and manage who is in the workspace.

#### Acceptance Criteria

1. THE system SHALL list Members with name, email, status (active, invited, inactive) and Roles.
2. THE system SHALL let a Member with `workspace.manage_members` change a Member's Roles and
   deactivate or reactivate them.
3. A deactivated Member SHALL lose access immediately and keep their history.
4. THE system SHALL let an Owner transfer ownership or add another Owner.
5. IF a change would leave a Workspace without an active Owner, THEN THE system SHALL refuse it.
6. THE system SHALL let a Member leave a Workspace, unless they are its last Owner.

### Requirement 7: Roles and permissions

**User Story:** As an admin, I want roles that give exactly the access each person needs.

#### Acceptance Criteria

1. THE platform SHALL define the catalogue of Features and their Permissions in migrations.
2. EACH Workspace SHALL have the system Role Admin (every Permission at `workspace` Reach), which
   SHALL NOT be edited or deleted. THE template SHALL also seed editable starter Roles: Team:
   Manager and Member; Company: HR, Finance, Manager and Member; Personal: none (the Owner has
   everything). Starter Roles that use `reports` or team Reach grant nothing for those
   Permissions until Phase 2 enforces those Reach levels.
3. THE system SHALL let admins create, edit, duplicate and archive custom Roles, choosing a Reach
   for each Permission.
4. (Phase 2) WHEN a Role with `units` Reach is assigned, THE system SHALL require choosing one or
   more org units, and the Reach SHALL cover those units and everything below them.
5. An Owner SHALL have every Permission at `workspace` Reach regardless of Roles.
6. Archived Roles SHALL grant nothing.
7. A Member SHALL only grant Roles whose Permissions they hold themselves at equal or wider Reach.

### Requirement 8: Enforcement in the database

**User Story:** As a product owner, I want access enforced by the database, so that no bug in the
UI can expose another workspace's data.

#### Acceptance Criteria

1. EVERY table SHALL have RLS enabled, denying access by default.
2. THE system SHALL provide the functions `app.current_member(ws)`, `app.feature_on(ws, feature)`,
   `app.reach(ws, permission)` and `app.can(ws, permission, target_member)`, and every policy
   SHALL use them.
3. A User SHALL NOT read or change any row of a Workspace they are not an active Member of.
4. WHEN a Feature is off for a Workspace, THE system SHALL refuse reads and writes of that
   Feature's data.
5. Phase 1 SHALL enforce `own` and `workspace` Reach. `reports`, `team`, `team_and_below` and
   `units` SHALL be built in Phase 2 together with the hierarchy tables they depend on, so no
   untested permission code ships; until then `app.can` refuses them.
6. Platform staff access SHALL use a separate `platform_admins` table and never a customer Role.

### Requirement 9: Features and plans

**User Story:** As an owner, I want to switch features on and off within what my plan allows.

#### Acceptance Criteria

1. THE platform SHALL define Feature dependencies (e.g. rate cards need planning; planning needs
   people).
2. WHEN an admin enables a Feature, THE system SHALL also enable the Features it needs, after
   showing them.
3. WHEN an admin disables a Feature that others depend on, THE system SHALL list the dependants
   and disable them too only after confirmation.
4. THE system SHALL NOT enable a Feature that the Workspace's Plan does not allow.
5. At launch every Workspace SHALL be on the Free plan, which allows all v1 Features.
6. Core Features (workspace, members, roles) SHALL NOT be disabled.

### Requirement 10: Audit log

**User Story:** As an admin, I want to know who changed access and settings, and when.

#### Acceptance Criteria

1. THE system SHALL record in the Audit_Log every change to Members, Roles, Role assignments,
   Invitations, Features and Workspace settings: actor, action, target, before and after, time.
2. THE Audit_Log SHALL be append-only for everyone, including Owners.
3. THE system SHALL let Members with `workspace.view_audit` browse and filter the Audit_Log.
4. THE Audit_Log SHALL be indexed by workspace and time so it stays fast at millions of rows.

### Requirement 11: Notifications

**User Story:** As a Member, I want to hear about things that need me, in the app and by email.

#### Acceptance Criteria

1. THE system SHALL show notifications in an in-app list that updates live.
2. THE system SHALL send the same notification by email when the User's preference for that
   category allows it.
3. THE system SHALL let each User choose email per category and choose a daily summary instead.
4. THE system SHALL let a User mark one or all notifications as read.
5. Phase 1 SHALL send notifications for invitations, role changes and ownership changes.
6. Notifications SHALL belong to a User, with the Workspace optional, so a person who is invited
   but not yet a Member can be notified.

### Requirement 12: App shell

**User Story:** As a Member, I want navigation that fits my screen and shows only what I can use.

#### Acceptance Criteria

1. THE Shell SHALL use a NavigationBar below 600px, and a collapsed NavigationRail (icons with
   labels) from 600px.
2. THE Shell SHALL show only modules whose Feature is on and for which the Member has a view
   Permission.
3. EACH page SHALL have one top app bar provided by the Shell's page header.
4. THE Shell SHALL provide a user menu with profile, theme (light, dark, system) and sign out.
5. THE Shell SHALL meet WCAG 2.2 AA, including a skip link and announced route changes.

### Requirement 13: Settings

**User Story:** As an admin, I want to manage the workspace from one place.

#### Acceptance Criteria

1. THE system SHALL provide settings pages for General (name, slug, country, time zone, currency,
   fiscal year start, week start), Members, Invitations, Roles, Features and Audit log, each shown
   only to Members with the matching Permission.
2. THE system SHALL provide personal settings for Profile and Notifications.
3. Settings pages SHALL use the list-detail layout on tablet and desktop, and show an "open on a
   larger screen" summary on phones for admin settings.
