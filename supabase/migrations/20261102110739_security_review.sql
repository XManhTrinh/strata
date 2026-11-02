-- Security review fixes (Phase 5).

-- Headcount per unit answered for any workspace id, with zero counts, to people outside it or
-- without the org chart: now nothing, as the org chart itself does.
create or replace function public.unit_headcount(p_workspace_id uuid, p_as_of date default current_date)
returns table (unit_id uuid, direct integer, total integer)
language plpgsql
stable
security definer
set search_path = ''
set plan_cache_mode = force_custom_plan
as $$
#variable_conflict use_column
declare
  v_reaches public.reach[] := app.held_reaches(p_workspace_id, 'org_chart.view');
  v_all boolean := 'workspace' = any (v_reaches);
begin
  if not app.feature_on(p_workspace_id, 'org_chart') or cardinality(v_reaches) = 0 then
    return;
  end if;
  return query
  with counts as (
    select a.org_unit_id, count(*)::integer as n
    from public.member_assignments a
    where a.workspace_id = p_workspace_id
      and a.valid_from <= p_as_of and (a.valid_to is null or a.valid_to > p_as_of)
      and (v_all or a.member_id in (select v.member_id from app.visible_members(p_workspace_id, 'org_chart.view') v))
    group by a.org_unit_id
  ),
  placed as (
    select u.id, u.path, coalesce(c.n, 0) as n
    from public.org_units u left join counts c on c.org_unit_id = u.id
    where u.workspace_id = p_workspace_id and u.archived_at is null
  )
  select p.id, p.n,
    (select sum(d.n)::integer from placed d where d.path operator(extensions.<@) p.path)
  from placed p;
end;
$$;

