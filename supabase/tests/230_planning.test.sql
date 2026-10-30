-- Planning: settings and the cost permission, scenarios from people, saving allocations (reach,
-- locks, over-allocation, audit), planned roles and filling them, copying, the lifecycle with its
-- notifications, the live plan, and who sees what.
begin;
\ir _helpers.psql

select plan(43);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('fin', tests.create_user('fin@acme.test', 'Fin')),
  ('mia', tests.create_user('mia@acme.test', 'Mia')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('una', tests.create_user('una@acme.test', 'Una'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

-- Months around today: two locked behind, ten ahead.
create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root,
  (date_trunc('month', current_date) - interval '2 months')::date as first_month,
  date_trunc('month', current_date)::date as this_month,
  (date_trunc('month', current_date) + interval '9 months')::date as last_month
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.members (workspace_id, user_id, full_name, email, start_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', current_date - 400
from people where name <> 'alice';
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = initcap(p_name) $$;
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.m(text), pg_temp.as_user(text) to authenticated;

-- Their job records start with them, a year ago.
update public.member_assignments set valid_from = current_date - 400
where member_id in (select id from public.members where workspace_id = (select ws from ctx) and not is_owner);

-- A squad under the root; Una plans it through a role granted on that unit.
insert into public.org_unit_levels (workspace_id, name, sort_order) select ws, 'Team', 10 from ctx;
insert into public.org_units (workspace_id, parent_id, level_id, name)
select ws, root, (select id from public.org_unit_levels where workspace_id = ws and name = 'Team'), 'Squad' from ctx;
create function pg_temp.squad() returns uuid language sql as
  $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = 'Squad' $$;
grant execute on function pg_temp.squad() to authenticated;
insert into public.roles (workspace_id, name) values ((select ws from ctx), 'Squad planner');
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), r.id, k, 'units' from public.roles r, (values ('planning.view'), ('planning.edit')) v (k)
where r.workspace_id = (select ws from ctx) and r.name = 'Squad planner';
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.m(n), r.id
from (values ('fin', 'Finance'), ('mia', 'Manager'), ('bob', 'Member'), ('una', 'Member'), ('una', 'Squad planner')) v (n, role)
join public.roles r on r.workspace_id = (select ws from ctx) and r.name = v.role;
insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
select mr.id, mr.workspace_id, pg_temp.squad() from public.member_roles mr
join public.roles r on r.id = mr.role_id where r.name = 'Squad planner' and mr.workspace_id = (select ws from ctx);

-- Settings and permissions -------------------------------------------------------------------------------
select is((select period::text || '/' || over_allocation::text || '/' || lifecycle::text
  from public.planning_settings where workspace_id = (select ws from ctx)), 'month/warn/true',
  'a new workspace plans monthly, warns on over-allocation and has the lifecycle on');
select ok(exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
  where r.workspace_id = (select ws from ctx) and r.name = 'Finance' and rp.permission_key = 'planning.view_cost'),
  'Finance sees plan costs');
select ok(not exists (select 1 from public.role_permissions rp join public.roles r on r.id = rp.role_id
  where r.workspace_id = (select ws from ctx) and r.name = 'Manager' and rp.permission_key = 'planning.view_cost'),
  'managers see FTE but not cost');

-- Scenarios ------------------------------------------------------------------------------------------------
select pg_temp.as_user('bob');
select throws_ok($$ select public.create_scenario((select ws from ctx), 'Mine', (select first_month from ctx), (select last_month from ctx)) $$,
  '42501', null, 'members cannot create scenarios');
select pg_temp.as_user('fin');
select public.create_scenario((select ws from ctx), 'Plan 2027', (select first_month from ctx), (select last_month from ctx)) as plan \gset
select is((select count(*)::integer from public.allocations where scenario_id = :'plan' and member_id = pg_temp.m('bob')), 12,
  'from people: a year ahead for someone who was already here');
select is((select count(*)::integer from public.allocations where scenario_id = :'plan' and member_id = pg_temp.m('bob') and fte = 1 and org_unit_id = (select root from ctx)), 12,
  'at 1.0 FTE in their team');
select is((select count(*)::integer from public.allocations a where scenario_id = :'plan'
  and a.member_id = (select id from public.members where workspace_id = (select ws from ctx) and is_owner)), 10,
  'someone who joined this month from this month on');
select throws_ok($$ select public.create_scenario((select ws from ctx), 'plan 2027', (select first_month from ctx), (select last_month from ctx)) $$,
  '23505', null, 'names are unique, ignoring case');
select throws_ok($$ select public.create_scenario((select ws from ctx), 'Too long', (select first_month from ctx), ((select first_month from ctx) + interval '7 years')::date) $$,
  '23514', null, 'up to six years');

-- Allocations ----------------------------------------------------------------------------------------------
select is(
  public.save_allocations(:'plan', jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('bob'), 'org_unit_id', pg_temp.squad(), 'period', (select this_month from ctx), 'fte', 0.5))
  ) -> 'over' -> 0 ->> 'fte', '1.500', 'adding half time elsewhere warns that Bob is at 1.5');
