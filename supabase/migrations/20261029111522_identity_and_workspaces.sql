-- Identity and workspaces: profiles, workspaces, members, roles, the permission functions every
-- policy uses, and the actions (RPCs) that change several rows at once.

create extension if not exists citext with schema extensions;

-- Shared checks -----------------------------------------------------------------------------------

create function app.check_time_zone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.time_zone is not null
    and not exists (select 1 from pg_catalog.pg_timezone_names where name = new.time_zone)
  then
    raise exception 'Unknown time zone: %', new.time_zone using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

-- Web addresses the app itself uses, which workspaces cannot take.
create function app.is_reserved_slug(p_slug text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select lower(p_slug) = any (array[
    'account', 'accounts', 'admin', 'api', 'app', 'assets', 'auth', 'dashboard', 'docs', 'help',
    'invite', 'invites', 'login', 'logout', 'mail', 'new', 'onboarding', 'settings', 'sign-in',
    'sign-up', 'signin', 'signup', 'static', 'status', 'support', 'w', 'www'
  ]);
$$;

-- Profiles ----------------------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 200),
  avatar_path text check (char_length(avatar_path) <= 500),
  locale text not null default 'en' check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  time_zone text not null default 'UTC',
  last_workspace_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.profiles
  for each row execute function app.set_updated_at();
create trigger check_time_zone before insert or update of time_zone on public.profiles
  for each row execute function app.check_time_zone();

-- Every new account gets a profile in the same transaction.
create function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_time_zone text := new.raw_user_meta_data ->> 'time_zone';
begin
  if v_time_zone is null
    or not exists (select 1 from pg_catalog.pg_timezone_names where name = v_time_zone)
  then
    v_time_zone := 'UTC';
  end if;

  insert into public.profiles (id, full_name, time_zone)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', ''), 200),
    v_time_zone
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function app.handle_new_user();

-- Workspaces --------------------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 100),
  -- Globally unique: it is the workspace's web address (/w/<slug>).
  slug text not null unique
    check (slug ~ '^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$' and not app.is_reserved_slug(slug)),
  kind public.workspace_kind not null,
  template_key text not null references public.workspace_templates (key),
  data_region text not null default 'eu-west-1',
  country char(2) not null check (country ~ '^[A-Z]{2}$'),
  time_zone text not null,
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  fiscal_year_start_month smallint not null default 1 check (fiscal_year_start_month between 1 and 12),
  -- ISO weekday: 1 = Monday … 7 = Sunday.
  week_start smallint not null default 1 check (week_start between 1 and 7),
  plan_key text not null default 'free' references public.subscription_plans (key),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index workspaces_template_key_idx on public.workspaces (template_key);
create index workspaces_plan_key_idx on public.workspaces (plan_key);
create index workspaces_created_by_idx on public.workspaces (created_by);

create trigger set_updated_at before update on public.workspaces
  for each row execute function app.set_updated_at();
create trigger check_time_zone before insert or update of time_zone on public.workspaces
  for each row execute function app.check_time_zone();

alter table public.profiles
  add constraint profiles_last_workspace_id_fkey
  foreign key (last_workspace_id) references public.workspaces (id) on delete set null;
create index profiles_last_workspace_id_idx on public.profiles (last_workspace_id);

-- Optional features switched on or off per workspace. Core features are always on.
create table public.workspace_features (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  feature_key text not null references public.features (key) on delete cascade,
  enabled boolean not null,
  updated_at timestamptz not null default now(),
  primary key (workspace_id, feature_key)
);

create index workspace_features_feature_key_idx on public.workspace_features (feature_key);

create trigger set_updated_at before update on public.workspace_features
  for each row execute function app.set_updated_at();

-- Members -----------------------------------------------------------------------------------------

create type public.member_status as enum ('active', 'invited', 'inactive');

-- A person in a workspace. `user_id` stays null for people who never sign in (e.g. imported).
create table public.members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid references auth.users (id) on delete set null,
  person_key text check (char_length(person_key) between 1 and 100),
  full_name text not null check (char_length(btrim(full_name)) between 1 and 200),
  email extensions.citext check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  country char(2) check (country ~ '^[A-Z]{2}$'),
  time_zone text,
  status public.member_status not null default 'active',
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, user_id),
  unique (workspace_id, email),
  unique (workspace_id, person_key),
  constraint members_owner_is_active_user check (not is_owner or (status = 'active' and user_id is not null))
);

create index members_user_id_idx on public.members (user_id);

