-- Phase 4 rate cards and cost: sets and groups (for the screen only), cards with conditions on any
-- built-in or custom field, dated rates, and the engine that writes each scenario's cost
-- snapshots. Cards are tried by priority; the first non-default card whose conditions all match
-- wins, otherwise the first default card. Totals roll up the unit tree and split by a custom field.

create type public.rate_operator as enum ('equals', 'not_equals', 'starts_with', 'starts_with_any', 'ends_with', 'contains', 'in');
create type public.cost_source as enum ('rate_card', 'salary', 'none');

create table public.rate_card_sets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create table public.rate_card_groups (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  set_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, set_id) references public.rate_card_sets (workspace_id, id) on delete set null (set_id)
);
create index rate_card_groups_set_id_idx on public.rate_card_groups (set_id);

create table public.rate_cards (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  group_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  -- Lower is tried first.
  priority integer not null default 100,
  -- Used when no other card matches; conditions are ignored.
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, group_id) references public.rate_card_groups (workspace_id, id) on delete set null (group_id)
);
create index rate_cards_order_idx on public.rate_cards (workspace_id, is_default, priority) where archived_at is null;
create index rate_cards_group_id_idx on public.rate_cards (group_id);

create table public.rate_card_conditions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  card_id uuid not null,
  -- A built-in field, or custom:<key> for a custom field.
  field text not null check (
    field in ('unit', 'unit_code', 'position', 'career_level', 'employment_type', 'country')
    or field ~ '^custom:[a-z][a-z0-9_]{0,59}$'
  ),
  operator public.rate_operator not null,
  -- Lists (starts with any, in) are comma separated.
  value text not null check (char_length(value) <= 1000),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (workspace_id, card_id) references public.rate_cards (workspace_id, id) on delete cascade
);
create index rate_card_conditions_card_idx on public.rate_card_conditions (card_id);

-- A rate holds from its month until the next rate of the same card.
create table public.rate_card_rates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  card_id uuid not null,
  valid_from date not null check (valid_from = app.month_start(valid_from)),
  day_rate numeric(12, 2) not null check (day_rate >= 0),
  working_days numeric(5, 2) not null check (working_days > 0 and working_days <= 31),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (card_id, valid_from),
  foreign key (workspace_id, card_id) references public.rate_cards (workspace_id, id) on delete cascade
);

