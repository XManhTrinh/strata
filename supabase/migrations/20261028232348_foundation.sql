-- Foundation: extensions used across Strata and the shared helper schema.

-- Materialized paths for the org unit tree (fast subtree queries).
create extension if not exists ltree with schema extensions;

-- Scheduled jobs (accrual, digests, retention) and the job queue (imports, email).
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pgmq;

-- Internal helpers and permission functions. Not exposed through the Data API: only
-- `public` is in `api.schemas`, so nothing here is callable as an RPC.
create schema if not exists app;
revoke all on schema app from public;

comment on schema app is 'Strata internal helpers and permission functions; not exposed via the API.';

-- Keeps updated_at current. Attach with:
--   create trigger set_updated_at before update on <table>
--     for each row execute function app.set_updated_at();
create function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- New tables, sequences and functions in public are not exposed to the Data API roles by
-- default (matching the hosted setting "Automatically expose new tables" = off). Every
-- migration grants exactly the access it needs, next to its RLS policies.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated;
-- PostgreSQL grants EXECUTE to PUBLIC database-wide by default, and a per-schema setting can't
-- remove a database-wide grant, so revoke it database-wide for functions created by migrations.
alter default privileges for role postgres
  revoke execute on functions from public;

-- Safety net: every table created in public gets row level security, even if a migration
-- forgets. Migrations still enable RLS explicitly, and a pgTAP test checks every table.
create function app.enable_rls_on_new_tables()
returns event_trigger
language plpgsql
set search_path = ''
as $$
declare
  created record;
begin
  for created in
    select object_identity
    from pg_catalog.pg_event_trigger_ddl_commands()
    where object_type = 'table' and schema_name = 'public'
  loop
    execute format('alter table %s enable row level security', created.object_identity);
  end loop;
end;
$$;

create event trigger enable_rls_on_new_tables
  on ddl_command_end
  when tag in ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function app.enable_rls_on_new_tables();
