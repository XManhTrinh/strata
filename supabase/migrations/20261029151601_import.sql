-- People import and re-import. The browser parses the file and sends mapped rows in batches; the
-- database previews "new / changed / unchanged / leaving" and applies in resumable chunks short
-- enough for request time limits. Rows are deleted once applied, so no HR file is kept.
--
-- Row shape (all optional except the key): person_key, email, full_name, start_date, end_date,
-- country, unit_path (names, one per job level), manager_key, position, career_level,
-- employment_type, annual_salary, day_rate, currency, custom ({ field key: value }).

create type public.import_status as enum ('staging', 'previewed', 'applying', 'applied', 'cancelled');
create type public.import_row_status as enum ('pending', 'new', 'changed', 'unchanged', 'error', 'applied');

create table public.import_mappings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- Column → field map, the key field and the hierarchy levels, as the import screen saved them.
  settings jsonb not null default '{}',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, name)
);

create index import_mappings_created_by_idx on public.import_mappings (created_by);
create trigger set_updated_at before update on public.import_mappings
  for each row execute function app.set_updated_at();

create table public.import_jobs (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  created_by uuid references auth.users (id) on delete set null,
  status public.import_status not null default 'staging',
  key_field text not null check (key_field in ('person_key', 'email')),
  -- The hierarchy level for each position in a row's unit_path.
  unit_level_ids uuid[] not null default '{}',
  -- Changes are dated from this day; leavers' last day is the day before.
  effective_date date not null default current_date,
  mark_leavers boolean not null default true,
  phase text not null default 'people' check (phase in ('people', 'managers', 'leavers', 'finish', 'done')),
  cursor integer not null default 0,
  counts jsonb not null default '{}',
  error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  applied_at timestamptz,
  unique (workspace_id, id)
);

create index import_jobs_workspace_created_idx on public.import_jobs (workspace_id, created_at desc);
create index import_jobs_created_by_idx on public.import_jobs (created_by);
create trigger set_updated_at before update on public.import_jobs
  for each row execute function app.set_updated_at();

create table public.import_rows (
  job_id uuid not null,
  workspace_id uuid not null,
  row_number integer not null check (row_number >= 1),
  data jsonb not null,
  status public.import_row_status not null default 'pending',
  member_id uuid,
  errors text[] not null default '{}',
  primary key (job_id, row_number),
  foreign key (workspace_id, job_id) references public.import_jobs (workspace_id, id) on delete cascade
);

create index import_rows_job_status_idx on public.import_rows (job_id, status, row_number);

-- Access: importers only. Rows can be added while the job is staging.
alter table public.import_mappings enable row level security;
alter table public.import_jobs enable row level security;
alter table public.import_rows enable row level security;

grant select, insert, update, delete on public.import_mappings to authenticated;
grant select, insert on public.import_jobs to authenticated;
grant update (status) on public.import_jobs to authenticated;
grant select, insert on public.import_rows to authenticated;

create policy "Importers manage mappings" on public.import_mappings
  for all to authenticated
  using (app.has_permission(workspace_id, 'people.import'))
  with check (app.has_permission(workspace_id, 'people.import'));

create policy "Importers read jobs" on public.import_jobs
  for select to authenticated using (app.has_permission(workspace_id, 'people.import'));
create policy "Importers start jobs" on public.import_jobs
  for insert to authenticated
  with check (app.has_permission(workspace_id, 'people.import') and created_by = (select auth.uid()));
create policy "Importers cancel jobs" on public.import_jobs
  for update to authenticated
  using (app.has_permission(workspace_id, 'people.import'))
  with check (app.has_permission(workspace_id, 'people.import') and status = 'cancelled');

create policy "Importers read rows" on public.import_rows
  for select to authenticated using (app.has_permission(workspace_id, 'people.import'));
create policy "Importers stage rows" on public.import_rows
  for insert to authenticated
  with check (
    app.has_permission(workspace_id, 'people.import')
    and exists (select 1 from public.import_jobs j where j.id = job_id and j.status = 'staging')
  );

create trigger audit after insert or update on public.import_jobs
  for each row execute function app.audit_row_change('workspace_id');

