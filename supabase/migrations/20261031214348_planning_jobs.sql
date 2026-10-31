-- Building a plan from people, copying one and applying rate cards run as jobs, a chunk of
-- people per call, so no request waits on a whole workspace (a 24-month plan for 100k people is
-- 2.4M rows). The function that starts a job does its first chunk, so small workspaces finish at
-- once; the app calls run_planning_job until it is done, showing progress.

create type public.planning_job_kind as enum ('build', 'copy', 'apply');

create table public.planning_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  scenario_id uuid not null,
  kind public.planning_job_kind not null,
  -- Copying: the scenario copied from.
  source_scenario_id uuid,
  -- Applying: the first month costed (the first open month when it started).
  from_month date,
  -- The last person done, in id order.
  cursor uuid,
  processed integer not null default 0,
  total integer not null default 0,
  done_at timestamptz,
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, scenario_id) references public.scenarios (workspace_id, id) on delete cascade,
  foreign key (workspace_id, source_scenario_id) references public.scenarios (workspace_id, id) on delete set null (source_scenario_id)
);
-- One unfinished job per scenario.
create unique index planning_jobs_running_idx on public.planning_jobs (scenario_id) where done_at is null;
create index planning_jobs_workspace_idx on public.planning_jobs (workspace_id);
create index planning_jobs_source_idx on public.planning_jobs (source_scenario_id);
create index planning_jobs_created_by_idx on public.planning_jobs (created_by);

create trigger set_updated_at before update on public.planning_jobs
  for each row execute function app.set_updated_at();

alter table public.planning_jobs enable row level security;
grant select on public.planning_jobs to authenticated;
create policy "Planners see plan jobs" on public.planning_jobs
  for select to authenticated using (app.has_permission(workspace_id, 'planning.view'));

-- People per call.
create function app.planning_chunk_size()
returns integer
language sql
immutable
set search_path = ''
as $$ select 2500 $$;

-- Costs for some people (and, when asked, the planned roles) from a month on: each person's
-- details are worked out once per change in their job, custom values or pay.
create function app.apply_rate_cards_to(p_scenario_id uuid, p_from date, p_members uuid[], p_roles boolean)
returns void
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_scenario public.scenarios;
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id;

  create temporary table targets on commit drop as
  select distinct a.member_id, a.planned_role_id, a.period_start
  from public.allocations a
  where a.scenario_id = p_scenario_id and a.period_start >= p_from
    and (a.member_id = any (p_members) or (p_roles and a.planned_role_id is not null));

  create temporary table planned_people on commit drop as
  select distinct t.member_id from targets t where t.member_id is not null;
  alter table planned_people add primary key (member_id);

  -- Months a person's details may change: a record starting or ending in a month changes that
  -- month or the next.
  create temporary table changes on commit drop as
  with dates as (
    select x.member_id, x.valid_from as d, x.valid_to as e from public.member_assignments x join planned_people p using (member_id)
    union all
    select x.member_id, x.valid_from, x.valid_to from public.member_compensation x join planned_people p using (member_id)
    union all
    select x.member_id, case when x.valid_from = '-infinity' then null else x.valid_from end, x.valid_to
    from public.member_field_values x join planned_people p using (member_id)
  ),
  months as (
    select member_id, app.month_start(d) as m from dates where d is not null
    union select member_id, (app.month_start(d) + interval '1 month')::date from dates where d is not null
    union select member_id, app.month_start(e) from dates where e is not null
    union select member_id, (app.month_start(e) + interval '1 month')::date from dates where e is not null
    union select member_id, p_from from planned_people
  )
  select member_id, m as starts,
    coalesce((lead(m) over (partition by member_id order by m) - interval '1 month')::date, v_scenario.last_period) as ends
  from months where m >= p_from and m <= v_scenario.last_period;

  create temporary table detailed on commit drop as
  select t.member_id, null::uuid as planned_role_id, t.period_start, d.attributes, d.cost_method, d.annual_salary, d.salary_currency
  from changes c
  cross join lateral app.member_month_attributes(c.member_id, c.starts) d
  cross join lateral generate_series(c.starts, c.ends, interval '1 month') g
  join targets t on t.member_id = c.member_id and t.period_start = g::date
  union all
  select null, t.planned_role_id, t.period_start, app.planned_role_attributes(t.planned_role_id), null, null, null
  from targets t where t.planned_role_id is not null;

  create temporary table matches on commit drop as
  select d.attributes, app.matching_rate_card(v_scenario.workspace_id, d.attributes) as card_id
  from (select distinct attributes from detailed) d;

  create temporary table card_months on commit drop as
  select c.card_id, g::date as month, r.day_rate, r.working_days, r.currency
  from (select distinct card_id from matches where card_id is not null) c
  cross join generate_series(p_from, v_scenario.last_period, interval '1 month') g
  join lateral (
    select x.day_rate, x.working_days, x.currency from public.rate_card_rates x
    where x.card_id = c.card_id and x.valid_from <= g::date order by x.valid_from desc limit 1
  ) r on true;

  delete from public.cost_snapshots s
  where s.scenario_id = p_scenario_id and s.period_start >= p_from
    and (s.member_id = any (p_members) or (p_roles and s.planned_role_id is not null));
  insert into public.cost_snapshots (workspace_id, scenario_id, member_id, planned_role_id, period_start,
    rate_card_id, source, monthly_cost, currency)
  select v_scenario.workspace_id, p_scenario_id, d.member_id, d.planned_role_id, d.period_start, mt.card_id,
    case when r.day_rate is not null then 'rate_card'
         when d.cost_method = 'annual_salary' and d.annual_salary is not null then 'salary'
         else 'none' end::public.cost_source,
    case when r.day_rate is not null then round(r.day_rate * r.working_days, 2)
         when d.cost_method = 'annual_salary' and d.annual_salary is not null then round(d.annual_salary / 12, 2)
         else 0 end,
    case when r.day_rate is not null then r.currency
         when d.cost_method = 'annual_salary' and d.annual_salary is not null then d.salary_currency end
  from detailed d
  join matches mt on mt.attributes = d.attributes
  left join card_months r on r.card_id = mt.card_id and r.month = d.period_start;

  drop table targets, planned_people, changes, detailed, matches, card_months;
