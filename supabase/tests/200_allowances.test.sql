-- Working days and allowances: schedules, holidays, half days, leave years, grants, pro-rata,
-- joiners, accruals, carry-over, expiry and adjustments.
begin;
\ir _helpers.psql

select plan(15);

select tests.authenticate_as(tests.create_user('alice@acme.test', 'Alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws,
  (select id from public.org_units where workspace_id = w.id and parent_id is null) as root,
  (select id from public.time_types where workspace_id = w.id and name = 'Annual leave') as leave,
  (select id from public.holiday_calendars where workspace_id = w.id and is_default) as cal,
  (select id from public.allowance_policies where workspace_id = w.id and is_default) as policy
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

-- Full-timer Fay, part-timer Pat (Mon–Wed), and Jo who joins on 1 July 2026.
insert into public.work_schedules (workspace_id, name, working_days) select ws, 'Mon–Wed', array[1, 2, 3] from ctx;
insert into public.members (workspace_id, full_name, start_date) select ws, n, s from ctx,
  (values ('Fay', '2020-01-01'::date), ('Pat', '2020-01-01'::date), ('Jo', '2026-07-01'::date)) v (n, s);
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = p_name $$;
grant execute on function pg_temp.m(text) to authenticated;
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id, work_schedule_id)
select ws, pg_temp.m(n), '2020-01-01', root,
  case when n = 'Pat' then (select id from public.work_schedules where workspace_id = ws and name = 'Mon–Wed') end
from ctx, (values ('Fay'), ('Pat'), ('Jo')) v (n);

-- A bank holiday on Wednesday 6 May 2026 and a half-day holiday on Thursday 7 May.
insert into public.holidays (workspace_id, calendar_id, date, name, portion)
select ws, cal, d, n, p from ctx, (values ('2026-05-06'::date, 'Holiday', 1.0), ('2026-05-07'::date, 'Half holiday', 0.5)) v (d, n, p);

-- Working days ----------------------------------------------------------------------------------------
select is(app.working_days(pg_temp.m('Fay'), '2026-05-04', 'full', '2026-05-10', 'full'), 3.5,
  'Mon–Sun with a holiday and a half holiday is 3.5 days');
select is(app.working_days(pg_temp.m('Fay'), '2026-05-04', 'afternoon', '2026-05-05', 'morning'), 1.0,
  'Monday afternoon to Tuesday morning is a day');
select is(app.working_days(pg_temp.m('Pat'), '2026-05-04', 'full', '2026-05-08', 'full'), 2.0,
  'a Mon–Wed schedule counts only its days (and not the holiday)');
select is(app.leave_year_start(4::smallint, '2026-03-31'), '2025-04-01'::date, 'a leave year from April');

-- Upfront grants ----------------------------------------------------------------------------------------
select app.settle_allowance(pg_temp.m(n), (select leave from ctx), '2026-08-01') from (values ('Fay'), ('Pat'), ('Jo')) v (n);
select app.settle_allowance(pg_temp.m('Fay'), (select leave from ctx), '2026-09-01');
select is(
  (select array_agg(m.full_name || ':' || l.days order by m.full_name) from public.allowance_ledger l
   join public.members m on m.id = l.member_id where l.kind = 'grant'),
  array['Fay:20.00', 'Jo:10.00', 'Pat:12.00'],
  'full-timers get the policy, part-timers pro-rata, joiners for the months left — once'
);

-- Monthly accrual ---------------------------------------------------------------------------------------
update public.allowance_policies set accrual = 'monthly' where id = (select policy from ctx);
delete from public.allowance_ledger;
select app.settle_allowance(pg_temp.m('Fay'), (select leave from ctx), '2026-03-15');
select is(
  (select count(*)::int || ':' || sum(days) from public.allowance_ledger where kind = 'accrual'),
  '3:5.01', 'monthly accrual adds a twelfth each month so far'
);
select app.settle_allowance(pg_temp.m('Fay'), (select leave from ctx), '2026-03-20');
select is((select count(*)::int from public.allowance_ledger where kind = 'accrual'), 3, 'and never twice for a month');

-- Carry-over and expiry -----------------------------------------------------------------------------------
update public.allowance_policies set accrual = 'upfront', carry_over_max = 5, carry_over_expires_months = 3
where id = (select policy from ctx);
delete from public.allowance_ledger;
select app.settle_allowance(pg_temp.m('Fay'), (select leave from ctx), '2025-06-01');
-- Fay used 12 of her 20 days in 2025 (an adjustment stands in for bookings here).
insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, days, reason)
select ws, pg_temp.m('Fay'), leave, '2025-01-01', 'adjustment', -12, 'Used' from ctx;
select app.settle_allowance(pg_temp.m('Fay'), (select leave from ctx), '2026-01-10');
select is(
  (select days from public.allowance_ledger where kind = 'carry_over'), 5.00, '8 days left, 5 carried over (the cap)'
);
select app.settle_allowance(pg_temp.m('Fay'), (select leave from ctx), '2026-04-02');
select is(
  (select days from public.allowance_ledger where kind = 'expiry'), -5.00, 'carried days unused after 3 months expire'
);

-- Balances and adjustments ------------------------------------------------------------------------------------
select tests.authenticate_as((select user_id from public.members where workspace_id = (select ws from ctx) and is_owner));
select is(
  (select entitled || '/' || carried_over || '/' || expired || '/' || available
   from public.allowance_balances(pg_temp.m('Fay'), '2026-04-02')),
  '20.00/5.00/5.00/20.00', 'a balance explains itself: entitled, carried, expired, available'
);
select throws_ok(
  $$ select public.adjust_allowance(pg_temp.m('Fay'), (select leave from ctx), 2, ' ', '2026-04-02') $$,
  '23514', null, 'an adjustment needs a reason'
);
select lives_ok(
  $$ select public.adjust_allowance(pg_temp.m('Fay'), (select leave from ctx), 2, 'Long service', '2026-04-02') $$,
  'an owner adjusts with a reason'
);
select is(
  (select available from public.allowance_balances(pg_temp.m('Fay'), '2026-04-02')), 22.00, 'and the balance follows'
);

-- Bob, a plain member in Fay's unit, can't adjust her balance but can see it.
select tests.clear_authentication();
select tests.create_user('bob@acme.test', 'Bob') \gset bob_
insert into public.members (workspace_id, user_id, full_name, email) select ws, :'bob_create_user', 'Bob', 'bob@acme.test' from ctx;
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.m('Bob'), id from public.roles where workspace_id = (select ws from ctx) and name = 'Member';
select tests.authenticate_as(:'bob_create_user');
select throws_ok(
  $$ select public.adjust_allowance(pg_temp.m('Fay'), (select leave from ctx), 2, 'Gift', '2026-04-02') $$,
  '42501', null, 'members can''t adjust others'' balances'
);
select is((select count(*)::int from public.allowance_balances(pg_temp.m('Fay'), '2026-04-02')), 1,
  'but they see their own team''s balances (the Member role''s team reach)');

select * from finish();
rollback;
