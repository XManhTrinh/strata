-- Phase 4 planning: settings, scenarios, planned roles and allocations. Allocations are stored by
-- month and written only by functions, which check reach, locks and over-allocation and write one
-- audit entry per save. Each refusal's hint is the app's message key.

-- Seeing cost needs its own permission, because a cost under annual salary reveals pay.
insert into public.permissions (key, feature_key, name, description, is_scoped, sort_order) values
  ('planning.view_cost', 'planning', 'View plan costs', 'See costs in plans and their totals.', true, 15);
insert into public.template_role_permissions (template_key, role_key, permission_key, reach) values
  ('company', 'finance', 'planning.view_cost', 'workspace');

-- Existing workspaces: the Admin role holds every permission, and roles that edit plans see their cost.
select set_config('app.seeding_workspace', 'on', true);
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select r.workspace_id, r.id, 'planning.view_cost', 'workspace' from public.roles r where r.system_key = 'admin'
on conflict do nothing;
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select rp.workspace_id, rp.role_id, 'planning.view_cost', rp.reach
from public.role_permissions rp
join public.roles r on r.id = rp.role_id and r.system_key is null
where rp.permission_key = 'planning.edit'
on conflict do nothing;
select set_config('app.seeding_workspace', 'off', true);

-- A unit is covered by "team" reach when it is the caller's own unit (as for people).
create or replace function app.covers_unit(p_workspace_id uuid, p_permission_key text, p_unit_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, p_permission_key);
  v_path extensions.ltree := (select path from public.org_units where id = p_unit_id);
  v_my_unit uuid;
begin
  if 'workspace' = any (v_reaches) then
    return true;
  end if;
  if 'units' = any (v_reaches)
     and v_path operator(extensions.<@) any (app.granted_unit_paths(p_workspace_id, p_permission_key)) then
    return true;
  end if;
  if v_reaches && array['team', 'team_and_below']::public.reach[] then
    v_my_unit := (app.assignment_on(app.current_member_id(p_workspace_id), current_date)).org_unit_id;
    if 'team' = any (v_reaches) and p_unit_id = v_my_unit then
      return true;
    end if;
    return 'team_and_below' = any (v_reaches) and exists (
      select 1 from public.org_units mine
      where mine.id = v_my_unit and v_path operator(extensions.<@) mine.path
    );
  end if;
  return false;
end;
$$;

create function app.month_start(p_date date)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('month', p_date)::date;
$$;

-- Settings -----------------------------------------------------------------------------------------

create type public.planning_period as enum ('month', 'quarter');
create type public.planning_unit as enum ('fte', 'percent');
create type public.over_allocation_rule as enum ('warn', 'block');
create type public.planning_basis as enum ('person', 'position');
create type public.scenario_status as enum ('draft', 'submitted', 'approved');

create table public.planning_settings (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  period public.planning_period not null default 'month',
  horizon_years smallint not null default 2 check (horizon_years between 1 and 5),
  display_unit public.planning_unit not null default 'fte',
  over_allocation public.over_allocation_rule not null default 'warn',
  basis public.planning_basis not null default 'person',
  -- Draft → submitted → approved, with approved plans and past months locked.
  lifecycle boolean not null default true,
  -- A custom field (e.g. Capex/Opex) that splits cost totals.
  cost_split_field_id uuid,
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, cost_split_field_id)
    references public.custom_fields (workspace_id, id) on delete set null (cost_split_field_id)
);

create trigger set_updated_at before update on public.planning_settings
  for each row execute function app.set_updated_at();

create function app.seed_planning_settings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.planning_settings (workspace_id) values (new.id);
  return null;
end;
$$;

create trigger seed_planning_settings
  after insert on public.workspaces
  for each row execute function app.seed_planning_settings();

insert into public.planning_settings (workspace_id) select id from public.workspaces on conflict do nothing;

