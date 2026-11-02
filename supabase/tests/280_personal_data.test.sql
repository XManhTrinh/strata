-- Personal data: export (yourself, or with the permission), erasing in one step (what goes, what
-- stays, the audit log, the record of it), and deleting your own account.
begin;
\ir _helpers.psql

select plan(20);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('hana', tests.create_user('hana@acme.test', 'Hana')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('solo', tests.create_user('solo@solo.test', 'Solo'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.authenticate_as((select user_id from people where name = 'solo'));
select public.create_workspace('Solo', 'solo', 'personal', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;
insert into public.members (workspace_id, user_id, full_name, email, start_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', current_date - 400
from people where name in ('hana', 'bob');
-- Solo is also in Acme, as a member.
insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, 'Solo', 'solo@acme.test' from people where name = 'solo';
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = initcap(p_name) $$;
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.m(text), pg_temp.as_user(text) to authenticated;
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.m(n), r.id from (values ('hana', 'HR'), ('bob', 'Member')) v (n, role)
join public.roles r on r.workspace_id = (select ws from ctx) and r.name = v.role;

-- Bob's details: pay, a custom value and a booking with a note.
insert into public.member_compensation (workspace_id, member_id, valid_from, annual_salary, currency)
values ((select ws from ctx), pg_temp.m('bob'), current_date - 400, 50000, 'GBP');
insert into public.custom_fields (workspace_id, key, label, type) values ((select ws from ctx), 'shirt', 'Shirt size', 'text');
insert into public.member_field_values (workspace_id, member_id, field_id, value)
select (select ws from ctx), pg_temp.m('bob'), id, '"L"' from public.custom_fields where workspace_id = (select ws from ctx);
select pg_temp.as_user('bob');
select public.book_time((select ws from ctx), (select id from public.time_types where workspace_id = (select ws from ctx) and name = 'Sick leave'),
  array[pg_temp.m('bob')], current_date - 3, current_date - 3, p_notes => 'Migraine');

-- Export -------------------------------------------------------------------------------------------
select is(public.person_data(pg_temp.m('bob')) -> 'person' ->> 'name', 'Bob', 'people download their own data');
select is((public.person_data(pg_temp.m('bob')) -> 'time_off' -> 0 ->> 'notes'), 'Migraine', 'including their time off and notes');
select throws_ok($$ select public.person_data(pg_temp.m('hana')) $$, '42501', null, 'but not someone else''s');
select pg_temp.as_user('hana');
select is((public.person_data(pg_temp.m('bob')) -> 'pay' -> 0 ->> 'annual_salary')::numeric, 50000::numeric,
  'HR, with the permission, downloads anyone''s');

-- Erase --------------------------------------------------------------------------------------------
select throws_ok($$ select public.erase_member(pg_temp.m('bob'), '  ') $$, '23514', null, 'erasing needs a reason');
select throws_ok(format($$ select public.erase_member(%L, 'test') $$, (select id from public.members where workspace_id = (select ws from ctx) and is_owner)),
  '23514', null, 'owners can''t be erased');
select lives_ok($$ select public.erase_member(pg_temp.m('bob'), 'Asked to be forgotten') $$, 'HR erases Bob');
select tests.clear_authentication();
create temporary table bob on commit drop as
select id from public.members where workspace_id = (select ws from ctx) and erased_at is not null;
grant select on bob to authenticated;
select is((select full_name || '/' || coalesce(email::text, '-') || '/' || coalesce(user_id::text, '-') from public.members where id = (select id from bob)),
  'Former employee/-/-', 'he becomes Former employee, with no contact details or account');
select is((select count(*)::integer from public.member_compensation where member_id = (select id from bob))
  + (select count(*)::integer from public.member_field_values where member_id = (select id from bob)), 0, 'his pay and custom values are gone');
select is((select count(*)::integer from public.booking_attendees where member_id = (select id from bob)), 1, 'his time off stays');
select is((select notes from public.bookings b join public.booking_attendees a on a.booking_id = b.id where a.member_id = (select id from bob)),
  null, 'without its notes');
select is((select count(*)::integer from public.audit_log where (row_id = (select id from bob)::text
  or before ->> 'member_id' = (select id from bob)::text or after ->> 'member_id' = (select id from bob)::text)
  and (before is not null or after is not null)), 0, 'the audit log keeps the changes without his values');
select is((select reason || '/' || kind from public.member_erasures where member_id = (select id from bob)),
  'Asked to be forgotten/manual', 'and the erasure is recorded');
select pg_temp.as_user('hana');
select throws_ok(format($$ select public.erase_member(%L, 'again') $$, (select id from bob)), '23514', null, 'a person is erased once');
select pg_temp.as_user('solo');
select throws_ok($$ select public.erase_member(pg_temp.m('hana'), 'no') $$, '42501', null, 'members can''t erase anyone');

-- Delete my account ------------------------------------------------------------------------------
select pg_temp.as_user('solo');
select is(jsonb_array_length(public.my_data() -> 'workspaces'), 2, 'you download your data from every workspace you''re in');
select is(public.my_account_deletion()::text, '{"leaves": ["Acme"], "blocked": [], "deletes": ["Solo"]}',
  'and see what deleting your account would do');
select pg_temp.as_user('alice');
select throws_ok($$ select public.delete_my_account() $$, '23514', null, 'an owner of a shared workspace passes it on first');
select pg_temp.as_user('solo');
select lives_ok($$ select public.delete_my_account() $$, 'Solo deletes their account');
select tests.clear_authentication();
select is(
  (select count(*)::integer from public.workspaces where slug = 'solo')
  + (select count(*)::integer from auth.users where email = 'solo@solo.test')
  + (select count(*)::integer from public.members where workspace_id = (select ws from ctx) and full_name = 'Solo' and user_id is not null),
  0, 'their own workspace and account are gone, and they leave Acme with their history unlinked');

select * from finish();
rollback;
