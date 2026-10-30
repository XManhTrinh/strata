-- Booking time: approval routing, overlaps, allowance, no self-approval, cancelling and rejecting
-- with refunds, booking for others, team events, the calendar's privacy, and personal workspaces.
begin;
\ir _helpers.psql

select plan(20);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('mia', tests.create_user('mia@acme.test', 'Mia')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('una', tests.create_user('una@acme.test', 'Una'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws,
  (select id from public.time_types where workspace_id = w.id and name = 'Annual leave') as leave,
  (select id from public.time_types where workspace_id = w.id and name = 'Sick leave') as sick,
  (select id from public.time_types where workspace_id = w.id and name = 'Team event') as event
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test' from people where name <> 'alice';
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = initcap(p_name) $$;
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.m(text), pg_temp.as_user(text) to authenticated;

-- Mia manages Bob; Una has no manager. All are in the root unit (from joining with an account).
update public.member_assignments set manager_member_id = pg_temp.m('mia') where member_id = pg_temp.m('bob');
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.m(n), r.id from (values ('mia', 'Manager'), ('bob', 'Member'), ('una', 'Member')) v (n, role)
join public.roles r on r.workspace_id = (select ws from ctx) and r.name = v.role;

-- Monday 1 March 2027 onwards.
create function pg_temp.book(p_who text, p_type uuid, p_for text[], p_from date, p_to date) returns uuid language sql as $$
  select public.book_time((select ws from ctx), p_type, (select array_agg(pg_temp.m(x)) from unnest(p_for) x), p_from, p_to)
$$;
grant execute on function pg_temp.book(text, uuid, text[], date, date) to authenticated;

-- Requests and approval -------------------------------------------------------------------------------
select pg_temp.as_user('bob');
select pg_temp.book('bob', (select leave from ctx), array['bob'], '2027-03-01', '2027-03-02') as leave_1 \gset
select is((select status::text from public.bookings where id = :'leave_1'), 'pending', 'leave needing approval waits');
select is((select working_days from public.booking_attendees where booking_id = :'leave_1'), 2.00, 'Mon–Tue is two working days');
select is((select approver_member_id from public.booking_approvals where booking_id = :'leave_1'), pg_temp.m('mia'),
  'it goes to the line manager');
select is((select sum(days) from public.allowance_ledger where booking_id = :'leave_1'), -2.00, 'and reserves the days');
select throws_ok(
  $$ select pg_temp.book('bob', (select leave from ctx), array['bob'], '2027-03-02', '2027-03-03') $$,
  '23514', null, 'overlapping time away is refused'
);
select public.book_time((select ws from ctx), (select sick from ctx), array[pg_temp.m('bob')], '2027-03-03', '2027-03-03', 'full', 'morning');
select lives_ok(
  $$ select public.book_time((select ws from ctx), (select sick from ctx), array[pg_temp.m('bob')], '2027-03-03', '2027-03-03', 'afternoon', 'full') $$,
  'a morning and an afternoon on the same day don''t overlap'
);
select throws_ok(
  format($$ select public.decide_booking(%L::uuid, true) $$, :'leave_1'), '42501', null, 'nobody approves their own request'
);
select pg_temp.as_user('una');
select throws_ok(format($$ select public.decide_booking(%L::uuid, true) $$, :'leave_1'), '42501', null, 'nor someone who isn''t the approver');
select pg_temp.as_user('mia');
select lives_ok(format($$ select public.decide_booking(%L::uuid, true, 'Enjoy') $$, :'leave_1'), 'the manager approves');
select is((select status::text from public.bookings where id = :'leave_1'), 'approved', 'and the leave is approved');

-- Allowance, cancelling and rejecting ---------------------------------------------------------------------
select pg_temp.as_user('bob');
select throws_ok(
  $$ select pg_temp.book('bob', (select leave from ctx), array['bob'], '2027-04-01', '2027-05-31') $$,
  '23514', null, 'more than the allowance left is refused'
);
select lives_ok(format($$ select public.cancel_booking(%L::uuid, 'Plans changed') $$, :'leave_1'), 'Bob cancels his approved leave');
select is((select sum(days) from public.allowance_ledger where booking_id = :'leave_1'), 0.00, 'and gets the days back');
select pg_temp.book('bob', (select leave from ctx), array['bob'], '2027-03-08', '2027-03-08') as leave_2 \gset
select pg_temp.as_user('mia');
select public.decide_booking(:'leave_2'::uuid, false, 'Busy week');
select is((select status::text || ':' || sum(l.days) from public.bookings b join public.allowance_ledger l on l.booking_id = b.id
  where b.id = :'leave_2' group by b.status), 'rejected:0.00', 'a rejected request gives its days back');

-- Booking for others, team events --------------------------------------------------------------------------
select pg_temp.as_user('una');
select throws_ok(
  $$ select pg_temp.book('una', (select sick from ctx), array['bob'], '2027-03-15', '2027-03-15') $$,
  '42501', null, 'members can''t book for colleagues'
);
select pg_temp.as_user('mia');
select pg_temp.book('mia', (select sick from ctx), array['bob'], '2027-03-15', '2027-03-15') as sick_1 \gset
select is((select status::text from public.bookings where id = :'sick_1'), 'approved', 'a manager books sick leave for a report, approved at once');
select throws_ok(
  $$ select pg_temp.book('mia', (select leave from ctx), array['bob', 'una'], '2027-03-22', '2027-03-22') $$,
  '23514', null, 'leave is for one person at a time'
);

-- The calendar keeps sick leave private ------------------------------------------------------------------------
select pg_temp.as_user('una');
select is(
  (select masked::text || ':' || coalesce(time_type_name, 'busy') from public.calendar_entries((select ws from ctx), '2027-03-01', '2027-03-31')
   where booking_id = :'sick_1'),
  'true:busy', 'a teammate sees sick leave as busy'
);

-- No manager: workspace approvers decide -----------------------------------------------------------------------
select pg_temp.book('una', (select leave from ctx), array['una'], '2027-03-29', '2027-03-29') as leave_3 \gset
select tests.authenticate_as((select user_id from people where name = 'alice'));
select lives_ok(format($$ select public.decide_booking(%L::uuid, true) $$, :'leave_3'), 'with no manager, the owner approves');

-- Personal workspaces approve at once.
select public.create_workspace('Me', 'me-alice', 'personal', 'GB', 'Europe/London', 'GBP');
select public.book_time(
  (select id from public.workspaces where slug = 'me-alice'),
  (select t.id from public.time_types t join public.workspaces w on w.id = t.workspace_id where w.slug = 'me-alice' and t.name = 'Annual leave'),
  array[(select m.id from public.members m join public.workspaces w on w.id = m.workspace_id where w.slug = 'me-alice')],
  '2027-03-01', '2027-03-01') as personal_1 \gset
select is((select status::text from public.bookings where id = :'personal_1'), 'approved',
  'personal workspaces approve leave at once');

select * from finish();
rollback;
