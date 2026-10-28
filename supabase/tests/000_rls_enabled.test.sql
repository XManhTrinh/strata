-- Every table in the public schema must have row level security enabled.
-- This keeps passing as tables are added, and fails as soon as one is created without RLS.
begin;

create extension if not exists pgtap with schema extensions;

select plan(1);

select is_empty(
  $$
    select c.relname
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind in ('r', 'p')
      and not c.relrowsecurity
  $$,
  'every table in public has RLS enabled'
);

select * from finish();

rollback;
