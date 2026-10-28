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
