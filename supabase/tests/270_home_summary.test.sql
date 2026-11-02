-- Home: each person sees their own time, the people they may see away this week, approvals when
-- they approve, and the organization's numbers only when they see everyone and run it.
begin;
\ir _helpers.psql

select plan(9);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('mia', tests.create_user('mia@acme.test', 'Mia')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;
insert into public.members (workspace_id, user_id, full_name, email, start_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', current_date - 400 from people where name <> 'alice';
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = initcap(p_name) $$;
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.m(text), pg_temp.as_user(text) to authenticated;
update public.member_assignments set manager_member_id = pg_temp.m('mia') where member_id = pg_temp.m('bob');
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.m(n), r.id from (values ('mia', 'Manager'), ('bob', 'Member')) v (n, role)
join public.roles r on r.workspace_id = (select ws from ctx) and r.name = v.role;

-- Bob asks for leave in two weeks; Mia is away this week.
select pg_temp.as_user('bob');
select public.book_time((select ws from ctx), (select id from public.time_types where workspace_id = (select ws from ctx) and name = 'Annual leave'),
  array[pg_temp.m('bob')], current_date + 14, current_date + 15);
select pg_temp.as_user('mia');
select public.book_time((select ws from ctx), (select id from public.time_types where workspace_id = (select ws from ctx) and name = 'Sick leave'),
  array[pg_temp.m('mia')], current_date, current_date);

select pg_temp.as_user('bob');
select is((public.home_summary((select ws from ctx)) -> 'me' ->> 'waiting')::integer, 1, 'your own requests waiting');
select is((public.home_summary((select ws from ctx)) -> 'me' -> 'upcoming' -> 0 ->> 'type'), 'Annual leave', 'and your next time off');
select ok(jsonb_array_length(public.home_summary((select ws from ctx)) -> 'me' -> 'balances') > 0, 'and your balances');
select ok(public.home_summary((select ws from ctx)) -> 'org' is null, 'members don''t see the organization''s numbers');

select pg_temp.as_user('mia');
select is((public.home_summary((select ws from ctx)) -> 'team' ->> 'approvals')::integer, 1, 'a manager sees approvals waiting');
select ok(public.home_summary((select ws from ctx)) -> 'org' is null, 'and not the organization''s numbers');

select pg_temp.as_user('alice');
select is((public.home_summary((select ws from ctx)) -> 'team' -> 'away' -> 0 ->> 'name'), 'Mia', 'the owner sees who''s away this week');
select is((public.home_summary((select ws from ctx)) -> 'org' ->> 'headcount')::integer, 3, 'and the headcount');

select tests.clear_authentication();
select throws_ok($$ select public.home_summary((select ws from ctx)) $$, '42501', null, 'people outside the workspace see nothing');

select * from finish();
rollback;
