-- Specific units on a role assignment: only within the assigner's own reach, only for unit roles.
begin;
\ir _helpers.psql

select plan(6);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('hal', tests.create_user('hal@acme.test', 'Hal')),
  ('kim', tests.create_user('kim@acme.test', 'Kim'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.org_unit_levels (workspace_id, name, sort_order) select ws, 'Team', 10 from ctx;
insert into public.org_units (workspace_id, parent_id, level_id, name)
select ws, root, (select id from public.org_unit_levels where workspace_id = ws), n
from ctx, (values ('Squad A'), ('Squad B')) as v (n);
create function pg_temp.unit(p_name text) returns uuid language sql as
  $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = p_name $$;
grant execute on function pg_temp.unit(text) to authenticated;

insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test' from people where name <> 'alice';

-- "HR for units": view people in specific units. Hal assigns roles and holds it for Squad B only.
insert into public.roles (workspace_id, name) select ws, r from ctx, (values ('HR for units'), ('Role assigner')) as v (r);
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), r.id, p.k, p.reach::public.reach
from public.roles r join (values ('HR for units', 'people.view', 'units'), ('Role assigner', 'roles.assign', 'workspace'), ('Role assigner', 'members.view', 'workspace'))
  as p (role_name, k, reach) on p.role_name = r.name
where r.workspace_id = (select ws from ctx);
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), m.id, r.id
from public.members m, public.roles r
where m.workspace_id = (select ws from ctx) and r.workspace_id = (select ws from ctx)
  and ((m.full_name = 'Hal' and r.name in ('HR for units', 'Role assigner')) or (m.full_name = 'Kim' and r.name in ('HR for units', 'Member')));
insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
select mr.id, mr.workspace_id, pg_temp.unit('Squad B')
from public.member_roles mr join public.members m on m.id = mr.member_id join public.roles r on r.id = mr.role_id
where m.full_name = 'Hal' and r.name = 'HR for units';

create function pg_temp.kims(p_role text) returns uuid language sql as $$
  select mr.id from public.member_roles mr join public.members m on m.id = mr.member_id
  join public.roles r on r.id = mr.role_id where m.full_name = 'Kim' and r.name = p_role
$$;
grant execute on function pg_temp.kims(text) to authenticated;

select tests.authenticate_as((select user_id from people where name = 'hal'));

select lives_ok(
  $$ select public.set_role_units(pg_temp.kims('HR for units'), array[pg_temp.unit('Squad B')]) $$,
  'an assigner grants a unit their own reach covers'
);
select throws_ok(
  $$ select public.set_role_units(pg_temp.kims('HR for units'), array[pg_temp.unit('Squad A')]) $$,
  '42501', null, 'but not one outside it'
);
select throws_ok(
  $$ select public.set_role_units(pg_temp.kims('Member'), array[pg_temp.unit('Squad B')]) $$,
  '23514', null, 'roles without unit reach take no units'
);
select throws_ok(
  $$ insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
     values (pg_temp.kims('HR for units'), (select ws from ctx), pg_temp.unit('Squad A')) $$,
  '42501', null, 'unit grants cannot be written directly'
);
select is(
  public.roles_with_unit_reach((select ws from ctx)),
  array[(select id from public.roles where workspace_id = (select ws from ctx) and name = 'HR for units')],
  'roles acting on units are listed'
);

select tests.authenticate_as((select user_id from people where name = 'alice'));
select lives_ok(
  $$ select public.set_role_units(pg_temp.kims('HR for units'), array[pg_temp.unit('Squad A'), pg_temp.unit('Squad B')]) $$,
  'the owner grants any unit'
);

select * from finish();
rollback;
