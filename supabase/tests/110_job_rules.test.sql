-- Positions: a level range runs up one track.
begin;
\ir _helpers.psql

select plan(3);

select tests.authenticate_as(tests.create_user('alice@acme.test', 'Alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');

create temporary table ws on commit drop as select id from public.workspaces where slug = 'acme';
grant select on ws to authenticated;

insert into public.career_levels (workspace_id, name, rank, track) values
  ((select id from ws), 'Engineer', 1, 'IC'), ((select id from ws), 'Senior', 2, 'IC'),
  ((select id from ws), 'Lead', 3, 'Management');

create function pg_temp.lvl(p_name text) returns uuid language sql as
  $$ select id from public.career_levels where workspace_id = (select id from ws) and name = p_name $$;
grant execute on function pg_temp.lvl(text) to authenticated;

select lives_ok(
  $$ insert into public.positions (workspace_id, name, min_level_id, max_level_id)
     values ((select id from ws), 'Developer', pg_temp.lvl('Engineer'), pg_temp.lvl('Senior')) $$,
  'a range up one track is accepted'
);

select throws_ok(
  $$ insert into public.positions (workspace_id, name, min_level_id, max_level_id)
     values ((select id from ws), 'Backwards', pg_temp.lvl('Senior'), pg_temp.lvl('Engineer')) $$,
  '23514', null, 'the lowest level cannot be above the highest'
);

select throws_ok(
  $$ update public.positions set max_level_id = pg_temp.lvl('Lead') where name = 'Developer' $$,
  '23514', null, 'a range cannot cross tracks'
);

select * from finish();
rollback;