-- Reporting lines can be rebuilt once at the end of an import instead of per statement.
create or replace function app.on_assignments_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  if coalesce(current_setting('app.defer_reporting_closure', true), '') = 'on' then
    return null;
  end if;
  for v_workspace_id in select distinct workspace_id from changed_rows loop
    perform app.rebuild_reporting_closure(v_workspace_id);
  end loop;
  return null;
end;
$$;

-- Helpers ------------------------------------------------------------------------------------------

create function app.import_key(p_data jsonb, p_key_field text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_key_field
    when 'email' then nullif(lower(btrim(p_data ->> 'email')), '')
    else nullif(btrim(p_data ->> 'person_key'), '')
  end;
$$;

create function app.member_key(p_member public.members, p_key_field text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_key_field when 'email' then lower(p_member.email::text) else p_member.person_key end;
$$;

-- Unit names from the root down to a unit (root excluded).
create function app.unit_path_names(p_unit_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(a.name order by extensions.nlevel(a.path)), '{}')
  from public.org_units u
  join public.org_units a on a.workspace_id = u.workspace_id
    and u.path operator(extensions.<@) a.path and a.parent_id is not null
  where u.id = p_unit_id;
$$;

-- The current values of a person in the same shape as an import row, for comparing.
create function app.member_snapshot(p_member_id uuid, p_date date, p_key_field text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with a as (select * from app.assignment_on(p_member_id, p_date)),
  c as (
    select * from public.member_compensation c
    where c.member_id = p_member_id and c.valid_from <= p_date and (c.valid_to is null or c.valid_to > p_date)
  )
  select jsonb_strip_nulls(jsonb_build_object(
    'person_key', m.person_key,
    'email', lower(m.email::text),
    'full_name', m.full_name,
    'start_date', m.start_date,
    'end_date', m.end_date,
    'country', m.country,
    'unit_path', (select app.unit_path_names(a.org_unit_id) from a),
    'manager_key', (select app.member_key(mm, p_key_field) from a join public.members mm on mm.id = a.manager_member_id),
    'position', (select p.name::text from a join public.positions p on p.id = a.position_id),
    'career_level', (select l.name::text from a join public.career_levels l on l.id = a.career_level_id),
    'employment_type', (select e.name::text from a join public.employment_types e on e.id = a.employment_type_id),
    'annual_salary', (select c.annual_salary from c),
    'day_rate', (select c.day_rate from c),
    'custom', (
      select jsonb_object_agg(f.key, v.value)
      from public.member_field_values v join public.custom_fields f on f.id = v.field_id
      where v.member_id = p_member_id and v.valid_from <= p_date and (v.valid_to is null or v.valid_to > p_date)
    )
  ))
  from public.members m where m.id = p_member_id;
$$;

-- Whether an import row would change anything: only the fields the row carries are compared.
create function app.import_row_differs(p_row jsonb, p_snapshot jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select exists (
    select 1 from jsonb_each(p_row - 'custom' - 'currency') as r (key, value)
    where r.value <> 'null'::jsonb
      and case
        when r.key in ('annual_salary', 'day_rate')
          then (r.value #>> '{}')::numeric is distinct from (p_snapshot ->> r.key)::numeric
        when r.key in ('email', 'person_key', 'manager_key', 'country')
          then lower(btrim(r.value #>> '{}')) is distinct from lower(p_snapshot ->> r.key)
        when r.key = 'unit_path'
          then (select coalesce(array_agg(x) filter (where btrim(x) <> ''), '{}') from jsonb_array_elements_text(r.value) x)
            is distinct from (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(coalesce(p_snapshot -> 'unit_path', '[]')) x)
        else btrim(r.value #>> '{}') is distinct from p_snapshot ->> r.key
      end
  )
  or exists (
    select 1 from jsonb_each(coalesce(p_row -> 'custom', '{}')) as c (key, value)
    where c.value <> 'null'::jsonb and c.value is distinct from p_snapshot -> 'custom' -> c.key
  );
$$;

-- Finds or creates the unit for a path of names, one per job level (empty names skip a level).
create function app.import_unit(p_workspace_id uuid, p_level_ids uuid[], p_names text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent uuid := (select id from public.org_units where workspace_id = p_workspace_id and parent_id is null);
  v_unit uuid;
  v_name text;
begin
  for i in 1 .. coalesce(array_length(p_names, 1), 0) loop
    v_name := btrim(p_names[i]);
    continue when v_name is null or v_name = '' or i > coalesce(array_length(p_level_ids, 1), 0);

    select id into v_unit from public.org_units
    where workspace_id = p_workspace_id and parent_id = v_parent and lower(name) = lower(v_name)
      and archived_at is null
    limit 1;

    if v_unit is null then
      insert into public.org_units (workspace_id, parent_id, level_id, name, path)
      values (p_workspace_id, v_parent, p_level_ids[i], v_name, 'x')
      returning id into v_unit;
    end if;
    v_parent := v_unit;
    v_unit := null;
  end loop;
  return v_parent;
end;
$$;

-- Applies changed job-record fields from a date: updates the record starting that day, or ends the
-- current one and starts a new one (up to the next future record).
create function app.set_assignment_from(p_member_id uuid, p_date date, p_patch jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_assignments := app.assignment_on(p_member_id, p_date);
  v_next date;
  v_target public.member_assignments;
begin
  if v_current.id is null then
    select min(valid_from) into v_next from public.member_assignments where member_id = p_member_id and valid_from > p_date;
    insert into public.member_assignments (workspace_id, member_id, valid_from, valid_to, org_unit_id,
      manager_member_id, position_id, career_level_id, employment_type_id)
    select m.workspace_id, m.id, p_date, v_next,
      coalesce((p_patch ->> 'org_unit_id')::uuid,
               (select id from public.org_units where workspace_id = m.workspace_id and parent_id is null)),
      (p_patch ->> 'manager_member_id')::uuid, (p_patch ->> 'position_id')::uuid,
      (p_patch ->> 'career_level_id')::uuid, (p_patch ->> 'employment_type_id')::uuid
    from public.members m where m.id = p_member_id;
    return;
  end if;

  v_target := jsonb_populate_record(v_current, p_patch);
  if (v_target.org_unit_id, v_target.manager_member_id, v_target.position_id, v_target.career_level_id,
      v_target.employment_type_id)
     is not distinct from
     (v_current.org_unit_id, v_current.manager_member_id, v_current.position_id, v_current.career_level_id,
      v_current.employment_type_id) then
    return;
  end if;

  if v_current.valid_from = p_date then
    update public.member_assignments
    set org_unit_id = v_target.org_unit_id, manager_member_id = v_target.manager_member_id,
        position_id = v_target.position_id, career_level_id = v_target.career_level_id,
        employment_type_id = v_target.employment_type_id
    where id = v_current.id;
  else
    update public.member_assignments set valid_to = p_date where id = v_current.id;
    insert into public.member_assignments (workspace_id, member_id, valid_from, valid_to, org_unit_id,
      manager_member_id, position_id, career_level_id, employment_type_id)
    values (v_current.workspace_id, p_member_id, p_date, v_current.valid_to, v_target.org_unit_id,
      v_target.manager_member_id, v_target.position_id, v_target.career_level_id, v_target.employment_type_id);
  end if;
end;
$$;

create function app.set_compensation_from(
  p_member_id uuid, p_date date, p_salary numeric, p_day_rate numeric, p_currency text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_compensation;
begin
  select * into v_current from public.member_compensation
  where member_id = p_member_id and valid_from <= p_date and (valid_to is null or valid_to > p_date);

  if v_current.id is not null
    and (v_current.annual_salary, v_current.day_rate, v_current.currency)
      is not distinct from (p_salary, p_day_rate, p_currency::bpchar) then
    return;
  end if;

  if v_current.valid_from = p_date then
    update public.member_compensation
    set annual_salary = p_salary, day_rate = p_day_rate, currency = p_currency
    where id = v_current.id;
  else
    if v_current.id is not null then
      update public.member_compensation set valid_to = p_date where id = v_current.id;
    end if;
    insert into public.member_compensation (workspace_id, member_id, valid_from, valid_to, annual_salary, day_rate, currency)
    select m.workspace_id, m.id, p_date, v_current.valid_to, p_salary, p_day_rate, p_currency
    from public.members m where m.id = p_member_id;
  end if;
end;
$$;

create function app.set_field_value_from(p_member_id uuid, p_field public.custom_fields, p_date date, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_field_values;
  v_from date := case when p_field.keep_history then p_date else '-infinity'::date end;
begin
  select * into v_current from public.member_field_values
  where member_id = p_member_id and field_id = p_field.id
    and valid_from <= v_from and (valid_to is null or valid_to > v_from);

  if v_current.value is not distinct from p_value then
    return;
  end if;

  if v_current.id is not null and v_current.valid_from = v_from then
    update public.member_field_values set value = p_value where id = v_current.id;
  else
    if v_current.id is not null then
      update public.member_field_values set valid_to = v_from where id = v_current.id;
    end if;
    insert into public.member_field_values (workspace_id, member_id, field_id, value, valid_from, valid_to)
    values (p_field.workspace_id, p_member_id, p_field.id, p_value, v_from, v_current.valid_to);
  end if;
end;
$$;

-- Preview --------------------------------------------------------------------------------------------

create function app.load_import_job(p_job_id uuid, p_statuses public.import_status[])
returns public.import_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.import_jobs;
begin
  select * into v_job from public.import_jobs where id = p_job_id for update;
  if v_job.id is null or not app.has_permission(v_job.workspace_id, 'people.import') then
    raise exception 'Import not found.' using errcode = 'no_data_found';
  end if;
  if not v_job.status = any (p_statuses) then
    raise exception 'This import is %.', v_job.status using errcode = 'check_violation';
  end if;
  return v_job;
end;
$$;

-- Classifies every staged row and counts leavers. Safe to run again after more rows are staged.
create function public.import_preview(p_job_id uuid)
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
  update public.import_rows r
  set member_id = m.id, errors = '{}', status = 'pending'
  from public.import_rows r2
  left join public.members m
    on m.workspace_id = v_job.workspace_id
   and app.member_key(m, v_job.key_field) = app.import_key(r2.data, v_job.key_field)
  where r.job_id = p_job_id and r2.job_id = r.job_id and r2.row_number = r.row_number;

  update public.import_rows r
  set errors = array_remove(array[
    case when app.import_key(r.data, v_job.key_field) is null then 'missingKey' end,
    case when nullif(btrim(r.data ->> 'email'), '') is not null
              and btrim(r.data ->> 'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then 'emailInvalid' end,
    case when r.member_id is null and nullif(btrim(r.data ->> 'full_name'), '') is null then 'nameRequired' end,
    case when nullif(btrim(r.data ->> 'employment_type'), '') is not null and not exists (
      select 1 from public.employment_types e
      where e.workspace_id = v_job.workspace_id and lower(e.name::text) = lower(btrim(r.data ->> 'employment_type'))
    ) then 'unknownEmploymentType' end,
    case when not v_can_pay and (r.data ? 'annual_salary' or r.data ? 'day_rate') then 'payNotAllowed' end,
    case when exists (
      select 1 from public.import_rows d
      where d.job_id = r.job_id and d.row_number < r.row_number
        and app.import_key(d.data, v_job.key_field) = app.import_key(r.data, v_job.key_field)
    ) then 'duplicateKey' end
  ], null)
  where r.job_id = p_job_id;

  update public.import_rows r
  set status = case
    when cardinality(r.errors) > 0 then 'error'
    when r.member_id is null then 'new'
    when app.import_row_differs(r.data, app.member_snapshot(r.member_id, v_job.effective_date, v_job.key_field)) then 'changed'
    else 'unchanged'
  end::public.import_row_status
  where r.job_id = p_job_id;

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

-- Apply ----------------------------------------------------------------------------------------------

create function app.import_apply_row(p_job public.import_jobs, p_row public.import_rows)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  d jsonb := p_row.data;
  v_member_id uuid := p_row.member_id;
  v_patch jsonb := '{}';
  v_field public.custom_fields;
  v_currency text;
begin
  if v_member_id is null then
    insert into public.members (workspace_id, full_name, email, person_key, start_date, end_date, country)
    values (p_job.workspace_id, btrim(d ->> 'full_name'), nullif(btrim(d ->> 'email'), ''),
            nullif(btrim(d ->> 'person_key'), ''),
            coalesce((d ->> 'start_date')::date, p_job.effective_date), (d ->> 'end_date')::date,
            upper(nullif(btrim(d ->> 'country'), '')))
    returning id into v_member_id;
  else
    update public.members set
      full_name = coalesce(nullif(btrim(d ->> 'full_name'), ''), full_name),
      email = coalesce(nullif(btrim(d ->> 'email'), ''), email::text),
      person_key = coalesce(nullif(btrim(d ->> 'person_key'), ''), person_key),
      start_date = coalesce((d ->> 'start_date')::date, start_date),
      end_date = case when d ? 'end_date' then (d ->> 'end_date')::date else end_date end,
      country = coalesce(upper(nullif(btrim(d ->> 'country'), '')), country)
    where id = v_member_id;
  end if;

  if d ? 'unit_path' then
    v_patch := v_patch || jsonb_build_object('org_unit_id', app.import_unit(p_job.workspace_id, p_job.unit_level_ids,
      array(select jsonb_array_elements_text(d -> 'unit_path'))));
  end if;

  if nullif(btrim(d ->> 'position'), '') is not null then
    insert into public.positions (workspace_id, name) values (p_job.workspace_id, btrim(d ->> 'position'))
    on conflict (workspace_id, name) do nothing;
    v_patch := v_patch || jsonb_build_object('position_id',
      (select id from public.positions where workspace_id = p_job.workspace_id and name = btrim(d ->> 'position')));
  end if;

  if nullif(btrim(d ->> 'career_level'), '') is not null then
    insert into public.career_levels (workspace_id, name, rank)
    values (p_job.workspace_id, btrim(d ->> 'career_level'),
            coalesce((select max(rank) + 1 from public.career_levels where workspace_id = p_job.workspace_id), 1))
    on conflict (workspace_id, name) do nothing;
    v_patch := v_patch || jsonb_build_object('career_level_id',
      (select id from public.career_levels where workspace_id = p_job.workspace_id and name = btrim(d ->> 'career_level')));
  end if;

  if nullif(btrim(d ->> 'employment_type'), '') is not null then
    v_patch := v_patch || jsonb_build_object('employment_type_id',
      (select id from public.employment_types where workspace_id = p_job.workspace_id
         and lower(name::text) = lower(btrim(d ->> 'employment_type'))));
  end if;

  perform app.set_assignment_from(v_member_id, p_job.effective_date, v_patch);

  if d ? 'annual_salary' or d ? 'day_rate' then
    v_currency := coalesce(upper(nullif(btrim(d ->> 'currency'), '')),
      (select currency from public.workspaces where id = p_job.workspace_id));
    perform app.set_compensation_from(v_member_id, p_job.effective_date,
      (d ->> 'annual_salary')::numeric, (d ->> 'day_rate')::numeric, v_currency);
  end if;

  for v_field in
    select f.* from public.custom_fields f
    where f.workspace_id = p_job.workspace_id and f.archived_at is null and coalesce(d -> 'custom', '{}') ? f.key
  loop
    perform app.set_field_value_from(v_member_id, v_field, p_job.effective_date, d -> 'custom' -> v_field.key);
  end loop;

  return v_member_id;
end;
$$;

-- Applies the next chunk and reports progress. Call until `done` is true; safe to resume.
create function public.import_apply_chunk(p_job_id uuid, p_max_rows integer default 2000)
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
      set end_date = v_job.effective_date - 1,
          status = case when v_job.effective_date - 1 < current_date then 'inactive' else m.status end
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

grant execute on function public.import_preview(uuid), public.import_apply_chunk(uuid, integer) to authenticated;

-- Leavers whose last day has passed lose access the next night.
select cron.schedule(
  'deactivate-leavers',
  '20 0 * * *',
  $$ update public.members set status = 'inactive'
     where status = 'active' and not is_owner and end_date is not null and end_date < current_date $$
);