-- Re-inviting someone who left brought back every role they had held.
CREATE OR REPLACE FUNCTION public.accept_invitation(p_token text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
    -- Someone coming back starts from the invited role alone: roles held before they left (which
    -- the inviter may not be allowed to give) don't return with them.
    delete from public.member_roles where member_id = v_member.id;
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
$function$;

-- Importing could change sensitive custom fields without the pay permissions, and its preview
-- could confirm guessed pay or sensitive values.
CREATE OR REPLACE FUNCTION public.import_preview(p_job_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_job public.import_jobs := app.load_import_job(p_job_id, array['staging', 'previewed']::public.import_status[]);
  v_counts jsonb;
  -- Pay and sensitive fields need both seeing and changing pay everywhere: otherwise the preview's
  -- "changed"/"unchanged" would answer guesses about values the importer may not see.
  v_can_pay boolean := 'workspace' = any (app.held_reaches(v_job.workspace_id, 'people.edit_compensation'))
    and 'workspace' = any (app.held_reaches(v_job.workspace_id, 'people.view_compensation'));
begin
  -- The rows were just staged: planning on old statistics (say, from when the table was empty)
  -- turns these joins into row-by-row work (minutes at 100k rows instead of seconds).
  analyze public.import_rows;

  -- Match rows to people by key (a hash join, not a lookup per row).
  with matched as (
    select r.row_number, m.id
    from public.import_rows r
    left join public.members m
      on m.workspace_id = v_job.workspace_id
     and (case v_job.key_field when 'email' then lower(m.email::text) else m.person_key end)
       = app.import_key(r.data, v_job.key_field)
    where r.job_id = p_job_id
  )
  update public.import_rows r set member_id = matched.id, errors = '{}', status = 'pending'
  from matched where r.job_id = p_job_id and r.row_number = matched.row_number;

  with keyed as (
    select r.row_number, app.import_key(r.data, v_job.key_field) as key,
      row_number() over (partition by app.import_key(r.data, v_job.key_field) order by r.row_number) as nth
    from public.import_rows r where r.job_id = p_job_id
  )
  update public.import_rows r
  set errors = array_remove(array[
    case when k.key is null then 'missingKey' end,
    case when nullif(btrim(r.data ->> 'email'), '') is not null
              and btrim(r.data ->> 'email') !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then 'emailInvalid' end,
    case when r.member_id is null and nullif(btrim(r.data ->> 'full_name'), '') is null then 'nameRequired' end,
    case when nullif(btrim(r.data ->> 'employment_type'), '') is not null and not exists (
      select 1 from public.employment_types e
      where e.workspace_id = v_job.workspace_id and lower(e.name::text) = lower(btrim(r.data ->> 'employment_type'))
    ) then 'unknownEmploymentType' end,
    case when not v_can_pay and (r.data ? 'annual_salary' or r.data ? 'day_rate' or exists (
      select 1 from jsonb_object_keys(coalesce(r.data -> 'custom', '{}')) as k (key)
      join public.custom_fields f on f.workspace_id = v_job.workspace_id and f.key = k.key
      where f.sensitive
    )) then 'payNotAllowed' end,
    case when k.key is not null and k.nth > 1 then 'duplicateKey' end
  ], null)
  from keyed k
  where r.job_id = p_job_id and r.row_number = k.row_number;

  with snapshots as (
    select * from app.member_snapshots(v_job.workspace_id, v_job.effective_date, v_job.key_field)
  ),
  classified as (
    select r.row_number,
      case
        when cardinality(r.errors) > 0 then 'error'
        when r.member_id is null then 'new'
        when app.import_row_differs(r.data, s.snapshot) then 'changed'
        else 'unchanged'
      end::public.import_row_status as status
    from public.import_rows r
    left join snapshots s on s.member_id = r.member_id
    where r.job_id = p_job_id
  )
  update public.import_rows r set status = c.status
  from classified c where r.job_id = p_job_id and r.row_number = c.row_number;

  select jsonb_build_object(
    'new', count(*) filter (where status = 'new'),
    'changed', count(*) filter (where status = 'changed'),
    'unchanged', count(*) filter (where status = 'unchanged'),
    'errors', count(*) filter (where status = 'error'),
    'leaving', case when v_job.mark_leavers then (
      select count(*) from public.members m
      where m.workspace_id = v_job.workspace_id and m.status = 'active' and not m.is_owner
        and (m.end_date is null or m.end_date >= v_job.effective_date)
        and app.member_key(m, v_job.key_field) is not null
        and not exists (
          select 1 from public.import_rows x
          where x.job_id = p_job_id and app.import_key(x.data, v_job.key_field) = app.member_key(m, v_job.key_field)
        )
    ) else 0 end
  ) into v_counts
  from public.import_rows where job_id = p_job_id;

  update public.import_jobs set status = 'previewed', counts = v_counts, phase = 'people', cursor = 0
  where id = p_job_id;
  return v_counts;
end;
$function$;

-- Carry-over was fixed the first time anyone looked at the next year, from the year before as it
-- stood then; days booked afterwards in the year before were carried over anyway.
CREATE OR REPLACE FUNCTION app.settle_allowance(p_member_id uuid, p_time_type_id uuid, p_as_of date)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  -- Carry-over from the year before, once that year is over (looking ahead must not fix it while
  -- the year before can still change), if that year had anything.
  v_previous := (v_year - interval '1 year')::date;
  if v_year <= current_date and exists (select 1 from public.allowance_ledger l
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
    if p_as_of >= v_expires and current_date >= v_expires and v_carried > 0 then
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
$function$;

-- Workspaces where the caller holds a permission (with a given reach, or any). Policies call it
-- as `workspace_id in (select unnest(app.workspaces_with(...)))`, once per query, not per row.
create function app.workspaces_with(p_permission_key text, p_reach public.reach default null)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(array_agg(m.workspace_id), '{}')
  from public.members m
  where m.user_id = (select auth.uid()) and m.status = 'active'
    and case when p_reach is null then cardinality(app.held_reaches(m.workspace_id, p_permission_key)) > 0
             else p_reach = any (app.held_reaches(m.workspace_id, p_permission_key)) end;
$$;
grant execute on function app.workspaces_with(text, public.reach) to authenticated;

-- The audit log keeps before and after values. Pay, and sensitive custom fields, are for people
-- who may see pay everywhere; other audit readers don't get those entries.
drop policy "Audit viewers can read their workspace's audit log" on public.audit_log;
create policy "Audit viewers can read their workspace's audit log" on public.audit_log
  for select to authenticated using (
    workspace_id in (select unnest(app.workspaces_with('workspace.view_audit')))
    and (
      table_name not in ('member_compensation', 'member_field_values')
      or workspace_id in (select unnest(app.workspaces_with('people.view_compensation', 'workspace')))
      or (table_name = 'member_field_values'
        and not app.field_is_sensitive((coalesce(after, before) ->> 'field_id')::uuid))
    )
  );

-- Starting an import: only the choices, not its progress; and marking leavers (which
-- deactivates people) needs managing members across the workspace, not importing alone.
revoke insert on public.import_jobs from authenticated;
grant insert (workspace_id, created_by, key_field, unit_level_ids, effective_date, mark_leavers)
  on public.import_jobs to authenticated;
drop policy "Importers start jobs" on public.import_jobs;
create policy "Importers start jobs" on public.import_jobs
  for insert to authenticated with check (
    app.has_permission(workspace_id, 'people.import')
    and created_by = (select auth.uid())
    and (not mark_leavers or 'workspace' = any (app.held_reaches(workspace_id, 'members.manage')))
  );
alter table public.import_jobs alter column mark_leavers set default false;
