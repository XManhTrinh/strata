-- Marking all as read in one workspace leaves the others' notifications unread.
begin;
\ir _helpers.psql

select plan(3);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values ('alice', tests.create_user('alice@acme.test', 'Alice'));
select tests.authenticate_as((select user_id from people));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select public.create_workspace('Beta', 'beta', 'team', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
delete from public.notifications where user_id = (select user_id from people);
insert into public.notifications (user_id, workspace_id, category, kind)
select (select user_id from people), w.id, 'system'::public.notification_category, 'test.' || w.slug from public.workspaces w where w.slug in ('acme', 'beta')
union all select (select user_id from people), null, 'system'::public.notification_category, 'test.personal';

select tests.authenticate_as((select user_id from people));
select public.mark_all_notifications_read((select id from public.workspaces where slug = 'acme'));
select is((select string_agg(kind, ', ' order by kind) from public.notifications where read_at is null), 'test.beta',
  'marking Acme read leaves Beta''s unread, and clears personal ones');
select public.mark_all_notifications_read();
select is((select count(*)::integer from public.notifications where read_at is null), 0, 'without a workspace, everything');
select tests.clear_authentication();
set local role anon;
select throws_ok($$ select public.mark_all_notifications_read() $$, '42501', null, 'signed out, nothing');
reset role;

select * from finish();
rollback;
