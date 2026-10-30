-- Load checks against the 100k workspace from seed.sql: each check runs as a real user through
-- the app's own functions and policies, once to warm up and then five times (the median counts).
-- Targets come from docs/product-decisions.md (sort or filter 100k people on the server < 300ms).
-- The import checks run in a transaction that is rolled back.

\set ON_ERROR_STOP on
set client_min_messages = warning;

drop schema if exists load_checks cascade;
create schema load_checks;
grant usage on schema load_checks to authenticated;
create table load_checks.results (label text, ms numeric, target_ms numeric, ord serial);
grant insert, select on load_checks.results to authenticated;
grant usage on sequence load_checks.results_ord_seq to authenticated;

create function load_checks.time(p_label text, p_sql text, p_target_ms numeric default 300, p_runs integer default 5)
returns void
language plpgsql
as $$
declare
  v_start timestamptz;
  v_times numeric[] := '{}';
begin
  execute p_sql;
  for i in 1..p_runs loop
    v_start := clock_timestamp();
    execute p_sql;
    v_times := v_times || round((extract(epoch from clock_timestamp() - v_start) * 1000)::numeric, 1);
  end loop;
  insert into load_checks.results (label, ms, target_ms)
  values (p_label, (select percentile_cont(0.5) within group (order by t) from unnest(v_times) t), p_target_ms);
end;
$$;
grant execute on function load_checks.time(text, text, numeric, integer) to authenticated;

select w.id as ws from public.workspaces w where w.slug = 'load-100k' \gset
select u.id as owner_id from auth.users u where u.email = 'owner@load.test' \gset
select u.id as reports_id from auth.users u where u.email = 'reports@load.test' \gset
select u.id as below_id from auth.users u where u.email = 'below@load.test' \gset
select u.id as units_id from auth.users u where u.email = 'units@load.test' \gset
select m.id as tribe_lead from public.members m where m.workspace_id = :'ws' and m.person_key = 'E-000031' \gset
select u.id as squad from public.org_units u where u.workspace_id = :'ws' and u.code = 'U00500' \gset
select u.id as division from public.org_units u where u.workspace_id = :'ws' and u.code = 'U00001' \gset

-- As the owner (whole workspace) ---------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', :'owner_id', 'role', 'authenticated')::text, false);
set role authenticated;
select load_checks.time('owner: directory, first page by name',
  format($q$select count(*) from public.people_directory(%L)$q$, :'ws'));
select load_checks.time('owner: directory, sorted by unit, descending',
  format($q$select count(*) from public.people_directory(%L, p_sort => 'unit', p_descending => true)$q$, :'ws'));
select load_checks.time('owner: directory, search by name',
  format($q$select count(*) from public.people_directory(%L, p_search => 'Person 0999')$q$, :'ws'));
select load_checks.time('owner: directory, division filter (~20k)',
  format($q$select count(*) from public.people_directory(%L, p_unit_id => %L)$q$, :'ws', :'division'));
select load_checks.time('owner: directory, page 1,000',
  format($q$select count(*) from public.people_directory(%L, p_offset => 49950)$q$, :'ws'));
select load_checks.time('owner: export page of 5,000',
  format($q$select count(*) from public.people_directory(%L, p_limit => 5000, p_for_export => true)$q$, :'ws'), 2000);
select load_checks.time('owner: org chart from the top, 2 levels',
  format($q$select count(*) from public.org_chart(%L, p_depth => 2)$q$, :'ws'));
select load_checks.time('owner: org chart from a tribe lead',
  format($q$select count(*) from public.org_chart(%L, %L)$q$, :'ws', :'tribe_lead'));
select load_checks.time('owner: org chart a year ago',
  format($q$select count(*) from public.org_chart(%L, %L, current_date - 365)$q$, :'ws', :'tribe_lead'));
