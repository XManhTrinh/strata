-- Phase 3 time settings: work schedules, holiday calendars (per-workspace copies), time types,
-- allowance policies, who is on which policy, and the allowance ledger (append-only; a balance is
-- the sum of its rows). Read by members when Calendar and time off is on; changed by people
-- holding time.manage_settings. The ledger is written only by the booking and allowance functions.

create type public.time_visibility as enum ('everyone', 'team', 'private');
create type public.time_bookable_by as enum ('everyone', 'managers', 'admins');
create type public.time_approver as enum ('line_manager', 'team_lead', 'person', 'role', 'none');
create type public.allowance_accrual as enum ('upfront', 'monthly');
create type public.allowance_entry as enum ('grant', 'accrual', 'adjustment', 'usage', 'refund', 'carry_over', 'expiry');

-- Working time ------------------------------------------------------------------------------------

create table public.work_schedules (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  -- ISO weekdays, Monday 1 to Sunday 7.
  working_days smallint[] not null check (
    cardinality(working_days) between 1 and 7 and working_days <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  ),
  -- For hours-based leave later.
  hours_per_day numeric(4, 2) not null default 8 check (hours_per_day > 0 and hours_per_day <= 24),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);
create unique index work_schedules_one_default_idx on public.work_schedules (workspace_id) where is_default;

create table public.holiday_calendars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  country char(2) check (country ~ '^[A-Z]{2}$'),
  -- A state, province or nation, as the holiday library names it (e.g. 'SCT', 'CA').
  region text check (char_length(region) between 1 and 20),
  -- Generated from the holiday library (and extended a year at a time), or kept by hand.
  source text not null default 'generated' check (source in ('generated', 'custom')),
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name)
);
create unique index holiday_calendars_one_default_idx on public.holiday_calendars (workspace_id) where is_default;

create table public.holidays (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  calendar_id uuid not null,
  date date not null,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  -- A half-day holiday (e.g. Christmas Eve in some places) is 0.5.
  portion numeric(2, 1) not null default 1 check (portion in (0.5, 1)),
  -- Added or changed by a person: kept when the calendar is generated again.
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (calendar_id, date),
  foreign key (workspace_id, calendar_id) references public.holiday_calendars (workspace_id, id) on delete cascade
);
create index holidays_workspace_calendar_idx on public.holidays (workspace_id, calendar_id, date);

-- A person's schedule and calendar are part of their dated job record (null: the workspace default).
alter table public.member_assignments
  add column work_schedule_id uuid,
  add column holiday_calendar_id uuid,
  add foreign key (workspace_id, work_schedule_id) references public.work_schedules (workspace_id, id),
  add foreign key (workspace_id, holiday_calendar_id) references public.holiday_calendars (workspace_id, id);
create index member_assignments_workspace_schedule_idx on public.member_assignments (workspace_id, work_schedule_id);
create index member_assignments_workspace_calendar_idx on public.member_assignments (workspace_id, holiday_calendar_id);

-- Time types and allowances ---------------------------------------------------------------------------

create table public.time_types (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  color text not null default '#6750A4' check (color ~ '^#[0-9a-fA-F]{6}$'),
  icon text not null default 'event' check (char_length(icon) between 1 and 60),
  uses_allowance boolean not null default false,
  needs_approval boolean not null default false,
  is_away boolean not null default true,
  visibility public.time_visibility not null default 'everyone',
  paid boolean not null default true,
  bookable_by public.time_bookable_by not null default 'everyone',
  book_for_others boolean not null default true,
  approver public.time_approver not null default 'none',
  approver_member_id uuid,
  approver_role_id uuid,
  -- Told about each booking without approving it (e.g. HR for sick leave).
  notify_role_id uuid,
  -- Only events repeat: no allowance and no approval.
  allows_recurrence boolean not null default false,
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  foreign key (workspace_id, approver_member_id) references public.members (workspace_id, id),
  foreign key (workspace_id, approver_role_id) references public.roles (workspace_id, id),
  foreign key (workspace_id, notify_role_id) references public.roles (workspace_id, id),
  constraint time_types_approval_has_approver check (
    (not needs_approval and approver = 'none')
    or (needs_approval and approver <> 'none')
  ),
  constraint time_types_approver_target check (
    (approver = 'person') = (approver_member_id is not null)
    and (approver = 'role') = (approver_role_id is not null)
  ),
  constraint time_types_recurrence_only_events check (
    not allows_recurrence or (not uses_allowance and not needs_approval)
  )
);

