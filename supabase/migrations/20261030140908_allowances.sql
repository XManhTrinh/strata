-- Working days and allowances: how many working days a booking takes for a person (their schedule
-- and holiday calendar on each day), and balances settled from the policy (grants, monthly
-- accruals, capped carry-over, expiry) into the append-only ledger. Settling is safe to repeat.

-- A person's working days and holiday calendar on a date (their job record, else the defaults).
create function app.time_setup_on(p_member_id uuid, p_date date)
returns table (working_days smallint[], calendar_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  with a as (select * from app.assignment_on(p_member_id, p_date)),
  m as (select workspace_id from public.members where id = p_member_id)
  select
    coalesce(
      (select s.working_days from a join public.work_schedules s on s.id = a.work_schedule_id),
      (select s.working_days from m join public.work_schedules s on s.workspace_id = m.workspace_id and s.is_default)
    ),
    coalesce(
      (select a.holiday_calendar_id from a),
      (select c.id from m join public.holiday_calendars c on c.workspace_id = m.workspace_id and c.is_default)
    );
$$;

-- Each day of a booking and the working time it takes: 1, 0.5 for a half day or half holiday, 0
-- on a day off or a holiday. A booking starting in the afternoon or ending in the morning takes
-- half of that day.
create function app.booking_days(
  p_member_id uuid, p_start date, p_start_half text, p_end date, p_end_half text
)
returns table (day date, days numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select d::date,
    case when extract(isodow from d)::smallint = any (s.working_days) then
      greatest(0,
        (case when d = p_start and p_start_half = 'afternoon' then 0.5
              when d = p_end and p_end_half = 'morning' then 0.5
              else 1 end)
        - coalesce((select h.portion from public.holidays h where h.calendar_id = s.calendar_id and h.date = d), 0))
    else 0 end
  from generate_series(p_start, p_end, interval '1 day') d
  cross join lateral app.time_setup_on(p_member_id, d::date) s;
$$;

create function app.working_days(
  p_member_id uuid, p_start date, p_start_half text, p_end date, p_end_half text
)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(sum(days), 0) from app.booking_days(p_member_id, p_start, p_start_half, p_end, p_end_half);
$$;

-- The first day of the leave year containing a date, for a year starting in a given month.
create function app.leave_year_start(p_start_month smallint, p_date date)
returns date
language sql
immutable
set search_path = ''
as $$
  select make_date(
    extract(year from p_date)::integer - case when extract(month from p_date) < p_start_month then 1 else 0 end,
    p_start_month, 1);
$$;

-- The policy a person is on for a type on a date: theirs if set, else the type's default.
create function app.allowance_policy_on(p_member_id uuid, p_time_type_id uuid, p_date date)
returns public.allowance_policies
language sql
stable
security definer
set search_path = ''
as $$
  select p.* from public.allowance_policies p
  where p.archived_at is null and p.id = coalesce(
    (select mp.policy_id from public.member_allowance_policies mp
     where mp.member_id = p_member_id and mp.time_type_id = p_time_type_id
       and mp.valid_from <= p_date and (mp.valid_to is null or mp.valid_to > p_date)),
    (select d.id from public.allowance_policies d where d.time_type_id = p_time_type_id and d.is_default and d.archived_at is null)
  );
$$;

-- A full year's days for a person on a policy: scaled by their working days (3 of 5 gets 60%) when
-- the policy pro-rates, using the schedule on the year's first day (or their start date). Rounded
-- to half days.
create function app.yearly_days(p_member_id uuid, p_policy public.allowance_policies, p_year_start date)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  select round(p_policy.days_per_year * case when p_policy.prorate_by_schedule then
      cardinality((select s.working_days from app.time_setup_on(p_member_id,
        greatest(p_year_start, coalesce((select m.start_date from public.members m where m.id = p_member_id), p_year_start))) s))::numeric / 5
    else 1 end * 2) / 2;
$$;

-- Adds what's due up to a date and is missing: the year's grant (upfront, scaled by the months left
-- for someone who joins mid-year), monthly accruals, carry-over from the year before (capped), and
-- the expiry of carried days not used in time. Safe to run any number of times.
create function app.settle_allowance(p_member_id uuid, p_time_type_id uuid, p_as_of date)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members := (select m from public.members m where m.id = p_member_id);
  v_policy public.allowance_policies := app.allowance_policy_on(p_member_id, p_time_type_id, p_as_of);
  v_year date;
  v_previous date;
  v_full numeric;
  v_first_month date;
  v_month date;
  v_leftover numeric;
  v_carried numeric;
  v_expires date;
  v_used numeric;
begin
  if v_policy.id is null or v_member.id is null then
    return;
  end if;
  v_year := app.leave_year_start(v_policy.year_start_month, p_as_of);
  v_full := app.yearly_days(p_member_id, v_policy, v_year);
  -- Joiners start accruing from their start month.
  v_first_month := greatest(v_year, date_trunc('month', coalesce(v_member.start_date, v_year))::date);
  if v_first_month > p_as_of then
    return;
  end if;

  if v_policy.accrual = 'upfront' then
    insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, period, days)
    values (v_member.workspace_id, p_member_id, p_time_type_id, v_year, 'grant', v_year,
      round(v_full * (12 - (extract(year from age(v_first_month, v_year)) * 12 + extract(month from age(v_first_month, v_year))))::numeric / 12 * 2) / 2)
    on conflict (member_id, time_type_id, kind, period) where kind in ('grant', 'accrual', 'carry_over', 'expiry') do nothing;
  else
    for v_month in select generate_series(v_first_month, date_trunc('month', p_as_of)::date, interval '1 month')::date loop
      insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, period, days)
      values (v_member.workspace_id, p_member_id, p_time_type_id, v_year, 'accrual', v_month, round(v_full / 12, 2))
      on conflict (member_id, time_type_id, kind, period) where kind in ('grant', 'accrual', 'carry_over', 'expiry') do nothing;
    end loop;
  end if;

  -- Carry-over from the year before, once, if that year had anything.
  v_previous := (v_year - interval '1 year')::date;
  if exists (select 1 from public.allowance_ledger l
             where l.member_id = p_member_id and l.time_type_id = p_time_type_id and l.leave_year = v_previous) then
    v_leftover := (select coalesce(sum(l.days), 0) from public.allowance_ledger l
                   where l.member_id = p_member_id and l.time_type_id = p_time_type_id and l.leave_year = v_previous);
    v_carried := greatest(0, least(v_leftover, coalesce(v_policy.carry_over_max, v_leftover)));
    if v_carried > 0 then
      insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, period, days)
      values (v_member.workspace_id, p_member_id, p_time_type_id, v_year, 'carry_over', v_year, v_carried)
      on conflict (member_id, time_type_id, kind, period) where kind in ('grant', 'accrual', 'carry_over', 'expiry') do nothing;
    end if;
  end if;

  -- Carried days left unused by the expiry date lapse (days taken count against carried days first).
  if v_policy.carry_over_expires_months is not null then
    v_expires := (v_year + make_interval(months => v_policy.carry_over_expires_months))::date;
    v_carried := (select coalesce(sum(l.days), 0) from public.allowance_ledger l
                  where l.member_id = p_member_id and l.time_type_id = p_time_type_id
                    and l.leave_year = v_year and l.kind = 'carry_over');
    if p_as_of >= v_expires and v_carried > 0 then
      v_used := (select coalesce(-sum(l.days), 0) from public.allowance_ledger l
                 join public.bookings b on b.id = l.booking_id
                 where l.member_id = p_member_id and l.time_type_id = p_time_type_id and l.leave_year = v_year
                   and l.kind in ('usage', 'refund') and b.start_date < v_expires);
      if v_carried - v_used > 0 then
        insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, period, days)
        values (v_member.workspace_id, p_member_id, p_time_type_id, v_year, 'expiry', v_year, -(v_carried - v_used))
        on conflict (member_id, time_type_id, kind, period) where kind in ('grant', 'accrual', 'carry_over', 'expiry') do nothing;
      end if;
    end if;
  end if;