select tests.clear_authentication();
select is((select count(*)::integer from public.audit_log where table_name = 'allocations' and row_id = :'plan'), 1,
  'one audit entry for the save');
select pg_temp.as_user('fin');
select lives_ok(format($$ select public.save_allocations(%L, jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('bob'), 'org_unit_id', pg_temp.squad(), 'period', (select this_month from ctx), 'fte', 0))) $$, :'plan'),
  'zero removes it');
select is((select count(*)::integer from public.allocations where scenario_id = :'plan' and org_unit_id = pg_temp.squad()), 0, 'and it is gone');
select throws_ok(format($$ select public.save_allocations(%L, jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('bob'), 'org_unit_id', (select root from ctx), 'period', (select first_month from ctx), 'fte', 0.5))) $$, :'plan'),
  '23514', null, 'months before this one are locked');
select throws_ok(format($$ select public.save_allocations(%L, jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('bob'), 'org_unit_id', (select root from ctx), 'period', (select this_month from ctx) + 3, 'fte', 0.5))) $$, :'plan'),
  '23514', null, 'a period is the first of a month');
select tests.clear_authentication();
update public.planning_settings set over_allocation = 'block' where workspace_id = (select ws from ctx);
select pg_temp.as_user('fin');
select throws_ok(format($$ select public.save_allocations(%L, jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('bob'), 'org_unit_id', pg_temp.squad(), 'period', (select this_month from ctx), 'fte', 0.5))) $$, :'plan'),
  '23514', null, 'blocking refuses going over 1 FTE');

select tests.clear_authentication();
update public.planning_settings set over_allocation = 'warn' where workspace_id = (select ws from ctx);

-- Reach: Una plans the squad only.
select pg_temp.as_user('una');
select throws_ok(format($$ select public.save_allocations(%L, jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('mia'), 'org_unit_id', pg_temp.squad(), 'period', (select last_month from ctx), 'fte', 0.2),
    jsonb_build_object('member_id', pg_temp.m('mia'), 'org_unit_id', (select root from ctx), 'period', (select last_month from ctx), 'fte', 0.8))) $$, :'plan'),
  '42501', null, 'a unit planner cannot change time in a team outside their reach');
select lives_ok(format($$ select public.save_allocations(%L, jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('mia'), 'org_unit_id', pg_temp.squad(), 'period', (select last_month from ctx), 'fte', 0.2))) $$, :'plan'),
  'but can plan someone''s time in their squad');
select is((select count(*)::integer from public.allocations where scenario_id = :'plan'), 1, 'and sees only the squad''s time');
select pg_temp.as_user('mia');
select ok((select count(*) from public.allocations where scenario_id = :'plan') > 50, 'a manager sees time in their team and below');
select pg_temp.as_user('bob');
select is((select count(*)::integer from public.scenarios), 0, 'members without planning see no scenarios');
select pg_temp.as_user('fin');
select throws_ok(format($$ insert into public.allocations (workspace_id, scenario_id, member_id, org_unit_id, period_start, fte)
  values ((select ws from ctx), %L, pg_temp.m('bob'), (select root from ctx), (select last_month from ctx), 1) $$, :'plan'),
  '42501', null, 'allocations are written only through the functions');

-- Planned roles ----------------------------------------------------------------------------------------------
insert into public.planned_roles (workspace_id, scenario_id, title, org_unit_id, start_date)
values ((select ws from ctx), :'plan', 'Engineer', pg_temp.squad(), (select this_month from ctx) + interval '2 months');
create function pg_temp.engineer() returns uuid language sql as
  $$ select id from public.planned_roles where title = 'Engineer' and workspace_id = (select ws from ctx) order by created_at limit 1 $$;
