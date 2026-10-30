-- Import preview at 100k rows: the load check found it ran for minutes. Duplicate keys are now
-- found with one window function instead of comparing every row with every earlier row, and the
-- current values to compare against are built for the whole workspace in one query (each unit's
-- path once) instead of a dozen lookups per person. The directory reads everyone's current job in
-- one pass, and the org chart counts direct reports once. Results are unchanged.

-- Everyone's current values on a date, in the shape of an import row (see app.member_snapshot).
create function app.member_snapshots(p_workspace_id uuid, p_date date, p_key_field text)
returns table (member_id uuid, snapshot jsonb)
language sql
stable
security definer
set search_path = ''
as $$
  with unit_paths as (
    select u.id,
      coalesce(array_agg(a.name order by extensions.nlevel(a.path)) filter (where a.parent_id is not null), '{}') as names
    from public.org_units u
    join public.org_units a on a.workspace_id = u.workspace_id and u.path operator(extensions.<@) a.path
    where u.workspace_id = p_workspace_id
    group by u.id
  ),
  jobs as (
    select distinct on (a.member_id) a.member_id, a.org_unit_id, a.manager_member_id, a.position_id,
      a.career_level_id, a.employment_type_id
    from public.member_assignments a
    where a.workspace_id = p_workspace_id and a.valid_from <= p_date and (a.valid_to is null or a.valid_to > p_date)
    order by a.member_id, a.valid_from desc
  ),
  pay as (
    select distinct on (c.member_id) c.member_id, c.annual_salary, c.day_rate
    from public.member_compensation c
    where c.workspace_id = p_workspace_id and c.valid_from <= p_date and (c.valid_to is null or c.valid_to > p_date)
    order by c.member_id, c.valid_from desc
  ),
  custom as (
    select v.member_id, jsonb_object_agg(f.key, v.value) as fields
    from public.member_field_values v join public.custom_fields f on f.id = v.field_id
    where v.workspace_id = p_workspace_id and v.valid_from <= p_date and (v.valid_to is null or v.valid_to > p_date)
    group by v.member_id
  )
  select m.id, jsonb_strip_nulls(jsonb_build_object(
    'person_key', m.person_key,
    'email', lower(m.email::text),
    'full_name', m.full_name,
    'start_date', m.start_date,
    'end_date', m.end_date,
    'country', m.country,
    'unit_path', case when j.member_id is not null then to_jsonb(up.names) end,
    'manager_key', case p_key_field when 'email' then lower(mm.email::text) else mm.person_key end,
    'position', pos.name::text,
    'career_level', cl.name::text,
    'employment_type', et.name::text,
    'annual_salary', pay.annual_salary,
    'day_rate', pay.day_rate,
    'custom', custom.fields
  ))
  from public.members m
  left join jobs j on j.member_id = m.id
  left join unit_paths up on up.id = j.org_unit_id
  left join public.members mm on mm.id = j.manager_member_id
  left join public.positions pos on pos.id = j.position_id
  left join public.career_levels cl on cl.id = j.career_level_id
  left join public.employment_types et on et.id = j.employment_type_id
  left join pay on pay.member_id = m.id
  left join custom on custom.member_id = m.id
  where m.workspace_id = p_workspace_id;
$$;

