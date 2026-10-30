-- Staging import rows: only through import_stage_rows, only while the import is staging.
begin;
\ir _helpers.psql

select plan(4);

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

-- Someone without people.import can't stage into another's job.
select tests.clear_authentication();
select tests.authenticate_as(tests.create_user('bob@other.test', 'Bob'));
select throws_ok(
  $$ select public.import_stage_rows((select id from job), 9, '[{"person_key": "X"}]') $$,
  'P0002', null, 'outsiders cannot stage rows'
);

select * from finish();
rollback;
