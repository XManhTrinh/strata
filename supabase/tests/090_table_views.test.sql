-- Saved table views: personal views are private, shared ones need settings permission.
begin;
\ir _helpers.psql

select plan(5);

create temporary table people (name text primary key, user_id uuid) on commit drop;
grant select on people to authenticated;
insert into people values
  ('alice', tests.create_user('alice@acme.test', 'Alice')),
  ('bob', tests.create_user('bob@acme.test', 'Bob'));

select tests.authenticate_as((select user_id from people where name = 'alice'));
select public.create_workspace('Acme', 'acme', 'company', 'GB', 'Europe/London', 'GBP');
create temporary table ctx on commit drop as select id as ws from public.workspaces where slug = 'acme';
grant select on ctx to authenticated;

insert into public.table_views (workspace_id, user_id, table_key, name, state, is_default)
values ((select ws from ctx), null, 'people', 'Everyone', '{}', true),
       ((select ws from ctx), auth.uid(), 'people', 'Alice private', '{}', false);

select tests.clear_authentication();
insert into public.members (workspace_id, user_id, full_name, email)
select ws, (select user_id from people where name = 'bob'), 'Bob', 'bob@acme.test' from ctx;

select tests.authenticate_as((select user_id from people where name = 'bob'));
select is(
  (select array_agg(name order by name) from public.table_views), array['Everyone'],
  'members see shared views but not other people''s'
);
select lives_ok(
  $$ insert into public.table_views (workspace_id, user_id, table_key, name, state)
     values ((select ws from ctx), auth.uid(), 'people', 'Bob private', '{}') $$,
  'members can save their own views'
);
select throws_ok(
  $$ insert into public.table_views (workspace_id, user_id, table_key, name, state)
     values ((select ws from ctx), null, 'people', 'Bob shared', '{}') $$,
  '42501', null, 'members cannot save shared views'
);
select throws_ok(
  $$ insert into public.table_views (workspace_id, user_id, table_key, name, state, is_default)
     values ((select ws from ctx), auth.uid(), 'people', 'Bob default', '{}', true),
            ((select ws from ctx), auth.uid(), 'people', 'Bob default 2', '{}', true) $$,
  '23505', null, 'each person has at most one default per table'
);
update public.table_views set name = 'Hacked' where name = 'Everyone';
select tests.clear_authentication();
select is((select count(*)::int from public.table_views where name = 'Everyone'), 1,
  'members cannot change shared views');

select * from finish();
rollback;
