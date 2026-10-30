-- The org chart: who reports to whom on any date, and headcount per unit. Visibility for people
-- moves into app.visible_members, shared by the directory and the chart so their rules match.

-- Who the caller may see for a permission, from their reach (own, reports, team, team and below,
-- granted units, workspace), worked out once from today's job records and unit paths.
create function app.visible_members(p_workspace_id uuid, p_permission_key text)
returns table (member_id uuid)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, p_permission_key);
  v_me uuid := app.current_member_id(p_workspace_id);
  v_my_path extensions.ltree;
  v_granted extensions.ltree[] := '{}';
begin
  if cardinality(v_reaches) = 0 then
    return;
  end if;
  if 'workspace' = any (v_reaches) then
    return query select m.id from public.members m where m.workspace_id = p_workspace_id;
    return;
  end if;

  select u.path into v_my_path from public.org_units u
  where u.id = (app.assignment_on(v_me, current_date)).org_unit_id;
  if 'units' = any (v_reaches) then
    v_granted := app.granted_unit_paths(p_workspace_id, p_permission_key);
  end if;

  return query
  select m.id
  from public.members m
  left join lateral (
    select x.org_unit_id from public.member_assignments x
    where x.member_id = m.id and x.valid_from <= current_date
      and (x.valid_to is null or x.valid_to > current_date)
    limit 1
  ) a on true
  left join public.org_units u on u.id = a.org_unit_id
  where m.workspace_id = p_workspace_id
    and (
      ('own' = any (v_reaches) and m.id = v_me)
      or ('reports' = any (v_reaches) and exists (
        select 1 from public.reporting_closure c where c.manager_member_id = v_me and c.member_id = m.id))
      or ('team' = any (v_reaches) and u.path operator(extensions.=) v_my_path)
      or ('team_and_below' = any (v_reaches) and u.path operator(extensions.<@) v_my_path)
      or ('units' = any (v_reaches) and u.path operator(extensions.<@) any (v_granted))
    );
end;
$$;

-- The directory, now using app.visible_members (same results; the people_directory tests guard it).
create or replace function public.people_directory(
  p_workspace_id uuid,
  p_search text default '',
  p_unit_id uuid default null,
  p_position_id uuid default null,
  p_employment_type_id uuid default null,
  -- 'current' (not left yet), 'leavers' (left) or 'all'.
  p_status text default 'current',
  -- 'name', 'unit', 'position' or 'start_date'.
  p_sort text default 'name',
  p_descending boolean default false,
  p_limit integer default 50,
  p_offset integer default 0,
  -- Exports list the people within the caller's people.export reach, in larger pages.
  p_for_export boolean default false
)
returns table (
  member_id uuid,
  full_name text,
  email text,
  person_key text,
  avatar_path text,
  unit_id uuid,
  unit_name text,
  position_name text,
  career_level_name text,
  employment_type_name text,
  manager_member_id uuid,
  manager_name text,
  start_date date,
  end_date date,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_permission text := case when p_for_export then 'people.export' else 'people.view' end;
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, v_permission);
  v_all boolean := 'workspace' = any (v_reaches);
  v_filter_path extensions.ltree;
  v_pattern text;
