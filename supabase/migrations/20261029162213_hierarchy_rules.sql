-- Hierarchy rules the settings screens rely on: level changes keep sub-units below, archived
-- units and levels take nothing new, archiving needs an empty unit, and levels reorder in one call.
-- Each refusal's hint is the app's message key.

-- The trigger computes the path; inserts no longer have to pass one.
alter table public.org_units alter column path set default ''::extensions.ltree;

create or replace function app.place_org_unit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_parent public.org_units;
  v_parent_order integer;
  v_order integer;
begin
  if new.parent_id is null then
    new.path := extensions.text2ltree(app.unit_label(new.id));
    return new;
  end if;

  select * into v_parent from public.org_units where id = new.parent_id;

  if tg_op = 'UPDATE' and v_parent.path operator(extensions.<@) old.path then
    raise exception 'A unit cannot move under itself or one of its own units.'
      using errcode = 'check_violation', hint = 'unitCycle';
  end if;

  if v_parent.archived_at is not null and new.archived_at is null then
    raise exception 'Units cannot be added or moved under an archived unit.'
      using errcode = 'check_violation', hint = 'unitParentArchived';
  end if;

  if (tg_op = 'INSERT' or new.level_id is distinct from old.level_id)
     and exists (select 1 from public.org_unit_levels where id = new.level_id and archived_at is not null) then
    raise exception 'Archived levels cannot be given to units.' using errcode = 'check_violation', hint = 'levelArchived';
  end if;

  select sort_order into v_order from public.org_unit_levels where id = new.level_id;
  select sort_order into v_parent_order from public.org_unit_levels where id = v_parent.level_id;
  if v_parent_order is not null and v_order <= v_parent_order then
    raise exception 'A unit must be at a lower level than its parent.' using errcode = 'check_violation', hint = 'unitLevelBelowParent';
  end if;

  if tg_op = 'UPDATE' and exists (
    select 1 from public.org_units c
    join public.org_unit_levels l on l.id = c.level_id
    where c.parent_id = new.id and l.sort_order <= v_order
  ) then
    raise exception 'A unit must stay at a higher level than its sub-units.'
      using errcode = 'check_violation', hint = 'unitLevelAboveSubUnits';
  end if;

  new.path := v_parent.path operator(extensions.||) extensions.text2ltree(app.unit_label(new.id));
  return new;
end;
$$;

-- Archiving keeps history intact, so it needs a unit nobody is in now or later and whose
-- sub-units are archived first; restoring needs a live parent.
create function app.check_org_unit_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is not null and old.archived_at is null then
    if new.parent_id is null then
      raise exception 'The root unit cannot be archived.' using errcode = 'check_violation', hint = 'rootUnitFixed';
    end if;
    if exists (select 1 from public.org_units c where c.parent_id = new.id and c.archived_at is null) then
      raise exception 'Archive or move the sub-units first.' using errcode = 'check_violation', hint = 'unitHasSubUnits';
    end if;
    if exists (
      select 1 from public.member_assignments a
      where a.org_unit_id = new.id and (a.valid_to is null or a.valid_to > current_date)
    ) then
      raise exception 'Move the people in this unit first.' using errcode = 'check_violation', hint = 'unitHasPeople';
    end if;
  elsif new.archived_at is null and old.archived_at is not null and exists (
    select 1 from public.org_units p where p.id = new.parent_id and p.archived_at is not null
  ) then
    raise exception 'Restore the parent unit first.' using errcode = 'check_violation', hint = 'restoreParentFirst';
  end if;
  return new;
end;
$$;

create trigger check_org_unit_archive
  before update of archived_at on public.org_units
  for each row execute function app.check_org_unit_archive();

create function app.check_org_unit_level_archive()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.archived_at is not null and old.archived_at is null and exists (
    select 1 from public.org_units u where u.level_id = new.id and u.archived_at is null
  ) then
    raise exception 'Units still use this level.' using errcode = 'check_violation', hint = 'levelInUse';
  end if;
  return new;
end;
$$;

create trigger check_org_unit_level_archive
  before update of archived_at on public.org_unit_levels
  for each row execute function app.check_org_unit_level_archive();

-- Puts the workspace's levels in the given order (every level, archived ones included), refusing
-- an order that would put a unit at or above its parent's level.
create function public.reorder_org_unit_levels(p_workspace_id uuid, p_level_ids uuid[])
returns void
language plpgsql
set search_path = ''
as $$
begin
  if not app.has_permission(p_workspace_id, 'people.manage_structure') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege';
  end if;

  if (select array_agg(id order by id) from public.org_unit_levels where workspace_id = p_workspace_id)
     is distinct from (select array_agg(id order by id) from unnest(p_level_ids) as id) then
    raise exception 'Give every level of the workspace once.' using errcode = 'invalid_parameter_value';
  end if;

  -- Two passes, as sort_order is unique per workspace.
  update public.org_unit_levels l set sort_order = -o.n
    from unnest(p_level_ids) with ordinality as o (id, n)
    where l.id = o.id and l.workspace_id = p_workspace_id;
  update public.org_unit_levels l set sort_order = o.n * 10
    from unnest(p_level_ids) with ordinality as o (id, n)
    where l.id = o.id and l.workspace_id = p_workspace_id;

  if exists (
    select 1 from public.org_units u
    join public.org_unit_levels ul on ul.id = u.level_id
    join public.org_units p on p.id = u.parent_id
    join public.org_unit_levels pl on pl.id = p.level_id
    where u.workspace_id = p_workspace_id and ul.sort_order <= pl.sort_order
  ) then
    raise exception 'This order would put a unit at or above its parent''s level.'
      using errcode = 'check_violation', hint = 'levelOrderBreaksUnits';
  end if;
end;
$$;

grant execute on function public.reorder_org_unit_levels(uuid, uuid[]) to authenticated;
