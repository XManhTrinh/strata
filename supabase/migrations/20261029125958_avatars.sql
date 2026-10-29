-- Profile photos in a private bucket. People upload only into their own folder (<user id>/...);
-- a photo is visible to its owner and to people they share an active workspace with, through
-- short-lived signed URLs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/png', 'image/jpeg', 'image/webp']);

-- Whether the caller shares an active workspace with the given user.
create function app.shares_workspace_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.members me
    join public.members them on them.workspace_id = me.workspace_id
    where me.user_id = (select auth.uid())
      and me.status = 'active'
      and them.user_id = p_user_id
  );
$$;

grant execute on function app.shares_workspace_with(uuid) to authenticated;

-- The user id that owns an avatar path ("<uuid>/<file>"), or null for anything else.
create function app.avatar_owner(p_name text)
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

grant execute on function app.avatar_owner(text) to authenticated;

create policy "Avatars are visible to their owner and co-members" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'avatars'
    and (
      app.avatar_owner(name) = (select auth.uid())
      or app.shares_workspace_with(app.avatar_owner(name))
    )
  );

create policy "Users upload avatars into their own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and app.avatar_owner(name) = (select auth.uid()));

create policy "Users replace their own avatars" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and app.avatar_owner(name) = (select auth.uid()))
  with check (bucket_id = 'avatars' and app.avatar_owner(name) = (select auth.uid()));

create policy "Users delete their own avatars" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and app.avatar_owner(name) = (select auth.uid()));

-- A profile can only point at a photo in its own folder.
alter table public.profiles
  add constraint profiles_avatar_path_own_folder
  check (avatar_path is null or app.avatar_owner(avatar_path) = id);