create trigger set_updated_at before update on public.members
  for each row execute function app.set_updated_at();
create trigger check_time_zone before insert or update of time_zone on public.members
  for each row execute function app.check_time_zone();

-- A workspace must always keep at least one active owner. Checked at commit, so ownership can
-- move between members inside one transaction.
create function app.check_workspace_has_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.workspaces w where w.id = old.workspace_id)
    and not exists (
      select 1 from public.members m
      where m.workspace_id = old.workspace_id and m.is_owner and m.status = 'active'
    )
  then
    raise exception 'A workspace must keep at least one active owner.'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create constraint trigger check_workspace_has_owner
  after update or delete on public.members
  deferrable initially deferred
  for each row execute function app.check_workspace_has_owner();

create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Roles -------------------------------------------------------------------------------------------

create table public.roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name extensions.citext not null check (char_length(btrim(name::text)) between 1 and 60),
  description text not null default '' check (char_length(description) <= 300),
  -- System roles (only 'admin') cannot be edited or deleted.
  system_key text check (system_key = 'admin'),
  -- The starter role this was seeded from, for information only.
  template_role_key text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  unique (workspace_id, system_key)
);

create trigger set_updated_at before update on public.roles
  for each row execute function app.set_updated_at();

create table public.role_permissions (
  workspace_id uuid not null,
  role_id uuid not null,
  permission_key text not null references public.permissions (key) on delete cascade,
  reach public.reach not null,
  primary key (role_id, permission_key),
  foreign key (workspace_id, role_id) references public.roles (workspace_id, id) on delete cascade
);

create index role_permissions_workspace_role_idx on public.role_permissions (workspace_id, role_id);
create index role_permissions_permission_key_idx on public.role_permissions (permission_key);

create trigger check_reach_allowed
  before insert or update on public.role_permissions
  for each row execute function app.check_reach_allowed();

create table public.member_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  member_id uuid not null,
  role_id uuid not null,
  assigned_by uuid references auth.users (id) on delete set null,
  assigned_at timestamptz not null default now(),
  unique (member_id, role_id),
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, role_id) references public.roles (workspace_id, id) on delete cascade
);

create index member_roles_workspace_member_idx on public.member_roles (workspace_id, member_id);
create index member_roles_workspace_role_idx on public.member_roles (workspace_id, role_id);
create index member_roles_role_id_idx on public.member_roles (role_id);
create index member_roles_assigned_by_idx on public.member_roles (assigned_by);

-- Permission functions ----------------------------------------------------------------------------
-- Every policy and RPC uses these; nothing re-implements the checks.

