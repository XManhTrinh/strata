-- The people directory: one call that works out who the caller may see (once, from their reaches,
-- reporting lines and unit paths), then searches, filters, sorts and pages in the database.

create extension if not exists pg_trgm with schema extensions;

create index members_full_name_trgm_idx on public.members
  using gin (full_name extensions.gin_trgm_ops);
create index members_workspace_name_idx on public.members (workspace_id, full_name);

create function public.people_directory(
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
  p_offset integer default 0
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
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, 'people.view');
  v_all boolean := 'workspace' = any (v_reaches);
  v_me uuid := app.current_member_id(p_workspace_id);
  v_my_path extensions.ltree;
  v_granted extensions.ltree[] := '{}';
  v_filter_path extensions.ltree;
  v_pattern text;
begin
  if cardinality(v_reaches) = 0 then
    return;
  end if;
  if p_status not in ('current', 'leavers', 'all') or p_sort not in ('name', 'unit', 'position', 'start_date') then
    raise exception 'Unknown status or sort.' using errcode = 'invalid_parameter_value';
  end if;

  if not v_all then
    select u.path into v_my_path from public.org_units u
    where u.id = (app.assignment_on(v_me, current_date)).org_unit_id;
    if 'units' = any (v_reaches) then
      v_granted := app.granted_unit_paths(p_workspace_id, 'people.view');
    end if;
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
    and (
      v_all
      or ('own' = any (v_reaches) and m.id = v_me)
      or ('reports' = any (v_reaches) and exists (
        select 1 from public.reporting_closure c where c.manager_member_id = v_me and c.member_id = m.id))
      or ('team' = any (v_reaches) and u.path operator(extensions.=) v_my_path)
      or ('team_and_below' = any (v_reaches) and u.path operator(extensions.<@) v_my_path)
      or ('units' = any (v_reaches) and u.path operator(extensions.<@) any (v_granted))
    )
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
  limit least(greatest(p_limit, 1), 500)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.people_directory(uuid, text, uuid, uuid, uuid, text, text, boolean, integer, integer)
  to authenticated;