create table public.allowance_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces (id) on delete cascade,
  time_type_id uuid not null,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  days_per_year numeric(5, 2) not null check (days_per_year >= 0 and days_per_year <= 366),
  accrual public.allowance_accrual not null default 'upfront',
  year_start_month smallint not null default 1 check (year_start_month between 1 and 12),
  -- Null: carry everything over; 0: nothing carries over.
  carry_over_max numeric(5, 2) check (carry_over_max >= 0),
  -- Null: carried days never expire.
  carry_over_expires_months smallint check (carry_over_expires_months between 1 and 24),
  -- Scale by the person's working days (3 of 5 days gets 60%).
  prorate_by_schedule boolean not null default true,
  is_default boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workspace_id, id),
  unique (workspace_id, name),
  foreign key (workspace_id, time_type_id) references public.time_types (workspace_id, id) on delete cascade
);
create unique index allowance_policies_one_default_idx on public.allowance_policies (time_type_id) where is_default;
create index allowance_policies_workspace_type_idx on public.allowance_policies (workspace_id, time_type_id);

-- Who is on which policy, dated (the default policy applies to everyone else).
create table public.member_allowance_policies (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  member_id uuid not null,
  policy_id uuid not null,
  time_type_id uuid not null,
  valid_from date not null,
  valid_to date,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, policy_id) references public.allowance_policies (workspace_id, id) on delete cascade,
  foreign key (workspace_id, time_type_id) references public.time_types (workspace_id, id) on delete cascade,
  constraint member_allowance_policies_period check (valid_to is null or valid_to > valid_from),
  constraint member_allowance_policies_no_overlap exclude using gist (
    member_id with =, time_type_id with =, daterange(valid_from, valid_to, '[)') with &&
  )
);
create index member_allowance_policies_workspace_member_idx on public.member_allowance_policies (workspace_id, member_id);

-- Every change to a balance, signed (+ grants, accruals, refunds, carry-over; − usage, expiry).
create table public.allowance_ledger (
  id bigint generated always as identity primary key,
  workspace_id uuid not null,
  member_id uuid not null,
  time_type_id uuid not null,
  -- The first day of the leave year this row belongs to.
  leave_year date not null,
  kind public.allowance_entry not null,
  -- What a scheduled row is for (the year for a grant, the month for an accrual, the leave year for
  -- carry-over and expiry), so settling a balance twice never adds the same row twice.
  period date,
  days numeric(6, 2) not null,
  booking_id uuid,
  reason text check (char_length(reason) <= 500),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (workspace_id, member_id) references public.members (workspace_id, id) on delete cascade,
  foreign key (workspace_id, time_type_id) references public.time_types (workspace_id, id) on delete cascade,
  constraint allowance_ledger_adjustment_has_reason check (kind <> 'adjustment' or reason is not null),
  constraint allowance_ledger_scheduled_has_period check (
    (kind in ('grant', 'accrual', 'carry_over', 'expiry')) = (period is not null)
  )
);
create index allowance_ledger_member_idx on public.allowance_ledger (member_id, time_type_id, leave_year);
create unique index allowance_ledger_scheduled_once_idx on public.allowance_ledger (member_id, time_type_id, kind, period)
  where kind in ('grant', 'accrual', 'carry_over', 'expiry');
create index allowance_ledger_workspace_idx on public.allowance_ledger (workspace_id, time_type_id, leave_year);

do $$
declare
  v_table text;
