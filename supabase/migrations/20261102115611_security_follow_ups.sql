-- Security review follow-ups (Phase 5).

-- Rate-card previews could confirm sensitive field values and show whether someone has a salary.
CREATE OR REPLACE FUNCTION public.rate_card_preview(p_workspace_id uuid, p_month date, p_member_id uuid DEFAULT NULL::uuid, p_planned_role_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(rate_card_id uuid, rate_card_name text, source cost_source, monthly_cost numeric, currency character)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_month date := app.month_start(p_month);
  v_attributes jsonb;
  v_cost_method public.cost_method;
  v_salary numeric;
  v_salary_currency char(3);
  v_card uuid;
  v_can_pay boolean := p_member_id is not null and app.can(p_workspace_id, 'people.view_compensation', p_member_id);
begin
  if not app.has_permission(p_workspace_id, 'rate_cards.view') or num_nonnulls(p_member_id, p_planned_role_id) <> 1 then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if p_member_id is not null then
    if not app.can(p_workspace_id, 'people.view', p_member_id) then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    select ma.attributes, ma.cost_method, ma.annual_salary, ma.salary_currency
    into v_attributes, v_cost_method, v_salary, v_salary_currency
    from app.member_month_attributes(p_member_id, v_month) ma;
    -- Without seeing this person's pay, match only on what you can see: sensitive fields would
    -- otherwise be guessable by trying cards with conditions on them.
    if not v_can_pay then
      v_attributes := v_attributes - array(
        select 'custom:' || f.key from public.custom_fields f where f.workspace_id = p_workspace_id and f.sensitive);
    end if;
  else
    if not exists (select 1 from public.planned_roles r where r.id = p_planned_role_id and r.workspace_id = p_workspace_id
                   and app.covers_unit(p_workspace_id, 'planning.view', r.org_unit_id)) then
      raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
    end if;
    v_attributes := app.planned_role_attributes(p_planned_role_id);
  end if;
  v_card := app.matching_rate_card(p_workspace_id, v_attributes);

  return query
  select v_card, c.name,
    case when r.day_rate is not null then 'rate_card'
         when v_cost_method = 'annual_salary' and v_salary is not null and v_can_pay then 'salary'
         else 'none' end::public.cost_source,
    case when r.day_rate is not null then round(r.day_rate * r.working_days, 2)
         when v_cost_method = 'annual_salary' and v_salary is not null and v_can_pay then round(v_salary / 12, 2) end,
    case when r.day_rate is not null then r.currency
         when v_cost_method = 'annual_salary' and v_salary is not null and v_can_pay then v_salary_currency end
  from (select 1) one
  left join public.rate_cards c on c.id = v_card
  left join lateral (
    select x.day_rate, x.working_days, x.currency from public.rate_card_rates x
    where x.card_id = v_card and x.valid_from <= v_month order by x.valid_from desc limit 1
  ) r on true;
end;
$function$;

-- Any attendee could cancel a shared booking for everyone.
CREATE OR REPLACE FUNCTION public.cancel_booking(p_booking_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_booking public.bookings;
  v_me uuid;
  v_attendees uuid[];
  v_whole boolean;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  v_me := app.current_member_id(v_booking.workspace_id);
  v_attendees := (select array_agg(a.member_id) from public.booking_attendees a where a.booking_id = p_booking_id);
  if v_booking.id is null or v_me is null or v_booking.status not in ('pending', 'approved') then
    raise exception 'This booking can''t be cancelled.' using errcode = 'check_violation', hint = 'bookingNotCancellable';
  end if;
  -- The whole booking: its organiser, its only attendee, approvers, or someone who may book for
  -- every attendee. Any other attendee leaves it instead (shared bookings never use allowance).
  v_whole := v_booking.created_by = v_me
    or v_attendees = array[v_me]
    or v_me in (select app.workspace_approvers(v_booking.workspace_id))
    or not exists (select 1 from unnest(v_attendees) a where not app.can(v_booking.workspace_id, 'time.book_for_others', a));
  if not v_whole and v_me = any (v_attendees) then
    delete from public.booking_attendees where booking_id = p_booking_id and member_id = v_me;
    return;
  end if;
  if not v_whole then
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
$function$;

-- Reactivating someone brought back roles the person reactivating couldn't give.
CREATE OR REPLACE FUNCTION public.set_member_status(p_workspace_id uuid, p_member_id uuid, p_status member_status)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_status not in ('active', 'inactive') then
    raise exception 'Status must be active or inactive.' using errcode = 'invalid_parameter_value';
  end if;

  if not app.can(p_workspace_id, 'members.manage', p_member_id) then
    raise exception 'You cannot change this member.' using errcode = 'insufficient_privilege';
  end if;

  if p_member_id = app.current_member_id(p_workspace_id) then
    raise exception 'You cannot change your own status.' using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.members m where m.id = p_member_id and m.is_owner)
    and p_status = 'inactive'
  then
    raise exception 'Owners cannot be deactivated; transfer ownership first.'
      using errcode = 'check_violation';
  end if;

  -- Coming back restores the person's roles, so (as when inviting) bringing someone back needs
  -- every permission those roles give, unless you own the workspace.
  if p_status = 'active' and not app.is_owner(p_workspace_id) and exists (
    select 1 from public.members m
    join public.member_roles mr on mr.member_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.id = p_member_id and m.status = 'inactive'
      and not app.reach_covers(app.held_reaches(p_workspace_id, rp.permission_key), rp.reach)
  ) then
    raise exception 'You can only reactivate someone whose roles you could give yourself.'
      using errcode = 'insufficient_privilege', hint = 'reactivateRolesNotHeld';
  end if;

  update public.members set status = p_status
  where id = p_member_id and workspace_id = p_workspace_id;
end;
$function$;