end;
$$;

-- Bookings (written by the booking functions in the next migration) -----------------------------------

create type public.booking_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.approval_decision as enum ('pending', 'approved', 'rejected');
create type public.feed_scope as enum ('me', 'team', 'workspace');

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  time_type_id uuid not null,
  created_by uuid not null,
  -- Whole or half days in the attendees' own dates…
  start_date date not null,
  end_date date not null,
  start_half text not null default 'full' check (start_half in ('full', 'afternoon')),
  end_half text not null default 'full' check (end_half in ('full', 'morning')),
  -- …or set times, for events.
  starts_at timestamptz,
  ends_at timestamptz,
  time_zone text,
  title text check (char_length(title) <= 200),
  notes text check (char_length(notes) <= 2000),
  status public.booking_status not null,
  -- RFC 5545 rule (events only); occurrences are worked out when a range is read.
  recurrence_rule text check (char_length(recurrence_rule) <= 500),
  cancelled_at timestamptz,
  cancel_reason text check (char_length(cancel_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  foreign key (workspace_id, time_type_id) references public.time_types (workspace_id, id),
  foreign key (workspace_id, created_by) references public.members (workspace_id, id),
  constraint bookings_dates_in_order check (end_date >= start_date),
  constraint bookings_half_days_fit check (not (start_date = end_date and start_half = 'afternoon' and end_half = 'morning')),
  constraint bookings_times_in_order check ((starts_at is null) = (ends_at is null) and (starts_at is null or ends_at > starts_at))
);
create index bookings_workspace_dates_idx on public.bookings (workspace_id, start_date, end_date);
create index bookings_workspace_type_idx on public.bookings (workspace_id, time_type_id);
create index bookings_created_by_idx on public.bookings (workspace_id, created_by);

create table public.booking_attendees (
  booking_id uuid not null,
  workspace_id uuid not null,
  member_id uuid not null,
  -- Working days this booking takes for this person (their schedule and holidays).
  working_days numeric(6, 2) not null default 0,
  primary key (booking_id, member_id),
  foreign key (workspace_id, booking_id) references public.bookings (workspace_id, id) on delete cascade,
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade
);
create index booking_attendees_member_idx on public.booking_attendees (workspace_id, member_id);

create table public.booking_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  booking_id uuid not null,
  step smallint not null default 1,
  -- Who decides: a person, anyone holding a role, or (both null) anyone approving workspace-wide.
  approver_member_id uuid,
  approver_role_id uuid,
  decision public.approval_decision not null default 'pending',
  comment text check (char_length(comment) <= 1000),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (booking_id, step),
  foreign key (workspace_id, booking_id) references public.bookings (workspace_id, id) on delete cascade,
  foreign key (workspace_id, approver_member_id) references public.members (workspace_id, id),
  foreign key (workspace_id, approver_role_id) references public.roles (workspace_id, id),
  foreign key (workspace_id, decided_by) references public.members (workspace_id, id)
);
create index booking_approvals_pending_idx on public.booking_approvals (workspace_id, approver_member_id) where decision = 'pending';

