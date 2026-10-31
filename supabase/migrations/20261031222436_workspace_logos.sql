-- Workspace logos in a private bucket, one folder per workspace (<workspace id>/...): members
-- see their workspace's logo through short-lived signed URLs; people who manage the workspace's
-- settings upload, replace and remove it. The app crops logos to a square and stores them as
-- 256px WebP; the bucket also takes PNG and JPEG, never SVG (which can carry scripts).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('workspace-logos', 'workspace-logos', false, 524288, array['image/webp', 'image/png', 'image/jpeg']);

-- The workspace a logo path ("<uuid>/<file>") belongs to, or null for anything else.
create function app.logo_workspace(p_name text)
returns uuid
language sql
immutable
set search_path = ''
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end;
$$;

grant execute on function app.logo_workspace(text) to authenticated;

create policy "Members see their workspace's logo" on storage.objects
  for select to authenticated
  using (bucket_id = 'workspace-logos' and app.is_member(app.logo_workspace(name)));

create policy "Settings managers upload the workspace's logo" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'workspace-logos'
    and app.has_permission(app.logo_workspace(name), 'workspace.manage_settings'));

create policy "Settings managers replace the workspace's logo" on storage.objects
  for update to authenticated
  using (bucket_id = 'workspace-logos'
    and app.has_permission(app.logo_workspace(name), 'workspace.manage_settings'))
  with check (bucket_id = 'workspace-logos'
    and app.has_permission(app.logo_workspace(name), 'workspace.manage_settings'));

create policy "Settings managers remove the workspace's logo" on storage.objects
  for delete to authenticated
  using (bucket_id = 'workspace-logos'
    and app.has_permission(app.logo_workspace(name), 'workspace.manage_settings'));

-- A workspace can only point at a logo in its own folder.
alter table public.workspaces
  add column logo_path text check (char_length(logo_path) <= 500),
  add constraint workspaces_logo_path_own_folder check (logo_path is null or app.logo_workspace(logo_path) = id);

grant update (logo_path) on public.workspaces to authenticated;
