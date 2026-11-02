-- The people directory sorts by up to three columns and filters on each column, in the database,
-- for 100,000 people as for ten. Replaces the single sort and direction.
--
-- p_sorts: column keys in order, '-' first for descending, e.g. {unit,-start_date}.
-- p_filters: by column key:
--   name, email, position, manager:  {"contains": "text"}
--   start_date:                       {"from": "2020-01-01", "to": "2024-12-31"} (either end)
--   unit (with its sub-units), level, type, position_in: {"in": ["<id>", …]}
-- 'contains' as an ILIKE pattern, with % and _ matched literally; null when there's nothing.
create function app.like_pattern(p_text text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when nullif(btrim(p_text), '') is not null then
    '%' || replace(replace(replace(btrim(p_text), '\', '\\'), '%', '\%'), '_', '\_') || '%'
  end;
$$;

-- A row's value for a sort key, as text that sorts right (dates as YYYY-MM-DD); null for none.
create function app.directory_sort_value(
  p_key text, p_name text, p_unit text, p_position text, p_level text, p_type text,
  p_manager text, p_email text, p_start date
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_key
    when 'name' then p_name when 'unit' then p_unit when 'position' then p_position
    when 'level' then p_level when 'type' then p_type when 'manager' then p_manager
    when 'email' then p_email when 'start_date' then to_char(p_start, 'YYYY-MM-DD')
  end;
$$;

drop function public.people_directory(uuid, text, uuid, uuid, uuid, text, text, boolean, integer, integer, boolean);

create function public.people_directory(
  p_workspace_id uuid,
  p_search text default '',
  p_unit_id uuid default null,
  p_position_id uuid default null,
  p_employment_type_id uuid default null,
  p_status text default 'current',
  p_sorts text[] default '{name}',
  p_filters jsonb default '{}',
  p_limit integer default 50,
  p_offset integer default 0,
  p_for_export boolean default false
)
returns table (member_id uuid, full_name text, email text, person_key text, avatar_path text,
  unit_id uuid, unit_name text, position_name text, career_level_name text, employment_type_name text,
  manager_member_id uuid, manager_name text, start_date date, end_date date, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_permission text := case when p_for_export then 'people.export' else 'people.view' end;
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, v_permission);
  v_all boolean := 'workspace' = any (v_reaches);
  v_keys constant text[] := array['name', 'unit', 'position', 'level', 'type', 'manager', 'email', 'start_date'];
  v_sort text[] := array[]::text[];
  v_desc boolean[] := array[]::boolean[];
  v_entry text;
  v_filter_path extensions.ltree;
  v_pattern text;
  -- Column filters, read once.
  f_name text := app.like_pattern(p_filters -> 'name' ->> 'contains');
  f_email text := app.like_pattern(p_filters -> 'email' ->> 'contains');
  f_position text := app.like_pattern(p_filters -> 'position' ->> 'contains');
  f_manager text := app.like_pattern(p_filters -> 'manager' ->> 'contains');
  f_from date;
  f_to date;
  f_units uuid[];
  f_levels uuid[];
  f_types uuid[];
  f_positions uuid[];
begin
  if cardinality(v_reaches) = 0 then
    return;
  end if;
  if p_status not in ('current', 'leavers', 'all') or cardinality(coalesce(p_sorts, '{}')) > 3 then
    raise exception 'Unknown status, or too many sorts.' using errcode = 'invalid_parameter_value';
  end if;
  foreach v_entry in array coalesce(p_sorts, '{}') loop
    if not ltrim(v_entry, '-') = any (v_keys) then
      raise exception 'Unknown sort: %.', v_entry using errcode = 'invalid_parameter_value';
    end if;
    v_sort := v_sort || ltrim(v_entry, '-');
    v_desc := v_desc || (left(v_entry, 1) = '-');
  end loop;

  begin
    f_from := nullif(p_filters -> 'start_date' ->> 'from', '')::date;
    f_to := nullif(p_filters -> 'start_date' ->> 'to', '')::date;
    f_units := array(select jsonb_array_elements_text(coalesce(p_filters -> 'unit' -> 'in', '[]')))::uuid[];
    f_levels := array(select jsonb_array_elements_text(coalesce(p_filters -> 'level' -> 'in', '[]')))::uuid[];
    f_types := array(select jsonb_array_elements_text(coalesce(p_filters -> 'type' -> 'in', '[]')))::uuid[];
    f_positions := array(select jsonb_array_elements_text(coalesce(p_filters -> 'position_in' -> 'in', '[]')))::uuid[];
  exception when invalid_text_representation or invalid_datetime_format or datetime_field_overflow then
    raise exception 'Unknown filter value.' using errcode = 'invalid_parameter_value';
  end;

  if p_unit_id is not null then
    select u.path into v_filter_path from public.org_units u
    where u.id = p_unit_id and u.workspace_id = p_workspace_id;
    if v_filter_path is null then
      return;
    end if;
  end if;

  v_pattern := app.like_pattern(p_search);

  return query
  with rows as (
    select m.id, m.full_name, m.email::text as email, m.person_key, pr.avatar_path,
      a.org_unit_id, u.name as unit_name, u.path as unit_path, pos.name::text as position_name,
      cl.name::text as level_name, et.name::text as type_name, a.manager_member_id,
      mgr.full_name as manager_name, m.start_date, m.end_date
    from public.members m
    left join (
      -- Everyone's current job in one pass, joined by hash, rather than a lookup per person.
      select distinct on (x.member_id) x.member_id, x.org_unit_id, x.manager_member_id, x.position_id,
        x.career_level_id, x.employment_type_id
      from public.member_assignments x
      where x.workspace_id = p_workspace_id and x.valid_from <= current_date
        and (x.valid_to is null or x.valid_to > current_date)
      order by x.member_id, x.valid_from desc
    ) a on a.member_id = m.id
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
      and (f_name is null or m.full_name ilike f_name)
      and (f_email is null or m.email::text ilike f_email)
      and (f_position is null or pos.name::text ilike f_position)
      and (f_manager is null or mgr.full_name ilike f_manager)
      and (f_from is null or m.start_date >= f_from)
      and (f_to is null or m.start_date <= f_to)
      and (cardinality(f_levels) = 0 or a.career_level_id = any (f_levels))
      and (cardinality(f_types) = 0 or a.employment_type_id = any (f_types))
      and (cardinality(f_positions) = 0 or a.position_id = any (f_positions))
      and (cardinality(f_units) = 0 or exists (
        select 1 from public.org_units f
        where f.workspace_id = p_workspace_id and f.id = any (f_units)
          and u.path operator(extensions.<@) f.path))
  )
  select r.id, r.full_name, r.email, r.person_key, r.avatar_path, r.org_unit_id, r.unit_name,
    r.position_name, r.level_name, r.type_name, r.manager_member_id, r.manager_name,
    r.start_date, r.end_date, count(*) over ()
  from rows r
  order by
    case when not coalesce(v_desc[1], false) then app.directory_sort_value(v_sort[1], r.full_name, r.unit_name, r.position_name, r.level_name, r.type_name, r.manager_name, r.email, r.start_date) end asc nulls last,
    case when coalesce(v_desc[1], false) then app.directory_sort_value(v_sort[1], r.full_name, r.unit_name, r.position_name, r.level_name, r.type_name, r.manager_name, r.email, r.start_date) end desc nulls last,
    case when not coalesce(v_desc[2], false) then app.directory_sort_value(v_sort[2], r.full_name, r.unit_name, r.position_name, r.level_name, r.type_name, r.manager_name, r.email, r.start_date) end asc nulls last,
    case when coalesce(v_desc[2], false) then app.directory_sort_value(v_sort[2], r.full_name, r.unit_name, r.position_name, r.level_name, r.type_name, r.manager_name, r.email, r.start_date) end desc nulls last,
    case when not coalesce(v_desc[3], false) then app.directory_sort_value(v_sort[3], r.full_name, r.unit_name, r.position_name, r.level_name, r.type_name, r.manager_name, r.email, r.start_date) end asc nulls last,
    case when coalesce(v_desc[3], false) then app.directory_sort_value(v_sort[3], r.full_name, r.unit_name, r.position_name, r.level_name, r.type_name, r.manager_name, r.email, r.start_date) end desc nulls last,
    r.full_name, r.id
  limit least(greatest(p_limit, 1), case when p_for_export then 5000 else 500 end)
  offset greatest(p_offset, 0);
end;
$$;

grant execute on function public.people_directory(uuid, text, uuid, uuid, uuid, text, text[], jsonb, integer, integer, boolean)
  to authenticated;
