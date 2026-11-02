-- Retention: each rule applied as of a day (leavers anonymised, private notes cleared, old audit
-- entries, imports and notifications removed), empty rules keep, and who may change them.
begin;
\ir _helpers.psql

select plan(10);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;

-- An old leaver, a recent leaver, an old private note, and old audit, import and notification rows.
insert into public.members (workspace_id, full_name, email, start_date, end_date, status) values
  ((select ws from ctx), 'Old Leaver', 'old@acme.test', date '2010-01-01', current_date - interval '8 years', 'inactive'),
  ((select ws from ctx), 'New Leaver', 'new@acme.test', date '2020-01-01', current_date - interval '1 year', 'inactive');
insert into public.bookings (workspace_id, time_type_id, created_by, start_date, end_date, status, notes)
select (select ws from ctx), t.id, m.id, current_date - interval '5 years', current_date - interval '5 years', 'approved', 'Flu'
from public.time_types t, public.members m
where t.workspace_id = (select ws from ctx) and t.name = 'Sick leave' and m.full_name = 'New Leaver';
insert into public.audit_log (workspace_id, action, table_name, row_id, after, at)
values ((select ws from ctx), 'insert', 'members', 'x', '{}', now() - interval '9 years');
insert into public.import_jobs (workspace_id, key_field, effective_date, created_at)
values ((select ws from ctx), 'email', current_date, now() - interval '60 days');
insert into public.notifications (user_id, workspace_id, category, kind, created_at)
values ((select user_id from people where name = 'alice'), (select ws from ctx), 'system', 'test.old', now() - interval '2 years');

select is(app.apply_retention((select ws from ctx)) ->> 'leavers', '1', 'leavers past the rule are anonymised');
select is((select string_agg(full_name, ', ' order by full_name) from public.members where workspace_id = (select ws from ctx) and end_date is not null),
  'Former employee, New Leaver', 'recent leavers are kept');
select is((select kind from public.member_erasures where workspace_id = (select ws from ctx)), 'retention', 'and it is recorded as retention');
select is((select notes from public.bookings where workspace_id = (select ws from ctx) and created_by = (
  select id from public.members where full_name = 'New Leaver')), null, 'old notes on private time off are cleared');
select is((select count(*)::integer from public.audit_log where workspace_id = (select ws from ctx) and at < now() - interval '8 years'), 0,
  'old audit entries go');
select is((select count(*)::integer from public.import_jobs where workspace_id = (select ws from ctx)), 0, 'old imports go');
select is((select count(*)::integer from public.notifications where kind = 'test.old'), 0, 'old notifications go');

-- Empty keeps.
update public.data_retention set anonymise_leavers_months = null where workspace_id = (select ws from ctx);
update public.members set start_date = date '2010-01-01', end_date = current_date - interval '9 years' where full_name = 'New Leaver';
select is(app.apply_retention((select ws from ctx)) ->> 'leavers', '0', 'an empty rule keeps');

-- Who may change the rules.
insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, 'Bob', 'bob@acme.test' from people where name = 'bob';
select tests.authenticate_as((select user_id from people where name = 'bob'));
select is((select count(*)::integer from public.data_retention), 0, 'members don''t see the rules');
select tests.authenticate_as((select user_id from people where name = 'alice'));
select lives_ok($$ update public.data_retention set notifications_months = 6 where workspace_id = (select ws from ctx) $$,
  'the owner changes them');

select * from finish();
rollback;
