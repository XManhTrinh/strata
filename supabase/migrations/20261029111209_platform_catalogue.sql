-- Platform catalogue: the features Strata offers, what each depends on, their permissions,
-- subscription plans, and the workspace templates with their starting features and roles.
-- The catalogue is the same for every workspace and only changes through migrations.

-- Whose data a permission covers. Ordered from narrowest to widest.
create type public.reach as enum ('own', 'reports', 'team', 'team_and_below', 'units', 'workspace');

create type public.workspace_kind as enum ('personal', 'team', 'company');

-- Features ---------------------------------------------------------------------------------------

create table public.features (
  key text primary key check (key ~ '^[a-z][a-z_]*$'),
  name text not null,
  description text not null,
  -- Core features are always on and cannot be disabled.
  is_core boolean not null default false,
  sort_order smallint not null
);

create table public.feature_dependencies (
  feature_key text not null references public.features (key) on delete cascade,
  requires_key text not null references public.features (key) on delete cascade,
  primary key (feature_key, requires_key),
  check (feature_key <> requires_key)
);

create index feature_dependencies_requires_key_idx on public.feature_dependencies (requires_key);

create table public.permissions (
  key text primary key check (key ~ '^[a-z][a-z_]*\.[a-z][a-z_]*$'),
  feature_key text not null references public.features (key) on delete cascade,
  name text not null,
  description text not null,
  -- Scoped permissions act on people, so their reach can be narrower than the whole workspace
  -- (e.g. approve leave for my reports). Unscoped ones (settings) are always workspace-wide.
  is_scoped boolean not null,
  sort_order smallint not null
);

create index permissions_feature_key_idx on public.permissions (feature_key);

-- Plans ------------------------------------------------------------------------------------------

create table public.subscription_plans (
  key text primary key check (key ~ '^[a-z][a-z_]*$'),
  name text not null
);

create table public.subscription_plan_features (
  plan_key text not null references public.subscription_plans (key) on delete cascade,
  feature_key text not null references public.features (key) on delete cascade,
  primary key (plan_key, feature_key)
);

create index subscription_plan_features_feature_key_idx
  on public.subscription_plan_features (feature_key);

-- Templates --------------------------------------------------------------------------------------

create table public.workspace_templates (
  key text primary key check (key ~ '^[a-z][a-z_]*$'),
  kind public.workspace_kind not null,
  name text not null,
  description text not null,
  sort_order smallint not null
);

create table public.template_features (
  template_key text not null references public.workspace_templates (key) on delete cascade,
  feature_key text not null references public.features (key) on delete cascade,
  primary key (template_key, feature_key)
);

create index template_features_feature_key_idx on public.template_features (feature_key);

-- Starter roles a template seeds into a new workspace. They are ordinary, editable roles.
create table public.template_roles (
  template_key text not null references public.workspace_templates (key) on delete cascade,
  role_key text not null check (role_key ~ '^[a-z][a-z_]*$'),
  name text not null,
  description text not null,
  sort_order smallint not null,
  primary key (template_key, role_key)
);

create table public.template_role_permissions (
  template_key text not null,
  role_key text not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  reach public.reach not null,
  primary key (template_key, role_key, permission_key),
  foreign key (template_key, role_key)
    references public.template_roles (template_key, role_key) on delete cascade
);

create index template_role_permissions_permission_key_idx
  on public.template_role_permissions (permission_key);

-- Unscoped permissions are always granted workspace-wide.
create function app.check_reach_allowed()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.reach <> 'workspace'
    and not (select p.is_scoped from public.permissions p where p.key = new.permission_key)
  then
    raise exception 'Permission % applies to the whole workspace; its reach must be "workspace".',
      new.permission_key
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger check_reach_allowed
  before insert or update on public.template_role_permissions
  for each row execute function app.check_reach_allowed();

-- Access: the catalogue is readable by signed-in users and changed only by migrations.
alter table public.features enable row level security;
alter table public.feature_dependencies enable row level security;
alter table public.permissions enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscription_plan_features enable row level security;
alter table public.workspace_templates enable row level security;
alter table public.template_features enable row level security;
alter table public.template_roles enable row level security;
alter table public.template_role_permissions enable row level security;

grant select on
  public.features,
  public.feature_dependencies,
  public.permissions,
  public.subscription_plans,
  public.subscription_plan_features,
  public.workspace_templates,
  public.template_features,
  public.template_roles,
  public.template_role_permissions
to authenticated;

create policy "Signed-in users can read features" on public.features
  for select to authenticated using (true);
create policy "Signed-in users can read feature dependencies" on public.feature_dependencies
  for select to authenticated using (true);
create policy "Signed-in users can read permissions" on public.permissions
  for select to authenticated using (true);
create policy "Signed-in users can read plans" on public.subscription_plans
  for select to authenticated using (true);
create policy "Signed-in users can read plan features" on public.subscription_plan_features
  for select to authenticated using (true);
