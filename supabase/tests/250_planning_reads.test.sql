-- Planning reads: the allocation grid (rows per person or role and team, months, totals across
-- teams, unit filter, search, paging, reach) and the live plan's open roles.
begin;
\ir _helpers.psql

select plan(12);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('una', tests.create_user('una@acme.test', 'Una'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root,
  date_trunc('month', current_date)::date as this_month,
  (date_trunc('month', current_date) + interval '2 months')::date as last_month
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.members (workspace_id, user_id, full_name, email, start_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', current_date - 400 from people where name <> 'alice';
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = initcap(p_name) $$;
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
grant execute on function pg_temp.m(text), pg_temp.as_user(text) to authenticated;
update public.member_assignments set valid_from = current_date - 400
where member_id in (pg_temp.m('bob'), pg_temp.m('una'));

insert into public.org_unit_levels (workspace_id, name, sort_order) select ws, 'Team', 10 from ctx;
insert into public.org_units (workspace_id, parent_id, level_id, name)
select ws, root, (select id from public.org_unit_levels where workspace_id = ws), 'Squad' from ctx;
create function pg_temp.squad() returns uuid language sql as
  $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = 'Squad' $$;
grant execute on function pg_temp.squad() to authenticated;
insert into public.roles (workspace_id, name) values ((select ws from ctx), 'Squad planner');
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), r.id, 'planning.view', 'units' from public.roles r
where r.workspace_id = (select ws from ctx) and r.name = 'Squad planner';
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.m(n), r.id from (values ('una', 'Member'), ('una', 'Squad planner'), ('bob', 'Member')) v (n, role)
join public.roles r on r.workspace_id = (select ws from ctx) and r.name = v.role;
insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
select mr.id, mr.workspace_id, pg_temp.squad() from public.member_roles mr
join public.roles r on r.id = mr.role_id where r.name = 'Squad planner' and mr.workspace_id = (select ws from ctx);

-- Alice plans: everyone at full time, Bob also half time in the squad, and an open role there.
select pg_temp.as_user('alice');
select public.create_scenario((select ws from ctx), 'Plan', (select this_month from ctx), (select last_month from ctx)) as plan \gset
select public.save_allocations(:'plan', jsonb_build_array(
  jsonb_build_object('member_id', pg_temp.m('bob'), 'org_unit_id', pg_temp.squad(), 'period', (select this_month from ctx), 'fte', 0.5)));
insert into public.planned_roles (workspace_id, scenario_id, title, org_unit_id, start_date)
values ((select ws from ctx), :'plan', 'Engineer', pg_temp.squad(), current_date);

create temporary table grid on commit drop as
select * from public.allocation_grid(:'plan', (select this_month from ctx), (select last_month from ctx));
grant select on grid to authenticated;
select is((select count(*)::integer from grid), 5, 'a row per person or role and team');
select is((select total_count from grid limit 1), 5::bigint, 'with the total for paging');
select is((select string_agg(name, ', ' order by unit_name, planned_role_id is not null, name) from grid where unit_name = 'Squad'),
  'Bob, Engineer', 'people first, then planned roles, within each team');
select is((select (months ->> (select this_month from ctx)::text)::numeric from grid where name = 'Bob' and unit_name = 'Squad'),
  0.5, 'months hold the FTE in that team');
select is((select (totals ->> (select this_month from ctx)::text)::numeric from grid where name = 'Bob' and unit_name = 'Squad'),
  1.5, 'totals add up the person''s teams');
select is((select count(*)::integer from public.allocation_grid(:'plan', (select this_month from ctx), (select last_month from ctx), pg_temp.squad())),
  2, 'a unit shows only time planned in it');
select is((select string_agg(name, ', ') from public.allocation_grid(:'plan', (select this_month from ctx), (select last_month from ctx), null, 'eng')),
  'Engineer', 'search by name');
select is((select count(*)::integer from public.allocation_grid(:'plan', (select this_month from ctx), (select last_month from ctx), null, '', 2, 4)),
  1, 'pages by limit and offset');

-- Reach: Una sees the squad.
select pg_temp.as_user('una');
select is((select string_agg(name, ', ' order by name) from public.allocation_grid(:'plan', (select this_month from ctx), (select last_month from ctx))),
  'Bob, Engineer', 'a unit planner sees the time planned in their units');
select pg_temp.as_user('bob');
select throws_ok(format($$ select * from public.allocation_grid(%L, current_date, current_date) $$, :'plan'), '42501', null,
  'members without planning see no grid');

-- Open roles come from the live plan.
select pg_temp.as_user('alice');
select is((select count(*)::integer from public.open_roles((select ws from ctx))), 0, 'no live plan, no open roles');
select public.set_scenario_status(:'plan', 'submitted');
select public.set_scenario_status(:'plan', 'approved');
select public.set_live_scenario(:'plan');
select is((select title from public.open_roles((select ws from ctx))), 'Engineer', 'the live plan''s open roles show');

select * from finish();
rollback;
