-- change_job says whether it changed anything, so saving the same job record again reports
-- "nothing changed" rather than "job changed". add_person ignores the result.

drop function public.change_job(uuid, date, uuid, uuid, uuid, uuid, uuid);

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
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid := app.require_member_access(p_member_id, 'people.edit');
  v_current public.member_assignments;
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

  -- Nothing to do when the record in force on that date already says all this.
  select * into v_current from app.assignment_on(p_member_id, p_valid_from);
  if v_current.id is not null and v_current.valid_from <= p_valid_from
     and (v_current.org_unit_id, v_current.manager_member_id, v_current.position_id,
          v_current.career_level_id, v_current.employment_type_id)
       is not distinct from (p_org_unit_id, p_manager_member_id, p_position_id,
          p_career_level_id, p_employment_type_id) then
    return false;
  end if;

  -- Ids from another workspace fail the composite foreign keys.
  perform app.set_assignment_from(p_member_id, p_valid_from, jsonb_build_object(
    'org_unit_id', p_org_unit_id, 'manager_member_id', p_manager_member_id,
    'position_id', p_position_id, 'career_level_id', p_career_level_id,
    'employment_type_id', p_employment_type_id));
  return true;
end;
$$;

grant execute on function public.change_job(uuid, date, uuid, uuid, uuid, uuid, uuid) to authenticated;
