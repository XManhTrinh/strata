-- Organization structure: workspace-defined hierarchy levels, the unit tree, one career ladder,
-- positions and employment types. Readable by members when People is on; changed by people
-- holding people.manage_structure.

create type public.cost_method as enum ('annual_salary', 'day_rate');

-- Hierarchy levels -------------------------------------------------------------------------------

create table public.org_unit_levels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name extensions.citext not null check (char_length(btrim(name::text)) between 1 and 60),
  icon text check (char_length(icon) <= 60),
  color text check (color ~ '^#[0-9a-fA-F]{6}$'),
  -- Lower comes first: Division 10, Cluster 20, Tribe 30, Squad 40.
  sort_order integer not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  unique (workspace_id, sort_order)
);

create trigger set_updated_at before update on public.org_unit_levels
  for each row execute function app.set_updated_at();

-- Units ------------------------------------------------------------------------------------------

-- The tree. Each unit stores its path from the root (ltree), so "this unit and everything under
-- it" is one indexed lookup: path <@ ancestor_path.
create table public.org_units (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  parent_id uuid,
  -- Null only for the workspace's root unit.
  level_id uuid,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  code text check (char_length(code) between 1 and 60),
  path extensions.ltree not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, code),
  foreign key (workspace_id, parent_id) references public.org_units (workspace_id, id),
  foreign key (workspace_id, level_id) references public.org_unit_levels (workspace_id, id),
  constraint org_units_root_has_no_level check ((parent_id is null) = (level_id is null))
);

create unique index org_units_one_root_idx on public.org_units (workspace_id) where parent_id is null;
create index org_units_workspace_parent_idx on public.org_units (workspace_id, parent_id);
create index org_units_workspace_level_idx on public.org_units (workspace_id, level_id);
create index org_units_path_idx on public.org_units using gist (path);

create trigger set_updated_at before update on public.org_units
  for each row execute function app.set_updated_at();

-- The ltree label for a unit: its id without dashes.
create function app.unit_label(p_id uuid)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'u' || replace(p_id::text, '-', '');
$$;

-- Sets the path, refuses cycles and levels above the parent's, and moves the subtree's paths.
create function app.place_org_unit()
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
      using errcode = 'check_violation';
  end if;

  select sort_order into v_order from public.org_unit_levels where id = new.level_id;
  select sort_order into v_parent_order from public.org_unit_levels where id = v_parent.level_id;
  if v_parent_order is not null and v_order <= v_parent_order then
    raise exception 'A unit must be at a lower level than its parent.' using errcode = 'check_violation';
  end if;

  new.path := v_parent.path operator(extensions.||) extensions.text2ltree(app.unit_label(new.id));
  return new;
end;
$$;

create trigger place_org_unit
  before insert or update of parent_id, level_id on public.org_units
  for each row execute function app.place_org_unit();

create function app.move_org_subtree()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.org_units u
    set path = new.path operator(extensions.||)
      extensions.subpath(u.path, extensions.nlevel(old.path))
    where u.workspace_id = new.workspace_id
      and u.path operator(extensions.<@) old.path
      and u.id <> new.id;
  return null;
end;
$$;

-- Fires on any path change, including one computed by place_org_unit when only the parent changed.
create trigger move_org_subtree
  after update on public.org_units
  for each row
  when (old.path operator(extensions.<>) new.path)
  execute function app.move_org_subtree();

-- Career ladder, positions, employment types -----------------------------------------------------

create table public.career_levels (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name extensions.citext not null check (char_length(btrim(name::text)) between 1 and 60),
  -- Higher is more senior; compared within a track.
  rank integer not null,
  -- Optional track, e.g. 'Individual contributor', 'Management'.
  track text check (char_length(track) between 1 and 60),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create index career_levels_workspace_rank_idx on public.career_levels (workspace_id, track, rank);

create trigger set_updated_at before update on public.career_levels
  for each row execute function app.set_updated_at();

create table public.positions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name extensions.citext not null check (char_length(btrim(name::text)) between 1 and 120),
  description text not null default '' check (char_length(description) <= 500),
  min_level_id uuid,
  max_level_id uuid,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  foreign key (workspace_id, min_level_id) references public.career_levels (workspace_id, id),
  foreign key (workspace_id, max_level_id) references public.career_levels (workspace_id, id)
);

