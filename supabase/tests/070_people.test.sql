-- People: dated job records, reporting lines, pay and custom-field privacy, and every reach level.
begin;
\ir _helpers.psql

select plan(21);

create temporary table people (name text primary key, user_id uuid, member_id uuid) on commit drop;
grant select on people to authenticated;
insert into people (name, user_id) values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('mia', tests.create_user('mia@acme.test', 'Mia')),
  ('sam', tests.create_user('sam@acme.test', 'Sam')),
  ('tom', tests.create_user('tom@acme.test', 'Tom')),
  ('una', tests.create_user('una@acme.test', 'Una')),
  ('eve', tests.create_user('eve@acme.test', 'Eve')),
  ('hal', tests.create_user('hal@acme.test', 'Hal'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

-- Structure: Engineering (division) with Squad A and Squad B.
insert into public.org_unit_levels (workspace_id, name, sort_order)
select ws, n, o from ctx, (values ('Division', 10), ('Squad', 40)) as l (n, o);
insert into public.org_units (workspace_id, parent_id, level_id, name, path)
select ws, root, (select id from public.org_unit_levels where workspace_id = ws and name = 'Division'), 'Engineering', 'x' from ctx;
insert into public.org_units (workspace_id, parent_id, level_id, name, path)
select ws, (select id from public.org_units where workspace_id = (select ws from ctx) and name = 'Engineering'),
  (select id from public.org_unit_levels where workspace_id = ws and name = 'Squad'), s, 'x'
from ctx, (values ('Squad A'), ('Squad B')) as v (s);

create function pg_temp.unit(p_name text) returns uuid language sql as $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = p_name $$;
create function pg_temp.member(p_name text) returns uuid language sql as $$ select member_id from people where name = p_name $$;
grant execute on function pg_temp.unit(text), pg_temp.member(text) to authenticated;

-- Members (everyone except Alice, who is already the owner).
insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test' from people where name <> 'alice';
update people p set member_id = m.id from public.members m where m.user_id = p.user_id;

-- Job records today, replacing the root-unit records people with accounts start with.
delete from public.member_assignments where workspace_id = (select ws from ctx);
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id, manager_member_id)
select (select ws from ctx), pg_temp.member(n), current_date - 30, pg_temp.unit(u), pg_temp.member(mgr)
from (values ('mia', 'Squad A', null), ('sam', 'Squad A', 'mia'), ('tom', 'Squad B', 'sam'),
             ('una', 'Squad B', null), ('eve', 'Engineering', null)) as v (n, u, mgr);

-- Pay for everyone, and two custom fields.
insert into public.member_compensation (workspace_id, member_id, valid_from, annual_salary, currency)
select (select ws from ctx), member_id, current_date - 30, 50000, 'GBP' from people where member_id is not null;
insert into public.custom_fields (workspace_id, key, label, type, sensitive) values
  ((select ws from ctx), 'skills', 'Skills', 'text', false),
  ((select ws from ctx), 'bonus_band', 'Bonus band', 'text', true);
insert into public.member_field_values (workspace_id, member_id, field_id, value)
select (select ws from ctx), p.member_id, f.id, to_jsonb(f.key || ' of ' || p.name)
from people p cross join public.custom_fields f where p.member_id is not null and f.workspace_id = (select ws from ctx);

-- Roles: Mia Manager, Sam and Tom Member, plus three custom roles for the team and unit reaches.
insert into public.roles (workspace_id, name) select ws, n from ctx, (values ('Squad helper'), ('Eng lead'), ('HR for Squad B')) as v (n);
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), r.id, p.k, p.reach::public.reach
from public.roles r
join (values ('Squad helper', 'people.view', 'workspace'), ('Squad helper', 'people.edit', 'team'),
             ('Eng lead', 'people.view', 'workspace'), ('Eng lead', 'people.view_compensation', 'team_and_below'),
             ('HR for Squad B', 'people.view', 'workspace'), ('HR for Squad B', 'people.view_compensation', 'units'))
  as p (role_name, k, reach) on p.role_name = r.name
where r.workspace_id = (select ws from ctx);
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.member(a.n), r.id
from (values ('mia', 'Manager'), ('sam', 'Member'), ('tom', 'Member'), ('una', 'Squad helper'),
             ('eve', 'Eng lead'), ('hal', 'HR for Squad B')) as a (n, role_name)
join public.roles r on r.name = a.role_name and r.workspace_id = (select ws from ctx);
insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
select mr.id, mr.workspace_id, pg_temp.unit('Squad B')
from public.member_roles mr join public.roles r on r.id = mr.role_id where r.name = 'HR for Squad B';

-- Reporting lines -----------------------------------------------------------------------------------

select is(
  (select array_agg(p.name || '>' || q.name || ':' || c.depth order by p.name, q.name)
   from public.reporting_closure c join people p on p.member_id = c.manager_member_id
   join people q on q.member_id = c.member_id),
  array['mia>sam:1', 'mia>tom:2', 'sam>tom:1'],
  'reporting lines include indirect reports'
);

select throws_ok(
  $$ update public.member_assignments set manager_member_id = pg_temp.member('tom')
     where member_id = pg_temp.member('mia') $$,
  '23514', null, 'reporting lines cannot go in a circle'
);