-- What one person or planned role costs a month at 1.0 FTE, as last applied.
create table public.cost_snapshots (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  scenario_id uuid not null,
  member_id uuid,
  planned_role_id uuid,
  period_start date not null check (period_start = app.month_start(period_start)),
  rate_card_id uuid,
  source public.cost_source not null,
  monthly_cost numeric(14, 2) not null default 0 check (monthly_cost >= 0),
  currency char(3) check (currency ~ '^[A-Z]{3}$'),
  constraint cost_snapshots_one_target check (num_nonnulls(member_id, planned_role_id) = 1),
  foreign key (workspace_id, scenario_id) references public.scenarios (workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (scenario_id, planned_role_id) references public.planned_roles (scenario_id, id) on delete cascade,
  foreign key (workspace_id, rate_card_id) references public.rate_cards (workspace_id, id) on delete set null (rate_card_id)
);
create unique index cost_snapshots_member_idx on public.cost_snapshots (scenario_id, member_id, period_start)
  where member_id is not null;
create unique index cost_snapshots_role_idx on public.cost_snapshots (scenario_id, planned_role_id, period_start)
  where planned_role_id is not null;
create index cost_snapshots_member_id_idx on public.cost_snapshots (workspace_id, member_id) where member_id is not null;
create index cost_snapshots_rate_card_id_idx on public.cost_snapshots (rate_card_id);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['rate_card_sets', 'rate_card_groups', 'rate_cards', 'rate_card_conditions', 'rate_card_rates']
  loop
    execute format('create trigger set_updated_at before update on public.%I
      for each row execute function app.set_updated_at()', v_table);
  end loop;
end;
$$;

-- The engine -------------------------------------------------------------------------------------------

-- Values are trimmed and compared ignoring case; a missing value is empty.
create function app.condition_matches(p_actual text, p_operator public.rate_operator, p_expected text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_operator
    when 'equals' then a = e
    when 'not_equals' then a <> e
    when 'starts_with' then starts_with(a, e)
    when 'ends_with' then right(a, length(e)) = e
    when 'contains' then strpos(a, e) > 0
    when 'starts_with_any' then exists (
      select 1 from unnest(string_to_array(p_expected, ',')) x
      where btrim(x) <> '' and starts_with(a, lower(btrim(x))))
    when 'in' then exists (
      select 1 from unnest(string_to_array(p_expected, ',')) x
      where btrim(x) <> '' and a = lower(btrim(x)))
  end
  from (select lower(btrim(coalesce(p_actual, ''))) as a, lower(btrim(p_expected)) as e) v;
$$;

-- The card for a set of field values: the first matching non-default card by priority, otherwise
-- the first default card. A non-default card without conditions never matches.
create function app.matching_rate_card(p_workspace_id uuid, p_attributes jsonb)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.id from public.rate_cards c
  where c.workspace_id = p_workspace_id and c.archived_at is null
    and (c.is_default or (
      exists (select 1 from public.rate_card_conditions k where k.card_id = c.id)
      and not exists (
        select 1 from public.rate_card_conditions k
        where k.card_id = c.id and not app.condition_matches(p_attributes ->> k.field, k.operator, k.value))))
  order by c.is_default, c.priority, c.created_at
  limit 1;
$$;

-- A person's field values for a month (their job that month, and custom values at its start),
-- with what annual-salary costing needs.
create function app.member_month_attributes(p_member_id uuid, p_month date)
returns table (attributes jsonb, cost_method public.cost_method, annual_salary numeric, salary_currency char(3))
language sql
stable
security definer
set search_path = ''
as $$
  select
    jsonb_strip_nulls(jsonb_build_object(
      'unit', u.name, 'unit_code', u.code, 'position', p.name, 'career_level', l.name,
      'employment_type', e.name::text, 'country', m.country::text))
      || coalesce((
        select jsonb_object_agg('custom:' || f.key,
          case jsonb_typeof(v.value)
            when 'array' then (select string_agg(x, ', ') from jsonb_array_elements_text(v.value) x)
            else v.value #>> '{}' end)
        from public.member_field_values v
        join public.custom_fields f on f.id = v.field_id
        where v.member_id = m.id and v.valid_from <= p_month and (v.valid_to is null or v.valid_to > p_month)
      ), '{}'),
    e.cost_method, c.annual_salary, c.currency
  from public.members m
  left join lateral (
    select x.* from public.member_assignments x
    where x.member_id = m.id and x.valid_from < (p_month + interval '1 month')::date
      and (x.valid_to is null or x.valid_to > p_month)
    order by x.valid_from desc limit 1
  ) a on true
  left join public.org_units u on u.id = a.org_unit_id
  left join public.positions p on p.id = a.position_id
  left join public.career_levels l on l.id = a.career_level_id
  left join public.employment_types e on e.id = a.employment_type_id
  left join lateral (
    select x.annual_salary, x.currency from public.member_compensation x
    where x.member_id = m.id and x.valid_from < (p_month + interval '1 month')::date
      and (x.valid_to is null or x.valid_to > p_month)
    order by x.valid_from desc limit 1
  ) c on true
  where m.id = p_member_id;
$$;

create function app.planned_role_attributes(p_planned_role_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_strip_nulls(jsonb_build_object(
      'unit', u.name, 'unit_code', u.code, 'position', p.name, 'career_level', l.name,
      'employment_type', e.name::text))
    || coalesce((select jsonb_object_agg('custom:' || f.key, f.value) from jsonb_each_text(r.field_values) f), '{}')
  from public.planned_roles r
  join public.org_units u on u.id = r.org_unit_id
  left join public.positions p on p.id = r.position_id
  left join public.career_levels l on l.id = r.career_level_id
  left join public.employment_types e on e.id = r.employment_type_id
  where r.id = p_planned_role_id;
$$;

-- Writes the scenario's cost snapshots from its open months on: each person and planned role is
-- matched once per distinct set of field values, then costed per month from the card's rate (or
-- salary ÷ 12 for annual-salary employment types without a card).
create function public.apply_rate_cards(p_scenario_id uuid)
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
  select t.member_id, t.planned_role_id, t.period_start, x.attributes, x.cost_method, x.annual_salary, x.salary_currency
  from (
    select distinct a.member_id, a.planned_role_id, a.period_start
    from public.allocations a where a.scenario_id = p_scenario_id and a.period_start >= v_open
  ) t
  cross join lateral (
    select ma.attributes, ma.cost_method, ma.annual_salary, ma.salary_currency
    from app.member_month_attributes(t.member_id, t.period_start) ma where t.member_id is not null
    union all
    select app.planned_role_attributes(t.planned_role_id), null, null, null where t.planned_role_id is not null
  ) x;

  create temporary table matches on commit drop as
  select d.attributes, app.matching_rate_card(v_scenario.workspace_id, d.attributes) as card_id
  from (select distinct attributes from targets) d;

  delete from public.cost_snapshots where scenario_id = p_scenario_id and period_start >= v_open;
  insert into public.cost_snapshots (workspace_id, scenario_id, member_id, planned_role_id, period_start,
    rate_card_id, source, monthly_cost, currency)
  select v_scenario.workspace_id, p_scenario_id, t.member_id, t.planned_role_id, t.period_start, mt.card_id,
    case when r.day_rate is not null then 'rate_card'
         when t.cost_method = 'annual_salary' and t.annual_salary is not null then 'salary'
         else 'none' end::public.cost_source,
    case when r.day_rate is not null then round(r.day_rate * r.working_days, 2)
         when t.cost_method = 'annual_salary' and t.annual_salary is not null then round(t.annual_salary / 12, 2)
         else 0 end,
    case when r.day_rate is not null then r.currency
         when t.cost_method = 'annual_salary' and t.annual_salary is not null then t.salary_currency end
  from targets t
  join matches mt on mt.attributes = t.attributes
  left join lateral (
    select x.day_rate, x.working_days, x.currency from public.rate_card_rates x
    where x.card_id = mt.card_id and x.valid_from <= t.period_start
    order by x.valid_from desc limit 1
  ) r on true;

  update public.scenarios set costs_applied_at = now() where id = p_scenario_id;
  select jsonb_build_object(
    'snapshots', count(*),
    'rate_card', count(*) filter (where source = 'rate_card'),
    'salary', count(*) filter (where source = 'salary'),
    'none', count(*) filter (where source = 'none'))
  into v_result
  from public.cost_snapshots where scenario_id = p_scenario_id and period_start >= v_open;
  drop table targets;
  drop table matches;
  return v_result;
end;
$$;

-- Which card a person or planned role would get in a month, for the rate card screen. The cost is
-- the card's rate; salary-based cost is shown only to those who see the person's pay.
create function public.rate_card_preview(
  p_workspace_id uuid,
  p_month date,
  p_member_id uuid default null,
  p_planned_role_id uuid default null
)
returns table (rate_card_id uuid, rate_card_name text, source public.cost_source, monthly_cost numeric, currency char(3))
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_month date := app.month_start(p_month);
  v_attributes jsonb;
  v_cost_method public.cost_method;
  v_salary numeric;
  v_salary_currency char(3);
  v_card uuid;
begin
  if not app.has_permission(p_workspace_id, 'rate_cards.view') or num_nonnulls(p_member_id, p_planned_role_id) <> 1 then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if p_member_id is not null then
    if not app.can(p_workspace_id, 'people.view', p_member_id) then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    select ma.attributes, ma.cost_method, ma.annual_salary, ma.salary_currency
    into v_attributes, v_cost_method, v_salary, v_salary_currency
    from app.member_month_attributes(p_member_id, v_month) ma;
  else
    if not exists (select 1 from public.planned_roles r where r.id = p_planned_role_id and r.workspace_id = p_workspace_id
                   and app.covers_unit(p_workspace_id, 'planning.view', r.org_unit_id)) then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    v_attributes := app.planned_role_attributes(p_planned_role_id);
  end if;
  v_card := app.matching_rate_card(p_workspace_id, v_attributes);

  return query
  select v_card, c.name,
    case when r.day_rate is not null then 'rate_card'
         when v_cost_method = 'annual_salary' and v_salary is not null then 'salary'
         else 'none' end::public.cost_source,
    case when r.day_rate is not null then round(r.day_rate * r.working_days, 2)
         when v_cost_method = 'annual_salary' and v_salary is not null
           and app.can(p_workspace_id, 'people.view_compensation', p_member_id) then round(v_salary / 12, 2) end,
    case when r.day_rate is not null then r.currency
         when v_cost_method = 'annual_salary' and v_salary is not null
           and app.can(p_workspace_id, 'people.view_compensation', p_member_id) then v_salary_currency end
  from (select 1) one
  left join public.rate_cards c on c.id = v_card
  left join lateral (
    select x.day_rate, x.working_days, x.currency from public.rate_card_rates x
    where x.card_id = v_card and x.valid_from <= v_month order by x.valid_from desc limit 1
  ) r on true;
end;
$$;

-- Totals -------------------------------------------------------------------------------------------------

-- FTE, headcount and cost per month, either by unit (the given unit and each unit directly under
-- it, each with everything below) or by a custom field's value. Only time the caller may see is
-- counted, and cost only where they see cost (null when they see none).
create function public.capacity_totals(
  p_scenario_id uuid,
  p_from date,
  p_to date,
  -- 'unit' or 'field'.
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
begin
  select * into v_scenario from public.scenarios where id = p_scenario_id;
  v_ws := v_scenario.workspace_id;
  if v_ws is null or not app.has_permission(v_ws, 'planning.view') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  v_all := app.reach_covers(app.held_reaches(v_ws, 'planning.view'), 'workspace');
  v_cost_any := app.has_permission(v_ws, 'planning.view_cost');
  v_cost_all := app.reach_covers(app.held_reaches(v_ws, 'planning.view_cost'), 'workspace');

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

  -- Each allocation's group.
  create temporary table grouped (allocation_id bigint primary key, group_id text, group_label text) on commit drop;
  if p_group_by = 'field' then
    select * into v_field from public.custom_fields f where f.id = p_field_id and f.workspace_id = v_ws;
    if v_field.id is null or (v_field.sensitive
       and not app.reach_covers(app.held_reaches(v_ws, 'people.view_compensation'), 'workspace')) then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    insert into grouped
    select a.id, g.value, g.value
    from public.allocations a
    left join public.planned_roles r on r.id = a.planned_role_id
    cross join lateral (
      select coalesce(
        (select case jsonb_typeof(v.value)
            when 'array' then (select string_agg(x, ', ') from jsonb_array_elements_text(v.value) x)
            else v.value #>> '{}' end
         from public.member_field_values v
         where v.member_id = a.member_id and v.field_id = v_field.id
           and v.valid_from <= a.period_start and (v.valid_to is null or v.valid_to > a.period_start)),
        r.field_values ->> v_field.key) as value
    ) g
    where a.scenario_id = p_scenario_id and a.period_start between p_from and p_to;
  else
    select * into v_parent from public.org_units u
    where u.workspace_id = v_ws and (u.id = p_parent_unit_id or (p_parent_unit_id is null and u.parent_id is null));
    if v_parent.id is null then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    insert into grouped
    select a.id, coalesce(c.id, v_parent.id)::text, coalesce(c.name, v_parent.name)
    from public.allocations a
    join public.org_units u on u.id = a.org_unit_id and u.path operator(extensions.<@) v_parent.path
    left join public.org_units c on c.workspace_id = v_ws and extensions.nlevel(u.path) > extensions.nlevel(v_parent.path)
      and c.path operator(extensions.=) extensions.subpath(u.path, 0, extensions.nlevel(v_parent.path) + 1)
    where a.scenario_id = p_scenario_id and a.period_start between p_from and p_to;
  end if;

  return query
  select g.group_id, g.group_label, a.period_start, sum(a.fte),
    count(distinct coalesce(a.member_id, a.planned_role_id))::integer,
    case when v_cost_any then coalesce(sum(a.fte * cs.monthly_cost) filter (
      where v_cost_all or a.member_id in (select member_id from cost_members) or a.org_unit_id in (select unit_id from cost_units)), 0)
    end,
    -- One currency per workspace in v1.
    (select w.currency from public.workspaces w where w.id = v_ws)
  from public.allocations a
  join grouped g on g.allocation_id = a.id
  left join public.cost_snapshots cs on cs.scenario_id = a.scenario_id and cs.period_start = a.period_start
    and (cs.member_id = a.member_id or cs.planned_role_id = a.planned_role_id)
  where v_all or a.member_id in (select member_id from seen_members) or a.org_unit_id in (select unit_id from seen_units)
  group by g.group_id, g.group_label, a.period_start
  order by g.group_label nulls last, a.period_start;

  drop table seen_members, seen_units, cost_members, cost_units, grouped;
end;
$$;

-- Saves a card with its conditions and rates in one go, as the signed-in user (the policies below
-- decide who may). Rates are by month, one per month.
create function public.save_rate_card(
  p_workspace_id uuid,
  p_name text,
  p_priority integer,
  p_is_default boolean,
  -- [{field, operator, value}]
  p_conditions jsonb,
  -- [{valid_from, day_rate, working_days, currency}]
  p_rates jsonb,
  -- A new card when null.
  p_card_id uuid default null,
  p_group_id uuid default null
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid := p_card_id;
begin
  if not p_is_default and jsonb_array_length(coalesce(p_conditions, '[]')) = 0 then
    raise exception 'A card needs conditions unless it is a default.' using errcode = 'check_violation', hint = 'rateCardNeedsConditions';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_conditions, '[]')) as c (field text)
    where c.field like 'custom:%' and not exists (
      select 1 from public.custom_fields f
      where f.workspace_id = p_workspace_id and 'custom:' || f.key = c.field)
  ) then
    raise exception 'That field does not exist.' using errcode = 'check_violation', hint = 'unknownField';
  end if;
  if exists (
    select 1 from jsonb_to_recordset(coalesce(p_rates, '[]')) as r (valid_from date)
    group by app.month_start(r.valid_from) having count(*) > 1
  ) then
    raise exception 'One rate per month.' using errcode = 'check_violation', hint = 'rateMonthTwice';
  end if;

  if v_id is null then
    insert into public.rate_cards (workspace_id, name, group_id, priority, is_default)
    values (p_workspace_id, btrim(p_name), p_group_id, p_priority, p_is_default)
    returning id into v_id;
  else
    update public.rate_cards
    set name = btrim(p_name), group_id = p_group_id, priority = p_priority, is_default = p_is_default
    where id = v_id and workspace_id = p_workspace_id;
    if not found then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    delete from public.rate_card_conditions where card_id = v_id;
    delete from public.rate_card_rates where card_id = v_id;
  end if;

  insert into public.rate_card_conditions (workspace_id, card_id, field, operator, value, sort_order)
  select p_workspace_id, v_id, c.field, c.operator, btrim(c.value), c.n * 10
  from rows from (jsonb_to_recordset(coalesce(p_conditions, '[]')) as (field text, operator public.rate_operator, value text))
    with ordinality as c (field, operator, value, n);
  insert into public.rate_card_rates (workspace_id, card_id, valid_from, day_rate, working_days, currency)
  select p_workspace_id, v_id, app.month_start(r.valid_from), r.day_rate, r.working_days, upper(r.currency)
  from jsonb_to_recordset(coalesce(p_rates, '[]')) as r (valid_from date, day_rate numeric, working_days numeric, currency text);
  return v_id;
end;
$$;

grant execute on function
  public.apply_rate_cards(uuid),
  public.save_rate_card(uuid, text, integer, boolean, jsonb, jsonb, uuid, uuid),
  public.rate_card_preview(uuid, date, uuid, uuid),
  public.capacity_totals(uuid, date, date, text, uuid, uuid)
to authenticated;

-- Access -----------------------------------------------------------------------------------------------

-- Rates are written directly, and their check on the month runs as the writer.
grant execute on function app.month_start(date) to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['rate_card_sets', 'rate_card_groups', 'rate_cards', 'rate_card_conditions', 'rate_card_rates']
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', v_table);
    execute format($p$create policy "Rate card viewers read" on public.%I
      for select to authenticated using (app.has_permission(workspace_id, 'rate_cards.view'))$p$, v_table);
    execute format($p$create policy "Rate card editors add" on public.%I
      for insert to authenticated with check (app.has_permission(workspace_id, 'rate_cards.edit'))$p$, v_table);
    execute format($p$create policy "Rate card editors change" on public.%I
      for update to authenticated
      using (app.has_permission(workspace_id, 'rate_cards.edit'))
      with check (app.has_permission(workspace_id, 'rate_cards.edit'))$p$, v_table);
    execute format($p$create policy "Rate card editors remove" on public.%I
      for delete to authenticated using (app.has_permission(workspace_id, 'rate_cards.edit'))$p$, v_table);
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function app.audit_row_change(%L)', v_table, 'workspace_id');
  end loop;
end;
$$;

-- Snapshots: seen with plan costs for the person, or for the planned role's team; written by apply.
alter table public.cost_snapshots enable row level security;
grant select on public.cost_snapshots to authenticated;
create policy "Cost viewers read snapshots in reach" on public.cost_snapshots
  for select to authenticated
  using ((member_id is not null and app.can(workspace_id, 'planning.view_cost', member_id))
    or (planned_role_id is not null and exists (
      select 1 from public.planned_roles r
      where r.id = planned_role_id and app.covers_unit(workspace_id, 'planning.view_cost', r.org_unit_id))));
