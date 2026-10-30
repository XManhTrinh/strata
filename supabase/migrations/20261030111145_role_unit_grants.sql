-- Specific units for a role assignment are set through one function that checks them: a person
-- can only grant units their own reach covers, for every permission the role holds over "units".
-- Direct writes are closed. Each refusal's hint is the app's message key.

drop policy "Role assigners can grant units" on public.member_role_units;
drop policy "Role assigners can remove unit grants" on public.member_role_units;
revoke insert, delete on public.member_role_units from authenticated;

-- Does the caller's own reach for a permission cover a unit?
create function app.covers_unit(p_workspace_id uuid, p_permission_key text, p_unit_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, p_permission_key);
  v_path extensions.ltree := (select path from public.org_units where id = p_unit_id);
  v_my_unit uuid;
begin
  if 'workspace' = any (v_reaches) then
    return true;
  end if;
  if 'units' = any (v_reaches)
     and v_path operator(extensions.<@) any (app.granted_unit_paths(p_workspace_id, p_permission_key)) then
    return true;
  end if;
  if 'team_and_below' = any (v_reaches) then
    v_my_unit := (app.assignment_on(app.current_member_id(p_workspace_id), current_date)).org_unit_id;
    return exists (
      select 1 from public.org_units mine
      where mine.id = v_my_unit and v_path operator(extensions.<@) mine.path
    );
  end if;
  return false;
end;
$$;

-- Replaces the units of one role assignment.
create function public.set_role_units(p_member_role_id uuid, p_unit_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_assignment public.member_roles;
  v_unit uuid;
begin
  select * into v_assignment from public.member_roles where id = p_member_role_id;
  if v_assignment.id is null
     or not app.can(v_assignment.workspace_id, 'roles.assign', v_assignment.member_id) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  if not exists (
    select 1 from public.role_permissions where role_id = v_assignment.role_id and reach = 'units'
  ) then
    raise exception 'This role does not work on specific units.'
      using errcode = 'check_violation', hint = 'roleHasNoUnitReach';
  end if;

  foreach v_unit in array coalesce(p_unit_ids, '{}') loop
    if not exists (
      select 1 from public.org_units
      where id = v_unit and workspace_id = v_assignment.workspace_id and archived_at is null
    ) then
      raise exception 'Unit not found.' using errcode = 'no_data_found', hint = 'archivedChoice';
    end if;
    if not app.is_owner(v_assignment.workspace_id) and exists (
      select 1 from public.role_permissions rp
      where rp.role_id = v_assignment.role_id and rp.reach = 'units'
        and not app.covers_unit(v_assignment.workspace_id, rp.permission_key, v_unit)
    ) then
      raise exception 'You can only grant units your own reach covers.'
        using errcode = 'insufficient_privilege', hint = 'unitOutsideReach';
    end if;
  end loop;

  delete from public.member_role_units where member_role_id = p_member_role_id;
  insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
  select p_member_role_id, v_assignment.workspace_id, u
  from unnest(coalesce(p_unit_ids, '{}')) as u
  on conflict do nothing;
end;
$$;

-- Which roles act on specific units, for people assigning roles (who may not read role definitions).
create function public.roles_with_unit_reach(p_workspace_id uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(distinct rp.role_id), '{}')
  from public.role_permissions rp
  join public.roles r on r.id = rp.role_id
  where r.workspace_id = p_workspace_id and rp.reach = 'units' and app.is_member(p_workspace_id);
$$;

grant execute on function
  public.set_role_units(uuid, uuid[]),
  public.roles_with_unit_reach(uuid)
to authenticated;