create policy "Signed-in users can read templates" on public.workspace_templates
  for select to authenticated using (true);
create policy "Signed-in users can read template features" on public.template_features
  for select to authenticated using (true);
create policy "Signed-in users can read template roles" on public.template_roles
  for select to authenticated using (true);
create policy "Signed-in users can read template role permissions"
  on public.template_role_permissions
  for select to authenticated using (true);

-- Catalogue data ---------------------------------------------------------------------------------

insert into public.features (key, name, description, is_core, sort_order) values
  ('workspace', 'Workspace', 'Workspace settings, features and audit log.', true, 10),
  ('members', 'Members', 'People in the workspace and invitations.', true, 20),
  ('roles', 'Roles', 'Roles and permissions.', true, 30),
  ('people', 'People', 'Directory, profiles, hierarchy, positions, custom fields and import.', false, 40),
  ('org_chart', 'Org chart', 'Reporting chart and hierarchy views.', false, 50),
  ('time', 'Calendar and time off', 'Calendar, time types, leave, allowances and approvals.', false, 60),
  ('planning', 'Capacity planning', 'Scenarios, planned roles and allocations.', false, 70),
  ('rate_cards', 'Rate cards', 'Cost rules applied to people and planned roles.', false, 80);

insert into public.feature_dependencies (feature_key, requires_key) values
  ('org_chart', 'people'),
  ('planning', 'people'),
  ('rate_cards', 'planning');

insert into public.permissions (key, feature_key, name, description, is_scoped, sort_order) values
  ('workspace.manage_settings', 'workspace', 'Manage workspace settings', 'Change name, address, region settings, currency and fiscal year.', false, 10),
  ('workspace.manage_features', 'workspace', 'Manage features', 'Switch features on and off.', false, 20),
  ('workspace.view_audit', 'workspace', 'View audit log', 'See who changed access and settings, and when.', false, 30),

  ('members.view', 'members', 'View members', 'See who is in the workspace.', true, 10),
  ('members.invite', 'members', 'Invite members', 'Invite people by email and manage pending invitations.', false, 20),
  ('members.manage', 'members', 'Manage members', 'Deactivate and reactivate members.', true, 30),

  ('roles.view', 'roles', 'View roles', 'See roles and their permissions.', false, 10),
  ('roles.manage', 'roles', 'Manage roles', 'Create, edit, duplicate and archive roles.', false, 20),
  ('roles.assign', 'roles', 'Assign roles', 'Give roles to members and take them away.', true, 30),

  ('people.view', 'people', 'View people', 'See people''s profiles.', true, 10),
  ('people.edit', 'people', 'Edit people', 'Change people''s details, team, manager and position.', true, 20),
  ('people.view_compensation', 'people', 'View pay', 'See salary and day rate.', true, 30),
  ('people.edit_compensation', 'people', 'Edit pay', 'Change salary and day rate.', true, 40),
  ('people.import', 'people', 'Import people', 'Upload people files and apply the changes.', false, 50),
  ('people.export', 'people', 'Export people', 'Download people lists.', true, 60),
  ('people.manage_structure', 'people', 'Manage structure', 'Edit hierarchy, positions, career levels, employment types and custom fields.', false, 70),

  ('org_chart.view', 'org_chart', 'View org chart', 'See the reporting chart and hierarchy.', true, 10),

  ('time.view', 'time', 'View time off', 'See people''s bookings and balances.', true, 10),
  ('time.book', 'time', 'Book time', 'Book time off and events.', true, 20),
  ('time.book_for_others', 'time', 'Book for others', 'Book time on someone else''s behalf.', true, 30),
  ('time.approve', 'time', 'Approve time off', 'Approve and reject requests.', true, 40),
  ('time.adjust_allowance', 'time', 'Adjust allowances', 'Correct people''s balances.', true, 50),
  ('time.manage_settings', 'time', 'Manage time settings', 'Edit time types, allowance policies, work schedules and holiday calendars.', false, 60),

  ('planning.view', 'planning', 'View plans', 'See scenarios, allocations and costs.', true, 10),
  ('planning.edit', 'planning', 'Edit plans', 'Change allocations and planned roles.', true, 20),
  ('planning.approve', 'planning', 'Approve plans', 'Submit, approve and lock scenarios.', false, 30),
  ('planning.manage_settings', 'planning', 'Manage planning settings', 'Planning period, horizon, units and rules.', false, 40),

  ('rate_cards.view', 'rate_cards', 'View rate cards', 'See rate cards and rates.', false, 10),
  ('rate_cards.edit', 'rate_cards', 'Edit rate cards', 'Create and change rate cards.', false, 20),
  ('rate_cards.apply', 'rate_cards', 'Apply rate cards', 'Apply rate cards to a scenario.', false, 30);

insert into public.subscription_plans (key, name) values ('free', 'Free');

-- At launch the Free plan allows every v1 feature.
insert into public.subscription_plan_features (plan_key, feature_key)
select 'free', key from public.features;

