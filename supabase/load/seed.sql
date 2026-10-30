-- A 100,000-person workspace for load checks, local only (never staging or production).
-- Run with `pnpm db:load` after `supabase db reset`. Idempotent: the load workspace is replaced.
--
-- Shape: a root unit, 5 divisions, 25 departments, 125 tribes and 1,000 squads (5 levels); every
-- unit has a lead who reports to the lead of the unit above, everyone else reports to their
-- squad's lead. A fifth of people have an earlier job record; everyone has pay and two custom
-- field values. Three viewers hold narrower reaches: reports, team and below, and granted units.

\set ON_ERROR_STOP on
\timing off
set client_min_messages = warning;

begin;

-- Users -------------------------------------------------------------------------------------------
delete from public.workspaces where slug = 'load-100k';
delete from auth.users where email like '%@load.test';

create temporary table load_users (name text primary key, id uuid not null default gen_random_uuid());
insert into load_users (name) values ('owner'), ('reports'), ('below'), ('units');
insert into auth.users (id, instance_id, aud, role, email, email_confirmed_at, raw_user_meta_data,
                        raw_app_meta_data, created_at, updated_at)
select id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', name || '@load.test',
  now(), jsonb_build_object('full_name', 'Load ' || initcap(name)), '{"provider": "email"}', now(), now()
from load_users;

-- The owner creates the workspace through the app's own function.
select set_config('request.jwt.claims',
  json_build_object('sub', (select id from load_users where name = 'owner'), 'role', 'authenticated')::text, true);
set local role authenticated;
select public.create_workspace('Load 100k', 'load-100k', 'company', 'GB', 'Europe/London', 'GBP');
reset role;

create temporary table ctx as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root,
  (select id from public.members where workspace_id = w.id and is_owner) as owner_member
from public.workspaces w where w.slug = 'load-100k';

select set_config('app.defer_reporting_closure', 'on', true);

-- Structure -----------------------------------------------------------------------------------------
insert into public.org_unit_levels (workspace_id, name, sort_order)
select ws, n, o from ctx, (values ('Division', 10), ('Department', 20), ('Tribe', 30), ('Squad', 40)) as l (n, o);

create temporary table units (n integer primary key, depth integer, parent_n integer, id uuid);
-- Unit numbers: divisions 1-5, departments 6-30, tribes 31-155, squads 156-1155.
insert into units (n, depth, parent_n)
select n, 1, null from generate_series(1, 5) n
union all select 5 + n, 2, 1 + (n - 1) / 5 from generate_series(1, 25) n
union all select 30 + n, 3, 6 + (n - 1) / 5 from generate_series(1, 125) n
union all select 155 + n, 4, 31 + (n - 1) / 8 from generate_series(1, 1000) n;

-- Inserted level by level so each unit's parent path exists.
do $$
declare
  v_depth integer;
  v_names text[] := array['Division', 'Department', 'Tribe', 'Squad'];
begin
  for v_depth in 1..4 loop
    with created as (
      insert into public.org_units (workspace_id, parent_id, level_id, name, code)
      select c.ws, coalesce(p.id, c.root),
        (select l.id from public.org_unit_levels l where l.workspace_id = c.ws and l.name = v_names[v_depth]),
        v_names[v_depth] || ' ' || u.n, 'U' || lpad(u.n::text, 5, '0')
      from units u cross join ctx c left join units p on p.n = u.parent_n
      where u.depth = v_depth
      returning id, code
    )
    update units u set id = created.id from created where created.code = 'U' || lpad(u.n::text, 5, '0');
  end loop;
end;
$$;

insert into public.career_levels (workspace_id, name, rank, track)
select ws, 'L' || n, n, null from ctx, generate_series(1, 8) n;
insert into public.positions (workspace_id, name)
select ws, 'Position ' || n from ctx, generate_series(1, 50) n;
insert into public.custom_fields (workspace_id, key, label, type, sensitive) values
  ((select ws from ctx), 'site', 'Site', 'text', false),
  ((select ws from ctx), 'band', 'Band', 'text', true);

-- People ---------------------------------------------------------------------------------------------
-- Person n: 1-1155 lead unit n; the rest sit in squad 156 + (n mod 1000).
insert into public.members (workspace_id, full_name, email, person_key, start_date)
select ws, 'Person ' || lpad(n::text, 6, '0'), 'p' || n || '@load.test', 'E-' || lpad(n::text, 6, '0'),
  current_date - (n % 3000)
from ctx, generate_series(1, 100000) n;

