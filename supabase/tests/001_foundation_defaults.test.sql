-- New tables in public get RLS automatically and are not exposed to the Data API roles.
begin;

create extension if not exists pgtap with schema extensions;

select plan(4);

create table public.foundation_probe (id int);

select ok(
  (select relrowsecurity from pg_catalog.pg_class where oid = 'public.foundation_probe'::regclass),
  'a new public table has RLS enabled automatically'
);

select ok(
  not has_table_privilege('anon', 'public.foundation_probe', 'select'),
  'anon has no access to a new table by default'
);

select ok(
  not has_table_privilege('authenticated', 'public.foundation_probe', 'select,insert,update,delete'),
  'authenticated has no access to a new table by default'
);

create function public.foundation_probe_fn() returns int language sql as 'select 1';

select ok(
  not has_function_privilege('authenticated', 'public.foundation_probe_fn()', 'execute'),
  'authenticated cannot execute a new function by default'
);

select * from finish();

rollback;
