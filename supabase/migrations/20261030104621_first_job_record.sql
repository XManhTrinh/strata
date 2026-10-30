-- People who join with an account (the workspace creator, anyone accepting an invite) start in
-- the root unit, so they appear in reporting lines, the org chart and unit reaches. People added
-- by hand or by import get their job record from that flow instead.

create function app.ensure_job_record()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.user_id is not null
     and not exists (select 1 from public.member_assignments a where a.member_id = new.id) then
    insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id)
    select new.workspace_id, new.id, coalesce(new.start_date, current_date), u.id
    from public.org_units u
    where u.workspace_id = new.workspace_id and u.parent_id is null;
  end if;
  return null;
end;
$$;

create trigger ensure_job_record
  after insert or update of user_id on public.members
  for each row execute function app.ensure_job_record();

-- Members with accounts from before this migration.
insert into public.member_assignments (workspace_id, member_id, valid_from, org_unit_id)
select m.workspace_id, m.id, coalesce(m.start_date, m.created_at::date), u.id
from public.members m
join public.org_units u on u.workspace_id = m.workspace_id and u.parent_id is null
where m.user_id is not null
  and not exists (select 1 from public.member_assignments a where a.member_id = m.id);
