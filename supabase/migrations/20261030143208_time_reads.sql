-- Reads for the time off screens: the requests waiting for the caller, and how many working days a
-- booking would take (shown while booking).

-- Pending requests the caller may decide: named as approver, holding the approving role, or (for
-- requests with no one else to route to, and any request) approving workspace-wide.
create function public.my_pending_approvals(p_workspace_id uuid)
returns table (
  booking_id uuid,
  member_id uuid,
  member_name text,
  time_type_name text,
  color text,
  start_date date,
  end_date date,
  start_half text,
  end_half text,
  working_days numeric,
  notes text,
  requested_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  with me as (select app.current_member_id(p_workspace_id) as id),
  approver_everywhere as (
    select exists (select 1 from app.workspace_approvers(p_workspace_id) a where a = (select id from me)) as yes
  )
  select b.id, a.member_id, m.full_name, t.name, t.color, b.start_date, b.end_date, b.start_half, b.end_half,
    a.working_days, b.notes, b.created_at
  from public.booking_approvals ap
  join public.bookings b on b.id = ap.booking_id and b.status = 'pending'
  join public.booking_attendees a on a.booking_id = b.id
  join public.members m on m.id = a.member_id
  join public.time_types t on t.id = b.time_type_id
  where ap.workspace_id = p_workspace_id and ap.decision = 'pending'
    and app.feature_on(p_workspace_id, 'time')
    and a.member_id <> (select id from me)
    and (
      ap.approver_member_id = (select id from me)
      or (ap.approver_role_id is not null and exists (
        select 1 from public.member_roles mr where mr.role_id = ap.approver_role_id and mr.member_id = (select id from me)))
      or (select yes from approver_everywhere)
    )
  order by b.start_date, b.created_at;
$$;

-- Working days a booking would take for a person the caller may see.
create function public.preview_working_days(
  p_member_id uuid, p_start date, p_start_half text, p_end date, p_end_half text
)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_workspace_id uuid := (select workspace_id from public.members where id = p_member_id);
begin
  if v_workspace_id is null or not app.can(v_workspace_id, 'time.view', p_member_id)
     or p_end < p_start or p_end - p_start > 366 then
    return null;
  end if;
  return app.working_days(p_member_id, p_start, p_start_half, p_end, p_end_half);
end;
$$;

grant execute on function
  public.my_pending_approvals(uuid),
  public.preview_working_days(uuid, date, text, date, text)
to authenticated;
