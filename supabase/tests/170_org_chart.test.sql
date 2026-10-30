-- The org chart: the tree on a date, managers above, reach, hidden managers and headcounts.
begin;
\ir _helpers.psql

select plan(9);

create temporary table people (name text primary key, user_id uuid, member_id uuid) on commit drop;
grant select on people to authenticated;
insert into people (name, user_id) values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('mia', tests.create_user('mia@acme.test', 'Mia')),
  ('sam', null), ('tom', null), ('una', null);

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.org_unit_levels (workspace_id, name, sort_order) select ws, 'Team', 10 from ctx;
insert into public.org_units (workspace_id, parent_id, level_id, name)
select ws, root, (select id from public.org_unit_levels where workspace_id = ws), n from ctx, (values ('Squad A'), ('Squad B')) as v (n);
create function pg_temp.unit(p_name text) returns uuid language sql as
  $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = p_name $$;
create function pg_temp.member(p_name text) returns uuid language sql as $$ select member_id from people where name = p_name $$;
grant execute on function pg_temp.unit(text), pg_temp.member(text) to authenticated;

insert into public.members (workspace_id, user_id, full_name, email)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test' from people where name <> 'alice';
update people p set member_id = m.id from public.members m
where m.workspace_id = (select ws from ctx) and m.email = p.name || '@acme.test';
update people set member_id = (select id from public.members where workspace_id = (select ws from ctx) and is_owner) where name = 'alice';

-- Alice runs the company; Mia reports to her and leads Squad A (Sam, then Tom under Sam).
-- From next month Una joins Squad B under Mia.
delete from public.member_assignments where workspace_id = (select ws from ctx);
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id, manager_member_id)
select (select ws from ctx), pg_temp.member(n), f, coalesce(pg_temp.unit(u), (select root from ctx)), pg_temp.member(mgr)
from (values ('alice', null, null, current_date - 30), ('mia', 'Squad A', 'alice', current_date - 30),
             ('sam', 'Squad A', 'mia', current_date - 30), ('tom', 'Squad A', 'sam', current_date - 30),
             ('una', 'Squad B', 'mia', current_date + 30)) as v (n, u, mgr, f);

create function pg_temp.chart(p_root text, p_as_of date, p_depth int) returns text[] language sql as $$
  select array_agg(full_name || ':' || depth || ':' || direct_reports order by depth, full_name)
  from public.org_chart((select ws from ctx), pg_temp.member(p_root), p_as_of, p_depth)
$$;
grant execute on function pg_temp.chart(text, date, int) to authenticated;

select tests.authenticate_as((select user_id from people where name = 'alice'));

select is(pg_temp.chart(null, current_date, 1), array['Alice:0:1', 'Mia:1:1'],
  'without a start, the chart starts at the top, a level at a time');
select is(pg_temp.chart('sam', current_date, 2), array['Alice:-2:1', 'Mia:-1:1', 'Sam:0:1', 'Tom:1:0'],
  'a start shows its managers above and its reports below');
select is(pg_temp.chart('mia', current_date + 40, 1), array['Alice:-1:1', 'Mia:0:2', 'Sam:1:1', 'Una:1:0'],
  'a future date shows scheduled joiners');
select is(pg_temp.chart('mia', current_date - 40, 1), null, 'before anyone started there is nothing');
select ok(
  (select bool_and(not truncated) from public.org_chart((select ws from ctx))),
  'small charts are not truncated'
);
select is(
  (select array_agg(u.name || ':' || h.direct || '/' || h.total order by u.name)
   from public.unit_headcount((select ws from ctx)) h join public.org_units u on u.id = h.unit_id),
  array['Acme:1/4', 'Squad A:3/3', 'Squad B:0/0'], 'headcount per unit, with and without sub-units'
);
select is(
  (select array_agg(full_name order by full_name)
   from public.org_chart((select ws from ctx), p_unit_id => pg_temp.unit('Squad A'))),
  array['Mia', 'Sam', 'Tom'], 'a unit''s people'
);

-- Mia sees only her reports: Sam and Tom; Sam's line upward stops at someone hidden.
select tests.clear_authentication();
insert into public.roles (workspace_id, name) select ws, 'Sees reports' from ctx;
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), id, 'org_chart.view', 'reports' from public.roles where workspace_id = (select ws from ctx) and name = 'Sees reports';
delete from public.member_roles where member_id = pg_temp.member('mia');
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), pg_temp.member('mia'), id from public.roles where workspace_id = (select ws from ctx) and name = 'Sees reports';
select tests.authenticate_as((select user_id from people where name = 'mia'));

select is(pg_temp.chart('sam', current_date, 2), array['Sam:0:1', 'Tom:1:0'],
  'people outside reach are left out, managers above included');
select ok(
  (select manager_hidden and manager_member_id is null from public.org_chart((select ws from ctx), pg_temp.member('sam'))
   where full_name = 'Sam'),
  'a hidden manager is flagged, not revealed'
);

select * from finish();
rollback;
