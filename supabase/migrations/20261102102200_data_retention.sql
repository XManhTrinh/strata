-- Retention: how long each workspace keeps personal data, applied every night. Empty means
-- "keep". Changed by people with the "Export and erase personal data" permission.

create table public.data_retention (
  workspace_id uuid primary key references public.workspaces (id) on delete cascade,
  -- Leavers become "Former employee" this many months after their last day.
  anonymise_leavers_months smallint default 72 check (anonymise_leavers_months between 1 and 600),
  -- Notes on private time off (such as sick leave) are cleared this many months after it ends.
  private_notes_months smallint default 36 check (private_notes_months between 1 and 600),
  -- Audit log entries are kept this many months.
  audit_log_months smallint default 84 check (audit_log_months between 12 and 600),
  -- Imports are removed this many days after they were started (applied or not).
  staged_imports_days smallint default 30 check (staged_imports_days between 1 and 3650),
  -- Notifications are removed this many months after they were sent.
  notifications_months smallint default 12 check (notifications_months between 1 and 600),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.data_retention
  for each row execute function app.set_updated_at();
create trigger audit after insert or update or delete on public.data_retention
  for each row execute function app.audit_row_change('workspace_id');

create function app.seed_data_retention()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.data_retention (workspace_id) values (new.id);
  return null;
end;
$$;

create trigger seed_data_retention after insert on public.workspaces
  for each row execute function app.seed_data_retention();
insert into public.data_retention (workspace_id) select id from public.workspaces on conflict do nothing;

alter table public.data_retention enable row level security;
grant select on public.data_retention to authenticated;
grant update (anonymise_leavers_months, private_notes_months, audit_log_months, staged_imports_days, notifications_months)
  on public.data_retention to authenticated;
create policy "Personal data managers see retention" on public.data_retention
  for select to authenticated using (app.has_permission(workspace_id, 'people.personal_data'));
create policy "Personal data managers change retention" on public.data_retention
  for update to authenticated
  using (app.has_permission(workspace_id, 'people.personal_data'))
  with check (app.has_permission(workspace_id, 'people.personal_data'));

-- Applies a workspace's rules as of a day; returns what it did.
create function app.apply_retention(p_workspace_id uuid, p_today date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rules public.data_retention;
  v_member public.members;
  v_leavers integer := 0;
  v_notes integer := 0;
  v_audit integer := 0;
  v_imports integer := 0;
  v_notifications integer := 0;
begin
  select * into v_rules from public.data_retention where workspace_id = p_workspace_id;
  if v_rules.workspace_id is null then
    return '{}';
  end if;

  if v_rules.anonymise_leavers_months is not null then
    for v_member in
      select * from public.members m
      where m.workspace_id = p_workspace_id and m.erased_at is null and not m.is_owner
        and m.end_date < p_today - make_interval(months => v_rules.anonymise_leavers_months)
    loop
      perform app.anonymise_member(v_member.id);
      insert into public.member_erasures (workspace_id, member_id, reason, kind)
      values (p_workspace_id, v_member.id,
        format('%s months after leaving', v_rules.anonymise_leavers_months), 'retention');
      v_leavers := v_leavers + 1;
    end loop;
  end if;

  if v_rules.private_notes_months is not null then
    update public.bookings b set notes = null
    from public.time_types t
    where b.workspace_id = p_workspace_id and t.id = b.time_type_id and t.visibility = 'private'
      and b.notes is not null and b.end_date < p_today - make_interval(months => v_rules.private_notes_months);
    get diagnostics v_notes = row_count;
  end if;

  if v_rules.audit_log_months is not null then
    perform set_config('app.personal_data', 'on', true);
    delete from public.audit_log
    where workspace_id = p_workspace_id and at < p_today - make_interval(months => v_rules.audit_log_months);
    get diagnostics v_audit = row_count;
    perform set_config('app.personal_data', 'off', true);
  end if;

  if v_rules.staged_imports_days is not null then
    delete from public.import_jobs
    where workspace_id = p_workspace_id and status <> 'applying'
      and created_at < p_today - make_interval(days => v_rules.staged_imports_days);
    get diagnostics v_imports = row_count;
  end if;

  if v_rules.notifications_months is not null then
    delete from public.notifications
    where workspace_id = p_workspace_id and created_at < p_today - make_interval(months => v_rules.notifications_months);
    get diagnostics v_notifications = row_count;
  end if;

  return jsonb_build_object('leavers', v_leavers, 'notes', v_notes, 'audit', v_audit,
    'imports', v_imports, 'notifications', v_notifications);
end;
$$;

create function app.apply_all_retention()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ws uuid;
begin
  for v_ws in select workspace_id from public.data_retention loop
    perform app.apply_retention(v_ws);
  end loop;
end;
$$;

select cron.schedule('apply-retention', '40 1 * * *', $$ select app.apply_all_retention() $$);
