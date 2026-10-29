-- Saved table layouts (columns, order, widths, sort, filters) as DataTable state. Personal views
-- belong to one person; shared views (user_id null) are visible to the workspace.

create table public.table_views (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  -- Null for a view shared with the workspace.
  user_id uuid references auth.users (id) on delete cascade,
  table_key text not null check (table_key ~ '^[a-z][a-z0-9_]{0,59}$'),
  name text not null check (char_length(btrim(name)) between 1 and 80),
  state jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index table_views_name_idx
  on public.table_views (workspace_id, table_key, coalesce(user_id, '00000000-0000-0000-0000-000000000000'), lower(name));
-- One default per table: one shared, and one per person.
create unique index table_views_one_default_idx
  on public.table_views (workspace_id, table_key, coalesce(user_id, '00000000-0000-0000-0000-000000000000'))
  where is_default;
create index table_views_user_id_idx on public.table_views (user_id);

create trigger set_updated_at before update on public.table_views
  for each row execute function app.set_updated_at();

alter table public.table_views enable row level security;
grant select, insert, update, delete on public.table_views to authenticated;

create policy "Members see shared views and their own" on public.table_views
  for select to authenticated
  using (app.is_member(workspace_id) and (user_id is null or user_id = (select auth.uid())));

create policy "Members save their own views; settings managers save shared ones" on public.table_views
  for insert to authenticated
  with check (
    app.is_member(workspace_id)
    and (user_id = (select auth.uid())
         or (user_id is null and app.has_permission(workspace_id, 'workspace.manage_settings')))
  );

create policy "Members change their own views; settings managers change shared ones" on public.table_views
  for update to authenticated
  using (
    app.is_member(workspace_id)
    and (user_id = (select auth.uid())
         or (user_id is null and app.has_permission(workspace_id, 'workspace.manage_settings')))
  )
  with check (
    app.is_member(workspace_id)
    and (user_id = (select auth.uid())
         or (user_id is null and app.has_permission(workspace_id, 'workspace.manage_settings')))
  );

create policy "Members delete their own views; settings managers delete shared ones" on public.table_views
  for delete to authenticated
  using (
    app.is_member(workspace_id)
    and (user_id = (select auth.uid())
         or (user_id is null and app.has_permission(workspace_id, 'workspace.manage_settings')))
  );