select load_checks.time('owner: a squad''s people',
  format($q$select count(*) from public.org_chart(%L, p_unit_id => %L)$q$, :'ws', :'squad'));
select load_checks.time('owner: unit headcount',
  format($q$select count(*) from public.unit_headcount(%L)$q$, :'ws'));
select load_checks.time('owner: members table, 50 by name (RLS)',
  format($q$select count(*) from (select id from public.members where workspace_id = %L order by full_name limit 50) x$q$, :'ws'));
reset role;

-- Narrower reaches ------------------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', :'reports_id', 'role', 'authenticated')::text, false);
set role authenticated;
select load_checks.time('reports (~20k): directory, first page',
  format($q$select count(*) from public.people_directory(%L)$q$, :'ws'));
select load_checks.time('reports (~20k): directory, search',
  format($q$select count(*) from public.people_directory(%L, p_search => 'Person 01')$q$, :'ws'));
select load_checks.time('reports (~20k): members table, 50 by name (RLS)',
  format($q$select count(*) from (select id from public.members where workspace_id = %L order by full_name limit 50) x$q$, :'ws'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'below_id', 'role', 'authenticated')::text, false);
set role authenticated;
select load_checks.time('team and below (~800): directory, first page',
  format($q$select count(*) from public.people_directory(%L)$q$, :'ws'));
select load_checks.time('team and below (~800): org chart from self',
  format($q$select count(*) from public.org_chart(%L, %L)$q$, :'ws', :'tribe_lead'));
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'units_id', 'role', 'authenticated')::text, false);
set role authenticated;
select load_checks.time('granted unit (~4k): directory, first page',
  format($q$select count(*) from public.people_directory(%L)$q$, :'ws'));
reset role;

-- Re-import of all 100k (rolled back) -------------------------------------------------------------------
begin;
select set_config('request.jwt.claims', json_build_object('sub', :'owner_id', 'role', 'authenticated')::text, true);
set local role authenticated;
insert into public.import_jobs (workspace_id, created_by, key_field, effective_date)
values (:'ws', :'owner_id', 'person_key', current_date) returning id as job \gset

select clock_timestamp() as t0 \gset
-- A tenth have a new name; everyone else is unchanged.
-- In batches of 1,000, as the browser sends them.
select sum(public.import_stage_rows(:'job', b * 1000 + 1, (
  select jsonb_agg(jsonb_build_object('person_key', 'E-' || lpad(n::text, 6, '0'),
    'full_name', case when n % 10 = 0 then 'Renamed ' else 'Person ' end || lpad(n::text, 6, '0')) order by n)
  from generate_series(b * 1000 + 1, b * 1000 + 1000) n)))
from generate_series(0, 99) b;
insert into load_checks.results (label, ms, target_ms)
select 'import: stage 100k rows', round((extract(epoch from clock_timestamp() - :'t0'::timestamptz) * 1000)::numeric), 30000;

select clock_timestamp() as t0 \gset
select public.import_preview(:'job') \gset preview_
insert into load_checks.results (label, ms, target_ms)
select 'import: preview 100k rows', round((extract(epoch from clock_timestamp() - :'t0'::timestamptz) * 1000)::numeric), 30000;

select clock_timestamp() as t0 \gset
select public.import_apply_chunk(:'job', 1000);
insert into load_checks.results (label, ms, target_ms)
select 'import: apply one chunk (1,000 rows)', round((extract(epoch from clock_timestamp() - :'t0'::timestamptz) * 1000)::numeric), 10000;
reset role;
-- Shown before the rollback takes them away.
select label, ms, target_ms, case when ms <= target_ms then 'ok' else 'SLOW' end as result
from load_checks.results where label like 'import:%' order by ord;
select :'preview_import_preview' as preview_counts;
rollback;

-- Report ---------------------------------------------------------------------------------------------------
select label, ms, target_ms, case when ms <= target_ms then 'ok' else 'SLOW' end as result
from load_checks.results order by ord;
