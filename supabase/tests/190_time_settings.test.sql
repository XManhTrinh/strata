-- Time settings: starter defaults, type rules, policy rules and who may change what.
begin;
\ir _helpers.psql

select plan(11);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'RO', 'Europe/Bucharest', 'RON');
select public.create_workspace('Me', 'me-alice', 'personal', 'US', 'America/New_York', 'USD');
create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;

select is(
  (select array_agg(name order by sort_order) from public.time_types where workspace_id = (select ws from ctx)),
  array['Annual leave', 'Sick leave', 'Training', 'Working from home', 'Team event'],
  'company workspaces start with five time types'
);
select is(
  (select array_agg(t.name order by t.sort_order) from public.time_types t join public.workspaces w on w.id = t.workspace_id where w.slug = 'me-alice'),
  array['Annual leave', 'Sick leave', 'Event'], 'personal workspaces start with three'
);
select is(
  (select needs_approval from public.time_types t join public.workspaces w on w.id = t.workspace_id
   where w.slug = 'me-alice' and t.name = 'Annual leave'),
  false, 'personal leave needs no approval'
);
select is(
  (select array_agg(w.slug || ':' || p.days_per_year::int order by w.slug) from public.allowance_policies p
   join public.workspaces w on w.id = p.workspace_id where p.is_default),
  array['acme:20', 'me-alice:15'], 'the leave policy starts from the country'
);
select is(
  (select working_days from public.work_schedules where workspace_id = (select ws from ctx) and is_default),
  array[1, 2, 3, 4, 5]::smallint[], 'a standard Monday to Friday week'
);
select is(
  (select country from public.holiday_calendars where workspace_id = (select ws from ctx) and is_default),
  'RO', 'a holiday calendar for the workspace country'
);

select throws_ok(
  $$ insert into public.time_types (workspace_id, name, needs_approval, approver) values ((select ws from ctx), 'Odd', true, 'none') $$,
  '23514', null, 'a type needing approval names an approver'
);
select throws_ok(
  $$ insert into public.time_types (workspace_id, name, uses_allowance, allows_recurrence) values ((select ws from ctx), 'Repeating leave', true, true) $$,
  '23514', null, 'only events repeat'
);
select throws_ok(
  $$ insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, days)
     select ws, (select id from public.members where workspace_id = ws and is_owner),
       (select id from public.time_types where workspace_id = ws and name = 'Annual leave'), '2026-01-01', 'grant', 30
     from ctx $$,
  '42501', null, 'nobody writes the ledger directly'
);

-- Bob, a plain member, reads the settings but can't change them.
select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, 'Bob', 'bob@acme.test' from people where name = 'bob';
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), m.id, r.id from public.members m, public.roles r
where m.email = 'bob@acme.test' and r.workspace_id = (select ws from ctx) and r.name = 'Member';
select tests.authenticate_as((select user_id from people where name = 'bob'));

select is((select count(*)::int from public.time_types where workspace_id = (select ws from ctx)), 5, 'members read time types');
select throws_ok(
  $$ insert into public.time_types (workspace_id, name) values ((select ws from ctx), 'Bob day') $$,
  '42501', null, 'members can''t add time types'
);

select * from finish();
rollback;