insert into public.workspace_templates (key, kind, name, description, sort_order) values
  ('personal', 'personal', 'Personal', 'Your own calendar and time off.', 10),
  ('team', 'team', 'Team', 'A manager and their team: people, calendar and time off.', 20),
  ('company', 'company', 'Company', 'A whole organization: people, structure, time off, capacity and cost planning.', 30);

-- Core features are always on, so templates list only the optional ones.
insert into public.template_features (template_key, feature_key) values
  ('personal', 'time'),
  ('team', 'people'),
  ('team', 'org_chart'),
  ('team', 'time'),
  ('company', 'people'),
  ('company', 'org_chart'),
  ('company', 'time'),
  ('company', 'planning'),
  ('company', 'rate_cards');

insert into public.template_roles (template_key, role_key, name, description, sort_order) values
  ('team', 'manager', 'Manager', 'Manages their reports: approves time off and edits their details.', 20),
  ('team', 'member', 'Member', 'Sees colleagues and books their own time.', 30),
  ('company', 'hr', 'HR', 'Manages people, structure and time off across the workspace.', 20),
  ('company', 'finance', 'Finance', 'Sees pay and runs capacity and cost planning.', 30),
  ('company', 'manager', 'Manager', 'Manages their reports: approves time off and edits their details.', 40),
  ('company', 'member', 'Member', 'Sees colleagues and books their own time.', 50);

-- Shared starter permissions for Member and Manager in both templates.
insert into public.template_role_permissions (template_key, role_key, permission_key, reach)
select t.template_key, 'member', p.permission_key, p.reach
from (values ('team'), ('company')) as t (template_key)
cross join (values
  ('members.view', 'workspace'::public.reach),
  ('people.view', 'workspace'),
  ('people.view_compensation', 'own'),
  ('org_chart.view', 'workspace'),
  ('time.view', 'team'),
  ('time.book', 'own')
) as p (permission_key, reach);

insert into public.template_role_permissions (template_key, role_key, permission_key, reach)
select t.template_key, 'manager', p.permission_key, p.reach
from (values ('team'), ('company')) as t (template_key)
cross join (values
  ('members.view', 'workspace'::public.reach),
  ('people.view', 'workspace'),
  ('people.edit', 'reports'),
  ('people.view_compensation', 'reports'),
  ('people.export', 'reports'),
  ('org_chart.view', 'workspace'),
  ('time.view', 'team_and_below'),
  ('time.book', 'own'),
  ('time.book_for_others', 'reports'),
  ('time.approve', 'reports')
) as p (permission_key, reach);

-- Capacity planning is on only in the Company template.
insert into public.template_role_permissions (template_key, role_key, permission_key, reach) values
  ('company', 'manager', 'planning.view', 'team_and_below');

insert into public.template_role_permissions (template_key, role_key, permission_key, reach) values
  ('company', 'hr', 'members.view', 'workspace'),
  ('company', 'hr', 'members.invite', 'workspace'),
  ('company', 'hr', 'members.manage', 'workspace'),
  ('company', 'hr', 'roles.view', 'workspace'),
  ('company', 'hr', 'people.view', 'workspace'),
  ('company', 'hr', 'people.edit', 'workspace'),
  ('company', 'hr', 'people.view_compensation', 'workspace'),
  ('company', 'hr', 'people.edit_compensation', 'workspace'),
  ('company', 'hr', 'people.import', 'workspace'),
  ('company', 'hr', 'people.export', 'workspace'),
  ('company', 'hr', 'people.manage_structure', 'workspace'),
  ('company', 'hr', 'org_chart.view', 'workspace'),
  ('company', 'hr', 'time.view', 'workspace'),
  ('company', 'hr', 'time.book', 'own'),
  ('company', 'hr', 'time.book_for_others', 'workspace'),
  ('company', 'hr', 'time.approve', 'workspace'),
  ('company', 'hr', 'time.adjust_allowance', 'workspace'),
  ('company', 'hr', 'time.manage_settings', 'workspace'),

  ('company', 'finance', 'members.view', 'workspace'),
  ('company', 'finance', 'people.view', 'workspace'),
  ('company', 'finance', 'people.view_compensation', 'workspace'),
  ('company', 'finance', 'people.export', 'workspace'),
  ('company', 'finance', 'org_chart.view', 'workspace'),
  ('company', 'finance', 'time.view', 'workspace'),
  ('company', 'finance', 'time.book', 'own'),
  ('company', 'finance', 'planning.view', 'workspace'),
  ('company', 'finance', 'planning.edit', 'workspace'),
  ('company', 'finance', 'planning.approve', 'workspace'),
  ('company', 'finance', 'planning.manage_settings', 'workspace'),
  ('company', 'finance', 'rate_cards.view', 'workspace'),
  ('company', 'finance', 'rate_cards.edit', 'workspace'),
  ('company', 'finance', 'rate_cards.apply', 'workspace');
