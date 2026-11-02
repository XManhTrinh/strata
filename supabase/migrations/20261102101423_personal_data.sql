-- Personal data (GDPR): a person's data as JSON (themselves, or the new "Export and erase
-- personal data" permission), erasing a person in one step (history kept, anonymised, and a
-- record of who erased whom), and deleting your own account (with the workspaces only you are in).

insert into public.permissions (key, feature_key, name, description, is_scoped, sort_order) values
  ('people.personal_data', 'people', 'Export and erase personal data',
   'Download everything about a person, and erase a person.', false, 80);
insert into public.template_role_permissions (template_key, role_key, permission_key, reach) values
  ('company', 'hr', 'people.personal_data', 'workspace');

select set_config('app.seeding_workspace', 'on', true);
insert into public.role_permissions (workspace_id, role_id, permission_key, reach)
select r.workspace_id, r.id, 'people.personal_data', 'workspace' from public.roles r
where r.system_key = 'admin' or r.template_role_key = 'hr'
on conflict do nothing;
select set_config('app.seeding_workspace', 'off', true);

alter table public.members add column erased_at timestamptz;

-- Who erased whom, when and why: no personal data, so it can be kept.
create table public.member_erasures (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  member_id uuid not null,
  erased_by uuid references auth.users (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 1 and 500),
  -- 'manual', or 'retention' when a workspace's retention rules did it.
  kind text not null default 'manual' check (kind in ('manual', 'retention')),
  erased_at timestamptz not null default now(),
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade
);
create index member_erasures_workspace_idx on public.member_erasures (workspace_id, erased_at desc);
create index member_erasures_member_idx on public.member_erasures (member_id);
create index member_erasures_erased_by_idx on public.member_erasures (erased_by);
alter table public.member_erasures enable row level security;
grant select on public.member_erasures to authenticated;
create policy "Personal data managers see erasures" on public.member_erasures
  for select to authenticated using (app.has_permission(workspace_id, 'people.personal_data'));

-- Deleting a whole workspace: the guards that keep a workspace whole (its Admin role, root unit
-- and owner) step aside while app.delete_workspace runs.
create or replace function app.deleting_workspace()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce(current_setting('app.deleting_workspace', true), '') = 'on' $$;
-- Guards run as the caller, so everyone may ask.
grant execute on function app.deleting_workspace() to authenticated;

create or replace function app.protect_root_unit()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.deleting_workspace() then
    return coalesce(new, old);
  end if;
  if tg_op = 'DELETE' and old.parent_id is null then
    raise exception 'The root unit cannot be deleted.' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and old.parent_id is null and new.parent_id is not null then
    raise exception 'The root unit cannot move.' using errcode = 'check_violation';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function app.check_workspace_has_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not app.deleting_workspace()
    and exists (select 1 from public.workspaces w where w.id = old.workspace_id)
    and not exists (
      select 1 from public.members m
      where m.workspace_id = old.workspace_id and m.is_owner and m.status = 'active'
    )
  then
    raise exception 'A workspace must keep at least one active owner.'
      using errcode = 'check_violation';
  end if;
  return null;
end;
$$;

create or replace function app.protect_system_role_row()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.system_key is not null and not app.deleting_workspace() then
    raise exception 'The Admin role cannot be changed.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

create or replace function app.protect_system_roles()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_role_id uuid := coalesce(new.role_id, old.role_id);
begin
  if coalesce(current_setting('app.seeding_workspace', true), '') <> 'on'
    and not app.deleting_workspace()
    and exists (select 1 from public.roles r where r.id = v_role_id and r.system_key is not null)
  then
    raise exception 'The Admin role cannot be changed.' using errcode = 'insufficient_privilege';
  end if;
  return coalesce(new, old);
end;
$$;

-- The audit log stays append-only, except that erasing a person (or retention) may blank the
-- personal values in rows (an update that only empties before/after) or remove rows past their
-- retention (a delete), and only while app.personal_data is on.
create or replace function app.prevent_audit_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(current_setting('app.personal_data', true), '') = 'on'
     and (tg_op = 'DELETE' or (new.before is null and new.after is null
       and (new.workspace_id, new.actor_user_id, new.action, new.table_name, new.row_id, new.at)
         is not distinct from (old.workspace_id, old.actor_user_id, old.action, old.table_name, old.row_id, old.at))) then
    return coalesce(new, old);
  end if;
  raise exception 'The audit log cannot be changed.' using errcode = 'insufficient_privilege';
end;
$$;