create or replace function public.import_preview(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.import_jobs := app.load_import_job(p_job_id, array['staging', 'previewed']::public.import_status[]);
  v_counts jsonb;
  v_can_pay boolean := 'workspace' = any (app.held_reaches(v_job.workspace_id, 'people.edit_compensation'));
begin
  -- Match rows to people by key (a hash join, not a lookup per row).
  with matched as (
    select r.row_number, m.id
    from public.import_rows r
    left join public.members m
      on m.workspace_id = v_job.workspace_id
     and (case v_job.key_field when 'email' then lower(m.email::text) else m.person_key end)
       = app.import_key(r.data, v_job.key_field)
    where r.job_id = p_job_id
  )
  update public.import_rows r set member_id = matched.id, errors = '{}', status = 'pending'
  from matched where r.job_id = p_job_id and r.row_number = matched.row_number;

  with keyed as (
    select r.row_number, app.import_key(r.data, v_job.key_field) as key,
      row_number() over (partition by app.import_key(r.data, v_job.key_field) order by r.row_number) as nth
    from public.import_rows r where r.job_id = p_job_id
  )
  update public.import_rows r
  set errors = array_remove(array[
    case when k.key is null then 'missingKey' end,
    case when nullif(btrim(r.data ->> 'email'), '') is not null
              and btrim(r.data ->> 'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then 'emailInvalid' end,
    case when r.member_id is null and nullif(btrim(r.data ->> 'full_name'), '') is null then 'nameRequired' end,
    case when nullif(btrim(r.data ->> 'employment_type'), '') is not null and not exists (
      select 1 from public.employment_types e
      where e.workspace_id = v_job.workspace_id and lower(e.name::text) = lower(btrim(r.data ->> 'employment_type'))
    ) then 'unknownEmploymentType' end,
    case when not v_can_pay and (r.data ? 'annual_salary' or r.data ? 'day_rate') then 'payNotAllowed' end,
    case when k.key is not null and k.nth > 1 then 'duplicateKey' end
  ], null)
  from keyed k
  where r.job_id = p_job_id and r.row_number = k.row_number;

  with snapshots as (
    select * from app.member_snapshots(v_job.workspace_id, v_job.effective_date, v_job.key_field)
  ),
  classified as (
    select r.row_number,
      case
        when cardinality(r.errors) > 0 then 'error'
        when r.member_id is null then 'new'
        when app.import_row_differs(r.data, s.snapshot) then 'changed'
        else 'unchanged'
      end::public.import_row_status as status
    from public.import_rows r
    left join snapshots s on s.member_id = r.member_id
    where r.job_id = p_job_id
  )
  update public.import_rows r set status = c.status
  from classified c where r.job_id = p_job_id and r.row_number = c.row_number;

  select jsonb_build_object(
    'new', count(*) filter (where status = 'new'),
    'changed', count(*) filter (where status = 'changed'),
    'unchanged', count(*) filter (where status = 'unchanged'),
    'errors', count(*) filter (where status = 'error'),
    'leaving', case when v_job.mark_leavers then (
      select count(*) from public.members m
      where m.workspace_id = v_job.workspace_id and m.status = 'active' and not m.is_owner
        and (m.end_date is null or m.end_date >= v_job.effective_date)
        and app.member_key(m, v_job.key_field) is not null
        and not exists (
          select 1 from public.import_rows x
          where x.job_id = p_job_id and app.import_key(x.data, v_job.key_field) = app.member_key(m, v_job.key_field)
        )
    ) else 0 end
  ) into v_counts
  from public.import_rows where job_id = p_job_id;

  update public.import_jobs set status = 'previewed', counts = v_counts, phase = 'people', cursor = 0
  where id = p_job_id;
  return v_counts;
end;
$$;

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



create or replace function public.org_chart(
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
  report_counts as (
    select j.manager_member_id, count(*) as n from jobs j
    where j.manager_member_id is not null group by j.manager_member_id
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
    coalesce(rc.n, 0)::integer,
    j.manager_member_id is not null and j.manager_member_id not in (select member_id from visible),
    (select count(*) from shown) > 2000
  from shown s
  join public.members m on m.id = s.member_id
  join jobs j on j.member_id = m.id
  left join public.org_units u on u.id = j.org_unit_id
  left join public.positions pos on pos.id = j.position_id
  left join public.profiles pr on pr.id = m.user_id
  left join report_counts rc on rc.manager_member_id = m.id
  order by s.depth, m.full_name
  limit 2000;
end;
$$;


-- These functions take very different paths depending on their arguments (whole workspace or a
-- narrow reach, a unit filter or none). A cached generic plan has to keep every path open, which
-- made them up to 20 times slower after a few calls; plan each call for its own arguments.
alter function public.people_directory(uuid, text, uuid, uuid, uuid, text, text, boolean, integer, integer, boolean)
  set plan_cache_mode = force_custom_plan;
alter function public.org_chart(uuid, uuid, date, integer, uuid) set plan_cache_mode = force_custom_plan;
alter function app.visible_members(uuid, text) set plan_cache_mode = force_custom_plan;

-- Who the caller may see, starting from what they hold rather than checking every person: their
-- own row, their reports from the reporting lines, and today's job records in their units (found
-- through the unit index). The results are the same as before.
create or replace function app.visible_members(p_workspace_id uuid, p_permission_key text)
returns table (member_id uuid)
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, p_permission_key);
  v_me uuid := app.current_member_id(p_workspace_id);
  v_my_path extensions.ltree;
  v_paths extensions.ltree[] := '{}';
begin
  if cardinality(v_reaches) = 0 then
    return;
  end if;
  if 'workspace' = any (v_reaches) then
    return query select m.id from public.members m where m.workspace_id = p_workspace_id;
    return;
  end if;

  if v_reaches && array['team', 'team_and_below']::public.reach[] then
    select u.path into v_my_path from public.org_units u
    where u.id = (app.assignment_on(v_me, current_date)).org_unit_id;
  end if;
  if 'units' = any (v_reaches) then
    v_paths := app.granted_unit_paths(p_workspace_id, p_permission_key);
  end if;

  return query
  select v_me where 'own' = any (v_reaches) and v_me is not null
  union
  select c.member_id from public.reporting_closure c
  where 'reports' = any (v_reaches) and c.workspace_id = p_workspace_id and c.manager_member_id = v_me
  union
  select a.member_id
  from public.org_units u
  join public.member_assignments a
    on a.workspace_id = u.workspace_id and a.org_unit_id = u.id
   and a.valid_from <= current_date and (a.valid_to is null or a.valid_to > current_date)
  where u.workspace_id = p_workspace_id
    and (
      ('team' = any (v_reaches) and u.path operator(extensions.=) v_my_path)
      or ('team_and_below' = any (v_reaches) and u.path operator(extensions.<@) v_my_path)
      or ('units' = any (v_reaches) and u.path operator(extensions.<@) any (v_paths))
    );
end;
$$;

-- Headcount per unit; someone who sees the whole workspace skips the list of who they can see.
create or replace function public.unit_headcount(p_workspace_id uuid, p_as_of date default current_date)
returns table (unit_id uuid, direct integer, total integer)
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
#variable_conflict use_column
declare
  v_all boolean := 'workspace' = any (app.held_reaches(p_workspace_id, 'org_chart.view'));
begin
  if not app.feature_on(p_workspace_id, 'org_chart') then
    return;
  end if;
  return query
  with counts as (
    select a.org_unit_id, count(*)::integer as n
    from public.member_assignments a
    where a.workspace_id = p_workspace_id
      and a.valid_from <= p_as_of and (a.valid_to is null or a.valid_to > p_as_of)
      and (v_all or a.member_id in (select v.member_id from app.visible_members(p_workspace_id, 'org_chart.view') v))
    group by a.org_unit_id
  ),
  placed as (
    select u.id, u.path, coalesce(c.n, 0) as n
    from public.org_units u left join counts c on c.org_unit_id = u.id
    where u.workspace_id = p_workspace_id and u.archived_at is null
  )
  select p.id, p.n,
    (select sum(d.n)::integer from placed d where d.path operator(extensions.<@) p.path)
  from placed p;
end;
$$;

-- Staging rows: one permission and status check per batch instead of per row (100k rows took 40
-- seconds through the row-level policy). Direct inserts are closed, so this is the only way in.
create function public.import_stage_rows(p_job_id uuid, p_first_row integer, p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.import_jobs := app.load_import_job(p_job_id, array['staging']::public.import_status[]);
  v_count integer;
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 5000 or p_first_row < 1 then
    raise exception 'Send up to 5,000 rows as an array.' using errcode = 'invalid_parameter_value';
  end if;
  insert into public.import_rows (job_id, workspace_id, row_number, data)
  select v_job.id, v_job.workspace_id, p_first_row + r.n - 1, r.data
  from jsonb_array_elements(p_rows) with ordinality as r (data, n)
  where jsonb_typeof(r.data) = 'object';
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

grant execute on function public.import_stage_rows(uuid, integer, jsonb) to authenticated;
drop policy "Importers stage rows" on public.import_rows;
revoke insert on public.import_rows from authenticated;

-- Leavers never get a last day before their start date (it broke a same-day re-import).
create or replace function public.import_apply_chunk(p_job_id uuid, p_max_rows integer default 2000)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.import_jobs := app.load_import_job(p_job_id, array['previewed', 'applying']::public.import_status[]);
  v_row public.import_rows;
  v_processed integer := 0;
  v_manager uuid;
begin
  perform set_config('app.defer_reporting_closure', 'on', true);
  update public.import_jobs set status = 'applying' where id = p_job_id;

  if v_job.phase = 'people' then
    for v_row in
      select * from public.import_rows
      where job_id = p_job_id and row_number > v_job.cursor and status in ('new', 'changed')
      order by row_number limit p_max_rows
    loop
      update public.import_rows set member_id = app.import_apply_row(v_job, v_row) where job_id = p_job_id and row_number = v_row.row_number;
      v_job.cursor := v_row.row_number;
      v_processed := v_processed + 1;
    end loop;
    if v_processed < p_max_rows then
      v_job.phase := 'managers';
      v_job.cursor := 0;
    end if;

  elsif v_job.phase = 'managers' then
    for v_row in
      select * from public.import_rows
      where job_id = p_job_id and row_number > v_job.cursor and status in ('new', 'changed')
        and data ? 'manager_key'
      order by row_number limit p_max_rows
    loop
      select m.id into v_manager from public.members m
      where m.workspace_id = v_job.workspace_id
        and app.member_key(m, v_job.key_field) = case v_job.key_field
          when 'email' then lower(btrim(v_row.data ->> 'manager_key')) else btrim(v_row.data ->> 'manager_key') end;
      if v_manager is distinct from v_row.member_id then
        perform app.set_assignment_from(v_row.member_id, v_job.effective_date,
          jsonb_build_object('manager_member_id', v_manager));
      end if;
      v_job.cursor := v_row.row_number;
      v_processed := v_processed + 1;
    end loop;
    if v_processed < p_max_rows then
      v_job.phase := 'leavers';
      v_job.cursor := 0;
    end if;

  elsif v_job.phase = 'leavers' then
    if v_job.mark_leavers then
      update public.members m
      -- The day before the import takes effect, but never before they started (someone who
      -- joined in an earlier import today and is missing now leaves on their first day).
      set end_date = greatest(v_job.effective_date - 1, coalesce(m.start_date, v_job.effective_date - 1)),
          status = case
            when greatest(v_job.effective_date - 1, coalesce(m.start_date, v_job.effective_date - 1)) < current_date
              then 'inactive' else m.status end
      where m.workspace_id = v_job.workspace_id and m.status = 'active' and not m.is_owner
        and (m.end_date is null or m.end_date >= v_job.effective_date)
        and app.member_key(m, v_job.key_field) is not null
        and not exists (
          select 1 from public.import_rows x
          where x.job_id = p_job_id and app.import_key(x.data, v_job.key_field) = app.member_key(m, v_job.key_field)
        );
    end if;
    v_job.phase := 'finish';

  elsif v_job.phase = 'finish' then
    perform set_config('app.defer_reporting_closure', 'off', true);
    perform app.rebuild_reporting_closure(v_job.workspace_id);
    delete from public.import_rows where job_id = p_job_id;
    update public.import_jobs set status = 'applied', applied_at = now() where id = p_job_id;
    perform app.notify(v_job.created_by, v_job.workspace_id, 'import', 'import.finished', v_job.counts);
    v_job.phase := 'done';
  end if;

  update public.import_jobs set phase = v_job.phase, cursor = v_job.cursor where id = p_job_id;
  return jsonb_build_object('phase', v_job.phase, 'processed', v_processed, 'done', v_job.phase = 'done');
end;
$$;

