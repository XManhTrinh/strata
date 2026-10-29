-- People: start and end dates, dated job records, dated pay, custom fields with optional history,
-- precomputed reporting lines, and the team, reports and units reaches.

create extension if not exists btree_gist with schema extensions;

alter table public.members
  add column start_date date,
  add column end_date date,
  add constraint members_dates_in_order check (end_date is null or start_date is null or end_date >= start_date);

-- Job records ------------------------------------------------------------------------------------

-- One row per change: team, manager, position, level and employment type valid from valid_from up
-- to (not including) valid_to. Null valid_to means "until further notice".
create table public.member_assignments (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  member_id uuid not null,
  valid_from date not null,
  valid_to date,
  org_unit_id uuid not null,
  manager_member_id uuid,
  position_id uuid,
  career_level_id uuid,
  employment_type_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, org_unit_id) references public.org_units (workspace_id, id),
  foreign key (workspace_id, manager_member_id) references public.members (workspace_id, id),
  foreign key (workspace_id, position_id) references public.positions (workspace_id, id),
  foreign key (workspace_id, career_level_id) references public.career_levels (workspace_id, id),
  foreign key (workspace_id, employment_type_id) references public.employment_types (workspace_id, id),
  constraint member_assignments_period check (valid_to is null or valid_to > valid_from),
  constraint member_assignments_not_own_manager check (manager_member_id <> member_id),
  constraint member_assignments_no_overlap exclude using gist (
    member_id with =,
    daterange(valid_from, valid_to, '[)') with &&
  )
);

create index member_assignments_member_from_idx on public.member_assignments (member_id, valid_from desc);
create index member_assignments_workspace_unit_idx on public.member_assignments (workspace_id, org_unit_id);
create index member_assignments_workspace_manager_idx on public.member_assignments (workspace_id, manager_member_id);
create index member_assignments_workspace_position_idx on public.member_assignments (workspace_id, position_id);
create index member_assignments_workspace_level_idx on public.member_assignments (workspace_id, career_level_id);
create index member_assignments_workspace_type_idx on public.member_assignments (workspace_id, employment_type_id);

create trigger set_updated_at before update on public.member_assignments
  for each row execute function app.set_updated_at();

-- The job record valid on a date.
create function app.assignment_on(p_member_id uuid, p_date date)
returns public.member_assignments
language sql
stable
security definer
set search_path = ''
as $$
  select a.* from public.member_assignments a
  where a.member_id = p_member_id
    and a.valid_from <= p_date
    and (a.valid_to is null or a.valid_to > p_date)
  limit 1;
$$;

-- Pay -------------------------------------------------------------------------------------------

create table public.member_compensation (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  member_id uuid not null,
  valid_from date not null,
  valid_to date,
  annual_salary numeric(14, 2) check (annual_salary >= 0),
  day_rate numeric(12, 2) check (day_rate >= 0),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  constraint member_compensation_period check (valid_to is null or valid_to > valid_from),
  constraint member_compensation_no_overlap exclude using gist (
    member_id with =,
    daterange(valid_from, valid_to, '[)') with &&
  )
);

create index member_compensation_member_from_idx on public.member_compensation (member_id, valid_from desc);
create index member_compensation_workspace_member_idx on public.member_compensation (workspace_id, member_id);

create trigger set_updated_at before update on public.member_compensation
  for each row execute function app.set_updated_at();

-- Custom fields ----------------------------------------------------------------------------------

create type public.custom_field_type as enum ('text', 'number', 'date', 'single_choice', 'multi_choice', 'person');

create table public.custom_fields (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Stable key used by imports and rate-card conditions.
  key text not null check (key ~ '^[a-z][a-z0-9_]{0,59}$'),
  label text not null check (char_length(btrim(label)) between 1 and 80),
  type public.custom_field_type not null,
  -- Sensitive fields need "View pay" reach over the person, like salary.
  sensitive boolean not null default false,
  required boolean not null default false,
  keep_history boolean not null default false,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, key)
);

create trigger set_updated_at before update on public.custom_fields
  for each row execute function app.set_updated_at();

create table public.custom_field_options (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  field_id uuid not null,
  label text not null check (char_length(btrim(label)) between 1 and 80),
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (field_id, label),
  foreign key (workspace_id, field_id) references public.custom_fields (workspace_id, id) on delete cascade
);

create index custom_field_options_workspace_field_idx on public.custom_field_options (workspace_id, field_id);

create trigger set_updated_at before update on public.custom_field_options
  for each row execute function app.set_updated_at();