end;
$$;

-- One chunk of a job: the next people in id order. Returns how many people it did.
create function app.run_planning_chunk(p_job public.planning_jobs)
returns integer
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_scenario public.scenarios;
  v_people uuid[];
begin
  select * into v_scenario from public.scenarios where id = p_job.scenario_id;

  if p_job.kind = 'build' then
    select array_agg(id order by id) into v_people from (
      select m.id from public.members m
      where m.workspace_id = p_job.workspace_id and (p_job.cursor is null or m.id > p_job.cursor)
      order by m.id limit app.planning_chunk_size()
    ) c;
    -- Everyone working each month at 1.0 FTE in their team that month.
    insert into public.allocations (workspace_id, scenario_id, member_id, org_unit_id, period_start, fte)
    select p_job.workspace_id, p_job.scenario_id, m.id, a.org_unit_id, g.month, 1
    from public.members m
    cross join lateral (
      select g::date as month from generate_series(v_scenario.first_period, v_scenario.last_period, interval '1 month') g
    ) g
    cross join lateral (
      select x.org_unit_id from public.member_assignments x
      where x.member_id = m.id
        and x.valid_from < (g.month + interval '1 month')::date
        and (x.valid_to is null or x.valid_to > g.month)
      order by x.valid_from desc
      limit 1
    ) a
    where m.id = any (v_people)
      and m.status <> 'inactive'
      and (m.start_date is null or m.start_date < (g.month + interval '1 month')::date)
      and (m.end_date is null or m.end_date >= g.month);

  elsif p_job.kind = 'copy' then
    select array_agg(member_id order by member_id) into v_people from (
      select distinct r.member_id from public.allocation_rows r
      where r.scenario_id = p_job.source_scenario_id and r.member_id is not null
        and (p_job.cursor is null or r.member_id > p_job.cursor)
      order by r.member_id limit app.planning_chunk_size()
    ) c;
    insert into public.allocations (workspace_id, scenario_id, member_id, org_unit_id, period_start, fte)
    select a.workspace_id, p_job.scenario_id, a.member_id, a.org_unit_id, a.period_start, a.fte
    from public.allocations a
    where a.scenario_id = p_job.source_scenario_id and a.member_id = any (v_people);

  else
    select array_agg(member_id order by member_id) into v_people from (
      select distinct r.member_id from public.allocation_rows r
      where r.scenario_id = p_job.scenario_id and r.member_id is not null
        and (p_job.cursor is null or r.member_id > p_job.cursor)
      order by r.member_id limit app.planning_chunk_size()
    ) c;
    -- Planned roles are few: they go with the first chunk.
    perform app.apply_rate_cards_to(p_job.scenario_id, p_job.from_month, coalesce(v_people, '{}'), p_job.cursor is null);
  end if;

  update public.planning_jobs set
    cursor = coalesce(v_people[cardinality(v_people)], cursor),
    processed = processed + coalesce(cardinality(v_people), 0),
    done_at = case when coalesce(cardinality(v_people), 0) < app.planning_chunk_size() then now() end
  where id = p_job.id;
  if p_job.kind = 'apply' and coalesce(cardinality(v_people), 0) < app.planning_chunk_size() then
    update public.scenarios set costs_applied_at = now() where id = p_job.scenario_id;
  end if;
  return coalesce(cardinality(v_people), 0);