-- The caller's active member id in a workspace, or null.
create function app.current_member_id(p_workspace_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from public.members m
  where m.workspace_id = p_workspace_id
    and m.user_id = (select auth.uid())
    and m.status = 'active';
$$;

create function app.is_member(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.current_member_id(p_workspace_id) is not null;
$$;

create function app.is_owner(p_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.members m
    where m.workspace_id = p_workspace_id
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and m.is_owner
  );
$$;

-- On when the feature is core, or the plan allows it and the workspace has it switched on.
create function app.feature_on(p_workspace_id uuid, p_feature_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.features f where f.key = p_feature_key and f.is_core)
    or exists (
      select 1
      from public.workspace_features wf
      join public.workspaces w on w.id = wf.workspace_id
      join public.subscription_plan_features spf
        on spf.plan_key = w.plan_key and spf.feature_key = wf.feature_key
      where wf.workspace_id = p_workspace_id
        and wf.feature_key = p_feature_key
        and wf.enabled
    );
$$;

-- The reaches the caller holds for a permission (empty when none, or its feature is off).
-- Owners hold every permission workspace-wide.
create function app.held_reaches(p_workspace_id uuid, p_permission_key text)
returns public.reach[]
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when app.current_member_id(p_workspace_id) is null then '{}'::public.reach[]
    when not app.feature_on(
      p_workspace_id,
      (select p.feature_key from public.permissions p where p.key = p_permission_key)
    ) then '{}'::public.reach[]
    when app.is_owner(p_workspace_id) then array['workspace']::public.reach[]
    else coalesce(
      (
        select array_agg(distinct rp.reach)
        from public.member_roles mr
        join public.roles r on r.id = mr.role_id and r.archived_at is null
        join public.role_permissions rp on rp.role_id = r.id and rp.permission_key = p_permission_key
        where mr.workspace_id = p_workspace_id
          and mr.member_id = app.current_member_id(p_workspace_id)
      ),
      '{}'::public.reach[]
    )
  end;
$$;

-- Holds the permission at any reach (for workspace-wide actions and showing menus).
create function app.has_permission(p_workspace_id uuid, p_permission_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select cardinality(app.held_reaches(p_workspace_id, p_permission_key)) > 0;
$$;

-- Can the caller use the permission on this member? Phase 1 enforces 'own' and 'workspace';
-- 'reports', 'team', 'team_and_below' and 'units' are refused until Phase 2 builds them.
create function app.can(p_workspace_id uuid, p_permission_key text, p_target_member_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with held as (select app.held_reaches(p_workspace_id, p_permission_key) as reaches)
  select
    (
      'workspace' = any (held.reaches)
      and exists (
        select 1 from public.members m
        where m.id = p_target_member_id and m.workspace_id = p_workspace_id
      )
    )
    or ('own' = any (held.reaches) and p_target_member_id = app.current_member_id(p_workspace_id))
  from held;
$$;

-- Does holding these reaches allow granting the wanted reach to someone else?
create function app.reach_covers(p_held public.reach[], p_wanted public.reach)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select 'workspace' = any (p_held)
    or p_wanted = any (p_held)
    or (p_wanted = 'team' and 'team_and_below' = any (p_held))
    or (p_wanted = 'own' and cardinality(p_held) > 0);
$$;

grant usage on schema app to authenticated;
grant execute on function
  app.current_member_id(uuid),
  app.is_member(uuid),
  app.is_owner(uuid),
  app.feature_on(uuid, text),
  app.held_reaches(uuid, text),
  app.has_permission(uuid, text),
  app.can(uuid, text, uuid)
to authenticated;

-- Role protection ---------------------------------------------------------------------------------

-- The Admin role is fixed: its permissions change only while a workspace is being created.
create function app.protect_system_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role_id uuid := coalesce(new.role_id, old.role_id);
begin
  if coalesce(current_setting('app.seeding_workspace', true), '') <> 'on'
    and exists (select 1 from public.roles r where r.id = v_role_id and r.system_key is not null)
  then
    raise exception 'The Admin role cannot be changed.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_system_roles
  before insert or update or delete on public.role_permissions
  for each row execute function app.protect_system_roles();

create function app.protect_system_role_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.system_key is not null then
    raise exception 'The Admin role cannot be changed.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_system_role_row
  before update or delete on public.roles
  for each row execute function app.protect_system_role_row();

-- Editing a role cannot grant more than the editor holds (owners excepted).
create function app.check_role_permission_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null
    and coalesce(current_setting('app.seeding_workspace', true), '') <> 'on'
    and not app.is_owner(new.workspace_id)
    and not app.reach_covers(app.held_reaches(new.workspace_id, new.permission_key), new.reach)
  then
    raise exception 'You can only grant permissions you hold yourself (%).', new.permission_key
      using errcode = 'insufficient_privilege';
  end if;
  return new;
end;
$$;

create trigger check_role_permission_escalation
  before insert or update on public.role_permissions
  for each row execute function app.check_role_permission_escalation();

-- Access rules ------------------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_features enable row level security;
alter table public.members enable row level security;
alter table public.platform_admins enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.member_roles enable row level security;

-- Profiles: your own, and those of people you share an active workspace with.
grant select on public.profiles to authenticated;
grant update (full_name, avatar_path, locale, time_zone, last_workspace_id) on public.profiles
  to authenticated;

create policy "Users can read their own profile and co-members' profiles" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1
      from public.members them
      join public.members me
        on me.workspace_id = them.workspace_id
       and me.user_id = (select auth.uid())
       and me.status = 'active'
      where them.user_id = profiles.id
    )
  );

create policy "Users can update their own profile" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and (last_workspace_id is null or app.is_member(last_workspace_id))
  );

-- Workspaces: members read; settings managers update the settings columns. Created by RPC.
grant select on public.workspaces to authenticated;
grant update (name, slug, country, time_zone, currency, fiscal_year_start_month, week_start)
  on public.workspaces to authenticated;

create policy "Members can read their workspaces" on public.workspaces
  for select to authenticated
  using (app.is_member(id));

create policy "Settings managers can update workspace settings" on public.workspaces
  for update to authenticated
  using (app.has_permission(id, 'workspace.manage_settings'))
  with check (app.has_permission(id, 'workspace.manage_settings'));

-- Features: members read which are on; changed only through set_feature.
grant select on public.workspace_features to authenticated;

create policy "Members can read workspace features" on public.workspace_features
  for select to authenticated
  using (app.is_member(workspace_id));

-- Members: everyone sees their own row; others need members.view for that person.
grant select on public.members to authenticated;

create policy "Members can see members they are allowed to view" on public.members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or app.can(workspace_id, 'members.view', id)
  );