select throws_ok(
  $$ insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id)
     values ((select ws from ctx), pg_temp.member('sam'), current_date - 1, pg_temp.unit('Squad B')) $$,
  '23P01', null, 'job records for one person cannot overlap'
);

-- A future-dated move takes effect on its date, not before.
update public.member_assignments set valid_to = current_date + 7 where member_id = pg_temp.member('una');
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id)
values ((select ws from ctx), pg_temp.member('una'), current_date + 7, pg_temp.unit('Squad A'));
select is((app.assignment_on(pg_temp.member('una'), current_date)).org_unit_id, pg_temp.unit('Squad B'),
  'today, a person is still in their current team');
select is((app.assignment_on(pg_temp.member('una'), current_date + 7)).org_unit_id, pg_temp.unit('Squad A'),
  'from the move date, they are in the new team');

-- Reaches -------------------------------------------------------------------------------------------

-- Mia (Manager): pay of direct and indirect reports only.
select tests.authenticate_as((select user_id from people where name = 'mia'));
select is(
  (select array_agg(p.name order by p.name) from public.member_compensation c join people p on p.member_id = c.member_id),
  array['sam', 'tom'], 'managers see pay of their direct and indirect reports'
);

-- Sam (Member): sees everyone, but only his own pay and sensitive fields.
select tests.authenticate_as((select user_id from people where name = 'sam'));
select is((select count(*)::int from public.members where workspace_id = (select ws from ctx)), 7,
  'members see the people directory');
select is(
  (select array_agg(p.name order by p.name) from public.member_compensation c join people p on p.member_id = c.member_id),
  array['sam'], 'members see only their own pay'
);
select is(
  (select count(*)::int from public.member_field_values v join public.custom_fields f on f.id = v.field_id where f.key = 'skills'),
  7, 'standard custom fields are visible with the person'
);
select is(
  (select array_agg(value #>> '{}') from public.member_field_values v join public.custom_fields f on f.id = v.field_id where f.key = 'bonus_band'),
  array['bonus_band of sam'], 'sensitive custom fields follow the pay permission'
);
select throws_ok(
  $$ insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id)
     values ((select ws from ctx), pg_temp.member('tom'), current_date + 30, pg_temp.unit('Squad A')) $$,
  '42501', null, 'members cannot change other people''s job records'
);

-- Una ("my team" edit): can edit Tom (same squad), not Sam.
select tests.authenticate_as((select user_id from people where name = 'una'));
select ok(app.can((select ws from ctx), 'people.edit', pg_temp.member('tom')), '"my team" covers people in the same team');
select ok(not app.can((select ws from ctx), 'people.edit', pg_temp.member('sam')), '"my team" does not cover other teams');
update public.members set full_name = 'Tom Updated' where id = pg_temp.member('tom');
update public.members set full_name = 'Sam Updated' where id = pg_temp.member('sam');
select tests.clear_authentication();
select is(
  (select array_agg(full_name order by full_name) from public.members where id in (pg_temp.member('tom'), pg_temp.member('sam'))),
  array['Sam', 'Tom Updated'], 'edits outside the reach are ignored by RLS'
);

-- Eve (team and sub-teams, sitting in Engineering): pay across both squads.
select tests.authenticate_as((select user_id from people where name = 'eve'));
select is(
  (select array_agg(p.name order by p.name) from public.member_compensation c join people p on p.member_id = c.member_id),
  array['eve', 'mia', 'sam', 'tom', 'una'], '"my team and sub-teams" covers everyone below the person''s unit'
);

-- Hal (specific units: Squad B): pay in Squad B only.
select tests.authenticate_as((select user_id from people where name = 'hal'));
select is(
  (select array_agg(p.name order by p.name) from public.member_compensation c join people p on p.member_id = c.member_id),
  array['tom', 'una'], '"specific units" covers the chosen units only'
);

-- People can be added only with workspace-wide people.edit.
select tests.authenticate_as((select user_id from people where name = 'mia'));
select throws_ok(
  $$ insert into public.members (workspace_id, full_name, email) values ((select ws from ctx), 'New', 'new@acme.test') $$,
  '42501', null, 'adding people needs workspace-wide people.edit'
);
select tests.authenticate_as((select user_id from people where name = 'alice'));
select lives_ok(
  $$ insert into public.members (workspace_id, full_name, email, start_date) values ((select ws from ctx), 'New', 'new@acme.test', current_date) $$,
  'owners can add people'
);

-- With People switched off, people data is closed.
select public.set_feature((select ws from ctx), 'people', false, true);
select tests.authenticate_as((select user_id from people where name = 'mia'));
select is_empty($$ select 1 from public.member_compensation $$, 'with People off, pay is not readable');
select is_empty($$ select 1 from public.member_assignments $$, 'with People off, job records are not readable');

select tests.authenticate_as((select user_id from people where name = 'sam'));
select throws_ok(
  $$ select app.assignment_on(pg_temp.member('mia'), current_date) $$,
  '42501', null, 'users cannot call the job-record helper directly'
);

select * from finish();
rollback;
