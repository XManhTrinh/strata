-- Changing one person from the profile: dated job changes, pay and custom field values, adding a
-- person with their first job record, and what the caller may do to a person. Every function
-- checks the caller's reach over that person. Each refusal's hint is the app's message key.

-- Pay and field values: a change before a future record now stops where that record starts.
create or replace function app.set_compensation_from(
  p_member_id uuid, p_date date, p_salary numeric, p_day_rate numeric, p_currency text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_compensation;
  v_next date;
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
    return;
  end if;

  if v_current.id is not null then
    update public.member_compensation set valid_to = p_date where id = v_current.id;
    v_next := v_current.valid_to;
  else
    select min(valid_from) into v_next from public.member_compensation
    where member_id = p_member_id and valid_from > p_date;
  end if;
  insert into public.member_compensation (workspace_id, member_id, valid_from, valid_to, annual_salary, day_rate, currency)
  select m.workspace_id, m.id, p_date, v_next, p_salary, p_day_rate, p_currency
  from public.members m where m.id = p_member_id;
end;
$$;

-- A null value clears the field from the date.
create or replace function app.set_field_value_from(p_member_id uuid, p_field public.custom_fields, p_date date, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.member_field_values;
  v_from date := case when p_field.keep_history then p_date else '-infinity'::date end;
  v_next date;
  v_value jsonb := nullif(p_value, 'null'::jsonb);
begin
  select * into v_current from public.member_field_values
  where member_id = p_member_id and field_id = p_field.id
    and valid_from <= v_from and (valid_to is null or valid_to > v_from);

  if v_current.value is not distinct from v_value then
    return;
  end if;

  if v_current.id is not null and v_current.valid_from = v_from then
    if v_value is null then
      delete from public.member_field_values where id = v_current.id;
    else
      update public.member_field_values set value = v_value where id = v_current.id;
    end if;
    return;
  end if;

  if v_current.id is not null then
    update public.member_field_values set valid_to = v_from where id = v_current.id;
    v_next := v_current.valid_to;
  else
    select min(valid_from) into v_next from public.member_field_values
    where member_id = p_member_id and field_id = p_field.id and valid_from > v_from;
  end if;
  if v_value is not null then
    insert into public.member_field_values (workspace_id, member_id, field_id, value, valid_from, valid_to)
    values (p_field.workspace_id, p_member_id, p_field.id, v_value, v_from, v_next);
  end if;
end;
$$;

-- What the caller may do to one person, for showing the right buttons (the database still checks).
create function public.my_access_to_member(p_member_id uuid)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(k order by k), '{}')
  from public.members m,
    unnest(array['people.edit', 'people.view_compensation', 'people.edit_compensation']) as k
  where m.id = p_member_id and app.can(m.workspace_id, k, m.id);
$$;

-- Is p_member above p_manager in the reporting line on a date (or the same person)?
create function app.would_report_to_self(p_member_id uuid, p_manager_id uuid, p_date date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  with recursive up (id, depth) as (
    select p_manager_id, 0
    union all
    select a.manager_member_id, up.depth + 1
    from up
    join public.member_assignments a on a.member_id = up.id
      and a.valid_from <= p_date and (a.valid_to is null or a.valid_to > p_date)
    where a.manager_member_id is not null and up.depth < 100
  )
  select exists (select 1 from up where id = p_member_id);
$$;

-- New job records can't use archived units, positions, levels or employment types.
create function app.check_job_choices(
  p_org_unit_id uuid, p_position_id uuid, p_career_level_id uuid, p_employment_type_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.org_units where id = p_org_unit_id and archived_at is not null)
     or exists (select 1 from public.positions where id = p_position_id and archived_at is not null)
     or exists (select 1 from public.career_levels where id = p_career_level_id and archived_at is not null)
     or exists (select 1 from public.employment_types where id = p_employment_type_id and archived_at is not null)
  then
    raise exception 'Archived entries cannot be chosen.' using errcode = 'check_violation', hint = 'archivedChoice';
  end if;
end;
$$;

create function app.require_member_access(p_member_id uuid, p_permission_key text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid := (select workspace_id from public.members where id = p_member_id);
begin
  if v_workspace_id is null or not app.feature_on(v_workspace_id, 'people')
     or not app.can(v_workspace_id, p_permission_key, p_member_id) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  return v_workspace_id;
end;
$$;

-- Team, manager, position, level and employment type from a date, until the next scheduled change.
create function public.change_job(
  p_member_id uuid,
  p_valid_from date,
  p_org_unit_id uuid,
  p_manager_member_id uuid default null,
  p_position_id uuid default null,
  p_career_level_id uuid default null,
  p_employment_type_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid := app.require_member_access(p_member_id, 'people.edit');
begin
  if p_org_unit_id is null or not exists (
    select 1 from public.org_units where id = p_org_unit_id and workspace_id = v_workspace_id
  ) then
    raise exception 'Choose a unit.' using errcode = 'check_violation', hint = 'unitRequired';
  end if;
  perform app.check_job_choices(p_org_unit_id, p_position_id, p_career_level_id, p_employment_type_id);
  if p_manager_member_id is not null
     and app.would_report_to_self(p_member_id, p_manager_member_id, p_valid_from) then
    raise exception 'Reporting lines cannot go in a circle.'
      using errcode = 'check_violation', hint = 'managerCycle';
  end if;

  -- Ids from another workspace fail the composite foreign keys.
  perform app.set_assignment_from(p_member_id, p_valid_from, jsonb_build_object(
    'org_unit_id', p_org_unit_id, 'manager_member_id', p_manager_member_id,
    'position_id', p_position_id, 'career_level_id', p_career_level_id,
    'employment_type_id', p_employment_type_id));
end;
$$;

-- Removes one dated change; the record before it runs on in its place. The first record stays.
create function public.remove_job_change(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_record public.member_assignments := (select a from public.member_assignments a where a.id = p_assignment_id);
  v_previous uuid;
begin
  perform app.require_member_access(v_record.member_id, 'people.edit');
  select id into v_previous from public.member_assignments
  where member_id = v_record.member_id and valid_to = v_record.valid_from;
  if v_previous is null then
    raise exception 'The first job record stays.' using errcode = 'check_violation', hint = 'firstJobStays';
  end if;
  delete from public.member_assignments where id = p_assignment_id;
  update public.member_assignments set valid_to = v_record.valid_to where id = v_previous;
end;
$$;

create function public.change_pay(
  p_member_id uuid, p_valid_from date, p_currency text,
  p_annual_salary numeric default null, p_day_rate numeric default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform app.require_member_access(p_member_id, 'people.edit_compensation');
  if p_annual_salary is null and p_day_rate is null then
    raise exception 'Enter a salary or a day rate.' using errcode = 'check_violation', hint = 'payRequired';
  end if;
  perform app.set_compensation_from(p_member_id, p_valid_from, p_annual_salary, p_day_rate, upper(p_currency));
end;
$$;

-- Sensitive fields need pay rights; a null value clears the field.
create function public.set_field_value(p_member_id uuid, p_field_id uuid, p_valid_from date, p_value jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_field public.custom_fields;
  v_workspace_id uuid := (select workspace_id from public.members where id = p_member_id);
begin
  select * into v_field from public.custom_fields
  where id = p_field_id and workspace_id = v_workspace_id and archived_at is null;
  if v_field.id is null then
    raise exception 'Field not found.' using errcode = 'no_data_found', hint = 'generic';
  end if;
  perform app.require_member_access(p_member_id,
    case when v_field.sensitive then 'people.edit_compensation' else 'people.edit' end);
  perform app.set_field_value_from(p_member_id, v_field, p_valid_from, p_value);
end;
$$;

-- Adds a person (no account; invite them separately) with their first job record.
create function public.add_person(
  p_workspace_id uuid,
  p_full_name text,
  p_org_unit_id uuid,
  p_email text default null,
  p_person_key text default null,
  p_start_date date default null,
  p_manager_member_id uuid default null,
  p_position_id uuid default null,
  p_career_level_id uuid default null,
  p_employment_type_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member_id uuid;
begin
  if not app.feature_on(p_workspace_id, 'people')
     or not 'workspace' = any (app.held_reaches(p_workspace_id, 'people.edit')) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  insert into public.members (workspace_id, full_name, email, person_key, start_date)
  values (p_workspace_id, btrim(p_full_name), nullif(btrim(p_email), ''), nullif(btrim(p_person_key), ''),
          p_start_date)
  returning id into v_member_id;

  perform public.change_job(v_member_id, coalesce(p_start_date, current_date), p_org_unit_id,
    p_manager_member_id, p_position_id, p_career_level_id, p_employment_type_id);
  return v_member_id;
end;
$$;

grant execute on function
  public.my_access_to_member(uuid),
  public.change_job(uuid, date, uuid, uuid, uuid, uuid, uuid),
  public.remove_job_change(uuid),
  public.change_pay(uuid, date, text, numeric, numeric),
  public.set_field_value(uuid, uuid, date, jsonb),
  public.add_person(uuid, text, uuid, text, text, date, uuid, uuid, uuid, uuid)
to authenticated;