end;
$$;

create function app.planning_job_status(p_job_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('job_id', j.id, 'scenario_id', j.scenario_id, 'kind', j.kind,
    'done', j.done_at is not null, 'processed', j.processed, 'total', j.total)
  from public.planning_jobs j where j.id = p_job_id;
$$;

-- Does the next chunk of a job, as someone who may start that kind of job.
create function public.run_planning_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.planning_jobs;
begin
  -- Two pages driving the same job take turns.
  select * into v_job from public.planning_jobs where id = p_job_id for update;
  if v_job.id is null
     or (v_job.kind = 'apply' and not app.has_permission(v_job.workspace_id, 'rate_cards.apply'))
     or (v_job.kind <> 'apply' and not app.reach_covers(app.held_reaches(v_job.workspace_id, 'planning.edit'), 'workspace')) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_job.done_at is null then
    perform app.run_planning_chunk(v_job);
  end if;
  return app.planning_job_status(p_job_id);
end;
$$;

-- Creating from people starts a build job and does its first chunk.
create or replace function public.create_scenario(
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
as $$
declare
  v_id uuid;
  v_job public.planning_jobs;
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
    insert into public.planning_jobs (workspace_id, scenario_id, kind, total)
    values (p_workspace_id, v_id, 'build', (select count(*) from public.members m where m.workspace_id = p_workspace_id))
    returning * into v_job;
    perform app.run_planning_chunk(v_job);
  end if;
  return v_id;
end;
$$;

-- A copy takes its planned roles (and their time) at once, and people's time in a copy job.
create or replace function public.copy_scenario(p_scenario_id uuid, p_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_from public.scenarios;
  v_id uuid;
  v_job public.planning_jobs;
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
  insert into public.allocations (workspace_id, scenario_id, planned_role_id, org_unit_id, period_start, fte)
  select a.workspace_id, v_id, c.new_id, a.org_unit_id, a.period_start, a.fte
  from public.allocations a join copied_roles c on c.old_id = a.planned_role_id
  where a.scenario_id = v_from.id;
  drop table copied_roles;

  insert into public.planning_jobs (workspace_id, scenario_id, kind, source_scenario_id, total)
  values (v_from.workspace_id, v_id, 'copy', v_from.id,
    (select count(distinct r.member_id) from public.allocation_rows r where r.scenario_id = v_from.id))
  returning * into v_job;
  perform app.run_planning_chunk(v_job);
  return v_id;
end;
$$;

-- Applying starts an apply job (or carries on with one already running) and does a chunk.
create or replace function public.apply_rate_cards(p_scenario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_scenario public.scenarios;
  v_open date := app.first_open_month(p_scenario_id);
  v_job public.planning_jobs;
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id;
  if v_scenario.id is null or not app.has_permission(v_scenario.workspace_id, 'rate_cards.apply') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_open is null then
    raise exception 'This plan is locked.' using errcode = 'check_violation', hint = 'scenarioLocked';
  end if;
  select * into v_job from public.planning_jobs where scenario_id = p_scenario_id and done_at is null;
  if v_job.id is not null and v_job.kind <> 'apply' then
    raise exception 'The plan is still being built.' using errcode = 'check_violation', hint = 'planningJobRunning';
  end if;
  if v_job.id is null then
    insert into public.planning_jobs (workspace_id, scenario_id, kind, from_month, total)
    values (v_scenario.workspace_id, p_scenario_id, 'apply', v_open,
      (select count(distinct r.member_id) from public.allocation_rows r where r.scenario_id = p_scenario_id))
    returning * into v_job;
  end if;
  perform app.run_planning_chunk(v_job);
  return app.planning_job_status(v_job.id);
end;
$$;

grant execute on function public.run_planning_job(uuid) to authenticated;