create table public.calendar_feed_tokens (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  scope public.feed_scope not null,
  -- Only the hash is kept; the link is shown once.
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz,
  revoked_at timestamptz
);
create index calendar_feed_tokens_user_idx on public.calendar_feed_tokens (user_id);

alter table public.allowance_ledger
  add foreign key (workspace_id, booking_id) references public.bookings (workspace_id, id);
create index allowance_ledger_booking_idx on public.allowance_ledger (booking_id);

create trigger set_updated_at before update on public.bookings
  for each row execute function app.set_updated_at();

-- Read with the attendees' time (writes go through the booking functions only).
alter table public.bookings enable row level security;
alter table public.booking_attendees enable row level security;
alter table public.booking_approvals enable row level security;
alter table public.calendar_feed_tokens enable row level security;
grant select on public.bookings, public.booking_attendees, public.booking_approvals to authenticated;
grant select, delete on public.calendar_feed_tokens to authenticated;

create policy "Bookings are visible with an attendee's time" on public.bookings
  for select to authenticated
  using (
    app.feature_on(workspace_id, 'time') and exists (
      select 1 from public.booking_attendees a
      where a.booking_id = id and app.can(workspace_id, 'time.view', a.member_id)
    )
  );
create policy "Attendees are visible with their time" on public.booking_attendees
  for select to authenticated
  using (app.feature_on(workspace_id, 'time') and app.can(workspace_id, 'time.view', member_id));
create policy "Approvals are visible with the booking" on public.booking_approvals
  for select to authenticated
  using (exists (select 1 from public.bookings b where b.id = booking_id));
create policy "People see their own feed links" on public.calendar_feed_tokens
  for select to authenticated using (user_id = (select auth.uid()));
create policy "People revoke their own feed links" on public.calendar_feed_tokens
  for delete to authenticated using (user_id = (select auth.uid()));

create trigger audit after insert or update or delete on public.bookings
  for each row execute function app.audit_row_change('workspace_id');
create trigger audit after insert or update or delete on public.booking_approvals
  for each row execute function app.audit_row_change('workspace_id');