grant execute on function pg_temp.engineer() to authenticated;
select is((select count(*)::integer from public.allocations where planned_role_id = pg_temp.engineer()), 8,
  'a planned role counts from its start to the end of the plan');
update public.planned_roles set fte = 0.5 where id = pg_temp.engineer();
select is((select sum(fte) from public.allocations where planned_role_id = pg_temp.engineer()), 4.000,
  'changing its FTE replans its months');
select pg_temp.as_user('una');
select throws_ok(format($$ insert into public.planned_roles (workspace_id, scenario_id, title, org_unit_id, start_date)
  values ((select ws from ctx), %L, 'Elsewhere', (select root from ctx), current_date) $$, :'plan'),
  '42501', null, 'planned roles are added only in teams within reach');
select is(public.fill_planned_role(pg_temp.engineer(), pg_temp.m('bob'), ((select this_month from ctx) + interval '4 months')::date) -> 0 ->> 'fte',
  '1.500', 'filling it warns that Bob is over 1 FTE');
select is((select count(*)::integer from public.allocations where planned_role_id = pg_temp.engineer()), 2,
  'the role keeps the months before it was filled');
select is((select count(*)::integer from public.allocations where member_id = pg_temp.m('bob') and org_unit_id = pg_temp.squad()), 6,
  'and its time from then on is Bob''s');
select is((select filled_on from public.planned_roles where id = pg_temp.engineer()), ((select this_month from ctx) + interval '4 months')::date,
  'the role records when it was filled');
select throws_ok($$ select public.fill_planned_role(pg_temp.engineer(), pg_temp.m('mia'), current_date) $$,
  '23514', null, 'a filled role cannot be filled again');

-- Copying -------------------------------------------------------------------------------------------------------
select pg_temp.as_user('fin');
select public.copy_scenario(:'plan', 'Plan B') as plan_b \gset
select is((select count(*) from public.allocations where scenario_id = :'plan_b'),
  (select count(*) from public.allocations where scenario_id = :'plan'), 'a copy has the same allocations');
select is((select baseline_id from public.scenarios where id = :'plan_b'), :'plan'::uuid, 'and records where it came from');
select is((select count(*)::integer from public.allocations a join public.planned_roles r on r.id = a.planned_role_id
  where r.scenario_id = :'plan_b'), 2, 'its planned roles are copies with their own time');

-- Lifecycle and the live plan ---------------------------------------------------------------------------------
select public.set_scenario_status(:'plan', 'submitted');
select is((select status::text from public.scenarios where id = :'plan'), 'submitted', 'an editor submits the plan');
select tests.clear_authentication();
select is((select count(*)::integer from public.notifications n join people p on p.user_id = n.user_id
  where p.name = 'alice' and n.kind = 'scenario.submitted'), 1, 'and the owner is told');
select pg_temp.as_user('fin');
select throws_ok(format($$ select public.save_allocations(%L, jsonb_build_array(
    jsonb_build_object('member_id', pg_temp.m('bob'), 'org_unit_id', (select root from ctx), 'period', (select last_month from ctx), 'fte', 0.5))) $$, :'plan'),
  '23514', null, 'a submitted plan is locked');
select pg_temp.as_user('mia');
select throws_ok(format($$ select public.set_scenario_status(%L, 'approved') $$, :'plan'), '42501', null, 'managers do not approve plans');
select pg_temp.as_user('alice');
select lives_ok(format($$ select public.set_scenario_status(%L, 'approved') $$, :'plan'), 'an approver approves it');
select tests.clear_authentication();
select is((select count(*)::integer from public.notifications n join people p on p.user_id = n.user_id
  where p.name = 'fin' and n.kind = 'scenario.approved'), 1, 'and the submitter is told');
select pg_temp.as_user('alice');
select throws_ok(format($$ select public.set_live_scenario(%L) $$, :'plan_b'), '23514', null, 'a draft cannot be the live plan');
select lives_ok(format($$ select public.set_live_scenario(%L) $$, :'plan'), 'the approved plan goes live');
select throws_ok(format($$ select public.set_scenario_status(%L, 'draft') $$, :'plan'), '23514', null,
  'the live plan cannot go back to draft');
select pg_temp.as_user('fin');
delete from public.scenarios where id = :'plan';
select is((select count(*)::integer from public.scenarios where id = :'plan'), 1, 'nor be deleted');

select * from finish();
rollback;
