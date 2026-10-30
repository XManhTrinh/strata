-- Profile changes: adding a person, dated job changes, pay, custom field values and access.
begin;
\ir _helpers.psql

select plan(16);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.org_unit_levels (workspace_id, name, sort_order) select ws, 'Team', 10 from ctx;
create function pg_temp.team_level() returns uuid language sql as
  $$ select id from public.org_unit_levels where workspace_id = (select ws from ctx) and name = 'Team' $$;
insert into public.org_units (workspace_id, parent_id, level_id, name) select ws, root, pg_temp.team_level(), 'Old team' from ctx;
create function pg_temp.unit(p_name text) returns uuid language sql as
  $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = p_name $$;
create function pg_temp.person(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = p_name $$;
create function pg_temp.jobs(p_name text) returns text[] language sql as $$
  select array_agg(a.valid_from - current_date || '..' || coalesce((a.valid_to - current_date)::text, '') || ':'
    || u.name || ':' || coalesce(m.full_name, '-') order by a.valid_from)
  from public.member_assignments a join public.org_units u on u.id = a.org_unit_id
  left join public.members m on m.id = a.manager_member_id
  where a.member_id = pg_temp.person(p_name)
$$;
grant execute on function pg_temp.unit(text), pg_temp.person(text), pg_temp.jobs(text) to authenticated;

-- Adding people ---------------------------------------------------------------------------------------
select lives_ok(
  $$ select public.add_person((select ws from ctx), 'Carol', (select root from ctx), 'carol@acme.test', 'E-1',
       current_date - 100) $$,
  'an owner adds a person with their first job record'
);
select public.add_person((select ws from ctx), 'Dan', (select root from ctx), p_start_date => current_date - 100,
  p_manager_member_id => pg_temp.person('Carol'));
select is(pg_temp.jobs('Dan'), array['-100..:Acme:Carol'], 'the first job record starts on the start date');

-- Dated job changes -------------------------------------------------------------------------------------
select public.change_job(pg_temp.person('Dan'), current_date + 30, pg_temp.unit('Old team'),
  pg_temp.person('Carol'), null, null, null);
select is(pg_temp.jobs('Dan'), array['-100..30:Acme:Carol', '30..:Old team:Carol'],
  'a future move ends the current record on its date');

select public.change_job(pg_temp.person('Dan'), current_date + 10, (select root from ctx), null, null, null, null);
select is(pg_temp.jobs('Dan'), array['-100..10:Acme:Carol', '10..30:Acme:-', '30..:Old team:Carol'],
  'a change before a scheduled one stops where it starts');

select public.remove_job_change((select id from public.member_assignments
  where member_id = pg_temp.person('Dan') and valid_from = current_date + 10));
select is(pg_temp.jobs('Dan'), array['-100..30:Acme:Carol', '30..:Old team:Carol'],
  'removing a change lets the record before it run on');

select throws_ok(
  $$ select public.remove_job_change((select id from public.member_assignments
       where member_id = pg_temp.person('Dan') and valid_from = current_date - 100)) $$,
  '23514', null, 'the first job record stays'
);

select throws_ok(
  $$ select public.change_job(pg_temp.person('Carol'), current_date + 40, (select root from ctx),
       pg_temp.person('Dan'), null, null, null) $$,
  '23514', null, 'a future change cannot make a reporting circle'
);

insert into public.org_units (workspace_id, parent_id, level_id, name, archived_at)
select ws, root, pg_temp.team_level(), 'Closed', now() from ctx;
select throws_ok(
  $$ select public.change_job(pg_temp.person('Carol'), current_date, pg_temp.unit('Closed'), null, null, null, null) $$,
  '23514', null, 'archived units cannot be chosen'
);

-- Pay ---------------------------------------------------------------------------------------------------
select public.change_pay(pg_temp.person('Carol'), current_date + 60, 'gbp', 70000);
select lives_ok(
  $$ select public.change_pay(pg_temp.person('Carol'), current_date, 'GBP', 60000) $$,
  'pay set before a future pay change'
);
select is(
  (select array_agg(annual_salary::int || ':' || coalesce((valid_to - current_date)::text, '') order by valid_from)
   from public.member_compensation where member_id = pg_temp.person('Carol')),
  array['60000:60', '70000:'], 'it stops where the future change starts'
);

-- Custom field values ----------------------------------------------------------------------------------
insert into public.custom_fields (workspace_id, key, label, type, sensitive) values
  ((select ws from ctx), 'site', 'Site', 'text', false), ((select ws from ctx), 'band', 'Band', 'text', true);
select public.set_field_value(pg_temp.person('Dan'), (select id from public.custom_fields where workspace_id = (select ws from ctx) and key = 'site'), current_date, '"Leeds"');
select is(
  (select value #>> '{}' from public.member_field_values where member_id = pg_temp.person('Dan')),
  'Leeds', 'a field value is set'
);
select public.set_field_value(pg_temp.person('Dan'), (select id from public.custom_fields where workspace_id = (select ws from ctx) and key = 'site'), current_date, 'null');
select is(
  (select count(*)::int from public.member_field_values where member_id = pg_temp.person('Dan')),
  0, 'a null value clears it'
);

select is(public.my_access_to_member(pg_temp.person('Dan')),
  array['people.edit', 'people.edit_compensation', 'people.view_compensation'], 'the owner may do everything');

-- Bob, a plain member, sees people but changes nothing.
select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, 'Bob', 'bob@acme.test' from people where name = 'bob';
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.person('Bob'), id from public.roles where workspace_id = (select ws from ctx) and name = 'Member';
select tests.authenticate_as((select user_id from people where name = 'bob'));

select is(public.my_access_to_member(pg_temp.person('Dan')), '{}'::text[], 'a plain member may change nothing');
select throws_ok(
  $$ select public.change_job(pg_temp.person('Dan'), current_date, (select root from ctx), null, null, null, null) $$,
  '42501', null, 'nor change jobs'
);
select throws_ok(
  $$ select public.set_field_value(pg_temp.person('Dan'), (select id from public.custom_fields where workspace_id = (select ws from ctx) and key = 'band'), current_date, '"B"') $$,
  '42501', null, 'nor sensitive fields'
);

select * from finish();
rollback;