-- Balances ----------------------------------------------------------------------------------------

-- One person's balances for each allowance type in the leave year containing a date, settled first.
-- Requested = pending bookings; available = everything in the ledger (pending usage included).
create function public.allowance_balances(p_member_id uuid, p_as_of date default current_date)
returns table (
  time_type_id uuid,
  time_type_name text,
  leave_year date,
  entitled numeric,
  carried_over numeric,
  adjusted numeric,
  used numeric,
  requested numeric,
  expired numeric,
  available numeric
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid := (select workspace_id from public.members where id = p_member_id);
  v_type public.time_types;
begin
  if v_workspace_id is null or not app.feature_on(v_workspace_id, 'time')
     or not app.can(v_workspace_id, 'time.view', p_member_id) then
    return;
  end if;
  for v_type in select * from public.time_types t
    where t.workspace_id = v_workspace_id and t.uses_allowance and t.archived_at is null
  loop
    perform app.settle_allowance(p_member_id, v_type.id, p_as_of);
  end loop;

  return query
  select t.id, t.name,
    app.leave_year_start(p.year_start_month, p_as_of),
    coalesce(sum(l.days) filter (where l.kind in ('grant', 'accrual')), 0),
    coalesce(sum(l.days) filter (where l.kind = 'carry_over'), 0),
    coalesce(sum(l.days) filter (where l.kind = 'adjustment'), 0),
    coalesce(-sum(l.days) filter (where l.kind in ('usage', 'refund') and b.status = 'approved'), 0),
    coalesce(-sum(l.days) filter (where l.kind = 'usage' and b.status = 'pending'), 0),
    coalesce(-sum(l.days) filter (where l.kind = 'expiry'), 0),
    coalesce(sum(l.days), 0)
  from public.time_types t
  cross join lateral (select * from app.allowance_policy_on(p_member_id, t.id, p_as_of)) p
  left join public.allowance_ledger l
    on l.member_id = p_member_id and l.time_type_id = t.id
   and l.leave_year = app.leave_year_start(p.year_start_month, p_as_of)
  left join public.bookings b on b.id = l.booking_id
  where t.workspace_id = v_workspace_id and t.uses_allowance and t.archived_at is null and p.id is not null
  group by t.id, t.name, t.sort_order, p.year_start_month
  order by t.sort_order;
end;
$$;

-- A correction to a balance, with the reason recorded (in the leave year containing a date).
create function public.adjust_allowance(
  p_member_id uuid, p_time_type_id uuid, p_days numeric, p_reason text, p_as_of date default current_date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid := (select workspace_id from public.members where id = p_member_id);
  v_policy public.allowance_policies := app.allowance_policy_on(p_member_id, p_time_type_id, p_as_of);
begin
  if v_workspace_id is null or not app.feature_on(v_workspace_id, 'time')
     or not app.can(v_workspace_id, 'time.adjust_allowance', p_member_id) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if nullif(btrim(p_reason), '') is null then
    raise exception 'Give a reason.' using errcode = 'check_violation', hint = 'adjustmentReasonRequired';
  end if;
  if v_policy.id is null or p_days = 0 then
    raise exception 'Nothing to adjust.' using errcode = 'check_violation', hint = 'adjustmentInvalid';
  end if;
  perform app.settle_allowance(p_member_id, p_time_type_id, p_as_of);
  insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, days, reason, created_by)
  values (v_workspace_id, p_member_id, p_time_type_id, app.leave_year_start(v_policy.year_start_month, p_as_of),
    'adjustment', p_days, btrim(p_reason), (select auth.uid()));
end;
$$;

-- Nightly: grants, accruals, carry-over and expiry for everyone current, in workspaces using time.
create function app.settle_all_allowances(p_as_of date)
returns void
language sql
security definer
set search_path = ''
as $$
  select count(app.settle_allowance(m.id, t.id, p_as_of))
  from public.members m
  join public.time_types t on t.workspace_id = m.workspace_id and t.uses_allowance and t.archived_at is null
  where app.feature_on(m.workspace_id, 'time')
    and (m.end_date is null or m.end_date >= p_as_of)
    and (m.start_date is null or m.start_date <= p_as_of);
$$;

select cron.schedule('settle-allowances', '30 0 * * *', $$ select app.settle_all_allowances(current_date) $$);

grant execute on function
  public.allowance_balances(uuid, date),
  public.adjust_allowance(uuid, uuid, numeric, text, date)
to authenticated;
