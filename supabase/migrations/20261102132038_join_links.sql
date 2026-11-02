-- Joining by link with approval: an admin shares the workspace's join link; anyone signed in who
-- opens it asks to join; people who may invite approve (with a role they could give) or decline.

create table public.workspace_join_links (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  -- Only the hash is kept; the link carries the token.
  token_hash bytea not null unique,
  -- The role new people start with.
  role_id uuid not null,
  -- Null: until switched off.
  expires_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, role_id) references public.roles (workspace_id, id)
);
create index workspace_join_links_role_idx on public.workspace_join_links (workspace_id, role_id);
create index workspace_join_links_created_by_idx on public.workspace_join_links (created_by);

create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Who asked, as they were then: admins can't read a non-member's profile.
  full_name text not null check (char_length(full_name) <= 200),
  email text not null check (char_length(email) <= 320),
  message text check (char_length(message) <= 500),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  -- The role given on approval.
  role_id uuid,
  decided_by uuid references auth.users (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, role_id) references public.roles (workspace_id, id)
);
-- One open request per person per workspace.
create unique index join_requests_one_open_idx on public.join_requests (workspace_id, user_id) where status = 'pending';
create index join_requests_workspace_idx on public.join_requests (workspace_id, status, created_at desc);
create index join_requests_user_idx on public.join_requests (user_id);
create index join_requests_role_idx on public.join_requests (workspace_id, role_id);
create index join_requests_decided_by_idx on public.join_requests (decided_by);

alter table public.workspace_join_links enable row level security;
alter table public.join_requests enable row level security;

-- Reads only: every change goes through the functions below.
grant select on public.workspace_join_links, public.join_requests to authenticated;
create policy "Inviters see the join link" on public.workspace_join_links
  for select to authenticated using (app.has_permission(workspace_id, 'members.invite'));
create policy "People see their own requests, and inviters the workspace's" on public.join_requests
  for select to authenticated using (
    user_id = (select auth.uid()) or app.has_permission(workspace_id, 'members.invite'));

create trigger audit after insert or update or delete on public.workspace_join_links
  for each row execute function app.audit_row_change('workspace_id');
create trigger audit after insert or update or delete on public.join_requests
  for each row execute function app.audit_row_change('workspace_id');

-- Active members holding a permission everywhere in the workspace (owners included).
create function app.workspace_holders(p_workspace_id uuid, p_permission_key text)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from public.members m
  where m.workspace_id = p_workspace_id and m.status = 'active' and m.user_id is not null and (
    m.is_owner or exists (
      select 1 from public.member_roles mr
      join public.roles r on r.id = mr.role_id and r.archived_at is null
      join public.role_permissions rp on rp.role_id = r.id and rp.permission_key = p_permission_key
        and rp.reach = 'workspace'
      where mr.member_id = m.id
    )
  );
$$;

-- The workspace a join token opens, while the link is on and not expired.
create function app.join_link_for(p_token text)
returns public.workspace_join_links
language sql
stable
security definer
set search_path = ''
as $$
  select l from public.workspace_join_links l
  where l.token_hash = app.hash_invitation_token(coalesce(p_token, ''))
    and (l.expires_at is null or l.expires_at > now());
$$;

-- Switches the join link on (or replaces it), returning the token once.
create function public.set_join_link(p_workspace_id uuid, p_role_id uuid, p_expires_at timestamptz default null)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  perform app.check_can_invite(p_workspace_id, p_role_id);
  if p_expires_at is not null and p_expires_at <= now() then
    raise exception 'The link must expire in the future.' using errcode = 'check_violation', hint = 'joinLinkExpiry';
  end if;
  insert into public.workspace_join_links (workspace_id, token_hash, role_id, expires_at, created_by)
  values (p_workspace_id, app.hash_invitation_token(v_token), p_role_id, p_expires_at, (select auth.uid()))
  on conflict (workspace_id) do update
  set token_hash = excluded.token_hash, role_id = excluded.role_id, expires_at = excluded.expires_at,
    created_by = excluded.created_by, created_at = now();
  return v_token;
end;
$$;