-- Values. Fields without history keep one row from -infinity; fields with history keep dated rows.
create table public.member_field_values (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  member_id uuid not null,
  field_id uuid not null,
  value jsonb not null,
  valid_from date not null default '-infinity',
  valid_to date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, field_id) references public.custom_fields (workspace_id, id) on delete cascade,
  constraint member_field_values_period check (valid_to is null or valid_to > valid_from),
  constraint member_field_values_no_overlap exclude using gist (
    member_id with =,
    field_id with =,
    daterange(valid_from, valid_to, '[)') with &&
  )
);

create index member_field_values_workspace_field_idx on public.member_field_values (workspace_id, field_id);
create index member_field_values_member_idx on public.member_field_values (member_id, field_id, valid_from desc);

create trigger set_updated_at before update on public.member_field_values
  for each row execute function app.set_updated_at();

-- Reporting lines --------------------------------------------------------------------------------

-- Who is under whom today (direct and indirect), from today's job records. Rebuilt per workspace
-- when job records change and nightly, so future-dated changes take effect on their date.
create table public.reporting_closure (
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  manager_member_id uuid not null,
  member_id uuid not null,
  depth integer not null check (depth >= 1),
  primary key (manager_member_id, member_id),
  foreign key (workspace_id, manager_member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade
);

create index reporting_closure_workspace_member_idx on public.reporting_closure (workspace_id, member_id);

create function app.rebuild_reporting_closure(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reporting_closure where workspace_id = p_workspace_id;

  insert into public.reporting_closure (workspace_id, manager_member_id, member_id, depth)
  with recursive today as (
    select a.member_id, a.manager_member_id
    from public.member_assignments a
    where a.workspace_id = p_workspace_id
      and a.manager_member_id is not null
      and a.valid_from <= current_date
      and (a.valid_to is null or a.valid_to > current_date)
  ),
  chain (manager_member_id, member_id, depth, trail) as (
    select t.manager_member_id, t.member_id, 1, array[t.member_id, t.manager_member_id]
    from today t
    union all
    select t.manager_member_id, c.member_id, c.depth + 1, c.trail || t.manager_member_id
    from chain c
    join today t on t.member_id = c.manager_member_id
    where not t.manager_member_id = any (c.trail)
  )
  select p_workspace_id, manager_member_id, member_id, min(depth)
  from chain
  group by manager_member_id, member_id;

  if exists (
    select 1 from public.member_assignments a
    join public.reporting_closure c
      on c.workspace_id = a.workspace_id and c.manager_member_id = a.member_id and c.member_id = a.manager_member_id
    where a.workspace_id = p_workspace_id
      and a.valid_from <= current_date
      and (a.valid_to is null or a.valid_to > current_date)
  ) then
    raise exception 'Reporting lines cannot go in a circle.' using errcode = 'check_violation';
  end if;
end;
$$;

create function app.on_assignments_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  for v_workspace_id in
    select distinct workspace_id from changed_rows
  loop
    perform app.rebuild_reporting_closure(v_workspace_id);
  end loop;
  return null;
end;
$$;

create trigger rebuild_reporting_closure_on_insert
  after insert on public.member_assignments
  referencing new table as changed_rows
  for each statement execute function app.on_assignments_changed();
create trigger rebuild_reporting_closure_on_update
  after update on public.member_assignments
  referencing new table as changed_rows
  for each statement execute function app.on_assignments_changed();
create trigger rebuild_reporting_closure_on_delete
  after delete on public.member_assignments
  referencing old table as changed_rows
  for each statement execute function app.on_assignments_changed();

-- Nightly, so job records that start or end today take effect.
select cron.schedule(
  'rebuild-reporting-closure',
  '15 0 * * *',
  $$ select app.rebuild_reporting_closure(id) from public.workspaces $$
);

-- Specific units ---------------------------------------------------------------------------------

alter table public.member_roles add constraint member_roles_workspace_id_id_key unique (workspace_id, id);

create table public.member_role_units (
  member_role_id uuid not null,
  workspace_id uuid not null,
  org_unit_id uuid not null,
  primary key (member_role_id, org_unit_id),
  foreign key (workspace_id, member_role_id) references public.member_roles (workspace_id, id) on delete cascade,
  foreign key (workspace_id, org_unit_id) references public.org_units (workspace_id, id) on delete cascade
);

create index member_role_units_workspace_unit_idx on public.member_role_units (workspace_id, org_unit_id);

-- Reach ------------------------------------------------------------------------------------------

-- Unit paths the caller holds a permission over through "specific units" roles.
create function app.granted_unit_paths(p_workspace_id uuid, p_permission_key text)
returns extensions.ltree[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(u.path), '{}')
  from public.member_roles mr
  join public.roles r on r.id = mr.role_id and r.archived_at is null
  join public.role_permissions rp
    on rp.role_id = r.id and rp.permission_key = p_permission_key and rp.reach = 'units'
  join public.member_role_units mru on mru.member_role_id = mr.id
  join public.org_units u on u.id = mru.org_unit_id
  where mr.workspace_id = p_workspace_id
    and mr.member_id = app.current_member_id(p_workspace_id);
$$;

-- Can the caller use the permission on this member? All six reaches.
create or replace function app.can(p_workspace_id uuid, p_permission_key text, p_target_member_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, p_permission_key);
  v_me uuid;
  v_my_unit uuid;
  v_target_unit uuid;
begin
  if cardinality(v_reaches) = 0
    or not exists (
      select 1 from public.members m where m.id = p_target_member_id and m.workspace_id = p_workspace_id
    )
  then
    return false;
  end if;

  if 'workspace' = any (v_reaches) then
    return true;
  end if;

  v_me := app.current_member_id(p_workspace_id);
  if 'own' = any (v_reaches) and p_target_member_id = v_me then
    return true;
  end if;

  if 'reports' = any (v_reaches) and exists (
    select 1 from public.reporting_closure c
    where c.manager_member_id = v_me and c.member_id = p_target_member_id
  ) then
    return true;
  end if;

  if not (v_reaches && array['team', 'team_and_below', 'units']::public.reach[]) then
    return false;
  end if;

  v_target_unit := (app.assignment_on(p_target_member_id, current_date)).org_unit_id;
  if v_target_unit is null then
    return false;
  end if;

  if v_reaches && array['team', 'team_and_below']::public.reach[] then
    v_my_unit := (app.assignment_on(v_me, current_date)).org_unit_id;
    if 'team' = any (v_reaches) and v_target_unit = v_my_unit then
      return true;
    end if;
    if 'team_and_below' = any (v_reaches) and exists (
      select 1 from public.org_units t, public.org_units mine
      where t.id = v_target_unit and mine.id = v_my_unit
        and t.path operator(extensions.<@) mine.path
    ) then
      return true;
    end if;
  end if;

  if 'units' = any (v_reaches) then
    return exists (
      select 1 from public.org_units t
      where t.id = v_target_unit
        and t.path operator(extensions.<@) any (app.granted_unit_paths(p_workspace_id, p_permission_key))
    );
  end if;

  return false;
end;
$$;

-- Access ------------------------------------------------------------------------------------------

alter table public.member_assignments enable row level security;
alter table public.member_compensation enable row level security;
alter table public.custom_fields enable row level security;
alter table public.custom_field_options enable row level security;
alter table public.member_field_values enable row level security;
alter table public.reporting_closure enable row level security;
alter table public.member_role_units enable row level security;

-- app.assignment_on and app.granted_unit_paths run with elevated rights for the permission checks;
-- they are not granted to users, who would otherwise read job records across workspaces by id.

-- People can be added and edited by those with people.edit over them (adding needs workspace reach).
grant insert (workspace_id, full_name, email, person_key, country, time_zone, start_date, end_date)
  on public.members to authenticated;
grant update (full_name, email, person_key, country, time_zone, start_date, end_date)
  on public.members to authenticated;

create policy "People editors can see people they can view" on public.members
  for select to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.view', id));

create policy "People editors with workspace reach can add people" on public.members
  for insert to authenticated
  with check (
    app.feature_on(workspace_id, 'people')
    and 'workspace' = any (app.held_reaches(workspace_id, 'people.edit'))
  );

create policy "People editors can change people within reach" on public.members
  for update to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit', id))
  with check (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit', id));

-- Job records.
grant select, insert, update, delete on public.member_assignments to authenticated;

create policy "Job records are visible with the person" on public.member_assignments
  for select to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.view', member_id));
create policy "People editors can add job records" on public.member_assignments
  for insert to authenticated
  with check (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit', member_id));
create policy "People editors can change job records" on public.member_assignments
  for update to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit', member_id))
  with check (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit', member_id));
create policy "People editors can remove job records" on public.member_assignments
  for delete to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit', member_id));

-- Pay: its own permissions.
grant select, insert, update, delete on public.member_compensation to authenticated;

create policy "Pay is visible with View pay" on public.member_compensation
  for select to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.view_compensation', member_id));
create policy "Pay editors can add pay" on public.member_compensation
  for insert to authenticated
  with check (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit_compensation', member_id));
create policy "Pay editors can change pay" on public.member_compensation
  for update to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit_compensation', member_id))
  with check (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit_compensation', member_id));
create policy "Pay editors can remove pay" on public.member_compensation
  for delete to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.edit_compensation', member_id));

-- Field definitions: part of the structure.
grant select, insert, update, delete on public.custom_fields, public.custom_field_options to authenticated;

create policy "Members can read custom fields" on public.custom_fields
  for select to authenticated using (app.is_member(workspace_id) and app.feature_on(workspace_id, 'people'));
create policy "Structure managers can add custom fields" on public.custom_fields
  for insert to authenticated with check (app.has_permission(workspace_id, 'people.manage_structure'));
create policy "Structure managers can change custom fields" on public.custom_fields
  for update to authenticated
  using (app.has_permission(workspace_id, 'people.manage_structure'))
  with check (app.has_permission(workspace_id, 'people.manage_structure'));
create policy "Structure managers can delete custom fields" on public.custom_fields
  for delete to authenticated using (app.has_permission(workspace_id, 'people.manage_structure'));

create policy "Members can read field options" on public.custom_field_options
  for select to authenticated using (app.is_member(workspace_id) and app.feature_on(workspace_id, 'people'));
create policy "Structure managers can add field options" on public.custom_field_options
  for insert to authenticated with check (app.has_permission(workspace_id, 'people.manage_structure'));
create policy "Structure managers can change field options" on public.custom_field_options
  for update to authenticated
  using (app.has_permission(workspace_id, 'people.manage_structure'))
  with check (app.has_permission(workspace_id, 'people.manage_structure'));
create policy "Structure managers can delete field options" on public.custom_field_options
  for delete to authenticated using (app.has_permission(workspace_id, 'people.manage_structure'));

-- Field values: sensitive fields follow the pay permissions.
create function app.field_is_sensitive(p_field_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select f.sensitive from public.custom_fields f where f.id = p_field_id), true);
$$;

grant execute on function app.field_is_sensitive(uuid) to authenticated;

grant select, insert, update, delete on public.member_field_values to authenticated;

create policy "Field values are visible with the person" on public.member_field_values
  for select to authenticated
  using (
    app.feature_on(workspace_id, 'people')
    and app.can(workspace_id,
      case when app.field_is_sensitive(field_id) then 'people.view_compensation' else 'people.view' end,
      member_id)
  );
create policy "People editors can add field values" on public.member_field_values
  for insert to authenticated
  with check (
    app.feature_on(workspace_id, 'people')
    and app.can(workspace_id,
      case when app.field_is_sensitive(field_id) then 'people.edit_compensation' else 'people.edit' end,
      member_id)
  );
create policy "People editors can change field values" on public.member_field_values
  for update to authenticated
  using (
    app.feature_on(workspace_id, 'people')
    and app.can(workspace_id,
      case when app.field_is_sensitive(field_id) then 'people.edit_compensation' else 'people.edit' end,
      member_id)
  )
  with check (
    app.feature_on(workspace_id, 'people')
    and app.can(workspace_id,
      case when app.field_is_sensitive(field_id) then 'people.edit_compensation' else 'people.edit' end,
      member_id)
  );
create policy "People editors can remove field values" on public.member_field_values
  for delete to authenticated
  using (
    app.feature_on(workspace_id, 'people')
    and app.can(workspace_id,
      case when app.field_is_sensitive(field_id) then 'people.edit_compensation' else 'people.edit' end,
      member_id)
  );

-- Reporting lines: visible for people one can view (used by the org chart). Written by the system.
grant select on public.reporting_closure to authenticated;
create policy "Reporting lines are visible with the person" on public.reporting_closure
  for select to authenticated
  using (app.feature_on(workspace_id, 'people') and app.can(workspace_id, 'people.view', member_id));

-- Specific units are set with the role assignment, by people who can assign roles.
grant select, insert, delete on public.member_role_units to authenticated;
create policy "Role assigners can read unit grants" on public.member_role_units
  for select to authenticated using (app.is_member(workspace_id));
create policy "Role assigners can grant units" on public.member_role_units
  for insert to authenticated with check (app.has_permission(workspace_id, 'roles.assign'));
create policy "Role assigners can remove unit grants" on public.member_role_units
  for delete to authenticated using (app.has_permission(workspace_id, 'roles.assign'));

-- Audit.
do $$
declare
  v_table text;
begin
  foreach v_table in array array['member_assignments', 'member_compensation', 'custom_fields',
                                 'custom_field_options', 'member_field_values', 'member_role_units']
  loop
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function app.audit_row_change(%L)', v_table, 'workspace_id');
  end loop;
end;
$$;
