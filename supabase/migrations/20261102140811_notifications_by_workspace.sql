-- The bell shows one workspace at a time: "mark all as read" marks that workspace's notifications
-- and the personal ones (no workspace, or one the person isn't a member of, such as a declined
-- request to join). Without a workspace it marks everything, as before.
drop function public.mark_all_notifications_read();

create function public.mark_all_notifications_read(p_workspace_id uuid default null)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications n set read_at = now()
  where n.user_id = (select auth.uid()) and n.read_at is null
    and (p_workspace_id is null or n.workspace_id is null or n.workspace_id = p_workspace_id
      or not app.is_member(n.workspace_id));
$$;

grant execute on function public.mark_all_notifications_read(uuid) to authenticated;
