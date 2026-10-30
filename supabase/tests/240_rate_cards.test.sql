-- Rate cards and cost: the operators, card order (priority, defaults, cards without conditions,
-- archived cards), dated rates, the salary fallback, applying to a scenario, the preview, totals by
-- unit and by custom field, and who sees cost.
begin;
\ir _helpers.psql

select plan(29);

-- The operators ------------------------------------------------------------------------------------------
select ok(app.condition_matches(' Contractor ', 'equals', 'contractor'), 'equals ignores case and spaces');
select ok(not app.condition_matches(null, 'equals', 'x'), 'a missing value is empty');
select ok(app.condition_matches('', 'not_equals', 'x'), 'and is not equal to a value');
select ok(app.condition_matches('SQ-12', 'starts_with_any', 'ab, sq ,'), 'starts with any of a list');
select ok(app.condition_matches('London Office', 'ends_with', 'office'), 'ends with');
select ok(app.condition_matches('Senior Engineer', 'contains', 'engin'), 'contains');
select ok(app.condition_matches('b2', 'in', 'B1, B2'), 'in a list');
select ok(not app.condition_matches('B', 'in', 'B1, B2'), 'but not part of an item');

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('fin', tests.create_user('fin@acme.test', 'Fin')),
  ('mia', tests.create_user('mia@acme.test', 'Mia')),
  ('bob', tests.create_user('bob@acme.test', 'Bob')),
  ('cara', tests.create_user('cara@acme.test', 'Cara'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root,
  date_trunc('month', current_date)::date as this_month
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.members (workspace_id, user_id, full_name, email, start_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', current_date - 400
from people where name <> 'alice';
create function pg_temp.m(p_name text) returns uuid language sql as
  $$ select id from public.members where workspace_id = (select ws from ctx) and full_name = initcap(p_name) $$;
create function pg_temp.as_user(p_name text) returns void language sql as
  $$ select tests.authenticate_as((select user_id from people where name = p_name)) $$;
create function pg_temp.et(p_name text) returns uuid language sql as
  $$ select id from public.employment_types where workspace_id = (select ws from ctx) and name = p_name $$;
grant execute on function pg_temp.m(text), pg_temp.as_user(text), pg_temp.et(text) to authenticated;

insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.m(n), r.id
from (values ('fin', 'Finance'), ('mia', 'Manager'), ('bob', 'Member'), ('cara', 'Member')) v (n, role)
join public.roles r on r.workspace_id = (select ws from ctx) and r.name = v.role;

-- Bob (employee, band B2) and Cara (contractor) are in squad SQ-1; Mia (employee) in the root.
insert into public.org_unit_levels (workspace_id, name, sort_order) select ws, 'Team', 10 from ctx;
insert into public.org_units (workspace_id, parent_id, level_id, name, code)
select ws, root, (select id from public.org_unit_levels where workspace_id = ws), 'Squad', 'SQ-1' from ctx;
create function pg_temp.squad() returns uuid language sql as
  $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = 'Squad' $$;
grant execute on function pg_temp.squad() to authenticated;
update public.member_assignments a set valid_from = current_date - 400,
  org_unit_id = case when a.member_id = pg_temp.m('mia') then (select root from ctx) else pg_temp.squad() end,
  employment_type_id = case when a.member_id = pg_temp.m('cara') then pg_temp.et('Contractor') else pg_temp.et('Employee') end
where a.member_id in (pg_temp.m('bob'), pg_temp.m('cara'), pg_temp.m('mia'));
insert into public.member_compensation (workspace_id, member_id, valid_from, annual_salary, currency)
select (select ws from ctx), pg_temp.m(n), current_date - 400, s, 'GBP' from (values ('bob', 60000), ('mia', 90000)) v (n, s);
insert into public.custom_fields (workspace_id, key, label, type) values ((select ws from ctx), 'band', 'Band', 'text');
insert into public.member_field_values (workspace_id, member_id, field_id, value)
select (select ws from ctx), pg_temp.m(n), (select id from public.custom_fields where workspace_id = (select ws from ctx)), to_jsonb(b)
from (values ('bob', 'B2'), ('cara', 'C1'), ('mia', 'M')) v (n, b);

-- Cards ------------------------------------------------------------------------------------------------------
select pg_temp.as_user('fin');
insert into public.rate_cards (workspace_id, name, priority, is_default, archived_at) values
  ((select ws from ctx), 'No conditions', 1, false, null),
  ((select ws from ctx), 'Old contractors', 5, false, now()),
  ((select ws from ctx), 'Contractors', 10, false, null),
  ((select ws from ctx), 'Squad bands', 20, false, null),
  ((select ws from ctx), 'Everyone else', 99, true, null);
create function pg_temp.card(p_name text) returns uuid language sql as
  $$ select id from public.rate_cards where workspace_id = (select ws from ctx) and name = p_name $$;
grant execute on function pg_temp.card(text) to authenticated;
insert into public.rate_card_conditions (workspace_id, card_id, field, operator, value) values
  ((select ws from ctx), pg_temp.card('Old contractors'), 'employment_type', 'equals', 'Contractor'),
  ((select ws from ctx), pg_temp.card('Contractors'), 'employment_type', 'equals', 'contractor '),
  ((select ws from ctx), pg_temp.card('Squad bands'), 'unit_code', 'starts_with', 'sq'),
  ((select ws from ctx), pg_temp.card('Squad bands'), 'custom:band', 'in', 'B1, B2');
insert into public.rate_card_rates (workspace_id, card_id, valid_from, day_rate, working_days, currency) values
  ((select ws from ctx), pg_temp.card('Old contractors'), (select this_month from ctx), 999, 20, 'GBP'),
  ((select ws from ctx), pg_temp.card('No conditions'), (select this_month from ctx), 1, 20, 'GBP'),
  ((select ws from ctx), pg_temp.card('Contractors'), (select this_month from ctx), 500, 20, 'GBP'),
  ((select ws from ctx), pg_temp.card('Contractors'), ((select this_month from ctx) + interval '3 months')::date, 600, 20, 'GBP'),
  ((select ws from ctx), pg_temp.card('Squad bands'), (select this_month from ctx), 300, 20, 'GBP');

select public.create_scenario((select ws from ctx), 'Plan', (select this_month from ctx), ((select this_month from ctx) + interval '5 months')::date) as plan \gset
insert into public.planned_roles (workspace_id, scenario_id, title, org_unit_id, employment_type_id, start_date)
values ((select ws from ctx), :'plan', 'Contractor seat', pg_temp.squad(), pg_temp.et('Contractor'), current_date);

-- Applying ---------------------------------------------------------------------------------------------------
select is(public.apply_rate_cards(:'plan') ->> 'snapshots', '36', 'apply costs five people and a role over six months');
create function pg_temp.cost(p_member uuid, p_month date) returns text language sql as $$
  select source::text || ' ' || monthly_cost::text || coalesce(' ' || (select name from public.rate_cards where id = rate_card_id), '')
  from public.cost_snapshots where scenario_id = (select id from public.scenarios where name = 'Plan') and member_id = p_member and period_start = p_month
$$;
grant execute on function pg_temp.cost(uuid, date) to authenticated;
select is(pg_temp.cost(pg_temp.m('cara'), (select this_month from ctx)), 'rate_card 10000.00 Contractors',
  'archived cards and cards without conditions are skipped; the first match by priority wins');
select is(pg_temp.cost(pg_temp.m('cara'), ((select this_month from ctx) + interval '3 months')::date), 'rate_card 12000.00 Contractors',
  'a newer rate applies from its month');
select is(pg_temp.cost(pg_temp.m('bob'), (select this_month from ctx)), 'rate_card 6000.00 Squad bands', 'all conditions must match, custom fields included');
select is(pg_temp.cost(pg_temp.m('mia'), (select this_month from ctx)), 'salary 7500.00 Everyone else',
  'a default card without a rate falls back to salary ÷ 12 for employees');
select is(pg_temp.cost((select id from public.members where workspace_id = (select ws from ctx) and is_owner), (select this_month from ctx)),
  'none 0.00 Everyone else', 'without a rate or salary the cost is none');
select is((select monthly_cost from public.cost_snapshots s join public.planned_roles r on r.id = s.planned_role_id
  where r.title = 'Contractor seat' and s.period_start = (select this_month from ctx)), 10000.00, 'planned roles are matched too');
select is((select costs_applied_at is not null from public.scenarios where id = :'plan'), true, 'the scenario records when costs were applied');

select is((select rate_card_name || ' ' || monthly_cost from public.rate_card_preview((select ws from ctx), pg_temp.m('bob'), null, current_date)),
  'Squad bands 6000.00', 'the preview shows which card someone gets');
select is((select monthly_cost from public.rate_card_preview((select ws from ctx), pg_temp.m('mia'), null, current_date)),
  7500.00, 'and salary-based cost to those who see pay');

-- Totals -------------------------------------------------------------------------------------------------------
select is((select fte || ' ' || headcount || ' ' || cost from public.capacity_totals(:'plan', (select this_month from ctx), (select this_month from ctx))
  where group_label = 'Squad'), '3.000 3 26000.00000', 'a team''s FTE, headcount and cost');
select is((select fte || ' ' || cost from public.capacity_totals(:'plan', (select this_month from ctx), (select this_month from ctx))
  where group_id = (select root from ctx)::text), '3.000 7500.00000', 'time in the unit itself is its own row');
select is((select cost from public.capacity_totals(:'plan', (select this_month from ctx), (select this_month from ctx), 'field', null,
  (select id from public.custom_fields where workspace_id = (select ws from ctx) and key = 'band')) where group_label = 'B2'),
  6000.00000, 'totals split by a custom field');

-- Who sees what -----------------------------------------------------------------------------------------------
select pg_temp.as_user('mia');
select is((select sum(fte) from public.capacity_totals(:'plan', (select this_month from ctx), (select this_month from ctx))), 6.000,
  'a manager sees FTE for their team and below');
select is((select count(*)::integer from public.capacity_totals(:'plan', (select this_month from ctx), (select this_month from ctx)) where cost is not null), 0,
  'but no cost');
select is((select count(*)::integer from public.cost_snapshots), 0, 'nor cost snapshots');
select throws_ok(format($$ select public.apply_rate_cards(%L) $$, :'plan'), '42501', null, 'nor applies rate cards');
select throws_ok($$ insert into public.rate_cards (workspace_id, name) values ((select ws from ctx), 'Mine') $$, '42501', null,
  'nor edits them');
select pg_temp.as_user('bob');
select is((select count(*)::integer from public.rate_cards), 0, 'members see no rate cards');
select throws_ok(format($$ select * from public.capacity_totals(%L, current_date, current_date) $$, :'plan'), '42501', null,
  'nor plan totals');
select pg_temp.as_user('fin');
select public.set_scenario_status(:'plan', 'submitted');
select throws_ok(format($$ select public.apply_rate_cards(%L) $$, :'plan'), '23514', null, 'a submitted plan''s costs are locked');

select * from finish();
rollback;