-- Roles: role names are visible to members; definitions need roles.view or roles.manage.
grant select on public.roles to authenticated;
grant insert (workspace_id, name, description) on public.roles to authenticated;
grant update (name, description, archived_at) on public.roles to authenticated;

create policy "Members can read roles" on public.roles
  for select to authenticated
  using (app.is_member(workspace_id));

create policy "Role managers can create roles" on public.roles
  for insert to authenticated
  with check (app.has_permission(workspace_id, 'roles.manage'));

create policy "Role managers can update roles" on public.roles
  for update to authenticated
  using (app.has_permission(workspace_id, 'roles.manage'))
  with check (app.has_permission(workspace_id, 'roles.manage'));

grant select, insert, update, delete on public.role_permissions to authenticated;

create policy "Role viewers can read role permissions" on public.role_permissions
  for select to authenticated
  using (
    app.has_permission(workspace_id, 'roles.view')
    or app.has_permission(workspace_id, 'roles.manage')
  );

create policy "Role managers can add role permissions" on public.role_permissions
  for insert to authenticated
  with check (app.has_permission(workspace_id, 'roles.manage'));

create policy "Role managers can change role permissions" on public.role_permissions
  for update to authenticated
  using (app.has_permission(workspace_id, 'roles.manage'))
  with check (app.has_permission(workspace_id, 'roles.manage'));

create policy "Role managers can remove role permissions" on public.role_permissions
  for delete to authenticated
  using (app.has_permission(workspace_id, 'roles.manage'));

-- Role assignments: visible with the member; changed only through assign_role / remove_role.
grant select on public.member_roles to authenticated;

create policy "Members can see role assignments of members they can view" on public.member_roles
  for select to authenticated
  using (
    member_id = app.current_member_id(workspace_id)
    or app.can(workspace_id, 'members.view', member_id)
  );

-- platform_admins: no access for app users (service role only).

-- Actions -----------------------------------------------------------------------------------------

-- Enables a feature and every optional feature it depends on, within the plan.
create function app.enable_feature_with_dependencies(p_workspace_id uuid, p_feature_key text)
returns setof text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
begin
  for v_key in
    with recursive needed (key) as (
      select p_feature_key
      union
      select d.requires_key from public.feature_dependencies d join needed n on n.key = d.feature_key
    )
    select n.key from needed n join public.features f on f.key = n.key and not f.is_core
  loop
    if not exists (
      select 1 from public.workspaces w
      join public.subscription_plan_features spf on spf.plan_key = w.plan_key
      where w.id = p_workspace_id and spf.feature_key = v_key
    ) then
      raise exception 'Your plan does not include %.', v_key using errcode = 'insufficient_privilege';
    end if;

    insert into public.workspace_features (workspace_id, feature_key, enabled)
    values (p_workspace_id, v_key, true)
    on conflict (workspace_id, feature_key) do update set enabled = true
      where not public.workspace_features.enabled;

    if found then
      return next v_key;
    end if;
  end loop;
end;
$$;

-- Creates a workspace from a template: the caller becomes its owner with the Admin role; the
-- template's features (with dependencies) and starter roles are set up.
create function public.create_workspace(
  p_name text,
  p_slug text,
  p_template_key text,
  p_country text,
  p_time_zone text,
  p_currency text,
  p_fiscal_year_start_month smallint default 1,
  p_week_start smallint default 1
)
returns public.workspaces
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_workspace public.workspaces;
  v_member_id uuid;
  v_admin_role_id uuid;
  v_role record;
  v_feature text;
