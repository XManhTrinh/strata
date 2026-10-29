-- Import and re-import: preview counts, applying in chunks, history kept, leavers, permissions.
begin;
\ir _helpers.psql

select plan(17);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');

create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;
insert into public.org_unit_levels (workspace_id, name, sort_order)
select ws, n, o from ctx, (values ('Division', 10), ('Squad', 40)) as l (n, o);
insert into public.custom_fields (workspace_id, key, label, type) select ws, 'skills', 'Skills', 'text' from ctx;

create function pg_temp.levels() returns uuid[] language sql as $$
  select array[(select id from public.org_unit_levels where name = 'Division'), (select id from public.org_unit_levels where name = 'Squad')]
$$;
create function pg_temp.member(p_key text) returns uuid language sql as $$ select id from public.members where person_key = p_key $$;
create function pg_temp.run(p_job uuid) returns text language plpgsql as $$
declare r jsonb; begin
  for i in 1 .. 20 loop
    r := public.import_apply_chunk(p_job, 2);
    exit when (r ->> 'done')::boolean;
  end loop;
  return r ->> 'phase';
end; $$;
grant execute on all functions in schema pg_temp to authenticated;

-- First import -----------------------------------------------------------------------------------------

create temporary table jobs (n int primary key, id uuid) on commit drop;
grant select, insert on jobs to authenticated;

insert into public.import_jobs (workspace_id, created_by, key_field, unit_level_ids)
select ws, auth.uid(), 'person_key', pg_temp.levels() from ctx;
insert into jobs select 1, id from public.import_jobs order by created_at desc limit 1;

insert into public.import_rows (job_id, workspace_id, row_number, data)
select (select id from jobs where n = 1), (select ws from ctx), r.n, r.d::jsonb
from (values
  (1, '{"person_key":"E1","full_name":"Mia","email":"mia@acme.test","unit_path":["Engineering","Squad A"],"position":"Lead","employment_type":"Employee","annual_salary":60000}'),
  (2, '{"person_key":"E2","full_name":"Sam","unit_path":["Engineering","Squad A"],"manager_key":"E1","employment_type":"Contractor","day_rate":500}'),
  (3, '{"person_key":"E3","full_name":"Tom","unit_path":["Engineering","Squad B"],"manager_key":"E2","custom":{"skills":"Go"}}'),
  (4, '{"full_name":"No key"}')
) as r (n, d);

select is(
  public.import_preview((select id from jobs where n = 1)),
  '{"new": 3, "changed": 0, "unchanged": 0, "errors": 1, "leaving": 0}'::jsonb,
  'the preview counts new rows and errors'
);
select is(
  (select errors from public.import_rows where job_id = (select id from jobs where n = 1) and row_number = 4),
  array['missingKey'], 'rows without the key are errors'
);

select is(pg_temp.run((select id from jobs where n = 1)), 'done', 'applying in chunks finishes');

select is((select count(*)::int from public.members where person_key in ('E1', 'E2', 'E3')), 3, 'new people are added');

-- Inspect as the database owner (the helpers below aren't granted to users).
select tests.clear_authentication();
select is(
  app.unit_path_names((app.assignment_on(pg_temp.member('E3'), current_date)).org_unit_id),
  array['Engineering', 'Squad B'], 'teams are created from the path, under the right parents'
);
select is(
  (select array_agg(m.person_key || '>' || r.person_key || ':' || c.depth order by m.person_key, r.person_key)
   from public.reporting_closure c join public.members m on m.id = c.manager_member_id join public.members r on r.id = c.member_id),
  array['E1>E2:1', 'E1>E3:2', 'E2>E3:1'], 'managers are matched by key and reporting lines rebuilt'
);
select is(
  (select annual_salary from public.member_compensation where member_id = pg_temp.member('E1')), 60000.00,
  'pay is imported'
);
select is(
  (select value #>> '{}' from public.member_field_values where member_id = pg_temp.member('E3')), 'Go',
  'custom fields are imported'
);
select is_empty(
  format($$ select 1 from public.import_rows where job_id = %L $$, (select id from jobs where n = 1)),
  'imported rows are deleted once applied'
);
select is((select kind from public.notifications where kind like 'import.%'), 'import.finished',
  'the importer is notified');

-- Re-import a week later ---------------------------------------------------------------------------------

select tests.authenticate_as((select user_id from people where name = 'alice'));

insert into public.import_jobs (workspace_id, created_by, key_field, unit_level_ids, effective_date)
select ws, auth.uid(), 'person_key', pg_temp.levels(), current_date + 7 from ctx;
insert into jobs select 2, id from public.import_jobs where status = 'staging';

insert into public.import_rows (job_id, workspace_id, row_number, data)
select (select id from jobs where n = 2), (select ws from ctx), r.n, r.d::jsonb
from (values
  (1, '{"person_key":"E1","full_name":"Mia","unit_path":["Engineering","Squad A"],"position":"Lead"}'),
  (2, '{"person_key":"E2","full_name":"Sam","unit_path":["Engineering","Squad B"],"manager_key":"E1"}'),
  (3, '{"person_key":"E5","full_name":"Ana","unit_path":["Engineering","Squad B"]}')
) as r (n, d);

select is(
  public.import_preview((select id from jobs where n = 2)),
  '{"new": 1, "changed": 1, "unchanged": 1, "errors": 0, "leaving": 1}'::jsonb,
  'a re-import previews new, changed, unchanged and leaving people'
);
select is(pg_temp.run((select id from jobs where n = 2)), 'done', 'the re-import applies');
select tests.clear_authentication();

select is(
  (select array_agg(app.unit_path_names(org_unit_id)::text || ' ' || valid_from::text || '..' || coalesce(valid_to::text, '') order by valid_from)
   from public.member_assignments where member_id = pg_temp.member('E2')),
  array[
    '{Engineering,"Squad A"} ' || current_date::text || '..' || (current_date + 7)::text,
    '{Engineering,"Squad B"} ' || (current_date + 7)::text || '..'
  ],
  'a move keeps the old job record and starts a new one on the effective date'
);
select is(
  (select end_date::text || ' ' || status from public.members where person_key = 'E3'),
  (current_date + 6)::text || ' active',
  'people missing from the file leave the day before the effective date'
);
select is((select count(*)::int from public.members where person_key = 'E5'), 1, 'new people in a re-import are added');

-- Permissions --------------------------------------------------------------------------------------------

select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
select ws, (select user_id from people where name = 'bob'), 'Bob', 'bob@acme.test' from ctx;
insert into public.member_roles (workspace_id, member_id, role_id)
select (select ws from ctx), m.id, r.id from public.members m, public.roles r
where m.email = 'bob@acme.test' and r.workspace_id = (select ws from ctx) and r.name = 'Member';
insert into public.import_jobs (workspace_id, created_by, key_field) select ws, (select user_id from people where name = 'alice'), 'email' from ctx;

select tests.authenticate_as((select user_id from people where name = 'bob'));
select throws_ok(
  format($$ select public.import_preview(%L) $$, (select id from public.import_jobs where key_field = 'email')),
  'P0002', null, 'people without people.import cannot run imports'
);
select is_empty($$ select 1 from public.import_jobs $$, 'people without people.import cannot see imports');

select * from finish();
rollback;
