-- Calendar feeds: a private link a calendar app subscribes to. The link holds a random token; only
-- its hash is stored. Reading a feed acts as the link's owner for that one request, so it shows
-- exactly what they may see (private types as busy), and stops when the link is revoked or they
-- leave the workspace.

-- Creates a feed link and returns its token (shown once).
create function public.create_feed_token(p_workspace_id uuid, p_scope public.feed_scope)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if app.current_member_id(p_workspace_id) is null or not app.feature_on(p_workspace_id, 'time') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  insert into public.calendar_feed_tokens (workspace_id, user_id, scope, token_hash)
  values (p_workspace_id, (select auth.uid()), p_scope, encode(extensions.digest(v_token, 'sha256'), 'hex'));
  return v_token;
end;
$$;

-- The bookings a feed shows, from 60 days ago to a year ahead. Callable without signing in: the
-- token is the key. Unknown or revoked tokens show nothing.
create function public.calendar_feed(p_token text)
returns table (
  booking_id uuid,
  member_name text,
  time_type_name text,
  title text,
  start_date date,
  end_date date,
  start_half text,
  end_half text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.booking_status,
  recurrence_rule text,
  masked boolean,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_feed public.calendar_feed_tokens;
  v_me uuid;
  v_members uuid[];
begin
  select * into v_feed from public.calendar_feed_tokens t
  where t.token_hash = encode(extensions.digest(coalesce(p_token, ''), 'sha256'), 'hex') and t.revoked_at is null;
  if v_feed.id is null then
    return;
  end if;
  update public.calendar_feed_tokens set last_used_at = now() where id = v_feed.id;

  -- Act as the link's owner for this request only.
  perform set_config('request.jwt.claims', json_build_object('sub', v_feed.user_id, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_feed.user_id::text, true);
  v_me := app.current_member_id(v_feed.workspace_id);
  if v_me is null then
    return;
  end if;
  v_members := case v_feed.scope
    when 'me' then array[v_me]
    when 'team' then (
      select array_agg(a.member_id) from public.member_assignments a
      where a.org_unit_id = (app.assignment_on(v_me, current_date)).org_unit_id
        and a.valid_from <= current_date and (a.valid_to is null or a.valid_to > current_date))
    else null
  end;

  return query
  select e.booking_id, e.member_name, e.time_type_name, e.title, e.start_date, e.end_date, e.start_half,
    e.end_half, e.starts_at, e.ends_at, e.status, e.recurrence_rule, e.masked, b.updated_at
  from public.calendar_entries(v_feed.workspace_id, current_date - 60, current_date + 365, v_members) e
  join public.bookings b on b.id = e.booking_id;
end;
$$;

grant execute on function public.create_feed_token(uuid, public.feed_scope) to authenticated;
grant execute on function public.calendar_feed(text) to anon, authenticated;
