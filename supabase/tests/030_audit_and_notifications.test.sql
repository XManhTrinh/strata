-- The audit log records sensitive changes and cannot be altered; notifications reach the right
-- person and only them.
begin;
\ir _helpers.psql

select plan(11);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'team', 'GB', 'Europe/London', 'GBP');
create temporary table ws on commit drop as select id from public.workspaces where slug = 'acme';
grant select on ws to authenticated;

select ok(
  exists (select 1 from public.audit_log where workspace_id = (select id from ws) and table_name = 'workspaces' and action = 'insert'),
  'creating a workspace is audited'
);
select ok(
  (select actor_user_id from public.audit_log where workspace_id = (select id from ws) and table_name = 'workspaces')
    = (select user_id from people where name = 'alice'),
  'audit entries record who made the change'
);

update public.workspaces set name = 'Acme Ltd' where id = (select id from ws);
select ok(
  exists (
    select 1 from public.audit_log
    where workspace_id = (select id from ws) and table_name = 'workspaces' and action = 'update'
      and before ->> 'name' = 'Acme' and after ->> 'name' = 'Acme Ltd'
  ),
  'updates keep the before and after values'
);

select throws_ok($$ delete from public.audit_log $$, '42501', null, 'owners cannot delete audit entries');

select tests.clear_authentication();
select throws_ok($$ update public.audit_log set action = 'insert' $$, '42501', null,
  'not even the database owner can change audit entries');

-- Bob joins with the Member role; he can see notifications addressed to him only.
insert into public.members (workspace_id, user_id, full_name, email)
values ((select id from ws), (select user_id from people where name = 'bob'), 'Bob', 'bob@acme.test');

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.assign_role(
  (select id from ws),
  (select id from public.members where email = 'bob@acme.test'),
  (select id from public.roles where workspace_id = (select id from ws) and name = 'Member')
);

select tests.authenticate_as((select user_id from people where name = 'bob'));
select is(
  (select kind || ':' || (payload ->> 'role_name') from public.notifications),
  'role.assigned:Member',
  'the member is notified about a new role'
);
select is_empty(
  $$ select 1 from public.audit_log $$,
  'members without workspace.view_audit cannot read the audit log'
);

select tests.authenticate_as((select user_id from people where name = 'alice'));
select is_empty($$ select 1 from public.notifications $$,
  'people are not notified about changes they made themselves, nor see others'' notifications');

select tests.authenticate_as((select user_id from people where name = 'bob'));
select public.mark_all_notifications_read();
select ok((select bool_and(read_at is not null) from public.notifications), 'users can mark their notifications read');

select throws_ok(
  $$ update public.notifications set payload = '{}' $$,
  '42501', null, 'users can only change whether a notification is read'
);

insert into public.notification_preferences (user_id, category, email_delivery)
values (auth.uid(), 'access', 'daily');
select is(
  (select email_delivery::text from public.notification_preferences where category = 'access'),
  'daily', 'users can choose how they get email per category'
);

select * from finish();
rollback;
