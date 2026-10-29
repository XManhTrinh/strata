-- Email invitations. The link's secret is stored only as a SHA-256 hash; the plain token is
-- returned once, to put in the email. An invitation is accepted by the account with the invited
-- email address, so a forwarded link cannot be used by someone else.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  email extensions.citext not null
    check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 320),
  role_id uuid not null,
  -- An existing member (e.g. imported, without an account) this invitation links to.
  member_id uuid,
  token_hash bytea not null unique,
  invited_by uuid references auth.users (id) on delete set null,
  expires_at timestamptz not null default now() + interval '7 days',
  accepted_at timestamptz,
  accepted_by uuid references auth.users (id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, role_id) references public.roles (workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade
);

-- One open invitation per email per workspace.
create unique index invitations_one_open_per_email_idx on public.invitations (workspace_id, email)
  where accepted_at is null and revoked_at is null;
create index invitations_workspace_role_idx on public.invitations (workspace_id, role_id);
create index invitations_workspace_member_idx on public.invitations (workspace_id, member_id);
create index invitations_invited_by_idx on public.invitations (invited_by);
create index invitations_accepted_by_idx on public.invitations (accepted_by);
create index invitations_email_idx on public.invitations (email);

create trigger audit after insert or update or delete on public.invitations
  for each row execute function app.audit_row_change('workspace_id');

alter table public.invitations enable row level security;

-- Inviters see the workspace's invitations, without the token hash.
grant select (id, workspace_id, email, role_id, member_id, invited_by, expires_at, accepted_at,
              accepted_by, revoked_at, created_at)
  on public.invitations to authenticated;

create policy "Inviters can read invitations" on public.invitations
  for select to authenticated
  using (app.has_permission(workspace_id, 'members.invite'));

create function app.hash_invitation_token(p_token text)
returns bytea
language sql
immutable
set search_path = ''
as $$
  select pg_catalog.sha256(convert_to(p_token, 'UTF8'));
$$;

create function app.new_invitation_token()
returns text
language sql
volatile
set search_path = ''
as $$
  select encode(extensions.gen_random_bytes(32), 'hex');
$$;

