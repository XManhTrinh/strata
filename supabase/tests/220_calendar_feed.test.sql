-- Calendar feeds: a token shows what its owner may see, hides private types, and stops when revoked.
begin;
\ir _helpers.psql

select plan(5);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated, anon;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
create temporary table ctx on commit drop as
select w.id as ws, (select id from public.time_types where workspace_id = w.id and name = 'Sick leave') as sick,
  (select id from public.time_types where workspace_id = w.id and name = 'Team event') as event
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated, anon;
insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, 'Bob', 'bob@acme.test' from people where name = 'bob';
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), m.id, r.id from public.members m, public.roles r
where m.email = 'bob@acme.test' and r.workspace_id = (select ws from ctx) and r.name = 'Member';

-- Alice books sick leave for herself and an event for both of them.
select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.book_time((select ws from ctx), (select sick from ctx),
  array[(select id from public.members where workspace_id = (select ws from ctx) and is_owner)], current_date + 3, current_date + 3);
select public.book_time((select ws from ctx), (select event from ctx),
  (select array_agg(id) from public.members where workspace_id = (select ws from ctx)), current_date + 5, current_date + 5);

-- Bob's team feed.
select tests.authenticate_as((select user_id from people where name = 'bob'));
select public.create_feed_token((select ws from ctx), 'team') as token \gset
select tests.authenticate_as_anon();

select is((select count(*)::int from public.calendar_feed(:'token')), 3, 'the feed shows the team''s bookings');
select is(
  (select count(*)::int from public.calendar_feed(:'token') where masked and time_type_name is null), 1,
  'Alice''s sick leave shows as busy to Bob'
);
select is((select count(*)::int from public.calendar_feed('not-a-token')), 0, 'unknown tokens show nothing');

select tests.clear_authentication();
update public.calendar_feed_tokens set revoked_at = now();
select tests.authenticate_as_anon();
select is((select count(*)::int from public.calendar_feed(:'token')), 0, 'revoked links show nothing');

select tests.clear_authentication();
select is((select count(*)::int from public.calendar_feed_tokens where token_hash = :'token'), 0, 'the token itself is never stored');

select * from finish();
rollback;