begin
  foreach v_table in array array['work_schedules', 'holiday_calendars', 'holidays', 'time_types', 'allowance_policies']
  loop
    execute format('create trigger set_updated_at before update on public.%I
      for each row execute function app.set_updated_at()', v_table);
  end loop;
end;
$$;

-- Starter settings -------------------------------------------------------------------------------------

-- Annual leave days by country, as a starting point (holidays aren't counted as leave, so the
-- UK's 28 days including bank holidays become 20 plus the bank holiday calendar).
create function app.starter_leave_days(p_country text)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case upper(p_country)
    when 'RO' then 20 when 'GB' then 20 when 'IE' then 20 when 'DE' then 20 when 'NL' then 20
    when 'FR' then 25 when 'ES' then 22 when 'IT' then 20 when 'PL' then 20 when 'US' then 15
    else 20 end;
$$;

-- Every workspace starts with a standard week, a holiday calendar for its country (filled by the
-- app from the holiday library), and starter time types for its template.
create function app.seed_workspace_time()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_leave uuid;
begin
  insert into public.work_schedules (workspace_id, name, working_days, is_default)
  values (new.id, 'Standard week', array[1, 2, 3, 4, 5], true);

  insert into public.holiday_calendars (workspace_id, name, country, is_default)
  values (new.id, new.country || ' public holidays', new.country, true);

  if new.template_key = 'personal' then
    insert into public.time_types (workspace_id, name, color, icon, uses_allowance, is_away, sort_order)
    values (new.id, 'Annual leave', '#2E7D32', 'beach_access', true, true, 10)
    returning id into v_leave;
    insert into public.time_types (workspace_id, name, color, icon, is_away, visibility, sort_order) values
      (new.id, 'Sick leave', '#C62828', 'sick', true, 'private', 20);
    insert into public.time_types (workspace_id, name, color, icon, is_away, allows_recurrence, sort_order) values
      (new.id, 'Event', '#1565C0', 'event', false, true, 30);
  else
    insert into public.time_types (workspace_id, name, color, icon, uses_allowance, needs_approval, approver, is_away, sort_order)
    values (new.id, 'Annual leave', '#2E7D32', 'beach_access', true, true, 'line_manager', true, 10)
    returning id into v_leave;
    insert into public.time_types (workspace_id, name, color, icon, is_away, visibility, sort_order) values
      (new.id, 'Sick leave', '#C62828', 'sick', true, 'private', 20);
    insert into public.time_types (workspace_id, name, color, icon, needs_approval, approver, is_away, sort_order) values
      (new.id, 'Training', '#6A1B9A', 'school', true, 'line_manager', true, 30);
    insert into public.time_types (workspace_id, name, color, icon, is_away, sort_order) values
      (new.id, 'Working from home', '#00838F', 'home_work', false, 40);
    insert into public.time_types (workspace_id, name, color, icon, is_away, allows_recurrence, sort_order) values
      (new.id, 'Team event', '#1565C0', 'groups', false, true, 50);
  end if;

  insert into public.allowance_policies (workspace_id, time_type_id, name, days_per_year, is_default)
  values (new.id, v_leave, 'Annual leave', app.starter_leave_days(new.country), true);
  return null;
end;
$$;

create trigger seed_workspace_time
  after insert on public.workspaces
  for each row execute function app.seed_workspace_time();

-- Workspaces from before this migration get the same.
do $$
declare
  v_workspace public.workspaces;
begin
  for v_workspace in select * from public.workspaces w
    where not exists (select 1 from public.work_schedules s where s.workspace_id = w.id)
  loop
    insert into public.work_schedules (workspace_id, name, working_days, is_default)
    values (v_workspace.id, 'Standard week', array[1, 2, 3, 4, 5], true);
    insert into public.holiday_calendars (workspace_id, name, country, is_default)
    values (v_workspace.id, v_workspace.country || ' public holidays', v_workspace.country, true);
    with leave as (
      insert into public.time_types (workspace_id, name, color, icon, uses_allowance, needs_approval, approver, is_away, sort_order)
      values (v_workspace.id, 'Annual leave', '#2E7D32', 'beach_access', true,
        v_workspace.template_key <> 'personal',
        case when v_workspace.template_key = 'personal' then 'none' else 'line_manager' end::public.time_approver,
        true, 10)
      returning id
    )
    insert into public.allowance_policies (workspace_id, time_type_id, name, days_per_year, is_default)
    select v_workspace.id, id, 'Annual leave', app.starter_leave_days(v_workspace.country), true from leave;
    insert into public.time_types (workspace_id, name, color, icon, is_away, visibility, sort_order)
    values (v_workspace.id, 'Sick leave', '#C62828', 'sick', true, 'private', 20);
  end loop;
end;
$$;

-- Access ------------------------------------------------------------------------------------------------

do $$
declare
  v_table text;
begin
  foreach v_table in array array['work_schedules', 'holiday_calendars', 'holidays', 'time_types', 'allowance_policies']
  loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('grant select, insert, update, delete on public.%I to authenticated', v_table);
    execute format($p$create policy "Members read time settings" on public.%I
      for select to authenticated
      using (app.is_member(workspace_id) and app.feature_on(workspace_id, 'time'))$p$, v_table);
    execute format($p$create policy "Time managers add settings" on public.%I
      for insert to authenticated with check (app.has_permission(workspace_id, 'time.manage_settings'))$p$, v_table);
    execute format($p$create policy "Time managers change settings" on public.%I
      for update to authenticated
      using (app.has_permission(workspace_id, 'time.manage_settings'))
      with check (app.has_permission(workspace_id, 'time.manage_settings'))$p$, v_table);
    execute format($p$create policy "Time managers delete unused settings" on public.%I
      for delete to authenticated using (app.has_permission(workspace_id, 'time.manage_settings'))$p$, v_table);
    execute format('create trigger audit after insert or update or delete on public.%I
      for each row execute function app.audit_row_change(%L)', v_table, 'workspace_id');
  end loop;
end;
$$;

-- Policies per person: seen with the person's time, set by time managers.
alter table public.member_allowance_policies enable row level security;
grant select, insert, update, delete on public.member_allowance_policies to authenticated;
create policy "Policies are visible with the person's time" on public.member_allowance_policies
  for select to authenticated
  using (app.feature_on(workspace_id, 'time') and app.can(workspace_id, 'time.view', member_id));
create policy "Time managers set people's policies" on public.member_allowance_policies
  for all to authenticated
  using (app.has_permission(workspace_id, 'time.manage_settings'))
  with check (app.has_permission(workspace_id, 'time.manage_settings'));
create trigger audit after insert or update or delete on public.member_allowance_policies
  for each row execute function app.audit_row_change('workspace_id');

-- The ledger: read with the person's time; written only by functions (no insert, update or delete).
alter table public.allowance_ledger enable row level security;
grant select on public.allowance_ledger to authenticated;
create policy "Balances are visible with the person's time" on public.allowance_ledger
  for select to authenticated
  using (app.feature_on(workspace_id, 'time') and app.can(workspace_id, 'time.view', member_id));