-- Checks the caller may invite with this role, raising otherwise.
create function app.check_can_invite(p_workspace_id uuid, p_role_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app.has_permission(p_workspace_id, 'members.invite') then
    raise exception 'You cannot invite people to this workspace.' using errcode = 'insufficient_privilege';
  end if;

  if not exists (
    select 1 from public.roles r
    where r.id = p_role_id and r.workspace_id = p_workspace_id and r.archived_at is null
  ) then
    raise exception 'Role not found.' using errcode = 'no_data_found';
  end if;

  if not app.is_owner(p_workspace_id) and exists (
    select 1 from public.role_permissions rp
    where rp.role_id = p_role_id
      and not app.reach_covers(app.held_reaches(p_workspace_id, rp.permission_key), rp.reach)
  ) then
    raise exception 'You can only invite with roles whose permissions you hold yourself.'
      using errcode = 'insufficient_privilege';
  end if;
end;
$$;

-- Creates an invitation and returns its id and the plain token (shown only this once).
create function public.create_invitation(p_workspace_id uuid, p_email text, p_role_id uuid)
returns table (invitation_id uuid, token text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email extensions.citext := btrim(p_email);
  v_token text := app.new_invitation_token();
  v_member public.members;
  v_invitation_id uuid;
begin
  perform app.check_can_invite(p_workspace_id, p_role_id);

  select * into v_member from public.members m
  where m.workspace_id = p_workspace_id and m.email = v_email;

  if v_member.user_id is not null and v_member.status = 'active' then
    raise exception '% is already a member of this workspace.', v_email using errcode = 'unique_violation';
  end if;

  -- An expired open invitation is replaced; an open, valid one must be resent instead.
  update public.invitations i set revoked_at = now()
  where i.workspace_id = p_workspace_id and i.email = v_email
    and i.accepted_at is null and i.revoked_at is null and i.expires_at <= now();

  insert into public.invitations (workspace_id, email, role_id, member_id, token_hash, invited_by)
  values (p_workspace_id, v_email, p_role_id, v_member.id, app.hash_invitation_token(v_token),
          (select auth.uid()))
  returning id into v_invitation_id;

  perform app.notify(
    u.id, p_workspace_id, 'invitation', 'invitation.received',
    jsonb_build_object(
      'invitation_id', v_invitation_id,
      'workspace_name', (select w.name from public.workspaces w where w.id = p_workspace_id)
    )
  )
  from auth.users u
  where lower(u.email) = lower(v_email::text);

  return query select v_invitation_id, v_token;
exception
  when unique_violation then
    if sqlerrm like '%invitations_one_open_per_email_idx%' then
      raise exception '% already has an open invitation; resend it instead.', v_email
        using errcode = 'unique_violation';
    end if;
    raise;
end;
$$;

-- Issues a new token and a fresh 7-day expiry for an open invitation.
create function public.resend_invitation(p_invitation_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations;
  v_token text := app.new_invitation_token();
begin
  select * into v_invitation from public.invitations i where i.id = p_invitation_id;

  if v_invitation.id is null or not app.has_permission(v_invitation.workspace_id, 'members.invite') then
    raise exception 'Invitation not found.' using errcode = 'no_data_found';
  end if;

  if v_invitation.accepted_at is not null or v_invitation.revoked_at is not null then
    raise exception 'This invitation is no longer open.' using errcode = 'check_violation';
  end if;

  perform app.check_can_invite(v_invitation.workspace_id, v_invitation.role_id);

  update public.invitations
  set token_hash = app.hash_invitation_token(v_token), expires_at = now() + interval '7 days'
  where id = p_invitation_id;

  return v_token;
end;
$$;

create function public.revoke_invitation(p_invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid;
begin
  select i.workspace_id into v_workspace_id from public.invitations i where i.id = p_invitation_id;

  if v_workspace_id is null or not app.has_permission(v_workspace_id, 'members.invite') then
    raise exception 'Invitation not found.' using errcode = 'no_data_found';
  end if;

  update public.invitations set revoked_at = now()
  where id = p_invitation_id and accepted_at is null and revoked_at is null;
end;
$$;

-- What the invitation page shows before signing in. Reveals nothing for unknown tokens.
create function public.get_invitation(p_token text)
returns table (
  workspace_name text,
  role_name text,
  email text,
  inviter_name text,
  status text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    w.name,
    r.name::text,
    i.email::text,
    nullif(btrim(p.full_name), ''),
    case
      when i.accepted_at is not null then 'accepted'
      when i.revoked_at is not null then 'revoked'
      when i.expires_at <= now() then 'expired'
      else 'open'
    end
  from public.invitations i
  join public.workspaces w on w.id = i.workspace_id
  join public.roles r on r.id = i.role_id
  left join public.profiles p on p.id = i.invited_by
  where i.token_hash = app.hash_invitation_token(p_token);
$$;

-- Joins the workspace with the invited role and returns its web address.
create function public.accept_invitation(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_user_email text;
  v_invitation public.invitations;
  v_member public.members;
begin
  if v_user_id is null then
    raise exception 'Sign in to accept the invitation.' using errcode = 'insufficient_privilege';
  end if;

  select * into v_invitation from public.invitations i
  where i.token_hash = app.hash_invitation_token(p_token)
  for update;

  if v_invitation.id is null then
    raise exception 'This invitation link is not valid.' using errcode = 'no_data_found';
  end if;
  if v_invitation.accepted_at is not null then
    raise exception 'This invitation has already been used.' using errcode = 'check_violation';
  end if;
  if v_invitation.revoked_at is not null then
    raise exception 'This invitation was withdrawn.' using errcode = 'check_violation';
  end if;
  if v_invitation.expires_at <= now() then
    raise exception 'This invitation has expired. Ask for a new one.' using errcode = 'check_violation';
  end if;

  select u.email into v_user_email from auth.users u where u.id = v_user_id;
  if lower(v_user_email) <> lower(v_invitation.email::text) then
    raise exception 'This invitation is for %. Sign in with that email address to accept it.',
      v_invitation.email using errcode = 'insufficient_privilege';
  end if;

  -- The invited member row, or one with the same email added since, or this user's old row.
  select * into v_member from public.members m
  where m.workspace_id = v_invitation.workspace_id
    and (m.id = v_invitation.member_id or m.email = v_invitation.email or m.user_id = v_user_id)
  order by (m.user_id = v_user_id) desc nulls last, (m.id = v_invitation.member_id) desc nulls last
  limit 1
  for update;

  if v_member.id is not null and v_member.user_id is not null and v_member.user_id <> v_user_id then
    raise exception 'This member is already linked to another account.' using errcode = 'unique_violation';
  end if;

  if v_member.id is null then
    insert into public.members (workspace_id, user_id, full_name, email)
    select v_invitation.workspace_id, v_user_id,
      coalesce(nullif(btrim(p.full_name), ''), split_part(v_user_email, '@', 1)), v_user_email
    from public.profiles p where p.id = v_user_id
    returning * into v_member;
  else
    update public.members set user_id = v_user_id, status = 'active'
    where id = v_member.id
    returning * into v_member;
  end if;

  insert into public.member_roles (workspace_id, member_id, role_id, assigned_by)
  values (v_invitation.workspace_id, v_member.id, v_invitation.role_id, v_invitation.invited_by)
  on conflict (member_id, role_id) do nothing;

  update public.invitations set accepted_at = now(), accepted_by = v_user_id
  where id = v_invitation.id;

  update public.profiles set last_workspace_id = v_invitation.workspace_id where id = v_user_id;

  perform app.notify(
    v_invitation.invited_by, v_invitation.workspace_id, 'invitation', 'invitation.accepted',
    jsonb_build_object('member_id', v_member.id, 'member_name', v_member.full_name)
  );

  return (select w.slug from public.workspaces w where w.id = v_invitation.workspace_id);
end;
$$;

grant execute on function
  public.create_invitation(uuid, text, uuid),
  public.resend_invitation(uuid),
  public.revoke_invitation(uuid),
  public.accept_invitation(text)
to authenticated;

-- The invitation page is shown before sign-in, so anonymous visitors may look up a token.
grant execute on function public.get_invitation(text) to anon, authenticated;