-- Deletes a workspace and everything in it. Rows that point at people without cascading (plans,
-- the ledger, bookings, time types) go first. Only for functions that have checked the caller.
create function app.delete_workspace(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform set_config('app.deleting_workspace', 'on', true);
  delete from public.scenarios where workspace_id = p_workspace_id;
  delete from public.allowance_ledger where workspace_id = p_workspace_id;
  delete from public.bookings where workspace_id = p_workspace_id;
  delete from public.time_types where workspace_id = p_workspace_id;
  delete from public.workspaces where id = p_workspace_id;
  perform set_config('app.deleting_workspace', 'off', true);
end;
$$;

-- Everything Strata holds about a person, for them or for someone with the permission.
create function public.person_data(p_member_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members;
begin
  select * into v_member from public.members where id = p_member_id;
  if v_member.id is null
     or not (v_member.user_id = (select auth.uid())
             or app.has_permission(v_member.workspace_id, 'people.personal_data')) then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;

  return jsonb_build_object(
    'exported_at', now(),
    'workspace', (select w.name from public.workspaces w where w.id = v_member.workspace_id),
    'person', jsonb_build_object('name', v_member.full_name, 'email', v_member.email, 'key', v_member.person_key,
      'country', v_member.country, 'time_zone', v_member.time_zone, 'status', v_member.status,
      'start_date', v_member.start_date, 'end_date', v_member.end_date),
    'account', (select jsonb_build_object('email', u.email, 'name', p.full_name, 'locale', p.locale, 'time_zone', p.time_zone)
      from auth.users u join public.profiles p on p.id = u.id where u.id = v_member.user_id),
    'jobs', coalesce((select jsonb_agg(jsonb_build_object('from', a.valid_from, 'to', a.valid_to, 'unit', u.name,
        'position', pos.name, 'career_level', l.name, 'employment_type', e.name::text, 'manager', mgr.full_name) order by a.valid_from)
      from public.member_assignments a
      left join public.org_units u on u.id = a.org_unit_id
      left join public.positions pos on pos.id = a.position_id
      left join public.career_levels l on l.id = a.career_level_id
      left join public.employment_types e on e.id = a.employment_type_id
      left join public.members mgr on mgr.id = a.manager_member_id
      where a.member_id = p_member_id), '[]'),
    'pay', coalesce((select jsonb_agg(jsonb_build_object('from', c.valid_from, 'to', c.valid_to,
        'annual_salary', c.annual_salary, 'day_rate', c.day_rate, 'currency', c.currency) order by c.valid_from)
      from public.member_compensation c where c.member_id = p_member_id), '[]'),
    'fields', coalesce((select jsonb_agg(jsonb_build_object('field', f.label, 'value', v.value,
        'from', nullif(v.valid_from, '-infinity'::date), 'to', v.valid_to) order by f.label)
      from public.member_field_values v join public.custom_fields f on f.id = v.field_id
      where v.member_id = p_member_id), '[]'),
    'roles', coalesce((select jsonb_agg(r.name order by r.name)
      from public.member_roles mr join public.roles r on r.id = mr.role_id where mr.member_id = p_member_id), '[]'),
    'time_off', coalesce((select jsonb_agg(jsonb_build_object('type', t.name, 'from', b.start_date, 'to', b.end_date,
        'status', b.status, 'title', b.title, 'notes', b.notes, 'working_days', a.working_days) order by b.start_date)
      from public.booking_attendees a join public.bookings b on b.id = a.booking_id
      left join public.time_types t on t.id = b.time_type_id
      where a.member_id = p_member_id), '[]'),
    'allowance', coalesce((select jsonb_agg(jsonb_build_object('type', t.name, 'year', l.leave_year, 'kind', l.kind,
        'days', l.days, 'reason', l.reason, 'at', l.created_at) order by l.created_at)
      from public.allowance_ledger l left join public.time_types t on t.id = l.time_type_id
      where l.member_id = p_member_id), '[]'),
    'approvals_given', coalesce((select jsonb_agg(jsonb_build_object('decision', ap.decision, 'comment', ap.comment,
        'at', ap.decided_at) order by ap.decided_at)
      from public.booking_approvals ap where ap.decided_by = p_member_id), '[]'),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('scenario', s.name, 'unit', u.name, 'month', a.period_start,
        'fte', a.fte) order by s.name, a.period_start)
      from public.allocations a join public.scenarios s on s.id = a.scenario_id
      join public.org_units u on u.id = a.org_unit_id where a.member_id = p_member_id), '[]'),
    'changes', coalesce((select jsonb_agg(jsonb_build_object('at', l.at, 'action', l.action, 'what', l.table_name) order by l.at)
      from public.audit_log l
      where l.workspace_id = v_member.workspace_id
        and (l.row_id = p_member_id::text or l.before ->> 'member_id' = p_member_id::text
             or l.after ->> 'member_id' = p_member_id::text)), '[]')
  );
end;
$$;

