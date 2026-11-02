-- Notification emails: each notification is emailed once, at once (after a short wait, skipped if
-- read in the app by then) or in a daily summary at 08:00 in the person's time zone, as their
-- preferences say. A job calls the app every minute; the app claims a batch, sends, and records
-- the result. Approvers are also reminded once about requests left waiting.

alter table public.notifications
  add column emailed_at timestamptz,
  add column email_attempts smallint not null default 0,
  add column email_error text check (char_length(email_error) <= 1000),
  -- Set while a batch is being sent, so two runs never send the same email.
  add column email_claimed_at timestamptz;

create index notifications_email_due_idx on public.notifications (created_at)
  where emailed_at is null and read_at is null and email_attempts < 5;

alter table public.booking_approvals add column reminded_at timestamptz;

-- The job's link back to the app, and the secret both sides share. They live in Vault (names
-- 'app_url' and 'jobs_secret'); with either missing, the jobs do nothing.
create extension if not exists pg_net with schema extensions;

create function app.vault_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$ select decrypted_secret from vault.decrypted_secrets where name = p_name $$;

create function app.is_jobs_secret(p_secret text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_secret, '') <> '' and app.vault_secret('jobs_secret') is not null
    and extensions.digest(p_secret, 'sha256') = extensions.digest(app.vault_secret('jobs_secret'), 'sha256');
$$;

-- Asks the app to run a job (e.g. 'notification-emails').
create function app.call_job(p_job text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := app.vault_secret('app_url');
  v_secret text := app.vault_secret('jobs_secret');
begin
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := rtrim(v_url, '/') || '/api/jobs/' || p_job,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 55000
  );
end;
$$;

-- Notifications due by email now, claimed for the caller to send. Instant ones wait 2 minutes
-- (and go only if still unread); daily ones go once it's 08:00 for the person, everything unread
-- from before then. Nothing older than 3 days is sent, so an outage never floods inboxes later.
create function public.claim_notification_emails(p_secret text, p_limit integer default 500)
returns table (
  id uuid,
  user_id uuid,
  email text,
  full_name text,
  locale text,
  time_zone text,
  delivery public.email_delivery,
  workspace_slug text,
  workspace_name text,
  kind text,
  payload jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
begin
  if not app.is_jobs_secret(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  return query
  with due as (
    select n.id, coalesce(p.email_delivery, 'instant') as delivery
    from public.notifications n
    join public.profiles pr on pr.id = n.user_id
    left join public.notification_preferences p on p.user_id = n.user_id and p.category = n.category
    where n.emailed_at is null and n.read_at is null and n.email_attempts < 5
      and n.category <> 'invitation'
      and n.created_at > now() - interval '3 days'
      and (n.email_claimed_at is null or n.email_claimed_at < now() - interval '10 minutes')
      and (
        (coalesce(p.email_delivery, 'instant') = 'instant' and n.created_at <= now() - interval '2 minutes')
        or (p.email_delivery = 'daily'
          and (now() at time zone pr.time_zone)::time >= time '08:00'
          and n.created_at < ((now() at time zone pr.time_zone)::date + time '08:00') at time zone pr.time_zone)
      )
    order by n.user_id, n.created_at
    limit p_limit
    for update of n skip locked
  ),
  claimed as (
    update public.notifications n
    set email_claimed_at = now(), email_attempts = n.email_attempts + 1
    from due where n.id = due.id
    returning n.id, n.user_id, n.workspace_id, n.kind, n.payload, n.created_at, due.delivery
  )
  select c.id, c.user_id, u.email::text, pr.full_name, pr.locale, pr.time_zone, c.delivery,
    w.slug::text, w.name, c.kind, c.payload, c.created_at
  from claimed c
  join auth.users u on u.id = c.user_id
  join public.profiles pr on pr.id = c.user_id
  left join public.workspaces w on w.id = c.workspace_id
  where u.email is not null
  order by c.user_id, c.created_at;
end;
$$;

-- Records what was sent; failures are tried again later, up to 5 times in all.
create function public.mark_notification_emails(p_secret text, p_sent uuid[], p_failed jsonb default '[]')
returns void
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
begin
  if not app.is_jobs_secret(p_secret) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  update public.notifications
  set emailed_at = now(), email_error = null, email_claimed_at = null
  where id = any (coalesce(p_sent, '{}'));

  update public.notifications n
  set email_error = left(f.error, 1000)
  from jsonb_to_recordset(coalesce(p_failed, '[]')) as f (id uuid, error text)
  where n.id = f.id;
end;
$$;

-- The app calls these without signing in; the secret is the key.
grant execute on function public.claim_notification_emails(text, integer) to anon;
grant execute on function public.mark_notification_emails(text, uuid[], jsonb) to anon;

-- Reminds approvers, once, about requests waiting 2 working days (Monday to Friday) or more.
create function app.remind_pending_approvals(p_today date default current_date)
returns integer
language plpgsql
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
declare
  r record;
  v_count integer := 0;
begin
  for r in
    select a.id, a.workspace_id, a.approver_member_id, a.approver_role_id, b.id as booking_id,
      b.start_date, b.end_date, t.name as time_type,
      (select ba.member_id from public.booking_attendees ba where ba.booking_id = b.id order by ba.member_id limit 1) as member_id
    from public.booking_approvals a
    join public.bookings b on b.id = a.booking_id
    join public.time_types t on t.id = b.time_type_id
    where a.decision = 'pending' and a.reminded_at is null and b.status = 'pending'
      and (select count(*) from generate_series(a.created_at::date + 1, p_today, interval '1 day') d
           where extract(isodow from d) < 6) >= 2
    for update of a skip locked
  loop
    perform app.notify_members(
      case
        when r.approver_member_id is not null then array[r.approver_member_id]
        when r.approver_role_id is not null then (
          select array_agg(mr.member_id) from public.member_roles mr
          where mr.role_id = r.approver_role_id and mr.member_id <> r.member_id)
        else (select array_agg(x) from app.workspace_approvers(r.workspace_id) x where x <> r.member_id)
      end,
      r.workspace_id, 'time.reminder',
      jsonb_build_object('booking_id', r.booking_id, 'time_type', r.time_type,
        'start_date', r.start_date, 'end_date', r.end_date, 'member_id', r.member_id,
        'member_name', (select full_name from public.members where id = r.member_id)));
    update public.booking_approvals set reminded_at = now() where id = r.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('notification-emails', '* * * * *', $$ select app.call_job('notification-emails') $$);
select cron.schedule('remind-approvals', '0 6 * * *', $$ select app.remind_pending_approvals() $$);