create index positions_workspace_min_level_idx on public.positions (workspace_id, min_level_id);
create index positions_workspace_max_level_idx on public.positions (workspace_id, max_level_id);

create trigger set_updated_at before update on public.positions
  for each row execute function app.set_updated_at();

create table public.employment_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name extensions.citext not null check (char_length(btrim(name::text)) between 1 and 60),
  cost_method public.cost_method not null,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);

create trigger set_updated_at before update on public.employment_types
  for each row execute function app.set_updated_at();

-- Every workspace gets its root unit; Team and Company templates get starter employment types.
create function app.seed_workspace_structure()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.org_units (workspace_id, name, path)
  values (new.id, new.name, 'root');

  if new.template_key in ('team', 'company') then
    insert into public.employment_types (workspace_id, name, cost_method, sort_order) values
      (new.id, 'Employee', 'annual_salary', 10),
      (new.id, 'Contractor', 'day_rate', 20);
  end if;
  return null;
end;
$$;

create trigger seed_workspace_structure
  after insert on public.workspaces
  for each row execute function app.seed_workspace_structure();

-- Existing workspaces (created before this migration) get the same.
insert into public.org_units (workspace_id, name, path)
select w.id, w.name, 'root' from public.workspaces w
where not exists (select 1 from public.org_units u where u.workspace_id = w.id and u.parent_id is null);

insert into public.employment_types (workspace_id, name, cost_method, sort_order)
select w.id, t.name, t.cost_method, t.sort_order
from public.workspaces w
cross join (values ('Employee', 'annual_salary'::public.cost_method, 10),
                   ('Contractor', 'day_rate'::public.cost_method, 20)) as t (name, cost_method, sort_order)
where w.template_key in ('team', 'company')
  and not exists (select 1 from public.employment_types e where e.workspace_id = w.id);

-- Access ------------------------------------------------------------------------------------------

alter table public.org_unit_levels enable row level security;
alter table public.org_units enable row level security;
alter table public.career_levels enable row level security;
alter table public.positions enable row level security;
alter table public.employment_types enable row level security;

grant execute on function app.unit_label(uuid) to authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array['org_unit_levels', 'org_units', 'career_levels', 'positions', 'employment_types']
  loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', v_table);

    execute format($p$create policy "Members can read the structure" on public.%I
      for select to authenticated
      using (app.is_member(workspace_id) and app.feature_on(workspace_id, 'people'))$p$, v_table);

    execute format($p$create policy "Structure managers can add" on public.%I
      for insert to authenticated
      with check (app.has_permission(workspace_id, 'people.manage_structure'))$p$, v_table);

    execute format($p$create policy "Structure managers can change" on public.%I
      for update to authenticated
      using (app.has_permission(workspace_id, 'people.manage_structure'))
      with check (app.has_permission(workspace_id, 'people.manage_structure'))$p$, v_table);

    execute format($p$create policy "Structure managers can delete unused entries" on public.%I
      for delete to authenticated
      using (app.has_permission(workspace_id, 'people.manage_structure'))$p$, v_table);

    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function app.audit_row_change(%L)', v_table, 'workspace_id');
  end loop;
end;
$$;

-- The root unit is created and renamed by the system only.
create function app.protect_root_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and old.parent_id is null then
    raise exception 'The root unit cannot be deleted.' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and old.parent_id is null and new.parent_id is not null then
    raise exception 'The root unit cannot move.' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create trigger protect_root_unit
  before update or delete on public.org_units
  for each row execute function app.protect_root_unit();
