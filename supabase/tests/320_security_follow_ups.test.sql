-- Security review follow-ups: rate-card previews and sensitive fields, leaving a shared booking,
-- and reactivating someone with roles you couldn't give.
begin;
\ir _helpers.psql

select plan(8);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('cy', tests.create_user('cy@acme.test', 'Cy')),
  ('dan', tests.create_user('dan@acme.test', 'Dan'));
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.as_user(text) to authenticated;

select pg_temp.as_user('alice');
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();
create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = p_name $$;
create function pg_temp.role(p_name text) returns uuid language sql as
  $$ select id from public.roles where workspace_id = (select ws from ctx) and name = p_name $$;
grant execute on function pg_temp.m(text), pg_temp.role(text) to authenticated;

-- Bob and Cy are members, Dan manages members and reads rate cards but sees no pay; Pat has a
-- sensitive salary band.
insert into public.members (workspace_id, user_id, full_name, email, start_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', current_date - 400
from people where name in ('bob', 'cy', 'dan');
insert into public.members (workspace_id, full_name, start_date) values ((select ws from ctx), 'Pat', current_date - 400);
insert into public.roles (workspace_id, name) values ((select ws from ctx), 'Coordinator');
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), pg_temp.role('Coordinator'), k, 'workspace'
from unnest(array['members.view', 'members.manage', 'people.view', 'rate_cards.view']) k;
insert into public.member_roles (workspace_id, member_id, role_id) values
  ((select ws from ctx), pg_temp.m('Bob'), pg_temp.role('Member')),
  ((select ws from ctx), pg_temp.m('Cy'), pg_temp.role('Member')),
  ((select ws from ctx), pg_temp.m('Dan'), pg_temp.role('Coordinator'));
insert into public.custom_fields (workspace_id, key, label, type, sensitive)
values ((select ws from ctx), 'band', 'Salary band', 'text', true);
insert into public.member_field_values (workspace_id, member_id, field_id, value)
select (select ws from ctx), pg_temp.m('Pat'), id, '"Secret"' from public.custom_fields
where workspace_id = (select ws from ctx) and key = 'band';
insert into public.rate_cards (workspace_id, name, priority) values ((select ws from ctx), 'Band card', 10);
insert into public.rate_card_conditions (workspace_id, card_id, field, operator, value)
select (select ws from ctx), id, 'custom:band', 'equals', 'Secret' from public.rate_cards
where workspace_id = (select ws from ctx) and name = 'Band card';

-- Rate-card previews -----------------------------------------------------------------------------
select pg_temp.as_user('alice');
select is((select rate_card_name from public.rate_card_preview((select ws from ctx), current_date, pg_temp.m('Pat'))),
  'Band card', 'someone who sees pay gets the card matched on a sensitive field');
select pg_temp.as_user('dan');
select is((select rate_card_name from public.rate_card_preview((select ws from ctx), current_date, pg_temp.m('Pat'))),
  null, 'someone who doesn''t can''t use the preview to confirm the value');

-- Leaving a shared booking --------------------------------------------------------------------------
select pg_temp.as_user('alice');
create temporary table b on commit drop as
select public.book_time((select ws from ctx), (select id from public.time_types where workspace_id = (select ws from ctx) and name = 'Team event'),
  array[pg_temp.m('Bob'), pg_temp.m('Cy')], current_date + 30, current_date + 30) as id;
grant select on b to authenticated;
select pg_temp.as_user('bob');
select lives_ok($$ select public.cancel_booking((select id from b)) $$, 'an attendee cancels their part');
select tests.clear_authentication();
select is((select status::text || ' ' || (select string_agg(m.full_name, ', ') from public.booking_attendees a
  join public.members m on m.id = a.member_id where a.booking_id = b.id) from public.bookings, b where bookings.id = b.id),
  (select status::text from public.bookings where id = (select id from b)) || ' Cy',
  'which leaves it for everyone else');
select pg_temp.as_user('alice');
select public.cancel_booking((select id from b));
select is((select status::text from public.bookings where id = (select id from b)), 'cancelled',
  'while its organiser cancels the whole booking');

-- Reactivating -----------------------------------------------------------------------------------------
select tests.clear_authentication();
insert into public.member_roles (workspace_id, member_id, role_id) values ((select ws from ctx), pg_temp.m('Bob'), pg_temp.role('Admin'));
update public.members set status = 'inactive' where id = pg_temp.m('Bob');
select pg_temp.as_user('dan');
select throws_ok($$ select public.set_member_status((select ws from ctx), pg_temp.m('Bob'), 'active') $$, '42501', null,
  'bringing back an Admin needs what an Admin can do');
select pg_temp.as_user('alice');
select lives_ok($$ select public.set_member_status((select ws from ctx), pg_temp.m('Bob'), 'active') $$, 'which an owner has');
select pg_temp.as_user('dan');
select lives_ok($$ select public.set_member_status((select ws from ctx), pg_temp.m('Cy'), 'inactive') $$,
  'and deactivating still needs only managing members');

select * from finish();
rollback;
