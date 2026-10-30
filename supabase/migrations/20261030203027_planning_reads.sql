-- Phase 4 reads: the allocation grid a page at a time, and the live plan's open roles for the org
-- chart. Both count only what the caller may see with planning.view.

-- One row per person or planned role and team, with their FTE per month in that team and their
-- total across teams (to show who is over or under full time).
create function public.allocation_grid(
  p_scenario_id uuid,
  p_from date,
  p_to date,
  -- Only time in this unit and the units below it.
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

  create temporary table grid_rows on commit drop as
  select a.member_id, a.planned_role_id, a.org_unit_id
  from public.allocations a
  join public.org_units u on u.id = a.org_unit_id
  where a.scenario_id = p_scenario_id and a.period_start between p_from and p_to
    and (v_path is null or u.path operator(extensions.<@) v_path)
    and (v_all or a.member_id in (select s.member_id from seen_members s) or a.org_unit_id in (select s.unit_id from seen_units s))
  group by a.member_id, a.planned_role_id, a.org_unit_id;

  return query
  with named as (
    select g.member_id, g.planned_role_id, g.org_unit_id,
      coalesce(m.full_name, r.title) as name, u.name as unit_name, r.filled_on
    from grid_rows g
    join public.org_units u on u.id = g.org_unit_id
    left join public.members m on m.id = g.member_id
    left join public.planned_roles r on r.id = g.planned_role_id
    where v_search is null or coalesce(m.full_name, r.title) ilike '%' || v_search || '%'
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

  drop table seen_members, seen_units, grid_rows;
end;
$$;

-- Open roles in the live plan that haven't ended, for the org chart.
create function public.open_roles(p_workspace_id uuid)
returns table (planned_role_id uuid, org_unit_id uuid, title text, start_date date, fte numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select r.id, r.org_unit_id, r.title, r.start_date, r.fte
  from public.scenarios s
  join public.planned_roles r on r.scenario_id = s.id
  where s.workspace_id = p_workspace_id and s.is_live
    and r.filled_on is null and (r.end_date is null or r.end_date >= current_date)
    and app.covers_unit(p_workspace_id, 'planning.view', r.org_unit_id)
  order by r.start_date, r.title;
$$;

grant execute on function
  public.allocation_grid(uuid, date, date, uuid, text, integer, integer),
  public.open_roles(uuid)
to authenticated;