-- Scenarios --------------------------------------------------------------------------------------------

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name extensions.citext not null check (char_length(btrim(name::text)) between 1 and 100),
  -- First and last month planned (each the first of a month).
  first_period date not null check (first_period = app.month_start(first_period)),
  last_period date not null check (last_period = app.month_start(last_period)),
  baseline_id uuid,
  status public.scenario_status not null default 'draft',
  is_live boolean not null default false,
  -- Months up to and including this one are locked.
  locked_through date check (locked_through = app.month_start(locked_through)),
  submitted_by uuid,
  submitted_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  costs_applied_at timestamptz,
  created_by uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  constraint scenarios_period check (last_period >= first_period and last_period < first_period + interval '6 years'),
  constraint scenarios_live_not_archived check (not (is_live and archived_at is not null)),
  foreign key (workspace_id, baseline_id) references public.scenarios (workspace_id, id) on delete set null (baseline_id),
  foreign key (workspace_id, submitted_by) references public.members (workspace_id, id) on delete set null (submitted_by),
  foreign key (workspace_id, approved_by) references public.members (workspace_id, id) on delete set null (approved_by),
  foreign key (workspace_id, created_by) references public.members (workspace_id, id) on delete set null (created_by)
);
create unique index scenarios_one_live_idx on public.scenarios (workspace_id) where is_live;
create index scenarios_baseline_idx on public.scenarios (baseline_id);

create trigger set_updated_at before update on public.scenarios
  for each row execute function app.set_updated_at();

-- Vacancies (and, planning by position, seats): they count in capacity and cost until filled.
create table public.planned_roles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  scenario_id uuid not null,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  org_unit_id uuid not null,
  position_id uuid,
  career_level_id uuid,
  employment_type_id uuid,
  start_date date not null,
  end_date date,
  fte numeric(4, 3) not null default 1 check (fte > 0 and fte <= 1),
  -- Custom field values by field key, so rate cards can match planned roles too.
  field_values jsonb not null default '{}' check (jsonb_typeof(field_values) = 'object'),
  notes text check (char_length(notes) <= 1000),
  filled_by uuid,
  filled_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (scenario_id, id),
  constraint planned_roles_dates check (end_date is null or end_date >= start_date),
  constraint planned_roles_filled check (filled_by is null or filled_on is not null),
  foreign key (workspace_id, scenario_id) references public.scenarios (workspace_id, id) on delete cascade,
  foreign key (workspace_id, org_unit_id) references public.org_units (workspace_id, id),
  foreign key (workspace_id, position_id) references public.positions (workspace_id, id),
  foreign key (workspace_id, career_level_id) references public.career_levels (workspace_id, id),
  foreign key (workspace_id, employment_type_id) references public.employment_types (workspace_id, id),
  foreign key (workspace_id, filled_by) references public.members (workspace_id, id) on delete set null (filled_by)
);
create index planned_roles_unit_idx on public.planned_roles (scenario_id, org_unit_id);
create index planned_roles_org_unit_id_idx on public.planned_roles (org_unit_id);
create index planned_roles_position_id_idx on public.planned_roles (position_id);
create index planned_roles_career_level_id_idx on public.planned_roles (career_level_id);
create index planned_roles_employment_type_id_idx on public.planned_roles (employment_type_id);
create index planned_roles_filled_by_idx on public.planned_roles (filled_by);

create trigger set_updated_at before update on public.planned_roles
  for each row execute function app.set_updated_at();

-- One row per scenario, person or planned role, team and month.
create table public.allocations (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  scenario_id uuid not null,
  member_id uuid,
  planned_role_id uuid,
  org_unit_id uuid not null,
  period_start date not null check (period_start = app.month_start(period_start)),
  fte numeric(4, 3) not null check (fte > 0 and fte <= 1),
  constraint allocations_one_target check (num_nonnulls(member_id, planned_role_id) = 1),
  foreign key (workspace_id, scenario_id) references public.scenarios (workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (scenario_id, planned_role_id) references public.planned_roles (scenario_id, id) on delete cascade,
  foreign key (workspace_id, org_unit_id) references public.org_units (workspace_id, id)
);
create unique index allocations_member_idx on public.allocations (scenario_id, member_id, org_unit_id, period_start)
  where member_id is not null;
create unique index allocations_role_idx on public.allocations (scenario_id, planned_role_id, org_unit_id, period_start)
  where planned_role_id is not null;
create index allocations_unit_period_idx on public.allocations (scenario_id, org_unit_id, period_start);
create index allocations_member_id_idx on public.allocations (workspace_id, member_id) where member_id is not null;
create index allocations_org_unit_id_idx on public.allocations (org_unit_id);

-- Rules --------------------------------------------------------------------------------------------------

-- The first month that can still be changed: after the locked months, and with the lifecycle on,
-- not before this month. Null when the scenario cannot be changed at all.
create function app.first_open_month(p_scenario_id uuid)
returns date
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when s.archived_at is not null or (ps.lifecycle and s.status <> 'draft') then null
    else greatest(
      s.first_period,
      coalesce((s.locked_through + interval '1 month')::date, s.first_period),
      case when ps.lifecycle then app.month_start(current_date) else s.first_period end)
  end
  from public.scenarios s
  join public.planning_settings ps on ps.workspace_id = s.workspace_id
  where s.id = p_scenario_id;
$$;

-- People and planned roles above 1 FTE in a month, among those given.
create function app.over_allocations(p_scenario_id uuid, p_member_ids uuid[], p_role_ids uuid[])
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'member_id', o.member_id, 'planned_role_id', o.planned_role_id, 'period', o.period_start, 'fte', o.fte)
    order by o.period_start), '[]')
  from (
    select a.member_id, a.planned_role_id, a.period_start, sum(a.fte) as fte
    from public.allocations a
    where a.scenario_id = p_scenario_id
      and (a.member_id = any (p_member_ids) or a.planned_role_id = any (p_role_ids))
    group by a.member_id, a.planned_role_id, a.period_start
    having sum(a.fte) > 1
  ) o;
