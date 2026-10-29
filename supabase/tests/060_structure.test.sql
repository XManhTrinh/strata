-- Organization structure: seeding, level order, cycles, subtree moves, the root, and access.
begin;
\ir _helpers.psql

select plan(15);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('dave', tests.create_user('dave@other.test', 'Dave'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select public.create_workspace('Me', 'me', 'personal', 'GB', 'Europe/London', 'GBP');

create temporary table ws on commit drop as select id from public.workspaces where slug = 'acme';
grant select on ws to authenticated;

select is(
  (select name from public.org_units where workspace_id = (select id from ws) and parent_id is null),
  'Acme', 'a new workspace gets a root unit named after it'
);
select is(
  (select array_agg(name::text || ':' || cost_method order by sort_order) from public.employment_types
   where workspace_id = (select id from ws)),
  array['Employee:annual_salary', 'Contractor:day_rate'],
  'company workspaces start with salaried and day-rate employment types'
);
select is(
  (select count(*)::int from public.employment_types e join public.workspaces w on w.id = e.workspace_id
   where w.slug = 'me'),
  0, 'personal workspaces start without employment types'
);

-- Levels and units, built by the owner (who holds people.manage_structure).
insert into public.org_unit_levels (workspace_id, name, sort_order) values
  ((select id from ws), 'Division', 10), ((select id from ws), 'Tribe', 30), ((select id from ws), 'Squad', 40);

create temporary table lv on commit drop as
select name::text as name, id from public.org_unit_levels where workspace_id = (select id from ws);
grant select on lv to authenticated;

insert into public.org_units (workspace_id, parent_id, level_id, name, path)
select (select id from ws), (select id from public.org_units where workspace_id = (select id from ws) and parent_id is null),
  (select id from lv where name = 'Division'), 'Engineering', 'x';
insert into public.org_units (workspace_id, parent_id, level_id, name, path)
select (select id from ws), (select id from public.org_units where name = 'Engineering'),
  (select id from lv where name = 'Tribe'), 'Platform', 'x';
insert into public.org_units (workspace_id, parent_id, level_id, name, path)
select (select id from ws), (select id from public.org_units where name = 'Platform'),
  (select id from lv where name = 'Squad'), 'Squad A', 'x';

select ok(
  (select path from public.org_units where name = 'Squad A')
    operator(extensions.<@) (select path from public.org_units where name = 'Engineering'),
  'paths place units under their ancestors'
);

select lives_ok(
  $$ insert into public.org_units (workspace_id, parent_id, level_id, name, path)
     select (select id from ws), (select id from public.org_units where name = 'Engineering'),
       (select id from lv where name = 'Squad'), 'Squad B', 'x' $$,
  'a unit may skip levels (a squad directly under a division)'
);

select throws_ok(
  $$ insert into public.org_units (workspace_id, parent_id, level_id, name, path)
     select (select id from ws), (select id from public.org_units where name = 'Squad A'),
       (select id from lv where name = 'Tribe'), 'Wrong way', 'x' $$,
  '23514', null, 'a unit cannot sit under a lower level'
);

select throws_ok(
  $$ update public.org_units set parent_id = (select id from public.org_units where name = 'Squad A')
     where name = 'Engineering' $$,
  '23514', null, 'a unit cannot move under its own descendants'
);

insert into public.org_units (workspace_id, parent_id, level_id, name, path)
select (select id from ws), (select id from public.org_units where workspace_id = (select id from ws) and parent_id is null),
  (select id from lv where name = 'Division'), 'Product', 'x';
update public.org_units set parent_id = (select id from public.org_units where name = 'Product')
where name = 'Platform';

select ok(
  (select path from public.org_units where name = 'Squad A')
    operator(extensions.<@) (select path from public.org_units where name = 'Product')
  and not (select path from public.org_units where name = 'Squad A')
    operator(extensions.<@) (select path from public.org_units where name = 'Engineering'),
  'moving a unit moves its whole subtree'
);

select throws_ok(
  $$ delete from public.org_units where workspace_id = (select id from ws) and parent_id is null $$,
  '23514', null, 'the root unit cannot be deleted'
);

select throws_ok(
  $$ insert into public.org_unit_levels (workspace_id, name, sort_order) values ((select id from ws), 'division', 50) $$,
  '23505', null, 'level names are unique per workspace, ignoring case'
);

-- Bob is a member without people.manage_structure.
select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
values ((select id from ws), (select user_id from people where name = 'bob'), 'Bob', 'bob@acme.test');
insert into public.member_roles (workspace_id, member_id, role_id)
select (select id from ws), m.id, r.id from public.members m, public.roles r
where m.email = 'bob@acme.test' and r.workspace_id = (select id from ws) and r.name = 'Member';

select tests.authenticate_as((select user_id from people where name = 'bob'));
select is((select count(*)::int from public.org_units where workspace_id = (select id from ws)), 6,
  'members can read the structure');
select throws_ok(
  $$ insert into public.positions (workspace_id, name) values ((select id from ws), 'Engineer') $$,
  '42501', null, 'members without people.manage_structure cannot change it'
);

select tests.authenticate_as((select user_id from people where name = 'dave'));
select is_empty($$ select 1 from public.org_units where workspace_id = (select id from ws) $$,
  'strangers cannot see the structure');

-- With People switched off, the structure is not readable.
select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.set_feature((select id from ws), 'people', false, true);
select tests.authenticate_as((select user_id from people where name = 'bob'));
select is_empty($$ select 1 from public.org_units where workspace_id = (select id from ws) $$,
  'with People off, members cannot read the structure');

select tests.authenticate_as((select user_id from people where name = 'alice'));
select is(
  (select count(*)::int from public.audit_log where workspace_id = (select id from ws) and table_name = 'org_units' and action = 'insert'),
  6, 'structure changes are audited'
);

select * from finish();
rollback;