begin
  if v_user_id is null then
    raise exception 'Sign in to create a workspace.' using errcode = 'insufficient_privilege';
  end if;

  insert into public.workspaces (
    name, slug, kind, template_key, country, time_zone, currency, fiscal_year_start_month,
    week_start, created_by
  )
  select btrim(p_name), lower(btrim(p_slug)), t.kind, t.key, upper(p_country), p_time_zone,
    upper(p_currency), p_fiscal_year_start_month, p_week_start, v_user_id
  from public.workspace_templates t
  where t.key = p_template_key
  returning * into v_workspace;

  if v_workspace.id is null then
    raise exception 'Unknown template: %', p_template_key using errcode = 'invalid_parameter_value';
  end if;

  insert into public.members (workspace_id, user_id, full_name, email, is_owner, status)
  select v_workspace.id, u.id,
    coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)),
    u.email, true, 'active'
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_user_id
  returning id into v_member_id;

  perform set_config('app.seeding_workspace', 'on', true);

  insert into public.roles (workspace_id, name, description, system_key)
  values (v_workspace.id, 'Admin', 'Full access to everything in the workspace.', 'admin')
  returning id into v_admin_role_id;

  insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
  select v_workspace.id, v_admin_role_id, p.key, 'workspace'
  from public.permissions p;

  for v_role in
    select tr.role_key, tr.name, tr.description
    from public.template_roles tr
    where tr.template_key = p_template_key
    order by tr.sort_order
  loop
    with created as (
      insert into public.roles (workspace_id, name, description, template_role_key)
      values (v_workspace.id, v_role.name, v_role.description, v_role.role_key)
      returning id
    )
    insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
    select v_workspace.id, created.id, trp.permission_key, trp.reach
    from created
    join public.template_role_permissions trp
      on trp.template_key = p_template_key and trp.role_key = v_role.role_key;
  end loop;

  perform set_config('app.seeding_workspace', 'off', true);

  insert into public.member_roles (workspace_id, member_id, role_id, assigned_by)
  values (v_workspace.id, v_member_id, v_admin_role_id, v_user_id);

  for v_feature in
    select tf.feature_key from public.template_features tf where tf.template_key = p_template_key
  loop
    perform app.enable_feature_with_dependencies(v_workspace.id, v_feature);
  end loop;

  update public.profiles set last_workspace_id = v_workspace.id where id = v_user_id;

  return v_workspace;
end;
$$;

-- Switches a feature on (with what it needs) or off. Turning off a feature others depend on
-- requires p_include_dependants, so the caller can confirm the list first.
create function public.set_feature(
  p_workspace_id uuid,
  p_feature_key text,
  p_enabled boolean,
  p_include_dependants boolean default false
)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_changed text[] := '{}';
  v_dependants text[];
begin
  if not app.has_permission(p_workspace_id, 'workspace.manage_features') then
    raise exception 'You cannot change features in this workspace.'
      using errcode = 'insufficient_privilege';
  end if;

  if not exists (select 1 from public.features f where f.key = p_feature_key) then
    raise exception 'Unknown feature: %', p_feature_key using errcode = 'invalid_parameter_value';
  end if;

  if (select f.is_core from public.features f where f.key = p_feature_key) then
    raise exception 'Core features are always on.' using errcode = 'check_violation';
  end if;

  if p_enabled then
    select coalesce(array_agg(k), '{}') into v_changed
    from app.enable_feature_with_dependencies(p_workspace_id, p_feature_key) as k;
    return v_changed;
  end if;

  with recursive dependants (key) as (
    select d.feature_key from public.feature_dependencies d where d.requires_key = p_feature_key
    union
    select d.feature_key from public.feature_dependencies d join dependants x on d.requires_key = x.key
  )
  select coalesce(array_agg(x.key order by x.key), '{}') into v_dependants
  from dependants x
  join public.workspace_features wf
    on wf.workspace_id = p_workspace_id and wf.feature_key = x.key and wf.enabled;

  if cardinality(v_dependants) > 0 and not p_include_dependants then
    raise exception 'Turning this off also turns off: %', array_to_string(v_dependants, ', ')
      using errcode = 'P0001', hint = 'dependants:' || array_to_string(v_dependants, ',');
  end if;

  with switched as (
    update public.workspace_features wf
    set enabled = false
    where wf.workspace_id = p_workspace_id
      and wf.enabled
      and wf.feature_key = any (array_append(v_dependants, p_feature_key))
    returning wf.feature_key
  )
  select coalesce(array_agg(feature_key order by feature_key), '{}') into v_changed from switched;

  return v_changed;
end;
$$;

-- Gives a member a role. The caller needs roles.assign for that member and must hold every
-- permission in the role at least as widely (owners excepted).
create function public.assign_role(p_workspace_id uuid, p_member_id uuid, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.can(p_workspace_id, 'roles.assign', p_member_id) then
    raise exception 'You cannot assign roles to this member.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.roles r
    where r.id = p_role_id and r.workspace_id = p_workspace_id and r.archived_at is null
  ) then
    raise exception 'Role not found.' using errcode = 'no_data_found';
  end if;

  if not app.is_owner(p_workspace_id) and exists (
    select 1 from public.role_permissions rp
    where rp.role_id = p_role_id
      and not app.reach_covers(app.held_reaches(p_workspace_id, rp.permission_key), rp.reach)
  ) then
    raise exception 'You can only assign roles whose permissions you hold yourself.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.member_roles (workspace_id, member_id, role_id, assigned_by)
  values (p_workspace_id, p_member_id, p_role_id, (select auth.uid()))
  on conflict (member_id, role_id) do nothing;