begin
  if cardinality(v_reaches) = 0 then
    return;
  end if;
  if p_status not in ('current', 'leavers', 'all') or p_sort not in ('name', 'unit', 'position', 'start_date') then
    raise exception 'Unknown status or sort.' using errcode = 'invalid_parameter_value';
  end if;

  if p_unit_id is not null then
    select u.path into v_filter_path from public.org_units u
    where u.id = p_unit_id and u.workspace_id = p_workspace_id;
    if v_filter_path is null then
      return;
    end if;
  end if;

  -- Search text is matched literally: % and _ are not wildcards.
  if nullif(btrim(p_search), '') is not null then
    v_pattern := '%' || replace(replace(replace(btrim(p_search), '\', '\\'), '%', '\%'), '_', '\_') || '%';
  end if;

  return query
  select m.id, m.full_name, m.email::text, m.person_key, pr.avatar_path,
    a.org_unit_id, u.name, pos.name::text, cl.name::text, et.name::text,
    a.manager_member_id, mgr.full_name, m.start_date, m.end_date,
    count(*) over ()
  from public.members m
  left join lateral (
    select x.org_unit_id, x.manager_member_id, x.position_id, x.career_level_id, x.employment_type_id
    from public.member_assignments x
    where x.member_id = m.id and x.valid_from <= current_date
      and (x.valid_to is null or x.valid_to > current_date)
    order by x.valid_from desc
    limit 1
  ) a on true
  left join public.org_units u on u.id = a.org_unit_id
  left join public.positions pos on pos.id = a.position_id
  left join public.career_levels cl on cl.id = a.career_level_id
  left join public.employment_types et on et.id = a.employment_type_id
  left join public.members mgr on mgr.id = a.manager_member_id
  left join public.profiles pr on pr.id = m.user_id
  where m.workspace_id = p_workspace_id
    and (v_all or m.id in (select v.member_id from app.visible_members(p_workspace_id, v_permission) v))
    and (v_pattern is null or m.full_name ilike v_pattern or m.email::text ilike v_pattern
         or m.person_key ilike v_pattern)
    and (v_filter_path is null or u.path operator(extensions.<@) v_filter_path)
    and (p_position_id is null or a.position_id = p_position_id)
    and (p_employment_type_id is null or a.employment_type_id = p_employment_type_id)
    and (p_status = 'all' or (p_status = 'current') = (m.end_date is null or m.end_date >= current_date))
  order by
    case when not p_descending then
      case p_sort when 'name' then m.full_name when 'unit' then u.name when 'position' then pos.name::text end
    end asc nulls last,
    case when p_descending then
      case p_sort when 'name' then m.full_name when 'unit' then u.name when 'position' then pos.name::text end
    end desc nulls last,
    case when p_sort = 'start_date' and not p_descending then m.start_date end asc nulls last,
    case when p_sort = 'start_date' and p_descending then m.start_date end desc nulls last,
    m.full_name, m.id
  limit least(greatest(p_limit, 1), case when p_for_export then 5000 else 500 end)
  offset greatest(p_offset, 0);
end;
$$;


-- Part of the reporting tree on a date: the start person's managers up the line (negative depth),
-- the start (0) and up to p_depth levels below it. Without a start, everyone without a manager on
-- that date is a start. Only people within org_chart.view reach; capped at 2,000 rows.
create function public.org_chart(
  p_workspace_id uuid,
  p_root_member_id uuid default null,
  p_as_of date default current_date,
  p_depth integer default 2,
  p_unit_id uuid default null
)
returns table (
  member_id uuid,
  full_name text,
  avatar_path text,
  position_name text,
  unit_id uuid,
  unit_name text,
  manager_member_id uuid,
  depth integer,
  direct_reports integer,
  -- Their manager exists but is outside the caller's view.
  manager_hidden boolean,
  truncated boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_depth integer := least(greatest(coalesce(p_depth, 2), 0), 6);
  v_unit_path extensions.ltree;
begin
  if not app.feature_on(p_workspace_id, 'org_chart')
     or cardinality(app.held_reaches(p_workspace_id, 'org_chart.view')) = 0 then
    return;
  end if;
  if p_unit_id is not null then
    select u.path into v_unit_path from public.org_units u
    where u.id = p_unit_id and u.workspace_id = p_workspace_id;
    if v_unit_path is null then
      return;
    end if;
  end if;

  return query
  with recursive
  jobs as (
    -- Everyone's job record on the date.
    select a.member_id, a.manager_member_id, a.org_unit_id, a.position_id
    from public.member_assignments a
    where a.workspace_id = p_workspace_id
      and a.valid_from <= p_as_of and (a.valid_to is null or a.valid_to > p_as_of)
  ),
  starts as (
    select j.member_id from jobs j
    where (p_root_member_id is not null and j.member_id = p_root_member_id)
       or (p_root_member_id is null and p_unit_id is null and j.manager_member_id is null)
       or (p_root_member_id is null and p_unit_id is not null and exists (
             select 1 from public.org_units u
             where u.id = j.org_unit_id and u.path operator(extensions.=) v_unit_path))
  ),
  below (member_id, depth) as (
    select s.member_id, 0 from starts s
    union
    select j.member_id, b.depth + 1
    from below b join jobs j on j.manager_member_id = b.member_id
    where b.depth < v_depth and p_unit_id is null
  ),
  above (member_id, depth) as (
    select j.manager_member_id, -1 from jobs j
    where p_root_member_id is not null and j.member_id = p_root_member_id and j.manager_member_id is not null
    union
    select j.manager_member_id, a.depth - 1
    from above a join jobs j on j.member_id = a.member_id
    where j.manager_member_id is not null and a.depth > -50
  ),
  tree as (
    select t.member_id, min(t.depth) as depth
    from (select * from below union all select * from above) t
    group by t.member_id
  ),
  visible as (
    select v.member_id from app.visible_members(p_workspace_id, 'org_chart.view') v
  ),
  shown as (
    select t.member_id, t.depth from tree t
    where t.member_id in (select member_id from visible)
    order by t.depth, t.member_id
    limit 2001
  )
  select m.id, m.full_name, pr.avatar_path, pos.name::text, j.org_unit_id, u.name,
    case when j.manager_member_id in (select member_id from visible) then j.manager_member_id end,
    s.depth,
    (select count(*)::integer from jobs d where d.manager_member_id = m.id),
    j.manager_member_id is not null and j.manager_member_id not in (select member_id from visible),
    (select count(*) from shown) > 2000
  from shown s
  join public.members m on m.id = s.member_id
  join jobs j on j.member_id = m.id
  left join public.org_units u on u.id = j.org_unit_id
  left join public.positions pos on pos.id = j.position_id
  left join public.profiles pr on pr.id = m.user_id
  order by s.depth, m.full_name
  limit 2000;
end;
$$;

-- People per unit on a date: in the unit itself, and in it with everything under it.
create function public.unit_headcount(p_workspace_id uuid, p_as_of date default current_date)
returns table (unit_id uuid, direct integer, total integer)
language sql
stable
security definer
set search_path = ''
as $$
  with counts as (
    select a.org_unit_id, count(*)::integer as n
    from public.member_assignments a
    where a.workspace_id = p_workspace_id
      and a.valid_from <= p_as_of and (a.valid_to is null or a.valid_to > p_as_of)
      and a.member_id in (select v.member_id from app.visible_members(p_workspace_id, 'org_chart.view') v)
    group by a.org_unit_id
  )
  select u.id,
    coalesce((select c.n from counts c where c.org_unit_id = u.id), 0),
    coalesce((select sum(c.n)::integer from counts c join public.org_units cu on cu.id = c.org_unit_id
              where cu.path operator(extensions.<@) u.path), 0)
  from public.org_units u
  where u.workspace_id = p_workspace_id and u.archived_at is null
    and app.feature_on(p_workspace_id, 'org_chart');
$$;

grant execute on function
  public.org_chart(uuid, uuid, date, integer, uuid),
  public.unit_headcount(uuid, date)
to authenticated;
