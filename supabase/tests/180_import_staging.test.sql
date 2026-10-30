-- Staging import rows: only through import_stage_rows, only while the import is staging.
begin;
\ir _helpers.psql

select plan(5);

select tests.authenticate_as(tests.create_user('alice@acme.test', 'Alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;
insert into public.import_jobs (workspace_id, created_by, key_field) select ws, auth.uid(), 'person_key' from ctx;
create temporary table job on commit drop as select id from public.import_jobs;
grant select on job to authenticated;

select is(
  public.import_stage_rows((select id from job), 1, '[{"person_key": "E1"}, {"person_key": "E2"}]'),
  2, 'rows are staged in a batch'
);
select throws_ok(
  $$ insert into public.import_rows (job_id, workspace_id, row_number, data)
     values ((select id from job), (select ws from ctx), 3, '{}') $$,
  '42501', null, 'rows cannot be inserted directly'
);
select public.import_preview((select id from job));
select throws_ok(
  $$ select public.import_stage_rows((select id from job), 3, '[{"person_key": "E3"}]') $$,
  '23514', null, 'nothing is added once previewed'
);

-- Someone who joined today and is missing from a same-day import leaves today, not yesterday.
insert into public.members (workspace_id, full_name, person_key, start_date)
select ws, 'Joined today', 'T1', current_date from ctx;
insert into public.import_jobs (workspace_id, created_by, key_field, mark_leavers)
select ws, auth.uid(), 'person_key', true from ctx;
create temporary table job2 on commit drop as
  select id from public.import_jobs where id <> (select id from job);
grant select on job2 to authenticated;
select public.import_stage_rows((select id from job2), 1, '[{"person_key": "E1", "full_name": "One"}]');
select public.import_preview((select id from job2));
-- Four steps: people, managers, leavers, finish.
select public.import_apply_chunk((select id from job2)) from generate_series(1, 4);
select is(
  (select end_date from public.members where person_key = 'T1'),
  current_date, 'a leaver''s last day is never before their first'
);

-- Someone without people.import can't stage into another's job.
select tests.clear_authentication();
select tests.authenticate_as(tests.create_user('bob@other.test', 'Bob'));
select throws_ok(
  $$ select public.import_stage_rows((select id from job), 9, '[{"person_key": "X"}]') $$,
  'P0002', null, 'outsiders cannot stage rows'
);

select * from finish();
rollback;
