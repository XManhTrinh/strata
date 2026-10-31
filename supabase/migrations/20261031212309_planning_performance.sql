-- Planning at 100k people. The grid pages over a derived list of who is planned in which team
-- (kept by triggers on allocations), not over every month; totals group once per unit rather than
-- per allocation and join costs by person and by role; applying rate cards works out a person's
-- details once per change in their job, custom values or pay rather than once per month.

-- Who is planned in which team: one row per scenario, person or planned role, and team.
create table public.allocation_rows (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  scenario_id uuid not null,
  member_id uuid,
  planned_role_id uuid,
  org_unit_id uuid not null,
  constraint allocation_rows_one_target check (num_nonnulls(member_id, planned_role_id) = 1),
  foreign key (workspace_id, scenario_id) references public.scenarios (workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (scenario_id, planned_role_id) references public.planned_roles (scenario_id, id) on delete cascade,
  foreign key (workspace_id, org_unit_id) references public.org_units (workspace_id, id)
);
create unique index allocation_rows_member_idx on public.allocation_rows (scenario_id, member_id, org_unit_id)
  where member_id is not null;
create unique index allocation_rows_role_idx on public.allocation_rows (scenario_id, planned_role_id, org_unit_id)
  where planned_role_id is not null;
create index allocation_rows_unit_idx on public.allocation_rows (scenario_id, org_unit_id);
create index allocation_rows_member_id_idx on public.allocation_rows (workspace_id, member_id) where member_id is not null;
create index allocation_rows_org_unit_id_idx on public.allocation_rows (org_unit_id);

-- Read only through allocation_grid.
alter table public.allocation_rows enable row level security;

insert into public.allocation_rows (workspace_id, scenario_id, member_id, planned_role_id, org_unit_id)
select distinct workspace_id, scenario_id, member_id, planned_role_id, org_unit_id from public.allocations;

create function app.add_allocation_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.allocation_rows (workspace_id, scenario_id, member_id, planned_role_id, org_unit_id)
  select distinct n.workspace_id, n.scenario_id, n.member_id, n.planned_role_id, n.org_unit_id from new_rows n
  on conflict do nothing;
  return null;
end;
$$;

-- A row goes once its person or role has no time left in that team.
create function app.remove_allocation_rows()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.allocation_rows r
  using (select distinct o.scenario_id, o.member_id, o.org_unit_id from old_rows o where o.member_id is not null) o
  where r.scenario_id = o.scenario_id and r.member_id = o.member_id and r.org_unit_id = o.org_unit_id
    and not exists (select 1 from public.allocations a
      where a.scenario_id = o.scenario_id and a.member_id = o.member_id and a.org_unit_id = o.org_unit_id);
  delete from public.allocation_rows r
  using (select distinct o.scenario_id, o.planned_role_id, o.org_unit_id from old_rows o where o.planned_role_id is not null) o
  where r.scenario_id = o.scenario_id and r.planned_role_id = o.planned_role_id and r.org_unit_id = o.org_unit_id
    and not exists (select 1 from public.allocations a
      where a.scenario_id = o.scenario_id and a.planned_role_id = o.planned_role_id and a.org_unit_id = o.org_unit_id);
  return null;
end;
$$;

create trigger add_allocation_rows after insert on public.allocations
  referencing new table as new_rows for each statement execute function app.add_allocation_rows();
create trigger remove_allocation_rows after delete on public.allocations
  referencing old table as old_rows for each statement execute function app.remove_allocation_rows();

-- The grid, paging over the rows rather than every month.
create or replace function public.allocation_grid(
  p_scenario_id uuid,
  p_from date,
  p_to date,
  p_unit_id uuid default null,
  p_search text default '',
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  member_id uuid,
  planned_role_id uuid,
  name text,
  org_unit_id uuid,
  unit_name text,
  filled_on date,
  months jsonb,
  totals jsonb,
  total_count bigint
)
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_scenario public.scenarios;
  v_ws uuid;
  v_all boolean;
  v_path extensions.ltree;
  v_search text := nullif(btrim(coalesce(p_search, '')), '');
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id;
  v_ws := v_scenario.workspace_id;
  if v_ws is null or not app.has_permission(v_ws, 'planning.view') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  v_all := app.reach_covers(app.held_reaches(v_ws, 'planning.view'), 'workspace');
  if p_unit_id is not null then
    select u.path into v_path from public.org_units u where u.id = p_unit_id and u.workspace_id = v_ws;
  end if;

  create temporary table seen_members (member_id uuid primary key) on commit drop;
  create temporary table seen_units (unit_id uuid primary key) on commit drop;
  if not v_all then
    insert into seen_members select v.member_id from app.visible_members(v_ws, 'planning.view') v on conflict do nothing;
    insert into seen_units select u.id from public.org_units u where u.workspace_id = v_ws and app.covers_unit(v_ws, 'planning.view', u.id);
  end if;

  return query
  with named as (
    select r.member_id, r.planned_role_id, r.org_unit_id,
      coalesce(m.full_name, pr.title) as name, u.name as unit_name, pr.filled_on
    from public.allocation_rows r
    join public.org_units u on u.id = r.org_unit_id
    left join public.members m on m.id = r.member_id
    left join public.planned_roles pr on pr.id = r.planned_role_id
    where r.scenario_id = p_scenario_id
      and (v_path is null or u.path operator(extensions.<@) v_path)
      and (v_all or r.member_id in (select s.member_id from seen_members s) or r.org_unit_id in (select s.unit_id from seen_units s))
      and (v_search is null or coalesce(m.full_name, pr.title) ilike '%' || v_search || '%')
  ),
  page as (
    select n.*, count(*) over () as total_count from named n
    order by n.unit_name, n.planned_role_id is not null, n.name, n.member_id, n.planned_role_id
    limit p_limit offset p_offset
  )
  select p.member_id, p.planned_role_id, p.name, p.org_unit_id, p.unit_name, p.filled_on,
    coalesce((
      select jsonb_object_agg(a.period_start, a.fte) from public.allocations a
      where a.scenario_id = p_scenario_id and a.org_unit_id = p.org_unit_id
        and a.period_start between p_from and p_to
        and (a.member_id = p.member_id or a.planned_role_id = p.planned_role_id)
    ), '{}'),
    coalesce((
      select jsonb_object_agg(t.period_start, t.fte) from (
        select a.period_start, sum(a.fte) as fte from public.allocations a
        where a.scenario_id = p_scenario_id and a.period_start between p_from and p_to
          and (a.member_id = p.member_id or a.planned_role_id = p.planned_role_id)
        group by a.period_start
      ) t
    ), '{}'),
    p.total_count
  from page p
  order by p.unit_name, p.planned_role_id is not null, p.name, p.member_id, p.planned_role_id;

  drop table seen_members, seen_units;
end;
$$;

-- Totals: each unit's group worked out once; costs joined by person and by role.
create or replace function public.capacity_totals(
  p_scenario_id uuid,
  p_from date,
  p_to date,
  p_group_by text default 'unit',
  p_parent_unit_id uuid default null,
  p_field_id uuid default null
)
returns table (group_id text, group_label text, period_start date, fte numeric, headcount integer, cost numeric, currency char(3))
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_scenario public.scenarios;
  v_ws uuid;
  v_all boolean;
  v_cost_any boolean;
  v_cost_all boolean;
  v_parent public.org_units;
  v_field public.custom_fields;
  v_currency char(3);
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id;
  v_ws := v_scenario.workspace_id;
  if v_ws is null or not app.has_permission(v_ws, 'planning.view') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  v_all := app.reach_covers(app.held_reaches(v_ws, 'planning.view'), 'workspace');
  v_cost_any := app.has_permission(v_ws, 'planning.view_cost');
  v_cost_all := app.reach_covers(app.held_reaches(v_ws, 'planning.view_cost'), 'workspace');
  select w.currency into v_currency from public.workspaces w where w.id = v_ws;

  create temporary table seen_members (member_id uuid primary key) on commit drop;
  create temporary table seen_units (unit_id uuid primary key) on commit drop;
  create temporary table cost_members (member_id uuid primary key) on commit drop;
  create temporary table cost_units (unit_id uuid primary key) on commit drop;
  if not v_all then
    insert into seen_members select v.member_id from app.visible_members(v_ws, 'planning.view') v on conflict do nothing;
    insert into seen_units select u.id from public.org_units u where u.workspace_id = v_ws and app.covers_unit(v_ws, 'planning.view', u.id);
  end if;
  if v_cost_any and not v_cost_all then
    insert into cost_members select v.member_id from app.visible_members(v_ws, 'planning.view_cost') v on conflict do nothing;
    insert into cost_units select u.id from public.org_units u where u.workspace_id = v_ws and app.covers_unit(v_ws, 'planning.view_cost', u.id);
  end if;

  -- What each allocation counts as, before grouping.
  create temporary table counted on commit drop as
  select a.member_id, a.planned_role_id, a.org_unit_id, a.period_start, a.fte,
    case when v_cost_any and (v_cost_all or a.member_id in (select c.member_id from cost_members c)
                              or a.org_unit_id in (select c.unit_id from cost_units c))
         then a.fte * coalesce(cm.monthly_cost, cr.monthly_cost, 0) end as cost
  from public.allocations a
  left join public.cost_snapshots cm on a.member_id is not null and cm.scenario_id = p_scenario_id
    and cm.member_id = a.member_id and cm.period_start = a.period_start
  left join public.cost_snapshots cr on a.planned_role_id is not null and cr.scenario_id = p_scenario_id
    and cr.planned_role_id = a.planned_role_id and cr.period_start = a.period_start
  where a.scenario_id = p_scenario_id and a.period_start between p_from and p_to
    and (v_all or a.member_id in (select s.member_id from seen_members s) or a.org_unit_id in (select s.unit_id from seen_units s));

  if p_group_by = 'field' then
    select * into v_field from public.custom_fields f where f.id = p_field_id and f.workspace_id = v_ws;
    if v_field.id is null or (v_field.sensitive
       and not app.reach_covers(app.held_reaches(v_ws, 'people.view_compensation'), 'workspace')) then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    return query
    select g.value, g.value, c.period_start, sum(c.fte),
      count(distinct coalesce(c.member_id, c.planned_role_id))::integer,
      case when v_cost_any then coalesce(sum(c.cost), 0) end, v_currency
    from counted c
    left join public.planned_roles r on r.id = c.planned_role_id
    left join public.member_field_values v on v.member_id = c.member_id and v.field_id = v_field.id
      and v.valid_from <= c.period_start and (v.valid_to is null or v.valid_to > c.period_start)
    cross join lateral (
      select coalesce(
        case jsonb_typeof(v.value)
          when 'array' then (select string_agg(x, ', ') from jsonb_array_elements_text(v.value) x)
          else v.value #>> '{}' end,
        r.field_values ->> v_field.key) as value
    ) g
    group by g.value, c.period_start
    order by g.value nulls last, c.period_start;
  else
    select * into v_parent from public.org_units u
    where u.workspace_id = v_ws and (u.id = p_parent_unit_id or (p_parent_unit_id is null and u.parent_id is null));
    if v_parent.id is null then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    -- Each unit under the parent counts in the parent itself or in the child it sits under.
    create temporary table unit_groups on commit drop as
    select u.id as unit_id, coalesce(c.id, v_parent.id)::text as group_id, coalesce(c.name, v_parent.name) as group_label
    from public.org_units u
    left join public.org_units c on c.workspace_id = v_ws and extensions.nlevel(u.path) > extensions.nlevel(v_parent.path)
      and c.path operator(extensions.=) extensions.subpath(u.path, 0, extensions.nlevel(v_parent.path) + 1)
    where u.workspace_id = v_ws and u.path operator(extensions.<@) v_parent.path;
    return query
    select g.group_id, g.group_label, c.period_start, sum(c.fte),
      count(distinct coalesce(c.member_id, c.planned_role_id))::integer,
      case when v_cost_any then coalesce(sum(c.cost), 0) end, v_currency
    from counted c join unit_groups g on g.unit_id = c.org_unit_id
    group by g.group_id, g.group_label, c.period_start
    order by g.group_label, c.period_start;
    drop table unit_groups;
  end if;

  drop table seen_members, seen_units, cost_members, cost_units, counted;
end;
$$;

-- Applying rate cards: a person's details are worked out at the first open month and at each
-- month their job, custom values or pay may change, then shared by the months until the next.
create or replace function public.apply_rate_cards(p_scenario_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_scenario public.scenarios;
  v_open date := app.first_open_month(p_scenario_id);
  v_result jsonb;
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id;
  if v_scenario.id is null or not app.has_permission(v_scenario.workspace_id, 'rate_cards.apply') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_open is null then
    raise exception 'This plan is locked.' using errcode = 'check_violation', hint = 'scenarioLocked';
  end if;

  create temporary table targets on commit drop as
  select distinct a.member_id, a.planned_role_id, a.period_start
  from public.allocations a where a.scenario_id = p_scenario_id and a.period_start >= v_open;

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
    union select member_id, v_open from planned_people
  )
  select member_id, m as starts,
    coalesce((lead(m) over (partition by member_id order by m) - interval '1 month')::date, v_scenario.last_period) as ends
  from months where m >= v_open and m <= v_scenario.last_period;

  create temporary table segment_details on commit drop as
  select c.member_id, c.starts, c.ends, d.attributes, d.cost_method, d.annual_salary, d.salary_currency
  from changes c cross join lateral app.member_month_attributes(c.member_id, c.starts) d;

  create temporary table detailed on commit drop as
  select t.member_id, null::uuid as planned_role_id, t.period_start, s.attributes, s.cost_method, s.annual_salary, s.salary_currency
  from segment_details s
  cross join lateral generate_series(s.starts, s.ends, interval '1 month') g
  join targets t on t.member_id = s.member_id and t.period_start = g::date
  union all
  select null, t.planned_role_id, t.period_start, app.planned_role_attributes(t.planned_role_id), null, null, null
  from targets t where t.planned_role_id is not null;

  create temporary table matches on commit drop as
  select d.attributes, app.matching_rate_card(v_scenario.workspace_id, d.attributes) as card_id
  from (select distinct attributes from detailed) d;

  create temporary table card_months on commit drop as
  select c.card_id, g::date as month, r.day_rate, r.working_days, r.currency
  from (select distinct card_id from matches where card_id is not null) c
  cross join generate_series(v_open, v_scenario.last_period, interval '1 month') g
  join lateral (
    select x.day_rate, x.working_days, x.currency from public.rate_card_rates x
    where x.card_id = c.card_id and x.valid_from <= g::date order by x.valid_from desc limit 1
  ) r on true;

  delete from public.cost_snapshots where scenario_id = p_scenario_id and period_start >= v_open;
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

  update public.scenarios set costs_applied_at = now() where id = p_scenario_id;
  select jsonb_build_object(
    'snapshots', count(*),
    'rate_card', count(*) filter (where source = 'rate_card'),
    'salary', count(*) filter (where source = 'salary'),
    'none', count(*) filter (where source = 'none'))
  into v_result
  from public.cost_snapshots where scenario_id = p_scenario_id and period_start >= v_open;
  drop table targets, planned_people, changes, segment_details, detailed, matches, card_months;
  return v_result;
end;
$$;