create temporary table people as
select m.id, (substring(m.person_key from 3))::integer as n
from public.members m where m.workspace_id = (select ws from ctx) and m.person_key like 'E-%';
create unique index on people (n);

create temporary table placement as
select p.n, p.id as member_id,
  case when p.n <= 1155 then p.n else 156 + (p.n % 1000) end as unit_n
from people p;

insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id, manager_member_id,
  position_id, career_level_id, employment_type_id)
select c.ws, pl.member_id, current_date - 200, u.id,
  -- A lead reports to the lead of the unit above (division leads to the owner); others to their squad lead.
  case when pl.n <= 1155 then coalesce((select l.id from people l where l.n = u.parent_n), c.owner_member)
       else (select l.id from people l where l.n = pl.unit_n) end,
  (select id from public.positions where workspace_id = c.ws order by name offset (pl.n % 50) limit 1),
  (select id from public.career_levels where workspace_id = c.ws and rank = 1 + pl.n % 8),
  (select id from public.employment_types where workspace_id = c.ws order by sort_order offset (pl.n % 2) limit 1)
from placement pl join units u on u.n = pl.unit_n cross join ctx c;

-- A fifth had an earlier job in the squad next door.
insert into public.member_assignments (workspace_id, member_id, valid_from, valid_to, org_unit_id)
select c.ws, pl.member_id, current_date - 500, current_date - 200,
  (select id from units where n = 156 + ((pl.n + 1) % 1000))
from placement pl cross join ctx c where pl.n > 1155 and pl.n % 5 = 0;

insert into public.member_compensation (workspace_id, member_id, valid_from, annual_salary, currency)
select c.ws, p.id, current_date - 200, 30000 + (p.n % 70) * 1000, 'GBP' from people p cross join ctx c;

insert into public.member_field_values (workspace_id, member_id, field_id, value)
select c.ws, p.id, f.id, to_jsonb(case f.key when 'site' then 'Site ' || p.n % 20 else 'Band ' || p.n % 6 end)
from people p cross join ctx c join public.custom_fields f on f.workspace_id = c.ws;

-- Viewers with narrower reaches --------------------------------------------------------------------
-- reports: a division lead (person 1); below: a tribe lead (person 31); units: HR for department 6.
update public.members m set user_id = u.id
from load_users u, people p
where p.id = m.id and ((u.name = 'reports' and p.n = 1) or (u.name = 'below' and p.n = 31));
insert into public.members (workspace_id, user_id, full_name, email)
select c.ws, u.id, 'Load Units', 'units@load.test' from ctx c, load_users u where u.name = 'units';

insert into public.roles (workspace_id, name) select ws, r from ctx, (values ('Load reports'), ('Load below'), ('Load units')) v (r);
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select c.ws, r.id, k, (case r.name when 'Load reports' then 'reports' when 'Load below' then 'team_and_below' else 'units' end)::public.reach
from ctx c join public.roles r on r.workspace_id = c.ws and r.name like 'Load %'
cross join (values ('people.view'), ('org_chart.view'), ('people.export')) as p (k);
insert into public.member_roles (workspace_id, member_id, role_id)
select c.ws, m.id, r.id
from ctx c join public.members m on m.workspace_id = c.ws
join load_users u on u.id = m.user_id
join public.roles r on r.workspace_id = c.ws
  and r.name = case u.name when 'reports' then 'Load reports' when 'below' then 'Load below' else 'Load units' end
where u.name <> 'owner';
insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
select mr.id, mr.workspace_id, (select id from units where n = 6)
from public.member_roles mr join public.roles r on r.id = mr.role_id where r.name = 'Load units';

-- Reporting lines, once, with fresh statistics so the rebuild plans for 100k people, not none.
analyze public.members, public.member_assignments, public.reporting_closure;
select set_config('app.defer_reporting_closure', 'off', true);
select app.rebuild_reporting_closure((select ws from ctx));

commit;

analyze public.members, public.member_assignments, public.member_compensation, public.member_field_values, public.org_units, public.reporting_closure, public.member_roles, public.role_permissions;

select
  (select count(*) from public.members m join public.workspaces w on w.id = m.workspace_id where w.slug = 'load-100k') as members,
  (select count(*) from public.org_units u join public.workspaces w on w.id = u.workspace_id where w.slug = 'load-100k') as units,
  (select count(*) from public.reporting_closure c join public.workspaces w on w.id = c.workspace_id where w.slug = 'load-100k') as reporting_lines;
