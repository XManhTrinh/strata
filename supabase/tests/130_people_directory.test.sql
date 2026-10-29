-- The people directory: who each reach sees, search, filters, leavers, sorting and paging.
begin;
\ir _helpers.psql

select plan(12);

create temporary table people (name text primary key, user_id uuid, member_id uuid) on commit drop;
grant select on people to authenticated;
insert into people (name, user_id) values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('mia', tests.create_user('mia@acme.test', 'Mia')),
  ('sam', tests.create_user('sam@acme.test', 'Sam')),
  ('tom', tests.create_user('tom@acme.test', 'Tom')),
  ('una', tests.create_user('una@acme.test', 'Una')),
  ('leo', null),
  ('dave', tests.create_user('dave@other.test', 'Dave'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
select tests.authenticate_as((select user_id from people where name = 'dave'));
select public.create_workspace('Other', 'other', 'company', 'GB', 'Europe/London', 'GBP');
select tests.clear_authentication();

create temporary table ctx on commit drop as
select w.id as ws, (select id from public.org_units where workspace_id = w.id and parent_id is null) as root
from public.workspaces w where w.slug = 'acme';
grant select on ctx to authenticated;

insert into public.org_unit_levels (workspace_id, name, sort_order)
select ws, n, o from ctx, (values ('Division', 10), ('Squad', 40)) as l (n, o);
insert into public.org_units (workspace_id, parent_id, level_id, name)
select ws, root, (select id from public.org_unit_levels where workspace_id = ws and name = 'Division'), 'Engineering' from ctx;
insert into public.org_units (workspace_id, parent_id, level_id, name)
select ws, (select id from public.org_units where workspace_id = ws and name = 'Engineering'),
  (select id from public.org_unit_levels where workspace_id = ws and name = 'Squad'), s
from ctx, (values ('Squad A'), ('Squad B')) as v (s);

create function pg_temp.unit(p_name text) returns uuid language sql as
  $$ select id from public.org_units where workspace_id = (select ws from ctx) and name = p_name $$;
create function pg_temp.member(p_name text) returns uuid language sql as
  $$ select member_id from people where name = p_name $$;
grant execute on function pg_temp.unit(text), pg_temp.member(text) to authenticated;

insert into public.members (workspace_id, user_id, full_name, email, person_key, end_date)
select (select ws from ctx), user_id, initcap(name), name || '@acme.test', 'E-' || name,
  case when name = 'leo' then current_date - 10 end
from people where name not in ('alice', 'dave');
update people p set member_id = m.id from public.members m
where m.workspace_id = (select ws from ctx) and m.email = p.name || '@acme.test';

-- Mia leads Squad A (Sam reports to her, Tom to Sam); Una is in Squad B; Leo left.
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id, manager_member_id)
select (select ws from ctx), pg_temp.member(n), current_date - 30, pg_temp.unit(u), pg_temp.member(mgr)
from (values ('mia', 'Squad A', null), ('sam', 'Squad A', 'mia'), ('tom', 'Squad B', 'sam'),
             ('una', 'Squad B', null), ('leo', 'Squad B', null)) as v (n, u, mgr);

-- One role per reach, each holding only people.view.
insert into public.roles (workspace_id, name)
select ws, r from ctx, (values ('Own'), ('Reports'), ('Team'), ('Below'), ('Units')) as v (r);
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select (select ws from ctx), r.id, 'people.view',
  (case r.name when 'Own' then 'own' when 'Reports' then 'reports' when 'Team' then 'team'
               when 'Below' then 'team_and_below' else 'units' end)::public.reach
from public.roles r where r.workspace_id = (select ws from ctx) and r.name in ('Own', 'Reports', 'Team', 'Below', 'Units');

-- Each check runs as Mia with exactly one of those roles.
create function pg_temp.as_mia_with(p_role text) returns void language sql as $$
  delete from public.member_roles where member_id = pg_temp.member('mia');
  insert into public.member_roles (workspace_id, member_id, role_id)
  select (select ws from ctx), pg_temp.member('mia'), id from public.roles
  where workspace_id = (select ws from ctx) and name = p_role;
$$;
create function pg_temp.seen() returns text[] language sql as $$
  select coalesce(array_agg(full_name order by full_name), '{}')
  from public.people_directory((select ws from ctx), p_status => 'all');
$$;
grant execute on function pg_temp.seen() to authenticated;

select pg_temp.as_mia_with('Own');
select tests.authenticate_as((select user_id from people where name = 'mia'));
select is(pg_temp.seen(), array['Mia'], 'own reach sees only themselves');
select tests.clear_authentication();

select pg_temp.as_mia_with('Reports');
select tests.authenticate_as((select user_id from people where name = 'mia'));
select is(pg_temp.seen(), array['Sam', 'Tom'], 'reports reach sees direct and indirect reports');
select tests.clear_authentication();

select pg_temp.as_mia_with('Team');
select tests.authenticate_as((select user_id from people where name = 'mia'));
select is(pg_temp.seen(), array['Mia', 'Sam'], 'team reach sees their own unit');
select tests.clear_authentication();

update public.member_assignments set org_unit_id = pg_temp.unit('Engineering') where member_id = pg_temp.member('mia');
select pg_temp.as_mia_with('Below');
select tests.authenticate_as((select user_id from people where name = 'mia'));
select is(pg_temp.seen(), array['Leo', 'Mia', 'Sam', 'Tom', 'Una'], 'team-and-below reach sees the units under theirs');
select tests.clear_authentication();

select pg_temp.as_mia_with('Units');
insert into public.member_role_units (member_role_id, workspace_id, org_unit_id)
select mr.id, mr.workspace_id, pg_temp.unit('Squad B') from public.member_roles mr where mr.member_id = pg_temp.member('mia');
select tests.authenticate_as((select user_id from people where name = 'mia'));
select is(pg_temp.seen(), array['Leo', 'Tom', 'Una'], 'units reach sees the granted units');
select tests.clear_authentication();

-- The owner sees everyone; search, filters, status, sort and paging.
select tests.authenticate_as((select user_id from people where name = 'alice'));

select is(
  (select array_agg(full_name order by full_name) from public.people_directory((select ws from ctx))),
  array['Alice', 'Mia', 'Sam', 'Tom', 'Una'], 'current people by default, leavers left out'
);
select is(
  (select array_agg(full_name) from public.people_directory((select ws from ctx), p_status => 'leavers')),
  array['Leo'], 'leavers on their own'
);
select is(
  (select array_agg(full_name) from public.people_directory((select ws from ctx), p_search => 'e-to')),
  array['Tom'], 'search matches the person key'
);
select is(
  (select count(*)::int from public.people_directory((select ws from ctx), p_search => '%')),
  0, 'search text is literal'
);
select is(
  (select array_agg(full_name order by full_name) from public.people_directory((select ws from ctx), p_unit_id => pg_temp.unit('Squad B'))),
  array['Tom', 'Una'], 'a unit filter covers the unit'
);
select is(
  (select array_agg(full_name || ':' || total_count) from public.people_directory(
     (select ws from ctx), p_sort => 'name', p_descending => true, p_limit => 2, p_offset => 1)),
  array['Tom:5', 'Sam:5'], 'pages carry the total and follow the sort'
);

select tests.authenticate_as((select user_id from people where name = 'dave'));
select is(
  (select count(*)::int from public.people_directory((select ws from ctx))),
  0, 'people outside the workspace see nobody'
);

select * from finish();
rollback;
