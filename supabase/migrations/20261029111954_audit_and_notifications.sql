-- Audit log of sensitive changes, and per-user notifications (in-app, with email preferences).

-- Audit log ---------------------------------------------------------------------------------------

-- No foreign key to workspaces on purpose: the history outlives a deleted workspace until the
-- retention rules remove it.
create table public.audit_log (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  actor_user_id uuid,
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  row_id text not null,
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create index audit_log_workspace_at_idx on public.audit_log (workspace_id, at desc);
create index audit_log_workspace_table_at_idx on public.audit_log (workspace_id, table_name, at desc);
create index audit_log_actor_user_id_idx on public.audit_log (actor_user_id);

-- Records a row change. TG_ARGV[0] names the column holding the workspace id ('workspace_id', or
-- 'id' for the workspaces table). Changes that only touch updated_at are skipped.
create function app.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_before jsonb := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end;
  v_after jsonb := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end;
  v_row jsonb := coalesce(v_after, v_before);
begin
  if tg_op = 'UPDATE' and (v_before - 'updated_at') = (v_after - 'updated_at') then
    return null;
  end if;

  insert into public.audit_log (workspace_id, actor_user_id, action, table_name, row_id, before, after)
  values (
    (v_row ->> tg_argv[0])::uuid,
    (select auth.uid()),
    lower(tg_op),
    tg_table_name,
    coalesce(
      v_row ->> 'id',
      concat_ws('/', v_row ->> 'role_id', v_row ->> 'permission_key'),
      concat_ws('/', v_row ->> 'workspace_id', v_row ->> 'feature_key')
    ),
    v_before,
    v_after
  );
  return null;
end;
$$;

create function app.prevent_audit_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'The audit log cannot be changed.' using errcode = 'insufficient_privilege';
end;
$$;

create trigger prevent_audit_change
  before update or delete on public.audit_log
  for each row execute function app.prevent_audit_change();

create trigger audit after insert or update or delete on public.workspaces
  for each row execute function app.audit_row_change('id');
create trigger audit after insert or update or delete on public.workspace_features
  for each row execute function app.audit_row_change('workspace_id');
create trigger audit after insert or update or delete on public.members
  for each row execute function app.audit_row_change('workspace_id');
create trigger audit after insert or update or delete on public.roles
  for each row execute function app.audit_row_change('workspace_id');
create trigger audit after insert or update or delete on public.role_permissions
  for each row execute function app.audit_row_change('workspace_id');
create trigger audit after insert or update or delete on public.member_roles
  for each row execute function app.audit_row_change('workspace_id');

alter table public.audit_log enable row level security;
grant select on public.audit_log to authenticated;

create policy "Audit viewers can read their workspace's audit log" on public.audit_log
  for select to authenticated
  using (app.has_permission(workspace_id, 'workspace.view_audit'));

-- Notifications -----------------------------------------------------------------------------------

create type public.notification_category as enum ('invitation', 'access', 'time', 'planning', 'import', 'system');
create type public.email_delivery as enum ('instant', 'daily', 'none');

-- Notifications belong to a user; the workspace is optional (e.g. an invitation to a workspace
-- the user is not in yet).
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  workspace_id uuid references public.workspaces (id) on delete cascade,
  category public.notification_category not null,
  -- What happened, e.g. 'role.assigned'; the app turns kind + payload into text.
  kind text not null check (kind ~ '^[a-z_]+\.[a-z_]+$'),
  payload jsonb not null default '{}',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index notifications_user_unread_idx on public.notifications (user_id, created_at desc)
  where read_at is null;
create index notifications_workspace_id_idx on public.notifications (workspace_id);

-- How each user wants email per category. No row means instant email.
create table public.notification_preferences (
  user_id uuid not null references auth.users (id) on delete cascade,
  category public.notification_category not null,
  email_delivery public.email_delivery not null default 'instant',
  updated_at timestamptz not null default now(),
  primary key (user_id, category)
);

create trigger set_updated_at before update on public.notification_preferences
  for each row execute function app.set_updated_at();

alter table public.notifications enable row level security;
alter table public.notification_preferences enable row level security;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "Users can read their own notifications" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can mark their own notifications read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

grant select, insert, update on public.notification_preferences to authenticated;

create policy "Users can read their own notification preferences" on public.notification_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Users can add their own notification preferences" on public.notification_preferences
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Users can change their own notification preferences" on public.notification_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Live updates for the notification bell (RLS applies to Realtime too).
alter publication supabase_realtime add table public.notifications;

-- Creates a notification. Used by triggers and RPCs only.
create function app.notify(
  p_user_id uuid,
  p_workspace_id uuid,
  p_category public.notification_category,
  p_kind text,
  p_payload jsonb default '{}'
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, workspace_id, category, kind, payload)
  select p_user_id, p_workspace_id, p_category, p_kind, p_payload
  where p_user_id is not null;
$$;

create function public.mark_all_notifications_read()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.notifications set read_at = now()
  where user_id = (select auth.uid()) and read_at is null;
$$;

grant execute on function public.mark_all_notifications_read() to authenticated;

-- Role and ownership changes notify the person affected (not when they did it themselves).
create function app.notify_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row public.member_roles := coalesce(new, old);
  v_user_id uuid;
begin
  -- Nothing to tell when the whole workspace is being deleted.
  if not exists (select 1 from public.workspaces w where w.id = v_row.workspace_id) then
    return null;
  end if;

  select m.user_id into v_user_id from public.members m where m.id = v_row.member_id;

  if v_user_id is distinct from (select auth.uid()) then
    perform app.notify(
      v_user_id,
      v_row.workspace_id,
      'access',
      case tg_op when 'INSERT' then 'role.assigned' else 'role.removed' end,
      jsonb_build_object(
        'role_id', v_row.role_id,
        'role_name', (select r.name::text from public.roles r where r.id = v_row.role_id)
      )
    );
  end if;
  return null;
end;
$$;

create trigger notify_role_change
  after insert or delete on public.member_roles
  for each row execute function app.notify_role_change();

create function app.notify_ownership_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_owner and not old.is_owner and new.user_id is distinct from (select auth.uid()) then
    perform app.notify(new.user_id, new.workspace_id, 'access', 'ownership.received');
  end if;
  return null;
end;
$$;

create trigger notify_ownership_change
  after update of is_owner on public.members
  for each row execute function app.notify_ownership_change();