-- Erases a person in one step: they become "Former employee"; their contact details, key, pay,
-- custom values, notes, comments, roles, feed links and import rows go; the audit log keeps that
-- changes happened without their values; time off, plans and headcount history stay, anonymised.
create function public.erase_member(p_member_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members;
begin
  select * into v_member from public.members where id = p_member_id;
  if v_member.id is null or not app.has_permission(v_member.workspace_id, 'people.personal_data') then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if v_member.is_owner then
    raise exception 'Owners can''t be erased.' using errcode = 'check_violation', hint = 'cannotEraseOwner';
  end if;
  if v_member.erased_at is not null then
    raise exception 'Already erased.' using errcode = 'check_violation', hint = 'alreadyErased';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Give a reason.' using errcode = 'check_violation', hint = 'erasureReasonRequired';
  end if;
  perform app.anonymise_member(p_member_id);
  insert into public.member_erasures (workspace_id, member_id, erased_by, reason)
  values (v_member.workspace_id, p_member_id, (select auth.uid()), btrim(p_reason));
end;
$$;

-- The anonymising itself, shared by erasing and by retention rules.
create function app.anonymise_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_member public.members;
  v_former text := 'Former employee';
begin
  select * into v_member from public.members where id = p_member_id;
  update public.notifications n set payload = n.payload || jsonb_build_object('member_name', v_former)
  where n.workspace_id = v_member.workspace_id and n.payload ->> 'member_name' = v_member.full_name;
  update public.notifications n set payload = n.payload || jsonb_build_object('by_name', v_former)
  where n.workspace_id = v_member.workspace_id and n.payload ->> 'by_name' = v_member.full_name;

  delete from public.member_compensation where member_id = p_member_id;
  delete from public.member_field_values where member_id = p_member_id;
  delete from public.member_roles where member_id = p_member_id;
  delete from public.calendar_feed_tokens t where t.workspace_id = v_member.workspace_id and t.user_id = v_member.user_id;
  delete from public.import_rows where member_id = p_member_id;
  update public.bookings b set notes = null, title = null
  where b.id in (select a.booking_id from public.booking_attendees a where a.member_id = p_member_id)
     or b.created_by = p_member_id;
  update public.booking_approvals ap set comment = null
  where ap.booking_id in (select a.booking_id from public.booking_attendees a where a.member_id = p_member_id)
     or ap.decided_by = p_member_id;
  update public.allowance_ledger set reason = null where member_id = p_member_id;

  update public.members set full_name = v_former, email = null, person_key = null, country = null,
    time_zone = null, user_id = null, status = 'inactive', erased_at = now()
  where id = p_member_id;

  -- The audit log keeps that changes happened, without the values (including the update above).
  perform set_config('app.personal_data', 'on', true);
  update public.audit_log l set before = null, after = null
  where l.workspace_id = v_member.workspace_id
    and (l.row_id = p_member_id::text or l.before ->> 'member_id' = p_member_id::text
         or l.after ->> 'member_id' = p_member_id::text);
  perform set_config('app.personal_data', 'off', true);
end;
$$;

-- Deletes your own account: the workspaces only you are in go with it; you leave every other
-- workspace, where your history stays without the link. Owners of shared workspaces pass the
-- ownership on first.
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_ws uuid;
begin
  if v_user is null then
    raise exception 'Not allowed.' using errcode = 'insufficient_privilege', hint = 'notAllowed';
  end if;
  if exists (
    select 1 from public.members m
    where m.user_id = v_user and m.is_owner and exists (
      select 1 from public.members o where o.workspace_id = m.workspace_id and o.id <> m.id and o.user_id is not null)
  ) then
    raise exception 'Pass ownership on first.' using errcode = 'check_violation', hint = 'ownerMustTransfer';
  end if;
  for v_ws in
    select m.workspace_id from public.members m
    where m.user_id = v_user and m.is_owner
  loop
    perform app.delete_workspace(v_ws);
  end loop;
  delete from auth.users where id = v_user;
end;
$$;

-- Your own data from every workspace you're in.
create function public.my_data()
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object('exported_at', now(), 'workspaces', coalesce(jsonb_agg(public.person_data(m.id)), '[]'))
  from public.members m where m.user_id = (select auth.uid());
$$;

-- What deleting your account would do: workspaces that go with it (only you have an account
-- there), workspaces you leave, and shared workspaces you own (which stop it until passed on).
create function public.my_account_deletion()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with mine as (
    select w.name, m.is_owner,
      exists (select 1 from public.members o where o.workspace_id = m.workspace_id and o.id <> m.id and o.user_id is not null) as shared
    from public.members m join public.workspaces w on w.id = m.workspace_id
    where m.user_id = (select auth.uid())
  )
  select jsonb_build_object(
    'deletes', coalesce((select jsonb_agg(name order by name) from mine where is_owner and not shared), '[]'),
    'leaves', coalesce((select jsonb_agg(name order by name) from mine where not is_owner), '[]'),
    'blocked', coalesce((select jsonb_agg(name order by name) from mine where is_owner and shared), '[]'));
$$;

grant execute on function public.person_data(uuid), public.erase_member(uuid, text), public.delete_my_account(),
  public.my_data(), public.my_account_deletion()
  to authenticated;
