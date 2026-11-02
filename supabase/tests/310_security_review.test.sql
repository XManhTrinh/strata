-- Security review: functions and policies that answered or allowed more than they should.
begin;
\ir _helpers.psql

select plan(11);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('dan', tests.create_user('dan@acme.test', 'Dan')),
  ('eve', tests.create_user('eve@other.test', 'Eve'));
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.as_user(text) to authenticated;

select pg_temp.as_user('alice');
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select pg_temp.as_user('eve');
select public.create_workspace('Other', 'other', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = p_name $$;
create function pg_temp.role(p_name text) returns uuid language sql as
  $$ select id from public.roles where workspace_id = (select ws from ctx) and name = p_name $$;
grant execute on function pg_temp.m(text), pg_temp.role(text) to authenticated;

-- Bob (an Admin who has left), Dan (imports people and reads the audit log, nothing about pay)
-- and Pat, with a sensitive custom field.
insert into public.members (workspace_id, user_id, full_name, email, person_key) values
  ((select ws from ctx), (select user_id from people where name = 'bob'), 'Bob', 'bob@acme.test', null),
  ((select ws from ctx), (select user_id from people where name = 'dan'), 'Dan', 'dan@acme.test', null),
  ((select ws from ctx), null, 'Pat', 'pat@acme.test', 'P1');
insert into public.roles (workspace_id, name) values ((select ws from ctx), 'Importer');
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), pg_temp.role('Importer'), k, 'workspace'
from unnest(array['people.view', 'people.import', 'workspace.view_audit']) k;
insert into public.member_roles (workspace_id, member_id, role_id) values
  ((select ws from ctx), pg_temp.m('Bob'), pg_temp.role('Admin')),
  ((select ws from ctx), pg_temp.m('Dan'), pg_temp.role('Importer'));
insert into public.custom_fields (workspace_id, key, label, type, sensitive)
values ((select ws from ctx), 'band', 'Salary band', 'text', true);
insert into public.member_field_values (workspace_id, member_id, field_id, value)
select (select ws from ctx), pg_temp.m('Pat'), id, '"Secret"' from public.custom_fields where workspace_id = (select ws from ctx) and key = 'band';

-- Headcount per unit ----------------------------------------------------------------------------
select pg_temp.as_user('eve');
select is((select count(*)::integer from public.unit_headcount((select ws from ctx))), 0,
  'unit headcount says nothing about a workspace you''re not in');
select pg_temp.as_user('alice');
select ok((select count(*) from public.unit_headcount((select ws from ctx))) > 0, 'but answers in your own');

-- Re-inviting someone who left --------------------------------------------------------------------
select tests.clear_authentication();
update public.members set status = 'inactive' where id = pg_temp.m('Bob');
select pg_temp.as_user('alice');
create temporary table tokens on commit drop as
select token from public.create_invitation((select ws from ctx), 'bob@acme.test', pg_temp.role('Member'));
grant select on tokens to authenticated;
select pg_temp.as_user('bob');
select public.accept_invitation((select token from tokens));
select tests.clear_authentication();
select is((select string_agg(r.name, ', ') from public.member_roles mr join public.roles r on r.id = mr.role_id
  where mr.member_id = pg_temp.m('Bob')), 'Member', 'someone re-invited comes back with the invited role only');

-- Importing sensitive fields --------------------------------------------------------------------
select pg_temp.as_user('dan');
insert into public.import_jobs (workspace_id, created_by, key_field) values ((select ws from ctx), auth.uid(), 'person_key');
create temporary table jobs on commit drop as select id from public.import_jobs where workspace_id = (select ws from ctx);
grant select on jobs to authenticated;
select public.import_stage_rows((select id from jobs), 1, '[{"person_key": "P1", "custom": {"band": "Secret"}}]');
select is(public.import_preview((select id from jobs)) ->> 'errors', '1',
  'importing a sensitive field needs the pay permissions');
select is((select errors from public.import_rows where job_id = (select id from jobs)), array['payNotAllowed'],
  'so the preview can''t confirm a guessed value');

select throws_ok($$ insert into public.import_jobs (workspace_id, created_by, key_field, mark_leavers)
  values ((select ws from ctx), auth.uid(), 'person_key', true) $$, '42501', null,
  'marking leavers in an import needs managing members');
select throws_ok($$ insert into public.import_jobs (workspace_id, created_by, key_field, status)
  values ((select ws from ctx), auth.uid(), 'person_key', 'applied') $$, '42501', null,
  'and an import starts at the start');

-- The audit log ------------------------------------------------------------------------------------
select is((select count(*)::integer from public.audit_log where workspace_id = (select ws from ctx) and table_name = 'member_field_values'), 0,
  'audit readers without pay access don''t see sensitive values');
select ok((select count(*) from public.audit_log where workspace_id = (select ws from ctx) and table_name = 'members') > 0,
  'but see the rest');
select pg_temp.as_user('alice');
select ok((select count(*) from public.audit_log where workspace_id = (select ws from ctx) and table_name = 'member_field_values') > 0,
  'and those who may see pay see them');

-- Carry-over ------------------------------------------------------------------------------------------
select count(*) from public.allowance_balances(pg_temp.m('Alice'), current_date);
select count(*) from public.allowance_balances(pg_temp.m('Alice'), (current_date + interval '1 year')::date);
select is((select count(*)::integer from public.allowance_ledger where member_id = pg_temp.m('Alice')
  and kind = 'carry_over' and leave_year > current_date), 0,
  'looking at next year doesn''t fix its carry-over while this year can still change');

select * from finish();
rollback;