$$;

create function app.check_over_allocation(p_scenario_id uuid, p_member_ids uuid[], p_role_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_over jsonb := app.over_allocations(p_scenario_id, p_member_ids, p_role_ids);
begin
  if jsonb_array_length(v_over) > 0 and exists (
    select 1 from public.scenarios s join public.planning_settings ps on ps.workspace_id = s.workspace_id
    where s.id = p_scenario_id and ps.over_allocation = 'block'
  ) then
    raise exception 'Someone would be over 1 FTE.' using errcode = 'check_violation', hint = 'overAllocated';
  end if;
  return v_over;
end;
$$;

create function app.require_planning_editor(p_workspace_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.reach_covers(app.held_reaches(p_workspace_id, 'planning.edit'), 'workspace') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
end;
$$;

-- A planned role's months: from its start (or the first open month) to its end (or the scenario's).
create function app.place_planned_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_open date;
  v_last date;
begin
  if coalesce(current_setting('app.copying_scenario', true), '') = 'on' then
    return null;
  end if;
  v_open := app.first_open_month(new.scenario_id);
  if v_open is null then
    return null;
  end if;
  select s.last_period into v_last from public.scenarios s where s.id = new.scenario_id;

  if tg_op = 'UPDATE' then
    delete from public.allocations a where a.planned_role_id = new.id and a.period_start >= v_open;
  end if;
  if new.filled_on is null then
    insert into public.allocations (workspace_id, scenario_id, planned_role_id, org_unit_id, period_start, fte)
    select new.workspace_id, new.scenario_id, new.id, new.org_unit_id, g::date, new.fte
    from generate_series(
      greatest(app.month_start(new.start_date), v_open),
      least(coalesce(app.month_start(new.end_date), v_last), v_last),
      interval '1 month') g;
  end if;
  return null;
end;
$$;

create trigger place_planned_role
  after insert or update of org_unit_id, start_date, end_date, fte on public.planned_roles
  for each row execute function app.place_planned_role();

-- Functions ------------------------------------------------------------------------------------------

-- A new scenario; from people, everyone working in each month at 1.0 FTE in their team that month.
create function public.create_scenario(
  p_workspace_id uuid,
  p_name text,
  p_first_period date,
  p_last_period date,
  p_from_people boolean default true
)
returns uuid
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_id uuid;
  v_first date := app.month_start(p_first_period);
  v_last date := app.month_start(p_last_period);
begin
  perform app.require_planning_editor(p_workspace_id);
  if v_last < v_first or v_last >= v_first + interval '6 years' then
    raise exception 'Choose up to six years.' using errcode = 'check_violation', hint = 'scenarioPeriod';
  end if;
  if exists (select 1 from public.scenarios s where s.workspace_id = p_workspace_id and s.name = p_name::extensions.citext) then
    raise exception 'A scenario has this name.' using errcode = 'unique_violation', hint = 'scenarioNameTaken';
  end if;

  insert into public.scenarios (workspace_id, name, first_period, last_period, created_by)
  values (p_workspace_id, btrim(p_name), v_first, v_last, app.current_member_id(p_workspace_id))
  returning id into v_id;

  if p_from_people then
    insert into public.allocations (workspace_id, scenario_id, member_id, org_unit_id, period_start, fte)
    select p_workspace_id, v_id, m.id, a.org_unit_id, g.month, 1
    from public.members m
    cross join lateral (
      select g::date as month from generate_series(v_first, v_last, interval '1 month') g
    ) g
    cross join lateral (
      select x.org_unit_id from public.member_assignments x
      where x.member_id = m.id
        and x.valid_from < (g.month + interval '1 month')::date
        and (x.valid_to is null or x.valid_to > g.month)
      order by x.valid_from desc
      limit 1
    ) a
    where m.workspace_id = p_workspace_id
      and m.status <> 'inactive'
      and (m.start_date is null or m.start_date < (g.month + interval '1 month')::date)
      and (m.end_date is null or m.end_date >= g.month);
  end if;
  return v_id;
end;
$$;

-- A draft copy with the same planned roles and allocations (costs are applied again).
create function public.copy_scenario(p_scenario_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.scenarios;
  v_id uuid;
begin
  select * into v_from from public.scenarios where id = p_scenario_id;
  if v_from.id is null then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  perform app.require_planning_editor(v_from.workspace_id);
  if exists (select 1 from public.scenarios s where s.workspace_id = v_from.workspace_id and s.name = p_name::extensions.citext) then
    raise exception 'A scenario has this name.' using errcode = 'unique_violation', hint = 'scenarioNameTaken';
  end if;

  insert into public.scenarios (workspace_id, name, first_period, last_period, baseline_id, created_by)
  values (v_from.workspace_id, btrim(p_name), v_from.first_period, v_from.last_period, v_from.id,
    app.current_member_id(v_from.workspace_id))
  returning id into v_id;

  perform set_config('app.copying_scenario', 'on', true);
  create temporary table copied_roles on commit drop as
  select r.id as old_id, gen_random_uuid() as new_id from public.planned_roles r where r.scenario_id = v_from.id;
  insert into public.planned_roles (id, workspace_id, scenario_id, title, org_unit_id, position_id, career_level_id,
    employment_type_id, start_date, end_date, fte, field_values, notes, filled_by, filled_on)
  select c.new_id, r.workspace_id, v_id, r.title, r.org_unit_id, r.position_id, r.career_level_id,
    r.employment_type_id, r.start_date, r.end_date, r.fte, r.field_values, r.notes, r.filled_by, r.filled_on
  from public.planned_roles r join copied_roles c on c.old_id = r.id;
  perform set_config('app.copying_scenario', 'off', true);

  insert into public.allocations (workspace_id, scenario_id, member_id, planned_role_id, org_unit_id, period_start, fte)
  select a.workspace_id, v_id, a.member_id, c.new_id, a.org_unit_id, a.period_start, a.fte
  from public.allocations a left join copied_roles c on c.old_id = a.planned_role_id
  where a.scenario_id = v_from.id;
  drop table copied_roles;
  return v_id;
end;
$$;

-- Submit (planning.edit), approve or return to draft (planning.approve); approvers and the
-- submitter are told.
create function public.set_scenario_status(p_scenario_id uuid, p_status public.scenario_status)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scenario public.scenarios;
  v_me uuid;
  v_payload jsonb;
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id and archived_at is null;
  if v_scenario.id is null then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  v_me := app.current_member_id(v_scenario.workspace_id);
  if not (select lifecycle from public.planning_settings where workspace_id = v_scenario.workspace_id) then
    raise exception 'Plans are not submitted in this workspace.' using errcode = 'check_violation', hint = 'planningLifecycleOff';
  end if;

  if p_status = 'submitted' and v_scenario.status = 'draft' then
    perform app.require_planning_editor(v_scenario.workspace_id);
  elsif (p_status = 'approved' and v_scenario.status = 'submitted')
     or (p_status = 'draft' and v_scenario.status in ('submitted', 'approved')) then
    if not app.has_permission(v_scenario.workspace_id, 'planning.approve') then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    if p_status = 'draft' and v_scenario.is_live then
      raise exception 'Make another plan live first.' using errcode = 'check_violation', hint = 'scenarioIsLive';
    end if;
  else
    raise exception 'The plan has moved on.' using errcode = 'check_violation', hint = 'scenarioStatusChanged';
  end if;

  update public.scenarios set
    status = p_status,
    submitted_by = case when p_status = 'submitted' then v_me else submitted_by end,
    submitted_at = case when p_status = 'submitted' then now() else submitted_at end,
    approved_by = case when p_status = 'approved' then v_me when p_status = 'draft' then null else approved_by end,
    approved_at = case when p_status = 'approved' then now() when p_status = 'draft' then null else approved_at end
  where id = p_scenario_id;

  v_payload := jsonb_build_object('scenario_id', v_scenario.id, 'scenario_name', v_scenario.name::text,
    'by_name', (select full_name from public.members where id = v_me));
  if p_status = 'submitted' then
    perform app.notify(m.user_id, v_scenario.workspace_id, 'planning', 'scenario.submitted', v_payload)
    from public.members m
    where m.workspace_id = v_scenario.workspace_id and m.status = 'active' and m.id <> v_me and (
      m.is_owner or exists (
        select 1 from public.member_roles mr
        join public.roles r on r.id = mr.role_id and r.archived_at is null
        join public.role_permissions rp on rp.role_id = r.id and rp.permission_key = 'planning.approve'
        where mr.member_id = m.id));
  elsif v_scenario.submitted_by is distinct from v_me then
    perform app.notify(m.user_id, v_scenario.workspace_id, 'planning',
      case p_status when 'approved' then 'scenario.approved' else 'scenario.returned' end, v_payload)
    from public.members m where m.id = v_scenario.submitted_by;
  end if;
end;
$$;

-- The live plan: one per workspace, approved when the lifecycle is on.
create function public.set_live_scenario(p_scenario_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scenario public.scenarios;
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id and archived_at is null;
  if v_scenario.id is null or not app.has_permission(v_scenario.workspace_id, 'planning.approve') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_scenario.status <> 'approved'
     and (select lifecycle from public.planning_settings where workspace_id = v_scenario.workspace_id) then
    raise exception 'Only an approved plan can be live.' using errcode = 'check_violation', hint = 'scenarioNotApproved';
  end if;
  update public.scenarios set is_live = false where workspace_id = v_scenario.workspace_id and is_live and id <> p_scenario_id;
  update public.scenarios set is_live = true where id = p_scenario_id;
end;
$$;

-- Saves grid changes: [{member_id | planned_role_id, org_unit_id, period, fte}], fte 0 or null
-- removes. Returns {saved, over} where over lists months above 1 FTE (refused when blocking).
create function public.save_allocations(p_scenario_id uuid, p_changes jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_scenario public.scenarios;
  v_open date := app.first_open_month(p_scenario_id);
  v_count integer;
  v_members uuid[];
  v_roles uuid[];
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id;
  if v_scenario.id is null or app.current_member_id(v_scenario.workspace_id) is null
     or not app.has_permission(v_scenario.workspace_id, 'planning.edit') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_open is null then
    raise exception 'This plan is locked.' using errcode = 'check_violation', hint = 'scenarioLocked';
  end if;
  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 5000 then
    raise exception 'Too many changes at once.' using errcode = 'check_violation', hint = 'tooManyChanges';
  end if;

  create temporary table changes on commit drop as
  select x.member_id, x.planned_role_id, x.org_unit_id, x.period, coalesce(x.fte, 0) as fte
  from jsonb_to_recordset(p_changes) as x (member_id uuid, planned_role_id uuid, org_unit_id uuid, period date, fte numeric);
  get diagnostics v_count = row_count;

  if exists (
    select 1 from changes c
    where num_nonnulls(c.member_id, c.planned_role_id) <> 1 or c.org_unit_id is null or c.period is null
      or c.fte < 0 or c.fte > 1
      or (c.member_id is not null and not exists (
        select 1 from public.members m where m.id = c.member_id and m.workspace_id = v_scenario.workspace_id))
      or (c.planned_role_id is not null and not exists (
        select 1 from public.planned_roles r where r.id = c.planned_role_id and r.scenario_id = p_scenario_id))
      or not exists (
        select 1 from public.org_units u where u.id = c.org_unit_id and u.workspace_id = v_scenario.workspace_id)
  ) then
    raise exception 'A change is not valid.' using errcode = 'check_violation', hint = 'invalidAllocation';
  end if;
  if exists (
    select 1 from changes c
    where c.period <> app.month_start(c.period) or c.period < v_open or c.period > v_scenario.last_period
  ) then
    raise exception 'That month is locked.' using errcode = 'check_violation', hint = 'periodLocked';
  end if;
  -- Reach: the person, or the team the time is planned in.
  if exists (
    select 1 from (select distinct c.member_id, c.org_unit_id from changes c) c
    where not ((c.member_id is not null and app.can(v_scenario.workspace_id, 'planning.edit', c.member_id))
      or app.covers_unit(v_scenario.workspace_id, 'planning.edit', c.org_unit_id))
  ) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  delete from public.allocations a using changes c
  where a.scenario_id = p_scenario_id and c.fte = 0 and a.org_unit_id = c.org_unit_id and a.period_start = c.period
    and (a.member_id = c.member_id or a.planned_role_id = c.planned_role_id);
  insert into public.allocations (workspace_id, scenario_id, member_id, org_unit_id, period_start, fte)
  select v_scenario.workspace_id, p_scenario_id, c.member_id, c.org_unit_id, c.period, c.fte
  from changes c where c.fte > 0 and c.member_id is not null
  on conflict (scenario_id, member_id, org_unit_id, period_start) where member_id is not null
  do update set fte = excluded.fte;
  insert into public.allocations (workspace_id, scenario_id, planned_role_id, org_unit_id, period_start, fte)
  select v_scenario.workspace_id, p_scenario_id, c.planned_role_id, c.org_unit_id, c.period, c.fte
  from changes c where c.fte > 0 and c.planned_role_id is not null
  on conflict (scenario_id, planned_role_id, org_unit_id, period_start) where planned_role_id is not null
  do update set fte = excluded.fte;

  select array_agg(distinct c.member_id) filter (where c.member_id is not null),
    array_agg(distinct c.planned_role_id) filter (where c.planned_role_id is not null)
  into v_members, v_roles from changes c;
  drop table changes;

  -- One audit entry per save, not one per cell.
  insert into public.audit_log (workspace_id, actor_user_id, action, table_name, row_id, before, after)
  values (v_scenario.workspace_id, (select auth.uid()), 'update', 'allocations', p_scenario_id::text, null,
    jsonb_build_object('changes', p_changes));

  return jsonb_build_object('saved', v_count,
    'over', app.check_over_allocation(p_scenario_id, coalesce(v_members, '{}'), coalesce(v_roles, '{}')));
end;
$$;

-- Fills a planned role: its time from that month on moves to the person (added to time they
-- already have in the same team), and the role stays as history.
create function public.fill_planned_role(p_planned_role_id uuid, p_member_id uuid, p_from date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_role public.planned_roles;
  v_from date;
begin
  select * into v_role from public.planned_roles where id = p_planned_role_id;
  if v_role.id is null
     or not app.covers_unit(v_role.workspace_id, 'planning.edit', v_role.org_unit_id)
     or not exists (select 1 from public.members m where m.id = p_member_id and m.workspace_id = v_role.workspace_id) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_role.filled_on is not null then
    raise exception 'This role is filled.' using errcode = 'check_violation', hint = 'roleFilled';
  end if;
  v_from := greatest(app.month_start(p_from), app.first_open_month(v_role.scenario_id));
  if v_from is null then
    raise exception 'This plan is locked.' using errcode = 'check_violation', hint = 'scenarioLocked';
  end if;

  insert into public.allocations (workspace_id, scenario_id, member_id, org_unit_id, period_start, fte)
  select a.workspace_id, a.scenario_id, p_member_id, a.org_unit_id, a.period_start, a.fte
  from public.allocations a where a.planned_role_id = v_role.id and a.period_start >= v_from
  on conflict (scenario_id, member_id, org_unit_id, period_start) where member_id is not null
  do update set fte = least(1, public.allocations.fte + excluded.fte);
  delete from public.allocations a where a.planned_role_id = v_role.id and a.period_start >= v_from;

  update public.planned_roles set filled_by = p_member_id, filled_on = p_from where id = v_role.id;
  return app.check_over_allocation(v_role.scenario_id, array[p_member_id], '{}');
end;
$$;

grant execute on function
  public.create_scenario(uuid, text, date, date, boolean),
  public.copy_scenario(uuid, text),
  public.set_scenario_status(uuid, public.scenario_status),
  public.set_live_scenario(uuid),
  public.save_allocations(uuid, jsonb),
  public.fill_planned_role(uuid, uuid, date)
to authenticated;

-- Access ---------------------------------------------------------------------------------------------

-- Used by the policies below, which run as the signed-in user.
grant execute on function
  app.reach_covers(public.reach[], public.reach),
  app.covers_unit(uuid, text, uuid),
  app.first_open_month(uuid)
to authenticated;

alter table public.planning_settings enable row level security;
grant select on public.planning_settings to authenticated;
grant update (period, horizon_years, display_unit, over_allocation, basis, lifecycle, cost_split_field_id)
  on public.planning_settings to authenticated;
create policy "Members read planning settings" on public.planning_settings
  for select to authenticated
  using (app.is_member(workspace_id) and app.feature_on(workspace_id, 'planning'));
create policy "Planning managers change settings" on public.planning_settings
  for update to authenticated
  using (app.has_permission(workspace_id, 'planning.manage_settings'))
  with check (app.has_permission(workspace_id, 'planning.manage_settings'));
create trigger audit after insert or update or delete on public.planning_settings
  for each row execute function app.audit_row_change('workspace_id');

-- Scenarios: seen by anyone who sees plans; renamed, archived or deleted by workspace-wide editors
-- (an approved one by approvers); everything else through the functions.
alter table public.scenarios enable row level security;
grant select, delete on public.scenarios to authenticated;
grant update (name, archived_at) on public.scenarios to authenticated;
create policy "Planners read scenarios" on public.scenarios
  for select to authenticated using (app.has_permission(workspace_id, 'planning.view'));
create policy "Editors rename and archive scenarios" on public.scenarios
  for update to authenticated
  using (app.reach_covers(app.held_reaches(workspace_id, 'planning.edit'), 'workspace')
    and (status <> 'approved' or app.has_permission(workspace_id, 'planning.approve')))
  with check (app.reach_covers(app.held_reaches(workspace_id, 'planning.edit'), 'workspace'));
create policy "Editors delete scenarios that are not live" on public.scenarios
  for delete to authenticated
  using (not is_live and app.reach_covers(app.held_reaches(workspace_id, 'planning.edit'), 'workspace')
    and (status <> 'approved' or app.has_permission(workspace_id, 'planning.approve')));
create trigger audit after insert or update or delete on public.scenarios
  for each row execute function app.audit_row_change('workspace_id');

-- Planned roles: seen and changed within the team reach, while the scenario is open.
alter table public.planned_roles enable row level security;
grant select, delete on public.planned_roles to authenticated;
grant insert (workspace_id, scenario_id, title, org_unit_id, position_id, career_level_id, employment_type_id,
  start_date, end_date, fte, field_values, notes) on public.planned_roles to authenticated;
grant update (title, org_unit_id, position_id, career_level_id, employment_type_id, start_date, end_date, fte,
  field_values, notes) on public.planned_roles to authenticated;
create policy "Planners read planned roles in reach" on public.planned_roles
  for select to authenticated using (app.covers_unit(workspace_id, 'planning.view', org_unit_id));
create policy "Editors add planned roles in reach" on public.planned_roles
  for insert to authenticated
  with check (app.covers_unit(workspace_id, 'planning.edit', org_unit_id) and app.first_open_month(scenario_id) is not null);
create policy "Editors change planned roles in reach" on public.planned_roles
  for update to authenticated
  using (app.covers_unit(workspace_id, 'planning.edit', org_unit_id) and app.first_open_month(scenario_id) is not null)
  with check (app.covers_unit(workspace_id, 'planning.edit', org_unit_id));
create policy "Editors remove planned roles in reach" on public.planned_roles
  for delete to authenticated
  using (app.covers_unit(workspace_id, 'planning.edit', org_unit_id) and app.first_open_month(scenario_id) is not null);
create trigger audit after insert or update or delete on public.planned_roles
  for each row execute function app.audit_row_change('workspace_id');

-- Allocations: seen for people in reach or time planned in teams in reach; written by functions.
alter table public.allocations enable row level security;
grant select on public.allocations to authenticated;
create policy "Planners read allocations in reach" on public.allocations
  for select to authenticated
  using ((member_id is not null and app.can(workspace_id, 'planning.view', member_id))
    or app.covers_unit(workspace_id, 'planning.view', org_unit_id));
