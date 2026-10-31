-- The import preview refreshes the staged rows' statistics before joining them, so a large
-- import plans for its real size.

create or replace function public.import_preview(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.import_jobs := app.load_import_job(p_job_id, array['staging', 'previewed']::public.import_status[]);
  v_counts jsonb;
  v_can_pay boolean := 'workspace' = any (app.held_reaches(v_job.workspace_id, 'people.edit_compensation'));
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
    case when not v_can_pay and (r.data ? 'annual_salary' or r.data ? 'day_rate') then 'payNotAllowed' end,
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
$$;
