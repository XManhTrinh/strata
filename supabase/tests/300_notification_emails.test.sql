-- Notification emails: only the job (with the secret) claims and records them; instant ones after
-- a short wait if still unread, daily ones at 08:00 local time, none for "none" or invitations, each
-- once; and approvers are reminded once about requests left waiting.
begin;
\ir _helpers.psql

select plan(13);

delete from vault.secrets where name = 'jobs_secret';
select vault.create_secret('test-jobs-secret', 'jobs_secret');

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
create function pg_temp.u(p_name text) returns uuid language sql as
  $$ select user_id from people where name = p_name $$;
delete from public.notifications;

-- Mia gets time notifications once a day, in a time zone where it is past 08:00 now; Bob gets
-- none for planning.
update public.profiles set time_zone = (
  select name from pg_timezone_names where (now() at time zone name)::time between time '09:00' and time '23:00'
  order by name limit 1)
where id = pg_temp.u('mia');
insert into public.notification_preferences (user_id, category, email_delivery) values
  (pg_temp.u('mia'), 'time', 'daily'), (pg_temp.u('bob'), 'planning', 'none');

insert into public.notifications (user_id, workspace_id, category, kind, read_at, created_at) values
  (pg_temp.u('alice'), (select ws from ctx), 'time', 'test.due', null, now() - interval '3 minutes'),
  (pg_temp.u('alice'), (select ws from ctx), 'time', 'test.too_new', null, now()),
  (pg_temp.u('alice'), (select ws from ctx), 'time', 'test.read', now(), now() - interval '3 minutes'),
  (pg_temp.u('alice'), (select ws from ctx), 'time', 'test.too_old', null, now() - interval '4 days'),
  (pg_temp.u('alice'), null, 'invitation', 'test.invitation', null, now() - interval '3 minutes'),
  (pg_temp.u('mia'), (select ws from ctx), 'time', 'test.daily', null, now() - interval '1 day'),
  (pg_temp.u('mia'), (select ws from ctx), 'time', 'test.daily_today', null, now() - interval '3 minutes'),
  (pg_temp.u('bob'), (select ws from ctx), 'planning', 'test.none', null, now() - interval '3 minutes');

select throws_ok($$ select public.claim_notification_emails('wrong') $$, '42501', null, 'claiming needs the jobs secret');
set local role anon;
select throws_ok($$ select public.mark_notification_emails('', '{}') $$, '42501', null, 'and so does recording');
reset role;

create temporary table batch on commit drop as select * from public.claim_notification_emails('test-jobs-secret');
select is((select string_agg(kind, ', ' order by kind) from batch), 'test.daily, test.due',
  'due instant and daily emails are claimed; new, read, old, invitation and "none" ones aren''t');
select is((select delivery::text from batch where kind = 'test.daily'), 'daily', 'with how each is delivered');
select is((select email from batch where kind = 'test.due'), 'alice@acme.test', 'and where to');
select is((select count(*)::integer from public.claim_notification_emails('test-jobs-secret')), 0,
  'a claimed batch isn''t claimed again');

select lives_ok(format($$ select public.mark_notification_emails('test-jobs-secret', array[%L::uuid],
  jsonb_build_array(jsonb_build_object('id', %L, 'error', 'Mailbox full'))) $$,
  (select id from batch where kind = 'test.due'), (select id from batch where kind = 'test.daily')), 'the job records the result');
select ok((select emailed_at is not null from public.notifications where kind = 'test.due'), 'sent is sent');
select is((select email_error from public.notifications where kind = 'test.daily'), 'Mailbox full', 'a failure keeps its reason');
update public.notifications set email_claimed_at = now() - interval '11 minutes' where kind = 'test.daily';
select is((select string_agg(kind, ', ') from public.claim_notification_emails('test-jobs-secret')), 'test.daily',
  'and is tried again later');

-- Reminders.
insert into public.members (workspace_id, user_id, full_name, email, start_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', current_date - 400 from people where name <> 'alice';
update public.member_assignments set manager_member_id = (select id from public.members where full_name = 'Mia')
where member_id = (select id from public.members where full_name = 'Bob');
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), m.id, r.id from (values ('Mia', 'Manager'), ('Bob', 'Member')) v (n, role)
join public.members m on m.workspace_id = (select ws from ctx) and m.full_name = v.n
join public.roles r on r.workspace_id = (select ws from ctx) and r.name = v.role;
select tests.authenticate_as(pg_temp.u('bob'));
select public.book_time((select ws from ctx), (select id from public.time_types where workspace_id = (select ws from ctx) and name = 'Annual leave'),
  array[(select id from public.members where full_name = 'Bob')], current_date + 30, current_date + 31);
select tests.clear_authentication();
create function pg_temp.reminders() returns integer language sql as
  $$ select count(*)::integer from public.notifications where workspace_id = (select ws from ctx) and kind = 'time.reminder' $$;
select app.remind_pending_approvals();
select is(pg_temp.reminders(), 0, 'a new request isn''t reminded');
update public.booking_approvals set created_at = now() - interval '6 days' where workspace_id = (select ws from ctx);
select app.remind_pending_approvals();
select is((select string_agg(u.email::text, ', ') from public.notifications n join auth.users u on u.id = n.user_id
  where n.workspace_id = (select ws from ctx) and n.kind = 'time.reminder'), 'mia@acme.test', 'one waiting 2 working days is, to its approver');
select app.remind_pending_approvals();
select is(pg_temp.reminders(), 1, 'once');

select * from finish();
rollback;
