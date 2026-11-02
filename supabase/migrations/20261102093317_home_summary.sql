-- Home: the cards each person may see, in one call. It runs with the caller's rights and reads
-- through functions that apply their own rules, so a card never shows more than its source.
--   me:    your balances, your next time off, your requests waiting (with Calendar and time off)
--   team:  who's away this week among the people you see, and approvals waiting for you
--   org:   headcount, starters and leavers this month and people by top unit, for those who see
--          everyone and run the organization (plans or structure); with the live plan's FTE and
--          cost this month by top unit when they see plans
create function public.home_summary(p_workspace_id uuid)
returns jsonb
language plpgsql
-- Not stable: reading balances can settle them (adding ledger rows), which a read-only call can't.
set search_path = ''
as $$
declare
  v_me uuid := app.current_member_id(p_workspace_id);
  v_today date := current_date;
  v_month date := app.month_start(current_date);
  v_week_from date;
  v_root uuid;
  v_live uuid;
  v_result jsonb := '{}';
begin
  if v_me is null then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  select current_date - ((extract(isodow from current_date)::integer - w.week_start + 7) % 7)
  into v_week_from from public.workspaces w where w.id = p_workspace_id;

  if app.feature_on(p_workspace_id, 'time') then
    v_result := v_result || jsonb_build_object('me', jsonb_build_object(
      'balances', coalesce((
        select jsonb_agg(jsonb_build_object('name', b.time_type_name, 'available', b.available) order by b.time_type_name)
        from public.allowance_balances(v_me, v_today) b), '[]'),
      'upcoming', coalesce((
        select jsonb_agg(jsonb_build_object('type', e.time_type_name, 'title', e.title, 'start_date', e.start_date,
          'end_date', e.end_date, 'status', e.status) order by e.start_date)
        from (
          select * from public.calendar_entries(p_workspace_id, v_today, v_today + 90, array[v_me]) e
          where e.member_id = v_me and e.status in ('approved', 'pending') and e.end_date >= v_today
          order by e.start_date limit 5
        ) e), '[]'),
      'waiting', (
        select count(*) from public.bookings b
        join public.booking_attendees a on a.booking_id = b.id
        where b.workspace_id = p_workspace_id and a.member_id = v_me and b.status = 'pending')
    ));

    if app.held_reaches(p_workspace_id, 'time.view') && array['reports', 'team', 'team_and_below', 'units', 'workspace']::public.reach[]
       or app.has_permission(p_workspace_id, 'time.approve') then
      v_result := v_result || jsonb_build_object('team', jsonb_build_object(
        'away', coalesce((
          select jsonb_agg(jsonb_build_object('name', e.member_name, 'type', e.time_type_name,
            'start_date', e.start_date, 'end_date', e.end_date) order by e.start_date, e.member_name)
          from (
            select * from public.calendar_entries(p_workspace_id, v_week_from, v_week_from + 6) e
            where e.is_away and e.status = 'approved' and e.member_id <> v_me
            order by e.start_date, e.member_name limit 12
          ) e), '[]'),
        'away_count', (
          select count(distinct e.member_id) from public.calendar_entries(p_workspace_id, v_week_from, v_week_from + 6) e
          where e.is_away and e.status = 'approved' and e.member_id <> v_me),
        'approvals', case when app.has_permission(p_workspace_id, 'time.approve')
          then (select count(*) from public.my_pending_approvals(p_workspace_id)) end
      ));
    end if;
  end if;

  if app.reach_covers(app.held_reaches(p_workspace_id, 'people.view'), 'workspace')
     and (app.reach_covers(app.held_reaches(p_workspace_id, 'planning.view'), 'workspace')
          or app.has_permission(p_workspace_id, 'people.manage_structure')) then
    select u.id into v_root from public.org_units u where u.workspace_id = p_workspace_id and u.parent_id is null;
    v_result := v_result || jsonb_build_object('org', jsonb_build_object(
      'headcount', (
        select count(*) from public.members m
        where m.workspace_id = p_workspace_id and m.status <> 'inactive'
          and (m.start_date is null or m.start_date <= v_today) and (m.end_date is null or m.end_date >= v_today)),
      'starters', (
        select count(*) from public.members m
        where m.workspace_id = p_workspace_id and m.start_date >= v_month and m.start_date < v_month + interval '1 month'),
      'leavers', (
        select count(*) from public.members m
        where m.workspace_id = p_workspace_id and m.end_date >= v_month and m.end_date < v_month + interval '1 month'),
      'units', coalesce((
        select jsonb_agg(jsonb_build_object('name', u.name, 'people', h.total) order by h.total desc, u.name)
        from public.unit_headcount(p_workspace_id, v_today) h
        join public.org_units u on u.id = h.unit_id
        where u.parent_id = v_root and h.total > 0), '[]')
    ));

    if app.feature_on(p_workspace_id, 'planning') and app.has_permission(p_workspace_id, 'planning.view') then
      select s.id into v_live from public.scenarios s where s.workspace_id = p_workspace_id and s.is_live;
      if v_live is not null then
        v_result := jsonb_set(v_result, '{org,plan}', jsonb_build_object(
          'scenario', (select s.name from public.scenarios s where s.id = v_live),
          'units', coalesce((
            select jsonb_agg(jsonb_build_object('name', t.group_label, 'fte', t.fte, 'cost', t.cost, 'currency', t.currency)
              order by t.fte desc)
            from public.capacity_totals(v_live, v_month, v_month) t), '[]')));
      end if;
    end if;
  end if;
  return v_result;
end;
$$;

grant execute on function public.home_summary(uuid) to authenticated;
