-- Booking time: book, decide (approve or reject), cancel, and read the calendar. Each function
-- checks every rule and writes the booking, its approval and its allowance usage in one
-- transaction, then notifies the people involved. Each refusal's hint is the app's message key.

-- A booking's span in half days, for overlap checks (an afternoon start and a morning end share a
-- day without overlapping).
create function app.half_day_span(p_start date, p_start_half text, p_end date, p_end_half text)
returns int4range
language sql
immutable
set search_path = ''
as $$
  select int4range(
    (p_start - date '2000-01-01') * 2 + case when p_start_half = 'afternoon' then 1 else 0 end,
    (p_end - date '2000-01-01') * 2 + case when p_end_half = 'morning' then 1 else 2 end);
$$;

-- Active members who decide requests for anyone: owners and holders of time.approve workspace-wide.
create function app.workspace_approvers(p_workspace_id uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select m.id from public.members m
  where m.workspace_id = p_workspace_id and m.status = 'active' and (
    m.is_owner or exists (
      select 1 from public.member_roles mr
      join public.roles r on r.id = mr.role_id and r.archived_at is null
      join public.role_permissions rp on rp.role_id = r.id and rp.permission_key = 'time.approve' and rp.reach = 'workspace'
      where mr.member_id = m.id
    )
  );
$$;

create function app.notify_members(p_member_ids uuid[], p_workspace_id uuid, p_kind text, p_payload jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  select app.notify(m.user_id, p_workspace_id, 'time', p_kind, p_payload)
  from public.members m where m.id = any (p_member_ids) and m.user_id is not null;
$$;

create function public.book_time(
  p_workspace_id uuid,
  p_time_type_id uuid,
  p_member_ids uuid[],
  p_start_date date,
  p_end_date date,
  p_start_half text default 'full',
  p_end_half text default 'full',
  p_starts_at timestamptz default null,
  p_ends_at timestamptz default null,
  p_time_zone text default null,
  p_title text default null,
  p_notes text default null,
  p_recurrence_rule text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := app.current_member_id(p_workspace_id);
  v_type public.time_types;
  v_members uuid[] := (select array_agg(distinct x) from unnest(p_member_ids) x where x is not null);
  v_member uuid;
  v_booking uuid;
  v_status public.booking_status;
  v_policy public.allowance_policies;
  v_need record;
  v_approver uuid;
  v_approver_role uuid;
  v_personal boolean := (select w.kind = 'personal' from public.workspaces w where w.id = p_workspace_id);
  v_payload jsonb;
begin
  select * into v_type from public.time_types t
  where t.id = p_time_type_id and t.workspace_id = p_workspace_id and t.archived_at is null;
  if v_me is null or not app.feature_on(p_workspace_id, 'time') or v_type.id is null then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if cardinality(coalesce(v_members, '{}')) = 0
     or ((v_type.uses_allowance or v_type.needs_approval) and cardinality(v_members) > 1) then
    raise exception 'Leave is booked for one person at a time.' using errcode = 'check_violation', hint = 'bookingOnePerson';
  end if;
  if p_recurrence_rule is not null and not v_type.allows_recurrence then
    raise exception 'Only events repeat.' using errcode = 'check_violation', hint = 'bookingNoRecurrence';
  end if;
  if p_starts_at is not null and v_type.uses_allowance then
    raise exception 'Leave is booked in days.' using errcode = 'check_violation', hint = 'bookingDaysOnly';
  end if;

  -- Who may book this type, and for whom.
  if (v_type.bookable_by = 'managers' and not app.is_owner(p_workspace_id) and not app.has_permission(p_workspace_id, 'time.approve'))
     or (v_type.bookable_by = 'admins' and not app.has_permission(p_workspace_id, 'time.manage_settings')) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'bookingTypeNotAllowed';
  end if;
  foreach v_member in array v_members loop
    if not (
      (v_member = v_me and app.can(p_workspace_id, 'time.book', v_member))
      or (v_member <> v_me and v_type.book_for_others and app.can(p_workspace_id, 'time.book_for_others', v_member))
    ) then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'bookingForOthersNotAllowed';
    end if;
  end loop;

  -- No overlapping time away for anyone on it (locked per person while checking).
  if v_type.is_away then
    foreach v_member in array v_members loop
      perform pg_advisory_xact_lock(hashtext('booking:' || v_member::text));
      if exists (
        select 1 from public.booking_attendees a
        join public.bookings b on b.id = a.booking_id and b.status in ('pending', 'approved')
        join public.time_types t on t.id = b.time_type_id and t.is_away
        where a.member_id = v_member
          and app.half_day_span(b.start_date, b.start_half, b.end_date, b.end_half)
            operator(pg_catalog.&&) app.half_day_span(p_start_date, p_start_half, p_end_date, p_end_half)
      ) then
        raise exception 'This overlaps time already booked.' using errcode = 'check_violation', hint = 'bookingOverlaps';
      end if;
    end loop;
  end if;

  v_status := case when v_type.needs_approval and not v_personal then 'pending' else 'approved' end;
  insert into public.bookings (workspace_id, time_type_id, created_by, start_date, end_date, start_half, end_half,
    starts_at, ends_at, time_zone, title, notes, status, recurrence_rule)
  values (p_workspace_id, p_time_type_id, v_me, p_start_date, p_end_date, p_start_half, p_end_half,
    p_starts_at, p_ends_at, p_time_zone, nullif(btrim(p_title), ''), nullif(btrim(p_notes), ''), v_status,
    nullif(btrim(p_recurrence_rule), ''))
  returning id into v_booking;

  insert into public.booking_attendees (booking_id, workspace_id, member_id, working_days)
  select v_booking, p_workspace_id, m,
    case when p_starts_at is null then app.working_days(m, p_start_date, p_start_half, p_end_date, p_end_half) else 0 end
  from unnest(v_members) m;

  -- Allowance: enough left in each leave year the booking touches (pending requests count).
  if v_type.uses_allowance then
    v_member := v_members[1];
    v_policy := app.allowance_policy_on(v_member, p_time_type_id, p_start_date);
    if v_policy.id is null then
      raise exception 'No allowance policy applies.' using errcode = 'check_violation', hint = 'noAllowancePolicy';
    end if;
    for v_need in
      select app.leave_year_start(v_policy.year_start_month, d.day) as leave_year, sum(d.days) as days
      from app.booking_days(v_member, p_start_date, p_start_half, p_end_date, p_end_half) d
      group by 1 having sum(d.days) > 0
    loop
      perform app.settle_allowance(v_member, p_time_type_id, greatest(v_need.leave_year, current_date));
      if (select coalesce(sum(l.days), 0) from public.allowance_ledger l
          where l.member_id = v_member and l.time_type_id = p_time_type_id and l.leave_year = v_need.leave_year)
         < v_need.days then
        raise exception 'Not enough allowance left.' using errcode = 'check_violation', hint = 'notEnoughAllowance';
      end if;
      insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, days, booking_id, created_by)
      values (p_workspace_id, v_member, p_time_type_id, v_need.leave_year, 'usage', -v_need.days, v_booking, (select auth.uid()));
    end loop;
  end if;

  -- Names go in the payload so a notification reads on its own.
  v_payload := jsonb_build_object('booking_id', v_booking, 'time_type', v_type.name,
    'start_date', p_start_date, 'end_date', p_end_date,
    'member_name', (select full_name from public.members where id = v_members[1]),
    'by_name', (select full_name from public.members where id = v_me));

  -- Approval: routed by the type's rule; with no one else to route to, workspace approvers decide.
  if v_status = 'pending' then
    v_member := v_members[1];
    if v_type.approver in ('line_manager', 'team_lead') then
      -- Units don't name a lead yet, so the team lead is the line manager for now.
      v_approver := (app.assignment_on(v_member, p_start_date)).manager_member_id;
    elsif v_type.approver = 'person' then
      v_approver := v_type.approver_member_id;
    elsif v_type.approver = 'role' then
      v_approver_role := v_type.approver_role_id;
    end if;
    if v_approver = v_member then
      v_approver := null;
    end if;
    insert into public.booking_approvals (workspace_id, booking_id, approver_member_id, approver_role_id)
    values (p_workspace_id, v_booking, v_approver, v_approver_role);

    perform app.notify_members(
      case
        when v_approver is not null then array[v_approver]
        when v_approver_role is not null then (
          select array_agg(mr.member_id) from public.member_roles mr
          where mr.role_id = v_approver_role and mr.member_id <> v_member)
        else (select array_agg(a) from app.workspace_approvers(p_workspace_id) a where a <> v_member)
      end,
      p_workspace_id, 'time.requested', v_payload || jsonb_build_object('member_id', v_member));
  end if;

  -- People booked by someone else hear about it; a type can also notify a role (e.g. HR).
  perform app.notify_members((select array_agg(m) from unnest(v_members) m where m <> v_me),
    p_workspace_id, 'time.booked_for_you', v_payload);
  if v_type.notify_role_id is not null then
    perform app.notify_members(
      (select array_agg(mr.member_id) from public.member_roles mr where mr.role_id = v_type.notify_role_id),
      p_workspace_id, 'time.booked', v_payload);
  end if;
  return v_booking;
end;
$$;

-- Gives back what a booking still holds from the allowance.
create function app.refund_booking(p_booking_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.allowance_ledger (workspace_id, member_id, time_type_id, leave_year, kind, days, booking_id, created_by)
  select l.workspace_id, l.member_id, l.time_type_id, l.leave_year, 'refund', -sum(l.days), l.booking_id, (select auth.uid())
  from public.allowance_ledger l
  where l.booking_id = p_booking_id and l.kind in ('usage', 'refund')
  group by l.workspace_id, l.member_id, l.time_type_id, l.leave_year, l.booking_id
  having sum(l.days) <> 0;
$$;

-- Approves or rejects a request: the named approver, a holder of the approving role, or a
-- workspace approver; never the person it's for.
create function public.decide_booking(p_booking_id uuid, p_approve boolean, p_comment text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_approval public.booking_approvals;
  v_me uuid;
  v_attendee uuid;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  v_me := app.current_member_id(v_booking.workspace_id);
  select * into v_approval from public.booking_approvals
  where booking_id = p_booking_id and decision = 'pending' order by step limit 1;
  v_attendee := (select a.member_id from public.booking_attendees a where a.booking_id = p_booking_id limit 1);
  if v_booking.id is null or v_me is null or v_approval.id is null or v_booking.status <> 'pending' then
    raise exception 'This request can''t be decided.' using errcode = 'check_violation', hint = 'bookingNotPending';
  end if;
  if v_attendee = v_me then
    raise exception 'People don''t approve their own requests.' using errcode = 'insufficient_privilege', hint = 'selfApproval';
  end if;
  if not (
    v_approval.approver_member_id = v_me
    or (v_approval.approver_role_id is not null and exists (
      select 1 from public.member_roles mr where mr.role_id = v_approval.approver_role_id and mr.member_id = v_me))
    or v_me in (select app.workspace_approvers(v_booking.workspace_id))
  ) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  update public.booking_approvals
  set decision = case when p_approve then 'approved' else 'rejected' end::public.approval_decision,
      comment = nullif(btrim(p_comment), ''), decided_by = v_me, decided_at = now()
  where id = v_approval.id;
  update public.bookings set status = case when p_approve then 'approved' else 'rejected' end::public.booking_status
  where id = p_booking_id;
  if not p_approve then
    perform app.refund_booking(p_booking_id);
  end if;
  perform app.notify_members(array[v_attendee], v_booking.workspace_id,
    case when p_approve then 'time.approved' else 'time.rejected' end,
    jsonb_build_object('booking_id', p_booking_id, 'start_date', v_booking.start_date,
      'end_date', v_booking.end_date, 'comment', nullif(btrim(p_comment), ''),
      'time_type', (select t.name from public.time_types t where t.id = v_booking.time_type_id),
      'by_name', (select full_name from public.members where id = v_me)));
end;
$$;

-- Cancels a request or booking, giving back its allowance: the person it's for, whoever booked it,
-- someone who may book for them, or a workspace approver.
create function public.cancel_booking(p_booking_id uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_booking public.bookings;
  v_me uuid;
  v_attendees uuid[];
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  v_me := app.current_member_id(v_booking.workspace_id);
  v_attendees := (select array_agg(a.member_id) from public.booking_attendees a where a.booking_id = p_booking_id);
  if v_booking.id is null or v_me is null or v_booking.status not in ('pending', 'approved') then
    raise exception 'This booking can''t be cancelled.' using errcode = 'check_violation', hint = 'bookingNotCancellable';
  end if;
  if not (
    v_me = any (v_attendees) or v_booking.created_by = v_me
    or exists (select 1 from unnest(v_attendees) a where app.can(v_booking.workspace_id, 'time.book_for_others', a))
    or v_me in (select app.workspace_approvers(v_booking.workspace_id))
  ) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  update public.bookings set status = 'cancelled', cancelled_at = now(), cancel_reason = nullif(btrim(p_reason), '')
  where id = p_booking_id;
  perform app.refund_booking(p_booking_id);
  perform app.notify_members((select array_agg(a) from unnest(v_attendees) a where a <> v_me),
    v_booking.workspace_id, 'time.cancelled',
    jsonb_build_object('booking_id', p_booking_id, 'start_date', v_booking.start_date, 'end_date', v_booking.end_date,
      'time_type', (select t.name from public.time_types t where t.id = v_booking.time_type_id),
      'by_name', (select full_name from public.members where id = v_me)));
end;
$$;

-- Every calendar view reads here: pending and approved bookings touching a date range for the
-- people the caller may see (optionally some of them). Private types show as "busy" unless the
-- caller is on the booking or may approve for that person; "team" types only to people in the
-- same unit (or with workspace reach). Repeating events come with their rule, to expand.
create function public.calendar_entries(
  p_workspace_id uuid, p_from date, p_to date, p_member_ids uuid[] default null
)
returns table (
  booking_id uuid,
  member_id uuid,
  member_name text,
  time_type_id uuid,
  time_type_name text,
  color text,
  icon text,
  is_away boolean,
  start_date date,
  end_date date,
  start_half text,
  end_half text,
  starts_at timestamptz,
  ends_at timestamptz,
  status public.booking_status,
  title text,
  recurrence_rule text,
  working_days numeric,
  masked boolean
)
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
#variable_conflict use_column
declare
  v_me uuid := app.current_member_id(p_workspace_id);
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, 'time.view');
  v_all boolean := 'workspace' = any (v_reaches);
  v_my_unit uuid := (app.assignment_on(app.current_member_id(p_workspace_id), current_date)).org_unit_id;
begin
  if v_me is null or not app.feature_on(p_workspace_id, 'time') or cardinality(v_reaches) = 0 or p_to < p_from then
    return;
  end if;
  return query
  with visible as (
    select v.member_id from app.visible_members(p_workspace_id, 'time.view') v
    where p_member_ids is null or v.member_id = any (p_member_ids)
  ),
  rows as (
    select b.*, a.member_id as attendee, a.working_days as days, t.name as type_name, t.color as type_color,
      t.icon as type_icon, t.is_away as away, t.visibility,
      (t.visibility = 'private' and a.member_id <> v_me
        and not app.can(p_workspace_id, 'time.approve', a.member_id)) as hide
    from public.bookings b
    join public.booking_attendees a on a.booking_id = b.id
    join public.time_types t on t.id = b.time_type_id
    where b.workspace_id = p_workspace_id and b.status in ('pending', 'approved')
      and b.start_date <= p_to and (b.end_date >= p_from or b.recurrence_rule is not null)
      and a.member_id in (select member_id from visible)
      and (t.visibility <> 'team' or v_all or a.member_id = v_me
           or (app.assignment_on(a.member_id, current_date)).org_unit_id = v_my_unit)
  )
  select r.id, r.attendee, m.full_name,
    case when r.hide then null else r.time_type_id end,
    case when r.hide then null else r.type_name end,
    case when r.hide then '#757575' else r.type_color end,
    case when r.hide then 'event_busy' else r.type_icon end,
    r.away, r.start_date, r.end_date, r.start_half, r.end_half, r.starts_at, r.ends_at, r.status,
    case when r.hide then null else r.title end,
    r.recurrence_rule, r.days, r.hide
  from rows r join public.members m on m.id = r.attendee
  order by r.start_date, m.full_name;
end;
$$;

grant execute on function
  public.book_time(uuid, uuid, uuid[], date, date, text, text, timestamptz, timestamptz, text, text, text, text),
  public.decide_booking(uuid, boolean, text),
  public.cancel_booking(uuid, text),
  public.calendar_entries(uuid, date, date, uuid[])
to authenticated;