end;
$$;

create function public.remove_role(p_workspace_id uuid, p_member_id uuid, p_role_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.can(p_workspace_id, 'roles.assign', p_member_id) then
    raise exception 'You cannot change roles of this member.' using errcode = 'insufficient_privilege';
  end if;

  if not app.is_owner(p_workspace_id) and exists (
    select 1 from public.role_permissions rp
    where rp.role_id = p_role_id
      and not app.reach_covers(app.held_reaches(p_workspace_id, rp.permission_key), rp.reach)
  ) then
    raise exception 'You can only remove roles whose permissions you hold yourself.'
      using errcode = 'insufficient_privilege';
  end if;

  delete from public.member_roles mr
  where mr.workspace_id = p_workspace_id and mr.member_id = p_member_id and mr.role_id = p_role_id;
end;
$$;

-- Deactivates or reactivates a member. Owners cannot be deactivated; nobody deactivates themselves
-- (use leave_workspace).
create function public.set_member_status(
  p_workspace_id uuid,
  p_member_id uuid,
  p_status public.member_status
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('active', 'inactive') then
    raise exception 'Status must be active or inactive.' using errcode = 'invalid_parameter_value';
  end if;

  if not app.can(p_workspace_id, 'members.manage', p_member_id) then
    raise exception 'You cannot change this member.' using errcode = 'insufficient_privilege';
  end if;

  if p_member_id = app.current_member_id(p_workspace_id) then
    raise exception 'You cannot change your own status.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.members m where m.id = p_member_id and m.is_owner)
    and p_status = 'inactive'
  then
    raise exception 'Owners cannot be deactivated; transfer ownership first.'
      using errcode = 'check_violation';
  end if;

  update public.members set status = p_status
  where id = p_member_id and workspace_id = p_workspace_id;
end;
$$;

-- Makes another active member an owner; the caller stays an owner only if p_keep_ownership.
create function public.transfer_ownership(
  p_workspace_id uuid,
  p_member_id uuid,
  p_keep_ownership boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.is_owner(p_workspace_id) then
    raise exception 'Only an owner can transfer ownership.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.members m
    where m.id = p_member_id and m.workspace_id = p_workspace_id
      and m.status = 'active' and m.user_id is not null
  ) then
    raise exception 'Ownership can only go to an active member with an account.'
      using errcode = 'check_violation';
  end if;

  update public.members set is_owner = true
  where id = p_member_id and workspace_id = p_workspace_id;

  if not p_keep_ownership and p_member_id <> app.current_member_id(p_workspace_id) then
    update public.members set is_owner = false
    where id = app.current_member_id(p_workspace_id);
  end if;
end;
$$;

-- Leaves a workspace: the caller becomes inactive. The last owner cannot leave.
create function public.leave_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid := app.current_member_id(p_workspace_id);
begin
  if v_member_id is null then
    raise exception 'You are not a member of this workspace.' using errcode = 'no_data_found';
  end if;

  update public.members set is_owner = false, status = 'inactive' where id = v_member_id;
  update public.profiles set last_workspace_id = null
  where id = (select auth.uid()) and last_workspace_id = p_workspace_id;
end;
$$;

-- The caller's permissions in a workspace, for showing the right navigation and actions.
create function public.my_permissions(p_workspace_id uuid)
returns table (permission_key text, reaches public.reach[])
language sql
stable
security definer
set search_path = ''
as $$
  select p.key, app.held_reaches(p_workspace_id, p.key)
  from public.permissions p
  where cardinality(app.held_reaches(p_workspace_id, p.key)) > 0
  order by p.key;
$$;

grant execute on function
  public.create_workspace(text, text, text, text, text, text, smallint, smallint),
  public.set_feature(uuid, text, boolean, boolean),
  public.assign_role(uuid, uuid, uuid),
  public.remove_role(uuid, uuid, uuid),
  public.set_member_status(uuid, uuid, public.member_status),
  public.transfer_ownership(uuid, uuid, boolean),
  public.leave_workspace(uuid),
  public.my_permissions(uuid)
to authenticated;