create function public.disable_join_link(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.has_permission(p_workspace_id, 'members.invite') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  delete from public.workspace_join_links where workspace_id = p_workspace_id;
end;
$$;

-- What the join page shows: the workspace's name and logo, and where the caller stands. Nothing
-- about its members.
create function public.join_link_info(p_token text)
returns table (workspace_name text, workspace_slug text, logo_path text, is_member boolean, request_status text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_link public.workspace_join_links := app.join_link_for(p_token);
begin
  if (select auth.uid()) is null or v_link.workspace_id is null then
    return;
  end if;
  return query
  select w.name, w.slug::text, w.logo_path,
    exists (select 1 from public.members m where m.workspace_id = w.id and m.user_id = (select auth.uid()) and m.status = 'active'),
    (select r.status from public.join_requests r where r.workspace_id = w.id and r.user_id = (select auth.uid())
     order by r.created_at desc limit 1)
  from public.workspaces w where w.id = v_link.workspace_id;
end;
$$;

create function public.request_to_join(p_token text, p_message text default null)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_link public.workspace_join_links := app.join_link_for(p_token);
  v_user uuid := (select auth.uid());
  v_name text;
  v_email text;
  v_id uuid;
begin
  if v_user is null or v_link.workspace_id is null then
    raise exception 'This join link is not valid.' using errcode = 'no_data_found', hint = 'joinLinkInvalid';
  end if;
  if exists (select 1 from public.members m where m.workspace_id = v_link.workspace_id and m.user_id = v_user and m.status = 'active') then
    raise exception 'You are already a member.' using errcode = 'check_violation', hint = 'alreadyMember';
  end if;
  if exists (select 1 from public.join_requests r where r.workspace_id = v_link.workspace_id and r.user_id = v_user and r.status = 'pending') then
    raise exception 'You have already asked to join.' using errcode = 'check_violation', hint = 'joinRequestOpen';
  end if;
  -- A shared link can't flood a workspace.
  if (select count(*) from public.join_requests r where r.workspace_id = v_link.workspace_id and r.status = 'pending') >= 50 then
    raise exception 'Too many requests are waiting.' using errcode = 'check_violation', hint = 'joinRequestsFull';
  end if;

  select coalesce(nullif(btrim(p.full_name), ''), split_part(u.email, '@', 1)), u.email
  into v_name, v_email
  from auth.users u left join public.profiles p on p.id = u.id where u.id = v_user;
  insert into public.join_requests (workspace_id, user_id, full_name, email, message)
  values (v_link.workspace_id, v_user, v_name, v_email, nullif(btrim(p_message), ''))
  returning id into v_id;

  perform app.notify(m.user_id, v_link.workspace_id, 'access', 'join.requested',
    jsonb_build_object('request_id', v_id, 'member_name', v_name))
  from public.members m
  where m.id in (select h from app.workspace_holders(v_link.workspace_id, 'members.invite') h);
  return v_id;
end;
$$;

-- Approving adds the person with the chosen role only (or the link's), as when inviting someone
-- who left: roles they held before don't come back.
create function public.decide_join_request(p_request_id uuid, p_approve boolean, p_role_id uuid default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.join_requests;
  v_role uuid;
  v_member uuid;
begin
  select * into v_request from public.join_requests where id = p_request_id for update;
  if v_request.id is null or not app.has_permission(v_request.workspace_id, 'members.invite') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_request.status <> 'pending' then
    raise exception 'This request was already answered.' using errcode = 'check_violation', hint = 'joinRequestDecided';
  end if;

  if not p_approve then
    update public.join_requests set status = 'declined', decided_by = (select auth.uid()), decided_at = now()
    where id = p_request_id;
    perform app.notify(v_request.user_id, v_request.workspace_id, 'access', 'join.declined',
      jsonb_build_object('workspace_name', (select name from public.workspaces where id = v_request.workspace_id)));
    return;
  end if;

  v_role := coalesce(p_role_id, (select role_id from public.workspace_join_links where workspace_id = v_request.workspace_id));
  if v_role is null then
    raise exception 'Choose a role.' using errcode = 'check_violation', hint = 'roleRequired';
  end if;
  perform app.check_can_invite(v_request.workspace_id, v_role);

  -- Their old member row (they left), one added for their email, or a new one.
  select m.id into v_member from public.members m
  where m.workspace_id = v_request.workspace_id
    and (m.user_id = v_request.user_id or (m.user_id is null and m.email = v_request.email))
  order by (m.user_id = v_request.user_id) desc nulls last
  limit 1
  for update;
  if v_member is null then
    insert into public.members (workspace_id, user_id, full_name, email)
    values (v_request.workspace_id, v_request.user_id, v_request.full_name, v_request.email)
    returning id into v_member;
  else
    delete from public.member_roles where member_id = v_member;
    update public.members set user_id = v_request.user_id, status = 'active' where id = v_member;
  end if;
  insert into public.member_roles (workspace_id, member_id, role_id, assigned_by)
  values (v_request.workspace_id, v_member, v_role, (select auth.uid()));

  update public.join_requests
  set status = 'approved', role_id = v_role, decided_by = (select auth.uid()), decided_at = now()
  where id = p_request_id;
  perform app.notify(v_request.user_id, v_request.workspace_id, 'access', 'join.approved',
    jsonb_build_object('workspace_name', (select name from public.workspaces where id = v_request.workspace_id)));
end;
$$;

create function public.withdraw_join_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.join_requests set status = 'withdrawn', decided_at = now()
  where id = p_request_id and user_id = (select auth.uid()) and status = 'pending';
  if not found then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
end;
$$;

grant execute on function
  public.set_join_link(uuid, uuid, timestamptz),
  public.disable_join_link(uuid),
  public.join_link_info(text),
  public.request_to_join(text, text),
  public.decide_join_request(uuid, boolean, uuid),
  public.withdraw_join_request(uuid)
to authenticated;

-- Retention: answered join requests go with old notifications.
CREATE OR REPLACE FUNCTION app.apply_retention(p_workspace_id uuid, p_today date DEFAULT CURRENT_DATE)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_rules public.data_retention;
  v_member public.members;
  v_leavers integer := 0;
  v_notes integer := 0;
  v_audit integer := 0;
  v_imports integer := 0;
  v_notifications integer := 0;
begin
  select * into v_rules from public.data_retention where workspace_id = p_workspace_id;
  if v_rules.workspace_id is null then
    return '{}';
  end if;

  if v_rules.anonymise_leavers_months is not null then
    for v_member in
      select * from public.members m
      where m.workspace_id = p_workspace_id and m.erased_at is null and not m.is_owner
        and m.end_date < p_today - make_interval(months => v_rules.anonymise_leavers_months)
    loop
      perform app.anonymise_member(v_member.id);
      insert into public.member_erasures (workspace_id, member_id, reason, kind)
      values (p_workspace_id, v_member.id,
        format('%s months after leaving', v_rules.anonymise_leavers_months), 'retention');
      v_leavers := v_leavers + 1;
    end loop;
  end if;

  if v_rules.private_notes_months is not null then
    update public.bookings b set notes = null
    from public.time_types t
    where b.workspace_id = p_workspace_id and t.id = b.time_type_id and t.visibility = 'private'
      and b.notes is not null and b.end_date < p_today - make_interval(months => v_rules.private_notes_months);
    get diagnostics v_notes = row_count;
  end if;

  if v_rules.audit_log_months is not null then
    perform set_config('app.personal_data', 'on', true);
    delete from public.audit_log
    where workspace_id = p_workspace_id and at < p_today - make_interval(months => v_rules.audit_log_months);
    get diagnostics v_audit = row_count;
    perform set_config('app.personal_data', 'off', true);
  end if;

  if v_rules.staged_imports_days is not null then
    delete from public.import_jobs
    where workspace_id = p_workspace_id and status <> 'applying'
      and created_at < p_today - make_interval(days => v_rules.staged_imports_days);
    get diagnostics v_imports = row_count;
  end if;

  if v_rules.notifications_months is not null then
    delete from public.notifications
    where workspace_id = p_workspace_id and created_at < p_today - make_interval(months => v_rules.notifications_months);
    get diagnostics v_notifications = row_count;
    -- Answered join requests follow the notifications rule.
    delete from public.join_requests
    where workspace_id = p_workspace_id and status <> 'pending'
      and coalesce(decided_at, created_at) < p_today - make_interval(months => v_rules.notifications_months);
  end if;

  return jsonb_build_object('leavers', v_leavers, 'notes', v_notes, 'audit', v_audit,
    'imports', v_imports, 'notifications', v_notifications);
end;
$function$;
