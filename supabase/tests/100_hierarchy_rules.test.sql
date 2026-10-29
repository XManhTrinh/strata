-- Hierarchy rules: level changes, archiving units and levels, and reordering levels.
begin;
\ir _helpers.psql

select plan(13);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');

create temporary table ws on commit drop as select id from public.workspaces where slug = 'acme';
grant select on ws to authenticated;

insert into public.org_unit_levels (workspace_id, name, sort_order) values
  ((select id from ws), 'Division', 10), ((select id from ws), 'Tribe', 20), ((select id from ws), 'Squad', 30);

create temporary table lv on commit drop as
select name::text as name, id from public.org_unit_levels where workspace_id = (select id from ws);
grant select on lv to authenticated;

-- No path given: the trigger computes it.
insert into public.org_units (workspace_id, parent_id, level_id, name)
select (select id from ws), (select id from public.org_units where workspace_id = (select id from ws) and parent_id is null),
  (select id from lv where name = 'Division'), 'Engineering';
insert into public.org_units (workspace_id, parent_id, level_id, name)
select (select id from ws), (select id from public.org_units where workspace_id = (select id from ws) and name = 'Engineering'),
  (select id from lv where name = 'Tribe'), 'Platform';

select ok(
  (select path from public.org_units where workspace_id = (select id from ws) and name = 'Platform')
    operator(extensions.<@) (select path from public.org_units where workspace_id = (select id from ws) and name = 'Engineering'),
  'units are placed without passing a path'
);

select throws_ok(
  $$ update public.org_units set level_id = (select id from lv where workspace_id = (select id from ws) and name = 'Squad') where name = 'Engineering' $$,
  '23514', null, 'a unit cannot drop to or below the level of its sub-units'
);

select throws_ok(
  $$ update public.org_units set archived_at = now() where workspace_id = (select id from ws) and name = 'Engineering' $$,
  '23514', null, 'a unit with live sub-units cannot be archived'
);

-- Alice works in Platform until further notice.
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id)
select (select id from ws), m.id, current_date - 30, (select id from public.org_units where workspace_id = (select id from ws) and name = 'Platform')
from public.members m where m.workspace_id = (select id from ws) and m.user_id = (select user_id from people where name = 'alice');

select throws_ok(
  $$ update public.org_units set archived_at = now() where workspace_id = (select id from ws) and name = 'Platform' $$,
  '23514', null, 'a unit people are in cannot be archived'
);

update public.member_assignments set valid_to = current_date where org_unit_id = (select id from public.org_units where workspace_id = (select id from ws) and name = 'Platform');

select lives_ok(
  $$ update public.org_units set archived_at = now() where workspace_id = (select id from ws) and name = 'Platform' $$,
  'an empty unit can be archived, keeping its history'
);

select throws_ok(
  $$ insert into public.org_units (workspace_id, parent_id, level_id, name)
     select (select id from ws), (select id from public.org_units where workspace_id = (select id from ws) and name = 'Platform'),
       (select id from lv where name = 'Squad'), 'Squad A' $$,
  '23514', null, 'nothing can be added under an archived unit'
);

update public.org_units set archived_at = now() where workspace_id = (select id from ws) and name = 'Engineering';

select throws_ok(
  $$ update public.org_units set archived_at = null where workspace_id = (select id from ws) and name = 'Platform' $$,
  '23514', null, 'a unit cannot be restored under an archived parent'
);

select throws_ok(
  $$ update public.org_units set archived_at = now() where workspace_id = (select id from ws) and parent_id is null $$,
  '23514', null, 'the root unit cannot be archived'
);

update public.org_units set archived_at = null where workspace_id = (select id from ws) and name in ('Engineering');
update public.org_units set archived_at = null where workspace_id = (select id from ws) and name in ('Platform');

select throws_ok(
  $$ update public.org_unit_levels set archived_at = now() where id = (select id from lv where name = 'Tribe') $$,
  '23514', null, 'a level live units use cannot be archived'
);

-- Reordering: Squad first is fine for a level no unit uses yet, but not Tribe above Division.
select lives_ok(
  $$ select public.reorder_org_unit_levels((select id from ws), array[
       (select id from lv where name = 'Squad'), (select id from lv where name = 'Division'), (select id from lv where name = 'Tribe')]) $$,
  'levels can be reordered'
);

select throws_ok(
  $$ select public.reorder_org_unit_levels((select id from ws), array[
       (select id from lv where name = 'Tribe'), (select id from lv where name = 'Division'), (select id from lv where name = 'Squad')]) $$,
  '23514', null, 'an order that puts a unit above its parent is refused'
);

select throws_ok(
  $$ select public.reorder_org_unit_levels((select id from ws), array[(select id from lv where name = 'Tribe')]) $$,
  '22023', null, 'every level must be given'
);

-- Bob joins with no roles: he cannot reorder.
select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
select (select id from ws), user_id, 'Bob', 'bob@acme.test' from people where name = 'bob';
select tests.authenticate_as((select user_id from people where name = 'bob'));

select throws_ok(
  $$ select public.reorder_org_unit_levels((select id from ws), array(select id from lv)) $$,
  '42501', null, 'only structure managers reorder levels'
);

select * from finish();
rollback;
